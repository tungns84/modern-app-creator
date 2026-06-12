// plan-compliance.mjs — GATE-10 verdict core (L2 enforcement floor, plan 01-09).
//
// Pure transform: evaluate() takes plain data (changed files, head branch,
// specs tree root, reviews, author, waivers, clock) and returns
// { verdict: "PASS"|"FAIL", reasons[], warnings[] }. No network — the
// workflow shell fetches everything fresh via `gh api` (Pitfall 5) and feeds
// JSON files plus --branch to the CLI below.
//
// 8-step algorithm (RESEARCH Pattern 3) extended with PR<->spec BINDING:
//   1. classify changed files via the SHARED matcher (lib/tiers.mjs, D-22) —
//      meta paths excluded in data (D-06)
//   2. no T3 hit → PASS
//   3. T3 hit → resolve the BOUND spec number: head branch feat/NNN-*
//      (convention from spec unit 001/01-12), else a specs/NNN-*/plan.md
//      added/modified in the PR diff itself; no resolution → FAIL
//      (unrelated approved specs NEVER satisfy the gate — anti-rot, T-01-36)
//   4. bound spec must exist with `tier: T3` AND a non-empty `Approved-by:`
//      line — the rich findBoundApprovedPlan return names the exact missing
//      marker (01-04 contract)
//   5. identity: >=1 latest-per-user APPROVED review, non-author, non-Bot,
//      strict commit binding when head SHA known (D-02, Q-002)
//   6. identity failed → consult .cowork/waivers.json: a non-expired
//      {scope: "self-approval"} waiver passes the identity step ONLY, with a
//      prominent warning; an expired waiver FAILS (D-10, waiver-rot)
//   7. every red line names the violated rule + the fix (FR-E08)
//
// Zero npm dependencies — node: builtins + the shared lib only.
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  loadTiers,
  matchTier,
  specNumberFromBranch,
  findBoundApprovedPlan,
} from "../../.claude/hooks/lib/tiers.mjs";
import { reduceReviews } from "./assert-non-author-approval.mjs";

const CONVENTION_FIX =
  "Fix: create the change on a feat/NNN-short-name branch bound to its spec " +
  "unit (specs/NNN-*/plan.md with `tier: T3` and a non-empty `Approved-by:` " +
  "line), or add/modify that bound plan.md in this PR's diff.";

/** Normalize a changed-files input item (fixture/API object or plain string). */
function fileName(item) {
  return typeof item === "string" ? item : item?.filename ?? "";
}

/** Spec number from a plan.md path added/modified in the diff, else null. */
function specNumberFromDiffPath(filePath) {
  const m = /^specs\/(\d{3})-[^/]+\/plan\.md$/.exec(filePath.replace(/\\/g, "/"));
  return m ? m[1] : null;
}

/** Waiver expiry: expired when `now` is past the end of the expires day. */
function waiverExpired(waiver, nowMs) {
  if (!waiver?.expires) return true; // no expiry date = unusable (fail closed)
  const end = Date.parse(`${waiver.expires}T23:59:59Z`);
  return Number.isNaN(end) ? true : nowMs > end;
}

/**
 * GATE-10 verdict.
 *
 * @param {object} input
 * @param {Array<object|string>} input.changedFiles  PR files (API shape or paths)
 * @param {string} input.branch       PR head ref (head.ref)
 * @param {string} input.specsTree    root dir whose specs/ subdir is scanned
 * @param {Array<object>} input.reviews  pulls/N/reviews items
 * @param {string} input.author       PR author login
 * @param {object|Array|null} input.waivers  parsed waivers.json ({waivers:[]} or [])
 * @param {object} [input.tiers]      parsed tiers.json (default: loadTiers(cwd))
 * @param {string} [input.headSha]    PR head SHA — strict commit binding when set
 * @param {string|Date} [input.now]   injected clock (default: new Date())
 * @returns {{verdict: "PASS"|"FAIL", reasons: string[], warnings: string[]}}
 */
export function evaluate({
  changedFiles,
  branch,
  specsTree,
  reviews,
  author,
  waivers,
  tiers,
  headSha,
  now,
} = {}) {
  const reasons = [];
  const warnings = [];
  const tiersData = tiers ?? loadTiers(process.cwd());
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(now ?? new Date().toISOString());

  // Step 1-2: classify changed files via the SHARED matcher (D-22).
  const files = (Array.isArray(changedFiles) ? changedFiles : []).map(fileName).filter(Boolean);
  const t3Hits = [];
  let metaCount = 0;
  for (const f of files) {
    const tier = matchTier(f, tiersData);
    if (tier === "T3") t3Hits.push(f);
    else if (tier === "meta") metaCount += 1;
  }

  if (t3Hits.length === 0) {
    const note =
      metaCount === files.length && files.length > 0
        ? "PASS: no T3 paths touched — all changed files are GSD meta paths, excluded in tiers.json data (D-06)."
        : "PASS: no T3 paths touched — GATE-10 does not require a spec unit for this diff.";
    warnings.push(note);
    return { verdict: "PASS", reasons, warnings };
  }

  // Step 3: PR<->spec binding — branch feat/NNN-*, else plan.md in the diff.
  let nnn = specNumberFromBranch(branch);
  let bindingSource = nnn ? `head branch '${branch}'` : null;
  if (nnn === null) {
    for (const f of files) {
      const fromDiff = specNumberFromDiffPath(f);
      if (fromDiff !== null) {
        nnn = fromDiff;
        bindingSource = `plan.md added/modified in this PR's diff ('${f}')`;
        break;
      }
    }
  }

  if (nnn === null) {
    reasons.push(
      `FAIL [GATE-10 binding]: T3 path(s) touched (${t3Hits.join(", ")}) but head ` +
        `branch '${branch}' is not bound to a spec unit (no feat/NNN-* match) and ` +
        `no specs/NNN-*/plan.md is added/modified in the diff. Unrelated approved ` +
        `specs elsewhere in the tree never satisfy GATE-10. ${CONVENTION_FIX}`
    );
    return { verdict: "FAIL", reasons, warnings };
  }

  // Step 4: the BOUND spec unit must exist and carry both markers.
  const bound = findBoundApprovedPlan(specsTree, nnn);
  if (!bound.found) {
    reasons.push(
      `FAIL [GATE-10 binding]: T3 path(s) touched (${t3Hits.join(", ")}) and the ` +
        `change is bound via ${bindingSource} to spec ${nnn}, but the bound artifact ` +
        `specs/${nnn}-*/plan.md does not exist — unrelated approved specs do not ` +
        `satisfy GATE-10 (anti-rot). Fix: create and approve specs/${nnn}-*/plan.md ` +
        `(tier: T3 + Approved-by:) before merging this T3 change.`
    );
    return { verdict: "FAIL", reasons, warnings };
  }
  if (!bound.hasTier) {
    reasons.push(
      `FAIL [GATE-10 spec markers]: bound plan '${bound.path}' exists but its ` +
        `'tier: T3' marker is missing. Fix: add the 'tier: T3' line to the bound ` +
        `plan.md (AI-COWORK spec-unit format) and re-run the check.`
    );
  }
  if (!bound.hasApprovedBy) {
    reasons.push(
      `FAIL [GATE-10 spec markers]: bound plan '${bound.path}' exists but its ` +
        `'Approved-by:' line is missing or empty. Fix: obtain human approval and ` +
        `record the 'Approved-by: <login> <date>' audit line (the line is audit ` +
        `trail — authorization itself is the PR review, D-02).`
    );
  }
  if (reasons.length > 0) return { verdict: "FAIL", reasons, warnings };

  // Step 5: approver identity — reviews API is the source of truth (D-02).
  const approvers = reduceReviews(reviews, author, { headSha });
  if (approvers.length > 0) {
    warnings.push(
      `PASS: spec ${nnn} bound via ${bindingSource}; approved plan '${bound.path}'; ` +
        `qualifying approval(s) by: ${approvers.join(", ")}.`
    );
    return { verdict: "PASS", reasons, warnings };
  }

  // Step 6: identity failed → waiver register (D-10). Identity ONLY — the
  // binding steps above have already passed by the time we get here.
  const waiverList = Array.isArray(waivers) ? waivers : waivers?.waivers ?? [];
  const selfApprovalWaivers = waiverList.filter((w) => w?.scope === "self-approval");
  const valid = selfApprovalWaivers.find((w) => !waiverExpired(w, nowMs));

  if (valid) {
    warnings.push(
      `WARNING [D-10 waiver]: no qualifying non-author approval on this PR — ` +
        `identity step passed ONLY via waiver ${valid.id} (scope: self-approval, ` +
        `expires: ${valid.expires}). This is a time-boxed solo-developer waiver; ` +
        `on expiry or when a second reviewer joins, this PR flow MUST require a ` +
        `real non-author review.`
    );
    return { verdict: "PASS", reasons, warnings };
  }

  if (selfApprovalWaivers.length > 0) {
    const ids = selfApprovalWaivers.map((w) => `${w.id} (expired ${w.expires})`).join(", ");
    reasons.push(
      `FAIL [GATE-10 identity / D-10]: no qualifying approving review (latest-per-` +
        `user, state APPROVED, non-author, non-Bot${headSha ? ", commit-bound to head SHA" : ""}) ` +
        `and the self-approval waiver expired: ${ids}. Fix: renew the waiver in ` +
        `.cowork/waivers.json via Architect/Tech-Lead approval, or obtain a real ` +
        `non-author review.`
    );
  } else {
    reasons.push(
      `FAIL [GATE-10 identity]: no qualifying approving review — required: >=1 ` +
        `latest-per-user review with state APPROVED by a non-author, non-Bot user` +
        `${headSha ? " on the current head SHA" : ""}. Fix: request a review and get an ` +
        `approval on the latest commit, or register a time-boxed waiver (D-10).`
    );
  }
  return { verdict: "FAIL", reasons, warnings };
}

// ---------------------------------------------------------------------------
// CLI mode (consumed by .github/workflows/plan-compliance.yml):
//   node scripts/checks/plan-compliance.mjs --files <files.json>
//     --reviews <reviews.json> --author <login> --branch <headRef>
//     [--head-sha <sha>] [--specs-dir specs] [--waivers .cowork/waivers.json]
//     [--now <iso>]
// Prints one line per reason/warning, exits 0 on PASS, 1 on FAIL.
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key.startsWith("--")) {
      args[key.slice(2)] = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.files || !args.reviews || !args.author || !args.branch) {
    console.error(
      "usage: node scripts/checks/plan-compliance.mjs --files <files.json> " +
        "--reviews <reviews.json> --author <login> --branch <headRef> " +
        "[--head-sha <sha>] [--specs-dir specs] [--waivers <waivers.json>] [--now <iso>]"
    );
    process.exit(2);
  }

  const specsDir = path.resolve(args["specs-dir"] ?? "specs");
  const specsTree = path.dirname(specsDir); // findBoundApprovedPlan scans <root>/specs
  const waiversPath = args.waivers ?? path.join(specsTree, ".cowork", "waivers.json");

  let waivers = null;
  try {
    waivers = JSON.parse(readFileSync(waiversPath, "utf8"));
  } catch {
    waivers = null; // no register — waiver path simply unavailable
  }

  const result = evaluate({
    changedFiles: JSON.parse(readFileSync(args.files, "utf8")),
    branch: args.branch,
    specsTree,
    reviews: JSON.parse(readFileSync(args.reviews, "utf8")),
    author: args.author,
    waivers,
    tiers: loadTiers(specsTree),
    headSha: args["head-sha"],
    now: args.now,
  });

  for (const line of [...result.reasons, ...result.warnings]) console.log(line);
  console.log(`plan-compliance verdict: ${result.verdict}`);
  process.exit(result.verdict === "PASS" ? 0 : 1);
}

// gate-probe (b): T3 change bound to specs/002 - expect PASS + W-001 warning
