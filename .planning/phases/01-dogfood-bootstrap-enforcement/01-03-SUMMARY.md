---
phase: 01-dogfood-bootstrap-enforcement
plan: 03
subsystem: infra
tags: [claude-code-hooks, pretooluse, jdk25, temurin, mapstruct, jacoco, archunit, github-actions, spike]

# Dependency graph
requires: []
provides:
  - "Q-010 hook behavior matrix on Claude Code 2.1.173 (gates D-08 hooks-go-live; fail-open on crash confirmed → fail-closed catch-block design is mandatory)"
  - "Pinned testedVersion: 2.1.173 for .cowork/tiers.json (consumed by plan 01-04)"
  - "JDK 25 toolchain empirical confirmation: MapStruct 1.6.3 + JaCoCo 0.8.15 + ArchUnit 1.4.2 + Mockito 5.20 green on Temurin 25.0.3 across windows/ubuntu/macos"
  - "Reusable Q-010 scenario harness (.planning/spikes/q010-harness/) + JDK 25 spike harness (.planning/spikes/jdk25-harness/)"
affects: [01-04, phase-2-backend, ci-workflows]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fail-closed hook pattern: whole hook in try/catch, catch emits permissionDecision deny + exit 0 (exit codes never block — empirically proven)"
    - "CI JDK setup: actions/setup-java@v4 + distribution temurin + java-version 25 (tool-cache hit on all 3 hosted runners)"
    - "Repo hygiene: git update-index --chmod=+x mvnw mandatory when authoring from Windows for unix CI legs"

key-files:
  created:
    - .planning/spikes/q010-hook-matrix.md
    - .planning/spikes/q010-harness/ (run-scenarios.mjs + fixtures)
    - .planning/spikes/jdk25-harness/ (pom.xml, workflow, sources)
    - .planning/spikes/jdk25-toolchain.md
  modified: []

key-decisions:
  - "D-08 go-live: PASS — hooks go live in plan 01-04, with fail-closed catch-block deny as a mandatory (not stylistic) construction because crash = silent fail-open (A1)"
  - "D-16 posture confirmed: L1 is best-effort by construction (disableAllHooks local kill-switch exists, A3/S6 untested); CI L2 stays the enforcement floor — no downgrade needed"
  - "MapStruct 1.6.3 and JaCoCo 0.8.15 MEDIUM-confidence risk rows CLOSED: both work on JDK 25 empirically (3-OS CI evidence)"
  - "Phase 2 pins to carry: ArchUnit >=1.4.2, JaCoCo >=0.8.15, MapStruct 1.6.3 (no Beta needed)"

patterns-established:
  - "Spike harnesses are preserved in .planning/spikes/ as reusable artifacts (meta, D-07); throwaway CI repos are deleted after evidence capture"

requirements-completed: [AGENT-03]

# Metrics
duration: ~95min (across 3 agent sessions, incl. CI wait)
completed: 2026-06-11
---

# Phase 01 Plan 03: Upfront Spikes (Q-010 Hook Matrix + JDK 25 Toolchain Smoke) Summary

**Both D-20 spikes landed with PASS verdicts: Claude Code 2.1.173 hook matrix proves fail-open-on-crash (mandating the fail-closed deny pattern for 01-04), and the full backend test toolchain runs green on Temurin 25.0.3 across all 3 OS legs — closing the MapStruct/JaCoCo MEDIUM-confidence risk items.**

## Performance

- **Duration:** ~95 min wall-clock across 3 agent sessions (Task 1 live matrix runs + Task 2 CI authoring, 2 GitHub Actions runs incl. queue/wait)
- **Started:** 2026-06-11T12:00Z (approx., session 1)
- **Completed:** 2026-06-11T13:37Z
- **Tasks:** 2/2
- **Files modified:** 20 created (2 reports + 2 harnesses)

## Accomplishments

- **Q-010 matrix (Task 1):** 9-scenario hook behavior matrix executed live on Windows against Claude Code **2.1.173** (`testedVersion: 2.1.173` recorded for `.cowork/tiers.json`). Key empirical findings: crash = **FAIL-OPEN** (A1), `$CLAUDE_PROJECT_DIR` expands correctly on Windows (A2), per-hook local override does NOT unhook committed hooks but `disableAllHooks: true` is a real kill-switch (A4 partial), SessionStart stdout reaches session context (A9). Overall verdict **PASS** against D-08 — hooks go live in plan 01-04 with the fail-closed catch-block design now empirically mandatory.
- **JDK 25 smoke (Task 2):** Throwaway repo `tungns84/jdk25-toolchain-spike` ran `./mvnw -B verify` on the 3-OS matrix with Temurin 25.0.3 via `actions/setup-java@v4`. Final run [27350513905](https://github.com/tungns84/jdk25-toolchain-spike/actions/runs/27350513905): **windows-latest / ubuntu-24.04 / macos-latest all PASS** — compiler release 25, JUnit 5.14.4 (4/4 tests), Mockito 5.20.0, MapStruct 1.6.3 annotation processing, JaCoCo 0.8.15 agent+report, ArchUnit 1.4.2. **A7 resolved** (Temurin 25 from runner tool-cache). Results came from CI Temurin 25 exclusively — local JDK never used.

## Task Commits

Each task was committed atomically:

1. **Task 1: Q-010 hook behavior matrix** - `002d1b5` (feat)
2. **Task 2a: JDK 25 spike harness authored** - `af51514` (feat)
3. **Task 2b: JDK 25 toolchain smoke results** - `44925a3` (feat)

## Files Created/Modified

- `.planning/spikes/q010-hook-matrix.md` - 9-scenario observed-behavior matrix, A1-A4/A9 verdicts, testedVersion pin, D-08 PASS verdict
- `.planning/spikes/q010-harness/` - reusable scenario runner + fixture hooks (deny-all, crash, warn) for re-running on every Claude Code version bump
- `.planning/spikes/jdk25-harness/` - preserved copy of the spike Maven project + workflow (pom with all 6 toolchain pins)
- `.planning/spikes/jdk25-toolchain.md` - per-OS results for both CI runs, per-tool verdicts, A7 resolution, Phase 2 pin guidance

## Decisions Made

- Production hooks (plan 01-04) MUST use the fail-closed catch-block pattern: catch emits `permissionDecision: "deny"` and exits 0 — exit codes never block (A1 empirical).
- L1 remains best-effort (D-16 posture unchanged): `disableAllHooks` local kill-switch is a product feature; CI L2 is the floor.
- MapStruct 1.6.3 stays (no 1.7.0.Beta1, no compiler-release downgrade) — verified on 25.

## Deviations from Plan

### 1. [Blocked scenario] S6 (`--dangerously-skip-permissions`) UNTESTED-BLOCKED

- **Found during:** Task 1 (Q-010 matrix)
- **Issue:** The executing environment's policy layer refused to spawn a headless skip-permissions agent, so scenario 6 (A3) could not be observed.
- **Handling:** Labeled **UNTESTED-BLOCKED** in the report (not implied), with a one-command manual follow-up: a human runs `node .planning/spikes/q010-harness/run-scenarios.mjs S6` and appends the verdict. Risk capped by D-16 (CI L2 floor) regardless of outcome.

### 2. [Harness bug + user fix] mvnw missing executable bit broke unix CI legs

- **Found during:** Task 2, first CI run [27350127175](https://github.com/tungns84/jdk25-toolchain-spike/actions/runs/27350127175)
- **Issue:** Repo pushed from Windows without the exec bit on `mvnw` → ubuntu/macos legs failed with `./mvnw: Permission denied` (exit 126) before any toolchain step ran. Windows leg passed fully.
- **Fix:** User pushed commit `5db8004` (`git update-index --chmod=+x mvnw`). Second run [27350513905](https://github.com/tungns84/jdk25-toolchain-spike/actions/runs/27350513905) green on all 3 OSes. Recorded as standing guidance for the preset template (always set exec bit on wrappers when authoring from Windows).
- **Classification:** Harness/infra defect, not a JDK 25 toolchain failure — documented as such in the report so run 1's failures are not misread.

### 3. [Manual cleanup required] Spike repo deletion blocked by token scope

- **Found during:** Post-Task-2 cleanup
- **Issue:** `gh repo delete tungns84/jdk25-toolchain-spike --yes` returned HTTP 403 — the gh token lacks the `delete_repo` scope.
- **Handling:** Per instructions, no workaround attempted. **Manual cleanup required:** delete `tungns84/jdk25-toolchain-spike` via the GitHub web UI, or run `gh auth refresh -h github.com -s delete_repo` then `gh repo delete tungns84/jdk25-toolchain-spike --yes`.

## Pinned Claude Code Version (for plan 01-04)

```
testedVersion: 2.1.173
```

Plan 01-04 writes this into `.cowork/tiers.json` as `claudeCode.testedVersion` and implements the fail-closed catch-block deny in both hooks.

## Known Stubs

None — both reports are complete; the only open item is the S6 manual follow-up, tracked above as a deviation and in the AGENT-03 VALIDATION manual row.

## Threat Flags

None — spike workflow used only official `actions/*` actions pinned by major version (T-01-09 mitigated as planned); throwaway repo contains no secrets and is slated for deletion.

## Self-Check: PASSED

- All 4 key artifacts present on disk (q010-hook-matrix.md, jdk25-toolchain.md, 01-03-SUMMARY.md, jdk25-harness/pom.xml)
- All 3 task commits verified in git log: 002d1b5, af51514, 44925a3
