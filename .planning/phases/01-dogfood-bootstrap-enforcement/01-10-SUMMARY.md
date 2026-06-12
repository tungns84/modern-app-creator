---
phase: 01-dogfood-bootstrap-enforcement
plan: 10
subsystem: claude-pack
tags: [gate-12, agent-01, claude-md, d-13, d-14, d-15, github-actions, smoke]

# Dependency graph
requires:
  - phase: 01-dogfood-bootstrap-enforcement/07
    provides: "render-claude-md.mjs + claude-md-check.mjs CLI contract (render → budgets → leg-filtered smoke, vacuous-green guard)"
  - phase: 01-dogfood-bootstrap-enforcement/05
    provides: "Taskfile.yml tasks (up/down/ps/logs) the smoke manifest exercises; os-matrix go-task install pattern"
  - phase: 01-dogfood-bootstrap-enforcement/09
    provides: "PR-flow convention + ruleset payload (claude-md-check deliberately NOT yet required)"
  - phase: 01-dogfood-bootstrap-enforcement/12
    provides: "specs/005-claude-pack approved spec unit binding this plan"
provides:
  - "templates/claude/ROOT-CLAUDE.template.md — source-only preset root CLAUDE.md (D-13), renders to 81 lines with sample values (budget 200)"
  - "templates/claude/smoke-commands.json — explicit GATE-12 smoke manifest: task --list, task --dry up, node --version on all 3 legs"
  - "backend/CLAUDE.md (59 lines) + frontend/CLAUDE.md (53 lines) — in-place constitutions, literal com.acme.app (D-15)"
  - ".github/workflows/claude-md-check.yml — GATE-12 render-then-check + CRLF guard, job id claude-md-check = future required-check context"
affects: [01-11, phase-02-backend, phase-04-frontend, phase-08-onboarding]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CRLF guard delegates exemption logic to git attributes (git ls-files --eol + attr -text filter) instead of hardcoding fixture paths"
    - "go-task global flags precede the task name: `task --dry up` (verified live on Windows)"

key-files:
  created:
    - templates/claude/ROOT-CLAUDE.template.md
    - templates/claude/smoke-commands.json
    - backend/CLAUDE.md
    - frontend/CLAUDE.md
    - .github/workflows/claude-md-check.yml
  modified: []

key-decisions:
  - "Root template authored lean (81 rendered lines vs 200 budget) — brevity is the product's own research finding; growth room preserved for later phases' canonical commands"
  - "CRLF guard filters on `git ls-files --eol` index column and exempts attr `-text` files — the deliberate crlf.md fixture (01-07) stays tracked without tripping the guard"
  - "Smoke manifest declares only commands that exist NOW (3 all-leg commands, zero Docker-needing) — `./mvnw verify` / `npm run *` are marked [not yet available] in the template so nobody smokes them early"

# Metrics
duration: ~10min
completed: 2026-06-12
---

# Phase 01 Plan 10: Three-layer CLAUDE.md + GATE-12 CI wiring Summary

**Source-only preset root CLAUDE.md template (D-13/D-14, renders to 81/200 lines), in-place backend (59/150) + frontend (53/150) constitutions with literal com.acme.app and hallucination warnings, and the claude-md-check workflow running the real 01-07 CLI with a git-attribute-aware CRLF guard.**

## What Was Built

- **`templates/claude/ROOT-CLAUDE.template.md`** — the CLAUDE-CODE-RUNTIME §1 root row exactly: one-paragraph description, canonical-commands table (`task up/down/ps/logs/verify`; `./mvnw verify` and `npm run dev/build/codegen` clearly marked **[not yet available — arrives Phase 2/4]**), workspace map (8 dirs), compact T1–T4 risk-tier table (AI-COWORK §6), pointers (AI-COWORK.md, ARCHITECTURE.md [Phase 2], docs/adr/), and the 6-item anti-stack "Do not" list. Placeholders: `{{projectName}}`, `{{groupId}}`, `{{artifactId}}`. No stack tutorials, no tree duplication.
- **`templates/claude/smoke-commands.json`** — 01-07 manifest format; 3 commands on all legs (`task --list`, `task --dry up`, `node --version`); zero Docker-needing commands declared in Phase 1, with the ubuntu-restriction rule documented in `$comment` for future entries.
- **`backend/CLAUDE.md`** — literal `com.acme.app`; module DAG placeholder pointing at the `new-module` skill; events-for-writes / `::spi`-for-reads; `*Test`/`*Tests` + Testcontainers-on-PostgreSQL-only conventions; Flyway per-module layout; four ArchUnit rules phrased "you will fail the build if ..."; hallucination warnings: **Testcontainers 2.x** (1.x idioms wrong), **Jackson 3** (`tools.jackson.*`), **JDK 25 LTS** (class file 69), JUnit 6.
- **`frontend/CLAUDE.md`** — `shared → features → app` zone chain with the no-cross-feature rule; tokens-only styling (no raw hex/px); vi/en i18n parity rule; a11y (aria-label on icon buttons, axe WCAG 2.2 AA gate); never edit `src/generated/`; state-library split + no tokens in stores.
- **`.github/workflows/claude-md-check.yml`** — push + pull_request, `contents: read`; pinned go-task v3.51.1 (os-matrix pattern); CRLF guard step (Pitfall 6 continuous enforcement); then the exact 01-07 CLI: `--root-template … --tree-file backend/CLAUDE.md --tree-file frontend/CLAUDE.md --smoke-manifest … --leg ubuntu`.

## Task Commits

| Task | Name | Commit |
|------|------|--------|
| 1 | ROOT-CLAUDE.template.md + smoke-commands.json (D-13/D-14) | `f9065fa` |
| 2 | backend/CLAUDE.md + frontend/CLAUDE.md in place (D-15) | `da4b65c` |
| 3 | claude-md-check.yml — GATE-12 CI wiring | `6764385` |

## Verification

- Task 1: template contains all required markers; manifest ≥2 commands; **full CLI run green on the windows leg — 3 smoke commands executed, proving `task --dry up` flag placement** (go-task takes global flags before the task name)
- Task 2: `claude-md-check.mjs --tree-file backend/CLAUDE.md --tree-file frontend/CLAUDE.md` → GATE-12 OK (59 and 53 lines, CRLF-normalized count); marker assertions green
- Task 3: workflow static assertion green (`claude-md-check.mjs`, `--root-template`, `--smoke-manifest`, `--leg ubuntu` all present); **the exact CI command line rehearsed locally end-to-end green**; CRLF-guard one-liner rehearsed against the real index — exempts `scripts/checks/tests/fixtures/crlf.md` via its `-text` attribute, flags nothing else

## Deviations from Plan

### Orchestrator-context deferrals (not auto-fixable from a parallel worktree)

**1. [Deferred] Task 3 PR-flow + first green run + ruleset append**
- **Found during:** Task 3
- **Issue:** The plan instructs landing via PR, watching the first GitHub run, then appending `claude-md-check` to the ruleset's required checks. This agent runs in a no-push parallel worktree, and per the 01-09 SUMMARY the GATE-10 ruleset itself does not exist yet (its POST is classifier-blocked, pending human apply).
- **Resolution:** Workflow committed in-tree with full local rehearsal of every CI step. The ordered follow-up (Pitfall 4 — never require a check before it reports) is recorded in User Setup Required below.

No other deviations — content and wiring executed exactly as planned. No auth gates.

## Deferred Issues

1. **First claude-md-check run on GitHub:** after the orchestrator merges and pushes, confirm green: `gh run list --workflow=claude-md-check.yml --limit 1` (then `gh run watch` if in progress).
2. **Ruleset append (ONLY after step 1 is green AND the 01-09 ruleset has been POSTed):**
   ```bash
   RULESET_ID=$(gh api repos/tungns84/modern-app-creator/rulesets --jq '.[] | select(.name=="GATE-10") | .id')
   # Read current rules, add context "claude-md-check" to required_status_checks, then:
   gh api -X PUT "repos/tungns84/modern-app-creator/rulesets/$RULESET_ID" --input <updated-payload.json>
   ```
   Required-checks list becomes `[plan-compliance, stack-ubuntu, smoke-windows, smoke-macos, claude-md-check]`. Record the read-back here once applied.

## Threat Model Dispositions Applied

- **T-01-31 (constitution tampering):** `backend/CLAUDE.md`, `frontend/CLAUDE.md`, `templates/claude/**` were already on the `.cowork/tiers.json` T3 list (verified) and are CODEOWNERS-covered — edits ride the PR + plan-compliance gate.
- **T-01-32 (manifest weakened to test nothing):** manifest declares 3 commands per leg; `runSmoke` throws on zero declared commands (01-07 test-pinned); `templates/claude/**` is T3-pathed.
- **T-01-SC:** zero npm dependencies — accepted as planned.

## Known Stubs

None — all five artifacts are fully wired and consumed by the committed workflow. Commands marked **[not yet available]** in the root template are documented future arrivals (Phase 2/4), deliberately excluded from the smoke manifest — not stubs.

## Threat Flags

None beyond the plan's threat model — the only new surface is the CI workflow, which runs with `contents: read` and executes only the manifest-declared commands via `execFileSync` (no shell).

## User Setup Required

The two Deferred Issues above (first green run confirmation, then ruleset append in that strict order) plus the still-pending 01-09 platform applies they depend on.

## Next Phase Readiness

- Plan 01-11 (`task verify`) can reference the constitutions; the `verify` task joins the same Taskfile the smoke manifest exercises (manifest needs no change — `task --list` picks it up automatically).
- Phase 2 adds `./mvnw verify` to both the template's command table (drop the [not yet available] marker) and the smoke manifest (ubuntu leg if Docker-needing).

## Self-Check: PASSED

All 5 artifacts + SUMMARY present on disk; task commits f9065fa, da4b65c, 6764385 verified in git log (this SUMMARY rides its own docs commit on top); no file deletions across the plan's commits; no untracked files left.

---
*Phase: 01-dogfood-bootstrap-enforcement*
*Completed: 2026-06-12*
