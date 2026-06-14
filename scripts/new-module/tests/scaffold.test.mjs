// scripts/new-module/tests/scaffold.test.mjs
// Run: node --test scripts/new-module/tests/scaffold.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { scaffold } from "../scaffold.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

function makeRoot() {
  const tmp = mkdtempSync(join(tmpdir(), "scaffold-test-"));
  // create required directories for scaffold to operate
  const dirs = [
    "backend/src/main/java/com/acme/app",
    "backend/src/main/resources/db/migration",
    "backend/src/test/java/com/acme/app",
    "specs",
  ];
  for (const d of dirs) mkdirSync(join(tmp, d), { recursive: true });
  return tmp;
}

function cleanup(root) {
  rmSync(root, { recursive: true, force: true });
}

// seed a minimal ModulithVerifyTest.java
function seedVerifyTest(root, modules = ["shared"]) {
  const path = join(
    root,
    "backend/src/test/java/com/acme/app/ModulithVerifyTest.java"
  );
  const setStr = modules.map((m) => `"${m}"`).join(", ");
  const content = `package com.acme.app;\nimport java.util.Set;\nclass ModulithVerifyTest {\n    static final Set<String> BASE_MODULES = Set.of(${setStr});\n}\n`;
  require_fs_write(path, content);
  return path;
}

function require_fs_write(path, content) {
  writeFileSync(path, content, "utf8");
}

// ── basic scaffold outputs ────────────────────────────────────────────────────

test("creates package-info.java with allowedDependencies", () => {
  const root = makeRoot();
  try {
    scaffold({ name: "mymod", allowedDeps: ["shared"] }, root);
    const path = join(
      root,
      "backend/src/main/java/com/acme/app/mymod/package-info.java"
    );
    assert.ok(existsSync(path), "package-info.java should exist");
    const content = readFileSync(path, "utf8");
    assert.ok(content.includes("@org.springframework.modulith.ApplicationModule"));
    assert.ok(content.includes('"shared"'));
    assert.ok(content.includes("package com.acme.app.mymod;"));
  } finally {
    cleanup(root);
  }
});

test("creates spi/package-info.java when exposesSpi=true", () => {
  const root = makeRoot();
  try {
    scaffold({ name: "mymod", exposesSpi: true }, root);
    const path = join(
      root,
      "backend/src/main/java/com/acme/app/mymod/spi/package-info.java"
    );
    assert.ok(existsSync(path), "spi/package-info.java should exist");
    const content = readFileSync(path, "utf8");
    assert.ok(content.includes('@org.springframework.modulith.NamedInterface("spi")'));
    assert.ok(content.includes("package com.acme.app.mymod.spi;"));
  } finally {
    cleanup(root);
  }
});

test("does NOT create spi/ when exposesSpi=false", () => {
  const root = makeRoot();
  try {
    scaffold({ name: "mymod" }, root);
    const path = join(
      root,
      "backend/src/main/java/com/acme/app/mymod/spi/package-info.java"
    );
    assert.ok(!existsSync(path), "spi/package-info.java should not exist");
  } finally {
    cleanup(root);
  }
});

test("creates events/.gitkeep when exposesEvents=true", () => {
  const root = makeRoot();
  try {
    scaffold({ name: "mymod", exposesEvents: true }, root);
    const path = join(
      root,
      "backend/src/main/java/com/acme/app/mymod/events/.gitkeep"
    );
    assert.ok(existsSync(path), "events/.gitkeep should exist");
  } finally {
    cleanup(root);
  }
});

test("creates db/migration/<name>/ when hasTables=true", () => {
  const root = makeRoot();
  try {
    scaffold({ name: "mymod", hasTables: true }, root);
    const dir = join(
      root,
      "backend/src/main/resources/db/migration/mymod"
    );
    assert.ok(existsSync(dir), "db/migration/mymod/ should exist");
  } finally {
    cleanup(root);
  }
});

test("creates @ApplicationModuleTest stub", () => {
  const root = makeRoot();
  try {
    scaffold({ name: "mymod" }, root);
    const path = join(
      root,
      "backend/src/test/java/com/acme/app/mymod/MymodModuleTest.java"
    );
    assert.ok(existsSync(path), "MymodModuleTest.java should exist");
    const content = readFileSync(path, "utf8");
    assert.ok(content.includes("@ApplicationModuleTest"));
    assert.ok(content.includes("class MymodModuleTest"));
  } finally {
    cleanup(root);
  }
});

test("creates specs/NNN-<name>/spec.md and plan.md", () => {
  const root = makeRoot();
  try {
    scaffold({ name: "mymod" }, root);
    // spec number is 001 since specs/ is empty
    const specMd = join(root, "specs/001-mymod/spec.md");
    const planMd = join(root, "specs/001-mymod/plan.md");
    assert.ok(existsSync(specMd), "spec.md should exist");
    assert.ok(existsSync(planMd), "plan.md should exist");
  } finally {
    cleanup(root);
  }
});

test("spec number increments past existing specs", () => {
  const root = makeRoot();
  try {
    // seed existing spec dirs
    mkdirSync(join(root, "specs/007-other"), { recursive: true });
    mkdirSync(join(root, "specs/009-another"), { recursive: true });
    scaffold({ name: "mymod" }, root);
    const specMd = join(root, "specs/010-mymod/spec.md");
    assert.ok(existsSync(specMd), "spec.md should be 010");
  } finally {
    cleanup(root);
  }
});

// ── ModulithVerifyTest bumping ────────────────────────────────────────────────

test("bumps BASE_MODULES in ModulithVerifyTest", () => {
  const root = makeRoot();
  try {
    const path = seedVerifyTest(root, ["shared"]);
    scaffold({ name: "newmod" }, root);
    const content = readFileSync(path, "utf8");
    assert.ok(content.includes('"newmod"'), "BASE_MODULES should contain newmod");
    assert.ok(content.includes('"shared"'), "should still have shared");
  } finally {
    cleanup(root);
  }
});

test("is idempotent — skips existing files on second run", () => {
  const root = makeRoot();
  try {
    const result1 = scaffold({ name: "mymod" }, root);
    const result2 = scaffold({ name: "mymod" }, root);
    assert.ok(result1.created.length > 0, "first run should create files");
    assert.ok(result2.skipped.length > 0, "second run should skip files");
    assert.equal(result2.created.length, 0, "second run should create nothing");
  } finally {
    cleanup(root);
  }
});

test("does not add module twice to BASE_MODULES", () => {
  const root = makeRoot();
  try {
    const path = seedVerifyTest(root, ["shared"]);
    scaffold({ name: "newmod" }, root);
    scaffold({ name: "newmod" }, root);
    const content = readFileSync(path, "utf8");
    const count = (content.match(/"newmod"/g) || []).length;
    assert.equal(count, 1, "newmod should appear exactly once");
  } finally {
    cleanup(root);
  }
});

// ── input validation ──────────────────────────────────────────────────────────

test("throws on invalid module name", () => {
  const root = makeRoot();
  try {
    assert.throws(() => scaffold({ name: "MyModule" }, root), /invalid module name/);
    assert.throws(() => scaffold({ name: "" }, root), /invalid module name/);
    assert.throws(() => scaffold({ name: "my module" }, root), /invalid module name/);
  } finally {
    cleanup(root);
  }
});

// ── dry-run ───────────────────────────────────────────────────────────────────

test("dry-run: reports actions without writing files", () => {
  const root = makeRoot();
  try {
    const result = scaffold({ name: "mymod", dryRun: true }, root);
    const pkgInfo = join(
      root,
      "backend/src/main/java/com/acme/app/mymod/package-info.java"
    );
    assert.ok(!existsSync(pkgInfo), "dry-run should not write files");
    assert.ok(result.created.length > 0, "dry-run should report actions");
  } finally {
    cleanup(root);
  }
});

// ── PascalCase helper ─────────────────────────────────────────────────────────

test("kebab-case module name generates correct PascalCase test class", () => {
  const root = makeRoot();
  try {
    scaffold({ name: "my-feature" }, root);
    const path = join(
      root,
      "backend/src/test/java/com/acme/app/my-feature/MyFeatureModuleTest.java"
    );
    assert.ok(existsSync(path), "MyFeatureModuleTest.java should exist");
    const content = readFileSync(path, "utf8");
    assert.ok(content.includes("class MyFeatureModuleTest"));
  } finally {
    cleanup(root);
  }
});
