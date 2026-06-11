# cowork-cli — AI-cowork Preset (Giai đoạn 1)

## What This Is

**cowork-cli** is an internal CLI that generates production-grade full-stack projects pre-configured for the **AI-cowork + Human-in-the-loop methodology with Claude Code**. This milestone delivers **Giai đoạn 1**: the complete `react-springboot-modulith` preset repository — a real, buildable monorepo (Spring Boot 4 Modulith backend + React 19 frontend + local/K8s infra) with machine-enforced guardrails, a full Claude Code pack (layered CLAUDE.md, skills, hooks), and the Specify→Plan→Implement→Verify workflow with hard human checkpoints. The CLI itself (Giai đoạn 2) comes in a later milestone; the preset is built as a real repo first, templated later.

## Core Value

A new project generated from this preset is **architecture-safe by machine**: zero gate-covered architecture violations and zero unapproved T3 (high-risk) changes can reach the main branch — quality does not depend on individual reviewers or agent prompting.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Group A — Application preset (FR-A01..A12):**
- [ ] Modulith 12 base modules (shared, appconfig, i18n, caching, observability, security, tenancy, audit, email, storage, jobs, usermgmt) with build-verified dependency DAG; +1 `bpm` module (option ON for this milestone)
- [ ] `task up` one-command local stack (PostgreSQL 16, Redis, Mailpit, MinIO, Keycloak, observability) on Win/macOS/Linux without WSL
- [ ] Event Publication Registry (JDBC) — no event loss, kill-listener test proves it
- [ ] Tenancy-ready single-tenant (tenant_id columns, Hibernate filter, TenantContext, isolation test)
- [ ] PostgreSQL-only persistence, Flyway per-module, Testcontainers, DTO boundary (MapStruct)
- [ ] RFC 9457 ProblemDetail + OpenAPI 3.1 → Orval TS client, contract-drift gate
- [ ] Observability: probes, structured JSON logs (MDC PII allowlist), OTel traces, Prometheus, Web Vitals
- [ ] Frontend foundation: React 19 + Vite + TS strict, shadcn/ui + Tailwind 4, TanStack Query + Zustand, RHF + Zod, i18n vi/en (per UIUX-FOUNDATION.md)
- [ ] K8s manifests (Kustomize, HPA, PDB, NetworkPolicy); Buildpacks BE + Nginx FE images
- [ ] Config source switch (ConfigMap default / Consul KV optional)
- [ ] EXTRACTION.md playbook; init script (`scripts/init.sh|ps1`)

**Group B — Security & IAM (FR-B01..B19, per security_authz_user_management_design.md):**
- [ ] AuthN: email-password login (anti-enumeration, rate limit), token rotation (refresh HttpOnly cookie, jti blacklist), email verification, password reset/change (NIST 800-63B policy), session/device management
- [ ] AuthZ: permission model `<module>.<resource>:<action>` + data scopes (own/team/department/tenant/all), permission catalog with sync, seed roles, `@RequirePermission` + cache + invalidation, authority seam (claim→store), multi-IdP (Spring Authorization Server / Keycloak 26 profile switch)
- [ ] User management: CRUD + lifecycle states, invite flow (Should), MFA TOTP + backup codes (Should), sensitive-action step-up + type-to-confirm, permission matrix UI with diff-before-save + effective-permissions viewer
- [ ] Audit log: full event coverage, before/after, timeline UI + diff drawer + export

**Group C — BPM bậc 1 (option ON this milestone; FR-C01..C07, C11):**
- [ ] Spike Q-006 first (blocker): Flowable 8 DDL→Flyway, shared JPA transaction manager, IDM off, tenant mapping — empirical confirmation before committing Group C phases
- [ ] Flowable 8 embedded engine (module 13 `bpm`), identity reuse from JWT roles, SPI/event module boundary, tenant-aware
- [ ] Tasks & inbox (start process, claim/complete, due dates), process admin (instances, variables, failed jobs + retry, diagram viewer), deploy definitions, BPM role split (admin/actor)
- [ ] Bậc 2–3 (modeler, form builder, DMN) NOT in this milestone

**Group D — Guardrails (FR-D01..D12, all CI-blocking + local):**
- [ ] Modulith verify, ArchUnit rules, frontend zones ESLint, design-token lint, axe-core a11y (WCAG 2.2 AA), i18n parity, contract drift, secret/CVE scan, tenancy isolation test, plan-compliance check (T3 paths → Approved-by + approver identity via hosting API), permission-declaration check, CLAUDE.md checks

**Group E — Claude Code pack & Methodology (FR-E01..E08):**
- [ ] CLAUDE.md 3 layers (root ≤200 lines, backend/frontend ≤150, CI size budget)
- [ ] 5 skills: new-module, new-feature, design-implement, plan, verify
- [ ] Hooks: T3 plan-gate PreToolUse deny, T4 command deny, strictness modes; spike Q-010 (hook stability matrix) before committing L1 enforcement
- [ ] T1 allowlist; S→P→I→V workflow with H1/H2/H3 checkpoints; specs/NNN artifacts; ONBOARDING.md + specs/000-example tutorial; error legibility + `verify --fast` <60s (spike Q-004 first)

### Out of Scope

- **CLI generator (Group F, Giai đoạn 2)** — next milestone; preset must be green as a real repo first (PRD §15 decision: preset-first)
- **Design workflow FR-E09 (Stitch + tokens.json pipeline)** — deferred; blocked on Q-003/Q-008; workflow degrades gracefully without it
- **BPM bậc 2–3** (in-app BPMN modeler, form builder, DMN editor) — largest effort block; bậc 1 only this milestone
- **AI features inside the generated app** (chatbot, LLM API) — product uses AI to BUILD software, not embed AI IN software (PRD §5.2)
- **Other AI runtimes** (Cursor, Codex, Copilot, Gemini) — Claude Code only; multi-runtime dilutes enforcement value
- **GraphQL, SSR/Next.js, message broker v1, H2, Redux/MUI** — locked anti-stack
- **Multi-tenant operations** — tenancy-ready seam only; full multi-tenant when a real customer needs it
- **Passkey/WebAuthn, external SSO/OIDC** — enterprise trigger
- **`cowork update`, second preset, service extraction implementation, hot-reload config, OSS distribution** — future triggers per PRD §5.3

## Context

- Greenfield monorepo at `D:\projects\modern-app-creator`. Source docs in repo: `requirements/PRD.md` (authoritative, Vietnamese), `product/methodology/AI-COWORK.md` (S→P→I→V, tiers T1–T4, checkpoints H1–H3, enforcement 2 layers), `product/cli/PRESET-SPEC.md` (preset contract — template-first: build real repo, templating is a later build step), `product/cli/CLAUDE-CODE-RUNTIME.md` (CLAUDE.md layering, skills, hooks spec), `product/frontend/UIUX-FOUNDATION.md` (app shell, data tables, IAM screens, forms, a11y, tokens), `product/security/security_authz_user_management_design.md` (1427-line full IAM design: data model, APIs, UI sitemap, Spring Security implementation, test strategy).
- **Dogfood rule (PRD §13.1):** the preset itself is built using its own methodology — S→P→I→V + hooks from Giai đoạn 1 start.
- Open questions / mandatory spikes blocking phase commitments (PRD §14): **Q-002** (git hosting branch-protection/approver API → blocks H3/L2 enforcement), **Q-004** (`verify --fast` <60s with Testcontainers → blocks guardrail commitment), **Q-006** (Flowable 8 integration → blocks BPM bậc 1), **Q-010** (Claude Code hook stability matrix → blocks L1 enforcement).
- ADRs required before implementing: FR-B11 permission sync mechanism, FR-B13 CI detection of undeclared permissions.
- Success metrics (PRD §3.3): new dev with Claude Code merges first PR ≤1 day (onboarding pilot); zero-context Claude Code adds a module passing all gates ≤2 fix rounds; 3-OS CI matrix green.

## Constraints

- **Tech stack (locked, with user override)**: **JDK 25 LTS** (user decision 2026-06-11 — supersedes both PRD's Java 21 and the earlier JDK 26 override, after research showed JDK 26 is non-LTS with a Sept 2026 update cliff and toolchain breakage), Spring Boot 4, Spring Modulith 2.0, PostgreSQL 16 (no H2), React 19, Tailwind 4, shadcn/ui, Flowable 8 (BPM) — anti-stack locked per PRD §5.2/§10.2
- **Runtime**: Claude Code is the only supported AI runtime — plan mode + PreToolUse hooks are load-bearing for enforcement
- **Platform**: dev on Win/macOS/Linux without WSL; CI matrix must cover all 3
- **Language**: PRD/product docs Vietnamese; technical specs/code English
- **License**: all components Apache-2.0/MIT-compatible; bpmn.io watermark kept per license; WCAG 2.2 AA mandatory
- **Process**: gate exceptions only via time-boxed waiver register approved by Architect/Tech Lead — no ad-hoc gate bypass

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Milestone scope = Giai đoạn 1 only (preset repo); CLI = next milestone | PRD §15: preset must be green before investing in the engine; template-first | — Pending |
| BPM bậc 1 INCLUDED in this milestone (option ON) | User decision 2026-06-11; spike Q-006 must pass before Group C phases commit | — Pending |
| Design workflow FR-E09 deferred | Blocked on Q-003/Q-008; degrades gracefully | — Pending |
| **JDK 25 LTS instead of Java 21** | User decision 2026-06-11 (initially JDK 26, reversed after research: 26 is non-LTS, EOL ~Sept 2026, Lombok/toolchain breakage on class file v70) | — Pending |
| Data scopes enforced in v1 = `own/tenant/all`; `team/department` schema-ready seam only | PRD defines no team/department entities — unenforceable/untestable in v1; matches tenancy-seam philosophy | — Pending |
| Added: dev seed data + BPM task email notification | Research P1 gaps — onboarding pilot/E2E depend on seed data; task notify is universal inbox expectation | — Pending |
| No user impersonation; no `cowork update` path in v1 | Explicit decisions (not silent omissions) per research — documented in preset docs | — Pending |
| H2-T3 plan approval = HARD, 2 layers (hook in-session + CI at-merge) | Prose-only rules get bypassed; CI is the runtime-agnostic floor | — Pending |
| CLAUDE.md 3 layers (root/backend/frontend), no per-module files | Matches Claude Code lazy-load mechanics; per-module rots | — Pending |
| AuthZ = permission+scope, authority seam claim→store | Scales with API growth; no filter-chain rewrite on upgrade | — Pending |
| Frontend = plain shadcn/ui, no admin meta-framework | Agent-extendable plain code; meta-frameworks fight custom UIs (matrix, BPM) | — Pending |
| No Consul/registry/gateway-app default; K8s DNS + ingress; extraction via playbook | Pre-K8s patterns; early SPI remoting breaks Modulith verify | — Pending |
| Dev persona = Claude Code beginner | Drives ONBOARDING + tutorial + error legibility scope | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-11 after initialization*
