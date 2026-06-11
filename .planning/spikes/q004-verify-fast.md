# Q-004 Spike Report — `verify --fast` Gate-Set Contract & Timing Harness

- **Spike:** Q-004 (PRD §14)
- **Date:** 2026-06-11
- **Status:** COMPLETE — contract defined; Phase-1 baseline deferred to plan 01-11 (by design, see §6)
- **Pre-directed by:** D-19 (`verify --fast` = static-only, no containers), D-07 (this report is meta, lives in `.planning/spikes/`, never ships)
- **Consumers:** plan 01-11 (Taskfile `verify` / `verify:fast` wiring), Phase 2 success criterion 5 (`verify --fast` <60s), Phase 8 divergence audit

---

## 1. Exit-Criteria Verdicts

| Exit criterion | Verdict |
|---|---|
| Fast vs full gate-set membership defined, no gate unassigned | MET — §3, §4 |
| Timing output format specified verbatim for plan 01-11 | MET — §5 |
| Budget assertion defined (fast <60s; Phase-1 baseline <10s) | MET — §5 |
| Growth rule for Phases 2–8 stated | MET — §7 |
| Fast-vs-full divergence metric defined (measured Phase 8) | MET — §8 |
| Phase-1 baseline timings | DEFERRED to plan 01-11 — no check scripts exist in-tree at spike time (verified: no `scripts/checks/`, no `Taskfile.yml` on this branch). Per RESEARCH recommendation, do NOT benchmark Maven/gates that do not exist yet. |

## 2. Contract Definition

**`verify --fast` is the static-only gate-set (D-19):**

1. No containers. Nothing in the fast set may start, stop, or talk to a Docker container, Testcontainers instance, or any network service.
2. No build-system invocation in Phase 1 (no Maven, no npm build). From Phase 2 onward, compile-class steps join fast (see §7) but container-class steps never do.
3. Deterministic and offline. Every fast gate must produce the same result on a fresh clone with no network access (the only external binary requirements: `node`, `git`, `docker` CLI for *config parsing only*, `task`).
4. Every gate is a named unit. The runner executes gates as an ordered list of (name, command) pairs; a gate is the smallest unit that gets its own timing line and PASS/FAIL verdict.
5. No short-circuit. A failing gate does not stop the run; all gates execute, then the runner exits non-zero if any failed. Failure output must name the violated rule plus the fix (FR-E08 seed; Phase 2 criterion 5 wording).
6. `verify --full` is a strict superset of `verify --fast`. Fast is never a different pipeline — it is a prefix-subset of full, so fast-vs-full divergence (§8) measures only the gates *excluded* from fast.

## 3. Phase 1 gate-set membership — `verify --fast`

| # | Gate name | Command | Class |
|---|-----------|---------|-------|
| 1 | `hooks-test` | `node --test .claude/hooks/tests/` | node:test unit suite (T3/T4 hook decision fixtures) |
| 2 | `checks-test` | `node --test scripts/checks/tests/` | node:test unit suite, includes plan-compliance fixture tests (GATE-10 logic vs fixture PR-files/reviews JSON) |
| 3 | `claude-md-check` | `node scripts/checks/claude-md-check.mjs` | Render preset root CLAUDE.md source with sample values → assert ≤200 lines; in-place assert `backend/CLAUDE.md` + `frontend/CLAUDE.md` ≤150 lines (D-14/D-15) |
| 4 | `settings-lint` | `node scripts/checks/settings-lint.mjs` | Assert `.claude/settings.json` carries T1 allow rules + T4 deny mirror in lockstep with `.cowork/tiers.json` |
| 5 | `skills-lint` | `node scripts/checks/skills-lint.mjs` | 5 SKILL.md present, frontmatter valid, skeleton contracts declared (D-21) |
| 6 | `meta-link-lint` | `node scripts/checks/meta-link-lint.mjs` | Shipped dirs (`docs/`, `specs/`, `backend/`, `frontend/`, `.claude/`, `templates/`) contain zero `.planning/` references (D-06/D-07, Pitfall 10) |
| 7 | `compose-config` | `docker compose -f infra/compose.yaml config -q` | Static parse/validation of the compose file — starts no containers (allowed in fast) |

No other Phase-1 gate exists. Command smoke on rendered CLAUDE.md commands that require Docker runs in `--full` / CI ubuntu leg only (Pitfall 9 split).

## 4. Phase 1 gate-set membership — `verify --full`

| # | Gate name | Command | Class |
|---|-----------|---------|-------|
| 1–7 | *everything in `--fast`* | (same, same order) | superset rule (§2.6) |
| 8 | `stack-up-smoke` | `task up` then assert `docker compose -f infra/compose.yaml ps --format json` shows all services healthy | Container health smoke (FOUND-02) |
| 9 | `init-parity-local` | run `scripts/init.sh` (or `.ps1` on Windows) against a temp fixture clone, assert rename + idempotent second run | Local init run (FOUND-12); full CI parity (sh-vs-ps1 tree diff) stays in the 2-OS CI workflow |

Unassigned gates: **none.** Any new gate added in any phase MUST be assigned to fast or full-only in the same PR that adds it (enforce via review checklist on `Taskfile.yml` — gate config is T3).

## 5. Timing output format (plan 01-11 MUST implement verbatim)

One line per gate, plus one total line, written to stdout:

```
GATE <name> <millis>ms <PASS|FAIL>
TOTAL <millis>ms <PASS|FAIL>
```

- `<name>` = gate name from §3/§4 tables (lowercase, hyphenated, no spaces).
- `<millis>` = integer wall-clock milliseconds for that gate's command.
- Literal token is `PASS` or `FAIL` (the format placeholder is written `<PASS|FAIL>`).
- `TOTAL` line: sum of gate wall times; verdict is `FAIL` if any gate failed.
- Budget assertion (built into the runner, fast mode only): `TOTAL` < **60s** (60000 ms) ⇒ otherwise the run itself FAILs even if all gates passed — the budget is a gate.
- Phase-1 expectation: fast total **<10s** (all gates are node:test + static parses). The 60s budget is the contract ceiling Phase 2 inherits; 10s is the Phase-1 baseline expectation, not a hard assertion.
- Exit code: 0 iff every gate PASS and budget met; non-zero otherwise. On FAIL, after the timing block, print one block per failed gate naming the violated rule and the fix.

Example (illustrative):

```
GATE hooks-test 412ms PASS
GATE checks-test 388ms PASS
GATE claude-md-check 95ms PASS
GATE settings-lint 41ms PASS
GATE skills-lint 38ms PASS
GATE meta-link-lint 52ms PASS
GATE compose-config 730ms PASS
TOTAL 1756ms PASS
```

## 6. Phase-1 baseline timings

**Baseline: to be captured by plan 01-11.** At spike execution time this branch contains no `scripts/checks/`, no `.claude/hooks/tests/`, no `Taskfile.yml`, no `infra/compose.yaml` — there is nothing real to time, and timing stand-ins would be fiction. Plan 01-11 wires `task verify`/`verify:fast`, runs the suite once, and records the first real `GATE`/`TOTAL` block in its SUMMARY as the Phase-1 baseline. RESEARCH (Open Question 3) explicitly directs not to burn spike time benchmarking toolchains that do not exist yet.

## 7. Growth rule — gate-set evolution Phases 2–8

| Phase | Joins `--fast` | Joins `--full` only |
|-------|----------------|---------------------|
| 2 | backend compile (`./mvnw -q compile`), ArchUnit suite, Spring Modulith `verify()`, pure unit tests (no Spring context, no DB) | Testcontainers integration tests (PG16), event-registry kill-listener test |
| 3 | tenancy/permission declaration lints | tenant-isolation integration tests (Testcontainers) |
| 4 | frontend lint (ESLint flat), `tsc --noEmit`, OpenAPI→Orval drift check (static diff), Vitest unit suites, i18n parity lint | Playwright E2E, axe-core WCAG runs |
| 5–7 | any new static lint/unit suite | any test needing `task up`, Keycloak, MinIO, Flowable engine |
| 8 | doc/onboarding smoke lints (static) | full guardrail metrics audit, fresh-clone onboarding run |

**Invariant (restates D-19):** anything that needs Docker, Testcontainers, a running JVM app, or a browser is `--full` only — forever. Compile/lint/unit-static steps default to `--fast` and must fit the 60s budget; if a fast gate pushes TOTAL over budget, the gate moves to full-only via a T3-reviewed Taskfile change, never by raising the budget silently.

## 8. Fast-vs-full divergence metric (measured in Phase 8, defined now)

- **Population:** all CI runs on PRs across the Phase-8 measurement window (the phase's CI history), where both the fast set and the full set executed on the same head SHA.
- **Per-rule failure set:** for each run, `F_fast` = set of (gate, violated-rule-id) pairs failed by `--fast`; `F_full` = same for `--full`.
- **Divergence:** `|F_full \ F_fast| / |F_full|` aggregated over the window — the fraction of real failures that only `--full` caught.
- **Target:** < **5%** (ROADMAP Phase 8 criterion 3). Rationale: fast is the inner-loop signal; if more than 1-in-20 real failures hide behind containers, devs stop trusting the inner loop.
- Failures of full-only gates are *expected* contributors (integration-only bugs); the metric exists to confirm the static set retains ≥95% of total failure-detection signal, validating the D-19 split empirically.

## 9. Decisions recorded by this spike

1. **`verify --fast` gate-set membership (Phase 1)** = the 7 gates in §3 — locked; consumed verbatim by plan 01-11.
2. **Timing line format** = `GATE <name> <millis>ms <PASS|FAIL>` + `TOTAL` line — locked.
3. **Budget semantics** = budget is itself a gate (fast TOTAL <60s ⇒ FAIL on overrun); Phase-1 expected baseline <10s, captured by plan 01-11.
4. **Superset rule** = full is always fast + extras; divergence metric (§8) defined now, measured Phase 8.
