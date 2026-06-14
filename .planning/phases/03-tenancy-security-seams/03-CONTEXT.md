# Phase 3: Tenancy & Security Seams - Context

**Gathered:** 2026-06-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Every future feature endpoint is born tenant-isolated and permission-checked — no retrofit possible. This phase lands the **seams** (not features) on top of the Phase-2 Modulith skeleton:

- **Tenancy (FOUND-04):** `BaseEntity`/`tenant_id` + Hibernate `@Filter` + `TenantContext` + tenant-keyed cache; v1 resolves one default tenant from config; 2-tenant DB-level isolation test proves the seam.
- **Tenancy gate (GATE-09):** CI-blocking cross-tenant-read gate with 2 seeded tenants, covering HTTP + async/jobs paths (BPM path extends in Phase 7).
- **AuthN profile switch (AUTH-09):** one filter chain switches IdP by profile between embedded Spring Authorization Server and Keycloak 26; JWKS rotation without restart; RS256/ES256 pinned; both profiles exercised in CI.
- **AuthZ model (AUTHZ-01..06):** `<module>.<resource>:<action>` permissions as code constants; data scopes `own/tenant/all` (team/department schema-ready seam only); `@RequirePermission` enforcement; per-user/role permission cache with invalidation on role/permission change + user disable; permission catalog code↔DB sync; seed roles; authority loading behind a claim→store seam.
- **Permission-declaration gate (GATE-11):** protected API without a declared permission = CI fail.

**NOT in this phase:** API contract / ProblemDetail envelope (Phase 4), feature modules (Phase 5+), storage/jobs (Phase 6), BPM + its GATE-09 path (Phase 7), distributed/multi-node permission-cache invalidation (seam only).
</domain>

<decisions>
## Implementation Decisions

### Tenancy propagation (FOUND-04, GATE-09)
- **D-01 (propagation + fail policy):** `TenantContext` is a **ThreadLocal**. The HTTP filter sets it; a `TaskDecorator` copies it onto `@Async` executors; the Phase-2 `shared` scheduling wrapper and Spring Modulith event listeners capture-and-restore it across the publish/handle boundary. **Fail-closed:** a tenant-scoped read/write with no resolvable tenant **throws** — it must never silently fall back to the default tenant. The config default tenant is the **bootstrap seed only** (v1's single tenant), not a runtime fallback. Rationale: a missing-propagation bug must fail loud, not leak as "works on the default tenant" — that is the whole point of "no retrofit possible". GATE-09 must exercise HTTP **and** async/jobs paths.

### Seam module placement (FOUND-04, AUTHZ-*)
- **D-02 (module split):** The **tenant seam** (`BaseEntity`/`tenant_id`/`TenantContext`/Hibernate filter) lives in the Phase-2 **`shared`** module — exactly as Phase 2 deferred it ("Tenant seam in `shared` (BaseEntity/tenant_id) — Phase 3"). `shared` is already the universal dependency, and every entity extends `BaseEntity`, so this is the correct home. A **new `iam` module** owns the authorization primitives: `@RequirePermission`, `@PublicEndpoint`, the permission catalog + sync, seed roles, and the IdP/filter-chain config. The `iam` module is **generated via the `new-module` dogfood skill** (continuing Phase 2's skill-validation pattern).
- **D-05 (T3 path reconciliation — MANDATORY for planner):** ADR-0003 names `security/**` as the T3 / CODEOWNERS path for `@RequirePermission` and `@PublicEndpoint` ("security config"). Because the module chosen is **`iam`**, the planner MUST point the T3 path glob (`.cowork/tiers.json`) **and** CODEOWNERS at the `iam` module's path (e.g. `backend/src/main/java/com/acme/app/iam/**` and the matching package). This keeps ADR-0003's locked guarantee intact — do not leave a dangling `security/**` glob that matches nothing. If the team prefers the literal module name `security` over `iam`, that is an acceptable substitution as long as it is applied consistently (module dir, package, tiers.json, CODEOWNERS); `iam` is the captured default.

### IdP profile switch (AUTH-09)
- **D-03 (dev default + SAS scope):** The local / `task up` **default IdP is the embedded Spring Authorization Server** — no extra container, fastest onboarding, and it sidesteps the flagged port-8080 Keycloak/backend clash for default dev. Build the embedded SAS **minimal-but-usable**: seeded dev users + the 5 seed roles, enough for a real local login **and** to satisfy the CI both-profile coverage requirement. **Keycloak 26** is available via a compose profile and runs its own CI leg. Both profiles share one `SecurityFilterChain`.

### Authorization scope model (AUTHZ-02)
- **D-04 (`own` scope ownership contract):** Object-level ownership for the `own` scope is resolved via a **marker interface `OwnedResource`** exposing the owner principal id (e.g. `getOwnerId()`). The service-layer access checker reads it generically. An entity that does **not** implement `OwnedResource` **cannot be granted the `own` scope** — making that constraint compile-visible. Chosen over a column-name convention (runtime/string-based, weak to verify) and per-resource resolver beans (most flexible but most boilerplate for v1). Drives the AUTHZ-02 403-per-scope tests.

### Claude's Discretion
The following are left to research/planner with sensible defaults — locked decisions above constrain them, but the mechanism is the planner's to choose with research backing:
- **Tenant-keyed cache mechanism** (FOUND-04): key-prefix-by-tenant vs per-tenant cache regions on the Phase-2 Caffeine/caching abstraction.
- **Seed bootstrap mechanism** (AUTHZ-04): seed roles (Super Admin, Tenant Admin, User Manager, Auditor, Member) + default tenant + bootstrap super-admin — Flyway migration vs startup seeder. Note: the permission **catalog** sync is already locked to startup-sync by ADR-0002; only the *role/tenant/admin seed* mechanism is open.
- **Permission-cache invalidation propagation** (AUTHZ-05): v1 is in-process Caffeine + session revocation (jti blacklist, dev profile per backend/CLAUDE.md). Multi-node/distributed invalidation broadcast is a **seam only** in v1 — design the invalidation API so a distributed impl drops in later without touching call sites.
- **JWKS rotation + RS256/ES256 pinning mechanism** (AUTH-09): within the requirement (rotation without restart; algorithms pinned), the concrete jwk-source/refresh approach is planner's choice per Spring Security 7 docs.
- Maven/module wiring details for the `iam` module, within the `new-module` skill CONTRACT.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Locked mechanisms (ADRs — implement against, do NOT re-decide)
- `docs/adr/0002-permission-catalog-sync.md` — FR-B11/AUTHZ-03: code is source of truth; per-module Java constant catalog classes; startup sync component (insert/update/deprecate); deprecated-before-delete; boot **fails** if a deprecated code is still granted past its grace window.
- `docs/adr/0003-undeclared-permission-detection.md` — FR-B13/GATE-11: two-layer static-first gate — ArchUnit rule (`verify --fast`, every `@RequestMapping`-family handler carries `@RequirePermission` or `@PublicEndpoint`) + `RequestMappingHandlerMapping` context test (`verify --full`); `@PublicEndpoint` = single greppable opt-out; `security/**` (→ `iam`, see D-05) is T3.
- `docs/adr/0001-valkey-not-redis.md` — cache infra container choice (relevant to tenant-keyed cache + permission cache dev profile).

### Requirements & architecture rules
- `.planning/REQUIREMENTS.md` — FOUND-04, AUTH-09, AUTHZ-01..06, GATE-09, GATE-11 (+ cross-phase notes: GATE-09 BPM path extends Phase 7).
- `requirements/PRD.md` — FR-A04 (tenancy), FR-B09..B15 (authz/authn), FR-D09/D11 (gates) — Vietnamese, authoritative.
- `backend/CLAUDE.md` — module layout, communication rules (events for writes, `::spi` for reads), Flyway path convention, ArchUnit ban list, agent-hallucination warnings (Testcontainers 2.x, Jackson 3, JDK pin, JUnit 6), Caffeine permission-cache + jti-blacklist dev note, Argon2id encoder.

### Methodology, gates & dogfood contract
- `.claude/skills/new-module/SKILL.md` — the CONTRACT the `iam` module generation must satisfy (inputs/outputs locked).
- `.cowork/tiers.json` — T3 path list the hook + CI gate read; D-05 requires the security/authz glob point at the `iam` module path.
- `Taskfile.yml` + `scripts/checks/` — verify spine (`run-gate.mjs --mode fast|full`); GATE-09/GATE-11 plug in here. Gate-set changes are T3.
- `.planning/spikes/q004-verify-fast.md` — §7 growth rule: static gates (ArchUnit undeclared-permission) join `--fast`; container/context-boot checks (tenancy isolation IT, permission-mapping context test) join `--full`.

### Prior phase context (consistency)
- `.planning/phases/02-backend-foundation/02-CONTEXT.md` — `shared` scope (D-03: minimal, tenant seam deferred to Phase 3), scheduling wrapper, event registry policy (at-least-once + idempotent listeners — relevant to tenant-context propagation across listeners), typed-properties enforcement (default-tenant config is a typed property in `appconfig`).

### Tech pins
- `.planning/research/STACK.md` — Spring Security 7 / SAS coordinate, Keycloak 26.6.x, Hibernate `@Filter`, ArchUnit ≥ pinned version (JDK class-file level). JDK decision = 25 LTS per PROJECT.md Key Decisions (supersedes STACK.md's 26).
- `.planning/research/PITFALLS.md` — toolchain/agent pitfalls.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Phase-2 `shared` module** — new home for `BaseEntity`/`tenant_id`/`TenantContext`/Hibernate filter (D-02). Already the universal dependency.
- **Phase-2 `shared` scheduling wrapper** — the seam that must capture/restore `TenantContext` for `@Scheduled` jobs (D-01).
- **Phase-2 `caching` module (Caffeine + cache abstraction)** — backs both the tenant-keyed cache (FOUND-04) and the permission cache (AUTHZ-05).
- **Phase-2 `appconfig` typed-properties** — default-tenant id, permission-cache config, grace-window property all land as `@ConfigurationProperties` records here.
- **`new-module` skill** — generates the new `iam` module (dogfood #5).
- **Verify spine** (`Taskfile.yml`, `scripts/checks/run-gate.mjs`) — GATE-09/GATE-11 plug in per Q-004 §7 (`--fast` static, `--full` container/context).

### Established Patterns
- Modulith modules under `com.acme.app.<module>`; Flyway at `backend/src/main/resources/db/migration/<module>/` (folder only when real tables exist).
- Events for cross-module writes, `::spi` for reads (event listeners must propagate tenant — D-01).
- ArchUnit GATE-02 set already bans `@Value`/`Environment` outside `appconfig`, bare `@Scheduled`, native queries — new GATE-11 rule joins this suite.
- Gate output contract: `GATE <name> <millis>ms <PASS|FAIL>` + rule-plus-fix on failure.
- Specs convention `specs/NNN-slug/{spec,plan}.md` (continues numbering).

### Integration Points
- New `iam` module + tenant additions to `shared` → bump the `new-module` dynamic module-name-set assertion (Phase-2 D-06): expected set gains `iam`.
- One `SecurityFilterChain` switched by Spring profile (`sas` default / `keycloak`); claim→store authority seam (AUTHZ-06) sits behind it.
- CI: backend container-class gates (tenancy isolation IT, both-IdP-profile, permission-mapping context test) run on the ubuntu leg; Win/macOS legs compile + unit + static ArchUnit only (Phase-1 D-04 pattern).
- Port-8080 Keycloak/backend clash (STATE blocker) — embedded-SAS-default (D-03) avoids it for dev; the Keycloak compose profile/CI leg must still resolve port mapping.

</code_context>

<specifics>
## Specific Ideas

- **GATE-09 must prove BOTH paths:** the cross-tenant-read test must cover HTTP **and** async/jobs (the Phase-2 scheduling wrapper + a Modulith event listener), not just a controller — D-01's fail-closed propagation is what makes the async leg meaningful.
- **`@PublicEndpoint` is the only public surface** (ADR-0003): every unprotected handler is one greppable token under second review — no implicit public endpoints.
- **Dogfood evidence:** the `iam` module generation should leave a visible S→P→I→V trail (spec → approved plan → commits citing REQ-IDs) for Phase 8's metrics audit.

</specifics>

<deferred>
## Deferred Ideas

- **BPM path for GATE-09** — Phase 7 (Phase 3 covers HTTP + async/jobs only; gate is structured so the BPM leg adds later).
- **Distributed/multi-node permission-cache invalidation** — v1 is in-process Caffeine; design the invalidation API as a seam, implement distributed broadcast later.
- **`team`/`department` data scopes** — schema-ready seam only in v1 (decision 2026-06-11); only `own/tenant/all` enforced.
- **Permission `Removed` migrations** — ADR-0002's physical-removal step is an explicit human-approved migration after the grace window, not Phase-3 work beyond supporting the `Deprecated` state.

</deferred>

---

*Phase: 3-Tenancy & Security Seams*
*Context gathered: 2026-06-14*
