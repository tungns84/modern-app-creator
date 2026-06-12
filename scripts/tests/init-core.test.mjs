// Executable specification for scripts/init-core.mjs (FOUND-12, spec 004-init-script).
// Each test builds a synthetic mini git repo in a temp dir — never touches this repo.
// Run: node --test scripts/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
} from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateInputs, planRenames, applyRenames } from '../init-core.mjs';

const INIT_CORE = fileURLToPath(new URL('../init-core.mjs', import.meta.url));

// What main() computes from --group-id com.example --artifact-id demo
const REPLACEMENTS = {
  'com.acme.app': 'com.example.demo',
  'com/acme/app': 'com/example/demo',
  'acme-app': 'demo',
};

const FLAGS = [
  '--group-id', 'com.example',
  '--artifact-id', 'demo',
  '--project-name', 'Demo',
];

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' });
}

function commitCount(root) {
  return Number(git(root, 'rev-list', '--count', 'HEAD').trim());
}

function lastSubject(root) {
  return git(root, 'log', '-1', '--format=%s').trim();
}

/** Build a mini repo: literal family present, trap file, meta dirs, binary file. */
function makeFixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'init-fixture-'));
  t.after(() => {
    try { rmSync(root, { recursive: true, force: true }); } catch { /* win32 lock */ }
  });
  git(root, 'init', '-q');
  git(root, 'config', 'user.email', 'test@example.com');
  git(root, 'config', 'user.name', 'Test');
  git(root, 'config', 'core.autocrlf', 'false');

  mkdirSync(path.join(root, 'src', 'com', 'acme', 'app'), { recursive: true });
  writeFileSync(
    path.join(root, 'src', 'com', 'acme', 'app', 'App.java'),
    'package com.acme.app;\n\npublic class App {\n}\n',
  );
  writeFileSync(
    path.join(root, 'pom.xml'),
    '<project>\n  <groupId>com.acme.app</groupId>\n  <artifactId>acme-app</artifactId>\n</project>\n',
  );
  // Word-boundary trap: substring of the literal followed by alnum continuation
  writeFileSync(
    path.join(root, 'trap.txt'),
    'this file mentions com.acme.application and only that\n',
  );
  // Meta dirs mention the literal in prose — must never be touched (Pitfall 8)
  for (const dir of ['.planning', 'product', 'requirements']) {
    mkdirSync(path.join(root, dir), { recursive: true });
    writeFileSync(
      path.join(root, dir, 'notes.md'),
      'meta doc explains that com.acme.app gets renamed by init\n',
    );
  }
  // Binary file containing the literal bytes (binaryGlobs: **/*.png)
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]),
    Buffer.from('com.acme.app'),
    Buffer.from([0x00, 0xff, 0x00]),
  ]);
  writeFileSync(path.join(root, 'logo.png'), png);

  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'seed');
  return root;
}

function runMain(root, args = FLAGS) {
  return spawnSync(process.execPath, [INIT_CORE, ...args], {
    cwd: root,
    encoding: 'utf8',
  });
}

// ---------------------------------------------------------------- validation

test('validateInputs rejects a groupId violating Java package grammar, naming the field', () => {
  const res = validateInputs({ groupId: 'Com.1Bad', artifactId: 'demo', projectName: 'Demo' });
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => e.includes('groupId')), `errors must name groupId: ${res.errors}`);
});

test('validateInputs rejects an artifactId violating the artifact grammar, naming the field', () => {
  const res = validateInputs({ groupId: 'com.example', artifactId: 'Demo_App', projectName: 'Demo' });
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => e.includes('artifactId')), `errors must name artifactId: ${res.errors}`);
});

test('validateInputs accepts valid groupId/artifactId/projectName', () => {
  const res = validateInputs({ groupId: 'com.example', artifactId: 'demo', projectName: 'Demo' });
  assert.equal(res.ok, true);
  assert.deepEqual(res.errors, []);
});

test('main rejects an invalid --group-id with exit 1 before touching any file', (t) => {
  const root = makeFixture(t);
  const before = readFileSync(path.join(root, 'src', 'com', 'acme', 'app', 'App.java'), 'utf8');
  const res = runMain(root, ['--group-id', 'Bad..Id', '--artifact-id', 'demo', '--project-name', 'Demo']);
  assert.equal(res.status, 1);
  assert.ok((res.stdout + res.stderr).includes('groupId'), 'message must name groupId');
  assert.equal(readFileSync(path.join(root, 'src', 'com', 'acme', 'app', 'App.java'), 'utf8'), before);
  assert.equal(commitCount(root), 1, 'no commit may be created');
});

// ---------------------------------------------------------- dirty worktree

test('main refuses a dirty worktree with exit 1 and a message containing "dirty", before any modification', (t) => {
  const root = makeFixture(t);
  writeFileSync(path.join(root, 'uncommitted.txt'), 'not committed\n');
  const before = readFileSync(path.join(root, 'src', 'com', 'acme', 'app', 'App.java'), 'utf8');
  const res = runMain(root);
  assert.equal(res.status, 1);
  assert.ok((res.stdout + res.stderr).toLowerCase().includes('dirty'), 'message must contain "dirty"');
  assert.equal(readFileSync(path.join(root, 'src', 'com', 'acme', 'app', 'App.java'), 'utf8'), before);
  assert.equal(commitCount(root), 1);
});

// ---------------------------------------------------------------- planning

test('planRenames covers file edits and maps the package dir rename', (t) => {
  const root = makeFixture(t);
  const plan = planRenames(root, REPLACEMENTS);
  const paths = plan.fileEdits.map((e) => e.path);
  assert.ok(paths.includes('src/com/acme/app/App.java'), `fileEdits must cover App.java, got: ${paths}`);
  assert.ok(paths.includes('pom.xml'), `fileEdits must cover pom.xml, got: ${paths}`);
  assert.ok(
    plan.dirRenames.some((r) => r.from === 'src/com/acme/app' && r.to === 'src/com/example/demo'),
    `dirRenames must map src/com/acme/app -> src/com/example/demo, got: ${JSON.stringify(plan.dirRenames)}`,
  );
  assert.ok(plan.occurrenceCount > 0);
});

test('word-boundary guard: com.acme.application is never planned for rewrite', (t) => {
  const root = makeFixture(t);
  const plan = planRenames(root, REPLACEMENTS);
  const paths = plan.fileEdits.map((e) => e.path);
  assert.ok(!paths.includes('trap.txt'), 'trap.txt contains only com.acme.application — must not be edited');
});

test('exclusions: meta dirs, .git and binary globs appear in no fileEdits', (t) => {
  const root = makeFixture(t);
  const plan = planRenames(root, REPLACEMENTS);
  const paths = plan.fileEdits.map((e) => e.path);
  for (const p of paths) {
    assert.ok(!p.startsWith('.planning/'), `.planning/ excluded, got ${p}`);
    assert.ok(!p.startsWith('product/'), `product/ excluded, got ${p}`);
    assert.ok(!p.startsWith('requirements/'), `requirements/ excluded, got ${p}`);
    assert.ok(!p.startsWith('.git/'), `.git/ excluded, got ${p}`);
    assert.notEqual(p, 'logo.png', 'binary glob **/*.png excluded');
  }
});

// ----------------------------------------------------------------- applying

test('applyRenames rewrites contents, renames the package dir, and a re-plan finds zero occurrences', (t) => {
  const root = makeFixture(t);
  const plan = planRenames(root, REPLACEMENTS);
  applyRenames(plan);
  assert.ok(existsSync(path.join(root, 'src', 'com', 'example', 'demo', 'App.java')), 'renamed dir must exist');
  assert.ok(!existsSync(path.join(root, 'src', 'com', 'acme')), 'old (now empty) package dirs must be gone');
  const app = readFileSync(path.join(root, 'src', 'com', 'example', 'demo', 'App.java'), 'utf8');
  assert.ok(app.includes('package com.example.demo;'), `App.java rewritten, got: ${app}`);
  const replan = planRenames(root, REPLACEMENTS);
  assert.equal(replan.occurrenceCount, 0, 'second plan must find zero occurrences');
});

test('main end-to-end: renames the tree and exits 0, leaving meta dirs and binaries untouched', (t) => {
  const root = makeFixture(t);
  const metaBefore = readFileSync(path.join(root, '.planning', 'notes.md'), 'utf8');
  const pngBefore = readFileSync(path.join(root, 'logo.png'));
  const trapBefore = readFileSync(path.join(root, 'trap.txt'), 'utf8');
  const res = runMain(root);
  assert.equal(res.status, 0, `stdout: ${res.stdout}\nstderr: ${res.stderr}`);
  const pom = readFileSync(path.join(root, 'pom.xml'), 'utf8');
  assert.ok(pom.includes('<artifactId>demo</artifactId>'), `pom.xml rewritten, got: ${pom}`);
  assert.ok(pom.includes('<groupId>com.example.demo</groupId>'));
  assert.equal(readFileSync(path.join(root, '.planning', 'notes.md'), 'utf8'), metaBefore, 'meta dirs untouched');
  assert.ok(pngBefore.equals(readFileSync(path.join(root, 'logo.png'))), 'binary bytes untouched');
  assert.equal(readFileSync(path.join(root, 'trap.txt'), 'utf8'), trapBefore, 'trap file untouched');
});

test('main auto-commits exactly one conventional commit: chore: initialize project as demo', (t) => {
  const root = makeFixture(t);
  assert.equal(commitCount(root), 1);
  const res = runMain(root);
  assert.equal(res.status, 0, `stdout: ${res.stdout}\nstderr: ${res.stderr}`);
  assert.equal(commitCount(root), 2, 'exactly one new commit');
  assert.equal(lastSubject(root), 'chore: initialize project as demo');
  assert.equal(git(root, 'status', '--porcelain').trim(), '', 'worktree clean after auto-commit');
});

// -------------------------------------------------------------- idempotency

test('idempotency: a second run detects zero literals and exits 0 printing "already initialized as demo"', (t) => {
  const root = makeFixture(t);
  const first = runMain(root);
  assert.equal(first.status, 0, `first run failed: ${first.stdout}\n${first.stderr}`);
  const second = runMain(root);
  assert.equal(second.status, 0, `second run must exit 0: ${second.stdout}\n${second.stderr}`);
  assert.ok(
    second.stdout.includes('already initialized as demo'),
    `distinct idempotency message expected, got: ${second.stdout}`,
  );
  assert.equal(commitCount(root), 2, 'second run must not create another commit');
});
