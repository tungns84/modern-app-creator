// meta-link-lint.mjs — D-06/D-07 separation gate (Pitfall 10).
// Zero npm dependencies (must run on fresh clone before any install).
//
// Shipped dirs must contain ZERO references to the meta planning dir: meta
// artifacts die at templating time, so any shipped link into them is a dead
// link (and an information leak, T-01-35) in every generated project.
//
// Modes:
//   default          scan TRACKED files (git ls-files) under the shipped dirs
//   --root <path>    fs-walk <path>/<shipped dirs> instead (fixture testing;
//                    no git required)
//
// Explicit allowlist (narrow, justified) — everything else fails:
//   - hook/check/init TEST trees: the tier system's meta-EXCLUSION logic can
//     only be tested by naming the excluded dir as fixture DATA
//   - docs/methodology/AI-COWORK.md: D-12 verbatim copy of the upstream
//     product doc, whose footer carries a source citation; verbatim-ness
//     forbids editing the copy
//
// CLI: node scripts/checks/meta-link-lint.mjs [--root <path>]
// Exit 1 on any hit, listing file + line; rule-named messages.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

// Built by concatenation so this file never contains its own needle.
const NEEDLE = ".plan" + "ning/";

export const SHIPPED_DIRS = [
  "docs",
  "specs",
  "backend",
  "frontend",
  ".claude",
  "templates",
  "scripts",
  "infra",
  ".github",
];

// Repo-relative posix prefixes exempt from the scan (see header for reasons).
export const ALLOWLIST = [
  ".claude/hooks/tests/",
  "scripts/checks/tests/",
  "scripts/tests/",
  "docs/methodology/AI-COWORK.md",
];

function isAllowed(relPath) {
  return ALLOWLIST.some(
    (entry) => relPath === entry || relPath.startsWith(entry)
  );
}

function listTrackedFiles(root) {
  const existing = SHIPPED_DIRS.filter((d) => existsSync(join(root, d)));
  if (existing.length === 0) return [];
  const out = execFileSync("git", ["ls-files", "-z", "--", ...existing], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return out.split("\0").filter(Boolean);
}

function walkFiles(root) {
  const files = [];
  const walk = (rel) => {
    for (const entry of readdirSync(join(root, rel))) {
      if (entry === ".git" || entry === "node_modules" || entry === "worktrees")
        continue;
      const childRel = rel === "" ? entry : `${rel}/${entry}`;
      const st = statSync(join(root, childRel));
      if (st.isDirectory()) walk(childRel);
      else files.push(childRel);
    }
  };
  for (const dir of SHIPPED_DIRS) {
    if (existsSync(join(root, dir))) walk(dir);
  }
  return files;
}

/**
 * Scan shipped dirs under `root` for meta planning-dir references.
 * @param {string} root
 * @param {{tracked?: boolean}} [opts] tracked=true uses git ls-files (default)
 * @returns {string[]} rule-named problem lines (empty = pass)
 */
export function lintMetaLinks(root, opts = {}) {
  const tracked = opts.tracked !== false;
  const files = tracked ? listTrackedFiles(root) : walkFiles(root);
  const problems = [];
  for (const rel of files) {
    if (isAllowed(rel)) continue;
    let raw;
    try {
      raw = readFileSync(join(root, rel));
    } catch {
      continue; // deleted-but-tracked race; nothing to scan
    }
    if (raw.includes(0)) continue; // binary — not a doc surface
    const text = raw.toString("utf8");
    if (!text.includes(NEEDLE)) continue;
    const lines = text.split(/\r\n|\n|\r/);
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(NEEDLE)) {
        problems.push(
          `meta-link-lint/meta-reference VIOLATION: ${rel}:${i + 1} references ` +
            `the meta planning dir ("${NEEDLE}") — shipped artifacts must never ` +
            `link meta internals (D-06/D-07, Pitfall 10). Fix: inline the ` +
            `evidence or drop the reference.`
        );
      }
    }
  }
  return problems;
}

function main() {
  const argv = process.argv.slice(2);
  let root = process.cwd();
  let tracked = true;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--root") {
      root = argv[++i];
      tracked = false; // fixture roots are not git repos — walk the fs
      if (!root) throw new Error("meta-link-lint: missing value for --root");
    } else {
      throw new Error(`meta-link-lint: unknown argument "${argv[i]}"`);
    }
  }
  const problems = lintMetaLinks(root, { tracked });
  for (const p of problems) console.error(p);
  if (problems.length === 0) {
    console.log(
      `meta-link-lint OK: zero meta planning-dir references in shipped dirs ` +
        `(${SHIPPED_DIRS.join(", ")})`
    );
  }
  process.exit(problems.length > 0 ? 1 : 0);
}

const isCliEntry =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCliEntry) main();
