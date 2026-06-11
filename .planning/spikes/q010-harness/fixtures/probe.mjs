#!/usr/bin/env node
// Q-010 fixture: $CLAUDE_PROJECT_DIR expansion probe (resolves assumption A2).
// Wired via `node "$CLAUDE_PROJECT_DIR/.claude/hooks/probe.mjs"` in settings.
// If THIS script runs at all, the variable expanded in the hook command line
// (otherwise node could not resolve the script path). It also records the env
// value so the report can show both expansion layers. No decision emitted.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

let input = {};
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch {
  /* ignore */
}

try {
  const dir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  writeFileSync(
    join(dir, "cpd-probe.json"),
    JSON.stringify(
      {
        ranAt: new Date().toISOString(),
        argv1: process.argv[1],
        env_CLAUDE_PROJECT_DIR: process.env.CLAUDE_PROJECT_DIR ?? null,
        cwd: process.cwd(),
        tool_name: input.tool_name ?? null
      },
      null,
      2
    )
  );
} catch {
  /* ignore */
}
process.exit(0); // no decision — normal permission flow continues
