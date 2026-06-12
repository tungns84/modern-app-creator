// lints.test.mjs — fixture-based positive/negative cases for the lint trio
// (settings-lint, meta-link-lint, skills-lint). node:test, zero npm deps.
//
// Each case spawns the real CLI (spawnSync, no shell) against either the
// real tree or a mutated temp fixture, asserting exit code + rule-named
// stderr (FR-E08: failures must name the violated rule).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  cpSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CHECKS = resolve(HERE, "..");
const REPO_ROOT = resolve(HERE, "..", "..", "..");
const SETTINGS_LINT = join(CHECKS, "settings-lint.mjs");
const META_LINT = join(CHECKS, "meta-link-lint.mjs");
const SKILLS_LINT = join(CHECKS, "skills-lint.mjs");

// Concatenated so this file works even if the test-tree allowlist narrows.
const META_NEEDLE = ".plan" + "ning/";

function run(script, args = []) {
  const res = spawnSync(process.execPath, [script, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  return { status: res.status, stdout: res.stdout ?? "", stderr: res.stderr ?? "" };
}

function tempDir(prefix) {
  return mkdtempSync(join(tmpdir(), prefix));
}

function loadReal() {
  return {
    settings: JSON.parse(
      readFileSync(join(REPO_ROOT, ".claude", "settings.json"), "utf8")
    ),
    tiers: JSON.parse(
      readFileSync(join(REPO_ROOT, ".cowork", "tiers.json"), "utf8")
    ),
  };
}

function writeFixturePair(dir, settings, tiers) {
  const settingsPath = join(dir, "settings.json");
  const tiersPath = join(dir, "tiers.json");
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  writeFileSync(tiersPath, JSON.stringify(tiers, null, 2));
  return { settingsPath, tiersPath };
}

// ---------- settings-lint ----------

test("settings-lint: real settings + real tiers → exit 0", () => {
  const r = run(SETTINGS_LINT);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /settings-lint OK/);
});

test("settings-lint: deny rule removed for a t4 pattern → exit 1 naming t4-lockstep", () => {
  const { settings, tiers } = loadReal();
  settings.permissions.deny = settings.permissions.deny.filter(
    (rule) => !rule.includes("flyway clean")
  );
  const dir = tempDir("lint-settings-");
  const { settingsPath, tiersPath } = writeFixturePair(dir, settings, tiers);
  const r = run(SETTINGS_LINT, ["--settings", settingsPath, "--tiers", tiersPath]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /settings-lint\/t4-lockstep VIOLATION/);
  assert.match(r.stderr, /flyway clean/);
});

test("settings-lint: missing T1 allow rule → exit 1 naming t1-allowlist", () => {
  const { settings, tiers } = loadReal();
  settings.permissions.allow = settings.permissions.allow.filter(
    (rule) => rule !== "Bash(task *)"
  );
  const dir = tempDir("lint-settings-");
  const { settingsPath, tiersPath } = writeFixturePair(dir, settings, tiers);
  const r = run(SETTINGS_LINT, ["--settings", settingsPath, "--tiers", tiersPath]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /settings-lint\/t1-allowlist VIOLATION/);
  assert.match(r.stderr, /Bash\(task \*\)/);
});

test("settings-lint: orphan Bash deny rule (no t4 backing) → exit 1 (reverse lockstep)", () => {
  const { settings, tiers } = loadReal();
  settings.permissions.deny.push("Bash(rm -rf /*)");
  const dir = tempDir("lint-settings-");
  const { settingsPath, tiersPath } = writeFixturePair(dir, settings, tiers);
  const r = run(SETTINGS_LINT, ["--settings", settingsPath, "--tiers", tiersPath]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /settings-lint\/t4-lockstep VIOLATION/);
  assert.match(r.stderr, /not backed by any tiers\.json t4/);
});

test("settings-lint: SessionStart hook unwired → exit 1 naming hook-wiring", () => {
  const { settings, tiers } = loadReal();
  delete settings.hooks.SessionStart;
  const dir = tempDir("lint-settings-");
  const { settingsPath, tiersPath } = writeFixturePair(dir, settings, tiers);
  const r = run(SETTINGS_LINT, ["--settings", settingsPath, "--tiers", tiersPath]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /settings-lint\/hook-wiring VIOLATION/);
  assert.match(r.stderr, /session-version-warn/);
});

// ---------- meta-link-lint ----------

test("meta-link-lint: real tracked tree → exit 0", () => {
  const r = run(META_LINT);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /meta-link-lint OK/);
});

test("meta-link-lint: clean fixture root → exit 0", () => {
  const root = tempDir("lint-meta-");
  mkdirSync(join(root, "docs"), { recursive: true });
  writeFileSync(join(root, "docs", "clean.md"), "# Clean doc\nNo meta links.\n");
  const r = run(META_LINT, ["--root", root]);
  assert.equal(r.status, 0, r.stderr);
});

test("meta-link-lint: shipped doc referencing the meta dir → exit 1 with file+line", () => {
  const root = tempDir("lint-meta-");
  mkdirSync(join(root, "docs"), { recursive: true });
  writeFileSync(
    join(root, "docs", "leaky.md"),
    `# Doc\n\nSee ${META_NEEDLE}spikes/evidence.md for details.\n`
  );
  const r = run(META_LINT, ["--root", root]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /meta-link-lint\/meta-reference VIOLATION/);
  assert.match(r.stderr, /docs\/leaky\.md:3/);
});

test("meta-link-lint: allowlisted test-tree fixture data → exit 0 (allowlist honored)", () => {
  const root = tempDir("lint-meta-");
  mkdirSync(join(root, "scripts", "tests"), { recursive: true });
  writeFileSync(
    join(root, "scripts", "tests", "fixture.test.mjs"),
    `// asserts the meta dir is excluded: "${META_NEEDLE}notes.md"\n`
  );
  const r = run(META_LINT, ["--root", root]);
  assert.equal(r.status, 0, r.stderr);
});

// ---------- skills-lint ----------

test("skills-lint: real tree → exit 0", () => {
  const r = run(SKILLS_LINT);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /skills-lint OK/);
});

test("skills-lint: skill dir renamed away → exit 1 naming dir-set", () => {
  const root = tempDir("lint-skills-");
  cpSync(join(REPO_ROOT, ".claude", "skills"), join(root, ".claude", "skills"), {
    recursive: true,
  });
  cpSync(
    join(root, ".claude", "skills", "new-module"),
    join(root, ".claude", "skills", "renamed-module"),
    { recursive: true }
  );
  rmSync(join(root, ".claude", "skills", "new-module"), { recursive: true });
  const r = run(SKILLS_LINT, ["--root", root]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /skills-lint\/dir-set VIOLATION: missing skill dir .*new-module/);
  assert.match(r.stderr, /skills-lint\/dir-set VIOLATION: unexpected skill dir .*renamed-module/);
});

test("skills-lint: skeleton stripped of its tier line → exit 1 naming skeleton-contract", () => {
  const root = tempDir("lint-skills-");
  cpSync(join(REPO_ROOT, ".claude", "skills"), join(root, ".claude", "skills"), {
    recursive: true,
  });
  const file = join(root, ".claude", "skills", "new-feature", "SKILL.md");
  const stripped = readFileSync(file, "utf8").replace(/^tier:.*$/m, "");
  writeFileSync(file, stripped);
  const r = run(SKILLS_LINT, ["--root", root]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /skills-lint\/skeleton-contract VIOLATION/);
  assert.match(r.stderr, /tier/);
});
