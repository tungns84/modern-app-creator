# Requirements — cowork-cli Giai đoạn 1 (preset repo)

**Source:** `requirements/PRD.md` v1.0 (FR IDs cross-referenced) + research gaps (`.planning/research/FEATURES.md`)
**Milestone:** Giai đoạn 1 — preset `react-springboot-modulith` as a real, buildable repo. BPM option ON (bậc 1). CLI = next milestone.

## v1 Requirements

### Foundation — Application Preset (PRD Group A)

- [ ] **FOUND-01**: Backend builds as Spring Modulith with 12 base modules (shared, appconfig, i18n, caching, observability, security, tenancy, audit, email, storage, jobs, usermgmt) + module 13 `bpm`; dependency DAG declared per module and verified at build — violation = build fail; module-count assertions dynamic by BPM option (FR-A01)
- [x] **FOUND-02**: Developer can boot the full local stack (PostgreSQL 16, Redis, Mailpit, MinIO, Keycloak, observability) with one command `task up` on Win/macOS/Linux without WSL (FR-A02)
- [ ] **FOUND-03**: Cross-module events go through JDBC Event Publication Registry — republish on restart, bounded retry, old-record cleanup; kill-listener test proves no event loss AND no double-effect (FR-A03)
- [ ] **FOUND-04**: Every business table carries `tenant_id` with Hibernate filter + TenantContext + tenant-keyed cache; v1 resolves one default tenant from config; 2-tenant DB-level isolation test proves the seam (FR-A04)
- [ ] **FOUND-05**: Persistence uses PostgreSQL 16 only (no H2), Flyway migrations per-module, Testcontainers for integration tests, record DTOs + MapStruct at controller boundary (FR-A05)
- [ ] **FOUND-06**: API errors follow RFC 9457 ProblemDetail (i18n message + traceId); Bean Validation at boundary; OpenAPI 3.1 → Orval generates TS client + TanStack Query hooks (FR-A06)
- [ ] **FOUND-07**: App ships liveness/readiness probes, structured JSON logs with MDC PII allowlist, OTel traces browser→repository, Prometheus metrics, Web Vitals (FR-A07)
- [ ] **FOUND-08**: Frontend foundation: React 19 + Vite + TS strict, shadcn/ui + Tailwind 4, TanStack Query (server state) + Zustand (UI state, no tokens), RHF + Zod, i18n vi/en — per UIUX-FOUNDATION.md (FR-A08)
- [ ] **FOUND-09**: K8s manifests: Kustomize base/overlays, HPA, PDB, NetworkPolicy, probes, external secrets; Buildpacks BE image + multi-stage Nginx FE image (FR-A09)
- [ ] **FOUND-10**: Modules read typed properties only; config source switches by profile: env+ConfigMap/Secret (default) or Consul KV; config read at boot, changed via rollout (FR-A10)
- [ ] **FOUND-11**: Repo ships `EXTRACTION.md` module-to-service playbook (SPI inbound → event/read-model → `@Externalized` → ingress routing) (FR-A11)
- [x] **FOUND-12**: Tech Lead can run `scripts/init.(sh|ps1)` to rename `com.acme.app` → team values with auto-commit (FR-A12)
- [ ] **FOUND-13**: Repo ships dev seed data: default admin account, user/role fixtures, sample BPM process — first `task up` gives a usable app (research gap P1)

### Authentication (PRD Group B — AuthN)

- [ ] **AUTH-01**: User can log in/out with email-password; generic error + uniform timing (anti-enumeration); rate limit + account lock with visible cooldown (FR-B01)
- [ ] **AUTH-02**: Sessions use short-lived in-memory access token + HttpOnly/Secure/SameSite refresh cookie with rotation per refresh and jti revocation blacklist (Caffeine dev/Redis prod); no localStorage; single-flight refresh + reuse grace window against multi-tab race (FR-B02)
- [ ] **AUTH-03**: User must verify email via 24–72h token; block-unverified-login policy configurable (FR-B03)
- [ ] **AUTH-04**: User can reset password via one-time hashed 15–60' token with neutral responses; reset revokes all sessions; change-password requires current password (FR-B04)
- [ ] **AUTH-05**: Passwords hashed Argon2id/bcrypt; min 8–12, max ≥64; common/breached blocklist; no forced complexity/rotation; paste/autofill allowed (NIST 800-63B) (FR-B05)
- [ ] **AUTH-06**: User can view sessions (browser/OS/IP/last-active, "current" badge) and revoke one or all others (FR-B06)
- [ ] **AUTH-07**: Admin can invite user by email+role → Invited state → 3–7 day link → set password → Active; accept screen shows inviter + org (FR-B07 — after AuthN core)
- [ ] **AUTH-08**: User can enroll MFA TOTP (QR + manual key, verify-before-activate, backup codes with forced acknowledgment); MFA at login; admin MFA reset with audit + step-up (FR-B08 — after AuthN core)
- [ ] **AUTH-09**: IdP switches by profile between embedded Spring Authorization Server (Spring Security 7 coordinate) and Keycloak 26 — one codebase, one filter chain; JWKS rotation without restart; RS256/ES256 pinned (FR-B15)

### Authorization (PRD Group B — AuthZ)

- [ ] **AUTHZ-01**: Permissions follow `<module>.<resource>:<action>` with standardized actions; no hard-coded roles in business logic (FR-B09)
- [ ] **AUTHZ-02**: Each grant carries data scope; v1 enforces `own/tenant/all` (decision 2026-06-11: `team/department` remain schema-ready seam only, not enforced); service layer checks object-level access; 403 tests per wrong scope (FR-B10)
- [ ] **AUTHZ-03**: Permission catalog (code, name, module, action, risk level, status) with code↔DB sync; deprecated-before-delete rule; sync mechanism locked by ADR before implementation (FR-B11)
- [ ] **AUTHZ-04**: Roles = permission+scope sets; seeds: Super Admin, Tenant Admin, User Manager, Auditor, Member; system roles locked (FR-B12)
- [ ] **AUTHZ-05**: Enforcement via constants + `@RequirePermission` + per-user/role permission cache with invalidation on role/permission change and user disable (clear + revoke sessions) (FR-B13)
- [ ] **AUTHZ-06**: Authority loading goes through an open seam: claim-based (JWT) first, permission-store later — upgrade without touching SecurityFilterChain/`@PreAuthorize` (FR-B14)

### User Management (PRD Group B)

- [ ] **USER-01**: Admin can list users (search/filter: status, role, last-login; pagination; bulk actions) and manage full lifecycle: Invited → Pending Verification → Active → Password-Reset-Required → MFA-Required → Locked → Suspended → Deactivated → Deleted/Anonymized, with per-state login rules (FR-B16)
- [ ] **USER-02**: Sensitive admin ops (assign admin role, reset password/MFA, revoke sessions, delete user) require confirmation (type-to-confirm for delete) + step-up auth + mandatory audit (FR-B17)
- [ ] **USER-03**: Admin can edit role×permission matrix (module groups, sticky header, search, only-granted filter, risk highlighting, diff-before-save) and view any user's effective permissions with provenance ("has X via role Y") (FR-B18)

### Audit (PRD Group B)

- [ ] **AUDIT-01**: System records auth, MFA, user-mgmt, permission-change, session, and security events with actor, action, resource, before/after, IP, user agent, tenant — via `audit` event sink (FR-B19)
- [ ] **AUDIT-02**: Admin can browse audit timeline with filters, before/after diff drawer, and export of filtered view (FR-B19)

### BPM bậc 1 (PRD Group C — option ON this milestone)

- [ ] **BPM-01**: Spike Q-006 passes with explicit exit criteria before other BPM work commits: Flowable 8 DDL extracted to Flyway (engine auto-update off, table inventory asserted), shared JPA transaction manager (rollback test), IDM disabled, tenant mapping, async-job tenant propagation, upgrade runbook (PRD §14)
- [ ] **BPM-02**: Flowable 8 embedded in-process as module 13 `bpm`; engine tables in same PostgreSQL via Flyway; process + business commit atomically (FR-C01)
- [ ] **BPM-03**: No Flowable IDM — candidate groups map from JWT roles; engine REST goes through app SecurityFilterChain (FR-C02)
- [ ] **BPM-04**: Service tasks call other modules via SPI; process events bridge to event registry; `bpm` obeys module DAG (FR-C03)
- [ ] **BPM-05**: Deployments + process instances carry tenant id (FR-C04)
- [ ] **BPM-06**: User can start processes and work My Tasks inbox: claim/complete, due dates with overdue highlight, multi-instance; assignment by assignee/candidate users+groups (FR-C05)
- [ ] **BPM-07**: BPM admin can suspend/resume/delete instances, view/edit variables, reassign tasks, inspect failed jobs + stacktrace + retry, view history, see diagram with executed-path highlight (FR-C06)
- [ ] **BPM-08**: Definitions deploy via import/export `.bpmn` + auto-deploy from resources; each deploy creates a version (FR-C07)
- [ ] **BPM-09**: Two BPM roles enforced: BPM administrator (admin views) vs process actor; task visibility by assignee/candidates (FR-C11)
- [ ] **BPM-10**: User receives email notification on task assignment and overdue (wired through `email` module) (research gap P1)

### Guardrail Gates (PRD Group D — all CI-blocking + locally runnable)

- [ ] **GATE-01**: Modulith verify gate — acyclic DAG, declared deps only; module count dynamic by BPM option (FR-D01)
- [ ] **GATE-02**: ArchUnit gate — no field injection, no bare `@Scheduled`, no native query outside wrapper, no `@Transactional` private, no entity across controller boundary (FR-D02)
- [ ] **GATE-03**: Frontend zones gate — ESLint blocks wrong-direction imports (`shared → features → app`), no cross-feature (FR-D03)
- [ ] **GATE-04**: Design-token lint gate — no raw hex/px in JSX/CSS; tokens↔Tailwind drift check (FR-D04)
- [ ] **GATE-05**: A11y gate — axe-core on build, WCAG 2.2 AA (FR-D05)
- [ ] **GATE-06**: i18n parity gate — every key present in vi + en (FR-D06)
- [ ] **GATE-07**: Contract-drift gate — backend OpenAPI → regen client → tsc green; deterministic spec serialization (FR-D07)
- [ ] **GATE-08**: Secret scan (bundle + Docker layers) + CVE scan on images (FR-D08)
- [ ] **GATE-09**: Tenancy isolation gate — cross-tenant read blocked with 2 seeded tenants, covering HTTP + async/jobs + BPM paths (FR-D09)
- [x] **GATE-10**: Plan-compliance gate — diff touching T3 paths requires `specs/NNN-*/plan.md` with valid `Approved-by:`; approver identity verified via Git hosting API/PR review metadata (CODEOWNERS-based, no self-approval, survives squash/rebase/bots); mechanism confirmed by Q-002 (FR-D10)
- [ ] **GATE-11**: Permission-declaration gate — protected API without declared permission = CI fail; detection mechanism locked by ADR (FR-D11)
- [x] **GATE-12**: CLAUDE.md checks — size budgets (root ≤200, tree ≤150 lines); smoke test that commands named in CLAUDE.md/ONBOARDING run (FR-D12)

### Claude Code Pack & Methodology (PRD Group E)

- [x] **AGENT-01**: Three-layer CLAUDE.md (root + backend/ + frontend/, lazy-loaded, no duplication) within size budgets (FR-E01)
- [x] **AGENT-02**: Five skills shipped: `new-module` (DAG-correct scaffold + count bump + plan template), `new-feature` (zone-correct folder + i18n keys), `design-implement`, `plan` (emits plan.md with tier), `verify` (runs gates, summarizes failures by rule) (FR-E02)
- [x] **AGENT-03**: PreToolUse hooks deny Write/Edit on T3 paths without approved plan (explaining message + next step) and deny T4 command patterns; `strict` mode extends gate to T2; hook stability matrix per pinned Claude Code version confirmed by spike Q-010 (FR-E03)
- [x] **AGENT-04**: T1 allowlist pre-approves daily commands (`task *`, `./mvnw verify`, `npm run *`) — zero ceremony (FR-E04)
- [x] **AGENT-05**: S→P→I→V workflow operative with H1 (intent), H2 (plan approval — HARD for T3 via hook+CI), H3 (diff review — branch protection + CODEOWNERS for security/tenancy); tiers T1–T4 documented and enforced (FR-E05)
- [x] **AGENT-06**: Spec artifacts `specs/NNN-feature/{spec,plan,tasks}.md`; branch named after spec; commits cite REQ-IDs; same-PR spec reconciliation rule (FR-E06)
- [ ] **AGENT-07**: `ONBOARDING.md` (day-one path) + `specs/000-example/` walked through full S→P→I→V in commit history with per-artifact annotations (FR-E07)
- [ ] **AGENT-08**: Harness quality: gate errors name rule + fix (agent self-corrects ≤2 rounds); resume convention; `verify --fast` <60s separate from `verify --full` — feasibility + gate-set defined by spike Q-004 (FR-E08)
- [x] **AGENT-09**: Dogfood from start: this preset repo itself is built via S→P→I→V with hooks active; commit history is the evidence (PRD §13.1, DoD)

## v2 Requirements (deferred)

- **CLI-01..06**: cowork-cli generator (PRD Group F — Giai đoạn 2 milestone)
- **DESIGN-01**: Design workflow FR-E09 (DESIGN.md + tokens.json + Stitch lint + MCP) — blocked on Q-003/Q-008
- **BPM-T2/T3**: In-app BPMN modeler, form builder, DMN editor (FR-C08..C10)
- **AUTHZ-scope**: `team/department` scope enforcement + org-structure entities/membership management
- **PROFILE-01**: Self-service account/profile page with email-change re-verification (likely fast-follow)
- **BPM-UX**: Task delegation, comments, attachments, saved inbox filters

## Out of Scope

- AI features inside the generated app (chatbot, LLM calls) — product uses AI to build software, not embed it (PRD §5.2)
- Other AI runtimes (Cursor, Codex, Copilot, Gemini) — Claude Code only; multi-runtime dilutes enforcement
- GraphQL, SSR/Next.js, message broker v1, H2, Redux, MUI, admin meta-frameworks — locked anti-stack
- Multi-tenant operations — seam only until a real multi-tenant customer exists
- Passkey/WebAuthn, external SSO/OIDC — enterprise trigger
- User impersonation — explicit decision: abuse risk outweighs admin convenience; documented in preset docs
- `cowork update` re-apply path — explicit decision: no upgrade path in v1; documented loudly in preset docs
- Hot-reload config, service extraction implementation (playbook only), second preset, OSS distribution — future triggers (PRD §5.3)

## Traceability

Mapped by roadmap 2026-06-11. Coverage: 64/64 v1 requirements → 8 phases (every requirement in exactly one phase).

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 2 | Pending |
| FOUND-02 | Phase 1 | Complete |
| FOUND-03 | Phase 2 | Pending |
| FOUND-04 | Phase 3 | Pending |
| FOUND-05 | Phase 2 | Pending |
| FOUND-06 | Phase 4 | Pending |
| FOUND-07 | Phase 2 | Pending |
| FOUND-08 | Phase 4 | Pending |
| FOUND-09 | Phase 6 | Pending |
| FOUND-10 | Phase 2 | Pending |
| FOUND-11 | Phase 6 | Pending |
| FOUND-12 | Phase 1 | Complete |
| FOUND-13 | Phase 5 | Pending |
| AUTH-01 | Phase 5 | Pending |
| AUTH-02 | Phase 5 | Pending |
| AUTH-03 | Phase 5 | Pending |
| AUTH-04 | Phase 5 | Pending |
| AUTH-05 | Phase 5 | Pending |
| AUTH-06 | Phase 5 | Pending |
| AUTH-07 | Phase 5 | Pending |
| AUTH-08 | Phase 5 | Pending |
| AUTH-09 | Phase 3 | Pending |
| AUTHZ-01 | Phase 3 | Pending |
| AUTHZ-02 | Phase 3 | Pending |
| AUTHZ-03 | Phase 3 | Pending |
| AUTHZ-04 | Phase 3 | Pending |
| AUTHZ-05 | Phase 3 | Pending |
| AUTHZ-06 | Phase 3 | Pending |
| USER-01 | Phase 5 | Pending |
| USER-02 | Phase 5 | Pending |
| USER-03 | Phase 5 | Pending |
| AUDIT-01 | Phase 5 | Pending |
| AUDIT-02 | Phase 5 | Pending |
| BPM-01 | Phase 7 | Pending |
| BPM-02 | Phase 7 | Pending |
| BPM-03 | Phase 7 | Pending |
| BPM-04 | Phase 7 | Pending |
| BPM-05 | Phase 7 | Pending |
| BPM-06 | Phase 7 | Pending |
| BPM-07 | Phase 7 | Pending |
| BPM-08 | Phase 7 | Pending |
| BPM-09 | Phase 7 | Pending |
| BPM-10 | Phase 7 | Pending |
| GATE-01 | Phase 2 | Pending |
| GATE-02 | Phase 2 | Pending |
| GATE-03 | Phase 4 | Pending |
| GATE-04 | Phase 4 | Pending |
| GATE-05 | Phase 4 | Pending |
| GATE-06 | Phase 4 | Pending |
| GATE-07 | Phase 4 | Pending |
| GATE-08 | Phase 6 | Pending |
| GATE-09 | Phase 3 | Pending |
| GATE-10 | Phase 1 | Complete |
| GATE-11 | Phase 3 | Pending |
| GATE-12 | Phase 1 | Complete |
| AGENT-01 | Phase 1 | Complete |
| AGENT-02 | Phase 1 | Complete |
| AGENT-03 | Phase 1 | Complete |
| AGENT-04 | Phase 1 | Complete |
| AGENT-05 | Phase 1 | Complete |
| AGENT-06 | Phase 1 | Complete |
| AGENT-07 | Phase 8 | Pending |
| AGENT-08 | Phase 2 | Pending |
| AGENT-09 | Phase 1 | Complete |

**Cross-phase notes (requirement owned by one phase, touched by another):**

- FOUND-01: module set completes (13th `bpm` module) in Phase 7; dynamic count assertion lands in Phase 2
- FOUND-07: Web Vitals (frontend piece) finalizes with the deployed FE in Phase 6; backend observability is Phase 2
- FOUND-13: sample BPM process added to seed data in Phase 7; core seed data is Phase 5
- GATE-09: BPM path coverage extends in Phase 7; gate wires in Phase 3
- GATE-12 / AGENT-02: smoke gate and skills extend to ONBOARDING/tutorial and get dogfood-validated in Phases 2–8; ship in Phase 1
- AGENT-08: verify-fast budget re-audited in Phase 8; first met in Phase 2

---
*Defined: 2026-06-11. Decisions: JDK 25 LTS; BPM bậc 1 ON; scopes v1 = own/tenant/all; +seed data, +BPM notify; MFA/invite in v1 after AuthN core.*
*Traceability mapped: 2026-06-11 by roadmap (8 phases).*
