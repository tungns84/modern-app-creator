# Phase 2: Backend Foundation - Context

**Gathered:** 2026-06-13
**Status:** Ready for planning

<domain>
## Phase Boundary

A green Spring Modulith skeleton with 5 infra modules (`shared`, `appconfig`, `i18n`, `caching`, `observability`) where architecture violations fail the build (`./mvnw verify` = Modulith verify + ArchUnit, GATE-01/02), cross-module events cannot be lost (JDBC Event Publication Registry + kill-listener test, FOUND-03), the running app exposes probes / structured JSON logs with MDC PII allowlist / OTel traces / Prometheus metrics (FOUND-07), modules read typed properties only with env↔Consul profile switch (FOUND-10), and `verify --fast` stays <60s on the Q-004 gate set (AGENT-08). Built via the `new-module` skill as the first real dogfood. NOT in this phase: tenancy/security (Phase 3), API contract/ProblemDetail (Phase 4), feature modules (Phase 5+), storage/jobs (Phase 6), bpm (Phase 7).

</domain>

<decisions>
## Implementation Decisions

### Dogfood & new-module skill
- **D-01 (bootstrap order):** Manual-first. Scaffold the Maven skeleton + `shared` module by hand as the reference shape; codify that shape into the `new-module` skill (full implementation, replacing the Phase 1 skeleton contract); then generate `appconfig`, `i18n`, `caching`, `observability` WITH the skill — the skill gets validated 4 times in-phase. Matches D-21 (Phase 1): skills complete when real trees exist.
- **D-02 (spec granularity):** ~5 T3 specs: one spec for skeleton + `shared` + gates (GATE-01/02) + verify wiring; one spec per skill-generated module. Matches the skill contract (skill emits pre-filled `specs/NNN-<module>/plan.md`) and Phase 1 D-09 granularity philosophy.
- **D-03 (`shared` scope):** Minimal — only what GATE-02 forces to exist: the project scheduling wrapper (bare `@Scheduled` banned), the sanctioned query wrapper (native query ban), and genuinely shared types. NO tenant seam (BaseEntity/tenant_id = Phase 3), NO ProblemDetail/error scaffolding (Phase 4).
- **D-04 (module depth):** Each of the 4 skill-generated modules ships a minimal REAL functional slice: `appconfig` = typed-properties infrastructure + profile-based source switch; `i18n` = vi/en message resolution via `::spi`; `caching` = Caffeine + cache abstraction; `observability` = MDC PII allowlist + OTel + Prometheus wiring. Flyway folder created ONLY when a module has real tables — no empty migrations.

### BPM option mechanism
- **D-05 (option home):** Maven property `bpm.enabled` (default `true`) + Maven profile `bpm-off` that excludes `com/acme/app/bpm/**` from compile/test — simulates template-time exclusion semantics (BPM-off generated project simply has no bpm package). Surefire passes the property to tests. Phase 2 lands the property + dynamic assertion only; the `bpm-off` profile is exercised for real in Phase 7. `pom.xml` is already T3.
- **D-06 (assertion shape):** Assert the exact module NAME SET, not a count. Phase 2 expected set: `shared`, `appconfig`, `i18n`, `caching`, `observability`; grows per phase; `bpm` joins conditionally on `bpm.enabled`. The `new-module` skill bumps this set (satisfies the skill contract's "module-count assertion bump" with stronger semantics).

### Config switch & Consul (FOUND-10)
- **D-07 (Consul dependency):** `spring-cloud-consul-config` lives permanently in the pom; activation via Spring profile `consul` using `spring.config.import: optional:consul:` — one classpath, no Maven build branching. Researcher/planner MUST verify which Spring Cloud release train is compatible with Boot 4.0.x before pinning.
- **D-08 (Consul proof):** Testcontainers-only — integration test spins a Consul container, seeds KV, asserts typed properties resolve; runs in `verify --full`. `task up` stays at the locked 6-service FOUND-02 list (no Consul container in compose).
- **D-09 (typed-properties enforcement):** New ArchUnit rule in the GATE-02 set: `@Value` and injected `Environment` banned outside the `appconfig` module; every other module consumes `@ConfigurationProperties` records only. Violation = build fail naming rule + fix (AGENT-08 error-legibility format).

### Event registry policy (FOUND-03)
- **D-10 (completion):** Mark-completed (Modulith default completion mode) + periodic cleanup job deleting completed records past retention. Cleanup runs through the `shared` scheduling wrapper; retention is a typed property in `appconfig` (dogfoods FOUND-10). Keeps the forensics trail and makes the staleness monitor meaningful.
- **D-11 (delivery semantics):** At-least-once + mandatory idempotent listeners (natural key or check-before-write). Rule recorded in `backend/CLAUDE.md`. Kill-listener test proves BOTH directions: event redelivered after listener death/restart AND side-effect applied exactly once. No generic inbox/dedup table in Phase 2.
- **D-12 (retry/staleness):** Architecture locked: retries bounded (never infinite); past the bound → publication stays incomplete + logged + alerting metric (no silent drop); staleness monitor (`spring.modulith.events.staleness.*`) enabled. Retry count, backoff, staleness thresholds = typed properties; concrete defaults chosen by planner/researcher per Spring Modulith 2.0 docs.

### Claude's Discretion
- Maven structure (single-module vs multi-module Maven layout) — follow Spring Modulith convention; planner decides with research backing.
- Exact retry/backoff/retention/staleness default values (D-12).
- MDC PII allowlist field list and mechanism details; OTel wiring approach (Boot starter vs agent) — within FOUND-07 requirements.
- Gate error message formatting details, within the Q-004 contract (`GATE <name> <millis>ms <PASS|FAIL>` + rule-plus-fix blocks).
- How the `new-module` skill internals work (generator script vs instructions), as long as outputs match its CONTRACT section.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Methodology & enforcement (governs HOW Phase 2 work is done)
- `product/methodology/AI-COWORK.md` — S→P→I→V workflow, T3 paths (pom.xml, package-info.java, new module dirs), H2 hard approval
- `product/cli/CLAUDE-CODE-RUNTIME.md` — five-skills spec (§2) incl. `new-module` requirements
- `product/cli/PRESET-SPEC.md` — §3 manifest/options contract (BPM option semantics = template-time inclusion), §6 sanity gate, §7 template-first rule
- `.claude/skills/new-module/SKILL.md` — the CONTRACT this phase implements (inputs/outputs locked; do not change outputs without T3 review)
- `.cowork/tiers.json` — T3 path list the hook + CI gate read

### Gate & verify contract
- `.planning/spikes/q004-verify-fast.md` — §7 growth rule (Phase 2: compile + ArchUnit + Modulith verify + pure unit join `--fast`; Testcontainers + kill-listener `--full` only), timing format §5, budget = gate
- `Taskfile.yml` — verify spine (`run-gate.mjs --mode fast|full`); gate-set changes are T3
- `scripts/checks/` — run-gate runner the new Maven gates plug into

### Requirements & architecture rules
- `requirements/PRD.md` — FR-A01/A03/A05/A07/A10, FR-D01/D02, FR-E08 (Vietnamese, authoritative)
- `.planning/REQUIREMENTS.md` — FOUND-01/03/05/07/10, GATE-01/02, AGENT-08 + cross-phase notes
- `backend/CLAUDE.md` — module layout, communication rules (events for writes, `::spi` for reads), Flyway path convention, ArchUnit ban list, agent-hallucination warnings (Testcontainers 2.x, Jackson 3 `tools.jackson`, JDK 25, JUnit 6)

### Tech pins
- `.planning/research/STACK.md` — version pins (JDK decision superseded to 25 LTS per PROJECT.md Key Decisions)
- `.planning/research/PITFALLS.md` — toolchain/agent pitfalls
- `docs/adr/0001-valkey-not-redis.md` — cache infra container choice (caching module dev profile)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Taskfile.yml` + `scripts/checks/run-gate.mjs` — the verify spine; Phase 2 adds `./mvnw -q compile`, ArchUnit, Modulith verify, pure-unit gates to `--fast` and Testcontainers/kill-listener gates to `--full` per Q-004 §7
- `infra/compose.yaml` — PostgreSQL 16 + Valkey already in the local stack for module dev/integration targets
- `.claude/skills/new-module/SKILL.md` — skeleton contract to implement
- T3/T4 hooks live in `.claude/settings.json` + `.cowork/tiers.json` — every Phase 2 T3 write (pom, package-info, gate config) flows through them; first real exercise of the enforcement under application code

### Established Patterns
- Specs convention `specs/NNN-slug/{spec,plan}.md` (001–007 exist; Phase 2 continues numbering from 008)
- Gate output contract: one `GATE <name> <millis>ms <PASS|FAIL>` line per gate + TOTAL; failures name rule + fix
- POSIX-sh-only Taskfile, only `docker|node|task` (+ now `./mvnw`) as executables cross-OS

### Integration Points
- `backend/` currently holds only `CLAUDE.md` — Maven skeleton lands beside it (`backend/pom.xml`, `backend/src/...`, `./mvnw` wrapper at backend root)
- Module packages under `com.acme.app.<module>`; Flyway at `backend/src/main/resources/db/migration/<module>/`
- CI: existing GitHub Actions workflows (os-matrix, plan-compliance) — backend gates join the ubuntu leg for container-class tests; Win/macOS legs compile + unit only (Phase 1 D-04 pattern)

</code_context>

<specifics>
## Specific Ideas

- The kill-listener test is the phase's flagship proof — it must demonstrate both no-loss AND no-double-effect, not just redelivery (success criterion 2 wording).
- Dogfood evidence matters: each skill-generated module should leave a visible S→P→I→V trail (spec → approved plan → commits citing REQ-IDs) — this is what Phase 8's metrics audit will read.

</specifics>

<deferred>
## Deferred Ideas

- `bpm-off` Maven profile real exercise + CI leg — Phase 7 (Phase 2 only lands property + dynamic name-set assertion).
- Consul container in compose / K8s Consul overlay — Phase 6 territory if ever; Testcontainers proof suffices now.
- Generic inbox/dedup table for event listeners — revisit if Phase 5+ business listeners make per-listener idempotency repetitive.
- Tenant seam in `shared` (BaseEntity/tenant_id) — Phase 3. ProblemDetail/error envelope — Phase 4.

</deferred>

---

*Phase: 2-Backend Foundation*
*Context gathered: 2026-06-13*
