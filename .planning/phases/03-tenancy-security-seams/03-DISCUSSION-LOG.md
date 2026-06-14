# Phase 3: Tenancy & Security Seams - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-14
**Phase:** 3-Tenancy & Security Seams
**Areas discussed:** TenantContext propagation, Seam module placement, IdP dev default + SAS scope, `own` scope ownership contract

---

## TenantContext propagation (D-01)

| Option | Description | Selected |
|--------|-------------|----------|
| ThreadLocal + fail-closed | ThreadLocal context; HTTP filter + TaskDecorator + shared scheduling wrapper + Modulith listeners propagate; absent context throws; config default-tenant = bootstrap seed only | ✓ |
| ThreadLocal + default-tenant fallback | Same propagation, but absent context falls back to default tenant instead of throwing | |
| Micrometer ContextPropagation | ThreadLocalAccessor bridges tenant via Micrometer context-propagation (already present via observability) | |

**User's choice:** ThreadLocal + fail-closed
**Notes:** Fail-closed is the deliberate choice — a missing-propagation bug must fail loud, not leak as "works on default tenant". GATE-09 must cover HTTP + async/jobs.

---

## Seam module placement (D-02 / D-05)

| Option | Description | Selected |
|--------|-------------|----------|
| Tenant in `shared` + new `iam` module | Tenant seam in Phase-2 `shared` (as deferred); new `iam` module for authz primitives; generated via new-module dogfood | ✓ |
| Dedicated `tenancy` module + `iam` module | Split tenant primitives into own `tenancy` module | |
| Single `security` module for tenancy + authz | One module for both concerns | |

**User's choice:** Tenant in `shared` + new `iam` module
**Notes:** Reconciliation captured as D-05 — ADR-0003 names `security/**` as the T3/CODEOWNERS path; module chosen is `iam`, so the planner must repoint the T3 glob + CODEOWNERS at the `iam` module path (or rename consistently to `security`).

---

## IdP dev default + SAS scope (D-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Embedded SAS default, minimal-but-usable | `task up`/local default = embedded SAS (seeded users + 5 roles, real login, CI both-profile); Keycloak via compose profile + CI leg; avoids 8080 clash | ✓ |
| Keycloak default (prod-parity local) | Local default = Keycloak 26; embedded SAS minimal for CI alt-profile only; must resolve 8080 clash | |

**User's choice:** Embedded SAS default, minimal-but-usable
**Notes:** Sidesteps the STATE-flagged port-8080 Keycloak/backend clash for default dev; both profiles share one SecurityFilterChain.

---

## `own` scope ownership contract (D-04)

| Option | Description | Selected |
|--------|-------------|----------|
| Marker interface `OwnedResource` | Entities expose getOwnerId(); checker reads generically; no interface = can't grant `own` (compile-visible) | ✓ |
| Owner-field convention (column name) | `owner_id`/`created_by` column resolved by config/reflection | |
| Per-resource resolver beans | Resolver bean per resource type registered with the checker | |

**User's choice:** Marker interface `OwnedResource`
**Notes:** Statically checkable, minimal boilerplate; drives AUTHZ-02 403-per-scope tests.

---

## Claude's Discretion

Left to research/planner (constrained by the locked decisions above):
- Tenant-keyed cache mechanism (key-prefix vs per-tenant region) — FOUND-04.
- Seed roles / default tenant / bootstrap super-admin mechanism: Flyway migration vs startup seeder (catalog sync itself is locked to startup-sync by ADR-0002).
- Permission-cache invalidation propagation: v1 in-process Caffeine + jti-blacklist session revoke; distributed broadcast is a seam only.
- JWKS rotation + RS256/ES256 pinning mechanism — within AUTH-09.
- `iam` module Maven/wiring details, within the new-module skill CONTRACT.

## Deferred Ideas

- BPM path for GATE-09 — Phase 7.
- Distributed/multi-node permission-cache invalidation — seam only in v1.
- `team`/`department` data scopes — schema-ready seam only (decision 2026-06-11).
- Permission physical-`Removed` migrations — explicit human-approved migration after grace window (ADR-0002), beyond Phase-3 scope.
