// claude-md-check.mjs — GATE-12 check: render → line budgets → command smoke.
// Zero npm dependencies (must run on fresh clone before any install).
//
// CLI contract:
//   node scripts/checks/claude-md-check.mjs \
//     --root-template <path> --tree-file <path>... \
//     --smoke-manifest <path> [--leg ubuntu|windows|macos]
//
// Exits non-zero on any violation. Every failure line names the violated
// rule + file + measured value (FR-E08 error-legibility seed).
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { render } from "./render-claude-md.mjs";

const ROOT_BUDGET = 200; // rendered root CLAUDE.md (D-15 / GATE-12)
const TREE_BUDGET = 150; // in-place tree CLAUDE.md files (D-15 / GATE-12)
const SAMPLE_VALUES = { projectName: "smoke", groupId: "com.acme", artifactId: "app" };

/**
 * Count lines after normalizing CRLF/CR to LF (Pitfall 6 — CRLF must never
 * inflate counts cross-OS). A trailing newline does not add a line.
 * @param {string} text
 * @returns {number}
 */
export function countLines(text) {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (normalized === "") return 0;
  const body = normalized.endsWith("\n") ? normalized.slice(0, -1) : normalized;
  return body.split("\n").length;
}

/**
 * Check a file against a line budget.
 * @param {string} filePath
 * @param {number} maxLines
 * @returns {{pass: boolean, actual: number, message: string}}
 */
export function checkBudget(filePath, maxLines) {
  const actual = countLines(readFileSync(filePath, "utf8"));
  const pass = actual <= maxLines;
  const message = pass
    ? `GATE-12/line-budget OK: ${filePath} has ${actual} lines (budget ${maxLines})`
    : `GATE-12/line-budget VIOLATION: ${filePath} has ${actual} lines, exceeds budget of ${maxLines}`;
  return { pass, actual, message };
}

/**
 * Run the command smoke for one CI leg. Only explicitly declared commands
 * run — no prose-regex extraction. Throws when zero commands are declared
 * for the leg so the gate goes red instead of vacuously green (Pitfall 9).
 * Commands execute via execFileSync argv split, never a shell string (T-01-20).
 * @param {string} manifestPath JSON {commands:[{cmd, legs:[...]}]}
 * @param {string} leg ubuntu|windows|macos
 * @returns {{ran: number, failures: Array<{cmd: string, error: string}>}}
 */
export function runSmoke(manifestPath, leg) {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const declared = Array.isArray(manifest.commands) ? manifest.commands : [];
  const forLeg = declared.filter((c) => Array.isArray(c.legs) && c.legs.includes(leg));
  if (forLeg.length === 0) {
    throw new Error(
      `GATE-12/command-smoke: no commands declared for leg "${leg}" in ${manifestPath} — ` +
      `vacuous smoke is a failure, not a pass (Pitfall 9)`,
    );
  }
  const failures = [];
  for (const { cmd } of forLeg) {
    const argv = cmd.trim().split(/\s+/);
    try {
      execFileSync(argv[0], argv.slice(1), { stdio: "pipe", shell: false });
    } catch (err) {
      failures.push({ cmd, error: err.message });
    }
  }
  return { ran: forLeg.length, failures };
}

function defaultLeg() {
  if (process.platform === "win32") return "windows";
  if (process.platform === "darwin") return "macos";
  return "ubuntu";
}

function parseArgs(argv) {
  const args = { rootTemplate: null, treeFiles: [], smokeManifest: null, leg: defaultLeg() };
  for (let i = 0; i < argv.length; i++) {
    const next = () => {
      i += 1;
      if (i >= argv.length) throw new Error(`claude-md-check: missing value for ${argv[i - 1]}`);
      return argv[i];
    };
    switch (argv[i]) {
      case "--root-template": args.rootTemplate = next(); break;
      case "--tree-file": args.treeFiles.push(next()); break;
      case "--smoke-manifest": args.smokeManifest = next(); break;
      case "--leg": args.leg = next(); break;
      default: throw new Error(`claude-md-check: unknown argument "${argv[i]}"`);
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const problems = [];

  // 1. Render the root template with sample values → temp file → ≤200 lines.
  if (args.rootTemplate) {
    try {
      const rendered = render(readFileSync(args.rootTemplate, "utf8"), SAMPLE_VALUES);
      const tempPath = join(mkdtempSync(join(tmpdir(), "gate12-render-")), "CLAUDE.md");
      writeFileSync(tempPath, rendered);
      const budget = checkBudget(tempPath, ROOT_BUDGET);
      if (!budget.pass) {
        problems.push(
          `GATE-12/root-budget VIOLATION: rendered ${args.rootTemplate} has ${budget.actual} lines, ` +
          `exceeds budget of ${ROOT_BUDGET}`,
        );
      }
    } catch (err) {
      problems.push(`GATE-12/render VIOLATION: ${args.rootTemplate}: ${err.message}`);
    }
  }

  // 2. Each tree file checked in place → ≤150 lines.
  for (const treeFile of args.treeFiles) {
    try {
      const budget = checkBudget(treeFile, TREE_BUDGET);
      if (!budget.pass) problems.push(budget.message.replace("line-budget", "tree-budget"));
    } catch (err) {
      problems.push(`GATE-12/tree-budget VIOLATION: ${treeFile}: ${err.message}`);
    }
  }

  // 3. Command smoke for the leg (vacuous-green guarded).
  if (args.smokeManifest) {
    try {
      const smoke = runSmoke(args.smokeManifest, args.leg);
      for (const failure of smoke.failures) {
        problems.push(
          `GATE-12/command-smoke VIOLATION: command "${failure.cmd}" failed on leg "${args.leg}": ${failure.error}`,
        );
      }
      if (smoke.failures.length === 0) {
        console.log(`GATE-12/command-smoke OK: ${smoke.ran} command(s) ran green on leg "${args.leg}"`);
      }
    } catch (err) {
      problems.push(err.message);
    }
  }

  for (const problem of problems) console.error(problem);
  if (problems.length === 0) console.log("GATE-12 OK: all budgets and smoke checks passed");
  process.exit(problems.length > 0 ? 1 : 0); // exit code = failed rules capped at 1
}

const isCliEntry =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCliEntry) main();
