// t4-command-guard.mjs — PreToolUse Bash guard (L1 enforcement).
//
// Two responsibilities:
// 1. T4 command patterns (deploy, secret ops, destructive git/db, from
//    .cowork/tiers.json t4.commandPatterns — never hardcoded, D-22) → deny;
//    a HUMAN executes T4 commands (AI-COWORK §5 L1).
// 2. BEST-EFFORT write-bypass scan (Q-010 scenario 4 / Pitfall 2: Bash
//    redirects bypass the Write|Edit matcher): redirects `>`/`>>`, `tee`,
//    `sed -i`, `git apply` whose target token matches a T3 path get the same
//    branch-bound gate as t3-plan-gate. Documented best-effort only — a
//    determined evasion succeeds; the L2 CI gate (plan 01-09) is the floor
//    (D-16).
//
// FAIL-CLOSED BY CONSTRUCTION (Q-010 A1): whole script in try/catch; catch
// emits deny JSON + exit 0. Zero npm dependencies; only `node` + `git` on
// PATH (3-OS rule).
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import {
  loadTiers,
  matchTier,
  isT4Command,
  specNumberFromBranch,
  findBoundApprovedPlan,
} from "./lib/tiers.mjs";

function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    })
  );
  process.exit(0); // decision carried by JSON, never by exit code (Pitfall 1)
}

/**
 * Best-effort extraction of filesystem write targets from a shell command:
 * `> file`, `>> file`, `tee [-a] file`, `sed -i ... file`, `git apply file`.
 * Over-extraction is acceptable — every candidate is then tier-checked.
 */
function extractWriteTargets(command) {
  const targets = [];
  let m;
  // Redirects: `>` or `>>` followed by a path token (skips `2>&1` style fd dups).
  const redirect = />{1,2}\s*([^\s;|&<>]+)/g;
  while ((m = redirect.exec(command)) !== null) targets.push(m[1]);
  // tee [-flags] file
  const tee = /\btee\b\s+(?:-\S+\s+)*([^\s;|&<>]+)/g;
  while ((m = tee.exec(command)) !== null) targets.push(m[1]);
  // sed -i ... / git apply ... — every non-flag token in the segment is a candidate.
  const inPlace = /\b(?:sed\s+(?:-\S+\s+)*-i\S*|git\s+apply)\b([^;|&]*)/g;
  while ((m = inPlace.exec(command)) !== null) {
    for (const tok of m[1].trim().split(/\s+/)) {
      const cleaned = tok.replace(/^['"]|['"]$/g, "");
      if (cleaned && !cleaned.startsWith("-")) targets.push(cleaned);
    }
  }
  return targets;
}

try {
  const input = JSON.parse(readFileSync(0, "utf8")); // stdin
  const command = input.tool_input?.command ?? "";
  if (!command) process.exit(0);

  const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const tiers = loadTiers(root);

  // 1. T4 command patterns → human executes.
  if (isT4Command(command, tiers)) {
    deny(
      `This is a T4 command — a human executes it. The command matches a T4 ` +
        `pattern in .cowork/tiers.json (deploy / secret ops / destructive ` +
        `git or db). Do not retry from the agent; ask the human operator to ` +
        `run it manually and report the result.`
    );
  }

  // 2. Best-effort write-bypass scan into T3 paths (Pitfall 2).
  const t3Targets = extractWriteTargets(command).filter(
    (t) => matchTier(t, tiers) === "T3"
  );
  if (t3Targets.length > 0) {
    // Same branch-bound gate as t3-plan-gate (shared helpers, D-22).
    let branch;
    try {
      branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
    } catch {
      deny(
        `Bash command writes into T3 path '${t3Targets[0]}' but the current ` +
          `git branch could not be read — failing closed. Fix the git ` +
          `checkout, then retry, or use the Write/Edit tools under an ` +
          `approved bound plan (specs/NNN-*/plan.md with Approved-by:).`
      );
    }
    const nnn = specNumberFromBranch(branch);
    const bound = nnn === null ? null : findBoundApprovedPlan(root, nnn);
    if (!(bound && bound.found && bound.hasApprovedBy)) {
      deny(
        `Bash write-bypass blocked (best-effort scan): the command targets ` +
          `T3 path '${t3Targets[0]}' without a bound approved plan. T3 ` +
          `changes require branch feat/NNN-* with specs/NNN-*/plan.md ` +
          `containing a non-empty Approved-by: line. Next step: create the ` +
          `feat/NNN-* branch, run the plan skill, get approval, then retry ` +
          `via the Write/Edit tools.`
      );
    }
  }

  process.exit(0); // no T4 hit, no unapproved T3 bypass — tool proceeds
} catch (err) {
  // Pitfall 1: internal error on an unproven-safe input → DENY (fail-closed).
  deny(
    `T4 guard internal error (${err?.message ?? err}) — failing closed ` +
      `because the command could not be proven safe. Fix .claude/hooks, ` +
      `then retry.`
  );
}
