// init-core.mjs — shared zero-dependency rename engine (FOUND-12, spec 004-init-script).
// Single implementation behind the thin scripts/init.sh and scripts/init.ps1 entry
// points (D-23 — entry points, not dual implementations; Pitfall 8 planner option).
//
// Renames the `com.acme.app` literal family (word-boundary aware) across the tree,
// renames package directories, and auto-commits one conventional commit.
// Zero npm dependencies: node:fs / node:path / node:child_process / node:readline only.
// NO sed in-place editing anywhere (macOS/Linux flag divergence, Pitfall 8).

import {
  readdirSync,
  readFileSync,
  writeFileSync,
  renameSync,
  rmdirSync,
  mkdirSync,
} from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import readline from 'node:readline/promises';
import { pathToFileURL } from 'node:url';

const MANIFEST_PATH = new URL('./init-replacements.json', import.meta.url);

// Directories never walked, at any depth (Pitfall 8: meta docs mention com.acme.app!)
const EXCLUDED_DIRS = new Set([
  '.git',
  '.planning',
  'product',
  'requirements',
  '.code-review-graph',
  'node_modules',
]);

// PRESET-SPEC binaryGlobs: **/*.png, **/*.svg, **/*.jar, **/mvnw*
const BINARY_EXTENSIONS = new Set(['.png', '.svg', '.jar']);

// The init machinery itself must survive init: the manifest keys ARE the literals
// (rewriting them breaks idempotency on the next run), and the engine/tests carry
// the literals as data. Relative POSIX paths from the tree root.
const SELF_EXCLUSIONS = new Set([
  'scripts/init-core.mjs',
  'scripts/init.sh',
  'scripts/init.ps1',
  'scripts/init-replacements.json',
  'scripts/tests/init-core.test.mjs',
]);

const GROUP_ID_RE = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9_]*)*$/;
const ARTIFACT_ID_RE = /^[a-z][a-z0-9-]*$/;

// ---------------------------------------------------------------------- public

/** Validate init inputs BEFORE any file is touched (T-01-17, ASVS V5). */
export function validateInputs({ groupId, artifactId, projectName }) {
  const errors = [];
  if (!groupId || !GROUP_ID_RE.test(groupId)) {
    errors.push(
      `groupId "${groupId ?? ''}" is invalid: must match Java package grammar ` +
        '(lowercase segments separated by dots, e.g. com.example)',
    );
  }
  if (!artifactId || !ARTIFACT_ID_RE.test(artifactId)) {
    errors.push(
      `artifactId "${artifactId ?? ''}" is invalid: must match ^[a-z][a-z0-9-]*$ ` +
        '(lowercase, digits, hyphens, e.g. demo-app)',
    );
  }
  if (!projectName || projectName.trim() === '') {
    errors.push('projectName is invalid: must be a non-empty string');
  }
  return { ok: errors.length === 0, errors };
}

/**
 * Scan rootDir and compute the rename plan. Pure read-only.
 * @returns {{rootDir: string, fileEdits: {path: string, newContent: string}[],
 *            dirRenames: {from: string, to: string}[], occurrenceCount: number}}
 */
export function planRenames(rootDir, replacements) {
  const matchers = buildMatchers(replacements);
  const pathLiterals = Object.entries(replacements).filter(([lit]) => lit.includes('/'));
  const fileEdits = [];
  const dirRenames = [];
  let occurrenceCount = 0;

  walk(rootDir, rootDir, (absPath, relPosix, isDir) => {
    if (isDir) {
      for (const [lit, value] of pathLiterals) {
        if (relPosix === lit || relPosix.endsWith(`/${lit}`)) {
          dirRenames.push({
            from: relPosix,
            to: relPosix.slice(0, relPosix.length - lit.length) + value,
          });
        }
      }
      return;
    }
    const buf = readFileSync(absPath);
    if (buf.includes(0)) return; // binary-content guard beyond the globs (T-01-18)
    const content = buf.toString('utf8');
    let next = content;
    let count = 0;
    for (const { re, value } of matchers) {
      next = next.replace(re, () => {
        count += 1;
        return value;
      });
    }
    if (count > 0) {
      occurrenceCount += count;
      fileEdits.push({ path: relPosix, newContent: next });
    }
  });

  // Apply deepest dirs first so nested renames (if any) never invalidate paths.
  dirRenames.sort((a, b) => depth(b.from) - depth(a.from));
  return { rootDir, fileEdits, dirRenames, occurrenceCount };
}

/** Apply a plan computed by planRenames: content edits first, then dir renames. */
export function applyRenames(plan) {
  const { rootDir, fileEdits, dirRenames } = plan;
  for (const edit of fileEdits) {
    writeFileSync(path.join(rootDir, ...edit.path.split('/')), edit.newContent);
  }
  for (const { from, to } of dirRenames) {
    const absFrom = path.join(rootDir, ...from.split('/'));
    const absTo = path.join(rootDir, ...to.split('/'));
    mkdirSync(path.dirname(absTo), { recursive: true });
    renameSync(absFrom, absTo);
    pruneEmptyAncestors(rootDir, path.dirname(absFrom));
  }
}

/** CLI entry point: flags --group-id / --artifact-id / --project-name, prompt fallback. */
export async function main(argv = process.argv.slice(2)) {
  const inputs = await resolveInputs(parseArgs(argv));

  const validation = validateInputs(inputs);
  if (!validation.ok) {
    for (const err of validation.errors) console.error(`error: ${err}`);
    return 1;
  }

  // Refuse a dirty worktree BEFORE any file is modified (auto-commit needs a clean baseline).
  let porcelain;
  try {
    porcelain = git(['status', '--porcelain']);
  } catch {
    console.error('error: not inside a git repository — init requires a git worktree');
    return 1;
  }
  if (porcelain.trim() !== '') {
    console.error('error: worktree is dirty — commit or stash changes before running init');
    return 1;
  }

  const { artifactId } = inputs;
  const replacements = resolveReplacements(inputs);
  const plan = planRenames(process.cwd(), replacements);

  if (plan.occurrenceCount === 0 && plan.dirRenames.length === 0) {
    console.log(`already initialized as ${artifactId}`);
    checkTaskVersion();
    return 0;
  }

  applyRenames(plan);
  // Values are never shell-interpolated — git invoked with argv arrays (T-01-17).
  git(['add', '-A']);
  git(['commit', '-m', `chore: initialize project as ${artifactId}`]);
  console.log(
    `initialized project as ${artifactId}: ` +
      `${plan.fileEdits.length} file(s) rewritten, ${plan.dirRenames.length} dir(s) renamed, 1 commit created`,
  );
  checkTaskVersion();
  return 0;
}

// --------------------------------------------------------------------- helpers

function buildMatchers(replacements) {
  // Word-boundary safety (Pitfall 8): the character before/after the literal must
  // not be an alphanumeric continuation — com.acme.application is never rewritten.
  return Object.entries(replacements).map(([lit, value]) => ({
    re: new RegExp(`(?<![A-Za-z0-9])${escapeRegExp(lit)}(?![A-Za-z0-9])`, 'g'),
    value,
  }));
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

function depth(p) {
  return p.split('/').length;
}

function isBinaryGlob(name) {
  return BINARY_EXTENSIONS.has(path.extname(name).toLowerCase()) || name.startsWith('mvnw');
}

function walk(rootDir, dir, visit) {
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name < b.name ? -1 : 1,
  );
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    const relPosix = path.relative(rootDir, abs).split(path.sep).join('/');
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      visit(abs, relPosix, true);
      walk(rootDir, abs, visit);
    } else if (entry.isFile()) {
      if (isBinaryGlob(entry.name) || SELF_EXCLUSIONS.has(relPosix)) continue;
      visit(abs, relPosix, false);
    }
  }
}

function pruneEmptyAncestors(rootDir, dir) {
  let current = dir;
  const stop = path.resolve(rootDir);
  while (path.resolve(current) !== stop && readdirSync(current).length === 0) {
    rmdirSync(current);
    current = path.dirname(current);
  }
}

function resolveReplacements({ groupId, artifactId }) {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  // The Java package leaf is NOT the Maven artifactId: artifactId may contain
  // hyphens (ARTIFACT_ID_RE allows them, e.g. "my-app"), which are illegal in
  // Java identifiers. Strip hyphens for the package leaf; keep artifactId
  // verbatim for the pom.xml `acme-app` literal (CR-01).
  const packageLeaf = artifactId.replace(/-/g, '');
  const packageRoot = `${groupId}.${packageLeaf}`;
  const values = {
    packageRoot,
    packagePath: packageRoot.replaceAll('.', '/'),
    artifactId,
  };
  const replacements = {};
  for (const [literal, placeholder] of Object.entries(manifest)) {
    if (!(placeholder in values)) {
      throw new Error(`init-replacements.json: unknown placeholder "${placeholder}"`);
    }
    replacements[literal] = values[placeholder];
  }
  return replacements;
}

function parseArgs(argv) {
  const flags = { 'group-id': undefined, 'artifact-id': undefined, 'project-name': undefined };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const name = arg.slice(2);
      if (name in flags) {
        flags[name] = argv[i + 1];
        i += 1;
      }
    }
  }
  return {
    groupId: flags['group-id'],
    artifactId: flags['artifact-id'],
    projectName: flags['project-name'],
  };
}

async function resolveInputs(inputs) {
  const missing = Object.entries({
    groupId: 'group id (e.g. com.example)',
    artifactId: 'artifact id (e.g. demo)',
    projectName: 'project name (e.g. Demo)',
  }).filter(([key]) => inputs[key] === undefined || inputs[key] === '');
  if (missing.length === 0) return inputs;

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    for (const [key, label] of missing) {
      inputs[key] = (await rl.question(`Enter ${label}: `)).trim();
    }
  } finally {
    rl.close();
  }
  return inputs;
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' });
}

function checkTaskVersion() {
  // go-task pinned-version check (root CLAUDE.md constraint: v3.51.1). Warn only.
  // `task --version` output varies by install channel ("Task version: v3.51.1" vs
  // plain "3.51.1") — compare the extracted semver, not the raw string.
  const PINNED = '3.51.1';
  try {
    const out = execFileSync('task', ['--version'], { encoding: 'utf8' }).trim();
    const version = out.match(/\d+\.\d+\.\d+/)?.[0];
    if (version !== PINNED) {
      console.warn(`warning: go-task version mismatch — expected v${PINNED}, got "${out}"`);
    }
  } catch {
    console.warn(`warning: go-task (task) not found — install v${PINNED} via winget/brew/apt`);
  }
}

// ------------------------------------------------------------------ direct run

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().then(
    (code) => {
      process.exitCode = code;
    },
    (err) => {
      console.error(`error: ${err?.message ?? err}`);
      process.exitCode = 1;
    },
  );
}
