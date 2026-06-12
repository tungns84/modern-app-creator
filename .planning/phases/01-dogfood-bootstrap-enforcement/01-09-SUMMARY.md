---
phase: 01-dogfood-bootstrap-enforcement
plan: 09
subsystem: ci-enforcement
tags: [github-actions, rulesets, gate-10, tdd, node-test, gh-api, codeowners, waivers]

# Dependency graph
requires:
  - phase: 01-04
    provides: ".claude/hooks/lib/tiers.mjs — shared matcher + binding helpers (matchTier, specNumberFromBranch, findBoundApprovedPlan rich return {found, path, hasApprovedBy, hasTier})"
  - phase: 01-05
    provides: "os-matrix workflow — required-check contexts stack-ubuntu, smoke-windows, smoke-macos"
  - phase: 01-12
    provides: "specs/002-plan-compliance-ci approved (the bound spec for this plan's own T3 changes); feat/NNN-* branch-binding convention"
  - phase: spikes/q002
    provides: "Empirical trigger block, jq reduction, Pitfall-4 rerun-failed-sibling fix, ruleset availability matrix, strict commit-binding decision"
provides:
  - "scripts/checks/plan-compliance.mjs — GATE-10 verdict core: evaluate() pure 8-step algorithm with PR<->spec binding (anti-rot), CLI mode for the workflow"
  - "scripts/checks/assert-non-author-approval.mjs — reduceReviews(): latest-per-user, APPROVED, non-author, non-Bot, strict commit_id == head SHA"
  - "scripts/checks/tests/plan-compliance.test.mjs — 14 fixture-tested cases (all five review states, binding/anti-rot/waiver matrix), 14/14 green"
  - ".github/workflows/plan-compliance.yml — dual triggers (pull_request + pull_request_review) + Pitfall-4 rerun-failed-sibling unstick"
  - ".github/CODEOWNERS — review surface for all T3 areas"
  - "01-09-ruleset-payload.json — ready-to-apply GATE-10 ruleset (W-001 platform deferral encoded)"
affects: [01-10, 01-11, phase-02, all-later-T3-changes]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "L2 CI gate imports the SAME lib/tiers.mjs as the L1 hooks — one matcher, one binding implementation (D-22)"
    - "Pure verdict core + thin gh-api shell: evaluate() takes plain data, the workflow fetches everything fresh per run (Pitfall 5)"
    - "PR-based execution flow for T3 changes: feat/NNN-short-name branch (the branch IS the spec binding) -> PR -> required checks green -> merge commit (D-03)"

key-files:
  created:
    - scripts/checks/plan-compliance.mjs
    - scripts/checks/assert-non-author-approval.mjs
    - scripts/checks/tests/plan-compliance.test.mjs
    - scripts/checks/tests/fixtures/pr-files-*.json (4)
    - scripts/checks/tests/fixtures/pr-reviews-*.json (4)
    - .github/workflows/plan-compliance.yml
    - .github/CODEOWNERS
    - .planning/phases/01-dogfood-bootstrap-enforcement/01-09-ruleset-payload.json
  modified: []

key-decisions:
  - "Workflow token includes actions: write (beyond the plan's contents/pull-requests read) — Q-002 Scenario 3c proved the rerun-failed-sibling call is MANDATORY to unstick Pitfall-4 red checks; the spike's copy-paste artifact carries this permission"
  - "Workflow checks out the PR HEAD SHA (not the merge ref) so spec binding reads specs/ at the same commit the approval is bound to"
  - "Probe PRs prepared as pushed branches (test/gate-probe, feat/002-gate-probe @ 1b34bcc) — PR creation and repo-settings mutations were classifier-blocked; exact payloads recorded below for one-command apply"

patterns-established:
  - "GATE-10 FAIL output contract: one line per reason naming the violated rule + the fix (FR-E08)"
  - "Waiver register evaluated on EVERY run with injected clock; waiver bypasses identity ONLY, never spec binding"

requirements-completed: [GATE-10, AGENT-09]

# Metrics
duration: ~25min (continuation session; RED phase done in the killed predecessor session)
completed: 2026-06-12
---

# Phase 01 Plan 09: Plan-compliance CI gate (L2 floor) Summary

**GATE-10 verdict core (PR↔spec binding + reviews reduction + waiver register) fixture-tested 14/14, dual-trigger workflow with the Q-002 Pitfall-4 unstick, CODEOWNERS shipped; platform mutations (merge-methods PATCH + ruleset POST + probe PRs) classifier-blocked with payloads staged ready-to-apply.**

## Performance

- **Duration:** ~25 min (this continuation session) + predecessor RED session
- **Started:** 2026-06-12 (continuation; predecessor killed by provider session limit after RED)
- **Completed:** 2026-06-12 (code complete; platform apply pending — see checkpoint)
- **Tasks:** 2 complete + 1 partial (Task 3 files committed and locally verified; external mutations blocked)
- **Files modified:** 14 created

## Accomplishments

- **TDD RED→GREEN complete:** 14/14 tests green covering the full Pitfall 3/4/5 + binding/anti-rot + D-10 matrix; all five review states (APPROVED, CHANGES_REQUESTED, COMMENTED, DISMISSED, PENDING) in fixtures mirroring Q-002-observed field shapes
- **D-22 honored:** `evaluate()` imports `matchTier`/`loadTiers`/`specNumberFromBranch`/`findBoundApprovedPlan` from `.claude/hooks/lib/tiers.mjs` — grep confirms the only matcher/binding implementations live in the lib; `lib/tiers.mjs` untouched
- **Anti-rot (T-01-36) proven:** unrelated approved specs 001-006 never satisfy the gate (fixture case 4 + live local rehearsal below); waiver W-001 provably never bypasses spec binding (case 12)
- **Strict commit binding (T-01-27):** approvals count only when `commit_id == head SHA` — mirrors dismiss-stale semantics, safe even if platform dismissal has gaps
- **Workflow wired per spike verbatim:** dual triggers, `--paginate --slurp | add` pagination fix, PR number derived once from the event, rerun-failed-sibling step gated to `pull_request_review` after a passing verdict

## Task Commits

1. **Task 1 (RED): failing verdict suite** — `b6701ee` (test) — predecessor session
2. **Task 2 (GREEN): verdict core + reviews reduction** — `fa1ec51` (feat)
3. **Task 3 (wire, file half): workflow + CODEOWNERS** — `1b34bcc` (feat)

**Plan metadata:** SUMMARY + ruleset payload committed on this branch (see final commit).

## TDD Gate Compliance

- RED gate: `b6701ee test(01-09): add failing tests for plan-compliance verdict` — present
- GREEN gate: `fa1ec51 feat(01-09): implement plan-compliance verdict core` — present, after RED
- REFACTOR: not needed — GREEN implementation already minimal and clean (no refactor commit)

## Files Created/Modified

- `scripts/checks/plan-compliance.mjs` — evaluate() pure 8-step verdict (tier classify → binding resolve → bound-spec markers → identity → waiver) + CLI mode; zero npm deps
- `scripts/checks/assert-non-author-approval.mjs` — reduceReviews() latest-per-user reduction + CLI mode
- `scripts/checks/tests/plan-compliance.test.mjs` + 8 fixtures — the executable GATE-10 specification (14 cases)
- `.github/workflows/plan-compliance.yml` — required-check wiring, job id `plan-compliance` = ruleset context
- `.github/CODEOWNERS` — all T3 surfaces owned by @tungns84; requirement itself deferred under W-001
- `.planning/phases/01-dogfood-bootstrap-enforcement/01-09-ruleset-payload.json` — ready `gh api --input` payload

## Local rehearsal evidence (live-probe preview)

The CLI was run against the REAL diff of this branch vs origin/master (13 T3 files, no plan.md in diff):

- **Probe (a) preview** — `--branch test/gate-probe`, zero reviews:
  `FAIL [GATE-10 binding]: T3 path(s) touched (...) but head branch 'test/gate-probe' is not bound to a spec unit ... Unrelated approved specs elsewhere in the tree never satisfy GATE-10.` → exit 1
- **Probe (b) preview** — `--branch feat/002-gate-probe`, zero reviews, W-001 active:
  `WARNING [D-10 waiver]: ... identity step passed ONLY via waiver W-001 (scope: self-approval, expires: 2026-09-30) ...` → `verdict: PASS`, exit 0

## CHECKPOINT — pending platform actions (classifier-blocked)

The Claude Code auto-mode classifier denied all external mutations (repo-settings PATCH, ruleset POST, `gh pr create`), exactly as the wave context anticipated. Everything is staged; each item is one command/click:

**1. D-03 merge-commit-only (PATCH):**
```bash
gh api -X PATCH repos/tungns84/modern-app-creator \
  -F allow_squash_merge=false -F allow_rebase_merge=false -F allow_merge_commit=true
```

**2. GATE-10 ruleset (POST, payload staged):**
```bash
gh api -X POST repos/tungns84/modern-app-creator/rulesets \
  --input .planning/phases/01-dogfood-bootstrap-enforcement/01-09-ruleset-payload.json
```
Payload encodes the W-001 platform deferral: `required_approving_review_count: 0`, `require_code_owner_review: false`, `dismiss_stale_reviews_on_push: true`, `allowed_merge_methods: ["merge"]`, required checks `[plan-compliance, stack-ubuntu, smoke-windows, smoke-macos]` (NO claude-md-check — its workflow lands in 01-10).

**3. Probe PRs (branches already pushed @ 1b34bcc):**
- (a) unbound: https://github.com/tungns84/modern-app-creator/compare/master...test/gate-probe — expect `plan-compliance` FAIL with the binding reason
- (b) bound: https://github.com/tungns84/modern-app-creator/compare/master...feat/002-gate-probe — expect PASS + W-001 warning, mergeable under the ruleset
- Record both run URLs here, then close both PRs and delete the probe branches.

**4. Read-back (Task 3 automated verify):**
```bash
gh api repos/tungns84/modern-app-creator --jq '[.allow_squash_merge,.allow_rebase_merge,.allow_merge_commit]'   # expect [false,false,true]
gh api repos/tungns84/modern-app-creator/rulesets
```

**WARNING — apply-order:** the moment the ruleset is active, DIRECT PUSHES TO master ARE BLOCKED (GH013; admin NOT exempt per Q-002). The GSD orchestrator's local-merge-then-push flow for the remaining wave-3 plans (01-10, 01-11) must either complete BEFORE the ruleset is applied, or switch to the PR convention immediately.

**Current read-back (pre-apply):** `allow_squash_merge=true, allow_rebase_merge=true, allow_merge_commit=true`; rulesets `[]` — D-03 NOT yet enforced.

## W-001 platform deferral — recorded obligation (D-10)

Per `.cowork/waivers.json` W-001 `platformDeferred`, the ruleset ships with `require_code_owner_review` OFF and `required_approving_review_count=0` — the sole CODEOWNER is the only PR author, and GitHub natively 422s self-approval, so enabling either would deadlock every PR. **Obligation: when W-001 expires (2026-09-30) or a second person joins, BOTH settings MUST be enabled on the ruleset.** The no-self-approval rule remains fully enforced by the `plan-compliance` check itself (waiver-aware, with a prominent warning on every waived merge).

## PR-based execution flow (convention for 01-10/01-11 and all later phases)

From this plan on, every change touching T3 paths lands via:
1. feature branch `feat/NNN-short-name` — **the branch name IS the spec binding** GATE-10 enforces (`specs/NNN-*/plan.md` must exist, `tier: T3`, non-empty `Approved-by:`)
2. PR to master → required checks green (`plan-compliance` + os-matrix trio)
3. **merge commit** (D-03 — squash/rebase disabled)
4. the solo developer self-merges under W-001; the gate's waiver warning is the audit record

## Decisions Made

- `actions: write` added to workflow token permissions (Rule 2 deviation, below)
- Checkout pinned to `github.event.pull_request.head.sha` for both trigger events — spec binding and approval commit-binding read the same SHA
- Probe PRs staged as pushed branches + compare URLs rather than skipped — preserves the live-evidence requirement with one click left

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Workflow permissions extended with `actions: write`**
- **Found during:** Task 3 (workflow authoring)
- **Issue:** Plan text says token = `contents: read, pull-requests: read`, but the Q-002 spike (which the same task says to copy verbatim) proved the rerun-failed-sibling call is mandatory (Pitfall 4: a green `pull_request_review` run never replaces a red same-named `pull_request` check-run) and requires `actions: write`
- **Fix:** Permissions block copied from the spike's "Copy-Paste Artifacts" section including `actions: write` with the REQUIRED comment
- **Files modified:** .github/workflows/plan-compliance.yml
- **Verification:** Static key check green; spike Scenario 3c is the empirical basis. [Unverified] live under GITHUB_TOKEN — the spike re-ran with a user token; smoke-test on probe PR (a)→review→rerun when the probes run
- **Committed in:** 1b34bcc

### Blocked (checkpoint, not auto-fixable)

**2. [Permission gate] Repo-settings PATCH, ruleset POST, `gh pr create` denied by the auto-mode classifier**
- **Found during:** Task 3 (platform config)
- **Handling:** Per wave instructions ("if denied, checkpoint with the exact payload ready") — payloads staged (`01-09-ruleset-payload.json` + commands above), probe branches pushed, compare URLs recorded
- **Impact:** Task 3 acceptance criteria 2-4 (read-back assertions, ruleset existence, probe run URLs) pending the human apply step

---

**Total deviations:** 1 auto-fixed (Rule 2), 1 checkpoint (permission gate)
**Impact on plan:** No scope creep. The gate logic, workflow and CODEOWNERS are complete and verified; only the one-command platform mutations and two one-click PRs remain.

## Issues Encountered

- Predecessor session killed by provider limit after the RED commit; uncommitted GREEN drafts were reviewed against the test contract, found complete (14/14 on first run), and committed as-is
- MSYS path conversion broke `/tmp` paths between Node writes and reads on Windows — rehearsal used a worktree-local temp dir instead

## Known Stubs

None — no placeholder values or unwired data paths in the shipped files. The pending items are external platform state, not code stubs.

## User Setup Required

**Platform apply (4 numbered items in the CHECKPOINT section above):** merge-methods PATCH, ruleset POST, two probe PRs (open → record run URLs → close), read-back verify. All commands/URLs are copy-paste ready.

## Next Phase Readiness

- Plan 01-10 (claude-md-check): workflow can be added and then appended to the ruleset's required checks (the payload deliberately omits it — Pitfall 4 fail-closed)
- Plan 01-11 and later: follow the PR-based execution flow above once the ruleset is live
- Re-enable obligation (W-001 expiry 2026-09-30) recorded here and in waivers.json

---
*Phase: 01-dogfood-bootstrap-enforcement*
*Completed: 2026-06-12 (code); platform apply pending checkpoint*

## Self-Check: PASSED

All created files present; commits b6701ee, fa1ec51, 1b34bcc verified; test suite 14/14 green.
