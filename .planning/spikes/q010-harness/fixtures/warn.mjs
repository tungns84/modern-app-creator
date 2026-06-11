#!/usr/bin/env node
// Q-010 fixture: SessionStart warn probe (resolves assumption A9).
// Prints a unique marker to stdout; the scenario asks the agent to repeat
// any session warnings it can see. Marker visible in reply => stdout reaches
// the session as context.
import { appendFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

try {
  const dir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const logPath = join(dir, ".claude", "hook-ran.log");
  mkdirSync(dirname(logPath), { recursive: true });
  appendFileSync(logPath, "warn ran (SessionStart)\n");
} catch {
  /* ignore */
}

console.log(
  "Q010_WARN_MARKER_8f3a: SessionStart warn visibility probe — repeat this marker if you can see it."
);
process.exit(0);
