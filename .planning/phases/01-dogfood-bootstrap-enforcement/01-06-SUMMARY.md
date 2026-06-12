---
phase: 01-dogfood-bootstrap-enforcement
plan: 06
subsystem: bootstrap-tooling
tags: [init-script, rename-engine, tdd, parity, cross-platform, found-12]

# Dependency graph
requires:
  - phase: 01-01
    provides: ".gitattributes LF normalization — precondition for the EOL-normalized parity diff (Pitfall 6)"
  - phase: 01-12
    provides: "Approved spec unit specs/004-init-script binding this plan (tier T3)"
provides:
  - "scripts/init-core.mjs — zero-dep rename engine: validateInputs/planRenames/applyRenames/main, word-boundary literal matching, meta-dir + binaryGlob + NUL-byte exclusions, package dir rename with empty-ancestor pruning, single conventional auto-commit, idempotent exit"
  - "scripts/init.sh (3 lines, mode 100755) and scripts/init.ps1 (4 lines) — thin entry points exec-delegating to the one Node core (D-23, Pitfall 8 planner option)"
  - "scripts/init-replacements.json — (literal → placeholder-name) manifest {com.acme.app: packageRoot, com/acme/app: packagePath, acme-app: artifactId} reused by Giai đoạn 2 templating"
  - ".github/workflows/init-parity.yml — parity-ubuntu / parity-windows / parity-compare proving byte-identical trees after EOL normalization, plus per-leg idempotency asserts"
affects: [01-09 plan-compliance CI (shares .github/workflows), giai-doan-2 templating (manifest reuse)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Zero-dependency Node engine behind thin sh/ps1 entry points — parity risk reduced to argument passing (D-23)"
    - "Parity proof via git archive fixture + EOL-normalized sha256 manifests + git diff --no-index in a 3-job workflow"
    - "cygpath -u guard in shared bash CI steps so Git Bash on windows runners accepts $RUNNER paths (GNU tar rejects D:\\ paths)"
    - "node --test with explicit glob 'scripts/tests/*.test.mjs' — directory-form arg misresolves on Windows node 22.22"

key-files:
  created:
    - scripts/tests/init-core.test.mjs
    - scripts/init-core.mjs
    - scripts/init-replacements.json
    - scripts/init.sh
    - scripts/init.ps1
    - .github/workflows/init-parity.yml
  modified: []

key-decisions:
  - "Self-exclusion of the init family (init-core.mjs, init.sh, init.ps1, init-replacements.json, tests/init-core.test.mjs) from the rename walk — rewriting the manifest keys would break idempotency on the second run (literal keys become target values, re-matching everywhere)"
  - "NUL-byte content guard added beyond the binaryGlobs so unanticipated binary files are never corrupted (T-01-18 defense in depth)"
  - "go-task pinned-version check compares the extracted semver, not the raw output string — install channels differ on the 'v' prefix"

patterns-established:
  - "Word-boundary literal replacement: (?<![A-Za-z0-9])literal(?![A-Za-z0-9]) — com.acme.application survives"
  - "CI fixture seeding via 'git archive HEAD | tar -x' — tracked files only, attribute-normalized EOLs, exec bits preserved on both OSes"

requirements-completed: [FOUND-12]

# Metrics
duration: ~25min
completed: 2026-06-12
---

# Phase 1 Plan 06: Init Rename Engine Summary

**Test-first zero-dep Node rename engine (com.acme.app family → team values, word-boundary aware, idempotent, single auto-commit) behind 3/4-line sh/ps1 entry points, with green 2-OS CI parity proof (89 files byte-identical after EOL normalization)**

## TDD Record (RED → GREEN → wire)

| Gate | Commit | Evidence |
|------|--------|----------|
| RED | `3bc4cbc` test(01-06) | 12 node:test cases on synthetic git fixtures; suite failed with `ERR_MODULE_NOT_FOUND: scripts/init-core.mjs` (`# fail 1`, right reason) |
| GREEN | `432dda0` feat(01-06) | All 12 tests pass (`# pass 12 / # fail 0`); node: builtins only, zero `sed -i` occurrences in scripts/ |
| REFACTOR | — | Not needed; implementation landed clean against the contract |
| wire | `458133d` feat(01-06) | Entry points (init.sh 3 lines @100755, init.ps1 4 lines) + init-parity.yml; run 27391123639 green on all 3 jobs |

The RED test suite reused the predecessor session's untracked draft verbatim — it matched the plan's `<behavior>` contract case-for-case (validation grammar ×2 + valid, pre-touch refusal, dirty worktree, plan coverage, word-boundary trap, exclusions, applyRenames+replan-zero, end-to-end, auto-commit, idempotency).

## Commits

| Commit | Type | Description |
|--------|------|-------------|
| `3bc4cbc` | test | Failing tests for init rename engine (RED) |
| `432dda0` | feat | Rename engine + replacements manifest (GREEN) |
| `8a65591` | fix | go-task version check compares extracted semver |
| `458133d` | feat | Entry points + 2-OS parity workflow (wire) |
| `ca5ad24` | fix | cygpath conversion for Git Bash on windows runner |

## Verification Evidence

- `node --test "scripts/tests/*.test.mjs"` → 12/12 pass
- TDD gate sequence in git log: `test(01-06)` 3bc4cbc → `feat(01-06)` 432dda0 ✓
- init-parity run **27391123639**: parity-ubuntu ✓, parity-windows ✓, parity-compare ✓ — both legs hashed **89 files**, `git diff --no-index` empty; idempotency asserted on both legs ("already initialized")
- Local pre-push dry run: sh leg (Git Bash) and ps1 leg (PowerShell) on identical fixtures produced identical manifests (`LOCAL PARITY OK`)
- Threat register: T-01-17 (grammar validation before any write; git via argv arrays), T-01-18 (exclusion list + binaryGlobs + word boundary + NUL guard, each test-pinned), T-01-19 (single conventional auto-commit) — all mitigations implemented and test-covered

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `node --test scripts/tests/` directory form misresolves on Windows node 22.22**
- **Found during:** Task 1 (RED verification)
- **Issue:** Directory argument is executed as a module entry (`Cannot find module ...scripts\tests`) instead of being searched for test files — the plan's verify command never runs the suite on this machine
- **Fix:** Canonical test command switched to the equivalent glob form `node --test "scripts/tests/*.test.mjs"` (verified 12/12)
- **Files modified:** none (command-level)
- **Commit:** n/a

**2. [Rule 2 - Missing critical] Init-family self-exclusion from the rename walk**
- **Found during:** Task 2 (GREEN design)
- **Issue:** The manifest keys ARE the literals; rewriting `init-replacements.json` (and the engine/tests carrying literals as data) on the first run would corrupt the manifest and break the documented idempotent second run
- **Fix:** `SELF_EXCLUSIONS` set (5 relative paths) skipped by the walker
- **Files modified:** scripts/init-core.mjs
- **Commit:** `432dda0`

**3. [Rule 1 - Bug] go-task version check false positive**
- **Found during:** Task 3 (local parity dry run)
- **Issue:** `task --version` prints `3.51.1` without the `v` prefix on this machine's install channel — raw substring match against `v3.51.1` warned spuriously
- **Fix:** Compare extracted semver (`/\d+\.\d+\.\d+/`) against `3.51.1`
- **Files modified:** scripts/init-core.mjs
- **Commit:** `8a65591`

**4. [Rule 1 - Bug] GNU tar in Git Bash rejects Windows-style `$FIXTURE` path on the windows runner**
- **Found during:** Task 3 (first CI run 27391068494, parity-windows seed step exit 2)
- **Issue:** `tar -x -C "D:\a\...\.parity-fixture"` → `Cannot open: No such file or directory` (backslash/drive-letter parsing)
- **Fix:** `command -v cygpath >/dev/null && FIXTURE=$(cygpath -u "$FIXTURE")` guard at the top of every shared bash step (no-op on ubuntu)
- **Files modified:** .github/workflows/init-parity.yml
- **Commit:** `ca5ad24`

## Deferred Issues

- GitHub Actions Node 20 deprecation warnings on `checkout@v4` / `setup-node@v4` / `upload-artifact@v4` / `download-artifact@v4` (forced Node 24 from 2026-06-16) — logged in `deferred-items.md`; bump repo-wide in one sweep when 01-09 lands. Workflow is green today.

## Known Stubs

None — both entry points are live delegations; the engine is fully wired and CI-proven.

## TDD Gate Compliance

`test(01-06)` (3bc4cbc) precedes `feat(01-06)` (432dda0) in history; no refactor commit was needed. Plan-level gate sequence satisfied.

## Self-Check: PASSED

All 6 artifact files present; commits 3bc4cbc/432dda0/8a65591/458133d/ca5ad24 verified in history; test suite green (12/12).
