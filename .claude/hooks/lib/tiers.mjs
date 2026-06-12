// lib/tiers.mjs — the SINGLE place glob matching and spec binding live (D-22).
// Consumed by the L1 hooks (t3-plan-gate, t4-command-guard) AND imported
// unchanged by the L2 CI gate (plan 01-09) — one matcher, one binding
// implementation.
//
// Zero npm dependencies (hooks must work on a fresh clone before `npm ci`):
// only node: builtins. Hand-rolled glob subset: `**` crosses directories,
// `*` stays within a segment, everything else is literal. Fallback if globs
// outgrow this subset: minimatch (pre-approved, RESEARCH Package Audit).
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";

/** Normalize a path for matching: forward slashes, no leading "./". */
function normalize(p) {
  return String(p).replace(/\\/g, "/").replace(/^\.\//, "");
}

/** Compile one glob (subset: **, *, literal) to an anchored RegExp. */
function globToRegExp(glob) {
  let re = "";
  let i = 0;
  while (i < glob.length) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        if (glob[i + 2] === "/") {
          re += "(?:[^/]+/)*"; // "**/" — zero or more whole segments
          i += 3;
        } else {
          re += ".*"; // trailing "**" — anything, across directories
          i += 2;
        }
      } else {
        re += "[^/]*"; // "*" — within a single segment only
        i += 1;
      }
    } else {
      re += c.replace(/[.+^${}()|[\]\\?]/g, "\\$&");
      i += 1;
    }
  }
  return new RegExp("^" + re + "$");
}

/** Read and parse .cowork/tiers.json under rootDir (the single tier source). */
export function loadTiers(rootDir) {
  const tiersPath = path.join(rootDir, ".cowork", "tiers.json");
  return JSON.parse(readFileSync(tiersPath, "utf8"));
}

/**
 * Classify a file path against tiers.json.
 * Returns "meta" (excluded in DATA, never denied — D-06), "T3", or null.
 * meta.exclude wins over t3.paths.
 */
export function matchTier(filePath, tiers) {
  const p = normalize(filePath);
  for (const glob of tiers.meta?.exclude ?? []) {
    if (globToRegExp(glob).test(p)) return "meta";
  }
  for (const glob of tiers.t3?.paths ?? []) {
    if (globToRegExp(glob).test(p)) return "T3";
  }
  return null;
}

/** True when the command matches any t4.commandPatterns entry (substring). */
export function isT4Command(command, tiers) {
  const c = String(command);
  return (tiers.t4?.commandPatterns ?? []).some((pat) => c.includes(pat));
}

/**
 * Branch binding: `feat/NNN-*` → "NNN" (zero-padded spec number), else null.
 * An unbound branch (main, chore/*, ...) can never satisfy the T3 gate.
 */
export function specNumberFromBranch(branchName) {
  const m = /^feat\/(\d{3})-/.exec(String(branchName));
  return m ? m[1] : null;
}

/**
 * Scan "specs/<nnn>-…/plan.md" for ONLY the bound NNN — never the whole tree
 * (anti-rot: unrelated approved specs must never satisfy the gate).
 *
 * Rich return contract consumed unchanged by the CI gate (plan 01-09, D-22):
 *   { found, path, hasApprovedBy, hasTier }
 * - found:         the bound plan.md exists
 * - path:          the matched plan.md path, or null
 * - hasApprovedBy: a non-empty `Approved-by:` line is present
 * - hasTier:       a `tier: T3` marker is present
 * The L1 hook gate-pass condition is `found && hasApprovedBy`; the detail
 * fields let the CI gate name the exact missing marker.
 */
export function findBoundApprovedPlan(rootDir, nnn) {
  const result = { found: false, path: null, hasApprovedBy: false, hasTier: false };
  const specsDir = path.join(rootDir, "specs");
  let entries;
  try {
    entries = readdirSync(specsDir, { withFileTypes: true });
  } catch {
    return result; // no specs/ dir — nothing bound
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!entry.name.startsWith(`${nnn}-`)) continue;
    const planPath = path.join(specsDir, entry.name, "plan.md");
    if (!existsSync(planPath)) continue;
    result.found = true;
    result.path = planPath;
    const content = readFileSync(planPath, "utf8").replace(/\r\n/g, "\n");
    result.hasApprovedBy = /^Approved-by:\s*\S+/m.test(content);
    result.hasTier = /^tier:\s*T3/m.test(content);
    return result;
  }
  return result;
}
