# Q-002 Spike Report: GitHub Hosting-API Approver-Identity Mechanism (GATE-10 / D-02)

**Date:** 2026-06-11
**Method:** Empirical — live scenarios on throwaway repo `tungns84/q002-spike` (public, GitHub Free), plus read-only probes on `tungns84/modern-app-creator` (now public) and `cli/cli` (reviews-API shape sample). All HTTP responses below are verbatim. Anything not observed live is labeled **[Unverified]**.
**Account context:** `tungns84`, plan Free (`gh api user` → `plan: null`), token scopes `gist, read:org, repo, workflow` (no `delete_repo`).

---

## Verdict (exit criteria)

| Item | Verdict |
|------|---------|
| A10 — platform prevents self-approval | **RESOLVED — confirmed.** HTTP 422 on both REST and GraphQL, for both APPROVE and REQUEST_CHANGES on own PR. |
| A5 — review `state` enum + field shape | **RESOLVED (field shape) / PARTIAL (enum).** Fields `state`, `user.login`, `user.type`, `commit_id`, `submitted_at` confirmed live; chronological ordering confirmed. States observed live: `APPROVED`, `COMMENTED`. `CHANGES_REQUESTED`, `DISMISSED`, `PENDING` are [Unverified] from docs (cannot be produced solo — see Scenario 1/2 notes). Gate fixtures in plan 01-09 must cover all five. |
| A6 — `pull_request_review` run satisfies the required-check context | **RESOLVED — naive form REFUTED, corrected design validated.** The review-triggered run reports a same-named check-run on the same head SHA, but it does **NOT** supersede a failed check-run from the `pull_request` suite — merge stays `blocked`. In-place re-run of the failed run (re-run API) flips `mergeable_state` to `clean`. Gate must re-run the failed sibling run; see Pitfall-4 section. |
| Platform availability (rulesets) | **RESOLVED.** private+Free → 403; public+Free → full ruleset (require-PR, code-owner, dismiss-stale, required check, merge-method restriction) creates and enforces. |
| Commit-binding strictness (Pitfall 3) | **DECIDED: YES — strict `commit_id == head SHA`.** Rationale below. |
| Throwaway repo deleted | **NOT MET — recorded deviation.** `gh repo delete` → HTTP 403, token lacks `delete_repo` scope. Leftover: <https://github.com/tungns84/q002-spike> (manual cleanup required — web UI or after `gh auth refresh -h github.com -s delete_repo`). PRs closed; repo contains only synthetic fixtures. |

---

## Scenario Table

| # | Scenario | Expected | Observed (verbatim where quoted) | Verdict |
|---|----------|----------|----------------------------------|---------|
| 1a | Author self-APPROVE via REST `POST /pulls/1/reviews -f event=APPROVE` | Platform rejection | `{"message":"Unprocessable Entity","errors":["Review Can not approve your own pull request"],"status":"422"}` | **PASS** — A10 confirmed (REST) |
| 1b | Author self-APPROVE via `gh pr review --approve` (GraphQL) | Platform rejection | `failed to create review: GraphQL: Review Can not approve your own pull request (addPullRequestReview)` | **PASS** — A10 confirmed (GraphQL) |
| 1c | Author self-REQUEST_CHANGES on own PR | Unknown | `422 "Review Can not request changes on your own pull request"` | **PASS** — authors can only submit `COMMENTED` reviews on own PRs |
| 2a | Reviews API shape: `GET /pulls/N/reviews --paginate` | Fields per docs | Live on spike PR: `{"commit_id":"a7f9e32…","id":4477000795,"state":"COMMENTED","submitted_at":"2026-06-11T13:09:54Z","user_login":"tungns84","user_type":"User"}`. Public sample (`repos/cli/cli/pulls/*/reviews`, read-only, 2026-06-11): `state`, `user.login`, `user.type`, `submitted_at`, `commit_id` all present; list chronological by `submitted_at`; states seen: `APPROVED`, `COMMENTED` | **PASS** — A5 field-shape confirmed; full enum [Unverified] |
| 2b | Bot discriminator | `user.type == "Bot"` | Confirmed live on public sample: reviews by `copilot-pull-request-reviewer[bot]` carry `user.type: "Bot"` (T-01-04 mitigation field exists) | **PASS** |
| 2c | Dismiss a `COMMENTED` review (`PUT /reviews/{id}/dismissals`) | Unknown | `422 "Can not dismiss a commented pull request review"` | **PASS** (negative) — only APPROVED/CHANGES_REQUESTED reviews are dismissable; `DISMISSED` state unproducible solo → [Unverified] from docs |
| 3a | `pull_request_review: submitted` re-triggers the workflow | Re-run fires | Author-submitted `COMMENTED` review triggered run `27349138214`, `event=pull_request_review`, `headSha == PR head a7f9e32…`; check-run named `plan-compliance` (job id) reported on the head SHA | **PASS** — re-trigger works; check-name = job id; lands on head SHA |
| 3b | The green review-triggered run satisfies the required check despite an older red `pull_request` run (Pitfall 4 core) | A6 naive: yes | **NO.** PR #2: `pull_request` run red (0 reviews) → review submitted → `pull_request_review` run green on same head SHA, same name. Check-runs API shows BOTH (failure id 80806167718 + success id 80806328888). With ONLY `required_status_checks` rule active: `{"mergeable":true,"mergeable_state":"blocked"}`. Commit-level GraphQL `statusCheckRollup.state` = `FAILURE` | **FAIL (refutes naive A6)** — duplicate same-named check-runs in different check suites do NOT supersede each other |
| 3c | In-place re-run of the failed `pull_request` run unblocks | Unknown | `gh run rerun 27349237667` → run green, failed check-run **replaced** (old id gone from `/check-runs`); immediately after: `{"mergeable":true,"mergeable_state":"clean"}`, `mergeStateStatus: CLEAN` | **PASS** — re-run API is the validated unstick mechanism |
| 4a | Ruleset with full D-03 rule set on **public+Free** | Available per docs | `POST /repos/tungns84/q002-spike/rulesets` → 201, id 17556043, `enforcement: active`, all params accepted: `required_approving_review_count:1`, `dismiss_stale_reviews_on_push:true`, `require_code_owner_review:true`, `allowed_merge_methods:["merge"]`, `required_status_checks:[{"context":"plan-compliance"}]`; `current_user_can_bypass: "never"` (admin NOT exempt by default) | **PASS** — full availability on public+Free |
| 4b | Ruleset enforcement is real (not just accepted) | Blocks direct push | Direct push to main: `remote: error: GH013: Repository rule violations found for refs/heads/main. - Changes must be made through a pull request. - Required status check "plan-compliance" is expected.` → `[remote rejected]` | **PASS** — enforced, fail-closed ("expected" check blocks before any run reports) |
| 4c | Platform availability matrix | — | **private+Free → 403** on BOTH `GET /rulesets` and `GET /branches/main/protection`: `"Upgrade to GitHub Pro or make this repository public to enable this feature."` (verified live 2026-06-11 on the then-private real repo). **public+Free → available**: real repo (now public) `GET /rulesets` → `200 []`; spike repo full ruleset created+enforced. (Real-repo classic-protection probe returned `404 "Branch not found"` — remote `main` has no commits yet; not a plan limitation.) | **PASS** — matrix complete |
| 5 | Commit-binding strictness decision | Decide + rationale | Decision: **strict binding YES** (below). `dismiss_stale_reviews_on_push:true` accepted and active in the ruleset; actual dismissal-on-push behavior [Unverified] live (requires a second account to produce an APPROVED review) — strict CI binding covers exactly this gap | **DECIDED** |

---

## Assumption Status Lines

- **A5: RESOLVED (field shape) / enum PARTIAL.** `state`, `user.login`, `user.type`, `commit_id`, `submitted_at` confirmed live; chronological order confirmed. `APPROVED`/`COMMENTED` observed; `CHANGES_REQUESTED`/`DISMISSED`/`PENDING` [Unverified] from docs — plan 01-09 unit fixtures MUST include all five states (logic layer covered regardless).
- **A6: RESOLVED — with design correction.** A `pull_request_review`-triggered run reports the same check name on the same head SHA, BUT does not replace the failed check-run from the `pull_request` check suite; required-check evaluation stays blocked while ANY same-named check-run on the head SHA is red. Validated fix: the review-triggered job re-runs the failed sibling run via the Actions re-run API (replaces the red check-run in place → `mergeable_state: clean`).
- **A10: RESOLVED — confirmed.** GitHub natively rejects both APPROVE and REQUEST_CHANGES by the PR author (422, REST and GraphQL). The D-10 waiver therefore covers "merge with zero non-author approvals", never "author approved himself". Gate keeps the `login != author` check as cheap defense-in-depth.

---

## Locked Platform-vs-CI Division (D-02)

**Platform (ruleset) enforces — verified available and active on public+Free:**

- Require pull request before merging (direct push to main rejected with GH013 — verified)
- `require_code_owner_review: true` — CODEOWNERS parsing stays platform-side per Don't-Hand-Roll (CI does NOT re-parse CODEOWNERS in v1)
- `dismiss_stale_reviews_on_push: true` — platform-side stale-approval invalidation ([Unverified] live behavior; compensated by CI strict commit binding)
- `required_status_checks: [{context: "plan-compliance"}]` — fail-closed: check is "expected" and blocks merge before any run reports
- `allowed_merge_methods: ["merge"]` — merge-commit-only (D-03), accepted as a `pull_request` rule parameter

**CI (`plan-compliance` gate, plan 01-09) re-verifies — source of truth for approver identity (D-02):**

- T3 diff detection → `specs/NNN-*/plan.md` existence + `Approved-by:` audit-trail line (audit only, NOT the proof)
- Reviews-API reduction (below): ≥1 latest-per-user review with `state == "APPROVED"`, `user.login != author`, `user.type != "Bot"`, `commit_id == head SHA`
- Waiver register consult on failure (D-10)

---

## Commit-Binding Decision (Pitfall 3): STRICT — YES

**Decision:** The CI gate asserts `commit_id == head SHA` on every counted approval, in addition to latest-per-user + `state == APPROVED`.

**Rationale:**

1. `dismiss_stale_reviews_on_push` invalidates approvals on every new head SHA anyway — strict CI binding mirrors the platform rule exactly, so it adds **zero** workflow friction beyond what the ruleset already imposes (any push, including "Update branch", requires re-approval either way under D-03 merge-commit strategy).
2. The dismissal behavior itself could not be verified live solo ([Unverified]); strict binding makes the CI gate safe even if the platform-side dismissal has gaps or is misconfigured — defense-in-depth at the cost of one `select()` clause.
3. The research-flagged conflict ("strict binding can conflict with merge-commit update flow") does not materialize: the cases where binding invalidates an approval are exactly the cases dismiss-stale invalidates it too.

---

## Copy-Paste Artifacts for Plan 01-09

### Workflow `on:` trigger block (validated live — both events fired and reported on the PR head SHA)

```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened]
  pull_request_review:
    types: [submitted, dismissed]
```

### Token permissions

```yaml
permissions:
  contents: read
  pull-requests: read
  actions: write   # REQUIRED: re-run of the failed sibling pull_request run (Pitfall 4 fix, Scenario 3c)
```

[Unverified]: `actions: write` as the sufficient permission for `POST /repos/{r}/actions/runs/{id}/rerun-failed-jobs` with `GITHUB_TOKEN` is taken from the REST docs permission table — the spike re-ran with a user token. Plan 01-09 must smoke-test the re-run call under `GITHUB_TOKEN` once the workflow exists.

### Reviews-reduction `--jq` expression (latest-per-user, APPROVED, non-bot, non-author, commit-bound)

```bash
HEAD_SHA=$(gh api "repos/$REPO/pulls/$PR" --jq '.head.sha')
AUTHOR=$(gh api "repos/$REPO/pulls/$PR" --jq '.user.login')
APPROVALS=$(gh api "repos/$REPO/pulls/$PR/reviews" --paginate --slurp \
  --jq "add
        | sort_by(.submitted_at)
        | group_by(.user.login)
        | map(last)
        | map(select(
            .state == \"APPROVED\"
            and .user.type != \"Bot\"
            and .user.login != \"$AUTHOR\"
            and .commit_id == \"$HEAD_SHA\"
          ))
        | length")
```

Notes: `--paginate` emits one JSON array **per page** — `--slurp | add` flattens (the classic 30-item-default pagination bug, Don't-Hand-Roll). List is chronological by `submitted_at` (confirmed live), so `group_by(.user.login) | map(last)` is the latest-per-user reduction. `DISMISSED` reviews are excluded by the `state == "APPROVED"` filter regardless of dismissal mechanics.

### Pitfall-4 unstick step (review-triggered run only — validated Scenario 3c)

```bash
# In the pull_request_review-triggered job, after gate logic passes:
FAILED_RUN=$(gh api "repos/$REPO/actions/runs?event=pull_request&head_sha=$HEAD_SHA&status=failure" \
  --jq '[.workflow_runs[] | select(.name == "plan-compliance")] | first | .id // empty')
[ -n "$FAILED_RUN" ] && gh api -X POST "repos/$REPO/actions/runs/$FAILED_RUN/rerun-failed-jobs"
```

**Why this is mandatory (empirical):** without it, a PR opened before approval has a red check-run in the `pull_request` check suite that NO later same-named run from another event supersedes — `mergeable_state` stays `blocked` forever (the literal Pitfall-4 stuck-red, now observed, not assumed). Re-running the failed run replaces its check-run in place → `clean`.

---

## Platform-Availability Matrix (Scenario 4 summary)

| Visibility × Plan | Rulesets | Classic branch protection |
|-------------------|----------|---------------------------|
| private + Free | **403** "Upgrade to GitHub Pro or make this repository public" (verified live, real repo pre-flip) | **403** same message (verified live) |
| public + Free | **Available + enforced** (full D-03 ruleset created, active, blocks direct push; verified on spike repo; real repo `GET /rulesets` → `200 []`) | Endpoint accessible; not exercised (rulesets chosen; real-repo probe hit `404 Branch not found` — remote `main` not yet created) |

**Consequence (user decision 2026-06-11):** real repo is now PUBLIC → plan 01-09 uses the platform half of GATE-10 via **rulesets** (require-PR, code-owner review, dismiss-stale, required check `plan-compliance`, merge-commit-only). The CI-only compensation posture is NOT chosen. Note for ONBOARDING/risk register: if the repo ever flips back to private on Free, the entire platform half silently disappears (403) — the CI gate's strict commit binding and approver re-verification keep the identity core intact, but require-PR/merge-method enforcement would be lost.

---

## Additional Verbatim Findings

- **Admin is not exempt:** ruleset response `"current_user_can_bypass": "never"` with empty `bypass_actors` — the repo owner's own pushes are blocked (GH013 observed). Aligns with the no-ad-hoc-bypass constraint; waivers stay in the register, not in bypass_actors.
- **Required check fail-closed before first run:** push rejection lists `Required status check "plan-compliance" is expected` — a never-reported check blocks merge (no fail-open window between PR open and first run).
- **Check-run name = Actions job id** (`jobs.plan-compliance` → check-run `plan-compliance`): the ruleset `context` string must match the job id/name exactly; verified by the rollup matching.
- **`mergeStateStatus`/`mergeable_state` caching:** REST `mergeable_state` flipped `blocked → clean` immediately after the re-run completed; no manual cache-busting needed in the observed window.
