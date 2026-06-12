// Contract tests for .claude/hooks/t4-command-guard.mjs — PreToolUse Bash guard.
// T4 pattern hit → deny ("a human executes it"); best-effort write-bypass scan
// (redirects, tee, sed -i, git apply) targeting T3 paths → same branch-bound
// gate as t3-plan-gate (Pitfall 2 — documented best-effort, CI L2 is the floor).
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const hookPath = path.resolve(__dirname, "..", "t4-command-guard.mjs");
const realTiers = readFileSync(path.join(repoRoot, ".cowork", "tiers.json"), "utf8");

const APPROVED_PLAN = "# Plan\n\ntier: T3\n\nApproved-by: tungns84 2026-06-11\n";

function git(cwd, ...args) {
  execFileSync("git", args, { cwd, stdio: "ignore" });
}

function makeSandbox({ branch = "main", specs = [] } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "t4guard-"));
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

function bashPayload(command) {
  return JSON.stringify({
    session_id: "t",
    hook_event_name: "PreToolUse",
    tool_name: "Bash",
    tool_input: { command },
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

// Case 6: T4 pattern → deny instructing human execution
test("Bash 'git push --force origin main' → deny, reason says a human executes it", () => {
  const sandbox = makeSandbox({ branch: "main" });
  const out = runHook(fixture("bash-t4.json"), sandbox);
  const reason = assertDeny(out, "t4-pattern");
  assert.match(reason, /human/i, "T4 deny must instruct human execution");
});

// Case 7: T1 daily command → no decision
test("Bash 'task verify' → no decision", () => {
  const sandbox = makeSandbox({ branch: "main" });
  const out = runHook(fixture("bash-allowed.json"), sandbox);
  assertNoDecision(out, "allowed-command");
});

// Case 8 (Pitfall 2): write-bypass via redirect into a T3 path, no bound approved plan → deny
test("Bash 'echo hacked > .cowork/tiers.json' without bound approved plan → deny (best-effort bypass scan)", () => {
  const sandbox = makeSandbox({ branch: "main" });
  const out = runHook(fixture("bash-bypass.json"), sandbox);
  const reason = assertDeny(out, "write-bypass");
  assert.match(reason, /\.cowork[\/\\]tiers\.json/, "reason must name the targeted T3 path");
});

// Bypass scan honors the same branch binding: bound approved plan → allow
test("Bash redirect into T3 path WITH bound approved plan on feat/001-x → no decision", () => {
  const sandbox = makeSandbox({
    branch: "feat/001-x",
    specs: [{ dir: "001-x", content: APPROVED_PLAN }],
  });
  const out = runHook(fixture("bash-bypass.json"), sandbox);
  assertNoDecision(out, "bypass-with-approval");
});

// tee into a T3 path is part of the best-effort scan
test("Bash 'cat patch | tee .claude/settings.json' without bound approved plan → deny", () => {
  const sandbox = makeSandbox({ branch: "main" });
  const out = runHook(bashPayload("cat patch | tee .claude/settings.json"), sandbox);
  assertDeny(out, "tee-bypass");
});

// Redirect into a non-T3 path is not the guard's business
test("Bash 'echo hi > /tmp/scratch.txt' → no decision (target is not T3)", () => {
  const sandbox = makeSandbox({ branch: "main" });
  const out = runHook(bashPayload("echo hi > /tmp/scratch.txt"), sandbox);
  assertNoDecision(out, "non-t3-redirect");
});

// Crash path (Pitfall 1): malformed stdin → deny (fail-closed)
test("Malformed stdin (not JSON) → deny (fail-closed)", () => {
  const sandbox = makeSandbox({ branch: "main" });
  const out = runHook(fixture("malformed.txt"), sandbox);
  assert.equal(out.status, 0, "crash path must still exit 0 (deny carried by JSON)");
  assert.ok(
    out.stdout.includes('"permissionDecision":"deny"'),
    `crash path must emit a deny decision (fail-closed); got: ${JSON.stringify(out.stdout)}`
  );
});
