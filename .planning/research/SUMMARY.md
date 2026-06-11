# Project Research Summary

**Project:** cowork-cli — preset `react-springboot-modulith` (Giai đoạn 1 preset repo)
**Domain:** Production-grade full-stack scaffold preset + embedded IAM + optional embedded BPM (Flowable 8) + machine-enforced AI-agent (Claude Code) methodology
**Researched:** 2026-06-11
**Confidence:** MEDIUM-HIGH overall (HIGH on stack/architecture mechanics; MEDIUM on agent-enforcement landscape and a few JDK-26 toolchain edges)

## Executive Summary

This product occupies an open market lane: no surveyed competitor combines a production-grade scaffold, embedded IAM suite, optional embedded BPM, and *machine-enforced* spec-driven methodology. JHipster has scaffold+IAM but advisory-only conventions; Spec Kit/Kiro have methodology artifacts but no production stack and no hard enforcement floor. The product's core promise — two-layer enforcement (L1 Claude Code PreToolUse hooks + L2 CI approver-identity gates) on top of a Spring Boot 4 Modulith + React 19 monorepo — is unique, and the research validates it is buildable with today's GA stack. [Inference on market-lane uniqueness — based on surveyed feature sets; no single source compares all four pillars.]

The recommended approach is **enforcement-before-content, then bottom-up DAG construction**: build the methodology artifacts (hooks, skills, specs convention, CI plan-compliance check) in the first phase and dogfood every subsequent phase through them (mandated by PRD §13.1), then build the 12+1 Modulith modules strictly in dependency order (shared → infra → tenancy/security → IAM features → ops → BPM), wiring each CI gate in the same phase as the first code it covers. Spring Modulith 2.0's per-module Flyway support, JDBC Event Publication Registry, and `@ApplicationModuleTest` make each module phase independently verifiable and closeable. The stack is fully pinned and verified compatible: Spring Boot 4.0.7 / Modulith 2.0.6 / Flowable 8.0.0 / React 19 / Vite 8, all green on JDK 26 today.

Three risk clusters dominate. (1) **JDK 26 is non-LTS** — compatibility is verified green (Boot 4.0.6+ officially supports ≤26; ArchUnit ≥1.4.2 required), but public updates end ~Sept 2026, forcing a planned 26→27 bump; a week-1 toolchain spike plus a written fallback-to-25 ADR is mandatory. (2) **Four spikes are phase-commitment blockers** (Q-010 hook stability, Q-002 hosting-API approver identity, Q-004 verify-fast <60s, Q-006 Flowable schema/tx) — three must run before any application code; hooks alone are demonstrably unreliable (multiple public Claude Code deny-bypass issues), so CI L2 must always be the enforcement floor. (3) **Seam-before-feature ordering** — tenancy filters, permission checks, and the event registry must precede feature endpoints, or the gates fail wholesale and force retrofit rewrites.

## Key Findings

### Recommended Stack

Stack is locked by PRD §10.2 plus a user override to JDK 26 (verified compatible end-to-end). The pin set is deliberately conservative: Boot **4.0.7** not 4.1.0 (Modulith 2.0.x / Flowable 8.0.0 / springdoc 3.0.x all GA against 4.0.x), Modulith **2.0.6** not 2.1-RC. Flowable **8.0.0** is the *only* Boot-4-compatible line — no alternative exists; its maturity risk (single GA, Feb 2026) is fenced by spike Q-006. Full details and the JDK 26 risk register: `.planning/research/STACK.md`.

**Core technologies:**
- JDK 26 (Temurin dev/CI, Liberica buildpack) + Spring Boot 4.0.7 + Spring Modulith 2.0.6 — module boundaries, JDBC event registry, per-module Flyway (first-class in 2.0)
- Spring Security 7.0.6 incl. Spring Authorization Server (merged into Security 7 — use the Security coordinate, not standalone SAS) — multi-IdP profile switch with Keycloak 26.6.x
- Flowable 8.0.0 embedded — only Boot-4 BPM option; gated on Q-006
- PostgreSQL 16 (only DB; Testcontainers 2.x everywhere, no H2) + Redis 8/Valkey 8 (1-line ADR on license)
- React 19.2 + Vite 8 + TypeScript 6.0 strict + Tailwind 4 + shadcn/ui (vendored) + TanStack Query 5 + Orval 8 (OpenAPI 3.1 → client + MSW + Zod, single generator for the drift gate)
- ArchUnit **≥1.4.2** (hard floor — earlier versions cannot read Java 26 class files; every architecture gate breaks otherwise)
- go-task v3.51.1 (`task up`/`task verify`) — only Make-class runner meeting the 3-OS-no-WSL constraint

**Agent-hallucination hotspots to pin in backend/CLAUDE.md:** Jackson 3 (`tools.jackson`, not `com.fasterxml`), Testcontainers 2.x idioms (tutorials are 1.x), Flyway via starter + PG module (not `flyway-core` alone), ESLint 10 flat-config only, no Lombok.

### Expected Features

PRD groups validate cleanly against the market — every Group A/B/D/E Must maps to a documented table stake or genuine differentiator; no over-build detected. Details: `.planning/research/FEATURES.md`.

**Must have (table stakes):**
- One-command local env, green-on-first-clone build, preconfigured CI, working auth, i18n, Docker/K8s artifacts, rename/init script (all covered by PRD)
- Full IAM suite: AuthN flows, session management, user CRUD + lifecycle, roles/permissions UI, audit log (covered)
- BPM task inbox + process admin when option ON (covered)
- Agent pack: CLAUDE.md, skills, hooks, allowlist, verify loop, tutorial (covered)
- **Three P1 gaps found:** (1) dev seed data (default admin + fixtures + sample process) — hidden dependency of first-run UX, E2E, and the onboarding pilot; (2) org-structure decision — FR-B10 grants `team/department` scopes but no FR defines team entities; recommend restricting v1 enforced scopes to `own/tenant/all` with team/department as schema-ready seam; (3) BPM task-assigned email notification — cheap (email module exists), largest BPM expectation gap

**Should have (competitive differentiators):**
- Two-layer hard plan-approval enforcement (hook deny + CI approver identity) — *this IS the product*; no competitor has it
- Architecture as CI-blocking gates (Modulith verify, ArchUnit, FE zones, contract drift, tenancy isolation, permission declaration)
- IAM beyond boilerplate: permission+scope model, catalog sync, matrix UI with diff-before-save, effective-permissions provenance
- Embedded BPM with unified identity/tenancy/transactions; a11y + token-lint blocking gates; harness quality as spec'd feature (error legibility, verify-fast <60s)

**Defer (v1.x/v2+):**
- Self-service profile page + email change (most likely fast-follow after first real team)
- Task delegation/comments/attachments, saved filters; MFA + invite are already Should-tier
- User impersonation and no-upgrade-path: make both **explicit documented decisions**, not silent omissions
- Anti-features confirmed: in-app ops screens, multi-agent-runtime support, admin meta-frameworks, JDL-style codegen, billing, social login, full BPMN modeler in v1

### Architecture Approach

Architecture is largely locked by PRD: a monorepo with a single Spring Boot 4 Modulith backend (12+1 packages-as-modules verified by `ApplicationModules.verify()`), a zoned React frontend (shared → features → app, one-direction imports), and the enforcement system itself (`.claude/` + `specs/` + CI gates) as a first-class deliverable. Communication rules: cross-module **writes via events** through the JDBC Event Publication Registry; **reads via `:: spi`** named interfaces down the DAG only; frontend consumes only the Orval-generated client. The audit event contract lives in `shared` so the `audit` sink depends on nothing above it. IdP is profile-switched (embedded SAS vs Keycloak) behind a single resource-server + authority seam. Details and verified Modulith 2.0 mechanics: `.planning/research/ARCHITECTURE.md`.

**Major components:**
1. Enforcement layer (`.claude/` hooks+skills, `specs/` S→P→I→V, CI L2 gates) — the product's core promise; built first, dogfooded throughout
2. Backend infra modules (`shared`, `appconfig`, `i18n`, `caching`, `observability`) — kernel + cross-cutting, bottom of DAG
3. `tenancy` + `security` — mid-DAG seams every feature consumes; TenantContext/Hibernate filter, JWT validation, `@RequirePermission` + catalog
4. `usermgmt` + sinks (`audit`, `email`) — the IAM feature surface, top of business DAG
5. `bpm` (optional, additive-only) — Flowable 8 embedded; BPM-off must stay the clean default acceptance path
6. Frontend (shared/features/app zones) + contract pipeline (OpenAPI 3.1 → Orval → generated client, drift-gated)

### Critical Pitfalls

Top 5 of 12 (full list with recovery strategies: `.planning/research/PITFALLS.md`):

1. **JDK 26 toolchain lag** — app code compiles but ASM/annotation-processor tooling breaks on class file 70 (Lombok confirmed broken; MapStruct/JaCoCo unverified). Avoid: week-1 toolchain spike on all 3 OS; no Lombok; pin ArchUnit ≥1.4.2, JaCoCo ≥0.8.15; written fallback-to-25 ADR; plan Sept 2026 26→27 bump.
2. **Hook deny is not reliable enforcement** — version-specific deny failures plus structural bypasses (Bash writes, MCP tools, IDE edits). Avoid: CI L2 is always the floor; L2 lands before L1 is relied on; hook scenario matrix per pinned Claude Code version on 3 OS; never claim enforcement on hooks alone.
3. **Flowable schema/tx collision** — vendored DDL goes stale per Flowable version; possible embedded-Liquibase tables; silent second transaction manager breaks atomicity and tenant propagation in async jobs. Avoid: Q-006 spike with explicit exit criteria (table-inventory assert, rollback test, async tenant propagation, upgrade runbook) before any Group C commitment.
4. **Event registry ≠ exactly-once** — republish-on-restart double-fires non-idempotent listeners; two-replica restarts duplicate; registry table grows unbounded; identical-event completion bug (#1056). Avoid: idempotent-listener convention (ArchUnit-checkable), completion mode DELETE/purge from day one, kill-listener test asserts no-loss AND no-double-effect, 2-replica restart test.
5. **Seam bypass / retrofit traps** — Hibernate tenant filter misses native SQL, scheduled jobs, async listeners, and all of Flowable (MyBatis); `shared` becomes a god-module while verify stays green; tenancy/permissions retrofitted after endpoints exist forces sweep-rewrites. Avoid: seams before features (build-order invariant), isolation test covers non-HTTP paths, ArchUnit rules on `shared` content and native-query wrappers.

Also notable: refresh-rotation concurrency race (grace window + single-flight client in the generated API layer), non-default IdP profile rot (dual-profile CI suite), Windows-no-WSL minefield (`.gitattributes` + cross-platform hook scripts in first commit), tutorial/CLAUDE.md rot (extend FR-D12 smoke gate to ONBOARDING.md and specs/000-example).

## Implications for Roadmap

Based on research, suggested phase structure (9 phases, P0–P8). This ordering is [Inference] — derived from the PRD dogfood rule, spike blockers, and Modulith DAG semantics; PRD constraints over-determine it.

### Phase 0: Spikes & ADRs
**Rationale:** Q-010 (hook stability), Q-002 (hosting-API approver identity), Q-004 (verify-fast feasibility) gate the very enforcement P1 must ship; PRD declares them phase-commitment blockers. Include the JDK 26 toolchain smoke (compile + JaCoCo + ArchUnit + MapStruct + Mockito + Buildpacks on 3 OS) and ADRs for permission sync (FR-B11), undeclared-permission detection (FR-B13), fallback-to-JDK-25, and Redis-vs-Valkey.
**Delivers:** Spike reports, pinned Claude Code version, fast/full gate-set definition, ADRs.
**Avoids:** Pitfalls 1, 7, 8 before they can block phases.

### Phase 1: Dogfood Bootstrap
**Rationale:** Non-negotiable invariant — hooks + specs + L2 plan-compliance check before any application code, or the S→P→I→V commit-history DoD is unfalsifiable. First commit must include `.gitattributes` and 3-OS CI matrix (Pitfall 11).
**Delivers:** Monorepo skeleton, 3-layer CLAUDE.md stubs, `.claude/settings.json` hooks (per Q-010), minimal `plan`/`verify` skills, `specs/` convention + start of 000-example, CI skeleton with plan-compliance (per Q-002), branch protection/CODEOWNERS, `task up` local stack, `scripts/init`.
**Addresses:** Group E table stakes (FR-E01..E05), FR-A02, FR-A12, FR-D12.
**Avoids:** Anti-pattern "features before enforcement"; Windows/no-WSL traps.

### Phase 2: Backend Foundation
**Rationale:** Gates wire when violations ≈ 0; the event registry must exist before the first cross-module event; building infra modules via the `new-module` skill is the first real dogfood.
**Delivers:** Boot 4 app shell (JDK 26), `shared` + infra modules (`appconfig`, `observability`, `i18n`, `caching`) via `new-module` skill, Modulith verify + ArchUnit gates live, JDBC registry + kill-listener test (both directions), per-module Flyway layout, Testcontainers, `verify --fast` to Q-004 budget.
**Uses:** Boot 4.0.7, Modulith 2.0.6, Testcontainers 2.x, ArchUnit 1.4.2.
**Avoids:** Pitfalls 3, 4, 5 (registry config, `shared` content rules, Scenario-test convention from the start).

### Phase 3: Tenancy + Security Core
**Rationale:** Seams before features — every feature endpoint built before tenancy/permission infrastructure is a latent isolation bug and a wholesale gate failure later.
**Delivers:** `tenancy` (TenantContext, Hibernate filter, isolation gate FR-D09 incl. async path), `security` (filter chain, JWT validation, multi-IdP profile switch, authority seam, permission model + `@RequirePermission` + catalog, permission-declaration gate FR-D11).
**Avoids:** Pitfalls 6, 10 (filter-bypass coverage; dual-IdP contract tests from the seam's birth).

### Phase 4: Contract Pipeline + Frontend Foundation
**Rationale:** Frontend gates (zones, tokens, i18n parity, axe) must wire before the first feature folder; the Orval pipeline must precede any feature UI or every screen is rework. Can partially parallel Phase 3.
**Delivers:** First endpoints + RFC 9457, OpenAPI 3.1 → Orval → generated client + drift gate (deterministic spec serialization!), React 19 + Vite 8 + TS strict shell, all FE gates, auth wiring incl. single-flight refresh queue, `new-feature` skill.
**Avoids:** Pitfall 9 (client side) and the Orval false-drift gate-fatigue gotcha.

### Phase 5: IAM Feature Slices (Group B)
**Rationale:** Largest functional block; each slice is one `specs/NNN` unit — where the ≤2-fix-rounds and methodology metrics get exercised on real work. `email` and `audit` modules land exactly when their first consumer flow needs them.
**Delivers:** AuthN core (login, rotation + reuse grace window, jti blacklist Redis-tested, sessions) → email + verification/reset → user CRUD + lifecycle → roles/permission admin + matrix UI + effective-permissions viewer → `audit` module + timeline → step-up → MFA + invite last. **Include dev seed data and the org-scope restriction decision here (P1 gaps).**
**Avoids:** Pitfalls 9, 10 (concurrent-refresh test, dual-profile suite at phase DoD).

### Phase 6: Ops Modules + Deploy Target
**Rationale:** `storage`/`jobs` are leaf modules with no dependents — safe late; K8s manifests after a stable app surface; secret/CVE gates need images to scan.
**Delivers:** `storage`, `jobs` (registry purge, token purge, two-replica tests), Kustomize + HPA/PDB/NetworkPolicy, Buildpacks BE + Nginx FE images, gitleaks/Trivy gates, EXTRACTION.md, Web Vitals.

### Phase 7: BPM bậc 1 (option ON, Q-006-gated)
**Rationale:** Top of DAG — needs security (JWT roles → candidate groups), tenancy, SPI consumers, event bridge. Q-006 spike runs immediately before this phase (not P0) so results don't go stale against Flowable patches. BPM-off remains the mandatory acceptance path; this phase is droppable without blocking DoD.
**Delivers:** Q-006 spike (DDL/Flyway inventory, shared-tx rollback test, IDM off, tenant mapping) then `bpm` module, inbox, process admin, deploy, role split, **task-assigned email notification (P1 gap)**, sample process in seed data.
**Avoids:** Pitfalls 2, 6 (BPM tenant path in isolation test; engine REST behind app filter chain).

### Phase 8: Hardening + Acceptance
**Rationale:** The onboarding pilot must run against the finished system; docs reconciled last so they can't rot mid-build.
**Delivers:** specs/000-example polish, ONBOARDING.md verified by fresh-clone Windows dry run, smoke gates extended to tutorial docs, 3-OS matrix green, guardrail-metrics audit (0 leaks, verify-fast <60s, fast-vs-full divergence <5%), security review, Giai đoạn 1 DoD.
**Avoids:** Pitfall 12.

### Phase Ordering Rationale

Five invariants the roadmap must preserve:
1. Hooks + specs + L2 check before any application code (P1 before P2) — dogfood rule.
2. A gate wires in the same phase as the first code it covers, never later (Modulith/ArchUnit @ P2, tenancy/permission @ P3, FE gates @ P4, secrets/CVE @ P6).
3. Security/tenancy infrastructure before any feature endpoint (P3 before P5) — avoids the retrofit rewrite.
4. Spikes sit immediately before the phase they unblock (Q-010/Q-002/Q-004 → P0; Q-006 → start of P7).
5. BPM last and droppable — option-gated; nothing below depends on it.

### Research Flags

Phases likely needing deeper research during planning (`/gsd-plan-phase --research-phase`):
- **Phase 0:** Q-002 hosting-API mechanics (approver identity across squash/rebase/bots) and Q-010 hook semantics are version- and org-specific; CI platform assumption (GitHub Actions) may be overridden by internal hosting.
- **Phase 3:** Permission catalog sync + undeclared-permission detection have pending ADRs; Keycloak-26 vs SAS claim-shape specifics are MEDIUM confidence.
- **Phase 7:** Flowable 8 internals (Liquibase usage, async executor tx/tenant behavior) are explicitly unverified — that's Q-006's job; plan the phase only after the spike.

Phases with standard patterns (skip research-phase):
- **Phase 2:** Spring Modulith 2.0 mechanics verified HIGH against official docs; patterns are first-class features.
- **Phase 4:** Vite/Orval/TanStack/ESLint-zones pipeline is well-documented; versions pinned and peer-verified.
- **Phase 6:** Leaf modules + Kustomize/Buildpacks are established patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Versions pinned from Maven Central/npm fetched 2026-06-11; JDK 26 chain verified via official docs + Adoptium API. MEDIUM residual: MapStruct/JaCoCo on JDK 26, TS 6.0 full-toolchain compat |
| Features | MEDIUM-HIGH | Scaffold/IAM/BPM expectations corroborated by official JHipster/Keycloak/Camunda docs; agent-enforcement landscape fast-moving, partly inference-based |
| Architecture | HIGH (mechanics) / MEDIUM (build order) | Modulith 2.0 mechanics verified via Context7 + official release notes; phase DAG is [Inference] from PRD constraints |
| Pitfalls | MEDIUM-HIGH | Registry, hook-deny, JDK-lag, JWT-rotation pitfalls verified against official docs/GitHub issues; Flowable-8 specifics and thresholds are [Inference] pending spikes |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **JDK 26 non-LTS cliff (Sept 2026):** user must re-confirm; record in PROJECT.md Key Decisions with 26→27 bump plan + fallback-to-25 ADR.
- **Org-structure for team/department scopes (FR-B10):** internal PRD inconsistency — resolve in requirements before Group B planning (recommend restriction to `own/tenant/all`).
- **Dev seed data + BPM task notifications:** P1 feature gaps to add to requirements.
- **Flowable 8 schema/tx/tenant behavior:** entirely Q-006-dependent; do not plan Phase 7 details before it runs.
- **CI platform / hosting API (Q-002):** GitHub Actions assumed; internal hosting may change plan-compliance gate design and scanner picks.
- **MapStruct + JaCoCo on JDK 26:** verify in first CI run; fallbacks documented in STACK.md.
- **Explicit-decision docs items:** no-upgrade-path policy and no-impersonation decision must be stated in preset docs, not silently omitted.

## Sources

### Primary (HIGH confidence)
- Spring Modulith docs via Context7 (`/spring-projects/spring-modulith`) + 2.0 GA announcement — verification, named interfaces, event registry, `@ApplicationModuleTest`
- Spring Boot system requirements + 4.0 release notes + spring-boot-dependencies 4.0.7 POM — Java 17–26 support, managed versions
- Adoptium API, OpenJDK JDK 26 page, ArchUnit/Byte Buddy releases, Paketo bellsoft-liberica — JDK 26 compatibility chain
- Flowable 8.0.0 release announcement + forum (7.2 incompatible with Boot 4); Keycloak 26.6.x releases; SAS merge-into-Security-7 announcement
- JHipster, GitHub Spec Kit, AWS Kiro, Camunda, Keycloak, create-t3-app official docs — feature benchmarks
- npm registry / Maven Central metadata fetched live 2026-06-11 — version pins
- Internal authoritative: `requirements/PRD.md`, `.planning/PROJECT.md`, `product/methodology/AI-COWORK.md`

### Secondary (MEDIUM confidence)
- Claude Code issues #37210, #33106, #39344, #4669, #37420 — hook deny failures
- Spring Modulith issues #1056, #796; Lombok #4019 (class file v70)
- SaaS boilerplates (MakerKit, ixartz, apptension) — cross-verified admin/IAM expectations
- Testcontainers speed patterns (rieckpil, Callista), JWT rotation race articles, Hibernate multi-tenancy filter-bypass series

### Tertiary (LOW confidence / needs validation)
- Market-lane uniqueness claim — [Inference] from surveyed feature sets
- Build-order DAG — [Inference] from PRD constraints + Modulith semantics
- Flowable 8 Liquibase/async-tx internals — unverified; Q-006 resolves
- eslint-plugin-react-hooks supersession of react-compiler plugin — [Inference] from npm release states

---
*Research completed: 2026-06-11*
*Ready for roadmap: yes*
