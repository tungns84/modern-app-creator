# Plan 004: Init Script

tier: T3

## Why T3

The init script rewrites the whole tree (file-I/O across every shipped path) and
adds a CI workflow (`.github/**` = T3). A defect here corrupts every generated
project at minute zero.

## Files to touch

- `scripts/init-core.mjs` — zero-dep Node engine: validate inputs against
  Java-package/npm grammar first; refuse dirty worktree; walk tree excluding
  `.git/`, binary globs (`**/*.png`, `**/*.svg`, `**/*.jar`, `**/mvnw*`) and meta
  directories; word-boundary-aware replacement of the literal family; directory
  renames; `git add -A && git commit -m "chore: initialize project as <artifactId>"`;
  idempotency short-circuit. NO `sed -i` anywhere (macOS/Linux divergence).
- `scripts/init.sh` — flags + prompt fallback, exec-delegates to node core
- `scripts/init.ps1` — same contract for PowerShell 7
- `scripts/init-replacements.json` — (literal → placeholder-name) manifest shared
  by both legs and by the future templating milestone
- `.github/workflows/init-parity.yml` — runs both legs on a fixture tree, then
  `git diff --no-index` after EOL normalization
- go-task pinned-version check (v3.51.1) lives here per root constitution.

## Modules affected

n/a — pre-backend.

## Events / SPI surfaces

n/a.

## Migrations

n/a.

## Tests

- `node --test scripts/checks/tests/` unit coverage of the core engine (validation,
  exclusion walk, word-boundary replacement, idempotency exit path)
- CI init-parity workflow is the integration test (2-OS byte-identical trees).

## Constitution rules that apply

- 3-OS-no-WSL constraint: shared Node core behind thin entry points
- CRLF discipline: parity diff normalizes EOL; `.gitattributes` governs the tree
- Conventional Commits for the auto-commit.

## Approval

Approved-by: tungns84 2026-06-11 (H2 approval granted via GSD Phase-1 plan review; solo self-approval waived per .cowork/waivers.json W-001)

Per D-02 this line is audit trail, NOT authorization proof. Authorization is the
PR review API plus repository ruleset; a forged `Approved-by:` line never
constitutes approval.

Branch for this unit: `feat/004-init-script`.
