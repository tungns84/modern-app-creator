# Plan 007: Phase-01 Code-Review Critical Fixes

tier: T3

## Why T3

Touches `.github/**` (the plan-compliance workflow — the L2 enforcement floor) and
`scripts/checks/**` plus the init engine `scripts/init-core.mjs` — all T3 paths
(AI-COWORK §5). Gap-closure for Critical findings from the Phase-01 code review
(CR-01, CR-02, WR-04 — evidence summarized inline below).

## Files to touch

- `scripts/init-core.mjs` — CR-01: derive the Java package leaf from artifactId
  with hyphens stripped (`packageLeaf`), build `packageRoot = groupId.packageLeaf`;
  artifactId stays verbatim for the Maven `acme-app` literal.
- `scripts/tests/init-core.test.mjs` — CR-01 regression: a hyphenated artifactId
  (`my-app`) yields a hyphen-free `packageRoot`/`packagePath` and a valid Java leaf.
- `.github/workflows/plan-compliance.yml` — CR-02: move `author`/`head_ref`/`head_sha`
  into the GATE-10 verdict step's `env:`, reference as `"$AUTHOR"`/`"$HEAD_REF"`/
  `"$HEAD_SHA"`; no `${{ }}` interpolation inside the `run:` body.
- `scripts/checks/plan-compliance.mjs` — WR-04: fail closed (`verdict: "FAIL"`) when
  the injected `nowMs` clock is `NaN`.
- `scripts/checks/tests/plan-compliance.test.mjs` — WR-04 regression: `now: "bad"`
  with an expired waiver returns FAIL (not a fail-open PASS).

## Modules affected

n/a — pre-backend tooling.

## Events / SPI surfaces

n/a.

## Migrations

n/a.

## Tests

- `node --test scripts/tests/init-core.test.mjs` — CR-01 regression green.
- `node --test scripts/checks/tests/plan-compliance.test.mjs` — WR-04 regression green.
- `task verify` — full gate suite still PASS after the fixes.

## Constitution rules that apply

- AI-COWORK §5 L2 (the workflow being hardened is the enforcement floor).
- D-16: L1 hooks best-effort; the L2 CI gate is the floor — CR-02 hardens that floor.
- Fail-closed-by-construction (Q-010 A1) — WR-04 restores it for the clock input.
- Gate output names the violated rule + fix (FR-E08).

## Approval

Approved-by: tungns84 2026-06-12 (H2 approval: code-review gap-closure authorized via /gsd-execute-phase AskUserQuestion "Fix both Criticals + WR-04 now"; solo self-approval waived per .cowork/waivers.json W-001)

Per D-02 this line is audit trail, NOT authorization proof. Authorization is the PR
review API plus repository ruleset; a forged `Approved-by:` line never constitutes
approval.

Branch for this unit: `feat/007-phase01-review-fixes`.
