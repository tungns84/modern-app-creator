# Roadmap: cowork-cli — Giai đoạn 1 (preset `react-springboot-modulith`)

## Overview

Build the preset as a real, buildable monorepo — enforcement first, then bottom-up along the Modulith DAG. Phase 1 bootstraps the dogfood loop (spikes Q-010/Q-002/Q-004, hooks, specs convention, L2 plan-compliance CI) so every later commit is evidence of the methodology. Phases 2–4 lay the backend foundation, the tenancy/security seams, and the contract-gated frontend — wiring each CI gate in the same phase as the first code it covers. Phase 5 delivers the IAM feature surface, Phase 6 the ops modules and K8s deploy target, Phase 7 the Q-006-gated BPM bậc 1 (droppable; BPM-off stays the mandatory acceptance path), and Phase 8 hardens the system against the Giai đoạn 1 DoD and onboarding pilot.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Dogfood Bootstrap & Enforcement** - Spikes + ADRs, hooks, specs convention, L2 plan-compliance CI, local stack, init script — before any application code
- [ ] **Phase 2: Backend Foundation** - Modulith skeleton + infra modules with Modulith/ArchUnit gates live and loss-proof event registry
- [ ] **Phase 3: Tenancy & Security Seams** - TenantContext/filter + isolation gate, JWT/multi-IdP, permission model + declaration gate — before any feature endpoint
- [ ] **Phase 4: Contract Pipeline & Frontend Foundation** - RFC 9457 + OpenAPI→Orval drift gate, React 19 shell, all frontend gates live
- [ ] **Phase 5: IAM Feature Surface** - AuthN flows, user lifecycle, permission matrix UI, audit timeline, MFA/invite, dev seed data
- [ ] **Phase 6: Ops Modules & Deploy Target** - storage/jobs leaf modules, K8s manifests, hardened images with secret/CVE gates, EXTRACTION.md
- [ ] **Phase 7: BPM bậc 1 (option ON, droppable)** - Q-006 spike first, then embedded Flowable 8 with inbox, process admin, tenant-aware engine
- [ ] **Phase 8: Hardening & Acceptance** - ONBOARDING + specs/000-example verified, 3-OS matrix green, guardrail metrics audit, Giai đoạn 1 DoD

## Phase Details

### Phase 1: Dogfood Bootstrap & Enforcement

**Goal**: The repo enforces its own methodology before any application code exists — every subsequent commit flows through S→P→I→V with hard T3 gates, and the local dev loop works on all 3 OS
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-02, FOUND-12, GATE-10, GATE-12, AGENT-01, AGENT-02, AGENT-03, AGENT-04, AGENT-05, AGENT-06, AGENT-09
**Success Criteria** (what must be TRUE):

  1. A Claude Code session in the repo is denied Write/Edit on a T3 path without an approved plan (explaining message + next step) and denied T4 command patterns, on the Q-010-pinned Claude Code version; T1 daily commands run with zero ceremony
  2. CI fails any PR whose diff touches T3 paths without a `specs/NNN-*/plan.md` carrying a valid `Approved-by:`, with approver identity verified via the Git hosting API per the Q-002 mechanism (no self-approval, survives squash/rebase); CLAUDE.md size-budget and command-smoke checks block too
  3. Developer can run `task up` on Windows/macOS/Linux without WSL and get the full local stack (PostgreSQL 16, Redis, Mailpit, MinIO, Keycloak, observability)
  4. Tech Lead can run `scripts/init.(sh|ps1)` to rename `com.acme.app` to team values with auto-commit; three-layer CLAUDE.md and the five skills exist within size budgets
  5. Spike reports (Q-010 hook matrix, Q-002 hosting API, Q-004 verify-fast gate-set, JDK 25 toolchain smoke on 3 OS) and required ADRs (permission sync FR-B11, undeclared-permission detection FR-B13, Redis-vs-Valkey) are written before dependent phases commit

**Plans**: 12 plans in 5 waves
Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Bootstrap: .gitattributes, tiers/waivers config, constitution copy, PR template (wave 1)
- [x] 01-02-PLAN.md — Spikes Q-002 (GitHub PR-review mechanism) + Q-004 (verify-fast contract) (wave 1)
- [x] 01-03-PLAN.md — Spikes Q-010 (hook stability matrix) + JDK 25 toolchain smoke 3-OS (wave 1)
- [x] 01-12-PLAN.md — Manual dogfood: hand-written spec units 001-006 (wave 1)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-04-PLAN.md — TDD: tier matcher + T3/T4 hooks + settings.json go-live (wave 2)
- [x] 01-05-PLAN.md — Local stack: compose 6 services + Taskfile up/down + os-matrix CI (wave 2)
- [x] 01-06-PLAN.md — TDD: init rename engine + sh/ps1 entry points + parity CI (wave 2)
- [x] 01-07-PLAN.md — TDD: CLAUDE.md render + size/smoke check tooling (wave 2)
- [x] 01-08-PLAN.md — ADRs 0001 Valkey, 0002 permission sync (FR-B11), 0003 undeclared-permission detection (FR-B13) (wave 2)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-09-PLAN.md — TDD: plan-compliance gate + workflow + CODEOWNERS + platform config incl. D-10 W-001 deferral (wave 3)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 01-10-PLAN.md — Three-layer CLAUDE.md content + claude-md-check CI (wave 4)

**Wave 5** *(blocked on Wave 4 completion)*

- [ ] 01-11-PLAN.md — Five skills + lint trio + task verify/verify:fast spine (wave 5)

### Phase 2: Backend Foundation

**Goal**: A green Spring Modulith skeleton with infra modules where architecture violations fail the build and cross-module events cannot be lost — built via the `new-module` skill as the first real dogfood
**Depends on**: Phase 1
**Requirements**: FOUND-01, FOUND-03, FOUND-05, FOUND-07, FOUND-10, GATE-01, GATE-02, AGENT-08
**Success Criteria** (what must be TRUE):

  1. `./mvnw verify` runs Modulith verify + ArchUnit gates; an undeclared module dependency, DAG cycle, or banned pattern (field injection, bare `@Scheduled`, unwrapped native query, entity across controller boundary) fails the build, with module-count assertions dynamic by BPM option
  2. Kill-listener test proves no event loss AND no double-effect through the JDBC Event Publication Registry (republish on restart, bounded retry, completion cleanup)
  3. `shared`, `appconfig`, `i18n`, `caching`, `observability` modules exist with per-module Flyway on PostgreSQL 16 and Testcontainers integration tests; modules read typed properties only, switching env+ConfigMap / Consul KV by profile
  4. Running app exposes liveness/readiness probes, structured JSON logs with MDC PII allowlist, OTel traces, and Prometheus metrics
  5. `verify --fast` completes in <60s with the Q-004-defined gate set, and gate errors name the violated rule plus the fix

**Plans**: TBD

### Phase 3: Tenancy & Security Seams

**Goal**: Every future feature endpoint is born tenant-isolated and permission-checked — no retrofit possible
**Depends on**: Phase 2
**Requirements**: FOUND-04, AUTH-09, AUTHZ-01, AUTHZ-02, AUTHZ-03, AUTHZ-04, AUTHZ-05, AUTHZ-06, GATE-09, GATE-11
**Success Criteria** (what must be TRUE):

  1. Tenancy isolation gate blocks cross-tenant reads with 2 seeded tenants, covering HTTP and async/jobs paths (TenantContext + Hibernate filter + tenant-keyed cache), CI-blocking
  2. A protected API without a declared permission fails CI (permission-declaration gate, per the FR-B13 ADR mechanism)
  3. `@RequirePermission` enforces `<module>.<resource>:<action>` with `own/tenant/all` scopes — wrong scope returns 403 (tested per scope); permission cache invalidates on role/permission change and user disable; no hard-coded roles in business logic
  4. IdP switches by profile between embedded Spring Authorization Server and Keycloak 26 on one codebase/one filter chain, with both profiles exercised in CI and authority loading behind the claim→store seam
  5. Permission catalog (code↔DB sync per ADR, deprecated-before-delete) and seed roles (Super Admin, Tenant Admin, User Manager, Auditor, Member) are in place with system roles locked

**Plans**: TBD

### Phase 4: Contract Pipeline & Frontend Foundation

**Goal**: Frontend consumes only a drift-gated generated client, and every frontend gate is live before the first feature folder exists
**Depends on**: Phase 3
**Requirements**: FOUND-06, FOUND-08, GATE-03, GATE-04, GATE-05, GATE-06, GATE-07
**Success Criteria** (what must be TRUE):

  1. Changing a backend endpoint without regenerating the client fails the contract-drift gate (deterministic OpenAPI 3.1 serialization → Orval TS client + TanStack Query hooks → tsc green)
  2. API errors return RFC 9457 ProblemDetail with i18n message + traceId, and Bean Validation rejects bad input at the boundary
  3. React 19 + Vite + TS strict shell builds with shadcn/ui + Tailwind 4, TanStack Query + Zustand, RHF + Zod; a wrong-direction import, cross-feature import, raw hex/px value, missing vi/en key, or axe-core WCAG 2.2 AA violation fails CI
  4. A first real endpoint round-trips end to end: backend → generated client → rendered screen in both vi and en

**Plans**: TBD
**UI hint**: yes

### Phase 5: IAM Feature Surface

**Goal**: Users and admins can fully manage authentication, accounts, roles, and audit through the app — each slice a `specs/NNN` dogfood unit
**Depends on**: Phase 4
**Requirements**: FOUND-13, AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, AUTH-08, USER-01, USER-02, USER-03, AUDIT-01, AUDIT-02
**Success Criteria** (what must be TRUE):

  1. User can log in/out (anti-enumeration, rate limit + visible cooldown), verify email, reset/change password (NIST 800-63B policy, Argon2id/bcrypt), and view/revoke sessions; refresh rotation + jti blacklist withstand the multi-tab race (single-flight + reuse grace window), no tokens in localStorage
  2. Admin can list/search users and drive the full lifecycle state machine (Invited → … → Deleted/Anonymized) with per-state login rules; sensitive ops require step-up auth + confirmation (type-to-confirm for delete) + mandatory audit
  3. Admin can edit the role×permission matrix (search, risk highlighting, diff-before-save) and view any user's effective permissions with provenance ("has X via role Y")
  4. Every auth/MFA/user-mgmt/permission/session/security event appears in the audit timeline with actor, before/after diff drawer, filters, and export of the filtered view
  5. First `task up` after clone yields a usable app via dev seed data (default admin, user/role fixtures); user can enroll MFA TOTP (QR, verify-before-activate, backup codes) and admin can invite users by email+role

**Plans**: TBD
**UI hint**: yes

### Phase 6: Ops Modules & Deploy Target

**Goal**: The app deploys to Kubernetes with hardened, scanned images and the operational leaf modules complete
**Depends on**: Phase 5
**Requirements**: FOUND-09, FOUND-11, GATE-08
**Success Criteria** (what must be TRUE):

  1. `storage` and `jobs` modules pass integration tests, including event-registry purge, token cleanup, and two-replica restart without duplicate effects
  2. Kustomize base/overlays (HPA, PDB, NetworkPolicy, probes, external secrets) deploy the Buildpacks BE image and multi-stage Nginx FE image to a local cluster
  3. Secret scan (bundle + Docker layers) and CVE scan on images run CI-blocking; Web Vitals report from the deployed frontend
  4. `EXTRACTION.md` documents the module-to-service playbook (SPI inbound → event/read-model → `@Externalized` → ingress routing)

**Plans**: TBD

### Phase 7: BPM bậc 1 (option ON, droppable)

**Goal**: Users work BPM tasks inside the app with unified identity, tenancy, and transactions — while BPM-off remains the clean, mandatory acceptance path
**Depends on**: Phase 6
**Requirements**: BPM-01, BPM-02, BPM-03, BPM-04, BPM-05, BPM-06, BPM-07, BPM-08, BPM-09, BPM-10
**Success Criteria** (what must be TRUE):

  1. Spike Q-006 passes its explicit exit criteria (Flowable 8 DDL→Flyway with table inventory asserted and engine auto-update off, shared JPA transaction manager rollback test, IDM disabled, tenant mapping incl. async-job propagation, upgrade runbook) BEFORE any other BPM work commits
  2. User can start processes and work the My Tasks inbox (claim/complete, due dates with overdue highlight, multi-instance, assignee/candidate assignment) and receives email notification on task assignment and overdue
  3. BPM admin can suspend/resume/delete instances, view/edit variables, reassign tasks, inspect failed jobs + stacktrace + retry, and view the diagram with executed-path highlight — admin views visible only to the BPM administrator role, task visibility by assignee/candidates
  4. Definitions deploy via `.bpmn` import/export and auto-deploy with versioning; deployments and instances carry tenant id, candidate groups map from JWT roles (no Flowable IDM), engine REST sits behind the app SecurityFilterChain, service tasks use SPI and the event bridge, and the tenancy isolation gate covers the BPM path; sample process joins the seed data
  5. With the BPM option OFF, build and all gates stay green (dynamic module-count assertions) — BPM-off remains the acceptance path

**Plans**: TBD
**UI hint**: yes

### Phase 8: Hardening & Acceptance

**Goal**: A fresh developer with Claude Code succeeds on day one, and the Giai đoạn 1 DoD holds against the finished system
**Depends on**: Phase 7 (or Phase 6 if BPM dropped)
**Requirements**: AGENT-07
**Success Criteria** (what must be TRUE):

  1. Fresh-clone Windows dry run: a new dev follows `ONBOARDING.md` + `specs/000-example` and merges a first PR within one day (onboarding pilot)
  2. `specs/000-example` shows the full S→P→I→V cycle in commit history with per-artifact annotations, and the FR-D12 smoke gate covers commands named in ONBOARDING.md and the tutorial
  3. 3-OS CI matrix is green and the guardrail metrics audit passes: zero gate-covered violations on main, `verify --fast` <60s, fast-vs-full divergence <5%
  4. A zero-context Claude Code session adds a module that passes all gates within ≤2 fix rounds (commit history is the dogfood evidence)

**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Dogfood Bootstrap & Enforcement | 11/12 | In Progress|  |
| 2. Backend Foundation | 0/TBD | Not started | - |
| 3. Tenancy & Security Seams | 0/TBD | Not started | - |
| 4. Contract Pipeline & Frontend Foundation | 0/TBD | Not started | - |
| 5. IAM Feature Surface | 0/TBD | Not started | - |
| 6. Ops Modules & Deploy Target | 0/TBD | Not started | - |
| 7. BPM bậc 1 (option ON, droppable) | 0/TBD | Not started | - |
| 8. Hardening & Acceptance | 0/TBD | Not started | - |
