// GATE-12 executable specification: render-then-check pipeline (D-14).
// Covers: token rendering (PRESET-SPEC §4.5 orphan rule), CRLF-normalized
// line budgets (Pitfall 6), and the vacuous-green smoke guard (Pitfall 9).
// Zero npm dependencies — node:test only.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, "fixtures");
const rendererPath = join(here, "..", "render-claude-md.mjs");
const checkerPath = join(here, "..", "claude-md-check.mjs");

// Dynamic imports so each test fails individually while the modules do not
// exist yet (RED), instead of one file-level load error.
const loadRenderer = () => import(pathToFileURL(rendererPath).href);
const loadChecker = () => import(pathToFileURL(checkerPath).href);

const SAMPLE_VALUES = {
  projectName: "smoke",
  groupId: "com.acme",
  artifactId: "app",
};

// --- render (render-claude-md.mjs) -----------------------------------------

test("render replaces {{placeholders}} with provided values", async () => {
  const { render } = await loadRenderer();
  assert.equal(render("Hello {{projectName}}", { projectName: "smoke" }), "Hello smoke");
});

test("render throws naming the placeholder when no value exists (orphan {{ after render, PRESET-SPEC §4.5)", async () => {
  const { render } = await loadRenderer();
  assert.throws(
    () => render("x {{unknownToken}} y", { projectName: "smoke" }),
    /unknownToken/,
  );
});

test("render is token-replacement only — content without {{ }} tokens is untouched", async () => {
  const { render } = await loadRenderer();
  const gnarly = "single { brace } $dollar \\backslash <html> & no tokens\nline2";
  assert.equal(render(gnarly, SAMPLE_VALUES), gnarly);
});

test("render renders the fixture template with sample values leaving no orphan {{", async () => {
  const { render } = await loadRenderer();
  const template = readFileSync(join(fixtures, "template.md"), "utf8");
  const rendered = render(template, SAMPLE_VALUES);
  assert.ok(!rendered.includes("{{"), "no orphan {{ may remain after render");
  assert.ok(rendered.includes("# smoke"));
  assert.ok(rendered.includes("com.acme"));
  assert.ok(rendered.includes("artifactId: app"));
});

// --- countLines (claude-md-check.mjs) ---------------------------------------

test("countLines normalizes CRLF before counting (Pitfall 6)", async () => {
  const { countLines } = await loadChecker();
  assert.equal(countLines("a\r\nb\r\nc"), 3);
  assert.equal(countLines("a\nb\nc"), 3);
  assert.equal(countLines("a\r\nb\r\nc"), countLines("a\nb\nc"));
});

test("countLines counts the CRLF fixture identically to its LF equivalent", async () => {
  const { countLines } = await loadChecker();
  const raw = readFileSync(join(fixtures, "crlf.md"), "utf8");
  assert.ok(raw.includes("\r\n"), "fixture integrity: crlf.md must contain literal CRLF bytes");
  assert.equal(countLines(raw), 3);
  assert.equal(countLines(raw.replace(/\r\n/g, "\n")), 3);
});

// --- checkBudget (claude-md-check.mjs) --------------------------------------

test("checkBudget fails a 201-line file against a 200-line budget, naming file, budget, and actual", async () => {
  const { checkBudget } = await loadChecker();
  const oversizePath = join(fixtures, "oversize.md");
  const result = checkBudget(oversizePath, 200);
  assert.equal(result.pass, false);
  assert.equal(result.actual, 201);
  assert.ok(result.message.includes("oversize.md"), "failure message names the file");
  assert.ok(result.message.includes("200"), "failure message names the budget");
  assert.ok(result.message.includes("201"), "failure message names the actual count");
});

test("checkBudget passes a file within budget", async () => {
  const { checkBudget } = await loadChecker();
  const result = checkBudget(join(fixtures, "template.md"), 200);
  assert.equal(result.pass, true);
  assert.ok(result.actual > 0);
  assert.ok(result.actual <= 200);
});

// --- runSmoke (claude-md-check.mjs) ------------------------------------------

test("runSmoke executes the commands declared for the leg and reports zero failures", async () => {
  const { runSmoke } = await loadChecker();
  const result = runSmoke(join(fixtures, "smoke-ok.json"), "ubuntu");
  assert.equal(result.ran, 2);
  assert.deepEqual(result.failures, []);
});

test("runSmoke throws 'no commands declared' when the manifest has zero commands for the leg (vacuous-green guard, Pitfall 9)", async () => {
  const { runSmoke } = await loadChecker();
  // smoke-empty.json declares its only command for the ubuntu leg —
  // the windows leg therefore has zero commands and must NOT pass green.
  assert.throws(
    () => runSmoke(join(fixtures, "smoke-empty.json"), "windows"),
    /no commands declared/,
  );
});

test("runSmoke reports failures by command", async () => {
  const { runSmoke } = await loadChecker();
  const dir = mkdtempSync(join(tmpdir(), "gate12-smoke-"));
  const manifestPath = join(dir, "smoke-fail.json");
  writeFileSync(manifestPath, JSON.stringify({
    commands: [
      { cmd: "node --version", legs: ["ubuntu"] },
      { cmd: "node -e process.exit(7)", legs: ["ubuntu"] },
    ],
  }));
  const result = runSmoke(manifestPath, "ubuntu");
  assert.equal(result.ran, 2);
  assert.equal(result.failures.length, 1);
  assert.ok(result.failures[0].cmd.includes("process.exit(7)"), "failure is reported by command");
});

// --- CLI contract (claude-md-check.mjs as executable) ------------------------

function runCli(args) {
  return spawnSync(process.execPath, [checkerPath, ...args], { encoding: "utf8" });
}

test("CLI exits 0 when budgets pass and declared smoke commands succeed", async () => {
  const res = runCli([
    "--root-template", join(fixtures, "template.md"),
    "--tree-file", join(fixtures, "template.md"),
    "--smoke-manifest", join(fixtures, "smoke-ok.json"),
    "--leg", "ubuntu",
  ]);
  assert.equal(res.status, 0, `expected exit 0, got ${res.status}\n${res.stdout}${res.stderr}`);
});

test("CLI exits non-zero on tree-file budget violation, naming rule, file, budget and measured value (FR-E08 seed)", async () => {
  const res = runCli([
    "--root-template", join(fixtures, "template.md"),
    "--tree-file", join(fixtures, "oversize.md"),
    "--smoke-manifest", join(fixtures, "smoke-ok.json"),
    "--leg", "ubuntu",
  ]);
  const output = `${res.stdout}${res.stderr}`;
  assert.notEqual(res.status, 0, "oversize tree file must fail the gate");
  assert.ok(output.includes("oversize.md"), "output names the file");
  assert.ok(output.includes("150"), "output names the 150-line tree budget");
  assert.ok(output.includes("201"), "output names the measured count");
});
