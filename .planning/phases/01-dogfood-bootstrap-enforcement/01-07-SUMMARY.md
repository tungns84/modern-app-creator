---
phase: 01-dogfood-bootstrap-enforcement
plan: 07
subsystem: ci-gates
tags: [gate-12, claude-md, renderer, line-budget, command-smoke, tdd]

# Dependency graph
requires:
  - phase: 01-dogfood-bootstrap-enforcement/01
    provides: ".gitattributes EOL policy (extended here with a CRLF-fixture exemption)"
  - phase: 01-dogfood-bootstrap-enforcement/12
    provides: "specs/005-claude-pack approved spec unit binding this tooling"
provides:
  - "render(templateText, values) — zero-dep token-replace renderer; throws naming the placeholder on missing value or any orphan {{ after render (PRESET-SPEC §4.5, D-14)"
  - "countLines(text) — CRLF-normalized line counting (Pitfall 6)"
  - "checkBudget(filePath, maxLines) → {pass, actual, message} — message names file + budget + actual"
  - "runSmoke(manifestPath, leg) → {ran, failures[]} — leg-filtered, execFileSync argv split, throws on zero declared commands (Pitfall 9 vacuous-green guard)"
  - "CLI: node scripts/checks/claude-md-check.mjs --root-template <p> --tree-file <p>... --smoke-manifest <p> [--leg ubuntu|windows|macos] — exit 1 on any violation, failure lines name rule + file + measured value (FR-E08 seed)"
affects: [01-10 claude-pack content + claude-md-check.yml workflow, 01-11]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Zero-dependency Node scripts (node: builtins only) — gate tooling runs on fresh clone before any install"
    - "Dynamic import inside each node:test case so RED fails per-test (13 named failures) instead of one module-load error"
    - "Smoke manifest JSON {commands:[{cmd, legs:[]}]} — explicit declaration, no prose-regex extraction; Docker-needing commands restrict to ubuntu leg"

key-files:
  created:
    - scripts/checks/render-claude-md.mjs
    - scripts/checks/claude-md-check.mjs
    - scripts/checks/tests/claude-md.test.mjs
    - scripts/checks/tests/fixtures/template.md
    - scripts/checks/tests/fixtures/crlf.md
    - scripts/checks/tests/fixtures/oversize.md
    - scripts/checks/tests/fixtures/smoke-ok.json
    - scripts/checks/tests/fixtures/smoke-empty.json
  modified:
    - .gitattributes

key-decisions:
  - "crlf.md fixture exempted from EOL normalization via `scripts/checks/tests/fixtures/crlf.md -text` in .gitattributes — `* text=auto eol=lf` would have rewritten the fixture's deliberate CRLF bytes on checkout, silently neutering the Pitfall 6 test (verified blob keeps \\r\\n via git cat-file)"
  - "checkBudget returns a message field on pass AND fail so callers always get a rule-named line (FR-E08 deny-message UX contract)"
  - "CLI --leg defaults from process.platform (win32→windows, darwin→macos, else ubuntu) so local runs behave like the matching CI leg"

# Metrics
duration: 11min
completed: 2026-06-11
---

# Phase 1 Plan 07: CLAUDE.md render-then-check pipeline (GATE-12 / D-14) Summary

**Test-first GATE-12 tooling: zero-dep {{token}} renderer failing on orphan placeholders, CRLF-normalized 200/150 line-budget checker, and leg-filtered command smoke that goes red on zero declared commands.**

## TDD Record

| Gate | Commit | Result |
|------|--------|--------|
| RED | `3aea19e` test(01-07): add failing tests for claude-md render and check | 13 tests, `# fail 13` (each test dynamic-imports the not-yet-existing modules, so all 13 fail individually with descriptive names) |
| GREEN | `36a49e0` feat(01-07): implement claude-md render and check | 13 tests, `# pass 13`, `# fail 0` |
| REFACTOR | — | not needed: CRLF normalizer exists in exactly one place (countLines); no duplication emerged |

No test passed unexpectedly during RED — fail-fast rule never triggered.

## What Was Built

- `scripts/checks/render-claude-md.mjs` — `render(templateText, values)`: regex token replace for `{{[A-Za-z0-9_.-]+}}`; throws naming the placeholder when a used token has no value; second-pass scan throws if any orphan `{{` survives (covers malformed tokens the regex skips). Token replacement only — content without tokens is byte-identical (named test with braces/$/backslashes).
- `scripts/checks/claude-md-check.mjs` — exports `countLines`, `checkBudget`, `runSmoke`; CLI composes the D-14 pipeline: render root template with sample values (projectName=smoke, groupId=com.acme, artifactId=app) to a temp file → checkBudget ≤200 → each `--tree-file` checkBudget ≤150 in place → runSmoke the manifest for the leg. Exit code 1 if any rule failed, else 0.
- Test suite (13 cases, node:test, sub-second): orphan token, no-transform guarantee, CRLF inline + fixture-file counting, oversize 201-vs-200 with message assertions, within-budget pass, smoke green run (`node --version`, `git --version`), vacuous-leg throw, failure-reported-by-command (temp manifest with `node -e process.exit(7)`), and two spawned-CLI contract tests (exit 0 pass set; exit 1 naming `oversize.md` + `150` + `201`).

## Verification

- `node --test scripts/checks/tests/claude-md.test.mjs` → `# pass 13 / # fail 0`
- Manual CLI runs: passing fixture set exits 0; oversize tree file exits 1 printing `GATE-12/tree-budget VIOLATION: scripts/checks/tests/fixtures/oversize.md has 201 lines, exceeds budget of 150`
- `git cat-file blob HEAD:scripts/checks/tests/fixtures/crlf.md | od -c` confirms `\r\n` bytes preserved in the committed blob
- Zero npm imports in both scripts (only `node:` builtins + relative renderer import)

## Threat Model Dispositions Applied

- T-01-20 (manifest as execution surface): commands run via `execFileSync(argv[0], argv.slice(1), {shell:false})` — argv whitespace split, never a shell string. Path-tier protection (templates/claude/** as T3) lands with content in 01-10.
- T-01-21 (vacuous-green smoke): `runSmoke` throws `no commands declared for leg` — pinned by a named test.
- T-01-SC: zero npm dependencies — accepted as planned.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Exempted crlf.md fixture from EOL normalization**
- **Found during:** Task 1
- **Issue:** Existing `.gitattributes` rule `* text=auto eol=lf` (from plan 01-01) would normalize the CRLF fixture to LF on any fresh checkout, making the Pitfall 6 test silently test nothing.
- **Fix:** Added `scripts/checks/tests/fixtures/crlf.md -text`; the test also asserts fixture integrity at runtime (`raw.includes("\r\n")`).
- **Files modified:** `.gitattributes`
- **Commit:** `3aea19e`

No other deviations — plan executed as written. No auth gates.

## Known Stubs

None — both scripts are fully wired and consumed by the test suite. The real templates/CLAUDE.md content and the CI workflow are intentionally out of scope here (they land in plan 01-10 per wave plan, not stubs).

## Next Phase Readiness

Plan 01-10 can plug `templates/claude/ROOT-CLAUDE.template.md`, `backend/CLAUDE.md`, `frontend/CLAUDE.md`, and `templates/claude/smoke-commands.json` straight into the verified CLI contract; `.github/workflows/claude-md-check.yml` invokes the same command per leg.

## Commits

| Commit | Type | Description |
|--------|------|-------------|
| `3aea19e` | test | RED — 13 failing tests + fixtures + .gitattributes exemption |
| `36a49e0` | feat | GREEN — renderer + checker implementation, all tests pass |

## Self-Check: PASSED

- scripts/checks/render-claude-md.mjs — FOUND
- scripts/checks/claude-md-check.mjs — FOUND
- scripts/checks/tests/claude-md.test.mjs — FOUND
- scripts/checks/tests/fixtures/{template,crlf,oversize}.md, smoke-{ok,empty}.json — FOUND
- Commits 3aea19e, 36a49e0 — FOUND in git log
