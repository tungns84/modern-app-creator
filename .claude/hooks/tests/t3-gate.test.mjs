// Contract tests for .claude/hooks/t3-plan-gate.mjs — PreToolUse Write|Edit gate.
// Tests spawn the hook as a child process feeding fixture stdin (the REAL
// contract: stdin JSON → stdout decision JSON) inside a temp sandbox git repo
// with a per-case branch, so branch binding / approved-plan scan / tiers load
// are all controllable per test.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const hookPath = path.resolve(__dirname, "..", "t3-plan-gate.mjs");
const realTiers = readFileSync(path.join(repoRoot, ".cowork", "tiers.json"), "utf8");

const APPROVED_PLAN = "# Plan\n\ntier: T3\n\nApproved-by: tungns84 2026-06-11\n";

function git(cwd, ...args) {
  execFileSync("git", args, { cwd, stdio: "ignore" });
}

// branch: null → sandbox is NOT a git repo (failed-branch-read case)
function makeSandbox({ branch = "main", specs = [] } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "t3gate-"));
  mkdirSync(path.join(dir, ".cowork"), { recursive: true });
  writeFileSync(path.join(dir, ".cowork", "tiers.json"), realTiers);
  if (branch !== null) {
    git(dir, "init", "-q");
    git(dir, "-c", "user.email=t@t.test", "-c", "user.name=t", "commit", "--allow-empty", "-q", "-m", "init");
    git(dir, "checkout", "-q", "-B", branch);
  }
  for (const s of specs) {
    const d = path.join(dir, "specs", s.dir);
    mkdirSync(d, { recursive: true });
    writeFileSync(path.join(d, "plan.md"), s.content);
  }
  return dir;
}

function runHook(stdinText, sandbox) {
  try {
    const stdout = execFileSync(process.execPath, [hookPath], {
      input: stdinText,
      cwd: sandbox,
      env: { ...process.env, CLAUDE_PROJECT_DIR: sandbox },
      encoding: "utf8",
    });
    return { status: 0, stdout };
  } catch (err) {
    return { status: err.status ?? 1, stdout: (err.stdout ?? "").toString() };
  }
}

function fixture(name) {
  return readFileSync(path.join(__dirname, "fixtures", name), "utf8");
}

function writePayload(filePath) {
  return JSON.stringify({
    session_id: "t",
    hook_event_name: "PreToolUse",
    tool_name: "Write",
    tool_input: { file_path: filePath, content: "x" },
    permission_mode: "default",
  });
}

function assertDeny(out, label) {
  assert.equal(out.status, 0, `${label}: decision is carried by JSON, exit code must be 0`);
  assert.ok(out.stdout.trim().length > 0, `${label}: expected deny JSON on stdout, got empty`);
  const decision = JSON.parse(out.stdout);
  assert.equal(decision.hookSpecificOutput?.permissionDecision, "deny", `${label}: must deny`);
  return decision.hookSpecificOutput.permissionDecisionReason ?? "";
}

function assertNoDecision(out, label) {
  assert.equal(out.status, 0, `${label}: hook must exit 0`);
  assert.equal(out.stdout.trim(), "", `${label}: no decision means EMPTY stdout`);
}

// Case 1: T3 write on an UNBOUND branch (main) → deny naming convention + next step
test("T3 write on unbound branch (main) → deny names specs/, plan, feat/NNN- convention and a next step", () => {
  const sandbox = makeSandbox({ branch: "main" });
  const out = runHook(fixture("write-t3.json"), sandbox);
  const reason = assertDeny(out, "unbound-branch");
  assert.match(reason, /specs\//, "reason must name the specs/ artifact");
  assert.match(reason, /plan/i, "reason must mention the plan");
  assert.match(reason, /feat\/NNN-/, "reason must state the feat/NNN-* branch convention");
  assert.match(reason, /retry/i, "reason must give a next step ending in retry");
});

// Case 2 (anti-rot, checker blocker): bound branch feat/099-* with ONLY an
// unrelated approved spec in the tree → deny naming the missing BOUND artifact
test("T3 write on feat/099-* with only unrelated approved specs → deny names specs/099-*/plan.md (anti-rot)", () => {
  const sandbox = makeSandbox({
    branch: "feat/099-anything",
    specs: [{ dir: "001-x", content: APPROVED_PLAN }],
  });
  const out = runHook(fixture("write-t3.json"), sandbox);
  const reason = assertDeny(out, "anti-rot");
  assert.match(reason, /specs\/099-\*/, "reason must name the BOUND artifact specs/099-*");
  assert.match(reason, /Approved-by/, "reason must name the Approved-by marker");
});

// Case 3: bound branch with bound approved plan → no decision (silent pass)
test("T3 write on feat/001-x with approved specs/001-x/plan.md → no decision (exit 0, empty stdout)", () => {
  const sandbox = makeSandbox({
    branch: "feat/001-x",
    specs: [{ dir: "001-x", content: APPROVED_PLAN }],
  });
  const out = runHook(fixture("write-t3.json"), sandbox);
  assertNoDecision(out, "bound-approved");
});

// Bound plan exists but Approved-by empty → still deny (pins found=true/hasApprovedBy=false path)
test("T3 write on feat/001-x where bound plan.md exists WITHOUT Approved-by → deny", () => {
  const sandbox = makeSandbox({
    branch: "feat/001-x",
    specs: [{ dir: "001-x", content: "# Plan\n\ntier: T3\n\nApproved-by:\n" }],
  });
  const out = runHook(fixture("write-t3.json"), sandbox);
  const reason = assertDeny(out, "missing-approval-marker");
  assert.match(reason, /Approved-by/, "reason must name the missing Approved-by marker");
});

// Case 4: meta path → never denied (D-06 — the GSD dev loop is unaffected)
test("Write to .planning/notes.md (meta) → no decision", () => {
  const sandbox = makeSandbox({ branch: "main" });
  const out = runHook(fixture("write-meta.json"), sandbox);
  assertNoDecision(out, "meta-exclusion");
});

// Case 5: non-T3 path → no decision
test("Write to src/whatever.ts (no T3 match) → no decision", () => {
  const sandbox = makeSandbox({ branch: "main" });
  const out = runHook(writePayload("src/whatever.ts"), sandbox);
  assertNoDecision(out, "non-t3");
});

// Case 9 (Pitfall 1): malformed stdin → DENY (fail-closed), never silent pass
test("Malformed stdin (not JSON) → deny containing 'failing closed' (crash path, Pitfall 1)", () => {
  const sandbox = makeSandbox({ branch: "main" });
  const out = runHook(fixture("malformed.txt"), sandbox);
  assert.equal(out.status, 0, "crash path must still exit 0 (deny carried by JSON, not exit code)");
  assert.ok(
    out.stdout.includes('"permissionDecision":"deny"'),
    `crash path must emit a deny decision (fail-closed); got: ${JSON.stringify(out.stdout)}`
  );
  assert.match(out.stdout, /failing closed/i, "deny reason must explain it is failing closed");
});

// Failed git branch read on a T3-relevant input → DENY (fail-closed)
test("T3 write where git branch read fails (not a git repo) → deny (fail-closed)", () => {
  const sandbox = makeSandbox({ branch: null });
  const out = runHook(fixture("write-t3.json"), sandbox);
  const reason = assertDeny(out, "failed-branch-read");
  assert.match(reason, /branch/i, "reason must mention the branch read failure");
});

// Edit tool uses the same file_path contract as Write
test("Edit on a T3 path on unbound branch → deny (same contract as Write)", () => {
  const sandbox = makeSandbox({ branch: "main" });
  const payload = JSON.stringify({
    session_id: "t",
    hook_event_name: "PreToolUse",
    tool_name: "Edit",
    tool_input: { file_path: ".cowork/tiers.json", old_string: "a", new_string: "b" },
    permission_mode: "default",
  });
  const out = runHook(payload, sandbox);
  assertDeny(out, "edit-t3");
});
