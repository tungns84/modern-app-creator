# Spec 004: Init Script (`scripts/init`)

## User Story

As a Tech Lead bootstrapping a new project from this preset, I can run
`scripts/init.(sh|ps1)` with my team's group/artifact/project values and have the
entire tree renamed from the `com.acme.app` literal family in one auto-committed,
idempotent operation — identically on Windows and POSIX systems.

## Scope

This unit covers:

- `scripts/init-core.mjs` — shared zero-dependency rename engine behind both entry
  points (single implementation; parity risk reduced to argument parsing)
- `scripts/init.sh` — POSIX entry point delegating to node `init-core.mjs`
- `scripts/init.ps1` — PowerShell 7 entry point delegating to node `init-core.mjs`
- `scripts/init-replacements.json` — manifest of (literal → placeholder-name)
  pairs, reused by the later templating milestone
- `.github/workflows/init-parity.yml` — 2-OS parity test

## Acceptance Criteria

1. Running init with `--group-id`/`--artifact-id`/`--project-name` (missing flag →
   prompt) renames the `com.acme.app` literal family across the tree
   (word-boundary aware: `com.acme.app` / `com/acme/app` / `acme-app`), renames
   package directories, and auto-commits one conventional commit (D-23).
2. A second run detects zero remaining literals and exits 0 with a distinct
   "already initialized" message (idempotency, D-23).
3. Meta directories, `.git/`, and binary globs are never touched — meta docs
   legitimately mention `com.acme.app` and must survive init unchanged.
4. Invalid groupId/artifactId (Java-package / npm grammar) or a dirty worktree is
   refused BEFORE any file is modified.
5. CI parity: `init.sh` on ubuntu and `init.ps1` on windows produce byte-identical
   trees after EOL normalization (D-23).

## Requirements

- **FOUND-12** — Tech Lead can run `scripts/init.(sh|ps1)` to rename
  `com.acme.app` → team values with auto-commit (FR-A12)
