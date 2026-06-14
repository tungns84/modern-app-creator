# Phase 3: Tenancy & Security Seams - Research

**Researched:** 2026-06-14
**Domain:** Multi-tenant isolation seam (Hibernate filter + ThreadLocal propagation) + authorization primitives (`@RequirePermission`, permission catalog, profile-switched IdP) on Spring Boot 4 / Spring Security 7 / Hibernate 7.2 / Spring Modulith 2.0
**Confidence:** HIGH on mechanisms (Spring Security 7 + Hibernate filter patterns verified against official docs); MEDIUM on Phase-2 substrate (see Critical Pre-Flight Finding)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01 (propagation + fail policy):** `TenantContext` is a **ThreadLocal**. The HTTP filter sets it; a `TaskDecorator` copies it onto `@Async` executors; the Phase-2 `shared` scheduling wrapper and Spring Modulith event listeners capture-and-restore it across the publish/handle boundary. **Fail-closed:** a tenant-scoped read/write with no resolvable tenant **throws** — never silent fallback to default tenant. Config default tenant = **bootstrap seed only** (v1's single tenant), not a runtime fallback. GATE-09 must exercise HTTP **and** async/jobs paths.
- **D-02 (module split):** The **tenant seam** (`BaseEntity`/`tenant_id`/`TenantContext`/Hibernate filter) lives in the Phase-2 **`shared`** module. A **new `iam` module** owns authz primitives: `@RequirePermission`, `@PublicEndpoint`, permission catalog + sync, seed roles, IdP/filter-chain config. The `iam` module is **generated via the `new-module` dogfood skill**.
- **D-03 (dev default + SAS scope):** Local / `task up` default IdP = **embedded Spring Authorization Server** (seeded dev users + 5 seed roles, minimal-but-usable). **Keycloak 26** via compose profile + own CI leg. Both profiles share **one `SecurityFilterChain`**.
- **D-04 (`own` scope ownership):** Object-level ownership resolved via marker interface **`OwnedResource`** (`getOwnerId()`). An entity not implementing it **cannot be granted the `own` scope** (compile-visible).
- **D-05 (T3 path reconciliation — MANDATORY for planner):** The T3 path glob (`.cowork/tiers.json`) **and** CODEOWNERS MUST point at the `iam` module's path (`backend/src/main/java/com/acme/app/iam/**`), reconciling ADR-0003's `security/**` naming. Do not leave a dangling `security/**` glob matching nothing. If team prefers literal `security` over `iam`, apply consistently across module dir, package, tiers.json, CODEOWNERS.

### Claude's Discretion (mechanism choice researched below — see § Architecture Patterns)
- **Tenant-keyed cache mechanism** (FOUND-04): key-prefix-by-tenant vs per-tenant cache regions on Phase-2 Caffeine.
- **Seed bootstrap mechanism** (AUTHZ-04): roles + default tenant + bootstrap super-admin — Flyway vs startup seeder. (Catalog sync already locked to startup-sync by ADR-0002; only role/tenant/admin seed is open.)
- **Permission-cache invalidation propagation** (AUTHZ-05): v1 = in-process Caffeine + session revocation; design invalidation **API as a seam** so a distributed impl drops in later without touching call sites.
- **JWKS rotation + RS256/ES256 pinning** (AUTH-09): concrete jwk-source/refresh approach is planner's choice per Spring Security 7 docs.
- Maven/module wiring for `iam`, within the `new-module` skill CONTRACT.

### Deferred Ideas (OUT OF SCOPE)
- **BPM path for GATE-09** — Phase 7. Phase 3 covers HTTP + async/jobs only; structure the gate so the BPM leg adds later.
- **Distributed/multi-node permission-cache invalidation** — v1 in-process Caffeine; distributed broadcast later (seam only).
- **`team`/`department` data scopes** — schema-ready seam only; only `own/tenant/all` enforced.
- **Permission `Removed` migrations** — ADR-0002's physical-removal is a later human-approved migration; Phase 3 supports the `Deprecated` state only.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FOUND-04 | `tenant_id` on every business table + Hibernate filter + TenantContext + tenant-keyed cache; v1 single default tenant from config; 2-tenant DB isolation test | § Pattern 1 (Hibernate `@FilterDef`/`@Filter` + per-session enable), § Pattern 2 (ThreadLocal + TaskDecorator + listener capture-restore), § Pattern 7 (tenant-keyed cache) |
| AUTH-09 | One filter chain switches IdP by profile (embedded SAS ↔ Keycloak 26); JWKS rotation without restart; RS256/ES256 pinned | § Pattern 3 (one `SecurityFilterChain`, `NimbusJwtDecoder.withIssuerLocation` + auto JWKS refresh + `jwsAlgorithm` pinning + audience validator) |
| AUTHZ-01 | `<module>.<resource>:<action>` permissions as code constants; no hard-coded roles in business logic | § Pattern 4 (per-module catalog constant classes), ADR-0002 |
| AUTHZ-02 | Each grant carries data scope; v1 = `own/tenant/all`; service-layer object-level check; 403 per wrong scope | § Pattern 5 (scope enforcement + `OwnedResource` marker per D-04) |
| AUTHZ-03 | Permission catalog code↔DB sync; deprecated-before-delete; mechanism locked by ADR | § Pattern 6 (startup sync component per ADR-0002) |
| AUTHZ-04 | Roles = permission+scope sets; seeds: Super Admin, Tenant Admin, User Manager, Auditor, Member; system roles locked | § Pattern 8 (seed bootstrap — recommend startup seeder) |
| AUTHZ-05 | Constants + `@RequirePermission` + per-user/role cache with invalidation on role/permission change + user disable | § Pattern 4 (`@RequirePermission` via custom `AuthorizationManager`), § Pattern 7 (cache + invalidation seam) |
| AUTHZ-06 | Authority loading via open seam: claim-based (JWT) first, permission-store later — upgrade without touching SecurityFilterChain/`@PreAuthorize` | § Pattern 3 + § Pattern 9 (`AuthorityLoader` seam behind `JwtAuthenticationConverter`) |
| GATE-09 | Tenancy isolation gate — cross-tenant read blocked with 2 seeded tenants, HTTP + async/jobs paths, CI-blocking | § Pattern 10 (`--full` Testcontainers IT on PG16) |
| GATE-11 | Permission-declaration gate — protected API without declared permission = CI fail; mechanism locked by ADR | § Pattern 11 (ArchUnit `--fast` rule + `RequestMappingHandlerMapping` `--full` context test, per ADR-0003) |
</phase_requirements>

## Summary

Phase 3 lands two orthogonal seams on the Phase-2 Modulith skeleton: **tenancy** (in `shared`) and **authorization** (in a new `iam` module). Neither is a feature; both are the substrate that makes every later endpoint born tenant-isolated and permission-checked. The technical core is well-trodden and the mechanisms are confirmed against official docs:

- **Tenancy** = Hibernate `@FilterDef`/`@Filter` discriminator on `tenant_id`, enabled per `Session` from a `ThreadLocal` `TenantContext`, with propagation wired into the three async boundaries (Spring `TaskDecorator` for `@Async`, the Phase-2 scheduling wrapper for `@Scheduled`, and a Modulith listener capture-restore for events). The fail-closed rule (D-01) is the load-bearing design choice: the `TenantContext` accessor **throws** when no tenant is resolvable, so a missing-propagation bug fails loud instead of leaking on the default tenant.
- **Authorization** = `@RequirePermission` enforced by a custom Spring Security 7 `AuthorizationManager` (registered via `AuthorizationManagerBeforeMethodInterceptor`), reading permissions from a per-user/role Caffeine cache populated through an `AuthorityLoader` seam (claim-based first, store-based later — AUTHZ-06). Permissions are code-declared constants per ADR-0002; a startup sync reconciles them into a DB catalog with deprecated-before-delete. The IdP profile switch (AUTH-09) is **one** resource-server `SecurityFilterChain` with a profile-selected `JwtDecoder` (`NimbusJwtDecoder.withIssuerLocation(...)` auto-refreshes JWKS without restart) and pinned `jwsAlgorithm(RS256/ES256)`.

The two CI gates compose cleanly with the Q-004 fast/full split: GATE-11's ArchUnit rule joins `--fast` (static bytecode), its context-boot backstop and GATE-09's isolation IT join `--full` (Testcontainers PG16).

**Primary recommendation:** Build the tenancy seam first (it has no dependency on authz), wiring the fail-closed `TenantContext` and all three propagation paths *before* writing GATE-09 — then GATE-09 proves the seam. Generate `iam` via `new-module` (`--exposes-spi --exposes-events --has-tables`), enforce `@RequirePermission` with a custom `AuthorizationManager` (not scattered SpEL), and keep the `AuthorityLoader` + cache-invalidation as named interfaces so v1's in-process Caffeine impl is swappable. Use the **`JwtIssuerAuthenticationManagerResolver` is NOT needed** — a single profile-selected `JwtDecoder` is simpler since only one IdP is active per profile (see Pattern 3 rationale).

---

## ⚠️ Critical Pre-Flight Finding (READ FIRST — affects every plan)

**The Phase-2 substrate that Phase 3 builds on is NOT materialized in the current working tree.**

Verified by direct inspection (2026-06-14):
- `git ls-files backend/` returns only `backend/CLAUDE.md` and `backend/src/test/java/com/acme/app/ModulithVerifyTest.java`.
- On-disk (untracked) `backend/src/main/java` contains **only** a partial `appconfig` module (`package-info.java`, `spi/CacheProperties.java`, `EventRetryProperties.java`, `EventRetentionProperties.java`, `I18nProperties.java`, `ModuleFlywayLocationsCustomizer.java`). **No `pom.xml`, no `Application.java`, no `shared` module, no `caching` module, no scheduling wrapper, no Flyway migrations exist on disk.**
- `ModulithVerifyTest.BASE_MODULES = Set.of("shared")` — but no `shared` package exists.
- STATE.md says "Phase 02 CLOSED, PR #6 merged" and "gate baseline 11/11 PASS" — yet the merged backend artifacts are not in this tree. Two active git worktrees exist under `.claude/worktrees/` (one holds a JDK25 spike harness only).

**Implication for the planner — confirm before Task 1:** Phase 3's locked decisions reference Phase-2 deliverables as if present:
- D-01 references "the Phase-2 `shared` scheduling wrapper" — **not on disk.**
- D-02 puts the tenant seam "in the Phase-2 `shared` module" — **`shared` not on disk.**
- The `caching` module backing the tenant-keyed + permission cache (CONTEXT § Reusable Assets) — **not on disk.**
- `appconfig.spi.CacheProperties` exists (prefix `acme.cache`, `ttl`/`maxSize`) but a `caching` module that consumes it does not.

**[ASSUMED A1]** Phase-2 code exists in git history (PR #6 merge commit `d7714326` / `d93f310`) and the planner will work against that merged state, not this working tree. **The planner MUST verify the actual merged Phase-2 module set, the scheduling-wrapper API signature, and the caching abstraction surface before planning tenant-context propagation and tenant-keyed caching** — research could not read code that isn't checked out. If Phase-2 artifacts are genuinely absent (not just unchecked-out), Phase 3 has an unstated dependency to resolve first. This is the single highest planning risk and is logged as a checkpoint in Open Questions.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Tenant resolution from request | API / Backend (HTTP filter) | — | Tenant identity is a server-side trust decision; never client-asserted in v1 (config default). |
| Tenant isolation enforcement | Database / Persistence (Hibernate `@Filter` on `Session`) | API (filter sets context) | Isolation must live at the query layer so it can't be forgotten per-endpoint; the seam's whole point is "no retrofit". |
| Tenant context propagation | Backend runtime (ThreadLocal + TaskDecorator + listeners) | — | Cross-thread state is a JVM-runtime concern; lives in `shared`. |
| JWT validation / IdP trust | API / Backend (resource-server filter chain) | — | AuthN is a backend boundary; one filter chain regardless of IdP. |
| Permission enforcement | API / Backend (method-security `AuthorizationManager`) | — | `@RequirePermission` on handlers + services; enforced server-side only (UI checks are advisory). |
| Permission catalog source of truth | Backend (Java constants) → Database (synced table) | — | Code is source of truth (ADR-0002); DB is a derived, admin-browsable projection. |
| Object-level scope (`own`) check | Backend (service layer via `OwnedResource`) | Database (tenant filter handles `tenant` scope) | `own` is object-identity; `tenant` is already enforced by the filter; `all` bypasses scope narrowing. |
| Permission cache | Backend (in-process Caffeine, `caching` module) | (future: distributed) | v1 single-node; invalidation behind a seam for later distribution. |

---

## Standard Stack

All versions are **Boot-managed** (Spring Boot 4.0.7 BOM) unless noted — do not override. JDK is **25 LTS** (class file 69), NOT 26 (PROJECT.md Key Decisions supersedes STACK.md). `[VERIFIED: PROJECT.md / backend/CLAUDE.md]`

### Core (already on classpath via Phase-2 Boot parent — no new install for most)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Spring Security | 7.0.6 (Boot-managed) | Resource-server JWT validation, method security | `[VERIFIED: CLAUDE.md + Context7 SecSec 7.0]` AuthN/AuthZ primitives. |
| `spring-boot-starter-oauth2-resource-server` | Boot-managed | JWT decode + filter chain | `[CITED: docs.spring.io/spring-security/reference/7.0/.../jwt.html]` resource-server pattern. |
| Hibernate ORM | 7.2.x (Boot-managed) | `@FilterDef`/`@Filter` tenant discriminator | `[VERIFIED: Context7 hibernate-orm]` filter feature confirmed in Hibernate 7 docs. |
| Spring Modulith | 2.0.6 | Event listener boundary (tenant capture-restore) | `[VERIFIED: CLAUDE.md]` baseline = Boot 4 / Framework 7. |
| Caffeine | 3.2.4 (Boot-managed) | Permission cache + tenant-keyed cache (dev) | `[VERIFIED: CLAUDE.md]` Phase-2 caching substrate. |
| Flyway | 11.14.1 (Boot-managed) | Per-module catalog/role/grant tables | `[VERIFIED: CLAUDE.md]` Boot 4: use `spring-boot-starter-flyway` + `flyway-database-postgresql`, never `flyway-core` alone. |
| ArchUnit | **≥1.4.2 (explicitly pinned)** | GATE-11 static rule; existing GATE-02 suite | `[VERIFIED: CLAUDE.md + jdk25-harness spike]` 1.4.2 reads class file 69; older fails import. NOT Boot-managed — pin in pom. |
| Testcontainers | 2.0.5 (Boot-managed, `testcontainers-bom`) | GATE-09 + sync IT on real PG16 | `[VERIFIED: CLAUDE.md]` **2.x API — 1.x idioms WILL be wrong.** Use `@ServiceConnection`. |

### New IdP coordinate (embedded SAS profile only — D-03)
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `org.springframework.security:spring-security-oauth2-authorization-server` | 7.0.6 (Boot-managed) | Embedded Spring Authorization Server (dev default IdP) | `[VERIFIED: CLAUDE.md + STACK.md]` SAS **merged into Spring Security 7** — use this coordinate, version Boot-managed. **NOT** the old standalone `org.springframework.security.experimental` / `spring-authorization-server` project (anti-stack). |

### Supporting (already locked by Phase 2 / ADRs)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Bouncy Castle (`bcprov`) | Boot-managed (`spring-security-crypto` companion) | Argon2id `Argon2PasswordEncoder` | Only if Phase 3 seeds password-bearing dev users for SAS (D-03 "real local login"). AUTH password flows are Phase 5 — Phase 3 may need a minimal encoder for seeded SAS users. |
| Keycloak (image) | `quay.io/keycloak/keycloak:26.6.3` | Keycloak profile IdP + CI leg | `[VERIFIED: CLAUDE.md]` compose profile only; default dev uses embedded SAS. |
| Valkey (image) | `valkey/valkey:8` | Cache container (prod-path; v1 cache is in-process Caffeine) | `[CITED: ADR-0001]` BSD-3 drop-in; Lettuce talks unchanged. v1 permission cache is Caffeine — Valkey is the future distributed seam target. |

**Installation (backend/pom.xml additions — confirm against the actual Phase-2 pom):**
```xml
<!-- resource server (AuthN) -->
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-oauth2-resource-server</artifactId>
</dependency>
<!-- embedded IdP (dev default profile only) -->
<dependency>
  <groupId>org.springframework.security</groupId>
  <artifactId>spring-security-oauth2-authorization-server</artifactId>
  <!-- version Boot-managed; do NOT pin -->
</dependency>
```
The `iam` module's Flyway tables (catalog, role, permission, role_grant) register via the existing `ModuleFlywayLocationsCustomizer` (the `new-module --has-tables` side effect appends `classpath:db/migration/iam`).

**Version verification:** All Boot-managed versions resolve from the Spring Boot 4.0.7 BOM — verify with `./mvnw dependency:tree` against the actual Phase-2 pom in the first task. ArchUnit ≥1.4.2 must be explicitly pinned (already proven in the jdk25-harness spike). No new third-party (non-Spring/non-Boot) packages are introduced by Phase 3 → Package Legitimacy Audit is minimal (see below).

## Package Legitimacy Audit

Phase 3 introduces **no new third-party packages from public registries** beyond Spring-managed coordinates already in the Boot 4.0.7 BOM (resource-server starter) plus the SAS coordinate (a first-party Spring Security artifact). All are Maven Central, first-party Spring, Boot-managed.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `org.springframework.boot:spring-boot-starter-oauth2-resource-server` | Maven Central | mature | very high | github.com/spring-projects/spring-boot | OK | Approved (Boot-managed) |
| `org.springframework.security:spring-security-oauth2-authorization-server` | Maven Central | mature (merged into Spring Security 7) | high | github.com/spring-projects/spring-security | OK | Approved (Boot-managed) |
| `org.bouncycastle:bcprov-jdk18on` (only if SAS seeded users need Argon2id) | Maven Central | mature | very high | github.com/bcgit/bc-java | OK | Approved (Boot-managed via spring-security-crypto) |

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** none.

> No `gsd-tools query package-legitimacy check` was run because no novel/non-first-party package is introduced. If the planner adds any non-Spring dependency (none anticipated), run the legitimacy gate before approving the install task.

## Architecture Patterns

### System Architecture Diagram

```
                          HTTP request + Bearer JWT
                                    │
                                    ▼
        ┌───────────────────────────────────────────────────────┐
        │   ONE SecurityFilterChain (profile-agnostic shape)      │
        │   1. oauth2ResourceServer.jwt(JwtDecoder)               │
        │      JwtDecoder = profile bean:                         │
        │        - profile=sas   → withIssuerLocation(local-SAS)  │
        │        - profile=keycloak → withIssuerLocation(KC-26)   │
        │      .jwsAlgorithm(RS256).jwsAlgorithm(ES256)  ← pinned  │
        │      + AudienceValidator (OAuth2TokenValidator)         │
        │      (JWKS auto-refreshed by NimbusJwtDecoder — no       │
        │       restart needed)                                    │
        │   2. JwtAuthenticationConverter                         │
        │        → AuthorityLoader seam (AUTHZ-06)                 │
        │            claim-based now / store-based later          │
        └───────────────────────────────────────────────────────┘
                                    │ Authentication(authorities)
                                    ▼
        ┌──────────────────────────┐     sets ThreadLocal
        │  TenantResolutionFilter   │────────────────────────────┐
        │  (HTTP): resolve tenant   │                            │
        │  → TenantContext.set(id)  │                            ▼
        │  fail-closed: throw if     │            ┌──────────────────────────┐
        │  unresolvable (D-01)      │            │ TenantContext (ThreadLocal)│
        └──────────────────────────┘            └──────────────────────────┘
                                    │                  ▲        ▲        ▲
                                    ▼                  │        │        │
        ┌───────────────────────────────────┐    @Async │  @Sched │  Modulith
        │  Controller handler                │    Task   │  wrapper│  listener
        │  @RequirePermission(               │    Decorator       capture/restore
        │    "iam.users:update", scope=TENANT)│   (copies ThreadLocal across threads)
        │  ── enforced by custom              │
        │     AuthorizationManager ───────────┼──► PermissionCache (Caffeine)
        │     (reads authorities + scope)     │       ▲ invalidation seam
        │     wrong perm/scope → 403          │       │ (role/perm change, user disable)
        └───────────────────────────────────┘
                                    │ (own scope) service reads OwnedResource.getOwnerId()
                                    ▼
        ┌───────────────────────────────────┐
        │  Repository → Hibernate Session     │
        │  filter "tenantFilter" ENABLED with │
        │  param = TenantContext.require()    │  ← every business query auto-scoped
        │  (@FilterDef on shared package)     │
        └───────────────────────────────────┘
                                    │
                                    ▼
                          PostgreSQL 16 (tenant_id column on every business table)

  ── Permission catalog (startup, before serving traffic) ──
  Java constant catalog classes (per module) ──► StartupSyncRunner
     insert new / update metadata / mark Deprecated missing ──► iam.permission table
     BOOT FAILS if Deprecated code still granted past grace window (ADR-0002)
```

A reader traces the primary use case (authenticated tenant-scoped, permission-checked read) from JWT in → filter chain validates & loads authorities → tenant filter set → `@RequirePermission` enforced → tenant-filtered query → row-scoped result out.

### Recommended Project Structure
```
backend/src/main/java/com/acme/app/
├── shared/                         # Phase-2 module — EXTEND (D-02)
│   ├── tenant/
│   │   ├── package-info.java       # @FilterDef "tenantFilter" lives here (package-level)
│   │   ├── BaseEntity.java         # @MappedSuperclass: id + tenant_id + @Filter
│   │   ├── TenantContext.java      # ThreadLocal; require() THROWS when empty (D-01)
│   │   ├── OwnedResource.java      # marker interface getOwnerId() (D-04)
│   │   ├── TenantResolutionFilter  # HTTP: resolve → set context
│   │   ├── TenantFilterAspect      # enable Hibernate filter per session/tx
│   │   └── TenantTaskDecorator     # copy ThreadLocal onto @Async
│   └── scheduling/                 # Phase-2 wrapper — EXTEND to capture/restore tenant
│
└── iam/                            # NEW module (new-module skill, dogfood #5)
    ├── package-info.java           # @ApplicationModule(allowedDependencies={"shared","caching","appconfig"})
    ├── spi/package-info.java       # @NamedInterface("spi") — authority/permission reads
    ├── events/                     # role/permission-changed, user-disabled events
    ├── annotation/
    │   ├── RequirePermission.java  # @RequirePermission(value, scope)
    │   └── PublicEndpoint.java     # the ONLY public opt-out (ADR-0003)
    ├── catalog/
    │   ├── IamPermissions.java     # per-module constant catalog class (ADR-0002)
    │   └── PermissionCatalogSync   # startup sync runner (ADR-0002)
    ├── authz/
    │   ├── RequirePermissionAuthorizationManager  # custom AuthorizationManager
    │   ├── AuthorityLoader.java    # SEAM (AUTHZ-06): claim-based impl now
    │   ├── ClaimBasedAuthorityLoader
    │   ├── PermissionCache.java    # wraps caching module
    │   └── PermissionCacheInvalidator  # SEAM (AUTHZ-05): in-process now
    ├── config/
    │   ├── SecurityFilterChainConfig   # ONE chain (T3 path)
    │   ├── SasIdpConfig             # @Profile("sas") JwtDecoder + AS config
    │   └── KeycloakIdpConfig        # @Profile("keycloak") JwtDecoder
    └── seed/
        └── IamSeedRunner           # default tenant + 5 roles + bootstrap admin
backend/src/main/resources/db/migration/iam/   # V*__catalog_role_grant.sql
backend/src/test/java/com/acme/app/
├── ArchitectureGatesTest (extend)  # + GATE-11 ArchUnit rule (--fast)
├── iam/                            # @ApplicationModuleTest + context tests
└── tenancy/                        # GATE-09 isolation IT (--full, Testcontainers)
```

### Pattern 1: Hibernate tenant filter (discriminator on `tenant_id`)
**What:** A package-level `@FilterDef` declares a `tenantFilter` with a `tenantId` parameter; `BaseEntity` (`@MappedSuperclass`) carries the `tenant_id` column and `@Filter`. The filter is **enabled per Session** with the parameter from `TenantContext`.
**When to use:** Every business entity (extends `BaseEntity`). This is the FOUND-04 seam.
**Example:**
```java
// Source: Context7 /hibernate/hibernate-orm — Advanced.adoc filters
// shared/tenant/package-info.java
@FilterDef(name = "tenantFilter",
           parameters = @ParamDef(name = "tenantId", type = String.class),
           defaultCondition = "tenant_id = :tenantId")
package com.acme.app.shared.tenant;
import org.hibernate.annotations.FilterDef;
import org.hibernate.annotations.ParamDef;

// BaseEntity.java
@MappedSuperclass
@Filter(name = "tenantFilter")   // condition inherited from @FilterDef defaultCondition
public abstract class BaseEntity {
    @Id @GeneratedValue private Long id;
    @Column(name = "tenant_id", nullable = false, updatable = false)
    private String tenantId;
    // ... set tenantId from TenantContext.require() in @PrePersist
}
```
Enable per session (filters are **session-scoped** and OFF by default — must be enabled on every session):
```java
// Source: Context7 /hibernate/hibernate-orm — Interacting.adoc (unwrap Session)
Session session = entityManager.unwrap(Session.class);
session.enableFilter("tenantFilter")
       .setParameter("tenantId", TenantContext.require());  // require() throws if absent
```
**Recommendation:** Enable the filter via a single Spring component bound to the persistence-context lifecycle (e.g. an aspect/`OpenSessionInterceptor`-equivalent or a `@PostLoad`-independent session-opened hook) so no repository method can forget it. **[ASSUMED A2]** The exact enable hook (interceptor vs aspect vs `EntityManagerFactory` customizer) depends on the Phase-2 persistence wiring — planner verifies against the actual session-management style. Do NOT enable it in each repository method (forgettable — defeats "no retrofit").

### Pattern 2: ThreadLocal `TenantContext` + propagation across async boundaries
**What:** `TenantContext` is a `ThreadLocal<String>`. Three propagation seams copy it across thread hops. The accessor is **fail-closed**.
**When to use:** Always. This is D-01.
**Example:**
```java
public final class TenantContext {
    private static final ThreadLocal<String> CURRENT = new ThreadLocal<>();
    public static void set(String tenantId) { CURRENT.set(tenantId); }
    public static void clear() { CURRENT.remove(); }                 // filter MUST clear in finally
    public static String require() {                                  // D-01 fail-closed
        String t = CURRENT.get();
        if (t == null) throw new NoTenantContextException(
            "No tenant resolved for this thread — propagation bug or unscoped access");
        return t;
    }
}
```
- **`@Async`** → register a `TaskDecorator` that captures `CURRENT.get()` in the submitting thread and restores it (then clears) in the worker:
```java
// Source: Spring Framework TaskDecorator pattern (Boot AsyncConfigurer)
public class TenantTaskDecorator implements TaskDecorator {
    public Runnable decorate(Runnable runnable) {
        String tenant = TenantContext.currentOrNull();   // may be null at submit
        return () -> {
            if (tenant != null) TenantContext.set(tenant);
            try { runnable.run(); } finally { TenantContext.clear(); }
        };
    }
}
```
- **`@Scheduled`** → the **Phase-2 scheduling wrapper** (not bare `@Scheduled` — GATE-02 bans it) must capture/restore. Scheduled jobs have no inbound tenant → they iterate tenants explicitly or run as the bootstrap tenant **only where intentional**; an unscoped tenant-bound query inside a job throws (fail-closed). **[ASSUMED A3]** the wrapper's hook point — verify the Phase-2 wrapper API.
- **Modulith event listeners** → the publish thread differs from the handle thread (esp. `@Async`/registry-replay listeners). Capture tenant into the event envelope or an `ApplicationListener` decorator that restores `TenantContext` before invoking the listener and clears after. This is the GATE-09 async leg.
**Anti-pattern:** Reading `TenantContext` with a silent-default getter anywhere. The only place a default tenant appears is the **bootstrap seed** (Pattern 8), never a runtime read.

### Pattern 3: ONE `SecurityFilterChain`, profile-switched `JwtDecoder` (AUTH-09)
**What:** A single resource-server `SecurityFilterChain`. The IdP difference is isolated to **one bean**: the `JwtDecoder`, selected by Spring profile. JWKS rotation is automatic; algorithms are pinned; audience is validated.
**When to use:** AUTH-09 / AUTHZ-06. This is the locked D-03 shape.
**Example:**
```java
// Source: Context7 /websites/spring_io_spring-security_reference_7_0
@Configuration @EnableWebSecurity
class SecurityFilterChainConfig {
  @Bean SecurityFilterChain chain(HttpSecurity http, JwtAuthenticationConverter conv) throws Exception {
    http.authorizeHttpRequests(a -> a.anyRequest().authenticated())
        .oauth2ResourceServer(o -> o.jwt(j -> j.jwtAuthenticationConverter(conv)));
    return http.build();
  }
}

@Configuration @Profile("sas")
class SasIdpConfig {
  @Bean JwtDecoder jwtDecoder(@Value("${app.idp.issuer}") String issuer) {
    NimbusJwtDecoder d = NimbusJwtDecoder.withIssuerLocation(issuer)  // auto JWKS refresh, no restart
        .jwsAlgorithm(SignatureAlgorithm.from("RS256"))
        .jwsAlgorithm(SignatureAlgorithm.from("ES256")).build();      // pinned (AUTH-09)
    d.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
        JwtValidators.createDefaultWithIssuer(issuer),
        new AudienceValidator("cowork-api")));                        // audience pinned
    return d;
  }
  // + Spring Authorization Server beans (RegisteredClient, AuthorizationServerSettings)
}

@Configuration @Profile("keycloak")
class KeycloakIdpConfig {
  @Bean JwtDecoder jwtDecoder(@Value("${app.idp.issuer}") String kcIssuer) { /* same shape, KC issuer */ }
}
```
**Rationale — single decoder, NOT `JwtIssuerAuthenticationManagerResolver`:** The multi-issuer resolver (`JwtIssuerAuthenticationManagerResolver.fromTrustedIssuers(...)`, confirmed in SecSec 7 docs) is for accepting tokens from *several issuers simultaneously*. Here exactly **one** IdP is active per profile, so a profile-selected single `JwtDecoder` is simpler and matches D-03 ("share one filter chain"). Use the resolver only if a future requirement needs both IdPs live at once (it doesn't in v1).
**JWKS rotation without restart [CITED: docs.spring.io/.../jwt.html]:** `NimbusJwtDecoder.withIssuerLocation(issuer)` (or `.withJwkSetUri(...)`) caches and **auto-refreshes** the JWK set; key rotation at the IdP is picked up without an app restart. The default refresh/cache behavior satisfies "rotation without restart" — no custom refresh code needed for v1.
**CI both-profile coverage:** Run the IAM integration suite under **both** profiles in `--full` (SAS in-process, Keycloak via Testcontainers or compose CI leg). Pitfall 5 (profile rot) — the non-default IdP only breaks when exercised.

### Pattern 4: `@RequirePermission` enforced by a custom `AuthorizationManager`
**What:** `@RequirePermission("iam.users:update", scope = TENANT)` is a method/handler annotation. Enforcement is a **custom `AuthorizationManager`** wired via `AuthorizationManagerBeforeMethodInterceptor` — NOT scattered SpEL in `@PreAuthorize`. This keeps AUTHZ-06's "upgrade without touching `@PreAuthorize`" promise: enforcement reads from the cache/loader seam, not inline expressions.
**When to use:** AUTHZ-01, AUTHZ-05. Every protected handler.
**Example:**
```java
// Source: Context7 /websites/spring_io_spring-security_reference_7_0 — method-security.html
@Target({METHOD, TYPE}) @Retention(RUNTIME)
public @interface RequirePermission {
    String value();                       // e.g. IamPermissions.USERS_UPDATE (a constant)
    Scope scope() default Scope.TENANT;   // own | tenant | all
}

@Configuration @EnableMethodSecurity(prePostEnabled = true)
class MethodAuthzConfig {
  @Bean @Role(BeanDefinition.ROLE_INFRASTRUCTURE)
  Advisor requirePermissionAdvisor(RequirePermissionAuthorizationManager mgr) {
    var pointcut = new AnnotationMatchingPointcut(null, RequirePermission.class, true);
    return new AuthorizationManagerBeforeMethodInterceptor(pointcut, mgr);
  }
}

class RequirePermissionAuthorizationManager
    implements AuthorizationManager<MethodInvocation> {
  // reads @RequirePermission, looks up authorities via PermissionCache (AuthorityLoader-backed),
  // checks <module>.<resource>:<action> present; scope check delegated to service layer for `own`
  public AuthorizationResult authorize(Supplier<Authentication> auth, MethodInvocation mi) { ... }
}
```
**Why a custom `AuthorizationManager` (verified pattern):** SecSec 7 docs show replacing `@PreAuthorize` handling with custom `AuthorizationManager` beans via `AuthorizationManagerBeforeMethodInterceptor.preAuthorize(manager)`. Using a *dedicated annotation* (`@RequirePermission`) with its own pointcut/interceptor keeps it greppable (ADR-0003 wants `@RequirePermission` or `@PublicEndpoint` on every handler) and avoids string SpEL that GATE-11 can't statically resolve.

### Pattern 5: Data-scope enforcement (`own/tenant/all`) + `OwnedResource` (AUTHZ-02, D-04)
**What:** A grant carries a scope. `tenant` is already enforced by the Hibernate filter (no extra check). `all` bypasses narrowing (super-admin-class). `own` requires object-level identity via the `OwnedResource` marker — checked at the **service layer**, not the controller.
**When to use:** AUTHZ-02. 403-per-scope tests drive this.
**Example:**
```java
public interface OwnedResource { String getOwnerId(); }   // D-04 marker, in shared

// service-layer check (own scope)
void assertScope(Scope scope, Object resource, Authentication auth) {
  switch (scope) {
    case ALL -> { /* no narrowing */ }
    case TENANT -> { /* Hibernate filter already scoped — presence in result == in tenant */ }
    case OWN -> {
      if (!(resource instanceof OwnedResource owned))
        throw new IllegalStateException("own scope on non-OwnedResource — compile-time prevented");
      if (!owned.getOwnerId().equals(currentPrincipalId(auth))) throw new AccessDeniedException("403");
    }
  }
}
```
**Compile-visible constraint (D-04):** Granting `own` to a permission whose resource entity doesn't implement `OwnedResource` should be unrepresentable. **[ASSUMED A4]** Achieve via a generic bound (e.g. the scope-checker method only accepts `OwnedResource` for `own`) or an ArchUnit rule asserting any `@RequirePermission(scope=OWN)` target operates on an `OwnedResource`. Planner picks the enforcement point; the marker interface itself is locked.
**`team`/`department`:** schema-ready only — the `Scope` enum MAY include them (column nullable) but the checker throws `UnsupportedOperationException` if a v1 grant uses them. Do NOT implement enforcement (deferred).

### Pattern 6: Permission catalog code↔DB startup sync (ADR-0002, AUTHZ-03)
**What:** Code is source of truth. Per-module Java constant classes declare permissions with full metadata. A startup component reconciles them into the `iam.permission` table: insert new (Active), update metadata, mark missing-in-code as Deprecated (never delete). **Boot FAILS** if a Deprecated code is still granted past its grace window.
**When to use:** AUTHZ-03. Locked by ADR-0002 — implement, don't re-decide.
**Example:**
```java
// per-module catalog constant class (ADR-0002 §1)
public final class IamPermissions {
  public static final Permission USERS_READ =
    Permission.of("iam.users:read", "Read users", Module.IAM, Resource.USERS, Action.READ, Risk.LOW);
  public static final Permission USERS_UPDATE =
    Permission.of("iam.users:update", "Update users", Module.IAM, Resource.USERS, Action.UPDATE, Risk.MEDIUM);
  // ... @RequirePermission references these constants, never string literals
}

@Component
class PermissionCatalogSync implements ApplicationRunner {  // runs before serving traffic
  public void run(ApplicationArguments args) {
    Set<Permission> declared = CatalogRegistry.allDeclared();   // gathered from constant classes
    // insert new (Active) / update metadata / mark DB-only as Deprecated
    // FAIL boot if any Deprecated code still referenced by a role grant past grace window
  }
}
```
- Grace window is an `@ConfigurationProperties` record in `appconfig` (typed property — GATE-02 bans `@Value`/`Environment` outside appconfig).
- Tests (ADR-0002 §Consequences): insert / update / deprecate / fail-on-referenced-deprecated — each a Testcontainers IT (`--full`).
- **[CITED: ADR-0002]** Flyway-maintained catalog explicitly rejected; do not add catalog rows via migrations.

### Pattern 7: Tenant-keyed cache + permission cache + invalidation seam (FOUND-04, AUTHZ-05)
**What (discretion — recommended):**
- **Tenant-keyed cache:** **Key-prefix-by-tenant** on the existing Phase-2 Caffeine abstraction — compose the cache key as `tenantId + ":" + naturalKey`. **Recommended over per-tenant regions** because v1 is single-tenant and key-prefixing needs zero per-tenant cache lifecycle management, no region eviction storms, and trivially extends to N tenants. Per-tenant regions only win when you need per-tenant eviction policies/metrics (not a v1 requirement).
- **Permission cache:** per-user (and/or per-role) Caffeine cache keyed `tenantId:userId` (tenant-prefixed — a user's effective permissions are tenant-scoped). Populated via the `AuthorityLoader` seam.
- **Invalidation as a seam (AUTHZ-05):** a `PermissionCacheInvalidator` interface with an in-process Caffeine impl in v1. Call sites publish/handle Modulith events (`RoleChanged`, `PermissionChanged`, `UserDisabled`); the invalidator clears the affected keys **and** (on user-disable) revokes sessions (jti blacklist — Caffeine dev per backend/CLAUDE.md). A distributed impl (Valkey pub/sub) drops in later without touching call sites.
**Example:**
```java
public interface PermissionCacheInvalidator {           // SEAM — do not inline cache.evict()
  void onRoleOrPermissionChanged(String roleId);        // clear users with that role
  void onUserDisabled(String tenantId, String userId);  // clear + revoke sessions
}
@Component class InProcessPermissionCacheInvalidator implements PermissionCacheInvalidator { ... } // v1
```
**Pitfall (from PITFALLS.md):** invalidate-all causes cache stampede; prefer targeted eviction. Test the assign/revoke→cache-refresh path explicitly.

### Pattern 8: Seed bootstrap — default tenant + 5 roles + super-admin (AUTHZ-04, discretion)
**What (discretion — recommended): a startup seeder, NOT Flyway**, for roles/tenant/admin.
**Rationale:**
- The 5 system roles are **permission+scope sets** (AUTHZ-04) and permissions are code-declared constants that only exist after the catalog sync runs (Pattern 6, also a startup component). A Flyway migration can't reference the just-synced catalog rows by code-identity without hard-coding IDs — brittle. A startup seeder runs **after** `PermissionCatalogSync`, reads the constants, and assembles roles idempotently.
- Consistency with the locked ADR-0002 decision (catalog = startup-sync, not Flyway) — using Flyway for roles re-introduces the exact drift ADR-0002 rejected.
- **Caveat:** the `iam` Flyway migrations still create the **tables** (catalog, role, permission, role_grant, tenant). Only the **data seed** is a startup seeder. Tenant row + bootstrap-admin user may be a Flyway data migration *if* they need no code-derived identity — but keeping all seed data in one idempotent seeder (ordered after catalog sync) is cleaner.
**System-role lock (AUTHZ-04):** mark seed roles `is_system = true`; an admin-edit guard (Phase 5 UI; Phase 3 the column + a service-layer assertion) prevents modification.
**Default tenant (D-01):** seeded as the single v1 tenant — this is the *only* place the config default tenant id is used; never a runtime read fallback.
**[ASSUMED A5]** The bootstrap-admin credential approach for the embedded SAS dev users (D-03 "real local login") — likely a seeded Argon2id-hashed password from a dev-only property. Confirm whether Phase 3 owns dev-user passwords or defers to Phase 5 AuthN; CONTEXT D-03 implies Phase 3 needs *enough* for a real login.

### Pattern 9: `AuthorityLoader` seam (AUTHZ-06)
**What:** A named interface that turns a validated `Jwt` into the principal's authorities/permissions. v1 impl is **claim-based** (read roles/permissions from JWT claims, map to permission constants). A later **store-based** impl (DB lookup) replaces it **without touching the `SecurityFilterChain` or `@RequirePermission`** — that's the AUTHZ-06 guarantee.
**Example:**
```java
public interface AuthorityLoader {                       // SEAM
  Collection<GrantedAuthority> load(Jwt jwt, String tenantId);
}
@Component @Profile("!store-authz")  // v1 default
class ClaimBasedAuthorityLoader implements AuthorityLoader { /* map realm_access.roles / scope → perms */ }
```
**Pitfall 5 (claim shape divergence):** Keycloak puts roles in `realm_access.roles`/`resource_access`; SAS uses custom claims/`scope`. Keep per-IdP claim mapping **inside the loader** (config-driven), covered by contract tests with captured token fixtures from BOTH IdPs. Never hard-code `realm_access` outside the seam.

### Pattern 10: GATE-09 cross-tenant isolation IT (`--full`)
**What:** A Testcontainers PG16 integration test seeds **2 tenants**, writes rows for each, then asserts that reads under tenant A never return tenant B's rows — across **HTTP and async/jobs** paths (D-01). Joins `--full` per Q-004 §7.
**Structure:**
- HTTP leg: MockMvc/WebTestClient request with tenant A context → assert only A rows.
- Async leg: trigger an `@Async` method and/or a Modulith event whose listener queries → assert tenant propagated (B's data invisible). This is what makes D-01 meaningful.
- Structure the test so a **BPM leg** (Phase 7) slots in without rewriting the harness (deferred).
- A negative test: clear `TenantContext` then attempt a tenant-bound query → expect `NoTenantContextException` (proves fail-closed).
**[VERIFIED: CLAUDE.md]** Testcontainers **2.x** with `@ServiceConnection`; no H2; reuse a singleton container for budget.

### Pattern 11: GATE-11 undeclared-permission detection (ADR-0003)
**What:** Two layers, exactly as ADR-0003 locks them.
- **Layer 1 — ArchUnit rule (`--fast`):** every method annotated with a `@RequestMapping`-family annotation (`@GetMapping`/`@PostMapping`/`@PutMapping`/`@PatchMapping`/`@DeleteMapping`/`@RequestMapping`) must also carry `@RequirePermission` or `@PublicEndpoint`. Pure bytecode — no Spring context. Added to the existing `ArchitectureGatesTest` suite (GATE-02 set). Failure names class+method.
- **Layer 2 — context test (`--full`):** boots the app context, enumerates `RequestMappingHandlerMapping.getHandlerMethods()`, asserts the same property at wiring level (catches meta-annotated/composed/programmatic handlers).
**Example (Layer 1 shape):**
```java
// added to ArchitectureGatesTest — Source pattern: jdk25-harness ArchitectureTest.java
@Test void everyHandlerDeclaresPermissionOrPublic() {
  methods().that().areAnnotatedWith(GetMapping.class) /* ...all mapping annotations... */
    .should(beAnnotatedWithRequirePermissionOrPublicEndpoint())
    .check(importedClasses);
}
```
**[CITED: ADR-0003]** `@PublicEndpoint` is the single greppable opt-out — the only way to ship an unprotected handler. Functional router endpoints are NOT covered (extending the ADR is required first — out of scope).

### Anti-Patterns to Avoid
- **Silent default-tenant fallback** — violates D-01. The only default-tenant use is the bootstrap seed.
- **Enabling the Hibernate filter per-repository-method** — forgettable; enable once at session lifecycle.
- **String SpEL in `@PreAuthorize` for permissions** — breaks GATE-11 static resolution and AUTHZ-06 seam; use `@RequirePermission` + `AuthorizationManager`.
- **Hard-coding `realm_access.roles` outside the `AuthorityLoader`** — Pitfall 5 profile divergence.
- **Catalog rows via Flyway** — ADR-0002 explicitly rejects (drift).
- **`flyway-core` alone** — Boot 4 needs `spring-boot-starter-flyway` + `flyway-database-postgresql`.
- **Testcontainers 1.x idioms / Jackson 2 `com.fasterxml.jackson` imports / bare `@Scheduled`** — backend/CLAUDE.md hallucination bans.
- **Leaving a `security/**` T3 glob** — D-05: point it at `iam/**`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Per-query tenant predicate | Manual `WHERE tenant_id=?` in every repo | Hibernate `@FilterDef`/`@Filter` enabled per session | Forgettable; native/criteria bypass; the filter is the seam. |
| JWT signature/issuer/JWKS validation | Custom JWT parsing | `NimbusJwtDecoder.withIssuerLocation` + `jwsAlgorithm` + `OAuth2TokenValidator` | Auto JWKS refresh, algorithm pinning, audience — all built-in. |
| JWKS key rotation polling | Custom refresh scheduler | NimbusJwtDecoder's built-in cache/refresh | "Rotation without restart" is the default behavior. |
| Method-level permission enforcement | Inline `if (hasPermission)` in each handler | Custom `AuthorizationManager` + `AuthorizationManagerBeforeMethodInterceptor` | Centralized, greppable, GATE-11-checkable, AUTHZ-06-swappable. |
| Cross-thread context propagation | Manual thread-local copying ad hoc | Spring `TaskDecorator` (async) + Modulith listener decoration | Standard Spring seam; consistent capture/restore/clear. |
| Argon2id hashing | Custom KDF | Spring Security `Argon2PasswordEncoder` (+ BouncyCastle) | Built into spring-security-crypto. |
| Permission catalog drift detection | Manual DB/code diff scripts | Startup sync component (ADR-0002) | Deterministic; code is source of truth; deprecated-before-delete by construction. |

**Key insight:** Every "seam" in this phase corresponds to an existing Spring/Hibernate extension point. The value is in *where you put the seam* (one filter chain, one decoder bean, one authority loader, one invalidator) so v1's simple impl is swappable — not in building isolation/validation primitives from scratch.

## Runtime State Inventory

> Phase 3 is greenfield seam construction, not a rename/refactor. This section is included only because Phase 3 introduces persistent state that downstream phases inherit.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | New `iam` tables (permission catalog, role, role_grant, tenant) + `tenant_id` column added to every business table via `BaseEntity` | Flyway migrations under `db/migration/iam/`; `BaseEntity` mapping. Catalog rows seeded by startup sync (not Flyway). |
| Live service config | Embedded SAS registered-client config + Keycloak realm (compose) — both profile-bound, in code/compose not external UIs in v1 | Code config under `iam/config`; Keycloak realm import file in compose. |
| OS-registered state | None — no OS-level registrations introduced. | None. |
| Secrets/env vars | IdP issuer URI + audience + grace-window + default-tenant-id as typed `@ConfigurationProperties` (appconfig); dev-user/admin credential property (SAS) | Typed properties in `appconfig` (GATE-02 compliance); dev credentials dev-profile only. |
| Build artifacts | `iam` module bumps `ModulithVerifyTest.BASE_MODULES` (expected set gains `iam`); `ModuleFlywayLocationsCustomizer` gains `iam` location | `new-module` skill side-effects (automatic); verify the expected-set assertion is updated. |

**Nothing found in category:** OS-registered state — None (verified: no Task Scheduler/launchd/systemd registration in this phase's scope).

## Common Pitfalls

### Pitfall 1: Hibernate tenant filter silently bypassed (PITFALLS.md #6)
**What goes wrong:** Filters apply only to HQL/criteria through the filtered Session. Native SQL, `JdbcTemplate`, threads where `TenantContext` was never set, and (Phase 7) Flowable's MyBatis layer all bypass it. Single-tenant v1 means **nothing fails today** — it breaks when tenant #2 arrives (most expensive time).
**How to avoid:** Enable the filter at session lifecycle (not per-method); GATE-02's "no native query outside wrapper" + the wrapper applies tenant predicate; GATE-09 covers async/jobs (not just HTTP); fail-closed `require()` turns a missed propagation into a loud throw in tests.
**Warning signs:** GATE-09 only tests HTTP; any `createNativeQuery` outside the wrapper; a job/listener with no tenant assertion.

### Pitfall 2: IdP profile rot — non-default IdP only breaks when flipped (PITFALLS.md #10)
**What goes wrong:** SAS becomes the daily driver; Keycloak rots. Claim shapes diverge (`realm_access.roles` vs SAS `scope`/custom). The authority seam is where divergence concentrates.
**How to avoid:** Run the IAM integration suite in **both** profiles in `--full` CI; per-IdP claim mapping confined to `AuthorityLoader`, covered by fixture-based contract tests for both token shapes; assert audience + pinned algorithms in both.
**Warning signs:** Only one profile in CI; `realm_access` referenced outside the loader; JWKS-rotation test for one IdP only.

### Pitfall 3: Permission cache without invalidation discipline (PITFALLS.md performance traps)
**What goes wrong:** Stale permissions after a role edit, or cache stampede on invalidate-all.
**How to avoid:** Targeted eviction (AUTHZ-05); test the assign/revoke→cache-refresh path; user-disable clears cache **and** revokes sessions; invalidation behind the seam interface.
**Warning signs:** `cache.clear()` on any change; no test for role-edit→fresh-permissions.

### Pitfall 4: `@ApplicationModuleTest` green ≠ wiring works (PITFALLS.md #5)
**What goes wrong:** STANDALONE module tests pass but the cross-module event/listener that propagates tenant or invalidates cache is never exercised.
**How to avoid:** GATE-09 async leg + a full-context test for the `RoleChanged`/`UserDisabled` event → cache-invalidation edge. GATE-11 Layer 2 is itself a full-context test.
**Warning signs:** listeners with zero scenario/context coverage.

### Pitfall 5: `verify --fast` budget erosion (PITFALLS.md #8, Q-004)
**What goes wrong:** GATE-11's context-boot backstop or GATE-09's container IT accidentally lands in `--fast`, blowing the 60s budget; or context forks multiply.
**How to avoid:** Per Q-004 §7 — only the **static** ArchUnit rule (GATE-11 Layer 1) joins `--fast`; all container/context tests (GATE-09, GATE-11 Layer 2, sync ITs, dual-profile) are `--full` only. Reuse one PG container + one Spring context for the fast smoke set.

### Pitfall 6: Phase-2 substrate not on disk (this research's Critical Pre-Flight Finding)
**What goes wrong:** Plans assume `shared`/scheduling-wrapper/caching/pom exist; tasks fail at compile.
**How to avoid:** First task verifies the actual merged Phase-2 state (checkout/inspect PR #6) and the scheduling-wrapper + caching API signatures before any tenant-propagation or cache task.

## Code Examples

All load-bearing examples are inline in § Architecture Patterns (Patterns 1, 3, 4, 6, 9, 11) with their sources. Key verified sources:
- Hibernate `@FilterDef`/`@Filter` + `entityManager.unwrap(Session.class).enableFilter(...)` — `[VERIFIED: Context7 /hibernate/hibernate-orm]`
- `NimbusJwtDecoder.withIssuerLocation(...).jwsAlgorithm(RS256).jwsAlgorithm(ES256)` + `OAuth2TokenValidator` audience — `[CITED: docs.spring.io/spring-security/reference/7.0/servlet/oauth2/resource-server/jwt.html]`
- Custom `AuthorizationManager` via `AuthorizationManagerBeforeMethodInterceptor` — `[CITED: docs.spring.io/spring-security/reference/7.0/servlet/authorization/method-security.html]`
- `JwtIssuerAuthenticationManagerResolver.fromTrustedIssuers(...)` (documented, but NOT recommended here — single-issuer-per-profile) — `[CITED: docs.spring.io/.../resource-server/multitenancy.html]`
- ArchUnit rule shape on JDK25 class files — `[VERIFIED: jdk25-harness/ArchitectureTest.java]`

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Standalone Spring Authorization Server project (`spring-authorization-server`) | Merged into **Spring Security 7** (`spring-security-oauth2-authorization-server`, Boot-managed) | Spring Security 7.0 (2025) | One BOM; use the Security coordinate. `[VERIFIED: CLAUDE.md/STACK.md]` |
| `@PreAuthorize("hasAuthority('...')")` SpEL strings | Custom `AuthorizationManager` + `AuthorizationManagerBeforeMethodInterceptor` | Spring Security 6→7 method-security model | Centralized, statically-checkable, seam-swappable. `[CITED: SecSec 7 method-security]` |
| Hibernate `@TenantId` discriminator multi-tenancy | Still valid; **`@Filter`/`@FilterDef`** preferred here for a single resolvable predicate enabled per session | — | `@Filter` chosen because v1 is single-tenant with a config default and needs an explicit enable point (fail-closed). `@TenantId` ties to `CurrentTenantIdentifierResolver` which is heavier for v1. `[ASSUMED A6 — both work; @Filter matches D-01 fail-closed enable point]` |
| Testcontainers 1.x | **Testcontainers 2.x** (Boot 4-managed) | Boot 4 | Different artifact/API; `@ServiceConnection`. `[VERIFIED: CLAUDE.md]` |

**Deprecated/outdated:**
- Old SAS coordinates — anti-stack (STACK.md).
- `flyway-core` standalone auto-config — removed in Boot 4.
- Jackson 2 `com.fasterxml.jackson` imports — Boot 4 is Jackson 3 `tools.jackson`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Phase-2 backend code (pom, `shared`, `caching`, scheduling wrapper, Application class) exists in git history (PR #6) and planner works against merged state, not this working tree | Critical Pre-Flight Finding | **HIGH** — if genuinely absent, Phase 3 has an unstated blocking dependency; every plan task assumes a substrate that isn't there |
| A2 | The Hibernate-filter enable hook (interceptor vs aspect vs EMF customizer) depends on Phase-2 persistence wiring | Pattern 1 | MEDIUM — wrong hook → filter not enabled on some sessions → silent leak |
| A3 | The Phase-2 scheduling-wrapper API exposes a capture/restore hook point | Pattern 2 | MEDIUM — if not, tenant propagation to `@Scheduled` needs a wrapper change (T3-adjacent) |
| A4 | `own`-scope compile-visibility achieved via generic bound or ArchUnit rule | Pattern 5 | LOW — multiple valid enforcement points; marker interface itself is locked |
| A5 | Phase 3 owns enough dev-user credential seeding for embedded SAS "real local login" (vs deferring all to Phase 5 AuthN) | Pattern 8 | MEDIUM — scope boundary with Phase 5; affects whether Argon2id/dev passwords land now |
| A6 | `@Filter` (not `@TenantId`) is the right Hibernate mechanism given D-01 fail-closed enable point | State of the Art | LOW — both work; `@Filter` gives an explicit per-session enable matching fail-closed semantics |

**These six assumptions need confirmation in planning/discuss before becoming locked.** A1 is a hard gate — resolve before Task 1.

## Open Questions

1. **Is the Phase-2 backend substrate materialized? (BLOCKER — A1)**
   - What we know: STATE.md says Phase 2 closed + PR #6 merged + gates green; working tree has only partial `appconfig` + a spike harness.
   - What's unclear: whether the merged `shared`/`caching`/pom/scheduling-wrapper are checked out or recoverable from git history.
   - Recommendation: **First planned task** = checkout/inspect the merged Phase-2 state; record the actual module set, scheduling-wrapper signature, caching abstraction surface, and `Application.java` location. Add a `checkpoint:human-verify` if artifacts are absent.

2. **Embedded SAS dev-login scope (A5).**
   - What we know: D-03 wants SAS "minimal-but-usable" with seeded dev users + 5 roles for real local login and CI both-profile coverage.
   - What's unclear: does Phase 3 implement password storage/Argon2id for dev users, or stub login enough for token issuance, deferring real AuthN to Phase 5?
   - Recommendation: scope SAS to **token issuance for seeded users** (enough for AUTHZ enforcement + CI), defer full password lifecycle (reset/verify/MFA) to Phase 5. Confirm in discuss.

3. **`own`-scope compile-visibility enforcement point (A4).**
   - Recommendation: ArchUnit rule (`@RequirePermission(scope=OWN)` target must be `OwnedResource`) joins GATE-11's `--fast` suite — cheapest, statically visible. Confirm.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| JDK 25 LTS | All backend compile/test | ✓ (jdk25-harness spike green) | 25 (Temurin) | — |
| Docker / PG16 container | GATE-09, sync ITs, dual-profile (`--full`) | ✓ (compose-config gate passes) | postgres:16-alpine | — |
| Keycloak 26.6.3 image | Keycloak-profile CI leg | ✓ (compose profile) | 26.6.3 | SAS-only profile still proves the seam; KC leg can run ubuntu-only |
| Maven (`./mvnw`) | Build | ✗ on disk (no pom yet — see A1) | 3.9.16 (planned) | — (blocked on A1) |
| Phase-2 `shared`/`caching` modules | Tenant seam + cache | ✗ on disk (A1) | — | resolve A1 first |

**Missing dependencies with no fallback:**
- Phase-2 backend substrate (pom, `shared`, `caching`, scheduling wrapper) — blocks all Phase 3 code until A1 resolved.

**Missing dependencies with fallback:**
- Keycloak leg can be ubuntu-only (Win/macOS legs compile + unit + static gates per Phase-1 D-04 pattern).

## Validation Architecture

> nyquist_validation is not disabled in config → section included.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | JUnit 6 (Boot 4-managed) + Testcontainers 2.x + ArchUnit ≥1.4.2 |
| Config file | `backend/pom.xml` (surefire/failsafe) — **verify exists per A1** |
| Quick run command | `node scripts/checks/run-gate.mjs --mode fast` (adds: backend compile, ArchUnit incl. GATE-11 L1, unit tests) |
| Full suite command | `node scripts/checks/run-gate.mjs --mode full` (adds: GATE-09 isolation IT, GATE-11 L2 context test, catalog-sync ITs, dual-profile IAM suite) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command (illustrative) | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOUND-04 | 2-tenant cross-read blocked (HTTP + async) | integration (`--full`) | `./mvnw verify -Dtest=TenantIsolationIT` | ❌ Wave 0 |
| FOUND-04 | `TenantContext.require()` throws when unset (fail-closed) | unit (`--fast`) | `./mvnw test -Dtest=TenantContextTest` | ❌ Wave 0 |
| AUTH-09 | JWT validated under both profiles; algorithms pinned; audience checked | integration (`--full`) | `./mvnw verify -Dtest=IdpProfileIT -Pkeycloak` & `-Psas` | ❌ Wave 0 |
| AUTH-09 | JWKS rotation picked up without restart | integration (`--full`) | `./mvnw verify -Dtest=JwksRotationIT` | ❌ Wave 0 |
| AUTHZ-01 | permission constant format `<module>.<resource>:<action>` | unit (`--fast`) | `./mvnw test -Dtest=PermissionConstantTest` | ❌ Wave 0 |
| AUTHZ-02 | wrong scope → 403 (per `own`/`tenant`/`all`) | integration (`--full`) | `./mvnw verify -Dtest=ScopeEnforcementIT` | ❌ Wave 0 |
| AUTHZ-03 | catalog sync insert/update/deprecate/fail-on-referenced-deprecated | integration (`--full`) | `./mvnw verify -Dtest=CatalogSyncIT` | ❌ Wave 0 |
| AUTHZ-04 | 5 seed roles present; `is_system` locked | integration (`--full`) | `./mvnw verify -Dtest=SeedRolesIT` | ❌ Wave 0 |
| AUTHZ-05 | role/perm change + user-disable invalidates cache (+ revokes sessions) | integration (`--full`) | `./mvnw verify -Dtest=PermissionCacheInvalidationIT` | ❌ Wave 0 |
| AUTHZ-06 | claim→authority loader swappable behind seam | unit + integration | `./mvnw test -Dtest=AuthorityLoaderTest` | ❌ Wave 0 |
| GATE-09 | gate fails CI on cross-tenant leak | integration (`--full`, CI-blocking) | run-gate `--mode full` | ❌ Wave 0 |
| GATE-11 | undeclared protected endpoint fails (L1 static) | arch (`--fast`, CI-blocking) | run-gate `--mode fast` | ❌ Wave 0 |
| GATE-11 | undeclared endpoint fails at wiring (L2 context) | integration (`--full`) | `./mvnw verify -Dtest=PermissionMappingContextTest` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node scripts/checks/run-gate.mjs --mode fast` (<60s budget — Q-004; static ArchUnit incl. GATE-11 L1, compile, unit).
- **Per wave merge:** `node scripts/checks/run-gate.mjs --mode full` (GATE-09 + GATE-11 L2 + catalog/scope/cache ITs + dual-profile).
- **Phase gate:** full suite green before `/gsd-verify-work`; baseline gate count grows from 11 (add GATE-09, GATE-11 — assign each to fast/full in the same PR per Q-004 §4/§7).

### Wave 0 Gaps
- [ ] `TenantContextTest` (`--fast`) — fail-closed `require()` (FOUND-04 / D-01)
- [ ] `TenantIsolationIT` (`--full`, Testcontainers PG16, 2 tenants, HTTP + async legs) — GATE-09 / FOUND-04
- [ ] `ArchitectureGatesTest` extension — GATE-11 Layer 1 ArchUnit rule (+ optional `own`-scope-on-`OwnedResource` rule)
- [ ] `PermissionMappingContextTest` (`--full`) — GATE-11 Layer 2
- [ ] `CatalogSyncIT` (`--full`) — insert/update/deprecate/fail paths (ADR-0002)
- [ ] `ScopeEnforcementIT` (`--full`) — 403-per-scope (AUTHZ-02)
- [ ] `PermissionCacheInvalidationIT` (`--full`) — AUTHZ-05
- [ ] `IdpProfileIT` + `JwksRotationIT` (`--full`, both profiles) — AUTH-09; token fixtures for SAS + Keycloak
- [ ] `SeedRolesIT` (`--full`) — AUTHZ-04
- [ ] `iam` `@ApplicationModuleTest` stub (from `new-module` skill) + `ModulithVerifyTest.BASE_MODULES` gains `iam`
- [ ] Testcontainers 2.x base IT fixture reuse (`@ServiceConnection` PG16) — verify Phase-2 provides one (A1)
- [ ] Taskfile gate wiring: GATE-09 (`--full`), GATE-11 L1 (`--fast`)/L2 (`--full`) — gate config is T3

## Security Domain

> `security_enforcement` not disabled in config → section included. This phase IS the security substrate.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V1 Architecture | yes | Trust boundary at resource-server filter chain; tenant isolation at persistence layer |
| V2 Authentication | yes (boundary) | Resource-server JWT validation; full credential lifecycle is Phase 5. Argon2id for any seeded dev creds. |
| V3 Session Management | partial | jti-blacklist revocation on user-disable (Caffeine dev); full session mgmt Phase 5 |
| V4 Access Control | **yes (core)** | `@RequirePermission` + custom `AuthorizationManager`; deny-by-default (GATE-11: no implicit public); data-scope `own/tenant/all`; tenant isolation |
| V5 Validation | partial | Bean Validation at boundary is Phase 4; permission constants are typed (no string SpEL) |
| V6 Cryptography | yes | JWT signature pinned RS256/ES256; never hand-roll; Argon2id via Spring Security |
| V7 Error/Logging | partial | Audit events (async, after-commit) for permission changes/user-disable — sink is Phase 5 `audit`; emit events now |

### Known Threat Patterns for this stack (STRIDE)
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-tenant data read | Information Disclosure | Hibernate filter enabled per session + fail-closed `TenantContext`; GATE-09 |
| Elevation by omission (endpoint with no permission) | Elevation of Privilege | GATE-11 deny-by-default; `@PublicEndpoint` is the only opt-out (ADR-0003) |
| Permission silently deleted while still granted | Elevation / Repudiation | ADR-0002 deprecated-before-delete; boot fails if granted-Deprecated past grace |
| Token from untrusted issuer / wrong audience | Spoofing | Issuer + audience validation; pinned algorithms (no `none`/HS confusion) |
| Stale permissions after revoke | Elevation | Targeted cache invalidation + session revoke on user-disable (AUTHZ-05) |
| Claim-shape spoofing across IdPs | Spoofing/Tampering | Per-IdP claim mapping confined to `AuthorityLoader`; dual-profile contract tests |
| Filter-bypass via native SQL/threads | Information Disclosure | GATE-02 native-query-wrapper ban; propagation to async/jobs; GATE-09 async leg |

## Sources

### Primary (HIGH confidence)
- Context7 `/websites/spring_io_spring-security_reference_7_0` — OAuth2 resource server JWT, `NimbusJwtDecoder.withIssuerLocation`/`jwsAlgorithm` (RS256/ES256), `OAuth2TokenValidator` audience, custom `AuthorizationManager` + `AuthorizationManagerBeforeMethodInterceptor`, `JwtIssuerAuthenticationManagerResolver`, `JwtAuthenticationConverter`.
- Context7 `/hibernate/hibernate-orm` — `@FilterDef`/`@ParamDef`/`@Filter`, session-scoped enable, `entityManager.unwrap(Session.class)`.
- Repo canonical refs (read directly): ADR-0001/0002/0003, backend/CLAUDE.md, root CLAUDE.md, `.cowork/tiers.json`, `scripts/checks/run-gate.mjs`, Q-004 spike, REQUIREMENTS.md, PRD.md §6.3.4, new-module SKILL.md, jdk25-harness ArchitectureTest.java.

### Secondary (MEDIUM confidence)
- `.planning/research/STACK.md`, `.planning/research/PITFALLS.md` — version pins + pitfall catalog (note: STACK.md says JDK 26; PROJECT.md supersedes to 25).
- `docs.spring.io/spring-security/reference/7.0/servlet/oauth2/resource-server/multitenancy.html` — multi-issuer resolver (documented, not adopted).

### Tertiary (LOW confidence)
- Working-tree inspection of Phase-2 state (git ls-files, on-disk find) — factual but reveals an unexplained gap vs STATE.md (A1).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Boot-managed versions + verified Spring Security 7 / Hibernate 7 docs; no novel packages.
- Architecture (filter chain, tenant filter, `@RequirePermission`, catalog sync): HIGH — all map to verified Spring/Hibernate extension points + locked ADRs.
- Phase-2 substrate dependency: MEDIUM-LOW — STATE.md and working tree disagree (A1); planner must verify.
- Pitfalls: HIGH — sourced from PITFALLS.md + official docs.
- Discretion recommendations (cache key-prefix, startup seeder): MEDIUM — sound defaults, but bound to the actual Phase-2 caching API.

**Research date:** 2026-06-14
**Valid until:** 2026-07-14 (stable stack; Spring Boot 4.0.x line — re-check if Boot/Modulith/Security minor bumps land)
