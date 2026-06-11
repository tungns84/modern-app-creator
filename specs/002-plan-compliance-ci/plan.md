# Plan 002: Plan-Compliance CI Gate

tier: T3

## Why T3

`.github/**` and gate configuration are T3 paths (AI-COWORK §5 L2 list). This is
the enforcement floor itself — the highest-leverage gate in the repository.

## Files to touch

- `scripts/checks/plan-compliance.mjs` — verdict core implementing the 8-step
  algorithm as a pure function over fixture JSON; imports `lib/tiers.mjs` matcher
  and spec-binding helpers from unit 001 (D-22: hook and CI read ONE tier/binding
  source); consults `.cowork/waivers.json` with expiry evaluation on every run
- `scripts/checks/assert-non-author-approval.mjs` — latest-review-per-user
  reduction, APPROVED state, non-author, non-Bot
- `scripts/checks/tests/plan-compliance.test.mjs` — fixture suite (T3 hit,
  no-plan fail, approved pass, stale review, bot review, waiver expiry, binding
  anti-rot)
- `.github/workflows/plan-compliance.yml` — triggers `pull_request`
  [opened, synchronize, reopened] AND `pull_request_review` [submitted, dismissed];
  token scope `contents: read, pull-requests: read`; one API style (`gh api`)
- `.github/CODEOWNERS` — T3 areas incl. `.cowork/`, `.github/`, gate scripts
- Repository ruleset — merge-commit-only (D-03), required checks limited to
  workflows that already exist; platform code-owner-review requirement deferred
  behind waiver W-001 (D-10)

## Modules affected

n/a — pre-backend.

## Events / SPI surfaces

n/a.

## Migrations

n/a.

## Tests

- `node --test scripts/checks/tests/` against fixture PR-files/reviews JSON —
  no live API calls in tests (deterministic, offline).
- Changed files fetched via paginated PR files API (merge-base-correct); PR number
  derived once from the event, everything else fetched fresh.

## Constitution rules that apply

- AI-COWORK §5 L2 (required status check + branch protection + CODEOWNERS)
- D-02: PR review API is the source of truth for approver identity
- Gate failure output names the violated rule + missing artifact + next step.

## Approval

Approved-by: tungns84 2026-06-11 (H2 approval granted via GSD Phase-1 plan review; solo self-approval waived per .cowork/waivers.json W-001)

Per D-02 this line is audit trail, NOT authorization proof. Authorization is the
PR review API plus repository ruleset; a forged `Approved-by:` line never
constitutes approval.

Branch for this unit: `feat/002-plan-compliance-ci`.
