# Architecture Research

**Domain:** Spring Boot 4 Modulith (12+1 modules) + React 19 monorepo scaffold with two-layer AI-cowork enforcement
**Researched:** 2026-06-11
**Confidence:** HIGH for Spring Modulith 2.0 mechanics (official docs/release notes); MEDIUM for module DAG layering and build order ([Inference] — derived from PRD constraints + Modulith dependency semantics, not from an external reference implementation of this exact shape)

> Architecture here is largely **locked by PRD/product docs** (module list, events-for-writes/SPI-for-reads, zones, two-layer enforcement). This document validates structure against Spring Modulith 2.0 mechanics and derives a build order that satisfies the dogfood-from-day-1 rule.

## Standard Architecture

### System Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│ MONOREPO                                                               │
│                                                                        │
│  .claude/ (hooks, skills, settings)   specs/NNN-*/   docs/ (ADR,      │
│  CLAUDE.md ×3                          (S→P→I→V)      constitution)    │
│        │  L1 enforce (in-session)          │                           │
│        ▼                                   ▼                           │
│  ┌──────────────── CI (L2 floor) ─────────────────────────────────┐    │
│  │ modulith-verify · archunit · zones · tokens · a11y · i18n ·    │    │
│  │ contract-drift · secrets · tenancy · plan-compliance ·         │    │
│  │ permission-decl · claude-md                                    │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                        │
│  frontend/ (React 19 + Vite)        backend/ (Spring Boot 4 Modulith)  │
│  ┌──────────────────────────┐       ┌────────────────────────────────┐ │
│  │ app    (shell, routing)  │       │ usermgmt          bpm (option) │ │
│  │   ▲                      │       │    ▲  ▲             ▲  ▲       │ │
│  │ features (iam, bpm, …)   │ HTTP  │ audit email storage jobs       │ │
│  │   ▲                      │──────▶│    ▲    ▲     ▲      ▲         │ │
│  │ shared (ui, api client,  │OpenAPI│ security   tenancy             │ │
│  │  generated/, tokens)     │ Orval │    ▲          ▲                │ │
│  └──────────────────────────┘       │ appconfig i18n caching observ. │ │
│                                     │    ▲      ▲     ▲      ▲       │ │
│  infra/ (compose local,             │ shared (kernel, no deps)       │ │
│   K8s kustomize)                    └────────────────────────────────┘ │
│                                          │            │                │
│                                     PostgreSQL 16   Redis  (IdP:       │
│                                     (+ event_publication table)        │
│                                      SAS-profile / Keycloak-profile)   │
└────────────────────────────────────────────────────────────────────────┘
```

Arrows inside backend = "may depend on" (declared via `@ApplicationModule(allowedDependencies = ...)`, verified at build by `ApplicationModules.verify()` — acyclic, declared-only).

### Component Responsibilities

| Component | Responsibility | Implementation notes |
|-----------|----------------|----------------------|
| `shared` | Kernel: base types, DTO conventions, ProblemDetail helpers, common event contracts (incl. audit event contract — see Pattern 3), validation utils | Depends on nothing; everything may depend on it |
| `appconfig` | Typed configuration properties; config-source switch (env+ConfigMap default / Consul KV via `spring.config.import`) | Other modules read typed properties only — never raw env |
| `i18n` | Message resolution vi/en, locale negotiation, i18n for ProblemDetail | Backing for FR-D06 parity gate |
| `caching` | Cache abstraction, tenant-scoped cache keys, Caffeine (dev) / Redis (prod) | Used by security permission cache, jti blacklist |
| `observability` | Probes, structured JSON logs + MDC PII allowlist, OTel, Prometheus | Cross-cutting; consumed via Spring auto-config, not direct calls |
| `tenancy` | `TenantContext`, Hibernate filter, tenant resolution (default tenant v1) | Seam only; isolation test is gate FR-D09 |
| `security` | SecurityFilterChain, JWT validation (JWKS, alg pinning), multi-IdP profile switch (Spring Authorization Server / Keycloak 26), authority seam, `@RequirePermission`, permission catalog | One codebase, one filter chain; profile selects IdP |
| `audit` | Event sink: consumes audit events, persists actor/action/before-after, exposes audit query API | Pure consumer — nothing depends on `audit` |
| `email` | Templated mail (verification, reset, invite) via Mailpit/SMTP | Triggered by events, not direct calls |
| `storage` | File/object storage (MinIO/S3 seam) | Mostly independent leaf |
| `jobs` | Scheduled work wrapper (no bare `@Scheduled` — ArchUnit rule), registry cleanup, token purge | Two-replica no-double-run test lives here |
| `usermgmt` | User CRUD + lifecycle, roles, sessions/devices, MFA, invite — the IAM feature surface | Top of the DAG; reads `security :: spi`, `tenancy :: spi`; writes via events |
| `bpm` (option) | Flowable 8 embedded engine, tasks/inbox, process admin, deploy | Calls other modules via their SPI from service tasks; bridges process events to event registry |
| Frontend `shared` | shadcn/ui primitives, tokens, `src/generated/` Orval client, i18n setup | No imports from `features`/`app` (ESLint gate FR-D03) |
| Frontend `features/*` | Feature folders (iam-users, iam-roles, audit, sessions, bpm-inbox…) | May import `shared` only; no cross-feature imports |
| Frontend `app` | Shell, routing, providers, layout | Imports features + shared |
| `.claude/` + `specs/` + CI | The enforcement product itself: L1 hooks (T3 plan-gate, T4 deny), 5 skills, L2 required checks | This IS a deliverable, not tooling overhead |

## Verified Spring Modulith 2.0 Mechanics (shape the phase structure)

Confidence: HIGH — official repo docs via Context7 + spring.io release blog.

1. **Module = direct subpackage of the main application package**; boundaries declared in `package-info.java` via `@ApplicationModule(allowedDependencies = "order :: spi")`. Named interfaces (`@NamedInterface("spi")`, `@NamedInterface("events")`) expose specific subpackages; `::` syntax restricts dependency to that interface. `ApplicationModules.of(App.class).verify()` enforces acyclicity + declared-only deps — this is gate FR-D01 and it works from the **first** module onward.
2. **Spring Modulith 2.0 GA (Nov 2025) targets Spring Boot 4 / Framework 7** and ships a revamped Event Publication Registry, **application-module-specific Flyway migrations support**, startup-time module verification, and Jackson 3 event serialization. This means the PRD's "Flyway per-module" requirement is a first-class 2.0 feature, not custom glue.
3. **Event Publication Registry (JDBC)** persists publications transactionally; incomplete publications can be republished on restart; completion modes UPDATE (default, manual purge), DELETE, ARCHIVE. The kill-listener test (FR-A03) maps directly onto "incomplete publication → republish." The registry table must exist from the moment the first cross-module event ships — i.e., registry setup belongs to the backend foundation phase, not later.
4. **`@ApplicationModuleTest`** bootstraps a single module with modes STANDALONE / DIRECT_DEPENDENCIES / ALL_DEPENDENCIES; the **Scenario API** (`scenario.stimulate(...).andWaitForEventOfType(...)`) tests event-driven flows; `PublishedEvents` asserts emissions. Consequence for phasing: **modules built bottom-up in DAG order are each independently testable at completion** — a module phase can close with its own `@ApplicationModuleTest` suite without the modules above it existing yet.

## Recommended Project Structure

```
/                          # monorepo root
├── CLAUDE.md              # root layer ≤200 lines (CI size budget, FR-D12)
├── Taskfile.yml           # task up / task verify entry points
├── scripts/init.(sh|ps1)  # placeholder rename + commit (FR-A12)
├── .claude/
│   ├── settings.json      # hooks (T3 plan-gate, T4 deny), T1 allowlist
│   └── skills/            # new-module, new-feature, design-implement, plan, verify
├── specs/
│   └── 000-example/       # tutorial spec worked through S→P→I→V in git history
├── docs/                  # ARCHITECTURE.md (locked), adr/, methodology/AI-COWORK.md,
│                          # EXTRACTION.md, ONBOARDING.md
├── backend/
│   ├── CLAUDE.md          # ≤150 lines, lazy-loaded
│   └── src/main/java/com/acme/app/
│       ├── shared/ … usermgmt/ [bpm/]      # one package per module
│       │   ├── package-info.java           # @ApplicationModule(allowedDependencies=…)
│       │   ├── spi/        # @NamedInterface("spi") — sync reads by others
│       │   ├── events/     # @NamedInterface("events") — event types others listen to
│       │   └── internal…   # default-invisible implementation
│       └── …/resources/db/migration/<module>/   # Flyway per-module (Modulith 2.0)
├── frontend/
│   ├── CLAUDE.md
│   └── src/
│       ├── shared/        # ui/, api/ (generated/ — never hand-edited), i18n/, tokens
│       ├── features/<feature>/
│       └── app/
├── infra/
│   ├── local/             # compose for task up (PG16, Redis, Mailpit, MinIO, Keycloak, otel)
│   └── k8s/               # kustomize base/overlays, HPA, PDB, NetworkPolicy
└── .github/ (or hosting equivalent)   # gate workflows incl. plan-compliance (L2)
```

### Structure Rationale

- **One Maven module, packages as boundaries:** Spring Modulith verifies package-level boundaries; splitting into Maven modules early adds build friction without enforcement gain and complicates the future CLI templating. [Inference]
- **`spi/` + `events/` as the only public surface per module:** matches the locked rule "writes cross-module via events, reads via SPI" and makes the `new-module` skill output mechanical.
- **`specs/` + `.claude/` at root from commit ~1:** required by the dogfood rule (PRD §13.1) — see Build Order.

## Data Flow

### Request flow (per PRD §6.3.4 — locked)

```
Request + JWT
  → SecurityFilterChain (issuer/JWKS/audience, RS256|ES256 pinned)   [security]
  → Tenant resolve (default tenant v1)                               [tenancy]
  → @RequirePermission "<module>.<resource>:<action>" via cache      [security]
  → Service: data-scope check (own/team/department/tenant/all)       [feature module]
  → Repository + Hibernate tenant filter                             [feature module + tenancy]
  → audit event published after-commit (if sensitive)                [→ audit]
  ← RFC 9457 ProblemDetail (i18n + traceId) on any failure
```

### Cross-module write flow (events)

```
[usermgmt] commit business tx
   └─ publishes event → event_publication row (same tx, JDBC registry)
        → [audit] listener (async, after-commit)  → audit row
        → [email] listener                        → send verification mail
   crash before completion → republish on restart (kill-listener test FR-A03)
```

### Cross-module read flow (SPI)

```
[bpm] service task ──sync──▶ [usermgmt :: spi] / [security :: spi]
[usermgmt] ──▶ [tenancy :: spi] TenantContext
(direction always DOWN the DAG; upward needs = events)
```

### Contract flow (frontend never drifts)

```
backend controllers → OpenAPI 3.1 spec → Orval → frontend/src/shared/api/generated/
→ tsc must compile → CI contract-drift gate (FR-D07)
```

### Enforcement data flow (the meta-system)

```
Claude Code session: Write/Edit on T3 path
  → L1 PreToolUse hook: branch has specs/NNN-*/plan.md with Approved-by:?  deny/allow
PR: diff touches T3 paths
  → L2 CI: plan exists + approver valid via hosting API (CODEOWNERS, no self-approval)
  → branch protection + H3 review → merge
```

## Architectural Patterns

### Pattern 1: Bottom-up DAG construction with per-module test closure

**What:** Build modules strictly in dependency order (shared → infra → tenancy/security → sinks/leaves → usermgmt → bpm). Each module phase ends with `@ApplicationModuleTest` (STANDALONE or DIRECT_DEPENDENCIES) green + `ApplicationModules.verify()` green.
**When to use:** Always here — a module's tests can only bootstrap if its dependencies exist, so DAG order is also minimal-rework order.
**Trade-offs:** Infrastructure-first means no demo-able feature for the first phases; mitigated because the *scaffold itself* is the product.

```java
// usermgmt/package-info.java — the boundary IS the code
@org.springframework.modulith.ApplicationModule(
    allowedDependencies = {
        "shared", "security :: spi", "tenancy :: spi", "caching :: spi"
    })
package com.acme.app.usermgmt;
```

### Pattern 2: Enforcement-before-content (dogfood bootstrap)

**What:** The methodology artifacts (CLAUDE.md, hooks, `plan`/`verify` skills, specs/ convention, L2 plan-compliance check) are built in the **first** phase, before any Modulith code — then every subsequent phase is executed *through* them.
**When to use:** Mandated by PRD §13.1 ("S→P→I→V + hooks ngay từ Giai đoạn 1").
**Trade-offs:** Hooks/CI checks get built against an empty repo and must be revisited once real T3 paths exist (e.g., `security/**` doesn't exist yet in phase 1 — matchers are declared ahead of the code they guard). That's acceptable: path matchers are cheap to extend; retrofitting discipline onto an existing codebase is not. [Inference]

### Pattern 3: Audit-event contract in `shared` (sink without fan-in dependencies)

**What:** Define the audit event contract (e.g., `AuditableEvent` / `AuditEvent` record) in `shared`. Every module publishes it; `audit` listens. `audit` then depends only on `shared` — not on `<every module> :: events`.
**When to use:** For the audit sink (FR-B19 "qua event sink `audit`"). Module-specific domain events still live in each module's `events/` named interface for genuine consumers (email, bpm bridge).
**Trade-offs:** Audit payloads are stringly-typed (action, resource, before/after JSON) rather than rich domain types — fine for audit, wrong for domain integration. [Inference] — alternative (audit declares dependency on every module's `:: events`) inverts the DAG maintenance burden and forces an audit `allowedDependencies` edit on every new module.

### Pattern 4: Profile-switched IdP behind a single resource-server seam

**What:** App is always an OAuth2 resource server validating JWTs; profile selects issuer (embedded Spring Authorization Server vs external Keycloak 26 from `task up`). Authority seam maps claims→authorities now, permission-store later, without touching the filter chain (FR-B14/B15).
**When to use:** Locked decision.
**Trade-offs:** Two IdP profiles must both stay green in CI → the IdP switch needs an integration test per profile, which costs CI time (feeds Q-004 `verify --fast` scoping).

## Suggested Build Order

[Inference] — derived from: dogfood rule, spike blockers (Q-002/Q-004/Q-006/Q-010), Modulith DAG semantics above, and gates-cheapest-when-codebase-small. This is the section the roadmap should consume.

```
P0 Spikes ──▶ P1 Dogfood bootstrap ──▶ P2 Backend foundation ──▶ P3 Tenancy+Security core
                                                 │
                                                 ▼
   P4 Contract pipeline + Frontend foundation ──▶ P5 IAM feature slices (Group B)
                                                 │
                          P6 Ops modules + K8s ──┤
                                                 ▼
                  P7 BPM bậc 1 (Q-006 gated) ──▶ P8 Hardening / onboarding pilot / DoD
```

| # | Phase | Contents | Why this position |
|---|-------|----------|-------------------|
| 0 | **Spikes & ADRs** | **Q-010** (hook stability matrix, pinned Claude Code version), **Q-002** (hosting API for approver verification), **Q-004** (verify-fast feasibility w/ Testcontainers, define `--fast` gate set); ADRs for FR-B11 (permission sync) & FR-B13 (undeclared-permission detection) | All three are declared phase-commitment blockers (PRD §14). Q-010 and Q-002 gate the very enforcement that dogfooding needs in P1 — they cannot wait. Q-006 (Flowable) deliberately deferred to just before P7 |
| 1 | **Dogfood bootstrap** | Monorepo skeleton; root CLAUDE.md (+ backend/frontend stubs); `.claude/settings.json` hooks (T3 plan-gate deny, T4 deny) per Q-010 results; skills `plan` + `verify` (minimal); `specs/` convention + start `specs/000-example`; CI skeleton with plan-compliance check (L2) per Q-002; branch protection + CODEOWNERS; `task up` local stack; `scripts/init` | **Everything after this phase is built via S→P→I→V under live hooks** — the dogfood rule makes this the hard prerequisite. Local stack here because every later phase's tests need PG/Keycloak/Mailpit. CLAUDE.md size-budget + smoke gate (FR-D12) wires here trivially |
| 2 | **Backend foundation** | Spring Boot 4 app shell (JDK 26); `shared`; **Modulith verify + ArchUnit gates wired now**; Event Publication Registry JDBC + kill-listener test; Flyway per-module layout; Testcontainers; `appconfig`, `observability`, `i18n`, `caching`; `verify --fast` implemented to Q-004 budget; `new-module` skill written **and used** to scaffold the infra modules | Gates wire at first module when violations ≈ 0. Registry must precede the first cross-module event. Building 4 infra modules via the `new-module` skill is the first real dogfood of the skill |
| 3 | **Tenancy + Security core** | `tenancy` (TenantContext, Hibernate filter, **isolation gate FR-D09**); `security` (filter chain, JWT validation, **multi-IdP profile switch**, authority seam, permission model + `@RequirePermission` + catalog per ADR, **permission-declaration gate FR-D11**) | Tenancy + security sit mid-DAG: everything feature-bearing above them consumes their SPI. Retrofitting tenant filters/permission checks into existing endpoints is the classic rewrite trigger — they must precede all feature endpoints. IAM *infrastructure* lands here; IAM *features* land in P5 |
| 4 | **Contract pipeline + Frontend foundation** | First real endpoints (health/profile); RFC 9457; OpenAPI 3.1 → Orval → TS client; **contract-drift gate**; React 19 + Vite + TS strict; zones + **ESLint zone gate**, **token lint**, **i18n parity**, **axe** gates; app shell + auth wiring; `new-feature` skill | Frontend gates wire before the first feature folder exists. Contract pipeline must precede any feature UI or every screen is rework. Can partially parallel P3 (FE foundation needs no backend beyond one stub endpoint) |
| 5 | **IAM feature slices (Group B)** | In order: AuthN core (login, rotation, jti blacklist, sessions) → email module + verification/reset flows → user CRUD + lifecycle → roles/permission admin + matrix UI + effective-permissions viewer → `audit` module + timeline UI → step-up/sensitive ops → MFA + invite (Should-level, last) | Largest functional block; each slice = one `specs/NNN` unit → this is where the ≤2-fix-rounds and methodology metrics get exercised on real work. `email` and `audit` modules land exactly when their first consumer flow needs them |
| 6 | **Ops modules + deploy target** | `storage`, `jobs` (registry cleanup, token purge, two-replica test); K8s kustomize + HPA/PDB/NetworkPolicy; Buildpacks BE + Nginx FE images; **secret/CVE gates**; EXTRACTION.md; Web Vitals | Leaf modules with no upstream dependents — safe late. K8s after the app surface is stable enough to manifest. Secret/CVE gates need images to scan |
| 7 | **BPM bậc 1 (option ON)** | **Spike Q-006 first** (Flowable 8 DDL→Flyway, shared JPA tx manager, IDM off, tenant mapping) — then `bpm` module, tasks/inbox, process admin, deploy definitions, BPM role split | Top of DAG: needs security (JWT roles → candidate groups), tenancy (tenant-aware instances), SPI consumers, event bridge — i.e., needs P3+P5 done. Q-006 placed immediately before, not in P0: result is only consumed here, and early spiking risks staleness against Flowable patch releases. [Inference] |
| 8 | **Hardening + acceptance** | Finish `specs/000-example` polish + ONBOARDING.md against reality; onboarding pilot (Q-005 person); 3-OS CI matrix green; guardrail metrics audit (0 leaks, verify-fast <60s); security review checklist; DoD §12.2 | Pilot must run against the finished system; docs reconciled last so they can't rot mid-build |

**Build-order invariants the roadmap must preserve:**

1. **Hooks + specs + L2 check before any application code** (P1 before P2) — non-negotiable per dogfood rule; otherwise the "S→P→I→V evidence in commit history" DoD item is unfalsifiable.
2. **A gate wires in the same phase as the first code it covers**, never later (Modulith/ArchUnit @ P2, tenancy/permission @ P3, zones/tokens/a11y/i18n/contract @ P4, secrets/CVE @ P6).
3. **Security/tenancy infrastructure before any feature endpoint** (P3 before P5) — avoids the retrofit rewrite.
4. **Spikes sit immediately before the phase they unblock**: Q-010/Q-002/Q-004 → P0 (unblock P1/P2); Q-006 → start of P7.
5. **BPM last and droppable** — option-gated; nothing below it depends on it, so slipping P7 never blocks Giai đoạn 1 DoD (BPM-off is the mandatory acceptance path anyway).

## Scaling Considerations

| Scale | Architecture adjustments |
|-------|--------------------------|
| Preset/v1 (single tenant, internal teams) | One deployable, K8s DNS + ingress, no broker — as locked |
| Module needs independent scale | Follow EXTRACTION.md: measure SPI inbound → convert to events/read-model → `@Externalized` to broker → separate app + schema → ingress route. Do **not** pre-build remoting — early SPI remoting breaks Modulith verify (locked decision) |
| Multi-tenant operations | Seam already paid for (tenant_id, filter, cache keys); activation = tenant resolution from JWT claim + onboarding flows — Future trigger |

### Scaling priorities

1. **First bottleneck is CI time, not runtime:** 12 modules × Testcontainers × 2 IdP profiles × 3-OS matrix. Q-004's `--fast`/`--full` split and shared container reuse are the mitigation; treat verify-fast <60s as a budget enforced from P2 onward.
2. **Second: event registry table growth** — pick completion mode deliberately (DELETE or ARCHIVE + jobs-module purge) rather than default UPDATE with no cleanup.

## Anti-Patterns

### Anti-Pattern 1: Features before enforcement ("we'll add the hooks once there's code to protect")

**What people do:** Scaffold the app first, bolt methodology on later.
**Why it's wrong:** Violates the PRD dogfood rule directly; also the DoD requires genuine S→P→I→V commit history, which cannot be backfilled honestly.
**Do this instead:** P1 ships hooks/skills/specs/CI check first; declared T3 path matchers may precede the directories they guard.

### Anti-Pattern 2: All 12 module skeletons stamped out in one batch commit

**What people do:** Generate every `package-info.java` up front to "lock the DAG early."
**Why it's wrong:** Bypasses the `new-module` skill (so the skill never gets dogfooded), produces dead empty modules that gates can't meaningfully verify, and front-loads `allowedDependencies` guesses that will churn.
**Do this instead:** Create each module via the `new-module` skill in its DAG-ordered phase; the dynamic module-count assertion (FR-A01) bumps with each.

### Anti-Pattern 3: Cross-module sync writes through SPI

**What people do:** `usermgmt` calls `audit.record(...)` or `email.send(...)` directly because events feel indirect.
**Why it's wrong:** Couples the DAG upward, loses the registry's at-least-once guarantee (kill-listener test would catch lost work), and makes extraction impossible per EXTRACTION.md.
**Do this instead:** SPI = synchronous **reads** down the DAG only; all cross-module **writes/effects** are events through the JDBC registry.

### Anti-Pattern 4: Retrofitting tenancy/permission checks after endpoints exist

**What people do:** Ship CRUD first, add `@RequirePermission` + tenant filter "in the security phase."
**Why it's wrong:** Every endpoint built before the seam is a latent isolation bug; the FR-D09/FR-D11 gates then fail wholesale and force a sweep-rewrite.
**Do this instead:** P3 before P5; permission-declaration gate active from the first protected endpoint.

### Anti-Pattern 5: Per-Modulith-module CLAUDE.md files

**What people do:** Mirror the 12 modules with 12 instruction files.
**Why it's wrong:** Already rejected (locked decision): `package-info.java` is the machine-readable boundary; 12 prose files rot.
**Do this instead:** 3-layer CLAUDE.md; backend layer points to the `new-module` skill and the DAG summary.

## Integration Points

### External services

| Service | Integration pattern | Notes |
|---------|---------------------|-------|
| PostgreSQL 16 | Single DB; per-module Flyway folders (Modulith 2.0 native); `event_publication` registry table | No H2 anywhere — Testcontainers for tests |
| Keycloak 26 / Spring Authorization Server | Profile switch; app always plain OAuth2 resource server; JWKS rotation without restart | Both profiles in CI → feeds Q-004 budget |
| Redis | caching module backend (prod); jti blacklist | Caffeine in dev profile |
| Mailpit / SMTP | email module sink | Local via `task up` |
| MinIO / S3 | storage module seam | Leaf — late is fine |
| Flowable 8 | Embedded engine, shared JPA tx manager, DDL via Flyway (auto-update off), IDM off | All four points are exactly spike Q-006 |
| Git hosting API | L2 approver verification (PR review metadata, CODEOWNERS) | Mechanism = Q-002 outcome; must survive squash/rebase/bots |
| Claude Code | L1 hooks, plan mode, skills — version-pinned, scenario matrix in CI (Q-010) | L2 CI is the runtime-agnostic floor if hooks drift |

### Internal boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| any module → lower module | `lower :: spi` sync read | Declared in `allowedDependencies`; verify() enforces |
| any module → audit/email | Event via JDBC registry | Audit contract type lives in `shared` (Pattern 3) |
| bpm → business modules | Service task → SPI; process events → registry bridge | bpm obeys the same DAG as everything else |
| backend → frontend | OpenAPI 3.1 → Orval generated client only | `src/generated/` never hand-edited; drift gate |
| frontend shared → features → app | One-direction imports | ESLint `import/no-restricted-paths` |
| repo → agent | CLAUDE.md ×3 + skills (read) / hooks (deny) | Constitution files are themselves T3 paths |

## Sources

- Spring Modulith official docs (fundamentals/verification/events/testing) — via Context7 `/spring-projects/spring-modulith` — HIGH confidence: `@ApplicationModule(allowedDependencies)`, `@NamedInterface`/`:: spi` syntax, `ApplicationModules.verify()`, registry completion modes (UPDATE/DELETE/ARCHIVE), `@ApplicationModuleTest` bootstrap modes + Scenario/PublishedEvents API
- [Spring Modulith 2.0 GA announcement (spring.io, 2025-11-21)](https://spring.io/blog/2025/11/21/spring-modulith-2-0-ga-1-4-5-and-1-3-11-released/) — HIGH: Boot 4/Framework 7 baseline, revamped event publication registry, per-module Flyway migrations, startup verification
- [Spring Modulith project page](https://spring.io/projects/spring-modulith/) — HIGH: version lines (2.0.x current GA line; 2.1 in milestones as of 2026-03)
- Project-internal (authoritative for locked decisions): `requirements/PRD.md` (§6 FR groups, §6.3 flows, §13.1 dogfood, §14 spikes, §15 decision log), `product/methodology/AI-COWORK.md`, `product/cli/CLAUDE-CODE-RUNTIME.md`, `.planning/PROJECT.md`
- Build-order derivation: [Inference] from the above — no external reference scaffold of this exact shape was found or needed; PRD constraints over-determine the ordering

---
*Architecture research for: Spring Boot 4 Modulith + React 19 AI-cowork preset (cowork-cli Giai đoạn 1)*
*Researched: 2026-06-11*
