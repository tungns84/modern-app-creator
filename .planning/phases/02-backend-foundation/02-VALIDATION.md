---
phase: 2
slug: backend-foundation
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-13
updated: 2026-06-13
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | JUnit 6 (Boot 4-managed) + Testcontainers 2.x + ArchUnit ≥1.4.2 |
| **Config file** | `backend/pom.xml` (surefire/failsafe + JUnit `groups`/`excludedGroups`), `backend/src/test/resources/` |
| **Quick run command** | `node scripts/checks/run-gate.mjs --mode fast` (backend-compile + archunit + modulith-verify + backend-unit) |
| **Full suite command** | `node scripts/checks/run-gate.mjs --mode full` (adds backend-integration + kill-listener-test) / `./mvnw verify` |
| **Estimated runtime** | ~45–60 seconds (fast gates); full IT longer with container spin-up |

---

## Sampling Rate

- **After every task commit:** Run quick gate set (`--mode fast`, <60s)
- **After every plan wave:** Run `--mode full` (Modulith + ArchUnit + Testcontainers IT)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds (fast gates per Q-004 / success criterion 5)

---

## Per-Task Verification Map

> Pulled from each plan's `<verify><automated>` blocks + RESEARCH "Phase Requirements → Test Map". `--fast` tags are unit/static (no container); `--full` tags spin Testcontainers PG16.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | Gate Bucket | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|-------------|--------|
| 2-01-01 | 01 | 1 | FOUND-05 (Consul) / D-07 | T-02-02 | Unverified Spring Cloud train not pinned on guesswork; verdict precedes any Consul artifact | spike (doc gate) | `node -e "…/VERDICT:(COMPATIBLE\|BLOCKED)/…"` | meta | ❌ W0 | ⬜ pending |
| 2-01-02 | 01 | 1 | FOUND-01 | T-02-01 | Skeleton compiles on locked stack; no boundary code yet | unit (compile) | `./mvnw -q compile -f backend/pom.xml` | fast | ❌ W0 | ⬜ pending |
| 2-01-03 | 01 | 1 | GATE-01, GATE-02, AGENT-08 | T-02-01 | Gates FIRE on undeclared dep / DAG cycle / banned pattern; rule+fix message | unit (arch/static) | `./mvnw -q test -Dtest=ModulithVerifyTest,ArchitectureGatesTest -f backend/pom.xml` | fast | ❌ W0 | ⬜ pending |
| 2-01-04 | 01 | 1 | FOUND-05 | T-02-SC | Real PG16 via `@ServiceConnection`; per-module Flyway creates `shared` schema (DB layer sampled from Wave 0) | integration (TC) | `./mvnw -q verify -Dgroups=integration -Dtest=SharedFlywaySchemaTest -f backend/pom.xml` | full | ❌ W0 | ⬜ pending |
| 2-01-05 | 01 | 1 | (H2 checkpoint) | T-02-03 | T3 boundary changes carry an approved bound spec; `Approved-by` filled only via PR review | manual (H2) | human-verify: `./mvnw -q verify -f backend/pom.xml` + review `specs/008-*/plan.md` | manual | n/a | ⬜ pending |
| 2-02-01 | 02 | 2 | AGENT-08 | T-02-SC | `new-module` scaffold uses node stdlib only (no new npm deps); CONTRACT outputs validated | unit (node:test) | `node --test scripts/new-module/tests/scaffold.test.mjs` | fast | ❌ W0 | ⬜ pending |
| 2-02-02 | 02 | 2 | FOUND-10 | T-02-04, T-02-05 | Typed-properties fail-fast on invalid config; `@Value`/Environment confined to appconfig (D-09); single Flyway customizer (Q-4); Consul gated on Q-1 verdict | unit + module | `./mvnw -q test -Dtest=AppConfigModuleTest,AppConfigPropertiesValidationTest,ModulithVerifyTest,ArchitectureGatesTest -f backend/pom.xml` | fast | ❌ W0 | ⬜ pending |
| 2-03-01 | 03 | 3 | FOUND-01, GATE-01, GATE-02 | T-02-08, T-02-09 | i18n reads config only via appconfig::spi records (D-09 green); module boundary not widened | module (`@ApplicationModuleTest`) | `./mvnw -q test -Dtest=I18nModuleTest -f backend/pom.xml` | fast | ❌ W0 | ⬜ pending |
| 2-03-02 | 03 | 3 | FOUND-01, GATE-01, GATE-02 | T-02-07, T-02-09 | caching reads TTL/size from appconfig::spi (no `@Value`); DAG stays acyclic at 4 modules | module (`@ApplicationModuleTest`) | `./mvnw -q test -Dtest=CachingModuleTest,I18nModuleTest,ModulithVerifyTest,ArchitectureGatesTest -f backend/pom.xml` | fast | ❌ W0 | ⬜ pending |
| 2-04-01 | 04 | 4 | FOUND-07 | T-02-10, T-02-11 | Non-allowlisted MDC keys (PII) dropped from JSON logs; actuator probes UP; env values not leaked | unit + slice | `./mvnw -q test -Dtest=MdcAllowlistTest,ActuatorProbeTest -f backend/pom.xml` | fast | ❌ W0 | ⬜ pending |
| 2-04-02 | 04 | 4 | FOUND-07, FOUND-01, GATE-01, GATE-02 | T-02-13 | EPR cleanup via `shared` scheduling wrapper (no bare `@Scheduled`); D-12 staleness thresholds bind from typed `ObservabilityProperties` (asserted, not just yaml) | unit + module | `./mvnw -q test -Dtest=EventPublicationCleanupTaskTest,StalenessPropertiesBindingTest,ModulithVerifyTest,ArchitectureGatesTest -f backend/pom.xml` | fast | ❌ W0 | ⬜ pending |
| 2-05-01 | 05 | 5 | FOUND-03, FOUND-05, D-12 | T-02-15, T-02-16 | Bounded retry capped at maxAttempts; past bound → INCOMPLETE + metric + log (no infinite loop, no silent drop); runs on real PG16 (extends `PostgresIntegrationTest`) | integration (TC) | `./mvnw -q verify -Dgroups=integration -Dtest=BoundedRetryTest -f backend/pom.xml` | full | ❌ W0 | ⬜ pending |
| 2-05-02 | 05 | 5 | FOUND-03, FOUND-05 | T-02-14, T-02-17 | No event loss (INCOMPLETE→redeliver→COMPLETED) AND no double-effect (exactly 1 side-effect row) on real PG16 | integration (TC) | `./mvnw -q verify -Dtest=KillListenerTest -f backend/pom.xml` | full | ❌ W0 | ⬜ pending |
| 2-05-03 | 05 | 5 | AGENT-08 | T-02-01 | `verify --fast` <60s (compile + ArchUnit + Modulith verify + unit); `--full` is a strict superset; budget-is-a-gate | meta-gate | `node scripts/checks/run-gate.mjs --mode fast` | fast | ❌ W0 | ⬜ pending |
| 2-05-04 | 05 | 5 | (H2 checkpoint) | T-02-03 | EPR durability proof + gate split reviewed; `Approved-by` filled only via PR review (H2) | manual (H2) | human-verify: `./mvnw -q verify` + both gate modes + read `KillListenerTest` | manual | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky — execute-phase flips these as each task lands.*

---

## Wave 0 Requirements

Wave 0 = Plan 01 (wave 1) lands every MISSING test reference the later plans depend on, so the gate spine and the DB-layer sampling exist before any module is generated.

- [x] `ModulithVerifyTest` — Spring Modulith `ApplicationModules.of(App.class).verify()` baseline + dynamic name-set assertion (Plan 01 Task 3)
- [x] `ArchitectureGatesTest` — ArchUnit rules (field injection, bare `@Scheduled`, unwrapped native query, `@Transactional` private, entity-across-controller, `@Value`/Environment outside appconfig, DAG cycle, undeclared dependency) (Plan 01 Task 3)
- [x] `PostgresIntegrationTest` — Testcontainers 2.x base fixture (`@ServiceConnection` PostgreSQL 16) created in **Wave 0 / Plan 01 Task 4** (BLOCKER-2 resolution: option (a) — DB wiring sampled from the first module onward, reused by Plan 05's KillListenerTest)
- [x] `SharedFlywaySchemaTest` — per-module Flyway schema assertion on real PG16 (`shared` baseline migration applied) — Plan 01 Task 4
- [x] `run-gate.mjs` mode-aware `gates()` refactor with `backend-compile`/`archunit`/`modulith-verify` fast gates (Plan 01 Task 3); `backend-unit`/`backend-integration`/`kill-listener-test` registered in Plan 05 Task 3
- [x] Event Publication Registry kill-listener test scaffold (no loss + no double-effect) — built in Plan 05 Tasks 1–2 on top of the Wave-0 `PostgresIntegrationTest` fixture

**BLOCKER-2 decision recorded:** Option (a) chosen. A minimal `PostgresIntegrationTest` (`@ServiceConnection` PG16) + a per-module Flyway schema assertion (`SharedFlywaySchemaTest`) live in Wave 0 / Plan 01 Task 4. This closes the FOUND-05 3-consecutive-wave DB sampling gap (Waves 2–4 used `@ApplicationModuleTest` with no container) by sampling the real-PG + Flyway layer from the first module and reusing the fixture downstream, rather than relocating the gap to Wave 5. Plan 01 retains FOUND-05 in its `requirements` (now backed by a real container test, not just pom deps); Plan 05 keeps FOUND-05 for the kill-listener/idempotency proof and EXTENDS the Wave-0 fixture instead of creating its own.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Profile-switched config source (env+ConfigMap vs Consul KV) | FOUND-10 | Consul KV path is gated on the Q-1 verdict; if COMPATIBLE the Testcontainers Consul test (Plan 05, `--full`) covers it; if BLOCKED the seam is deferred (per Q-1 RESOLVED) and only env+ConfigMap is automated | If COMPATIBLE: `./mvnw -q verify -Dtest=ConsulConfigIntegrationTest`. If BLOCKED: confirm env+ConfigMap source resolves and Consul deferral is recorded in the Plan 02 SUMMARY |
| H2 approval of T3 bound specs (008/009/010/011/012/013) | AI-COWORK H2 | `Approved-by:` must be filled by a human via GitHub PR review — never by the agent | Review each `specs/NNN-*/plan.md`; approve via PR review (Plan 01 Task 5 and Plan 05 Task 4 are the blocking checkpoints) |

*Q-1 (Consul compat) is RESOLVED in RESEARCH: the Wave-0 spike (Plan 01 Task 1) decides COMPATIBLE vs BLOCKED before any Consul code; this row therefore does not escalate to a Wave-0 blocker.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (every code-producing task in the map has an automated command; the two H2 tasks are checkpoints by design)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify — FOUND-05's DB layer is now sampled in Wave 0 (Plan 01 Task 4) and again in Wave 5, closing the prior 3-wave gap (Waves 2–4 `@ApplicationModuleTest`)
- [x] Wave 0 covers all MISSING references (ModulithVerifyTest, ArchitectureGatesTest, PostgresIntegrationTest, SharedFlywaySchemaTest, run-gate mode refactor; kill-listener built on the Wave-0 fixture)
- [x] No watch-mode flags (all gates are single-shot `./mvnw`/`node` commands)
- [x] Feedback latency < 60s (fast gate set is unit/static only; container gates are `--full`; budget-is-a-gate enforced in Plan 05 Task 3)
- [x] D-12 staleness monitor is asserted (Plan 04 Task 2 `StalenessPropertiesBindingTest`) — not configured-but-untested (WARNING-1 resolved)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved (revision 2026-06-13 — BLOCKER-1/2, WARNING-1 addressed; map populated for all 13 tasks across plans 01–05).
