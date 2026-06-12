---
phase: 01-dogfood-bootstrap-enforcement
verified: 2026-06-13T00:00:00Z
status: passed
score: 5/5 roadmap success criteria verified (11/11 requirement IDs accounted for; 7/7 gates green)
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "`task verify` runs every Phase-1 gate green on the shipped tree (meta-link-lint + checks-test self-test both PASS; spec 007 `.planning/` refs removed via PR #3)"
    - "macOS `task up` (FOUND-02) satisfied via waiver W-002 (scope macos-task-up-verification, expires 2026-09-30) per plan-01-05 must_have 'completed OR waived'"
  gaps_remaining: []
  regressions: []
deferred:
  - truth: "claude-md-check is a REQUIRED status check on the master ruleset (success criterion 2, second half: CLAUDE.md checks block CI)"
    addressed_in: "Documented follow-up in 01-10-SUMMARY (User Setup Required) — append after first green run"
    evidence: "01-10 must_have deliberately ordered the ruleset append AFTER the workflow's first green run (Pitfall 4: never require a check before it reports). The check still executes on every PR via its workflow triggers, so CLAUDE.md budget/smoke is enforced on PRs — it is simply not yet a blocking required-context. Tracked, not a phase-completion blocker."
---

# Phase 1: Dogfood Bootstrap & Enforcement — Verification Report

**Phase Goal:** The repo enforces its own methodology before any application code exists — every subsequent commit flows through S→P→I→V with hard T3 gates, and the local dev loop works on all 3 OS.
**Verified:** 2026-06-13
**Status:** passed
**Re-verification:** Yes — after gap closure (previous: gaps_found 4/5)
**HEAD:** f2ecd93 (master)

## Re-Verification Summary

The prior run (2026-06-12, HEAD 02ab8e3) flagged exactly two items. Both are now resolved against the live tree at HEAD f2ecd93, confirmed by re-running the decisive automated check and inspecting the source artifacts directly:

1. **BLOCKER (was: `task verify` RED via meta-link-lint D-06/D-07 on spec 007):** RESOLVED. PR #3 (merge b9016fd, fix commit 1a6ff81) replaced the `.planning/` path references in `specs/007-phase01-review-fixes/{spec,plan}.md` with inline prose. `grep -rn ".planning/" specs/` now returns nothing (exit 1). Re-ran `task verify` in this process: **all 7 gates PASS, exit 0, TOTAL 5386ms** — the two previously-RED gates (checks-test, meta-link-lint) are now both green. The meta-link-lint gate was NOT neutered: standalone run confirms it still scans every shipped dir and reports zero meta refs.

2. **human-verification (was: macOS `task up` FOUND-02 unverified/unwaived):** RESOLVED via waiver. PR #4 (merge 9ebc5d1, commit da2a7d2) added W-002 to `.cowork/waivers.json` `{scope: "macos-task-up-verification", expires: "2026-09-30", approvedBy: tungns84}`. Today is 2026-06-13 — waiver valid. Plan-01-05's FOUND-02 must_have allowed "completed OR waived"; the waive path is satisfied. Windows `task up` was verified live (6 services healthy, 96s) and Linux is covered by os-matrix CI stack-ubuntu.

**Regression check:** The first-review fixes (CR-01/CR-02/WR-04) all remain present in code:
- CR-01: `packageLeaf = artifactId.replace(/-/g, '')` at `scripts/init-core.mjs:238-239`
- CR-02: `head_ref` passed via `env: HEAD_REF` and referenced as `"$HEAD_REF"` shell var — no `${{ }}` in the `run:` body (`.github/workflows/plan-compliance.yml:84,91`)
- WR-04: `if (Number.isNaN(nowMs))` fail-closed guard at `scripts/checks/plan-compliance.mjs:96`

No new gaps surfaced. No regressions.

## Goal Achievement

The enforcement spine is real, live, and demonstrably closed-loop: L1 PreToolUse hooks (fail-closed by construction) and the L2 CI gate share one `lib/tiers.mjs` matcher+binding (D-22); the live GitHub ruleset `gate-10-master` is `active`, merge-commit-only, with `plan-compliance + stack-ubuntu + smoke-windows + smoke-macos` as required checks; and four real PRs this session merged through that active ruleset (enforcement=active) — including a plan-compliance `failure → success` transition on a probe branch, proving the gate blocks and passes for real. The canonical local gate path `task verify` is now all-PASS on the shipped tree, and the 3-OS loop is verified live on Windows, covered by CI on Linux, and waived (W-002, time-boxed) for the macOS leg per the plan's own "completed OR waived" precondition.

### Roadmap Success Criteria

| # | Criterion | Status | Evidence |
| --- | --- | --- | --- |
| 1 | T3 Write/Edit denied without bound approved plan + T4 denied; T1 zero-ceremony | ✓ VERIFIED | `t3-plan-gate.mjs` fail-closed (try/catch→deny exit 0), branch-bound via `specNumberFromBranch`/`findBoundApprovedPlan`, anti-rot; `t4-command-guard.mjs` T4 deny + best-effort bypass scan; settings.json allows `task */./mvnw */npm run *`. Hooks live in settings.json PreToolUse. Q-010 pin 2.1.173 in tiers.json. |
| 2 | CI fails T3 PR without valid `Approved-by:` (identity via hosting API, no self-approval, survives squash/rebase); CLAUDE.md size + smoke checks block | ✓ VERIFIED | plan-compliance.yml: dual triggers, fresh `gh api` fetch, `reduceReviews` (latest-per-user, APPROVED, non-author, non-Bot, strict commit-binding), waiver-aware (WR-04 NaN-clock fail-closed present, regression-confirmed). Live ruleset active + merge-only. claude-md-check machinery green and runs on every PR via workflow trigger; its promotion to a *required* ruleset context is the deferred, intentionally-ordered follow-up (Pitfall 4) — does not block phase completion. |
| 3 | `task up` on Win/macOS/Linux without WSL gives full 6-service stack | ✓ VERIFIED | compose.yaml 6 healthchecked services (valkey/postgres16/mailpit/minio/keycloak26.6/otel-lgtm); Taskfile `up -d --wait`. Windows `task up` verified live (6 healthy, 96s). os-matrix.yml all 3 legs (ubuntu real `task up`, win/mac smoke). macOS `task up` waived via W-002 (time-boxed, expires 2026-09-30) — the plan's "completed OR waived" path. |
| 4 | `scripts/init.(sh\|ps1)` renames com.acme.app w/ auto-commit; 3-layer CLAUDE.md + 5 skills within budgets | ✓ VERIFIED | init-core.mjs + init.sh/init.ps1 delegation; CR-01 hyphen→package-leaf fix present (init-core.mjs:238) + regression test green. backend 59≤150, frontend 52≤150, root template renders 81≤200. 5 skills exist (plan+verify full, new-module/new-feature/design-implement skeletons w/ frontmatter). |
| 5 | Spike reports (Q-010, Q-002, Q-004, JDK 25 3-OS) + ADRs (FR-B11, FR-B13, Redis/Valkey) written before dependent phases | ✓ VERIFIED | .planning/spikes/: q002-hosting-api.md, q004-verify-fast.md, q010-hook-matrix.md, jdk25-toolchain.md, local-stack-verification.md + harnesses. ADRs 0001 (Valkey BSD-3), 0002 (permission sync, deprecated-before-delete), 0003 (undeclared-permission ArchUnit). No ADR links into .planning/. |

**Score:** 5/5 success criteria pass.

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `.claude/settings.json` | Hook dispatch + T1 allowlist + T4 deny | ✓ VERIFIED | Both PreToolUse hooks + SessionStart wired; allow/deny lists present |
| `.cowork/tiers.json` | Single tier source (D-22) | ✓ VERIFIED | testedVersion 2.1.173, meta.exclude, t3.paths, t4.commandPatterns |
| `.cowork/waivers.json` | W-001 self-approval + W-002 macOS deferral | ✓ VERIFIED | W-001 (self-approval) + W-002 (macos-task-up-verification) both expire 2026-09-30; valid at verify time |
| `.claude/hooks/lib/tiers.mjs` | Shared matcher + binding helpers | ✓ VERIFIED | matchTier/loadTiers/isT4Command/specNumberFromBranch/findBoundApprovedPlan all exported + used by L1 and L2 |
| `.claude/hooks/t3-plan-gate.mjs` | Branch-bound fail-closed deny | ✓ VERIFIED | try/catch→deny, names artifact+next step |
| `.claude/hooks/t4-command-guard.mjs` | T4 deny + bypass scan | ✓ VERIFIED | isT4Command + extractWriteTargets, fail-closed |
| `scripts/checks/plan-compliance.mjs` | GATE-10 verdict core | ✓ VERIFIED | 8-step algo + WR-04 NaN-clock fail-closed (line 96, regression-confirmed); imports shared lib |
| `scripts/checks/assert-non-author-approval.mjs` | Reviews reduction | ✓ VERIFIED | latest-per-user, APPROVED, non-author, non-Bot, commit-bound |
| `.github/workflows/plan-compliance.yml` | Required check, dual triggers | ✓ VERIFIED | CR-02 env-var fix present (head_ref via env, no `${{ }}` in run body); rerun-failed-sibling step |
| `.github/CODEOWNERS` | Code-owner surface | ✓ VERIFIED | present |
| `infra/compose.yaml` | 6-service stack | ✓ VERIFIED | valkey/valkey:8, 6 healthchecks; compose-config gate PASS |
| `Taskfile.yml` | up/down + verify/verify:fast | ✓ VERIFIED | `up -d --wait`; verify aggregates 7 gates w/ timing, exit 0 |
| `.github/workflows/os-matrix.yml` | 3-OS split | ✓ VERIFIED | stack-ubuntu/smoke-windows/smoke-macos |
| `scripts/init-core.mjs` (+ sh/ps1) | Rename engine + entry points | ✓ VERIFIED | CR-01 fixed (packageLeaf strips hyphen); init-parity.yml green |
| `templates/claude/ROOT-CLAUDE.template.md` | Source-only root | ✓ VERIFIED | placeholders; renders ≤200 |
| `backend/ + frontend/ CLAUDE.md` | In-place ≤150 | ✓ VERIFIED | 59 / 52 lines |
| `scripts/checks/meta-link-lint.mjs` | D-06 separation | ✓ VERIFIED | Gate functions correctly + now PASSES on the clean tree (zero meta refs in shipped dirs); standalone run exit 0 |
| 5 skills under `.claude/skills/` | plan+verify full, 3 skeleton | ✓ VERIFIED | frontmatter valid; plan emits §3.2 plan.md, verify wraps `task verify` (now green) |
| `docs/adr/0001-3` | 3 ADRs | ✓ VERIFIED | all present w/ Status |
| `specs/001-007/{spec,plan}.md` | dogfood units | ✓ VERIFIED | tier:T3 + Approved-by + REQ-IDs; spec 007 now inlines CR/WR evidence as prose, zero meta refs |
| `.planning/spikes/*` | 5 reports | ✓ VERIFIED | q002/q004/q010/jdk25/local-stack |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Full gate suite green | `task verify` | TOTAL 5386ms PASS — 7/7 gates (hooks-test, checks-test, claude-md-check, settings-lint, skills-lint, meta-link-lint, compose-config), exit 0 | ✓ PASS |
| meta-link-lint catches/passes correctly | `node scripts/checks/meta-link-lint.mjs` | "OK: zero meta planning-dir references in shipped dirs", exit 0 | ✓ PASS |
| specs/ clean of meta refs | `grep -rn ".planning/" specs/` | no matches (exit 1) | ✓ PASS |
| W-002 macOS waiver present + valid | inspect `.cowork/waivers.json` | scope macos-task-up-verification, expires 2026-09-30 (future) | ✓ PASS |
| CR-01 regression (hyphen→package leaf) | init-core.mjs:238 | `packageLeaf = artifactId.replace(/-/g, '')` present | ✓ PASS |
| CR-02 regression (no shell injection) | plan-compliance.yml:84,91 | head_ref via `env:`, referenced as `"$HEAD_REF"` | ✓ PASS |
| WR-04 regression (fail-closed clock) | plan-compliance.mjs:96 | `if (Number.isNaN(nowMs))` guard present | ✓ PASS |
| Live ruleset active | (carried from prior run) | active, merge-only, 4 required checks | ✓ PASS |
| Gate blocks/passes real PR | 4 PRs merged through active ruleset this session | probe: failure→success; PR#1–#4 merged | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| FOUND-02 | 01-05 | `task up` 6-service stack, 3 OS no WSL | ✓ SATISFIED | Stack + Taskfile + os-matrix VERIFIED; Windows live; Linux CI; macOS waived (W-002) per "completed OR waived" |
| FOUND-12 | 01-06 | `scripts/init.(sh\|ps1)` rename + auto-commit | ✓ SATISFIED | init-core + entry points + parity CI; CR-01 fixed |
| GATE-10 | 01-09 | Plan-compliance gate, identity via hosting API | ✓ SATISFIED | verdict core + reviews API + live active ruleset + 4 real PRs; CR-02/WR-04 hardening present |
| GATE-12 | 01-07/10 | CLAUDE.md size budgets + command smoke | ✓ SATISFIED | check machinery + workflow VERIFIED, green in `task verify`; promotion to required ruleset context is intentionally-deferred follow-up |
| AGENT-01 | 01-10 | 3-layer CLAUDE.md within budgets | ✓ SATISFIED | root template + backend/frontend in budget |
| AGENT-02 | 01-11 | 5 skills (plan/verify full, 3 skeleton) | ✓ SATISFIED | All 5 exist; the `verify` skill's contract (`task verify` green) now holds — exit 0 |
| AGENT-03 | 01-04 | PreToolUse hooks deny T3/T4 | ✓ SATISFIED | hooks live, fail-closed, proven this session |
| AGENT-04 | 01-04 | T1 allowlist zero-ceremony | ✓ SATISFIED | settings.json allow list + settings-lint lockstep |
| AGENT-05 | 01-01/methodology | S→P→I→V H1/H2/H3, T1-T4 enforced | ✓ SATISFIED | AI-COWORK.md documents tiers+checkpoints; hooks+CI+ruleset enforce |
| AGENT-06 | 01-12 | Spec artifacts, branch naming, REQ-IDs | ✓ SATISFIED | specs 001-007 w/ tier+Approved-by+REQ-IDs |
| AGENT-09 | 01 (all) | Dogfood: repo built via S→P→I→V w/ hooks active | ✓ SATISFIED | commit history + 4 PRs through the live gate; spec 007 itself a dogfood gap-closure unit; the meta-link violation was self-caught and self-fixed through the workflow |

All 11 requirement IDs are accounted for (none orphaned). 11/11 fully satisfied.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| — | — | — | — | None. The prior spec-007 `.planning/` BLOCKER is resolved. |

No debt markers (TBD/FIXME/XXX) found in phase files. WR-01/02/03/05 (L1 best-effort matcher hardening per D-16) and IN-01/02/03 (incl. root-CLAUDE.md JDK 26↔25 doc drift) remain tracked open in 01-REVIEW.md as explicit best-effort/follow-up — NOT counted as gaps (per the re-verification scope directive).

### Human Verification Required

None. The previously-routed macOS `task up` item is now satisfied via the time-boxed W-002 waiver (the plan-01-05 "completed OR waived" path). Note: W-002 expires 2026-09-30; on expiry or first macOS access, run `task up` on macOS, confirm all 6 services healthy, record in 01-05-SUMMARY.md, and retire the waiver.

### Gaps Summary

No remaining gaps. Both items from the prior run are resolved against the live tree:

1. The canonical `task verify` gate path is now all-PASS (7/7 gates, exit 0) — the spec-007 `.planning/` references that tripped meta-link-lint (D-06/D-07) and cascaded into the checks-test self-test were removed via PR #3, and the gate still functions correctly (it was not weakened to pass).
2. macOS `task up` (FOUND-02) is satisfied via the time-boxed waiver W-002, fulfilling the plan's explicit "completed OR waived" precondition.

The first-review hardening (CR-01/CR-02/WR-04) remains present in code (regression-confirmed). All 11 requirement IDs are satisfied; all 5 roadmap success criteria pass. The claude-md-check-not-yet-required item remains a documented, intentionally-ordered follow-up (deferred), not a gap. The phase goal — methodology enforced before app code, S→P→I→V with hard T3 gates, 3-OS loop — is achieved.

---

_Verified: 2026-06-13 (re-verification after gap closure)_
_Verifier: Claude (gsd-verifier)_
