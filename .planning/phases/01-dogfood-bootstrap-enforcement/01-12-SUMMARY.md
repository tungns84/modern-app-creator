---
phase: 01-dogfood-bootstrap-enforcement
plan: 12
subsystem: methodology
tags: [specs, dogfood, ai-cowork, enforcement-ratchet, t3]

# Dependency graph
requires: []
provides:
  - "Six hand-written spec units specs/001..006 ({spec,plan}.md each, tier: T3, Approved-by audit line) — the manual-dogfood stage of the enforcement ratchet (D-05)"
  - "specs/NNN-short-name directory convention, numbering from 001 (000-example reserved for Phase 8)"
  - "feat/NNN-short-name branch-binding convention — the key both the L1 hook (01-04) and the L2 CI gate (01-09) use to bind a change to its spec unit"
  - "Commit REQ-ID citation rule documented in spec 001"
affects: [01-04 hooks, 01-09 plan-compliance CI, 01-05 local stack, 01-06 init script, 01-07/01-10/01-11 claude pack, 01-08 ADRs, phase-8 tutorial]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "AI-COWORK §3.2/§4 spec-unit format: spec.md (story, acceptance criteria, REQ-IDs) + plan.md (files, modules, tests, tier, Approved-by); tasks.md omitted per §4 (optional)"
    - "D-02 audit-line rule stated verbatim in every plan.md: the Approved-by line is audit trail, NOT authorization proof"

key-files:
  created:
    - specs/001-hooks-enforcement/spec.md
    - specs/001-hooks-enforcement/plan.md
    - specs/002-plan-compliance-ci/spec.md
    - specs/002-plan-compliance-ci/plan.md
    - specs/003-local-stack/spec.md
    - specs/003-local-stack/plan.md
    - specs/004-init-script/spec.md
    - specs/004-init-script/plan.md
    - specs/005-claude-pack/spec.md
    - specs/005-claude-pack/plan.md
    - specs/006-adr-foundation/spec.md
    - specs/006-adr-foundation/plan.md
  modified: []

key-decisions:
  - "Approved-by login set to tungns84 (repo git user) with the W-001 solo-waiver phrasing mandated by the plan"
  - "Conventions (specs/NNN dir, feat/NNN-* branch, REQ-ID commits) documented inside spec 001 and echoed as a Branch line in every plan.md — no extra README needed, stays within the planned file list"
  - "Spec 006 cites AGENT-09 as its Phase-1 REQ anchor; FR-B11/FR-B13/D-17 referenced as downstream PRD IDs (ADR set = constitution change = T3 per AI-COWORK §2)"

patterns-established:
  - "Spec-unit format: every future T3 deliverable gets specs/NNN-*/{spec,plan}.md before implementation"
  - "Branch binding: feat/NNN-* is the load-bearing key both enforcement layers consume"

requirements-completed: [AGENT-06, AGENT-09]

# Metrics
duration: 12min
completed: 2026-06-11
---

# Phase 1 Plan 12: Manual Dogfood Spec Units Summary

**Six approved T3 spec units (specs/001..006, spec.md + plan.md each) put the manual-dogfood stage of the enforcement ratchet on record before any hook or CI gate exists, establishing the specs/NNN + feat/NNN-* binding conventions both enforcement layers consume**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-06-11T12:50:55Z
- **Completed:** 2026-06-11T13:02:00Z
- **Tasks:** 2
- **Files modified:** 12 (all created)

## Accomplishments

- All six Phase-1 T3 deliverables (hooks, plan-compliance CI, local stack, init script, claude pack, ADR set) now have an approved spec unit BEFORE automation enforces anything (D-05, AGENT-09 ratchet evidence)
- Every plan.md carries `tier: T3`, the exact Approved-by audit line (`tungns84 2026-06-11`, W-001 solo waiver), and the verbatim D-02 sentence that the line is audit trail, not authorization proof
- Zero `.planning/` references anywhere under `specs/` (D-06/D-07 — units ship in the template; meta-link-lint in plan 01-11 will enforce this mechanically)
- Acceptance criteria lifted from the matching phase plans' must_haves (01-04, 01-09, 01-05, 01-06, 01-07/10/11, 01-08), so spec content and downstream implementation plans cannot drift at birth
- Conventions established: `specs/NNN-short-name/` numbering from 001 (000-example reserved), `feat/NNN-short-name` branch binding, REQ-ID commit citation

## Task Commits

Each task was committed atomically:

1. **Task 1: Spec units 001–003 (hooks, plan-compliance CI, local stack)** - `904f2e9` (docs)
2. **Task 2: Spec units 004–006 (init script, claude pack, ADR foundation)** - `52cbe82` (docs)

## Files Created/Modified

- `specs/001-hooks-enforcement/{spec,plan}.md` - L1 hook layer unit (AGENT-03, AGENT-04); also documents the NNN/branch/commit conventions
- `specs/002-plan-compliance-ci/{spec,plan}.md` - L2 CI floor unit (GATE-10); consumed by plan 01-09
- `specs/003-local-stack/{spec,plan}.md` - `task up` 6-service stack unit (FOUND-02)
- `specs/004-init-script/{spec,plan}.md` - init/rename engine unit (FOUND-12)
- `specs/005-claude-pack/{spec,plan}.md` - three-layer CLAUDE.md + 5 skills + GATE-12 checks unit (AGENT-01, AGENT-02, GATE-12)
- `specs/006-adr-foundation/{spec,plan}.md` - ADR 0001–0003 unit (AGENT-09; constitution change = T3 per AI-COWORK §2)

## Decisions Made

- Approved-by github-login resolved to `tungns84` (repo git user) — exact line format per plan instruction
- Spec 006's Phase-1 REQ anchor is AGENT-09 (the acceptance set for spec 006 has no dedicated GATE/FOUND ID); FR-B11/FR-B13/D-17 cited as the downstream decision subjects
- `tasks.md` deliberately omitted in all six units per AI-COWORK §4 ("optional") and D-05 — stated in the plan's Format note, no requirement gap for AGENT-06

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. (One commit message contained a literal `§` escape; amended to "section 2" before any further work — cosmetic, same task commit `52cbe82`.)

## Human Verification Pending (end-of-phase)

Task 2 carries a `human-check`: the developer confirms the six Approved-by lines reflect their real H2 approval of this phase plan set (dogfood integrity, D-05/D-10). Config `human_verify_mode: end-of-phase` — to be confirmed during phase verification, not blocking this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plans 01-04 (hooks) and 01-09 (CI gate) can now verify the presence of the bound approved spec units they enforce — the ratchet's stage 1 (manual specs) is visibly first in commit history (PRD §13.1 evidence)
- The `feat/NNN-*` binding convention is on record for all subsequent T3 work

## Self-Check: PASSED

- All 12 created files exist on disk (verified via fs access in the combined node assertion)
- Commits `904f2e9` and `52cbe82` exist in git log
- Combined verify passed: `OK 6 specs` (tier: T3 + Approved-by present + zero .planning/ links in every plan.md); every spec.md cites at least one Phase-1 REQ-ID

---
*Phase: 01-dogfood-bootstrap-enforcement*
*Completed: 2026-06-11*
