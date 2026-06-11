#!/usr/bin/env node
// Q-010 fixture: always-deny PreToolUse hook.
// Mirrors the fail-closed reference shape (RESEARCH Code Example 2):
// decision carried by stdout JSON, exit 0. Side-channel log proves execution.
import { readFileSync, appendFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

function sideChannel(line) {
  try {
    const dir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    const logPath = join(dir, ".claude", "hook-ran.log");
    mkdirSync(dirname(logPath), { recursive: true });
    appendFileSync(logPath, line + "\n");
  } catch {
    /* side channel only — never break the decision path */
  }
}

let input = {};
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch {
  /* still deny below — this fixture always denies */
}

sideChannel(
  `deny-all ran tool=${input.tool_name ?? "?"} cwd=${process.cwd()} ` +
    `CLAUDE_PROJECT_DIR=${process.env.CLAUDE_PROJECT_DIR ?? "UNSET"}`
);

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason:
        "Q010-DENY: blocked by spike fixture hook. This is the Q-010 stability matrix probe — the action must not proceed."
    }
  })
);
process.exit(0);
