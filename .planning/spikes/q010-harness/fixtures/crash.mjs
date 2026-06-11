#!/usr/bin/env node
// Q-010 fixture: deliberate crash probe (resolves assumption A1).
// Logs proof-of-execution, then throws — uncaught exception => exit code 1.
// Question under test: does a non-2 non-zero exit BLOCK or PROCEED (fail-open)?
import { appendFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

try {
  const dir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const logPath = join(dir, ".claude", "hook-ran.log");
  mkdirSync(dirname(logPath), { recursive: true });
  appendFileSync(logPath, `crash ran cwd=${process.cwd()}\n`);
} catch {
  /* ignore */
}

throw new Error("Q010 deliberate crash (fail-open probe, exit 1)");
