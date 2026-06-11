# Feature Research

**Domain:** Production-grade full-stack scaffold/starter-kit preset + embedded IAM suite + optional embedded BPM (Flowable 8) + AI-agent (Claude Code) enforcement pack
**Researched:** 2026-06-11
**Confidence:** MEDIUM-HIGH overall (HIGH for scaffold/IAM/BPM expectations — corroborated by official docs and multiple product references; MEDIUM for agent-enforcement landscape — fast-moving space, partially based on observed patterns)

> Method note: `gsd-tools` research seam was unavailable in this environment; research used built-in WebSearch against official docs (JHipster, Camunda, Keycloak, GitHub Spec Kit, Kiro) and product comparisons. Confidence tiers assigned manually: official docs = HIGH, cross-verified community = MEDIUM, single-source or inferred = LOW/[Inference].

## Comparable Products Surveyed

| Category | Products | What they establish |
|----------|----------|---------------------|
| Full-stack generators | JHipster, start.spring.io | Baseline for "generated app with IAM + admin" expectations |
| Minimal typesafe scaffolds | create-t3-app | Counter-philosophy: minimal core, bring-your-own; proves "opinionated ≠ bloated" matters |
| SaaS boilerplates | MakerKit, ixartz/SaaS-Boilerplate, apptension | Commercial baseline for auth/teams/RBAC/audit/admin expectations |
| Spec-driven dev kits | GitHub Spec Kit, AWS Kiro | Methodology artifacts: constitution/steering, spec→plan→tasks→implement, agent hooks |
| Agent config packs | Claude Code community toolkits, CLAUDE.md+hooks starter kits | CLAUDE.md, PreToolUse enforcement, skills as standard pack contents |
| Embedded IAM reference | Keycloak admin + account console | What a "complete" user-management suite means to admins and end users |
| Task inbox reference | Camunda Tasklist, Flowable UI | What a "complete" BPM task inbox means to business users |

**Key market insight:** No surveyed product combines all four pillars (production scaffold + embedded IAM + embedded BPM + machine-enforced agent methodology). JHipster has scaffold+IAM but advisory-only conventions and no agent pack. Spec Kit/Kiro have methodology but no production stack and no hard enforcement floor (Kiro hooks are IDE-side only; Spec Kit is templates/prompts only — no CI gate). This is the product's open lane. [Inference — based on surveyed feature sets; no single source compares all four.]

## Feature Landscape

### Table Stakes (Users Expect These)

#### A. Scaffold / starter-kit core

| Feature | Why Expected | Complexity | PRD Coverage | Notes |
|---------|--------------|------------|--------------|-------|
| One-command local environment (DB, cache, mail, object store, IdP) | JHipster ships docker-compose; every SaaS kit has it; "clone → run" is the first 10 minutes | MEDIUM | FR-A02 `task up` ✅ | 3-OS no-WSL is stricter than competitors deliver |
| Working build + tests green on first clone | start.spring.io/JHipster/T3 all guarantee this; broken first build kills adoption | MEDIUM | DoD Giai đoạn 1 ✅ | Generation matrix (FR-F06) extends this to Giai đoạn 2 |
| Preconfigured CI pipeline | JHipster has ci-cd sub-generator; SaaS kits ship GitHub Actions | MEDIUM | Group D gates ✅ | Gates double as the CI pipeline |
| Auth working out of the box | JHipster (JWT/OAuth2/session), every SaaS kit | HIGH | FR-B01..B06 ✅ | |
| i18n scaffolded | JHipster ships it; PRD vi/en | LOW | FR-A08 + FR-D06 ✅ | Parity gate exceeds the norm |
| Deployment artifacts (Docker/K8s) | JHipster kubernetes sub-generator; expected for "production-grade" claim | MEDIUM | FR-A09 ✅ | |
| Rename/init script (placeholder → team identity) | Every template repo needs it; JHipster does it via generation instead | LOW | FR-A12 ✅ | Idempotency + auto-commit is above average |
| README / onboarding docs | Universal | LOW | FR-E07 ✅ | Tutorial-in-commit-history exceeds the norm |
| **Default users + dev seed data** | JHipster ships `admin`/`user` accounts and faker-seeded entities; `task up` → empty login screen with no way in feels broken; E2E tests need fixtures | LOW | **⚠ GAP** — FR-B12 seeds roles, but no FR seeds a usable admin account or demo data | Flag for requirements: dev-profile seed (default admin + sample users + sample BPM process when option ON) |
| Repeatable structure-scaffolding path (new entity/module/feature) | JHipster JDL/entity generator is its killer feature; users of generators expect "add a thing" to be mechanized | MEDIUM | FR-E02 skills `new-module`/`new-feature` ✅ | Agent skills replace codegen — different mechanism, same job-to-be-done |
| Upgrade story (or explicit statement of none) | JHipster has `jhipster upgrade` (famously painful); SaaS kits document merge-from-upstream | HIGH | Deliberately deferred (`cowork update` = Future) ✅ | Acceptable, but docs must set the expectation explicitly — silent absence reads as a defect |

#### B. Embedded IAM suite (benchmark: Keycloak consoles + SaaS-kit admin)

| Feature | Why Expected | Complexity | PRD Coverage | Notes |
|---------|--------------|------------|--------------|-------|
| Login/logout, anti-enumeration, rate limit | Baseline | MEDIUM | FR-B01 ✅ | |
| Token rotation, session list + revoke (self & admin) | Keycloak account console shows sessions; SaaS kits ship device management | MEDIUM | FR-B02, FR-B06 ✅ | |
| Email verification, password reset, NIST-aligned policy | Baseline | MEDIUM | FR-B03..B05 ✅ | |
| User CRUD + lifecycle + search/filter/bulk | Keycloak admin, JHipster user management | HIGH | FR-B16 ✅ | Lifecycle model is richer than JHipster's enable/disable |
| Roles + permission management UI | Baseline for admin suites | HIGH | FR-B12, FR-B18 ✅ | |
| Audit log of auth + admin events | JHipster ships an Audits screen (login success/failure); SaaS kits include audit schema; compliance demand | HIGH | FR-B19 ✅ | Before/after diff + export exceeds the norm |
| MFA (TOTP) + backup codes | Keycloak account console standard; SaaS kits include | MEDIUM | FR-B08 (Should) ✅ | Should-tier is defensible for internal v1 |
| Invite flow | SaaS-kit standard (email invite + role) | MEDIUM | FR-B07 (Should) ✅ | |
| **Self-service account/profile page** (edit display name/profile, change email with re-verification) | Keycloak account console = profile + password + 2FA + sessions + activity; every SaaS kit has "My account" | MEDIUM | **⚠ GAP** — PRD covers change-password (FR-B04), sessions (FR-B06), MFA (FR-B08), but no FR for profile editing or email change | Email-change-with-reverify is a security-sensitive flow that's easy to get wrong; decide explicitly (include minimal profile page, defer email change with rationale) |
| **Org structure to back team/department scopes** | FR-B10 grants scopes `own/team/department/tenant/all`, but no FR defines team/department entities, membership management, or UI | HIGH | **⚠ GAP — internal inconsistency** | Either (a) add minimal org-unit model + membership admin, or (b) restrict v1 enforced scopes to `own/tenant/all` with team/department as schema-ready seam. Option (b) matches the tenancy-seam philosophy. [Inference — gap derived from PRD cross-reading; verify against security design doc §data model] |
| Admin unlock/force-actions (unlock account, force password reset, reset MFA) | Keycloak admin standard | LOW | FR-B16 lifecycle + FR-B17 ✅ (verify unlock action is explicit) | |
| **User impersonation** | Keycloak ships it; SaaS boilerplates (MakerKit et al.) list it as a headline admin feature; support teams ask for it | MEDIUM | **⚠ GAP** — absent from PRD | Legitimate to exclude (high abuse risk), but make it an explicit anti-feature/future decision with rationale + audit-grade design notes, not a silent omission |
| Audit retention configuration | NFR §7 mentions retention "cấu hình được" but no FR owns it | LOW | ⚠ Partial — promote to an FR or acceptance criterion under FR-B19 | |

#### C. Embedded BPM task inbox (benchmark: Camunda Tasklist / Flowable UI)

| Feature | Why Expected | Complexity | PRD Coverage | Notes |
|---------|--------------|------------|--------------|-------|
| My Tasks inbox: claim/unclaim/complete, due dates, candidate groups | Core of every tasklist product | HIGH | FR-C05 ✅ | |
| Start process from UI | Baseline | MEDIUM | FR-C05 ✅ | |
| Task forms (rendered per task) | A task you can't complete with a form is useless | HIGH | FR-C05 + custom React view per form key ✅ (form-js builder = bậc 2) | |
| Sort/filter by due date, overdue highlight | Camunda tasklist baseline | LOW | FR-C05/§6.3.5 ✅ | |
| Process admin: instances, variables, failed jobs + retry, history, diagram viewer with executed-path highlight | Flowable/Camunda admin (Cockpit) baseline for operating processes | HIGH | FR-C06 ✅ | |
| Deploy/version definitions | Baseline | MEDIUM | FR-C07 ✅ | |
| BPM role split (admin vs actor), task visibility | Baseline | MEDIUM | FR-C11 ✅ | |
| **Task assignment notifications (email)** | Universal user expectation of inboxes — "I shouldn't have to poll My Tasks"; Camunda/Flowable commercial products notify | MEDIUM | **⚠ GAP** — email module exists (Group A) but no FR wires task-assigned/overdue notifications | Cheap to add bậc 1 (event listener → email module); highest-value missing BPM feature |
| Task comments | Standard in Camunda Tasklist UI; collaboration on tasks | MEDIUM | ⚠ Missing — acceptable bậc-2 deferral if documented | |
| Task attachments | Common in task applications (Camunda docs call document handling a common use case) | MEDIUM | ⚠ Missing — defensible deferral; storage module exists if needed later | |
| Delegation (delegate/resolve back to owner) | Camunda baseline; PRD has admin reassign only | LOW | ⚠ Missing — low cost via Flowable API; consider bậc 1.5 | |
| Saved filters / custom queues | Camunda filters are a flagship tasklist feature | MEDIUM | ⚠ Missing — defer to bậc 2; nuqs URL-state gives shareable filters as a cheap v1 substitute | |

#### D. Agent enforcement pack / methodology (benchmark: Spec Kit, Kiro, Claude Code community packs)

| Feature | Why Expected | Complexity | PRD Coverage | Notes |
|---------|--------------|------------|--------------|-------|
| Persistent project instructions (CLAUDE.md / steering / constitution) | Spec Kit constitution, Kiro steering files, CLAUDE.md are the de-facto standard; AGENTS.md entering Linux Foundation | LOW | FR-E01 ✅ | Size budget + CI smoke (FR-D12) exceeds the norm |
| Spec → plan → tasks → implement workflow with markdown artifacts | Spec Kit (/specify /plan /tasks /implement), Kiro (requirements/design/tasks.md) made this the expected shape | MEDIUM | FR-E05, FR-E06 ✅ | S→P→I→V maps 1:1 to market vocabulary |
| Packaged skills/commands for repo-specific operations | Claude Code packs ship skills/commands; Spec Kit ships slash commands | MEDIUM | FR-E02 ✅ | |
| Hooks reacting to agent actions | Kiro agent hooks, Claude Code PreToolUse — established pattern | MEDIUM | FR-E03 ✅ | |
| Pre-approved command allowlist | Standard Claude Code settings practice | LOW | FR-E04 ✅ | |
| Verify/feedback loop the agent can run itself | Kiro hooks run lint/tests on save; "agent self-corrects against deterministic checks" is the expected loop | HIGH | FR-E08, FR-D* ✅ | <60s budget is a measurable quality bar competitors don't state |
| Example/tutorial showing the workflow end-to-end | Spec Kit docs + sample flows; onboarding is the adoption gate | MEDIUM | FR-E07 ✅ | |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Two-layer hard enforcement of plan approval (PreToolUse deny + CI approver-identity check)** | No surveyed competitor enforces human approval by machine. Spec Kit = prompts/templates only; Kiro hooks = IDE-side, bypassable; JHipster = no methodology at all. The CI floor with approver-identity validation (anti self-approval, hosting-API-backed) is unique | HIGH | Core promise; blocked on Q-002/Q-010 spikes. This IS the product |
| **Architecture enforced as CI-blocking gates** (Modulith verify, ArchUnit, FE zones, contract drift, tenancy isolation) | JHipster generates conventions but never enforces them post-generation; Nx enforces FE boundaries only. Full-stack deterministic gate suite = "quality independent of reviewer/prompting" | HIGH | Depends on green preset first; gates are the regression suite |
| **Permission-declaration CI gate** (protected API without declared permission = fail) | Closes the classic drift between authz model and endpoints; no scaffold surveyed has it | MEDIUM | Needs ADR (FR-B13 detection mechanism) |
| **IAM beyond boilerplate RBAC:** permission+scope model, catalog with sync, matrix UI with diff-before-save, effective-permissions viewer with provenance | SaaS kits stop at role checkboxes; Keycloak's fine-grained admin is notoriously hard. An understandable, auditable permission UI is a real seller for internal platforms | HIGH | Highest UI complexity in Group B |
| **Embedded BPM option with unified identity/tenancy/transactions** | JHipster: no BPM. Flowable starters: engine only, no product-grade inbox/admin. "Check a box → process engine sharing your JWT roles, your Postgres, your transaction manager" is rare | HIGH | Gated on Q-006 spike; option OFF must stay the clean default |
| **Agent-first onboarding** (ONBOARDING.md + specs/000-example as annotated commit history; beginner persona) | Spec Kit/Kiro assume tool fluency; targeting Claude Code beginners with a guided first-PR-in-1-day path widens the addressable team | MEDIUM | Validated only by onboarding pilot — measure, don't assume |
| **Harness quality as a spec'd feature** (error legibility contract: rule + fix; `verify --fast` <60s; resume convention) | Treating agent feedback-loop latency and error actionability as acceptance criteria is novel; directly drives the "≤2 fix rounds" metric | MEDIUM | Q-004 spike gates the 60s promise |
| **A11y (WCAG 2.2 AA) + design-token lint as blocking gates** | Effectively absent from scaffold competitors; valuable for orgs with compliance needs | MEDIUM | axe-core covers ~30-50% of WCAG automatically [Unverified — commonly cited range]; gate + PR checklist combination is honest |
| **Tenancy-ready seam with machine-proof isolation test** | Retrofitting tenancy is the classic expensive rewrite; shipping the seam + proof test without multi-tenant ops overhead is a smart middle | MEDIUM | |
| **Event Publication Registry + kill-listener proof test** | "No event loss, proven by test" beats every starter kit's hand-waved eventing | MEDIUM | |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| In-app ops/admin screens (metrics, health, log viewer, config viewer à la JHipster admin) | JHipster ships them; "everything in one UI" feels complete | Duplicates the platform observability stack; ages badly; widens attack surface; JHipster's are demo-grade | Prometheus/Grafana/OTel stack already in preset (FR-A07); link out from app |
| Multi-agent-runtime support (Cursor, Copilot, AGENTS.md-generic) | Teams use mixed tools; Spec Kit advertises 30+ agents | Enforcement depth collapses to lowest common denominator — only Claude Code has plan-mode + PreToolUse deny; generic = advisory-only, which is the problem the product exists to solve | Claude Code-only (locked PRD decision); CI L2 remains the runtime-agnostic floor for non-Claude contributors |
| Admin meta-framework (react-admin, Refine) for IAM/BPM UIs | Faster initial CRUD screens | Fights custom UIs (permission matrix, BPM diagram viewer); agent can't extend opaque abstractions; locked anti-stack | Plain shadcn/ui composition (locked PRD decision) |
| Visual entity/CRUD generator (JDL-style DSL) | JHipster users expect it; "draw schema → get code" | Building a codegen DSL competes with the agent itself; generated CRUD drifts from hand-evolved code; maintenance black hole | Skills `new-module`/`new-feature` — agent generates against enforced patterns |
| Billing/subscriptions/Stripe (SaaS-kit staple) | Appears in every boilerplate feature list | Internal enterprise scaffold has no payer; dead code + CVE surface | Out of scope; document why in preset docs |
| Social login / magic links in v1 | SaaS-kit staple | Internal IdP context (Keycloak/SAS profile) makes them redundant; each adds attack surface + test matrix | Multi-IdP seam (FR-B15) is the extension point; external SSO/OIDC on enterprise trigger |
| Full BPMN modeler/form-builder/DMN in v1 | "BPM" implies drawing processes; competitors (Camunda Web Modeler) have it | Largest effort block (PRD acknowledges); properties panel must be hand-built; bậc 1 import/deploy covers the operate loop | bpmn-js viewer + .bpmn import/auto-deploy (FR-C07); modeler = bậc 2 on demand |
| Embedded AI features in generated app (chatbot, LLM calls) | Conflates "AI product" with "AI-built product"; stakeholders ask | Different product; runtime LLM deps, keys, cost, evals — none serve the scaffold's value | Locked out of scope (PRD §5.2); AI builds the software, isn't in it |
| `cowork update` template re-sync in v1 | JHipster upgrade exists; users fear divergence | Notoriously painful even for JHipster; preset isn't stable enough to promise merge semantics | Defer to trigger (≥2 generated projects + major preset change); state explicitly in docs |
| User impersonation (if added casually) | Support teams love it; Keycloak/SaaS kits ship it | Highest-abuse-risk IAM feature; subverts audit attribution unless impersonation-aware end-to-end | If ever added: dedicated permission, step-up, banner, dual-identity audit records; v1 = explicit deferral decision |
| CLI telemetry | Product wants usage data | Internal trust + privacy cost > insight value at this scale | Surveys + CI metrics of preset repo (PRD §9); revisit at OSS trigger (Q-009) |
| Hot-reload config, service registry/gateway app, message broker by default | "Enterprise checklist" pressure; JHipster ships Consul+gateway | Pre-K8s patterns; early SPI remoting breaks Modulith verify; broker adds ops weight with no v1 consumer | K8s DNS + ingress; config via rollout; `@Externalized` + EXTRACTION.md when a real trigger fires |

## Feature Dependencies

```
Group D gates (CI floor) ──requires──> Group A preset green (something to gate)
FR-D10 plan-compliance ──requires──> Q-002 (hosting API approver identity)
FR-E03 hooks (L1) ──requires──> Q-010 (hook stability matrix)
FR-E03 L1 ──backstopped-by──> FR-D10 L2 (CI floor works without Claude Code)
verify --fast contract (FR-E08) ──requires──> Q-004 (Testcontainers <60s)
FR-E08 error legibility ──enhances──> all Group D gates (agent self-correction ≤2 rounds)

Group B AuthZ scopes team/department (FR-B10) ──requires──> org-structure model [GAP — undefined]
FR-B18 matrix UI ──requires──> FR-B11 catalog ──requires──> FR-B09 permission model
FR-B13 permission gate (FR-D11) ──requires──> FR-B11 catalog sync (ADR pending)
FR-B19 audit UI ──requires──> audit event sink (Group A `audit` module)
MFA/invite (FR-B07/B08) ──requires──> core AuthN (FR-B01..B05) + email module

Group C (all) ──requires──> Q-006 spike (Flowable 8 DDL/tx/IDM-off/tenant)
FR-C05 inbox ──requires──> FR-C02 identity reuse (candidate groups ← JWT roles)
FR-C05 inbox ──requires──> FR-C07 deploy (need a process to run)
BPM task notifications [GAP] ──requires──> email module + FR-C05
FR-C04 tenant-aware ──requires──> FR-A04 tenancy seam
Seed/demo data [GAP] ──enhances──> task up first-run UX + Playwright E2E + onboarding pilot

BPM option OFF ──conflicts──> any hard dependency from base modules to bpm module
  (module 13 must be cleanly additive; gates/skills module-count dynamic per FR-A01)
```

### Dependency Notes

- **L1 hooks vs L2 CI:** L2 is the floor; L1 is UX. Phases can ship L2 first — L1 can lag behind Q-010 without breaking the core promise.
- **Org-structure gap blocks FR-B10 acceptance:** you cannot write the required "403 for wrong scope" tests for `team`/`department` without defining what a team is. Resolve in requirements before Group B phases are planned.
- **Seed data is a hidden dependency of three success metrics:** onboarding pilot (≤1 day needs a working app), E2E suite, and BPM acceptance (FR-C05 needs a deployable sample process).
- **BPM is additive-only:** every Group C feature must keep the BPM-off build green — the PRD makes BPM-off the only mandatory acceptance path of Giai đoạn 1/2.

## MVP Definition

### Launch With (v1 — Giai đoạn 1 DoD)

- [ ] Group A preset green on 3 OS — the substrate everything gates against
- [ ] Core AuthN + AuthZ + user management + audit (Group B Must) — table stakes for "production-grade" claim
- [ ] All Group D gates CI-blocking + local — the product's core promise (zero gate-covered violations)
- [ ] Claude Code pack + S→P→I→V + L2 plan-compliance (Group E, FR-E01..E08) — the differentiator
- [ ] **Add: dev seed data** (default admin, sample users, sample tenant fixtures) — unblocks first-run UX, E2E, pilot
- [ ] **Resolve: org-structure decision** — restrict v1 scopes to `own/tenant/all` (recommended) or add minimal team model
- [ ] BPM bậc 1 (option ON this milestone, post-Q-006) + **task-assigned email notification** (small addition, large expectation gap)

### Add After Validation (v1.x)

- [ ] Self-service profile page + email change with re-verification — trigger: first real team onboarded; Keycloak-account-console parity expectation
- [ ] MFA TOTP + invite flow (already Should-tier) — after core AuthN proves stable
- [ ] Task delegation + task comments — trigger: first real process in production use
- [ ] Saved task filters — trigger: inbox volume complaints
- [ ] Audit retention config surfaced as admin setting — trigger: compliance review

### Future Consideration (v2+)

- [ ] BPM bậc 2–3 (modeler, form builder, DMN) — largest effort block; per-trigger
- [ ] User impersonation — only with dual-identity audit design; explicit decision either way
- [ ] `cowork update`, second preset, multi-tenant ops, external SSO/OIDC, passkeys — existing PRD triggers stand; market data supports the deferrals

## Feature Prioritization Matrix (gaps + notable items only)

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Dev seed data (admin user + fixtures + sample process) | HIGH | LOW | P1 |
| Org-structure decision for team/department scopes | HIGH (unblocks FR-B10 acceptance) | LOW (decision) / HIGH (full model) | P1 — decide; recommend scope restriction |
| BPM task email notifications | HIGH | LOW-MEDIUM | P1 (when BPM ON) |
| Self-service profile / email change | MEDIUM | MEDIUM | P2 |
| Task delegation | MEDIUM | LOW | P2 |
| Task comments/attachments | MEDIUM | MEDIUM | P2-P3 |
| Saved task filters | LOW-MEDIUM | MEDIUM | P3 |
| User impersonation | MEDIUM (support) | MEDIUM-HIGH (done safely) | P3 / explicit deferral |
| Audit retention as FR | MEDIUM (compliance) | LOW | P2 |

## Competitor Feature Analysis

| Feature | JHipster | Spec Kit / Kiro | SaaS kits (MakerKit et al.) | Our Approach |
|---------|----------|-----------------|------------------------------|--------------|
| Architecture conventions | Generated, never enforced after | N/A | N/A | CI-blocking gates (Modulith/ArchUnit/zones) — enforced forever |
| Methodology artifacts | None | Constitution/steering + spec/plan/tasks, advisory | None | Same artifact shapes + two-layer HARD enforcement (hook + CI approver identity) |
| Agent integration | None (community AGENTS.md at best) | Multi-agent, shallow / Kiro IDE-locked | Some ship a CLAUDE.md | Claude Code-only, deep: 3-layer CLAUDE.md, 5 skills, deny-hooks, allowlist, hook-stability spike |
| IAM depth | Users+authorities+audits screens, role-only | N/A | Auth+teams+RBAC+impersonation+billing | Permission+scope model, catalog, matrix UI w/ diff, effective-permissions provenance, lifecycle, step-up — minus impersonation/billing (deliberate) |
| BPM | None | None | None | Optional embedded Flowable 8 + product-grade inbox/admin (unique in this category) |
| Admin ops screens | In-app metrics/health/logs | N/A | Super-admin dashboards | Anti-feature — platform observability instead |
| Entity scaffolding | JDL codegen | Agent implements from spec | CRUD templates | Agent skills against enforced patterns |
| Upgrade of generated code | `jhipster upgrade` (painful) | N/A | Merge from upstream | Deferred with explicit trigger; document loudly |

## Implications for Requirements (downstream consumer notes)

1. **Three P1 gaps to add to requirements:** dev seed data; org-structure decision for team/department scopes (recommend: restrict v1 enforced scopes to `own/tenant/all`, keep team/department as schema-ready enum values); BPM task email notification (option-gated with Group C).
2. **Two expectation-setting docs items:** state the no-upgrade-path policy and the no-impersonation decision explicitly in preset docs — both are silent omissions today that users of comparable products will probe.
3. **PRD groups otherwise validate cleanly against the market** — every Group A/B/D/E Must maps to a documented table-stake or genuine differentiator; no over-build detected except items already fenced as anti-stack.
4. **Self-service account page** is the most likely "fast follow" demand after first real team onboarding — keep it visible in v1.x planning.

## Sources

- JHipster: [Security](https://www.jhipster.tech/security/), [User entity](https://www.jhipster.tech/user-entity/), [entity-audit module](https://github.com/jhipster/generator-jhipster-entity-audit) — HIGH (official)
- GitHub Spec Kit: [repo](https://github.com/github/spec-kit), [docs](https://github.github.com/spec-kit/), [GitHub blog](https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/), [Microsoft dev blog](https://developer.microsoft.com/blog/spec-driven-development-spec-kit) — HIGH (official)
- AWS Kiro: [kiro.dev](https://kiro.dev/), [Steering docs](https://kiro.dev/docs/steering/), [AWS Builder Center](https://builder.aws.com/content/3DbBI7LQgNIcs6UUj7IPPvqFHOp/aws-kiro-the-agentic-ide-that-makes-specs-the-unit-of-work) — HIGH (official) / MEDIUM (builder articles)
- create-t3-app: [Introduction](https://create.t3.gg/en/introduction), [repo](https://github.com/t3-oss/create-t3-app) — HIGH (official)
- Camunda Tasklist: [product page](https://camunda.com/platform/tasklist/), [task applications intro](https://docs.camunda.io/docs/apis-tools/frontend-development/task-applications/introduction-to-task-applications/), [filters](https://docs.camunda.org/manual/7.5/webapps/tasklist/filters/) — HIGH (official)
- Keycloak: [Server Administration Guide](https://www.keycloak.org/docs/latest/server_admin/index.html) (impersonation, sessions, account console) — HIGH (official)
- SaaS boilerplates: [MakerKit](https://makerkit.dev/), [ixartz/SaaS-Boilerplate](https://github.com/ixartz/SaaS-Boilerplate), [apptension/saas-boilerplate](https://github.com/apptension/saas-boilerplate) — MEDIUM (product marketing, cross-verified across 3+ products)
- Claude Code hooks/packs: [Hooks reference](https://code.claude.com/docs/en/hooks) — HIGH (official); community toolkits — MEDIUM
- Internal: `requirements/PRD.md` §5–6, §14–15; `.planning/PROJECT.md` — HIGH (authoritative project docs)

---
*Feature research for: production scaffold + embedded IAM + embedded BPM + agent enforcement pack*
*Researched: 2026-06-11*
