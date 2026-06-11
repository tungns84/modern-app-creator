# Spec 002: Plan-Compliance CI Gate (L2 at-merge floor)

## User Story

As the team operating this preset repository, we need a required CI status check
that blocks merging any PR touching T3 paths unless the spec unit BOUND to that
change carries `tier: T3` and a valid approval verified through the PR review API,
so the core value holds for any runtime — no unapproved T3 change reaches main
even if the in-session layer is bypassed (AI-COWORK §5 Layer 2).

## Scope

This unit covers:

- `.github/workflows/plan-compliance.yml` — required check with dual triggers
  (`pull_request` + `pull_request_review`)
- `.github/CODEOWNERS` — code-owner review surface for T3 areas
- `scripts/checks/plan-compliance.mjs` — fixture-testable verdict core consuming
  the shared matcher/binding helpers from unit 001 (D-22)
- `scripts/checks/assert-non-author-approval.mjs` — reviews-reduction verdict
- Repository ruleset / branch-protection configuration (merge-commit-only per D-03)

## Acceptance Criteria

1. A PR whose diff touches T3 paths FAILS unless its BOUND spec unit —
   `specs/NNN-*/plan.md` resolved from the head branch `feat/NNN-*`, or a
   `specs/NNN-*/plan.md` added/modified in the PR diff itself — carries `tier: T3`
   and an `Approved-by:` line (GATE-10). Unrelated approved specs elsewhere in the
   tree NEVER satisfy the gate.
2. Approver identity is verified via the reviews API: latest review per user, state
   APPROVED, login != PR author, not a Bot (D-02 — the `Approved-by:` line alone
   never passes).
3. The check re-evaluates when an approval lands after the last push
   (`pull_request_review` trigger).
4. A non-expired self-approval waiver in `.cowork/waivers.json` passes the identity
   step ONLY — never the spec binding — with a prominent warning; an expired waiver
   FAILS (D-10).
5. Squash and rebase merges are disabled at repository level; merge commits only
   (D-03 — per-commit S→P→I→V evidence preserved on main).
6. Meta-only diffs never require a spec (D-06).

## Requirements

- **GATE-10** — Plan-compliance gate: diff touching T3 paths requires
  `specs/NNN-*/plan.md` with valid `Approved-by:`; approver identity verified via
  hosting API/PR review metadata, no self-approval, survives squash/rebase/bots
  (FR-D10)
