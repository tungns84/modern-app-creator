// run-gate.mjs — Q-004 verify spine: ordered gate runner with per-gate timing.
// Zero npm dependencies; only `node`, `git`, `docker` (config parsing only),
// `mvnw`/`mvnw.cmd` (backend gates), and `task` are assumed on PATH (Q-004 §2.3).
//
// Contract (Q-004 §5, implemented verbatim):
//   GATE <name> <millis>ms <PASS|FAIL>     one line per gate
//   TOTAL <millis>ms <PASS|FAIL>           sum of gate wall times
// - No short-circuit: every gate in the selected set runs; exit non-zero if any failed (§2.5).
// - Budget is itself a gate (fast mode only): TOTAL < 60000ms or the run
//   FAILs even when all gates passed (§5).
// - On FAIL, after the timing block, one block per failed gate relays the
//   gate's own rule-named output + fix hint (FR-E08).
//
// Gate `fast` property (Phase-2+):
//   fast: true  — included in both --mode fast and --mode full
//   fast: false — included in --mode full only (requires container runtime)
// Any new gate MUST be assigned fast vs full-only in the same PR that adds it.
//
// CLI: node scripts/checks/run-gate.mjs [--mode fast|full]
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const FAST_BUDGET_MS = 60_000; // contract ceiling (Q-004 §5)

function testFiles(dir) {
  // GLOB-expanded explicitly: `node --test <dir>/` directory form is broken
  // on Windows node 22.22 — pass concrete file paths instead.
  return readdirSync(dir)
    .filter((f) => f.endsWith(".test.mjs"))
    .map((f) => join(dir, f));
}

/** Full ordered gate list. Each gate carries a `fast` boolean (Phase-2+ contract). */
export function gates() {
  // On Windows, .cmd files cannot be spawned with shell:false — must go via cmd /c.
  // mvnwArgs is spread into argv so: [...mvnwArgs, "-q", "compile", ...]
  const mvnwArgs = process.platform === "win32"
    ? ["cmd", "/c", ".\\backend\\mvnw.cmd"]
    : ["./backend/mvnw"];
  return [
    // ── Phase 1 gates (all fast) ───────────────────────────────────────────
    {
      name: "hooks-test",
      fast: true,
      argv: ["node", "--test", ...testFiles(".claude/hooks/tests")],
    },
    {
      name: "checks-test",
      fast: true,
      // includes scripts/tests/ (init-core suite) — static node:test class,
      // folded into the checks-test gate per Q-004 §4 assignment rule
      argv: [
        "node",
        "--test",
        ...testFiles("scripts/checks/tests"),
        ...testFiles("scripts/tests"),
      ],
    },
    {
      name: "claude-md-check",
      fast: true,
      // same args as .github/workflows/claude-md-check.yml
      argv: [
        "node",
        "scripts/checks/claude-md-check.mjs",
        "--root-template", "templates/claude/ROOT-CLAUDE.template.md",
        "--tree-file", "backend/CLAUDE.md",
        "--tree-file", "frontend/CLAUDE.md",
        "--smoke-manifest", "templates/claude/smoke-commands.json",
      ],
    },
    { name: "settings-lint",  fast: true, argv: ["node", "scripts/checks/settings-lint.mjs"] },
    { name: "skills-lint",    fast: true, argv: ["node", "scripts/checks/skills-lint.mjs"] },
    { name: "meta-link-lint", fast: true, argv: ["node", "scripts/checks/meta-link-lint.mjs"] },
    {
      name: "compose-config",
      fast: true,
      argv: ["docker", "compose", "-f", "infra/compose.yaml", "config", "-q"],
    },

    // ── Phase 2 gates ──────────────────────────────────────────────────────
    // backend-compile: confirms pom.xml + sources resolve without starting Spring
    {
      name: "backend-compile",
      fast: true,
      argv: [...mvnwArgs, "-q", "compile", "-f", "backend/pom.xml"],
    },
    // archunit: 7 GATE-02 rules; no container needed; class-file scan only
    {
      name: "archunit",
      fast: true,
      argv: [...mvnwArgs, "-q", "test",
             "-Dtest=ArchitectureGatesTest", "-f", "backend/pom.xml"],
    },
    // modulith-verify: GATE-01 DAG verify + name-set assertion
    // -Pbpm-off: Plan 01 state has no bpm package; remove this flag in Plan 07
    {
      name: "modulith-verify",
      fast: true,
      argv: [...mvnwArgs, "-q", "test",
             "-Pbpm-off", "-Dtest=ModulithVerifyTest", "-f", "backend/pom.xml"],
    },
    // backend-unit + backend-integration + kill-listener-test arrive in Plan 05
  ];
}

function runGate(gate) {
  const started = Date.now();
  const res = spawnSync(gate.argv[0], gate.argv.slice(1), {
    encoding: "utf8",
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const millis = Date.now() - started;
  const pass = res.status === 0 && !res.error;
  const output = [
    res.error ? `spawn error: ${res.error.message}` : "",
    res.stdout ?? "",
    res.stderr ?? "",
  ]
    .join("\n")
    .trim();
  return { name: gate.name, millis, pass, output };
}

function main() {
  const argv = process.argv.slice(2);
  let mode = "full";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--mode") {
      mode = argv[++i];
    } else {
      throw new Error(`run-gate: unknown argument "${argv[i]}"`);
    }
  }
  if (mode !== "fast" && mode !== "full") {
    throw new Error(`run-gate: --mode must be fast|full, got "${mode}"`);
  }

  // fast mode: only gates with fast=true; full mode: all gates
  const activeGates = mode === "fast"
    ? gates().filter((g) => g.fast === true)
    : gates();

  const results = [];
  for (const gate of activeGates) {
    const result = runGate(gate); // no short-circuit (Q-004 §2.5)
    results.push(result);
    console.log(`GATE ${result.name} ${result.millis}ms ${result.pass ? "PASS" : "FAIL"}`);
  }

  const total = results.reduce((sum, r) => sum + r.millis, 0);
  const anyFailed = results.some((r) => !r.pass);
  const budgetBlown = mode === "fast" && total >= FAST_BUDGET_MS;
  const runFailed = anyFailed || budgetBlown;
  console.log(`TOTAL ${total}ms ${runFailed ? "FAIL" : "PASS"}`);

  if (budgetBlown) {
    console.error(
      `run-gate/fast-budget VIOLATION: TOTAL ${total}ms exceeds the fast ` +
        `budget of ${FAST_BUDGET_MS}ms — the budget is a gate (Q-004 §5). ` +
        `Fix: move the slow gate to full-only via a T3-reviewed Taskfile ` +
        `change; never raise the budget silently.`
    );
  }
  for (const r of results.filter((r) => !r.pass)) {
    console.error(`\n--- FAILED GATE ${r.name} (violated rules + fixes below) ---`);
    console.error(r.output || "(gate produced no output)");
  }

  process.exit(runFailed ? 1 : 0);
}

const isCliEntry =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCliEntry) main();
