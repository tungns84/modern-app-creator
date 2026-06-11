# Phase 1: Dogfood Bootstrap & Enforcement - Research

**Researched:** 2026-06-11
**Domain:** Claude Code hook enforcement, GitHub PR-review-API CI gates, cross-platform local dev stack (Taskfile + Compose), repo bootstrap conventions
**Confidence:** MEDIUM-HIGH overall (hook mechanics MEDIUM — exactly why Q-010 exists; GitHub API/CI MEDIUM-HIGH; local stack HIGH)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Git hosting & CI (Q-002 input)
- **D-01:** Hosting = **GitHub.com**. GitHub Actions, branch protection, PR review API. Q-002 scope narrows to: validate the GitHub mechanism empirically (squash/rebase/bot/self-approval cases).
- **D-02:** Approver identity mechanism (GATE-10): **PR review API is the source of truth**. CI check: diff touches T3 paths → require `specs/NNN-*/plan.md` exists on branch AND PR has approval from a CODEOWNER who is not the PR author. The `Approved-by:` line in plan.md is an audit trail, NOT the proof — it cannot be forged into authorization. Survives squash/rebase because verification binds to the PR, not commits.
- **D-03:** Merge strategy = **merge commit** (no squash). Preserves the S→P→I→V per-commit evidence on main — required by AGENT-09 (commit history is the dogfood evidence) and the Phase 8 tutorial (`specs/000-example`).
- **D-04:** 3-OS verification of `task up`: **ubuntu leg runs real `task up` + healthchecks; Windows/macOS legs run container-free smoke** (task binary install, `task --list`, compose config validation, JDK 25 toolchain smoke). Real `task up` on Win/mac is verified manually once during Phase 1 and recorded in the spike report. Reason: GitHub-hosted macOS runners have no Docker; Windows runners can't run Linux containers reliably.

#### Bootstrap paradox (dogfood from commit 1)
- **D-05:** **Manual dogfood from commit 1.** Hand-written `specs/NNN/spec.md` + `plan.md` from the first Phase 1 deliverable; PR review acts as the gate until automation exists. Enforcement ratchets: CI gate comes online → CI enforces; hooks come online → hooks enforce. No grace window, no backfill.
- **D-06:** Two planning systems, **parallel with separated roles, no cross-links**: `.planning/` = GSD (how WE build the preset; never ships); `specs/NNN-*/` = preset methodology artifacts (what gates read; ships in template).
- **D-07:** **ADRs in `docs/adr/`** (ships, constitution per AI-COWORK §2). **Spike reports in `.planning/spikes/`** (meta, not shipped). Consequence: ADRs must summarize spike evidence INLINE — never link into `.planning/` (dead link at templating).
- **D-08:** Hooks turn on for this repo **immediately after Q-010 passes** — the rest of Phase 1 runs under real enforcement.
- **D-09:** **One spec per T3 deliverable**, numbering starts at `001` (`000-example` reserved for the Phase 8 tutorial). Suggested units: 001-hooks-enforcement, 002-plan-compliance-ci, 003-local-stack, 004-init-script, 005-claude-pack (planner may adjust grouping, not granularity philosophy).
- **D-10:** Solo dev + no-self-approval rule: **time-boxed waiver register**. Gate is built to full spec (no self-approval); self-approval is waived via the waiver register until a second person joins. The waiver register itself is a Phase 1 artifact (constraint already mandates it for gate exceptions).
- **D-11:** Claude Code version pin (Q-010): **SessionStart hook warns on mismatch** between recorded tested version and `claude --version`. Warn, not block — L1 is best-effort, CI L2 is the floor.

#### Repo layout
- **D-12:** Preset monorepo lives at the **root of this repo** (backend/, frontend/, infra/, docs/, specs/, Taskfile, .claude/, .github/ at root). `.planning/`, `product/`, `requirements/` are meta — excluded at templating (Giai đoạn 2). Real repo == generated repo in paths: hook matchers, CI paths, T3 list transfer verbatim.
- **D-13 (PO decision):** Preset root CLAUDE.md is **preset-owned and only generated at preset initialization** — no static template CLAUDE.md maintained in the working tree. The dev (GSD) root `CLAUDE.md` stays untouched.
- **D-14:** GATE-12/AGENT-01 therefore use **CI render-then-check**: Phase 1 authors the SOURCE of the preset root CLAUDE.md (template source with placeholders); CI renders it with sample values, then asserts ≤200 lines + command smoke on the rendered output.
- **D-15:** `backend/CLAUDE.md` + `frontend/CLAUDE.md` **live in-place** with literal `com.acme.app` values (no live conditional branches in Giai đoạn 1: designWorkflow OFF/deferred, strictness fixed `standard`, BPM fixed ON). `scripts/init` renames literals; placeholder-ization is a Giai đoạn 2 templating concern. Size budget ≤150 lines each, gated directly.

#### Spike failure policy & local stack
- **D-16:** Q-010 failure posture: **CI-only floor**. If hooks prove unstable on the pinned version, L1 downgrades to best-effort + warn, limitation documented in spike report + ADR, milestone continues. Core value holds via CI L2.
- **D-17:** **Valkey 8** (`valkey/valkey:8`) instead of Redis — BSD-3, wire-compatible, Lettuce unchanged. One-line ADR in Phase 1 recording license rationale.
- **D-18:** Local observability = **`grafana/otel-lgtm` single image** in `task up`. Discrete components belong to K8s overlays (Phase 6).
- **D-19:** Q-004 pre-defined direction: **`verify --fast` = static-only, no containers** (compile + ArchUnit + Modulith verify + lint + pure unit tests); Testcontainers only in `verify --full`. Spike confirms actual timings; fast-vs-full divergence (<5%) measured in Phase 8.

#### Spike sequencing
- **D-20:** All 4 spikes run **upfront, in parallel, as the first wave** of Phase 1. Every later deliverable stands on spike results.

#### Five skills depth
- **D-21:** **`plan` + `verify` implemented fully in Phase 1** (the dogfood loop needs them immediately; `verify` runs whatever gates exist and grows with phases). **`new-module`, `new-feature`, `design-implement` ship as skeleton SKILL.md + contract** (inputs/outputs, tier declaration); completed in Phases 2/4 when real trees exist to validate against. Matches the REQUIREMENTS.md cross-phase note (skills dogfood-validated in Phases 2–8).

#### T3 path inventory
- **D-22:** **Single shared config file** for the T3 path list (e.g., `.cowork/tiers.json` or equivalent — exact name/format planner's choice) read by BOTH the hook and the CI gate — one source of truth, no drift. Full list per AI-COWORK §5 from day 1 (pom.xml, package.json, security/**, tenancy/**, .github/**, gate configs, CLAUDE.md/constitution files, new module dirs); not-yet-existing paths simply never match. The config file itself is T3 (gate config).

#### Init script (FOUND-12)
- **D-23:** `scripts/init.(sh|ps1)`: **flags + prompt fallback** (`--group-id`, `--artifact-id`, `--project-name`; missing flag → prompt). Renames package dirs + replaces literals across the tree (excluding binary globs), then auto-commits one conventional commit. **Idempotent check**: second run detects rename already done and exits clearly. **CI parity test**: run `.sh` on ubuntu and `.ps1` on windows, compare resulting trees.

### Claude's Discretion
- `.claude/` dev-vs-preset separation mechanics (suggested default: `.claude/settings.json` committed = preset hooks T3/T4 + T1 allowlist + 5 skills; `.claude/settings.local.json` gitignored = dev/GSD personal) — decide during planning of the claude-pack spec.
- Exact templating exclusion-list mechanism (manifest file vs convention) — Giai đoạn 2 concern; Phase 1 only needs the meta dirs known: `.planning/`, `product/`, `requirements/`, dev root `CLAUDE.md`, `.code-review-graph/`.
- specs/NNN exact slugs and grouping of Phase 1 deliverables into specs.
- GSD meta-commits (`.planning/`-only changes) are not T3 paths — no spec required for them.

### Deferred Ideas (OUT OF SCOPE)
- Templating/extraction mechanics (`repo → presets/{id}/template/`, exclusion manifest, placeholder-ization of com.acme.app and CLAUDE.md sources) — Giai đoạn 2 milestone.
- `strict` mode hook matcher extension to T2 paths — ships as scaffold option config, exercised later.
- Keycloak realm configuration depth in `task up` — container present from Phase 1 (FOUND-02 lists it), but realm/IdP wiring is Phase 3 scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FOUND-02 | `task up` boots full local stack (PG16, Redis→Valkey, Mailpit, MinIO, Keycloak, observability) on 3 OS without WSL | Standard Stack (images + healthchecks), Pattern 4 (Taskfile + compose `--wait`), Pitfalls 6–7, Code Example 4 |
| FOUND-12 | `scripts/init.(sh\|ps1)` renames `com.acme.app` → team values with auto-commit | Pattern 6 (init parity design), Pitfall 8, Validation map |
| GATE-10 | Plan-compliance CI gate: T3 diff → plan.md + `Approved-by:` + hosting-API approver identity | Pattern 3 (gate algorithm), Code Examples 2–3, Pitfalls 3–5, Q-002 spike scope |
| GATE-12 | CLAUDE.md size budgets + command smoke in CI | Pattern 5 (render-then-check), Pitfall 9 |
| AGENT-01 | Three-layer CLAUDE.md within size budgets | Pattern 5, D-13/D-14/D-15 mechanics |
| AGENT-02 | Five skills (`plan`+`verify` full; 3 skeletons per D-21) | Pattern 7 (skills layout), CLAUDE-CODE-RUNTIME.md §2 |
| AGENT-03 | PreToolUse hooks: T3 plan-gate deny + T4 command deny; Q-010 stability matrix | Pattern 1–2 (hook architecture), Code Example 1, Pitfalls 1–2, Q-010 spike scope |
| AGENT-04 | T1 allowlist (`task *`, `./mvnw verify`, `npm run *`) zero ceremony | Pattern 2 (settings.json permissions), Code Example 1 |
| AGENT-05 | S→P→I→V operative with H1/H2/H3; tiers T1–T4 documented + enforced | Architecture map; AI-COWORK.md §5 transfers verbatim; enforcement ratchet (D-05/D-08) |
| AGENT-06 | `specs/NNN-feature/{spec,plan,tasks}.md` convention; branch naming; REQ-ID commits | Pattern 8 (specs convention), D-09 |
| AGENT-09 | Dogfood from start; commit history is the evidence | D-03 merge commits, D-05 ratchet narrative, Validation Architecture |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

Actionable directives extracted from `./CLAUDE.md` (dev root) that bind this phase:

- **JDK 25 LTS** is the governing toolchain decision (user decision 2026-06-11; supersedes the JDK 26 text embedded in older research tables in the same file). Toolchain smoke spike targets 25, not 26.
- Locked stack: Spring Boot 4, Spring Modulith 2.0, PostgreSQL 16 (no H2), React 19, Tailwind 4, shadcn/ui, Flowable 8; anti-stack locked (no GraphQL/SSR/H2/Redux/MUI).
- Taskfile (go-task) **v3.51.1** pinned; install via winget/brew/apt + pinned version check in `scripts/init`.
- Valkey-vs-Redis decided via 1-line ADR (CONTEXT D-17 resolves: Valkey 8).
- CI: GitHub Actions, matrix `[windows-latest, ubuntu-24.04, macos-latest]`; Testcontainers/Docker jobs on ubuntu leg only.
- Claude Code is the only AI runtime; plan mode + PreToolUse hooks are load-bearing.
- Language rule: PRD/product docs Vietnamese; technical specs/code English.
- License: Apache-2.0/MIT-compatible components only; process: gate exceptions only via time-boxed waiver register.
- **GSD workflow enforcement:** file changes in this repo go through GSD commands (`/gsd-execute-phase` etc.) — the new preset hooks must not break the GSD dev loop (see Pattern 2: dev/preset settings separation, and the Claude's-Discretion item).

## Summary

Phase 1 builds **enforcement infrastructure, not application code**: PreToolUse hooks (L1), a plan-compliance CI gate (L2), CLAUDE.md checks, the local Compose stack behind `task up`, the init script, and the spec/skill/ADR conventions — all dogfooded from commit 1 with a deliberate enforcement ratchet (manual specs → CI live → hooks live). The four spikes run as the first wave; everything else consumes their results.

The technical domain splits cleanly into five tiers (see Architectural Responsibility Map): Claude Code session (hooks, settings, skills), GitHub platform config (rulesets, CODEOWNERS, merge methods), GitHub Actions CI (the runtime-agnostic enforcement floor), the local dev machine (Taskfile + Docker Compose), and repo artifacts (specs, ADRs, tiers config, CLAUDE.md sources). The single most important architecture rule, confirmed by both project research and public Claude Code issue history: **CI L2 is the only enforcement layer allowed to carry the core-value claim; L1 hooks are UX**. Hook scripts must be written fail-closed (emit deny JSON from inside the script on internal error, never rely on non-zero exit codes which are non-blocking) and cross-platform (zero-dependency Node invoked as `node <script>`, never bash-isms).

The GitHub side is simpler than the PRD feared: the PR reviews REST API exposes exactly what D-02 needs (`user.login`, `state`, `submitted_at` per review, paginated), GitHub natively forbids PR authors approving their own PRs, and modern **rulesets** provide require-code-owner-review, dismiss-stale-approvals, and merge-method restriction declaratively. The recommended split: platform rulesets enforce *who may approve*; the CI gate enforces *artifact presence* (plan.md + `Approved-by:` audit line) and re-verifies ≥1 APPROVED non-author review via API as defense in depth. The known trap is event-trigger timing (`pull_request` runs don't re-fire when an approval lands) — the gate must also trigger on `pull_request_review`.

**Primary recommendation:** Build everything as zero-dependency Node scripts sharing one tier-matching module read from `.cowork/tiers.json`; let GitHub rulesets do identity enforcement; treat the four spikes as Wave 0 with written exit criteria lifted from this document's pitfall list.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| T3 plan-gate deny (in-session) | Claude Code session (hooks) | — | `PreToolUse` is the only pre-write interception point; best-effort by design (D-16) |
| T4 command deny | Claude Code session (hooks) | — | Bash matcher pattern check; human executes T4 |
| T1 zero-ceremony allowlist | Claude Code session (settings.json permissions) | — | `permissions.allow` rules, no hook involvement |
| Claude Code version pin warning | Claude Code session (SessionStart hook) | — | D-11: warn-not-block |
| Plan-compliance enforcement (the floor) | GitHub Actions CI | GitHub platform (required status check) | Runtime-agnostic L2; required check makes it blocking |
| Approver identity (CODEOWNER, non-author) | GitHub platform (rulesets + CODEOWNERS) | GitHub Actions CI (API re-check) | GitHub natively blocks self-approval and enforces code-owner review; CI re-verifies via reviews API per D-02 |
| Merge-strategy enforcement (merge commits only) | GitHub platform (repo settings/ruleset) | — | D-03; disable squash/rebase at repo level |
| CLAUDE.md size + command smoke | GitHub Actions CI | Local (`task verify` / `verify` skill) | D-14 render-then-check; locally runnable per gate principle |
| Local stack lifecycle | Local dev machine (Taskfile + Compose) | CI ubuntu leg (real `task up` smoke) | D-04 split |
| Init/rename | Local dev machine (scripts/init.sh\|.ps1) | CI (parity test ubuntu vs windows) | D-23 |
| Tier definitions (T3 paths, T4 patterns) | Repo artifact (`.cowork/tiers.json`) | consumed by hooks + CI | D-22 single source of truth; itself T3 |
| Specs / ADRs / waiver register | Repo artifact | CI (gate reads specs; waiver expiry check) | D-06/D-07/D-10 |
| Skills (plan, verify + 3 skeletons) | Repo artifact (`.claude/skills/`) | Claude Code session (invocation) | D-21 |

## Standard Stack

### Core

| Tool / Image | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| go-task | **v3.51.1** (pinned) | `task up`, `task verify`, all dev lifecycle commands | Only Make-class runner meeting 3-OS-no-WSL: single Go binary, embeds mvdan/sh so sh-syntax tasks run natively on Windows `[VERIFIED: Context7 /go-task/task + prior project research 2026-06-11]` |
| Node.js | 22+ (present: 22.22.0) | Hook scripts, CI gate scripts, check scripts, `node:test` | Already required by frontend phases (engines >=22); zero-dependency scripts run identically on 3 OS `[VERIFIED: local env]` |
| Docker Compose | v2 spec (present: v5.1.4) | Local stack definition; `up -d --wait` for healthcheck-gated readiness | Compose v2 `--wait` natively blocks until healthchecks pass — no hand-rolled wait loops `[CITED: docs.docker.com compose up --wait]` |
| GitHub CLI (`gh`) | 2.x (present: 2.92.0) | CI gate API calls (`gh api`, `gh pr diff`); preinstalled on GitHub runners | Auth handled via `GITHUB_TOKEN`; pagination built in `[VERIFIED: local env + GitHub runner images]` |
| Claude Code | **2.1.173** (local today — Q-010 pins the tested version) | The enforced runtime; hooks + settings + skills | D-11/Q-010; pin = recorded tested version, SessionStart warns on drift `[VERIFIED: local `claude --version`]` |
| Temurin JDK | **25 (LTS)** via `actions/setup-java` (`distribution: temurin`, `java-version: 25`) | Toolchain smoke spike only in Phase 1 | Governing decision; class file major 69 — mainstream tool support (vs 26's class file 70 cliff) `[ASSUMED: Temurin 25 availability — LTS line, verify in first CI run]` |

### Local stack images (FOUND-02)

| Image | Tag | Healthcheck | Notes |
|-------|-----|-------------|-------|
| `postgres` | `16-alpine` (pin minor, e.g. `16.x-alpine`) | `pg_isready -U $user` | Locked PG16 `[CITED: prior project research 2026-06-11]` |
| `valkey/valkey` | `8` (pin minor) | `valkey-cli ping` | D-17; BSD-3, wire-compatible Redis `[CITED: prior project research 2026-06-11]` |
| `axllent/mailpit` | latest stable (pin at adoption) | HTTP `GET /livez` on 8025 `[ASSUMED — verify endpoint at adoption]` | SMTP 1025 / UI 8025 |
| `minio/minio` | latest stable (pin at adoption) | `curl -f http://localhost:9000/minio/health/live` `[ASSUMED — verify at adoption]` | S3 API 9000 / console 9001 |
| `quay.io/keycloak/keycloak` | **26.6.x** (26.6.3 latest June 2026) | TCP probe to mgmt port 9000 `/health/ready`; requires `KC_HEALTH_ENABLED=true`; image has no curl — use `/dev/tcp` CMD-SHELL trick | `start-dev` mode; realm wiring deferred (Phase 3) `[CITED: keycloak.org/observability/health + prior research]` |
| `grafana/otel-lgtm` | latest stable (pin at adoption) | HTTP on 3000 | D-18; OTLP gRPC 4317, OTLP HTTP 4318, Grafana UI 3000 (admin/admin) `[CITED: grafana.com docker-otel-lgtm docs]` |

### Supporting

| Tool | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `actions/checkout`, `actions/setup-java`, `actions/github-script` | pin by major (or SHA — see Security Domain) | CI workflows | All workflows |
| PowerShell 7 (`pwsh`) | preinstalled on all GitHub runner OSes | `init.ps1`, Windows-leg CI steps | Use `pwsh` shell key in Actions (works on all 3 OS) `[VERIFIED: GitHub runner docs — pwsh is the default cross-OS shell]` |
| `node:test` (built-in) | Node 22 | Unit tests for hook/gate/check scripts | Zero-install test harness — see Validation Architecture |
| gitleaks / Trivy | n/a in Phase 1 | Secret/CVE scan | **Phase 6** (GATE-08) — do not pull into Phase 1 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zero-dep hand-rolled tier matcher (~30 lines) | `minimatch` / `picomatch` (npm) | Both verdict OK (625M / 378M weekly downloads), but an npm dependency means hooks break (fail-open!) on fresh clone before `npm ci` — zero-dep wins for enforcement scripts. Use minimatch only if tier patterns outgrow a simple subset |
| `gh api` in CI gate | raw `curl` + GITHUB_TOKEN, or `actions/github-script` | `gh` is preinstalled on runners, handles pagination/auth; `github-script` acceptable alternative — planner's choice, keep ONE style |
| GitHub rulesets | classic branch protection | Rulesets are the current mechanism (layering, required-reviewer rule GA 2026-02); classic still works — use rulesets for new setup `[CITED: github.blog changelog 2026-02-17]` |
| Compose `--wait` | custom wait-for-healthy loop in Taskfile | `--wait` is native, cross-platform, less code — always prefer |
| Hand-rolled CLAUDE.md template render (token replace) | Handlebars npm package | PRESET-SPEC §4 says token-replacement only; a 20-line Node replace script avoids a dependency and matches Giai đoạn 2's renderer contract |

**Installation:**
```bash
# go-task (pinned check belongs in scripts/init + ONBOARDING)
winget install Task.Task         # Windows
brew install go-task             # macOS
# linux: snap/apt per taskfile.dev/installation, or sh installer with version arg

# No npm/pip installs required for Phase 1 deliverables (zero-dependency scripts).
```

**Version verification:** go-task v3.51.1, Keycloak 26.6.3, Valkey 8, postgres:16 pins were verified live against registries/release pages on 2026-06-11 in prior project research (root CLAUDE.md tables + `.planning/research/STACK.md`). Mailpit/MinIO/otel-lgtm tags are "pin at adoption": resolve the current stable tag in the implementing task and pin it in compose.

## Package Legitimacy Audit

Phase 1 installs **no registry packages** (npm/PyPI/crates). All scripts are zero-dependency Node/PowerShell; go-task is an OS-package-manager binary; everything else is Docker images.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| minimatch *(alternative only, not installed)* | npm | mature | 625M/wk | github.com/isaacs/minimatch | OK | Approved as fallback if tier globs outgrow the hand-rolled subset |
| picomatch *(alternative only, not installed)* | npm | mature | 378M/wk | github.com/micromatch/picomatch | OK | Approved as fallback |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

Docker images are the supply-chain surface instead: pin tags (and optionally digests) in `infra/compose.yaml`; pull only official/org images (`postgres`, `valkey/valkey`, `axllent/mailpit`, `minio/minio`, `quay.io/keycloak/keycloak`, `grafana/otel-lgtm`).

## Architecture Patterns

### System Architecture Diagram

```
                         ┌──────────────────────────── Claude Code session (L1, best-effort) ─┐
                         │                                                                     │
 dev/agent intent ──────▶│  SessionStart hook ──▶ version-pin warn (D-11)                      │
                         │                                                                     │
   Write/Edit on file ──▶│  PreToolUse(matcher: Write|Edit) ─▶ node t3-gate.mjs                │
                         │        │  reads .cowork/tiers.json + git branch + specs/*/plan.md   │
                         │        ├─ T3 path + no approved plan ──▶ deny JSON (reason+next step)│
                         │        └─ else ──▶ exit 0 (normal permission flow)                  │
   Bash command ────────▶│  PreToolUse(matcher: Bash) ─▶ node t4-guard.mjs                     │
                         │        ├─ T4 pattern ──▶ deny JSON ("human executes")               │
                         │        └─ best-effort T3 write-via-bash scan (redirect/sed -i/tee)  │
                         │  permissions.allow: Bash(task *), Bash(./mvnw *), Bash(npm run *)   │
                         └─────────────────────────────────────────────────────────────────────┘
                                                   │ commits → push → PR
                                                   ▼
 ┌──────────────────────────────── GitHub platform config ─────────────────────────────────────┐
 │ ruleset(main): require PR · required status checks (plan-compliance, claude-md-check, …)    │
 │ require code-owner review · dismiss stale approvals · merge-commit only (squash/rebase off) │
 │ CODEOWNERS: security/** tenancy/** .github/** .cowork/** CLAUDE.md docs/adr/** specs/**     │
 └──────────────────────────────────────────────────────────────────────────────────────────────┘
                                                   │ pull_request + pull_request_review events
                                                   ▼
 ┌──────────────────────────────── GitHub Actions CI (L2, the floor) ──────────────────────────┐
 │ plan-compliance job:                                                                        │
 │   changed files (pulls/N/files API) ─▶ match tiers.json T3 globs                            │
 │   ├─ no T3 touched ─▶ pass                                                                  │
 │   └─ T3 touched ─▶ assert specs/NNN-*/plan.md on branch with tier: T3 + Approved-by: line   │
 │                  ─▶ reviews API: latest review per user; ≥1 APPROVED where login != author  │
 │                  ─▶ waiver register consulted (expiry-checked) for solo-dev exception (D-10)│
 │ claude-md-check job: render root source w/ sample values ─▶ ≤200 lines; tree files ≤150;    │
 │                      command smoke (--help/dry-run each declared command)                   │
 │ 3-OS matrix: ubuntu = real `task up` + healthchecks; win/mac = task --list + compose config │
 │              + JDK 25 toolchain smoke (D-04)                                                │
 └──────────────────────────────────────────────────────────────────────────────────────────────┘
                                                   │ merge (merge commit)
                                                   ▼
                                     main = S→P→I→V evidence (AGENT-09)

 local dev loop:  task up ─▶ docker compose up -d --wait ─▶ PG16+Valkey+Mailpit+MinIO+Keycloak+LGTM
                  scripts/init.(sh|ps1) ─▶ rename literals ─▶ auto-commit
```

### Recommended Project Structure

```
/                          # preset root == repo root (D-12)
├── .claude/
│   ├── settings.json      # COMMITTED: preset hooks (T3/T4), T1 allowlist, SessionStart warn
│   ├── settings.local.json# gitignored: dev/GSD personal (suggested default per discretion)
│   ├── hooks/
│   │   ├── t3-plan-gate.mjs   # PreToolUse Write|Edit — zero-dep Node
│   │   ├── t4-command-guard.mjs
│   │   ├── session-version-warn.mjs
│   │   ├── lib/tiers.mjs      # shared matcher (also used by CI gate)
│   │   └── tests/             # node:test fixtures (Q-010 scenario matrix lives here)
│   └── skills/
│       ├── plan/SKILL.md      # full (D-21)
│       ├── verify/SKILL.md    # full — runs whatever gates exist
│       ├── new-module/SKILL.md      # skeleton + contract
│       ├── new-feature/SKILL.md     # skeleton + contract
│       └── design-implement/SKILL.md# skeleton + contract
├── .cowork/
│   ├── tiers.json         # T3 path globs + T4 command patterns + pinned claude version (D-22)
│   └── waivers.json       # time-boxed waiver register (D-10) — itself T3
├── .github/
│   ├── workflows/         # plan-compliance.yml, claude-md-check.yml, os-matrix.yml
│   ├── CODEOWNERS
│   └── pull_request_template.md   # H3 checklist (AI-COWORK §11)
├── .gitattributes         # FIRST COMMIT: * text=auto eol=lf; *.cmd/*.ps1 crlf (Pitfall: CRLF)
├── Taskfile.yml           # up/down/verify/…
├── infra/compose.yaml     # 6-service local stack
├── scripts/
│   ├── init.sh / init.ps1 # D-23
│   └── checks/            # claude-md-size.mjs, command-smoke.mjs, render-claude-md.mjs
├── templates/claude/ROOT-CLAUDE.template.md   # source of preset root CLAUDE.md (D-13/D-14; path = planner choice)
├── backend/CLAUDE.md      # in-place, literal com.acme.app, ≤150 lines (D-15)
├── frontend/CLAUDE.md     # in-place, ≤150 lines (D-15)
├── docs/
│   ├── methodology/AI-COWORK.md   # copied verbatim (ships)
│   └── adr/               # 0001-valkey-not-redis.md, 0002-permission-sync.md, 0003-undeclared-permission-detection.md
├── specs/                 # 001-hooks-enforcement … (D-09); 000-example reserved Phase 8
└── .planning/ product/ requirements/   # meta — never ships (D-06)
```

### Pattern 1: Fail-closed hook script (the load-bearing detail)

**What:** Hook scripts must emit a deny decision themselves on any internal error, because Claude Code exit-code semantics are fail-open for everything except exit 2.
**When to use:** Both T3 plan-gate and T4 guard.
**Mechanics (verified against official docs via Context7):**
- Hook receives stdin JSON: `{ session_id, cwd, hook_event_name, tool_name, tool_input: { file_path | command }, permission_mode }` `[VERIFIED: Context7 /websites/code_claude hooks reference]`
- Two block mechanisms: **exit code 2** (stderr becomes Claude's feedback) or **stdout JSON** `hookSpecificOutput.permissionDecision: "deny"` + `permissionDecisionReason` `[VERIFIED: Context7]`
- `exit 0` with no JSON = "no decision", normal permission flow applies `[VERIFIED: Context7]`
- Other non-zero exit codes are **non-blocking** (error shown, tool proceeds) — i.e., a crashing hook fails OPEN `[ASSUMED: training knowledge of hooks reference; Q-010 must confirm on the pinned version]`
- `$CLAUDE_PROJECT_DIR` is available to hook commands `[VERIFIED: Context7]`

**Design rules derived:**
1. Prefer the JSON deny output (carries the explaining message + next step required by AGENT-03) over bare exit 2.
2. Wrap the entire script in try/catch; in catch, if the target path matches T3, print deny JSON ("hook error — failing closed; run `verify` or check .claude/hooks") and exit 0. Never let an exception bubble to a non-2 exit code.
3. Invoke as `node` with an absolute-ish path; do not assume `jq`, `bash`, or any PATH tool beyond `node` and `git`.
4. Deny message contract (AGENT-03/UX pitfall): name the missing artifact + the next step ("run the `plan` skill → get plan approved → retry").

### Pattern 2: settings.json layout (hooks + permissions + dev separation)

**What:** One committed `.claude/settings.json` carries preset enforcement; `.claude/settings.local.json` (gitignored) carries dev/GSD personal config. Claude Code merges both; hooks from both files run `[ASSUMED: settings precedence — verify in Q-010 that local settings cannot *remove* committed hooks]`.
**Why it matters here:** D-08 turns the preset hooks on for this repo's own development. The GSD workflow writes to `.planning/**` — per the discretion note, `.planning/`-only changes are NOT T3, so the T3 gate must not fire for GSD meta-commits. Encode that as an explicit exclusion in `tiers.json` (meta dirs never T3) rather than in the hook script.
**T1 allowlist (AGENT-04):** `permissions.allow` entries like `Bash(task *)`, `Bash(./mvnw *)`, `Bash(npm run *)` pre-approve daily commands `[CITED: code.claude.com/docs/en/settings permissions rules — pattern syntax verified, exact glob semantics to smoke-test in Q-010]`.
**T4 deny defense-in-depth:** mirror the hook's T4 patterns in `permissions.deny` (`Bash(git push --force*)`, `Bash(kubectl *)`, …) — two independent mechanisms, same config source generated from tiers.json or kept in lockstep by a check script.

### Pattern 3: Plan-compliance CI gate algorithm (GATE-10)

**What:** A required status check implementing D-02 exactly.
**Algorithm:**
1. Trigger on `pull_request` (types: opened, synchronize, reopened) **and** `pull_request_review` (types: submitted, dismissed) — approvals landing after the last push must re-evaluate the check (see Pitfall 4).
2. Changed files: `gh api repos/$R/pulls/$N/files --paginate --jq '.[].filename'` (PR-files API is merge-base-correct; avoids local-git base-ref games).
3. Match against `tiers.json` T3 globs via the shared matcher module. No T3 match → pass ("T1/T2 — no plan required").
4. T3 matched → assert: at least one `specs/[0-9][0-9][0-9]-*/plan.md` exists in the PR head tree, contains `tier: T3` (or higher-tier declaration) and an `Approved-by: <name> <date>` line. This is the **audit trail**, not the proof (D-02).
5. Identity proof: `gh api repos/$R/pulls/$N/reviews --paginate` → reduce to latest review per `user.login` → require ≥1 with `state == "APPROVED"` and `user.login != PR author` and user is not a bot (`[bot]` suffix / `user.type == "Bot"` — Q-002 case). Review state enum: `APPROVED`, `CHANGES_REQUESTED`, `COMMENTED`, `DISMISSED`, `PENDING` `[CITED: docs.github.com/en/rest/pulls/reviews — fields user.login/state/commit_id/submitted_at verified; full enum [ASSUMED]]`.
6. CODEOWNER-ness: enforced by the ruleset (`require code owner review`) — the platform will not let the PR merge without it, and "dismiss stale approvals" binds approval to the reviewed commit. The CI gate does NOT re-parse CODEOWNERS in v1 (avoids hand-rolling CODEOWNERS glob semantics — see Don't Hand-Roll); Q-002 spike validates this division empirically.
7. Waiver register (D-10): if step 5 fails, consult `.cowork/waivers.json`; a non-expired waiver scoped to `self-approval` lets the gate pass with a prominent warning annotation (`core.warning` / job summary). Expired waiver = fail. The expiry check is part of the gate.
8. Self-approval note: GitHub already prevents authors approving their own PRs, so the waiver path in practice covers "merge with zero non-author approvals", not "author approved himself" `[VERIFIED: GitHub platform behavior — authors cannot approve own PRs]`.

**Token permissions:** `permissions: { contents: read, pull-requests: read }` — least privilege.

### Pattern 4: `task up` with healthcheck-gated readiness (FOUND-02)

**What:** Taskfile wraps `docker compose up -d --wait`; every service defines a compose healthcheck; `--wait` blocks until all are healthy — readiness logic lives in compose, not in Taskfile loops.
**Cross-platform:** go-task embeds mvdan/sh — task commands are written in POSIX-sh syntax and run natively on Windows without bash/WSL `[VERIFIED: Context7 /go-task/task — "Task uses mvdan/sh, a native Go sh interpreter… even in environments where sh or bash are usually not available (like Windows)"]`. Any *executable* called must exist on PATH on all OSes — so call only `docker`, `node`, `task` from tasks.
**Keycloak specifics:** `start-dev` mode; `KC_HEALTH_ENABLED=true`; health endpoints are on management port **9000** (`/health/ready`), not 8080; image lacks curl/wget → use the bash `/dev/tcp` CMD-SHELL healthcheck (runs inside the container, fine on Windows hosts) `[CITED: keycloak.org/observability/health]`.
**D-04 split encoded in CI:** ubuntu job runs `task up` + asserts `docker compose ps --format json` shows all healthy; win/mac jobs run `task --version`, `task --list`, `docker compose -f infra/compose.yaml config -q` only.

### Pattern 5: CLAUDE.md render-then-check (GATE-12 / AGENT-01, per D-13/D-14)

**What:** The preset root CLAUDE.md never exists as a maintained file. Phase 1 authors a template SOURCE with placeholders; CI renders it with sample values (`projectName=smoke, groupId=com.acme, artifactId=app`) into a temp file, then asserts ≤200 lines and runs command smoke on the rendered output. `backend/CLAUDE.md` + `frontend/CLAUDE.md` are checked in place (≤150 lines each).
**Command smoke approach:** parsing arbitrary prose for commands is fragile. Recommend declaring smoke-able commands explicitly — either fenced code blocks tagged for smoke, or a small manifest the template references — and the smoke script executes each with `--help`/`--version`/dry-run on the runner (must not require Docker on win/mac legs). Exact mechanism = planner choice; the contract is: every command a fresh dev is told to run must be executed by CI somewhere (this gate extends to ONBOARDING.md in Phase 8).
**Renderer:** 20-line zero-dep Node token-replace consistent with PRESET-SPEC §4 ("token replacement only, no AST transforms"); fail on orphan `{{` after render (same rule the Giai đoạn 2 generator will enforce).

### Pattern 6: Init script parity (FOUND-12 / D-23)

**What:** `init.sh` (POSIX) + `init.ps1` (PowerShell 7) with identical behavior: flags `--group-id/--artifact-id/--project-name` with prompt fallback; walk tree excluding `.git/`, binary globs (PRESET-SPEC `binaryGlobs`), and meta dirs; replace `com.acme.app`/`com/acme/app`/`acme-app` literal family; rename matching directories; `git add -A && git commit -m "chore: initialize project as <artifactId>"`.
**Idempotency:** detect by scanning for the literal — zero occurrences ⇒ print "already initialized as <current>" and exit 0 distinctly (separate exit message, not an error).
**Parity test (CI):** seed a fixture tree (or use the repo itself in a temp clone), run `.sh` on ubuntu and `.ps1` on windows-latest with identical flags, normalize line endings, `git diff --no-index` the two result trees — must be byte-identical after EOL normalization. **Prerequisite:** `.gitattributes` committed first, else CRLF noise drowns the diff (this machine has `core.autocrlf=true` and no `.gitattributes` today — see Environment Availability).
**Validation safety:** validate `groupId`/`artifactId` against Java package / npm name grammar before touching files; refuse empty/dirty git worktree before rewriting (auto-commit needs a clean baseline).

### Pattern 7: Skills layout (AGENT-02 / D-21)

**What:** `.claude/skills/<name>/SKILL.md` with YAML frontmatter (`name`, `description` — the description is the trigger surface) `[CITED: code.claude.com docs — skills are SKILL.md files under .claude/skills]`.
- `plan` (full): interrogates the change intent, emits `specs/NNN-slug/plan.md` in AI-COWORK §3.2 format — files to touch, modules, events/SPI, migrations, tests, `tier: T1|T2|T3`, empty `Approved-by:` placeholder the human fills. Must compute next NNN from existing `specs/` dirs.
- `verify` (full): runs the gate suite that exists *now* (claude-md checks, tiers lint, hook tests, compose config validation; grows every phase), summarizes failures by violated rule (FR-E08 error-legibility seeds here). Implement as a thin wrapper over `task verify` so CI and skill share one path.
- `new-module`, `new-feature`, `design-implement` (skeletons): SKILL.md declares contract — inputs, outputs, tier declaration (`new-module` = T3 with pre-filled plan.md template per CLAUDE-CODE-RUNTIME §2) — body states "implemented in Phase 2/4; do not improvise".

### Pattern 8: specs/NNN + enforcement ratchet narrative (AGENT-05/06/09, D-05)

**What:** `specs/NNN-short-name/{spec.md, plan.md[, tasks.md]}`, branch `feat/NNN-short-name`, commits cite REQ-IDs. Phase 1's own work units are the first specs (001–005 suggested grouping per D-09). The commit history must visibly show the ratchet: hand-written specs under PR-review-only → `plan-compliance` check goes required → hooks land in settings.json (post-Q-010, D-08). Plan tasks in this order deliberately — the ordering IS the AGENT-09 evidence.

### Anti-Patterns to Avoid

- **Bash-only hook scripts:** break or fail open on Windows. Node-only, zero deps.
- **`jq`/`grep` in hook commands** (as official doc examples do): not guaranteed on dev Windows machines — parse stdin in Node.
- **Hand-rolled compose wait loops:** `--wait` exists; loops drift per OS.
- **Squash merges:** destroys the per-commit S→P→I→V evidence (D-03) — disable at repo settings, don't rely on discipline.
- **Treating `Approved-by:` text as authorization:** it is audit trail only (D-02); identity comes from the reviews API + ruleset.
- **Claiming enforcement on hooks alone:** L1 is UX; only the required CI check carries the core-value claim (D-16, Pitfall 7 in project research).
- **Putting the T3 list in two places:** hook and CI must both read `.cowork/tiers.json` (D-22). Generated duplication (e.g., into `permissions.deny`) needs a lockstep check.
- **Required check that only triggers on `pull_request`:** approval-after-push never re-evaluates → stuck red check (see Pitfall 4).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Wait-for-stack-ready | Polling loops in Taskfile | `docker compose up -d --wait` + per-service healthchecks | Native, cross-platform, healthcheck semantics already solved |
| GitHub API auth/pagination | raw fetch + token plumbing | `gh api --paginate` (preinstalled on runners) | Pagination bugs are the classic reviews-API mistake (30-item default page) |
| CODEOWNERS glob semantics | a CODEOWNERS parser in the CI gate | GitHub ruleset "require code owner review" | CODEOWNERS matching has subtle gitignore-style semantics; the platform already enforces it at merge — re-implementing invites divergence. (Q-002 validates this split; if the spike proves platform enforcement insufficient, minimatch-based parsing is the fallback) |
| Cross-platform task running | Makefile / bash scripts / npm scripts | go-task (mvdan/sh embedded) | Locked direction; the only no-WSL-clean option |
| Test harness for scripts | custom assert scripts | `node:test` + `node --test` | Built into Node 22; zero install; TAP output |
| Claude Code permission UX for T1 | custom "auto-approve" hook | `permissions.allow` rules | Purpose-built; hooks reserved for deny logic |
| Template rendering | Handlebars/Mustache dependency | 20-line token-replace Node script | PRESET-SPEC §4 mandates token-replacement-only anyway |

**Key insight:** every piece of Phase 1 automation sits *in front of* the thing that installs dependencies — hooks must work on a fresh clone before `npm ci`, the init script before any build, the CI gate before the repo has a package.json. Zero-dependency is an architectural requirement here, not a style preference.

## Common Pitfalls

### Pitfall 1: Hook fails open — non-2 exit codes don't block
**What goes wrong:** Script throws (bad JSON on stdin, missing tiers.json, git command fails on Windows path) → exits 1 → Claude Code treats it as non-blocking error → the T3 write proceeds.
**Why it happens:** Only exit 2 / explicit deny JSON block; everything else is advisory `[ASSUMED + CITED: hooks docs show exit 0/2 semantics explicitly]`.
**How to avoid:** Pattern 1 fail-closed wrapper; Q-010 matrix includes a deliberate "hook script crashes" scenario asserting the observed behavior on the pinned version per OS.
**Warning signs:** hook test matrix has no crash-path case; hook code with uncaught `JSON.parse`.

### Pitfall 2: Hook coverage gaps — Bash writes, MCP tools, IDE edits
**What goes wrong:** Write|Edit matcher is bypassed via `Bash` (`echo > file`, `sed -i`, `tee`, `git apply`, heredoc), MCP filesystem tools, or the human's IDE. Public issue history also shows version-specific deny failures (Edit-tool deny ignored #37210, MCP tools #33106, `ask` overriding deny #39344).
**How to avoid:** (a) D-16 posture: CI L2 is the floor — never claim more for L1. (b) Bash matcher does a best-effort write-pattern scan into T3 paths; documented as best-effort. (c) Q-010 matrix runs per pinned version on 3 OS and re-runs on every version bump. (d) AI-COWORK's claim that deny holds under `--dangerously-skip-permissions` is a product-doc claim — Q-010 verifies it empirically `[ASSUMED until spiked]`.
**Warning signs:** docs calling hooks "guarantees"; matrix green on one OS only.

### Pitfall 3: Reviews API misread — stale, dismissed, and superseded reviews
**What goes wrong:** Gate counts any historical APPROVED review. A reviewer approved commit 1, author force-pushed malicious commit 2 — old approval still in the list. Or a DISMISSED review is counted.
**How to avoid:** Reduce to latest review per user (list is chronological `[CITED: docs.github.com/en/rest/pulls/reviews]`); only `state == APPROVED` counts; enable ruleset "dismiss stale pull request approvals" so the platform invalidates approvals on push; optionally assert `commit_id == head SHA` for strictness (Q-002 decides whether to require it — strict commit binding can conflict with the merge-commit update flow).
**Warning signs:** gate logic that filters `state=APPROVED` without per-user latest-wins reduction; no pagination (`--paginate`).

### Pitfall 4: Approval lands after the check ran — required check stuck red
**What goes wrong:** `plan-compliance` runs on push (no approval yet → red). Reviewer approves. Nothing re-triggers the workflow → PR permanently blocked, devs learn to re-push empty commits (trust erosion).
**How to avoid:** Trigger on `pull_request_review: [submitted, dismissed]` too; the re-run reports a check on the same head SHA. Q-002 spike explicitly validates that the re-triggered run satisfies the *required status check* context (check-name matching between events is the fiddly part).
**Warning signs:** workflow `on:` block lists only `pull_request`.

### Pitfall 5: GITHUB_TOKEN / event payload traps in the gate
**What goes wrong:** Using `github.event.pull_request.head.sha` vs merge ref inconsistently; missing `pull-requests: read` permission; `pull_request_review` event payload shape differs from `pull_request` (PR number lives at `github.event.pull_request.number` in both, but head SHA semantics differ).
**How to avoid:** Derive PR number once, fetch everything else fresh via API (`pulls/N`, `pulls/N/files`, `pulls/N/reviews`) — never trust cached payload fields across event types. Unit-test the gate logic against fixture JSON (node:test) so event-shape handling is covered without live PRs.

### Pitfall 6: CRLF poisons everything downstream
**What goes wrong:** No `.gitattributes` + Windows `core.autocrlf=true` (this machine's actual config) → line-ending flips break: CLAUDE.md line-count checks (CRLF counted differently), init parity diff, hook script execution (`\r` in shebangs), rendered-template byte comparisons.
**How to avoid:** `.gitattributes` (`* text=auto eol=lf`, `*.cmd/*.bat/*.ps1 eol=crlf`) in the FIRST commit of Phase 1, plus a CI check failing on CRLF in tracked text files. All check scripts must normalize `\r\n` before counting lines.
**Warning signs:** init parity test diff full of whole-file changes; `wc -l` style counts differing across OS legs.

### Pitfall 7: "No WSL" vs Docker Desktop reality on Windows
**What goes wrong:** Docker Desktop's default Windows backend IS WSL2. Reading the constraint as "no WSL anywhere" makes `task up` impossible on Windows.
**How to avoid:** Document the constraint's real meaning in ONBOARDING: developers don't *work inside* WSL; Docker Desktop (WSL2 or Hyper-V backend), Rancher Desktop, or Podman provide the daemon. D-04 already scopes CI accordingly; the one-time manual Win/mac `task up` verification (recorded in the spike report) names the runtime it was tested on.
**Warning signs:** ONBOARDING listing "no WSL" without the Docker clarification; healthchecks relying on host-side `curl.exe` quirks (keep healthchecks inside containers).

### Pitfall 8: Init script edge cases that corrupt the tree
**What goes wrong:** Replacing the substring `com.acme.app` blindly hits `com.acme.application`, binary files, `.git/` internals, or this repo's meta dirs (`.planning/` mentions com.acme.app in docs!); `sed -i` semantics differ macOS/Linux; PowerShell regex vs literal replace mismatch with sh leg.
**How to avoid:** Word-boundary-aware literal matching; explicit exclusion list (`.git/`, binaryGlobs, `.planning/`, `product/`, `requirements/`); both legs share a manifest of (literal → placeholder-name) pairs so future Giai đoạn 2 templating reuses it; parity test catches divergence. Prefer Node for the tree-walk core with thin sh/ps1 wrappers **only if** the dual-script requirement is read as "entry points", not "implementations" — D-23 mandates `.sh|.ps1` entry points; a shared Node core behind them is planner's call (reduces parity risk to argument parsing).
**Warning signs:** `sed -i` in init.sh; replacements counted differently across legs.

### Pitfall 9: GATE-12 smoke gate becomes flaky or vacuous
**What goes wrong:** Either the command-extraction regex grabs prose ("flaky red"), or the smoke runs `--help` on commands that need Docker on win/mac legs ("flaky red"), or it tests nothing because extraction found nothing ("vacuous green").
**How to avoid:** Explicit command declaration (Pattern 5); assert a minimum count of smoked commands (>0, ideally an exact expected list) so silent extraction failure turns the gate red; split Docker-needing commands to the ubuntu leg.

### Pitfall 10: Two planning systems blur (D-06 violation)
**What goes wrong:** GSD `.planning/` docs get cross-linked from shipped artifacts (ADRs linking spike reports), or GSD meta-commits trigger the T3 hook, grinding the dev loop.
**How to avoid:** ADRs inline their evidence (D-07); `tiers.json` excludes meta dirs explicitly; a lint in `verify` greps shipped dirs (`docs/`, `specs/`, `backend/`, `frontend/`, `.claude/`, `templates/`) for `.planning/` references and fails on hit.

## Code Examples

Verified patterns from official sources; adapted to this repo's zero-dep rule.

### 1. `.claude/settings.json` — hooks + T1 allowlist
```jsonc
// Schema verified: Context7 /websites/code_claude (hooks guide + hooks reference)
{
  "permissions": {
    "allow": ["Bash(task *)", "Bash(./mvnw *)", "Bash(npm run *)"],
    "deny":  ["Bash(git push --force*)", "Bash(kubectl *)", "Bash(flyway clean*)"]
  },
  "hooks": {
    "SessionStart": [
      { "hooks": [ { "type": "command",
          "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/session-version-warn.mjs\"" } ] }
    ],
    "PreToolUse": [
      { "matcher": "Write|Edit",
        "hooks": [ { "type": "command",
          "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/t3-plan-gate.mjs\"" } ] },
      { "matcher": "Bash",
        "hooks": [ { "type": "command",
          "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/t4-command-guard.mjs\"" } ] }
    ]
  }
}
// Q-010 must verify: $CLAUDE_PROJECT_DIR expansion on Windows (cmd vs sh hook shell) — [ASSUMED]
```

### 2. Fail-closed deny from a Node hook (Pattern 1)
```javascript
// Source: deny JSON schema per https://code.claude.com/docs/en/hooks (via Context7)
import { readFileSync } from "node:fs";
function deny(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason
    }
  }));
  process.exit(0); // decision carried by JSON, not exit code
}
try {
  const input = JSON.parse(readFileSync(0, "utf8")); // stdin
  const filePath = input.tool_input?.file_path ?? "";
  // … match against .cowork/tiers.json, check specs/*/plan.md Approved-by on branch …
} catch (err) {
  // fail CLOSED: unknown state on a gate script is a deny, with next-step guidance
  deny(`T3 gate error (${err.message}). Fix .claude/hooks or run the plan skill, then retry.`);
}
```

### 3. CI gate — reviews verification core (GATE-10 step 5)
```bash
# Source: GET /repos/{o}/{r}/pulls/{n}/reviews — fields user.login/state/submitted_at,
# paginated (per_page max 100). [CITED: docs.github.com/en/rest/pulls/reviews]
AUTHOR=$(gh api "repos/$REPO/pulls/$PR" --jq '.user.login')
gh api "repos/$REPO/pulls/$PR/reviews" --paginate \
  --jq 'group_by(.user.login) | map(max_by(.submitted_at))
        | map(select(.state == "APPROVED" and (.user.type != "Bot")))
        | map(.user.login)' \
  | node scripts/checks/assert-non-author-approval.mjs --author "$AUTHOR"
```

### 4. Compose healthchecks — Keycloak 26 + `--wait`
```yaml
# Source: keycloak.org/observability/health (mgmt port 9000, KC_HEALTH_ENABLED)
services:
  keycloak:
    image: quay.io/keycloak/keycloak:26.6.3
    command: start-dev
    environment:
      KC_HEALTH_ENABLED: "true"
      KC_BOOTSTRAP_ADMIN_USERNAME: admin   # dev-only credentials
      KC_BOOTSTRAP_ADMIN_PASSWORD: admin
    healthcheck:
      # image has no curl — bash /dev/tcp probe against mgmt port 9000
      test: ["CMD-SHELL", "exec 3<>/dev/tcp/127.0.0.1/9000; echo -e 'GET /health/ready HTTP/1.1\\r\\nHost: localhost\\r\\nConnection: close\\r\\n\\r\\n' >&3; cat <&3 | grep -q '\"status\": \"UP\"'"]
      start_period: 30s
      interval: 10s
      retries: 12
  lgtm:
    image: grafana/otel-lgtm   # pin tag at adoption
    ports: ["3000:3000", "4317:4317", "4318:4318"]  # Grafana UI / OTLP gRPC / OTLP HTTP
```
```yaml
# Taskfile.yml — readiness delegated to compose
version: '3'
tasks:
  up:
    desc: Boot the full local stack (waits for healthchecks)
    cmds:
      - docker compose -f infra/compose.yaml up -d --wait
```

### 5. SessionStart version warn (D-11)
```javascript
// Reads pinned version from .cowork/tiers.json; plain stdout on SessionStart is
// added as context. [ASSUMED: exact additionalContext mechanics — Q-010 verifies]
import { execSync } from "node:child_process";
const pinned = JSON.parse(readFileSync(".cowork/tiers.json", "utf8")).claudeCode.testedVersion;
const actual = execSync("claude --version", { encoding: "utf8" }).trim();
if (!actual.startsWith(pinned)) {
  console.log(`WARNING: Claude Code ${actual} != tested ${pinned}. ` +
              `Hook behavior unverified on this version (Q-010 matrix). CI gates remain the floor.`);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Classic branch protection rules | **Rulesets** (layered; required-reviewer rule GA) | rulesets GA earlier; required-reviewer rule GA 2026-02 `[CITED: github.blog changelog 2026-02-17]` | Use rulesets for required checks, code-owner review, stale-dismissal, merge-method restriction |
| Custom wait-for-it scripts | `docker compose up --wait` | Compose v2 | Delete a whole class of cross-platform readiness bugs |
| Disabling Claude Code auto-update via `DISABLE_AUTOUPDATER` | `autoUpdatesChannel` + `minimumVersion` settings; `DISABLE_UPDATES` to block all paths; native installer accepts a specific version | evolving through 2025–2026; documented inconsistencies remain (issues #12564, #56723) | Hard version pinning is unreliable → D-11's warn-not-block is the right posture; record the tested version, don't fight the updater `[CITED: github.com/anthropics/claude-code issues]` |
| Hook examples in bash + jq | Same JSON contract, any executable | n/a | Official examples are bash/jq; the contract (stdin JSON, stdout decision JSON, exit codes) is language-agnostic — Node is the right choice for 3-OS |
| Redis image for dev cache | Valkey 8 (BSD-3) | Redis relicensing (7.4 RSAL/SSPL; 8.x tri-license incl. AGPL) | D-17 locked; one-line ADR records rationale |

**Deprecated/outdated:**
- `eslint-plugin-react-compiler`, Testcontainers 1.x idioms, Jackson 2 imports — not Phase 1 scope but already flagged in root CLAUDE.md as agent-hallucination hotspots; backend/frontend CLAUDE.md (authored this phase) should carry those warnings forward.
- JDK 26 references in older research tables — superseded by JDK 25 LTS decision; the toolchain smoke targets 25.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Non-zero exit codes other than 2 are non-blocking (hooks fail open on crash) | Pattern 1, Pitfall 1 | If some versions fail closed, hook crashes block ALL edits — different bug, same spike coverage |
| A2 | `$CLAUDE_PROJECT_DIR` expands correctly in hook commands on Windows (hook shell semantics) | Pattern 2, Code Ex. 1 | Hooks silently never run on Windows → fail open; Q-010 matrix item |
| A3 | PreToolUse deny holds under `--dangerously-skip-permissions` (product doc claim) | Pitfall 2 | L1 weaker than documented; D-16 already caps the blast radius |
| A4 | `settings.local.json` cannot remove/override committed hooks | Pattern 2 | Dev-side accidental disable of enforcement; Q-010 checks merge semantics |
| A5 | Review `state` enum = APPROVED/CHANGES_REQUESTED/COMMENTED/DISMISSED/PENDING | Pattern 3 | Gate mis-filters an unexpected state; fixture tests + Q-002 confirm |
| A6 | `pull_request_review`-triggered run satisfies the same required-check context | Pitfall 4 | Stuck-red required check; Q-002 explicitly validates |
| A7 | Temurin 25 available across the 3 runner OSes via setup-java | Standard Stack | Toolchain smoke fails at setup step; trivially detected in spike |
| A8 | Mailpit `/livez` and MinIO `/minio/health/live` healthcheck endpoints | Stack images table | Healthcheck tweak at adoption; low risk |
| A9 | SessionStart hook stdout reaches the session as context (warn mechanism) | Code Ex. 5 | Use a different SessionStart output field; Q-010 verifies |
| A10 | GitHub natively prevents PR authors approving own PRs (so waiver covers "zero non-author approvals" case) | Pattern 3 step 8 | Gate logic unchanged either way (it checks login != author itself) |

## Open Questions (RESOLVED — addressed by spike plans 01-02/01-03 per D-20)

1. **Q-010 — hook stability matrix on the pinned version (2.1.173 or newer at spike time)**
   - What we know: config schema, stdin/stdout contracts, deny JSON (verified); public issues show version-specific deny failures and Windows shell quirks.
   - What's unclear: A1–A4 above; Bash-matcher coverage quality; behavior matrix per OS.
   - Recommendation: the spike's scenario list = {Write deny, Edit deny, Bash T4 deny, Bash write-bypass attempt, crash fail-mode, skip-permissions flag, settings.local override attempt, $CLAUDE_PROJECT_DIR on Win/mac/Linux, SessionStart warn visibility}. Record version + per-OS results in `.planning/spikes/q010-hook-matrix.md`; hooks go live immediately after pass (D-08).
2. **Q-002 — GitHub mechanism empirics**
   - What we know: reviews API fields/pagination verified; rulesets cover code-owner review + stale dismissal + merge methods; native self-approval block.
   - What's unclear: A5–A6; bot-review handling; whether ruleset code-owner enforcement + CI API re-check is airtight without CI-side CODEOWNERS parsing; commit-binding strictness choice (Pitfall 3).
   - Recommendation: spike = throwaway repo, scripted PR scenarios (self-approve attempt, approve-then-push, bot approval, re-trigger on review submit, merge-method restriction), written up in `.planning/spikes/q002-hosting-api.md`.
3. **Q-004 — verify-fast gate set (D-19 pre-directed)**
   - What we know: Phase 1 has only static gates (no containers, no compile) — trivially <60s; the real budget pressure starts Phase 2.
   - Recommendation: spike defines the gate-set CONTRACT and the timing harness (a `verify --fast` runner that prints per-gate wall time) now; measures real numbers as gates accrue. Don't burn Phase 1 time benchmarking Maven that doesn't exist yet.
4. **JDK 25 toolchain smoke**
   - What we know: class file 69; Boot-managed tool matrix was validated for 26 (harder case) in prior research; 25 is the LTS mainstream path.
   - What's unclear: MapStruct/JaCoCo formal statements (MEDIUM in prior research) — empirical confirmation is the point.
   - Recommendation: minimal Maven project (compiler release 25 + JUnit + Mockito + MapStruct + JaCoCo + ArchUnit ≥1.4.2) on 3-OS matrix; report in `.planning/spikes/jdk25-toolchain.md`.
5. **Where does the preset root CLAUDE.md template source live and what marks smoke-able commands?** — planner decision (Pattern 5 gives the contract); no external unknowns.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker Desktop + Compose v2 | FOUND-02, healthchecks | ✓ | 29.5.3 / Compose v5.1.4 | — |
| go-task (`task`) | FOUND-02, Taskfile | **✗** | — | `winget install Task.Task` — must be an explicit Phase 1 setup step (and ONBOARDING content) |
| Node.js | hooks, gate scripts, checks, node:test | ✓ | 22.22.0 | — |
| GitHub CLI (`gh`) | CI gate, Q-002 spike | ✓ | 2.92.0 | preinstalled on GitHub runners too |
| PowerShell 7 | init.ps1, Windows CI legs | ✓ | 7.5.5 | — |
| Claude Code | hooks runtime, Q-010 | ✓ | 2.1.173 | — (this becomes the pin candidate) |
| JDK 25 (Temurin) | toolchain smoke spike | **✗** (local has JDK 26.0.1) | — | `actions/setup-java` in CI; locally install Temurin 25 for the spike — decision is 25, local 26 must not leak into spike results |
| git | everything | ✓ | 2.50.1.windows.1 | — |
| `.gitattributes` | CRLF safety (Pitfall 6) | **✗ missing**; `core.autocrlf=true` locally | — | First-commit deliverable — blocking precondition for init parity + line-count gates |

**Missing dependencies with no fallback:** none (all installable).
**Missing dependencies with fallback/action:** go-task (install step), JDK 25 (setup-java / local Temurin install), `.gitattributes` (authored in first commit).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `node:test` (built into Node 22 — zero install) for all script logic; GitHub Actions jobs as the system-level harness |
| Config file | none needed — see Wave 0 for test-file layout |
| Quick run command | `node --test .claude/hooks/tests/ scripts/checks/tests/` |
| Full suite command | `task verify` (runs node tests + claude-md checks + tiers lint + compose config validation + meta-link lint) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AGENT-03 | T3 deny / T4 deny decisions from hook scripts (fixture stdin → expected JSON) | unit | `node --test .claude/hooks/tests/t3-gate.test.mjs` | ❌ Wave 0 |
| AGENT-03 | Live hook behavior matrix per OS (Q-010) | integration/manual-hybrid | scripted scenario runner in spike; per-OS CI where feasible | ❌ Wave 0 (spike harness) |
| AGENT-04 | T1 allowlist present + commands run promptless | smoke (manual once + settings assertion) | `node scripts/checks/settings-lint.mjs` (asserts allow rules exist) | ❌ Wave 0 |
| GATE-10 | Gate logic vs fixture PR-files/reviews JSON (T3 hit, no-plan fail, approved pass, stale review, bot, waiver expiry) | unit | `node --test scripts/checks/tests/plan-compliance.test.mjs` | ❌ Wave 0 |
| GATE-10 | End-to-end on real PRs | manual-only (Q-002 spike scenarios) | recorded in spike report — justification: requires live GitHub PRs | — |
| GATE-12 | Render → line budget → command smoke | integration (CI job, locally runnable) | `node scripts/checks/claude-md-check.mjs` | ❌ Wave 0 |
| AGENT-01 | backend/frontend CLAUDE.md ≤150 lines | unit | same check script, in-place mode | ❌ Wave 0 |
| FOUND-02 | Stack boots healthy | integration (ubuntu CI) | `task up && docker compose -f infra/compose.yaml ps` health assert | ❌ Wave 0 |
| FOUND-02 | Compose definition valid on Win/mac | smoke | `docker compose -f infra/compose.yaml config -q` | ❌ Wave 0 |
| FOUND-12 | sh/ps1 parity | integration (2-OS CI) | parity workflow: run both → normalize EOL → `git diff --no-index` | ❌ Wave 0 |
| FOUND-12 | Idempotent second run | unit/integration | second invocation in same job asserts clean-exit message | ❌ Wave 0 |
| AGENT-02 | 5 SKILL.md exist; plan/verify functional | smoke | `node scripts/checks/skills-lint.mjs` (frontmatter + required files) | ❌ Wave 0 |
| AGENT-05/06 | Tier table documented; specs convention enforced by gate | covered by GATE-10 tests + docs presence lint | part of `task verify` | ❌ Wave 0 |
| AGENT-09 | Ratchet visible in history | manual-only — justification: human reads commit log against D-05 narrative at phase verify | — |

### Sampling Rate
- **Per task commit:** `node --test .claude/hooks/tests/ scripts/checks/tests/` (sub-second, zero deps)
- **Per wave merge:** `task verify` (full static suite)
- **Phase gate:** 3-OS CI matrix green + ubuntu `task up` job green + all spike reports written before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `.claude/hooks/tests/*.test.mjs` + stdin fixtures — covers AGENT-03 unit layer
- [ ] `scripts/checks/tests/plan-compliance.test.mjs` + PR-API JSON fixtures — covers GATE-10 logic
- [ ] `scripts/checks/{claude-md-check,settings-lint,skills-lint,meta-link-lint}.mjs` — gate scripts double as their own harness
- [ ] `.github/workflows/{plan-compliance,claude-md-check,os-matrix,init-parity}.yml`
- [ ] Spike harnesses: Q-010 scenario runner, Q-002 scripted PR scenarios, Q-004 timing harness, JDK-25 smoke pom
- [ ] Framework install: none (node:test built in)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (app authN is Phase 5) | — |
| V3 Session Management | no | — |
| V4 Access Control | **yes — the phase's core subject** | Plan-approval gating: GitHub rulesets (code-owner review, no self-approval, stale dismissal) + CI reviews-API verification; waiver register time-boxed with CI-enforced expiry |
| V5 Input Validation | yes | Hook scripts parse untrusted-ish stdin JSON defensively (fail closed); init script validates groupId/artifactId grammar before tree rewrite; gate scripts treat PR titles/branch names as data, never eval |
| V6 Cryptography | no | — |
| V14 Configuration | yes | Least-privilege `GITHUB_TOKEN` (`contents: read, pull-requests: read`); pin third-party Actions (major tag minimum; SHA-pin recommended for non-`actions/*` orgs); pinned Docker image tags; dev-only credentials in compose clearly marked non-production |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Forged `Approved-by:` line in plan.md | Spoofing/Tampering | D-02: line is audit-only; authorization = reviews API + ruleset (the design already mitigates — keep it explicit in ADR/spec text) |
| Bot account "approval" satisfying the gate | Spoofing | Exclude `user.type == "Bot"` in gate; Q-002 scenario |
| Approve-then-push (stale approval rides malicious commit) | Tampering | Ruleset "dismiss stale approvals"; latest-per-user reduction; optional head-SHA binding (Q-002 decides) |
| Agent writes T3 file via Bash to dodge Write/Edit hook | Elevation (of agent autonomy) | Bash-matcher best-effort scan + CI L2 floor (D-16) |
| Hook script crash = silent fail-open | Elevation | Fail-closed pattern (deny JSON from catch block); crash scenario in Q-010 matrix |
| Waiver register rot (expired waivers still honored) | Repudiation/Elevation | Gate evaluates expiry on every run; expired waiver = red check |
| Malicious/compromised third-party Action in enforcement workflows | Tampering (supply chain) | Stick to `actions/*` official actions; pin versions; gate scripts are in-repo Node (reviewable, T3-pathed themselves via `.github/**`) |
| Secrets in compose/env committed | Information disclosure | Dev-only literal creds (admin/admin) acceptable and labeled; no real secrets exist in Phase 1; secret scan gate arrives Phase 6 — note the gap explicitly in ONBOARDING |

## Sources

### Primary (HIGH confidence)
- Project canonical docs (read in full): `product/methodology/AI-COWORK.md`, `product/cli/CLAUDE-CODE-RUNTIME.md`, `product/cli/PRESET-SPEC.md`, `.planning/research/PITFALLS.md`, root `CLAUDE.md` stack tables (registry-verified 2026-06-11)
- Local environment probes (docker/gh/node/pwsh/claude/git versions, autocrlf state) — executed this session

### Secondary (MEDIUM confidence)
- Context7 `/websites/code_claude` — hooks guide + hooks reference (PreToolUse schema, deny JSON, stdin payload, exit 0/2 semantics, CLAUDE_PROJECT_DIR)
- Context7 `/go-task/task` — mvdan/sh Windows-native execution, platforms attribute, winget/brew install
- WebFetch `docs.github.com/en/rest/pulls/reviews` — review object fields, pagination

### Tertiary (LOW confidence — validate in spikes)
- WebSearch: GitHub rulesets/required-reviewer changelog (github.blog 2026-02-17); grafana/otel-lgtm ports (hub.docker.com, grafana.com docs); Keycloak 26 healthcheck pattern (keycloak.org/observability/health, community gist); Claude Code update-pinning behavior (anthropics/claude-code issues #12564, #56723, #5753)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions pinned via prior same-day registry-verified research + local probes; remaining tags marked "pin at adoption"
- Hook architecture: MEDIUM — config/JSON contracts verified via official docs; runtime behavior per-version/per-OS is exactly Q-010's job (assumptions A1–A4 logged)
- CI gate / GitHub mechanics: MEDIUM-HIGH — API fields verified against official docs; event-trigger and ruleset interplay flagged for Q-002 (A5–A6)
- Local stack: HIGH — well-trodden images, healthcheck patterns cited; two endpoint details assumed (A8)
- Pitfalls: HIGH — grounded in project PITFALLS.md (web-verified) + this session's environment findings (missing .gitattributes, autocrlf=true, missing task binary, local JDK 26≠25)

**Research date:** 2026-06-11
**Valid until:** 2026-07-11 (30 days) — except Claude Code hook behavior, which is valid only for the Q-010-pinned version; re-validate the matrix on every version bump.
