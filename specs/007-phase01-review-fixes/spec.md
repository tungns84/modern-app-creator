# Spec 007: Phase-01 Code-Review Critical Fixes

## User story

As the preset maintainer, I want the two Critical findings and one security-relevant
Warning from the Phase-01 code review (01-REVIEW.md) fixed so that the enforcement
floor cannot be bypassed and generated projects compile, before Phase 01 is marked
complete.

## Scope

Gap-closure for findings in `.planning/phases/01-dogfood-bootstrap-enforcement/01-REVIEW.md`:

- **CR-01** (`scripts/init-core.mjs`): `artifactId` containing a hyphen (a value its
  own `ARTIFACT_ID_RE` permits, e.g. `my-app`) is used verbatim as the Java package
  leaf, producing an invalid `package com.example.my-app;` declaration — every
  generated project fails to compile. Fix: derive the Java package leaf separately
  from the Maven artifactId (strip hyphens); keep artifactId verbatim for `pom.xml`.
  Add a regression test with a hyphenated artifactId.

- **CR-02** (`.github/workflows/plan-compliance.yml`): the GATE-10 verdict step
  interpolates the attacker-controlled `head_ref` (PR branch name, may contain
  `$()`/backticks) directly into a shell `run:` body — a GitHub Actions
  script-injection vector in the L2 enforcement floor itself (runs with
  `actions: write`). Fix: pass `author`/`head_ref`/`head_sha` via `env:` and
  reference as quoted shell variables, never `${{ }}` interpolation in the script body.

- **WR-04** (`scripts/checks/plan-compliance.mjs`): `evaluate()` does not guard a
  `NaN` `nowMs` (from a malformed `--now`); `waiverExpired` then treats an expired
  waiver as valid (fail-OPEN), contradicting the fail-closed design. Fix: fail closed
  with a FAIL verdict when the injected clock is invalid. Add a regression test.

## Acceptance criteria

- `init-core` with `--artifact-id my-app` produces a `packageRoot` with no hyphen
  and a valid Java package path; artifactId remains `my-app` in pom literals.
- `plan-compliance.yml` GATE-10 verdict step references no `${{ }}` expression inside
  the `run:` body; all dynamic values arrive via `env:`.
- `evaluate({ now: "not-a-date", ... })` returns `verdict: "FAIL"` (fail-closed).
- All existing gates still pass (`task verify`).

## Requirements touched

FOUND-12 (init script), GATE-10 (plan-compliance), AGENT-03 (T3 hook unaffected).
