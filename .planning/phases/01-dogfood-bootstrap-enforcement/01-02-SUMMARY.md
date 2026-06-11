---
phase: 01-dogfood-bootstrap-enforcement
plan: 02
status: complete
subsystem: spikes
tags: [spike, q002, q004, github-api, verify-fast, gate-contract]
requires: []
provides:
  - "verify --fast gate-set contract + timing harness spec (D-19)"
  - "Q-002 GATE-10 mechanism empirics (A5/A6/A10 resolved; copy-paste trigger block + jq reduction for 01-09)"
affects:
  - "01-09 plan-compliance gate (unblocked — consumes Q-002 trigger block, jq reduction, rerun-API unstick step, strict commit-binding decision)"
  - "01-11 Taskfile verify wiring (unblocked — consumes Q-004 contract)"
tech-stack:
  added: []
  patterns:
    - "Gate runner contract: ordered (name, command) pairs, no short-circuit, budget-as-a-gate"
    - "GATE-10 dual-trigger + rerun-failed-sibling pattern (Pitfall 4 fix, empirically validated)"
key-files:
  created:
    - .planning/spikes/q004-verify-fast.md
    - .planning/spikes/q002-hosting-api.md
  modified: []
decisions:
  - "verify --fast Phase-1 membership = 7 static gates; full = fast superset + stack-up smoke + init-parity local (D-19)"
  - "Timing format locked: GATE <name> <millis>ms <PASS|FAIL> + TOTAL line; fast budget <60s enforced as a gate"
  - "Fast-vs-full divergence metric defined now (per-rule failure sets over Phase-8 CI history, target <5%)"
  - "Commit-binding strictness: YES — CI gate asserts commit_id == head SHA on counted approvals (mirrors dismiss-stale, covers unverified live-dismissal gap)"
  - "Platform half of GATE-10 = rulesets on the now-PUBLIC real repo (user decision 2026-06-11); CI-only compensation posture NOT chosen"
  - "Pitfall-4 fix locked: pull_request_review job must rerun the failed sibling pull_request run via Actions API — a green same-named run from another suite does NOT unstick the required check (empirically refuted naive A6)"
metrics:
  duration: ~45m total (two sessions; Task 1 resumed after human-action checkpoint)
  tasks_completed: 2
  tasks_total: 2
  completed: 2026-06-11
---

# Phase 1 Plan 02: Upfront Spikes Q-002 + Q-004 Summary

**One-liner:** Q-004 verify-fast contract locked (7-gate static set, `GATE <name> <millis>ms <PASS|FAIL>`, budget-as-a-gate); Q-002 empirics complete on a live throwaway repo — self-approval 422-blocked (A10), reviews-API shape + Bot discriminator confirmed (A5), naive A6 REFUTED and replaced with a validated rerun-API unstick design, full D-03 ruleset proven available+enforced on public+Free, strict commit-binding decided YES.

## Task Status

| Task | Name | Status | Commit |
|------|------|--------|--------|
| 1 | Q-002 spike — GitHub PR-review mechanism empirics | COMPLETE | 484b14e |
| 2 | Q-004 spike — verify-fast gate-set contract | COMPLETE | 3855f1c |

## What Was Built

### Task 1: `.planning/spikes/q002-hosting-api.md`

Live empirical run on throwaway repo `tungns84/q002-spike` (public, Free plan), 2 PRs, 4 workflow runs, 1 ruleset. Key results:

- **A10 RESOLVED:** author APPROVE and REQUEST_CHANGES both rejected HTTP 422 (REST + GraphQL, verbatim recorded). Authors can only submit `COMMENTED` reviews on own PRs.
- **A5 RESOLVED (field shape):** `state`, `user.login`, `user.type`, `commit_id`, `submitted_at` confirmed live; chronological ordering confirmed; `user.type: "Bot"` discriminator confirmed (T-01-04 mitigation field). Full state enum partly [Unverified] (`CHANGES_REQUESTED`/`DISMISSED`/`PENDING` unproducible solo) — 01-09 fixtures must cover all five.
- **A6 RESOLVED with design correction (the spike's most valuable finding):** the `pull_request_review`-triggered run reports a same-named check-run on the same head SHA, but does **NOT** supersede the failed check-run from the `pull_request` check suite — `mergeable_state` stayed `blocked` with only the required-status-check rule active. In-place rerun of the failed run (`gh run rerun`) replaced the red check-run and flipped state to `clean` immediately. Plan 01-09's workflow MUST include the rerun-failed-sibling step (exact command in the report) and needs `actions: write`.
- **Platform matrix RESOLVED:** private+Free → 403 on both rulesets and classic protection (verified pre-flip); public+Free → full D-03 ruleset (require-PR, code-owner, dismiss-stale, required check, `allowed_merge_methods:["merge"]`) created, active, and enforced — direct push to main rejected with GH013; `current_user_can_bypass: "never"` (admin not exempt); never-reported required check blocks merge fail-closed ("expected").
- **Commit-binding DECIDED: strict YES** — `commit_id == head SHA` mirrors dismiss-stale semantics exactly (no extra friction) and covers the [Unverified] live-dismissal gap as defense-in-depth.
- Report carries the copy-paste `on:` trigger block, token-permissions block, `--paginate --slurp` jq reduction (latest-per-user, APPROVED, non-bot, non-author, commit-bound), and the rerun unstick snippet for plan 01-09.

### Task 2: `.planning/spikes/q004-verify-fast.md`

- Fast/full gate-set membership tables, no gate unassigned (fast = 7 static gates: hooks-test, checks-test, claude-md-check, settings-lint, skills-lint, meta-link-lint, compose-config; full = fast + stack-up-smoke + init-parity-local).
- Timing output format specified verbatim for plan 01-11: `GATE <name> <millis>ms <PASS|FAIL>` + `TOTAL` line; fast TOTAL <60s asserted as a gate itself; Phase-1 baseline expectation <10s.
- Growth rule Phases 2–8 (compile/ArchUnit/Modulith-verify/pure-unit join fast in Phase 2; anything needing Docker/Testcontainers/browser is full-only forever).
- Divergence metric defined now: `|F_full \ F_fast| / |F_full| < 5%`, per-rule failure sets over Phase-8 CI history.
- Phase-1 baseline timings: deferred to plan 01-11 (no check scripts/Taskfile exist in-tree at spike time).

## Deviations from Plan

### 1. [Human-action checkpoint] Task 1 paused at permission gate, resumed after user authorization

- **Found during:** Task 1 first attempt (`gh repo create` denied by execution-environment permission classifier).
- **Resolution:** user authorized `gh repo create`/`gh repo delete` for the spike repo and decided the platform question (real repo flipped PUBLIC; rulesets chosen over CI-only posture). Documented as normal auth-gate flow, not a bug.

### 2. Throwaway spike repo NOT deleted — manual cleanup required

- **Found during:** Task 1 cleanup step.
- **Issue:** `gh repo delete tungns84/q002-spike --yes` → HTTP 403; token scopes (`gist, read:org, repo, workflow`) lack `delete_repo`. Per user instruction, no workaround attempted.
- **Leftover:** <https://github.com/tungns84/q002-spike> (public; contains only synthetic fixtures; both PRs closed). **Manual cleanup:** delete via web UI, or `gh auth refresh -h github.com -s delete_repo` then `gh repo delete tungns84/q002-spike --yes`.
- **Acceptance-criteria impact:** plan criterion "throwaway repo deleted (gh repo view exits non-zero)" NOT met — explicitly waived by user instruction at checkpoint resolution.

### 3. [Rule 2 - added scenario] Red-to-green flip test added beyond the plan's scenario list

- **Found during:** Task 1 scenario 3 — same-named green check-run did not visibly satisfy the required check; both initial runs were green, leaving Pitfall 4 only inferred.
- **Fix:** added PR #2 with a review-count-conditional gate to produce a genuine red `pull_request` run, then empirically isolated the required-status-check rule (ruleset PUT) and validated the rerun-API fix. This refuted naive A6 — exactly the stuck-red failure 01-09 would otherwise have shipped.

### 4. Real-repo classic-protection probe inconclusive (non-blocking)

- `GET /branches/main/protection` on the real repo returned `404 Branch not found` — remote `main` has no commits yet (default branch is declared `main`, local work is on `master`/worktree branches). Recorded as-is; irrelevant since rulesets are the chosen mechanism.

## Authentication Gates

- Task 1 first session: external-repo-creation permission gate (resolved by user at checkpoint — see Deviation 1).
- `delete_repo` scope gap surfaced as predicted in the checkpoint report; user pre-authorized the record-and-continue path (Deviation 2).

## Known Stubs

None — no implementation code in this plan.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: leftover-public-repo | (external) tungns84/q002-spike | T-01-06 residual: throwaway repo not deleted (scope gap); contains only synthetic fixtures, no real code — manual deletion pending |

## Self-Check: PASSED

- FOUND: .planning/spikes/q002-hosting-api.md
- FOUND: .planning/spikes/q004-verify-fast.md
- FOUND: commit 3855f1c (Task 2)
- FOUND: commit 484b14e (Task 1)
- Task 1 automated verify (node key assertion: pull_request_review/APPROVED/dismiss/merge/A5/A6): OK
- Task 2 automated verify (node key assertion): OK (prior session)
