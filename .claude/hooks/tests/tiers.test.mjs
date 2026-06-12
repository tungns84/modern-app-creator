// Tests for .claude/hooks/lib/tiers.mjs — the SINGLE place glob matching and
// spec binding live (D-22). These tests pin the exported contract consumed by
// both the L1 hooks (this plan) and the L2 CI gate (plan 01-09).
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..", "..");

const LIB_HINT =
  "lib/tiers.mjs must exist and export { loadTiers, matchTier, isT4Command, specNumberFromBranch, findBoundApprovedPlan }";

async function lib() {
  try {
    return await import("../lib/tiers.mjs");
  } catch {
    return null;
  }
}

function makeSpecsSandbox(specs) {
  const dir = mkdtempSync(path.join(tmpdir(), "tiers-binding-"));
  for (const s of specs) {
    const d = path.join(dir, "specs", s.dir);
    mkdirSync(d, { recursive: true });
    writeFileSync(path.join(d, "plan.md"), s.content);
  }
  return dir;
}

// ---------------------------------------------------------------------------
// matchTier — glob subset (case 10 of the behavior table)
// ---------------------------------------------------------------------------

test("loadTiers reads the real .cowork/tiers.json from a root dir", async () => {
  const m = await lib();
  assert.ok(m, LIB_HINT);
  const tiers = m.loadTiers(repoRoot);
  assert.ok(Array.isArray(tiers.t3.paths), "tiers.t3.paths must be an array");
  assert.ok(Array.isArray(tiers.meta.exclude), "tiers.meta.exclude must be an array");
  assert.ok(Array.isArray(tiers.t4.commandPatterns), "tiers.t4.commandPatterns must be an array");
});

test("matchTier: ** crosses directories (.cowork/** matches .cowork/tiers.json)", async () => {
  const m = await lib();
  assert.ok(m, LIB_HINT);
  const tiers = m.loadTiers(repoRoot);
  assert.equal(m.matchTier(".cowork/tiers.json", tiers), "T3");
});

test("matchTier: **/pom.xml matches backend/pom.xml (any depth)", async () => {
  const m = await lib();
  assert.ok(m, LIB_HINT);
  const tiers = m.loadTiers(repoRoot);
  assert.equal(m.matchTier("backend/pom.xml", tiers), "T3");
});

test("matchTier: ** crosses multiple segments (security path deep in java tree)", async () => {
  const m = await lib();
  assert.ok(m, LIB_HINT);
  const tiers = m.loadTiers(repoRoot);
  assert.equal(
    m.matchTier("backend/src/main/java/com/acme/app/security/JwtConfig.java", tiers),
    "T3"
  );
});

test("matchTier: literal path matches (.claude/settings.json is T3)", async () => {
  const m = await lib();
  assert.ok(m, LIB_HINT);
  const tiers = m.loadTiers(repoRoot);
  assert.equal(m.matchTier(".claude/settings.json", tiers), "T3");
});

test("matchTier: * stays within a single segment", async () => {
  const m = await lib();
  assert.ok(m, LIB_HINT);
  const synthetic = { meta: { exclude: [] }, t3: { paths: ["docs/*.md"] } };
  assert.equal(m.matchTier("docs/a.md", synthetic), "T3", "docs/*.md must match docs/a.md");
  assert.equal(
    m.matchTier("docs/sub/a.md", synthetic),
    null,
    "single * must NOT cross a directory boundary"
  );
});

test("matchTier: meta exclusion wins over T3 (.planning/** is meta, D-06)", async () => {
  const m = await lib();
  assert.ok(m, LIB_HINT);
  const tiers = m.loadTiers(repoRoot);
  assert.equal(m.matchTier(".planning/notes.md", tiers), "meta");
  assert.equal(m.matchTier("product/methodology/AI-COWORK.md", tiers), "meta");
  assert.equal(m.matchTier("CLAUDE.md", tiers), "meta", "root CLAUDE.md is meta-excluded");
});

test("matchTier: unmatched path returns null (src/whatever.ts is not T3)", async () => {
  const m = await lib();
  assert.ok(m, LIB_HINT);
  const tiers = m.loadTiers(repoRoot);
  assert.equal(m.matchTier("src/whatever.ts", tiers), null);
});

test("matchTier: backslash-separated input (Windows) still matches", async () => {
  const m = await lib();
  assert.ok(m, LIB_HINT);
  const tiers = m.loadTiers(repoRoot);
  assert.equal(m.matchTier(".cowork\\tiers.json", tiers), "T3");
});

// ---------------------------------------------------------------------------
// isT4Command
// ---------------------------------------------------------------------------

test("isT4Command: git push --force matches a T4 pattern", async () => {
  const m = await lib();
  assert.ok(m, LIB_HINT);
  const tiers = m.loadTiers(repoRoot);
  assert.equal(m.isT4Command("git push --force origin main", tiers), true);
});

test("isT4Command: task verify is not T4", async () => {
  const m = await lib();
  assert.ok(m, LIB_HINT);
  const tiers = m.loadTiers(repoRoot);
  assert.equal(m.isT4Command("task verify", tiers), false);
});

// ---------------------------------------------------------------------------
// specNumberFromBranch — branch binding (feat/NNN-*)
// ---------------------------------------------------------------------------

test("specNumberFromBranch: feat/007-x binds to 007", async () => {
  const m = await lib();
  assert.ok(m, LIB_HINT);
  assert.equal(m.specNumberFromBranch("feat/007-x"), "007");
});

test("specNumberFromBranch: main and chore/cleanup are unbound (null)", async () => {
  const m = await lib();
  assert.ok(m, LIB_HINT);
  assert.equal(m.specNumberFromBranch("main"), null);
  assert.equal(m.specNumberFromBranch("chore/cleanup"), null);
});

// ---------------------------------------------------------------------------
// findBoundApprovedPlan — rich return contract {found, path, hasApprovedBy, hasTier}
// consumed unchanged by the CI gate (plan 01-09, D-22)
// ---------------------------------------------------------------------------

test("findBoundApprovedPlan: bound plan with both markers → found/hasApprovedBy/hasTier all true", async () => {
  const m = await lib();
  assert.ok(m, LIB_HINT);
  const root = makeSpecsSandbox([
    {
      dir: "001-x",
      content: "# Plan 001\n\ntier: T3\n\nApproved-by: tungns84 2026-06-11\n",
    },
  ]);
  const r = m.findBoundApprovedPlan(root, "001");
  assert.equal(r.found, true);
  assert.ok(r.path && r.path.includes("001-x"), "path must point at the bound plan.md");
  assert.equal(r.hasApprovedBy, true);
  assert.equal(r.hasTier, true);
});

test("findBoundApprovedPlan: bound plan exists but Approved-by missing → found=true, hasApprovedBy=false", async () => {
  const m = await lib();
  assert.ok(m, LIB_HINT);
  const root = makeSpecsSandbox([
    { dir: "002-y", content: "# Plan 002\n\ntier: T3\n\nApproved-by:\n" },
  ]);
  const r = m.findBoundApprovedPlan(root, "002");
  assert.equal(r.found, true, "plan.md exists, so found must be true");
  assert.equal(r.hasApprovedBy, false, "empty Approved-by: line must not count as approval");
  assert.equal(r.hasTier, true);
});

test("findBoundApprovedPlan: no bound plan → found=false, path=null", async () => {
  const m = await lib();
  assert.ok(m, LIB_HINT);
  const root = makeSpecsSandbox([]);
  const r = m.findBoundApprovedPlan(root, "099");
  assert.equal(r.found, false);
  assert.equal(r.path, null);
  assert.equal(r.hasApprovedBy, false);
});

test("findBoundApprovedPlan: scans ONLY the bound NNN — unrelated approved specs never count (anti-rot)", async () => {
  const m = await lib();
  assert.ok(m, LIB_HINT);
  const root = makeSpecsSandbox([
    {
      dir: "001-unrelated",
      content: "# Plan 001\n\ntier: T3\n\nApproved-by: someone 2026-06-11\n",
    },
  ]);
  const r = m.findBoundApprovedPlan(root, "099");
  assert.equal(r.found, false, "approved spec 001 must NOT satisfy a lookup bound to 099");
});
