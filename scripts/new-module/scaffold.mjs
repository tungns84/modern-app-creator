#!/usr/bin/env node
// scripts/new-module/scaffold.mjs — new-module skill generator
// Implements the CONTRACT in .claude/skills/new-module/SKILL.md
// Zero npm deps. Cross-OS (path.join everywhere, no shell calls).
//
// CLI: node scripts/new-module/scaffold.mjs <name> [options]
//   --allowed-deps <dep1>,<dep2>,...
//   --exposes-spi          create spi/package-info.java with @NamedInterface("spi")
//   --exposes-events       create events/.gitkeep placeholder
//   --has-tables           create db/migration/<name>/ and append to ModuleFlywayLocationsCustomizer
//   --root <path>          override project root (default: two dirs up from this script)
//   --dry-run              print actions without writing
//
// Module: import { scaffold } from './scaffold.mjs' and call scaffold(options, root)

import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  readdirSync,
} from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(__dirname, "..", "..");

// ── helpers ──────────────────────────────────────────────────────────────────

function toPascalCase(str) {
  return str
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
}

function resolveSpecNumber(specsDir, moduleName) {
  if (!existsSync(specsDir)) return { num: "010", existing: false };
  const dirs = readdirSync(specsDir, { withFileTypes: true });
  const existing = dirs.find(
    (e) => e.isDirectory() && new RegExp(`^\\d{3}-${moduleName}$`).test(e.name)
  );
  if (existing) {
    return { num: existing.name.slice(0, 3), existing: true };
  }
  const nums = dirs
    .filter((e) => e.isDirectory() && /^\d{3}-/.test(e.name))
    .map((e) => parseInt(e.name.slice(0, 3), 10));
  return {
    num: String((nums.length > 0 ? Math.max(...nums) : 0) + 1).padStart(3, "0"),
    existing: false,
  };
}

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

function writeIfAbsent(filePath, content, log) {
  if (existsSync(filePath)) {
    log("skip", filePath);
    return false;
  }
  ensureDir(dirname(filePath));
  writeFileSync(filePath, content, "utf8");
  log("create", filePath);
  return true;
}

// ── main scaffold function ────────────────────────────────────────────────────

/**
 * @param {object} options
 * @param {string} options.name         module name (kebab-case or lower)
 * @param {string[]} [options.allowedDeps=[]]
 * @param {boolean} [options.exposesSpi=false]
 * @param {boolean} [options.exposesEvents=false]
 * @param {boolean} [options.hasTables=false]
 * @param {boolean} [options.dryRun=false]
 * @param {string} [root]               project root (default: two dirs above this file)
 * @returns {{ created: string[], updated: string[], skipped: string[] }}
 */
export function scaffold(options, root = DEFAULT_ROOT) {
  const {
    name,
    allowedDeps = [],
    exposesSpi = false,
    exposesEvents = false,
    hasTables = false,
    dryRun = false,
  } = options;

  if (!name || !/^[a-z][a-z0-9-]*$/.test(name)) {
    throw new Error(
      `scaffold: invalid module name "${name}" — must match [a-z][a-z0-9-]*`
    );
  }

  const created = [];
  const updated = [];
  const skipped = [];

  function log(action, path) {
    if (action === "create") created.push(path);
    else if (action === "update") updated.push(path);
    else if (action === "skip") skipped.push(path);
    if (!dryRun || action === "skip") {
      // always log even in dry-run (except skip noise)
    }
    process.stdout.write(`[${action}] ${path}\n`);
  }

  const javaBase = join(
    root,
    "backend",
    "src",
    "main",
    "java",
    "com",
    "acme",
    "app"
  );
  const javaTest = join(
    root,
    "backend",
    "src",
    "test",
    "java",
    "com",
    "acme",
    "app"
  );
  const moduleDir = join(javaBase, name);
  const moduleTestDir = join(javaTest, name);
  const modulePackage = `com.acme.app.${name}`;
  const pascal = toPascalCase(name);

  // ── 1. package-info.java (T3) ──────────────────────────────────────────────
  const allowedStr = allowedDeps.map((d) => `"${d}"`).join(", ");
  if (!dryRun) {
    writeIfAbsent(
      join(moduleDir, "package-info.java"),
      `@org.springframework.modulith.ApplicationModule(\n    allowedDependencies = { ${allowedStr} }\n)\npackage ${modulePackage};\n`,
      log
    );
  } else {
    log("create", join(moduleDir, "package-info.java"));
  }

  // ── 2. spi/package-info.java ───────────────────────────────────────────────
  if (exposesSpi) {
    if (!dryRun) {
      writeIfAbsent(
        join(moduleDir, "spi", "package-info.java"),
        `@org.springframework.modulith.NamedInterface("spi")\npackage ${modulePackage}.spi;\n`,
        log
      );
    } else {
      log("create", join(moduleDir, "spi", "package-info.java"));
    }
  }

  // ── 3. events/.gitkeep ────────────────────────────────────────────────────
  if (exposesEvents) {
    const eventsDir = join(moduleDir, "events");
    if (!dryRun) {
      ensureDir(eventsDir);
      writeIfAbsent(join(eventsDir, ".gitkeep"), "", log);
    } else {
      log("create", join(eventsDir, ".gitkeep"));
    }
  }

  // ── 4. db/migration/<name>/ ───────────────────────────────────────────────
  if (hasTables) {
    const migrationsDir = join(
      root,
      "backend",
      "src",
      "main",
      "resources",
      "db",
      "migration",
      name
    );
    if (!dryRun) {
      ensureDir(migrationsDir);
      log("create", migrationsDir + "/");
    } else {
      log("create", migrationsDir + "/");
    }
  }

  // ── 5. @ApplicationModuleTest stub ────────────────────────────────────────
  if (!dryRun) {
    writeIfAbsent(
      join(moduleTestDir, `${pascal}ModuleTest.java`),
      `package ${modulePackage};\n\nimport org.junit.jupiter.api.Test;\nimport org.springframework.modulith.test.ApplicationModuleTest;\nimport org.springframework.test.context.TestPropertySource;\n\n@ApplicationModuleTest\n@TestPropertySource(properties = {\n    "spring.autoconfigure.exclude=" +\n        "org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration," +\n        "org.springframework.boot.flyway.autoconfigure.FlywayAutoConfiguration," +\n        "org.springframework.boot.jdbc.autoconfigure.DataSourceTransactionManagerAutoConfiguration," +\n        "org.springframework.modulith.events.jdbc.JdbcEventPublicationAutoConfiguration," +\n        "org.springframework.modulith.events.config.EventPublicationAutoConfiguration," +\n        "org.springframework.modulith.events.config.EventExternalizationAutoConfiguration"\n})\nclass ${pascal}ModuleTest {\n\n    @Test\n    void moduleStructureIsValid() {\n        // Spring Modulith verifies module boundaries on context startup\n    }\n}\n`,
      log
    );
  } else {
    log("create", join(moduleTestDir, `${pascal}ModuleTest.java`));
  }

  // ── 6. specs/NNN-<name>/spec.md + plan.md ─────────────────────────────────
  const { num: specNum } = resolveSpecNumber(join(root, "specs"), name);
  const specDir = join(root, "specs", `${specNum}-${name}`);

  if (!dryRun) {
    writeIfAbsent(
      join(specDir, "spec.md"),
      `# Spec ${specNum}: ${pascal} Module\n\n## Status\n\nDraft\n\n## Objective\n\nAdd the \`${name}\` module to \`com.acme.app\`.\n\n## Module Boundary\n\n\`\`\`java\n@ApplicationModule(allowedDependencies = { ${allowedStr} })\npackage ${modulePackage};\n\`\`\`\n`,
      log
    );
    writeIfAbsent(
      join(specDir, "plan.md"),
      `# Plan ${specNum}: ${pascal} Module\n\ntier: T3\n\nApproved-by:\n\n## Files to Touch\n\n- \`backend/src/main/java/com/acme/app/${name}/package-info.java\` — new (T3)\n${
        exposesSpi
          ? `- \`backend/src/main/java/com/acme/app/${name}/spi/package-info.java\` — new (T3)\n`
          : ""
      }${
        hasTables
          ? `- \`backend/src/main/resources/db/migration/${name}/\` — new migrations folder\n`
          : ""
      }`,
      log
    );
  } else {
    log("create", join(specDir, "spec.md"));
    log("create", join(specDir, "plan.md"));
  }

  // ── 7. Bump ModulithVerifyTest.BASE_MODULES ───────────────────────────────
  const verifyTestPath = join(
    javaTest,
    "ModulithVerifyTest.java"
  );
  if (!dryRun && existsSync(verifyTestPath)) {
    let content = readFileSync(verifyTestPath, "utf8");
    if (!content.includes(`"${name}"`)) {
      // match Set.of("a", "b") — insert before closing paren
      const updated_content = content.replace(
        /(Set\.of\([^)]+)\)/,
        (_, prefix) => `${prefix}, "${name}")`
      );
      if (updated_content !== content) {
        writeFileSync(verifyTestPath, updated_content, "utf8");
        log("update", verifyTestPath);
      }
    } else {
      log("skip", verifyTestPath);
    }
  } else if (dryRun) {
    log("update", verifyTestPath);
  }

  // ── 8. Append to ModuleFlywayLocationsCustomizer (hasTables only) ─────────
  if (hasTables) {
    const customizerPath = join(
      javaBase,
      "appconfig",
      "ModuleFlywayLocationsCustomizer.java"
    );
    if (!dryRun && existsSync(customizerPath)) {
      let content = readFileSync(customizerPath, "utf8");
      const newLocation = `"classpath:db/migration/${name}"`;
      if (!content.includes(newLocation)) {
        // Find last "classpath:db/migration/..." entry and insert after it
        const idx = content.lastIndexOf('"classpath:db/migration/');
        if (idx !== -1) {
          const endOfEntry = content.indexOf("\n", idx);
          const lineEnd = endOfEntry !== -1 ? endOfEntry : content.length;
          const before = content.slice(0, lineEnd);
          const after = content.slice(lineEnd);
          // detect indentation from the existing entry
          const lineStart = content.lastIndexOf("\n", idx - 1) + 1;
          const indent = content.slice(lineStart, idx);
          const newContent =
            before + ",\n" + indent + newLocation + after;
          writeFileSync(customizerPath, newContent, "utf8");
          log("update", customizerPath);
        } else {
          process.stderr.write(
            `[warn] ModuleFlywayLocationsCustomizer: could not find insertion point\n`
          );
        }
      } else {
        log("skip", customizerPath);
      }
    } else if (dryRun) {
      log("update", customizerPath);
    } else {
      process.stderr.write(
        `[warn] ModuleFlywayLocationsCustomizer not found at ${customizerPath} — create appconfig module first\n`
      );
    }
  }

  return { created, updated, skipped };
}

// ── CLI entry point ───────────────────────────────────────────────────────────

function main() {
  const argv = process.argv.slice(2);
  let name = null;
  let allowedDeps = [];
  let exposesSpi = false;
  let exposesEvents = false;
  let hasTables = false;
  let root = DEFAULT_ROOT;
  let dryRun = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      name = arg;
    } else if (arg === "--allowed-deps") {
      allowedDeps = argv[++i]
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);
    } else if (arg === "--exposes-spi") {
      exposesSpi = true;
    } else if (arg === "--exposes-events") {
      exposesEvents = true;
    } else if (arg === "--has-tables") {
      hasTables = true;
    } else if (arg === "--root") {
      root = resolve(argv[++i]);
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else {
      process.stderr.write(`scaffold: unknown option "${arg}"\n`);
      process.exit(1);
    }
  }

  if (!name) {
    process.stderr.write(
      "Usage: scaffold.mjs <module-name> [--allowed-deps d1,d2] [--exposes-spi] [--exposes-events] [--has-tables] [--root path] [--dry-run]\n"
    );
    process.exit(1);
  }

  scaffold({ name, allowedDeps, exposesSpi, exposesEvents, hasTables, dryRun }, root);
}

const isEntry =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;
if (isEntry) main();
