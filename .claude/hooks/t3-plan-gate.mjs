// t3-plan-gate.mjs — PreToolUse Write|Edit gate (L1 enforcement, AGENT-03).
//
// Contract: stdin JSON → stdout decision JSON. A T3-path Write/Edit is denied
// unless the CURRENT branch's BOUND spec exists (branch feat/NNN-* →
// specs/NNN-*/plan.md with a non-empty Approved-by: line). Unrelated approved
// specs never satisfy the gate (anti-rot); on an unbound branch T3 writes are
// always denied.
//
// FAIL-CLOSED BY CONSTRUCTION (Q-010 A1: a crashing hook is a silent
// fail-OPEN on Claude Code 2.1.173 — non-zero exit codes are non-blocking).
// The whole script runs in try/catch; the catch emits a deny JSON and exits 0.
// A failed git branch read on a T3-relevant input also denies.
//
// L1 is best-effort by design (D-16): a developer kill-switch
// (disableAllHooks in settings.local.json) exists; the L2 CI gate (plan
// 01-09, same binding helpers) is the enforcement floor.
//
// Zero npm dependencies — only node: builtins; only `node` and `git` assumed
// on PATH (3-OS rule: Win/macOS/Linux, no WSL).
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import {
  loadTiers,
  matchTier,
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

const NEXT_STEP =
  "Next step: create a feat/NNN-* branch for this spec unit, run the plan " +
  "skill to produce specs/NNN-*/plan.md, get the plan approved " +
  "(non-empty Approved-by: line), then retry.";

try {
  const input = JSON.parse(readFileSync(0, "utf8")); // stdin
  const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();

  const rawPath = input.tool_input?.file_path ?? "";
  if (!rawPath) process.exit(0); // nothing to classify

  // Claude Code may pass absolute paths; tiers globs are repo-relative.
  let rel = rawPath;
  if (path.isAbsolute(rawPath)) {
    rel = path.relative(root, rawPath);
    if (rel.startsWith("..")) process.exit(0); // outside the project — not our tier domain
  }

  const tiers = loadTiers(root);
  const tier = matchTier(rel, tiers);
  if (tier !== "T3") process.exit(0); // meta (D-06) or unmatched — silent pass

  // T3 path — branch-bound gate.
  let branch;
  try {
    branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    deny(
      `T3 gate: '${rel}' is a T3 path but the current git branch could not ` +
        `be read — failing closed (a T3 write cannot be proven bound to an ` +
        `approved plan without the branch). Fix the git checkout, then retry. ` +
        NEXT_STEP
    );
  }

  const nnn = specNumberFromBranch(branch);
  if (nnn === null) {
    deny(
      `T3 path '${rel}' cannot be modified from branch '${branch}' — the ` +
        `branch is not bound to a spec unit. T3 changes require the bound ` +
        `approved plan specs/NNN-*/plan.md (branch convention feat/NNN-*) ` +
        `with a non-empty Approved-by: line. ` +
        NEXT_STEP
    );
  }

  const bound = findBoundApprovedPlan(root, nnn);
  if (!(bound.found && bound.hasApprovedBy)) {
    const detail = bound.found
      ? `specs/${nnn}-*/plan.md exists but its Approved-by: line is missing or empty`
      : `the bound artifact specs/${nnn}-*/plan.md does not exist`;
    deny(
      `T3 path '${rel}' on branch '${branch}': ${detail}. The gate requires ` +
        `specs/${nnn}-*/plan.md with a non-empty Approved-by: line — ` +
        `unrelated approved specs never satisfy it. ` +
        `Next step: run the plan skill for spec ${nnn}, get the plan ` +
        `approved (Approved-by:), then retry.`
    );
  }

  process.exit(0); // bound + approved — no decision, tool proceeds
} catch (err) {
  // Pitfall 1: any internal error on an input we could not prove safe → DENY.
  deny(
    `T3 gate internal error (${err?.message ?? err}) — failing closed ` +
      `because the input could not be proven safe. Fix .claude/hooks or run ` +
      `the plan skill, then retry.`
  );
}
