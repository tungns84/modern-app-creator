---
phase: 01-dogfood-bootstrap-enforcement
plan: 02
status: blocked
subsystem: spikes
tags: [spike, q002, q004, github-api, verify-fast, gate-contract]
requires: []
provides:
  - "verify --fast gate-set contract + timing harness spec (D-19) — COMPLETE"
  - "Q-002 GATE-10 mechanism empirics — INCOMPLETE (permission gate; partial live findings below)"
affects:
  - "01-09 plan-compliance gate (blocked on Q-002 completion + a new platform-availability decision)"
  - "01-11 Taskfile verify wiring (unblocked — consumes Q-004 contract)"
tech-stack:
  added: []
  patterns:
    - "Gate runner contract: ordered (name, command) pairs, no short-circuit, budget-as-a-gate"
key-files:
  created:
    - .planning/spikes/q004-verify-fast.md
  modified: []
decisions:
  - "verify --fast Phase-1 membership = 7 static gates; full = fast superset + stack-up smoke + init-parity local (D-19)"
  - "Timing format locked: GATE <name> <millis>ms <PASS|FAIL> + TOTAL line; fast budget <60s enforced as a gate"
  - "Fast-vs-full divergence metric defined now (per-rule failure sets over Phase-8 CI history, target <5%)"
metrics:
  duration: ~15m (partial — plan stopped at permission gate)
  tasks_completed: 1
  tasks_total: 2
  completed: 2026-06-11
---

# Phase 1 Plan 02: Upfront Spikes Q-002 + Q-004 Summary

**One-liner:** Q-004 verify-fast contract locked (7-gate static set, `GATE <name> <millis>ms <PASS|FAIL>` format, budget-as-a-gate); Q-002 stopped at an execution-sandbox permission gate (external repo creation denied) — but live read-only probes already proved rulesets AND classic branch protection return HTTP 403 on this private Free-plan repo, which forces a platform-availability decision before plan 01-09.

## Task Status

| Task | Name | Status | Commit |
|------|------|--------|--------|
| 1 | Q-002 spike — GitHub PR-review mechanism empirics | BLOCKED (permission gate) — partial live findings preserved below | — |
| 2 | Q-004 spike — verify-fast gate-set contract | COMPLETE | 3855f1c |

## What Was Built

### Task 2 (complete): `.planning/spikes/q004-verify-fast.md`

- Fast/full gate-set membership tables, no gate unassigned (fast = 7 static gates: hooks-test, checks-test, claude-md-check, settings-lint, skills-lint, meta-link-lint, compose-config; full = fast + stack-up-smoke + init-parity-local).
- Timing output format specified verbatim for plan 01-11: `GATE <name> <millis>ms <PASS|FAIL>` + `TOTAL` line; fast TOTAL <60s asserted as a gate itself; Phase-1 baseline expectation <10s.
- Growth rule Phases 2–8 (compile/ArchUnit/Modulith-verify/pure-unit join fast in Phase 2; anything needing Docker/Testcontainers/browser is full-only forever).
- Divergence metric defined now: `|F_full \ F_fast| / |F_full| < 5%`, per-rule failure sets over Phase-8 CI history.
- Phase-1 baseline timings: deferred to plan 01-11 (verified no check scripts/Taskfile exist in-tree at spike time — nothing real to benchmark).

## Deviations from Plan

### Blocked: Task 1 permission gate (NOT an auto-fixable deviation)

- **Found during:** Task 1, first action (`gh repo create tungns84/q002-spike --private`).
- **Issue:** The execution environment's permission classifier denied creating an external GitHub repository ("scope escalation … destination the user never authorized"). The plan explicitly instructs creating a throwaway repo, but the sandbox does not accept the plan file as authorization. Working around the denial (e.g., `gh api POST /user/repos`) would bypass its intent and was not attempted.
- **Also relevant:** the current `gh` token lacks the `delete_repo` scope (scopes: gist, read:org, repo, workflow), so the plan's final cleanup step (`gh repo delete --yes`) would have required `gh auth refresh -s delete_repo` (interactive) anyway.
- **Action taken:** stopped Task 1 per protocol; completed independent Task 2; gathered all read-only (side-effect-free) live evidence possible (below); returned a checkpoint to the orchestrator.

## Q-002 Partial Live Findings (read-only, verified 2026-06-11 — reuse, do not re-probe)

These were captured with authenticated read-only `gh api` calls; the continuation agent should fold them into `.planning/spikes/q002-hosting-api.md` verbatim:

1. **Rulesets unavailable on the real repo.** `GET /repos/tungns84/modern-app-creator/rulesets` → **HTTP 403** `"Upgrade to GitHub Pro or make this repository public to enable this feature."` Repo is `private: true`, account plan Free.
2. **Classic branch protection equally unavailable.** `GET /repos/tungns84/modern-app-creator/branches/main/protection` → **HTTP 403**, same message. There is NO platform-side fallback on this repo as-is: no required status checks, no required reviews, no dismiss-stale, no merge-method restriction, no push protection on main.
3. **Reviews API shape confirmed live** (public-repo read-only sample, `repos/cli/cli/pulls/*/reviews`): fields `state`, `user.login`, `user.type`, `submitted_at`, `commit_id` present; list chronological by `submitted_at`. Observed states live: `APPROVED`, `COMMENTED` (A5 partially confirmed; `DISMISSED`/`CHANGES_REQUESTED`/`PENDING` remain [Unverified] from docs).
4. **Bot discriminator confirmed live:** review objects by `copilot-pull-request-reviewer[bot]` carry `user.type: "Bot"` — the exact field the GATE-10 bot-exclusion (T-01-04 mitigation) relies on. RESOLVED for the field-shape half of A5.

### Consequence for plan 01-09 (decision needed — surfaced to user)

Finding 1+2 means GATE-10's platform half (ruleset: require-PR, code-owner review, dismiss-stale, required check, merge-commit-only — D-02/D-03) **cannot be enabled at all** on the current private+Free repo. Options: (a) make the repo public, (b) upgrade plan (Pro/org), (c) CI-only enforcement posture with CI-side strict commit-binding compensating for missing dismiss-stale. This is an architectural decision (Rule 4) that also reshapes what the Q-002 throwaway-repo scenarios must test.

## Known Stubs

None — no implementation code in this plan.

## Threat Flags

None beyond the plan's own threat model (T-01-06 throwaway-repo leak risk never materialized — repo was never created).

## Next Steps (for orchestrator / continuation agent)

1. User decision: authorize `gh repo create`/`gh repo delete` for the spike (Bash permission rule) AND decide the platform-availability question above (public vs Pro vs CI-only), since it changes Q-002's scenario 4.
2. Token prep for cleanup: `gh auth refresh -h github.com -s delete_repo` before the spike run.
3. Continuation agent executes Task 1 scenarios (self-approve 422, review-API shape on own PR, `pull_request_review` re-trigger of a required check, ruleset coverage at the decided visibility, commit-binding decision), writes `.planning/spikes/q002-hosting-api.md`, deletes the throwaway repo.

## Self-Check: PASSED

- FOUND: .planning/spikes/q004-verify-fast.md
- FOUND: commit 3855f1c (Task 2)
- Task 2 automated verify (node key assertion): OK
- .planning/spikes/q002-hosting-api.md intentionally NOT created (incomplete report would falsely satisfy the key-based verify assertion of plan 01-02 Task 1)
