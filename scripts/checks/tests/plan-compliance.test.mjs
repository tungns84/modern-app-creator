// plan-compliance.test.mjs — executable specification of GATE-10 (plan 01-09).
//
// 14 cases covering the plan-compliance verdict core:
//   tier classification (shared lib/tiers.mjs matcher, D-22/D-06),
//   PR<->spec BINDING (branch feat/NNN-* or plan.md-in-diff; anti-rot),
//   reviews-API identity reduction (Pitfall 3: latest-per-user, APPROVED,
//   non-author, non-Bot; STRICT commit binding per Q-002 spike decision),
//   waiver register (D-10: identity-only bypass, expiry on every run).
//
// Fixture review JSON mirrors the field shapes observed live in the Q-002
// spike report (user.login, user.type, state, commit_id, submitted_at;
// chronological by submitted_at). All five review states appear across the
// fixtures (APPROVED, CHANGES_REQUESTED, COMMENTED, DISMISSED, PENDING —
// A5 enum coverage requirement).
//
// specsTree inputs are real temp directories so the SAME filesystem scan
// code (findBoundApprovedPlan from lib/tiers.mjs) is exercised.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const REPO_ROOT = path.resolve(HERE, "..", "..", "..");
const FIXTURES = path.join(HERE, "fixtures");

const { loadTiers } = await import(
  new URL("../../../.claude/hooks/lib/tiers.mjs", import.meta.url).href
);
const TIERS = loadTiers(REPO_ROOT);

const AUTHOR = "tungns84";
const HEAD_SHA = "a7f9e32deadbeefcafe1234567890abcdef12345";
const NOW_VALID = "2026-06-12T00:00:00Z"; // before W-001 expiry 2026-09-30
const NOW_EXPIRED = "2026-10-01T00:00:00Z"; // after W-001 expiry

const WAIVERS = {
  waivers: [
    {
      id: "W-001",
      scope: "self-approval",
      reason: "solo developer — second reviewer does not exist yet",
      approvedBy: "tungns84",
      created: "2026-06-11",
      expires: "2026-09-30",
    },
  ],
};

function fixture(name) {
  return JSON.parse(readFileSync(path.join(FIXTURES, name), "utf8"));
}

const APPROVED_PLAN_MD = [
  "# Plan",
  "",
  "tier: T3",
  "",
  "Approved-by: tungns84 2026-06-11",
  "",
].join("\n");

const PLAN_MD_NO_TIER = ["# Plan", "", "Approved-by: tungns84 2026-06-11", ""].join("\n");
const PLAN_MD_NO_APPROVAL = ["# Plan", "", "tier: T3", "", "Approved-by:", ""].join("\n");

/**
 * Build a temp root dir containing specs/<dirName>/plan.md entries.
 * entries: { "007-gate-probe": "<plan.md content>", ... }
 */
function makeSpecsTree(entries = {}) {
  const root = mkdtempSync(path.join(tmpdir(), "gate10-specs-"));
  mkdirSync(path.join(root, "specs"), { recursive: true });
  for (const [dirName, content] of Object.entries(entries)) {
    const dir = path.join(root, "specs", dirName);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "plan.md"), content, "utf8");
  }
  return root;
}

/** Tree containing ONLY the six wave-1 approved spec units (anti-rot bait). */
function unrelatedApprovedTree() {
  const entries = {};
  for (const name of [
    "001-hooks-enforcement",
    "002-plan-compliance-ci",
    "003-local-stack",
    "004-init-script",
    "005-claude-pack",
    "006-adr-foundation",
  ]) {
    entries[name] = APPROVED_PLAN_MD;
  }
  return makeSpecsTree(entries);
}

// Modules under test loaded lazily so each case reports its own RED failure
// before the implementation exists (instead of one module-load error).
async function loadEvaluate() {
  const mod = await import(new URL("../plan-compliance.mjs", import.meta.url).href);
  return mod.evaluate;
}
async function loadReduceReviews() {
  const mod = await import(new URL("../assert-non-author-approval.mjs", import.meta.url).href);
  return mod.reduceReviews;
}

function joined(result) {
  return [...result.reasons, ...result.warnings].join("\n");
}

// ---------------------------------------------------------------------------
// Case 1 — changed files all non-T3 → PASS "no T3 paths touched"
test("1. all non-T3 changed files PASS with 'no T3 paths touched'", async () => {
  const evaluate = await loadEvaluate();
  const result = evaluate({
    changedFiles: fixture("pr-files-clean.json"),
    branch: "feat/007-x",
    specsTree: makeSpecsTree(),
    reviews: [],
    author: AUTHOR,
    waivers: null,
    tiers: TIERS,
    now: NOW_VALID,
  });
  assert.equal(result.verdict, "PASS");
  assert.match(joined(result), /no T3 paths touched/i);
});

// Case 2 — meta-only diff (.planning/**) → PASS via shared matcher (D-06)
test("2. meta-only diff (.planning/**) PASSes via meta exclusion (D-06)", async () => {
  const evaluate = await loadEvaluate();
  const result = evaluate({
    changedFiles: fixture("pr-files-meta.json"),
    branch: "chore/meta-update",
    specsTree: makeSpecsTree(),
    reviews: [],
    author: AUTHOR,
    waivers: null,
    tiers: TIERS,
    now: NOW_VALID,
  });
  assert.equal(result.verdict, "PASS");
  assert.match(joined(result), /meta/i);
});

// Case 3 — T3 touched, branch feat/007-x, bound spec absent → FAIL naming
// the touched path AND the expected bound artifact
test("3. T3 touched on feat/007-x with no specs/007-*/plan.md FAILS naming path and bound artifact", async () => {
  const evaluate = await loadEvaluate();
  const result = evaluate({
    changedFiles: fixture("pr-files-t3.json"),
    branch: "feat/007-x",
    specsTree: makeSpecsTree(),
    reviews: fixture("pr-reviews-approved.json"),
    author: AUTHOR,
    waivers: null,
    tiers: TIERS,
    headSha: HEAD_SHA,
    now: NOW_VALID,
  });
  assert.equal(result.verdict, "FAIL");
  const text = joined(result);
  assert.match(text, /\.github\/workflows\/x\.yml/);
  assert.match(text, /specs\/007-\*\/plan\.md/);
});

// Case 4 — anti-rot: ONLY unrelated approved specs (001..006) in the tree
// must never satisfy the gate (post-01-12 spec-rot, T-01-36)
test("4. anti-rot: unrelated approved specs 001..006 never satisfy GATE-10", async () => {
  const evaluate = await loadEvaluate();
  const result = evaluate({
    changedFiles: fixture("pr-files-t3.json"),
    branch: "feat/007-x",
    specsTree: unrelatedApprovedTree(),
    reviews: fixture("pr-reviews-approved.json"),
    author: AUTHOR,
    waivers: null,
    tiers: TIERS,
    headSha: HEAD_SHA,
    now: NOW_VALID,
  });
  assert.equal(result.verdict, "FAIL");
  assert.match(joined(result), /unrelated approved specs do not satisfy GATE-10/i);
});

// Case 5 — bound plan.md exists but lacks a marker → FAIL naming the SPECIFIC
// missing marker via findBoundApprovedPlan's hasTier/hasApprovedBy rich return
test("5. missing-marker FAIL names the specific absent marker (tier: T3 vs Approved-by)", async () => {
  const evaluate = await loadEvaluate();
  const base = {
    changedFiles: fixture("pr-files-t3.json"),
    branch: "feat/007-x",
    reviews: fixture("pr-reviews-approved.json"),
    author: AUTHOR,
    waivers: null,
    tiers: TIERS,
    headSha: HEAD_SHA,
    now: NOW_VALID,
  };

  const noTier = evaluate({
    ...base,
    specsTree: makeSpecsTree({ "007-gate-probe": PLAN_MD_NO_TIER }),
  });
  assert.equal(noTier.verdict, "FAIL");
  assert.match(joined(noTier), /tier: T3/);
  assert.doesNotMatch(joined(noTier), /Approved-by: line is missing/i);

  const noApproval = evaluate({
    ...base,
    specsTree: makeSpecsTree({ "007-gate-probe": PLAN_MD_NO_APPROVAL }),
  });
  assert.equal(noApproval.verdict, "FAIL");
  assert.match(joined(noApproval), /Approved-by/);
  assert.doesNotMatch(joined(noApproval), /tier: T3 marker is missing/i);
});

// Case 6 — fully bound + approved + valid non-author human review → PASS
test("6. T3 on feat/002-x with bound approved spec and valid non-author review PASSes", async () => {
  const evaluate = await loadEvaluate();
  const result = evaluate({
    changedFiles: fixture("pr-files-t3.json"),
    branch: "feat/002-x",
    specsTree: makeSpecsTree({ "002-plan-compliance-ci": APPROVED_PLAN_MD }),
    reviews: fixture("pr-reviews-approved.json"),
    author: AUTHOR,
    waivers: null,
    tiers: TIERS,
    headSha: HEAD_SHA,
    now: NOW_VALID,
  });
  assert.equal(result.verdict, "PASS");
  assert.equal(result.reasons.length, 0);
});

// Case 7 — diff-binding fallback: unbound branch, but the PR diff itself
// adds specs/007-*/plan.md which is present+approved in the tree → PASS
test("7. unbound branch with bound plan.md in the diff PASSes (diff-binding fallback)", async () => {
  const evaluate = await loadEvaluate();
  const entries = { "007-gate-probe": APPROVED_PLAN_MD };
  const result = evaluate({
    changedFiles: fixture("pr-files-t3-plus-plan.json"),
    branch: "chore/cleanup",
    specsTree: makeSpecsTree(entries),
    reviews: fixture("pr-reviews-approved.json"),
    author: AUTHOR,
    waivers: null,
    tiers: TIERS,
    headSha: HEAD_SHA,
    now: NOW_VALID,
  });
  assert.equal(result.verdict, "PASS");
});

// Case 8 — unbound branch, no plan.md in diff, tree full of old approved
// specs → FAIL instructing the feat/NNN-short-name convention
test("8. unbound branch without plan.md in diff FAILS instructing feat/NNN-short-name", async () => {
  const evaluate = await loadEvaluate();
  const result = evaluate({
    changedFiles: fixture("pr-files-t3.json"),
    branch: "chore/cleanup",
    specsTree: unrelatedApprovedTree(),
    reviews: fixture("pr-reviews-approved.json"),
    author: AUTHOR,
    waivers: null,
    tiers: TIERS,
    headSha: HEAD_SHA,
    now: NOW_VALID,
  });
  assert.equal(result.verdict, "FAIL");
  assert.match(joined(result), /feat\/NNN-short-name/);
});

// Case 9 — Pitfall 3: APPROVED then later CHANGES_REQUESTED by the same user
// → that user does NOT count (latest-per-user reduction)
test("9. stale approval superseded by CHANGES_REQUESTED does not count (Pitfall 3)", async () => {
  const evaluate = await loadEvaluate();
  const result = evaluate({
    changedFiles: fixture("pr-files-t3.json"),
    branch: "feat/002-x",
    specsTree: makeSpecsTree({ "002-plan-compliance-ci": APPROVED_PLAN_MD }),
    reviews: fixture("pr-reviews-stale.json"),
    author: AUTHOR,
    waivers: null,
    tiers: TIERS,
    headSha: HEAD_SHA,
    now: NOW_VALID,
  });
  assert.equal(result.verdict, "FAIL");
  assert.match(joined(result), /approv/i);
});

// Case 10 — bot exclusion: only APPROVED review is by user.type "Bot"
test("10. Bot approval never satisfies the identity step", async () => {
  const evaluate = await loadEvaluate();
  const result = evaluate({
    changedFiles: fixture("pr-files-t3.json"),
    branch: "feat/002-x",
    specsTree: makeSpecsTree({ "002-plan-compliance-ci": APPROVED_PLAN_MD }),
    reviews: fixture("pr-reviews-bot.json"),
    author: AUTHOR,
    waivers: null,
    tiers: TIERS,
    headSha: HEAD_SHA,
    now: NOW_VALID,
  });
  assert.equal(result.verdict, "FAIL");
});

// Case 11 — no self-approval: only approval is by the PR author
test("11. author self-approval never satisfies the identity step", async () => {
  const evaluate = await loadEvaluate();
  const result = evaluate({
    changedFiles: fixture("pr-files-t3.json"),
    branch: "feat/002-x",
    specsTree: makeSpecsTree({ "002-plan-compliance-ci": APPROVED_PLAN_MD }),
    reviews: fixture("pr-reviews-selfonly.json"),
    author: AUTHOR,
    waivers: null,
    tiers: TIERS,
    headSha: HEAD_SHA,
    now: NOW_VALID,
  });
  assert.equal(result.verdict, "FAIL");
});

// Case 12 — D-10: a non-expired self-approval waiver passes the identity step
// ONLY (prominent warning with the waiver id) — and NEVER the spec binding
test("12. valid waiver bypasses identity ONLY (warning with id), never the binding", async () => {
  const evaluate = await loadEvaluate();
  const base = {
    changedFiles: fixture("pr-files-t3.json"),
    branch: "feat/002-x",
    reviews: [],
    author: AUTHOR,
    waivers: WAIVERS,
    tiers: TIERS,
    headSha: HEAD_SHA,
    now: NOW_VALID,
  };

  // identity bypass: bound approved spec + zero reviews + valid waiver → PASS + warning
  const pass = evaluate({
    ...base,
    specsTree: makeSpecsTree({ "002-plan-compliance-ci": APPROVED_PLAN_MD }),
  });
  assert.equal(pass.verdict, "PASS");
  assert.ok(pass.warnings.some((w) => w.includes("W-001")));

  // binding NOT bypassed: same waiver, bound spec absent → FAIL
  const fail = evaluate({ ...base, specsTree: makeSpecsTree() });
  assert.equal(fail.verdict, "FAIL");
});

// Case 13 — waiver-rot: expired waiver FAILS with "waiver expired"
test("13. expired waiver FAILS with 'waiver expired'", async () => {
  const evaluate = await loadEvaluate();
  const result = evaluate({
    changedFiles: fixture("pr-files-t3.json"),
    branch: "feat/002-x",
    specsTree: makeSpecsTree({ "002-plan-compliance-ci": APPROVED_PLAN_MD }),
    reviews: [],
    author: AUTHOR,
    waivers: WAIVERS,
    tiers: TIERS,
    headSha: HEAD_SHA,
    now: NOW_EXPIRED,
  });
  assert.equal(result.verdict, "FAIL");
  assert.match(joined(result), /waiver expired/i);
});

// Case 14 — reduceReviews: chronological list reduced to latest per login;
// only APPROVED survives; DISMISSED never counts; strict commit binding
test("14. reduceReviews latest-per-user reduction rules", async () => {
  const reduceReviews = await loadReduceReviews();

  // stale fixture: APPROVED→CHANGES_REQUESTED (same user), DISMISSED,
  // COMMENTED, PENDING → nobody counts
  assert.deepEqual(reduceReviews(fixture("pr-reviews-stale.json"), AUTHOR), []);

  // straightforward approval counts
  assert.deepEqual(reduceReviews(fixture("pr-reviews-approved.json"), AUTHOR), ["reviewer-b"]);

  // CHANGES_REQUESTED then later APPROVED → latest wins, counts
  const flipped = [
    {
      id: 1,
      user: { login: "reviewer-f", type: "User" },
      state: "CHANGES_REQUESTED",
      commit_id: HEAD_SHA,
      submitted_at: "2026-06-11T09:00:00Z",
    },
    {
      id: 2,
      user: { login: "reviewer-f", type: "User" },
      state: "APPROVED",
      commit_id: HEAD_SHA,
      submitted_at: "2026-06-11T10:00:00Z",
    },
  ];
  assert.deepEqual(reduceReviews(flipped, AUTHOR), ["reviewer-f"]);

  // APPROVED then DISMISSED (same user) → DISMISSED never counts
  const dismissed = [
    {
      id: 3,
      user: { login: "reviewer-g", type: "User" },
      state: "APPROVED",
      commit_id: HEAD_SHA,
      submitted_at: "2026-06-11T09:00:00Z",
    },
    {
      id: 4,
      user: { login: "reviewer-g", type: "User" },
      state: "DISMISSED",
      commit_id: HEAD_SHA,
      submitted_at: "2026-06-11T10:00:00Z",
    },
  ];
  assert.deepEqual(reduceReviews(dismissed, AUTHOR), []);

  // STRICT commit binding (Q-002 spike decision): an approval on a different
  // commit than the head SHA never counts
  assert.deepEqual(
    reduceReviews(fixture("pr-reviews-approved.json"), AUTHOR, { headSha: "f".repeat(40) }),
    []
  );
});
