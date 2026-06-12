// session-version-warn.mjs — SessionStart version-pin warner (D-11).
//
// Compares the running `claude --version` against the tested pin in
// .cowork/tiers.json (claudeCode.testedVersion, recorded by the Q-010 spike).
// WARN-NOT-BLOCK: prints a warning into session context on mismatch
// (Q-010 A9 confirmed SessionStart stdout is visible as context).
//
// A warn hook must NEVER break a session: the entire script is wrapped in
// try/catch and exits 0 silently on any error (missing tiers.json, missing
// claude binary, anything).
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";

try {
  const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const tiers = JSON.parse(
    readFileSync(path.join(root, ".cowork", "tiers.json"), "utf8")
  );
  const pinned = tiers.claudeCode?.testedVersion;
  if (pinned) {
    const actual = execSync("claude --version", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (!actual.startsWith(pinned)) {
      console.log(
        `WARNING: Claude Code ${actual} != tested ${pinned}. ` +
          `Hook behavior unverified on this version (Q-010 matrix). ` +
          `CI gates remain the floor.`
      );
    }
  }
} catch {
  // Silent: a version warner must never block or break a session (D-11).
}
process.exit(0);
