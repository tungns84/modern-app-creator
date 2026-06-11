---
phase: 01-dogfood-bootstrap-enforcement
plan: 01
subsystem: repo-conventions
tags: [gitattributes, tiers, waivers, constitution, pr-template, bootstrap]
requires: []
provides:
  - "LF normalization via .gitattributes (first commit of the plan — Pitfall 6 closed)"
  - ".cowork/tiers.json — single tier source of truth (D-22) for hooks (01-04) and CI gate (01-09)"
  - ".cowork/waivers.json — W-001 self-approval waiver with platformDeferred record (D-10)"
  - "docs/methodology/AI-COWORK.md — verbatim constitution copy (D-12)"
  - ".github/pull_request_template.md — H3 checklist (AGENT-05 partial)"
  - "GitHub remote origin: tungns84/modern-app-creator (D-01)"
affects: [01-02, 01-03, 01-04, 01-08, 01-09, 01-12]
tech-stack:
  added: []
  patterns: ["zero-dependency config-as-JSON read by both enforcement layers"]
key-files:
  created:
    - .gitattributes
    - .gitignore
    - .cowork/tiers.json
    - .cowork/waivers.json
    - docs/methodology/AI-COWORK.md
    - .github/pull_request_template.md
  modified: []
decisions:
  - "GitHub repo slug = tungns84/modern-app-creator (private) — downstream plans 01-02/01-03/01-09 consume this"
  - "tiers.json carries strict.t2Paths: [] as a scaffold seam (deferred idea ships as empty config)"
  - "W-001 expires 2026-09-30; platformDeferred = require_code_owner_review + required_approving_review_count>=1"
metrics:
  duration: "6m"
  completed: "2026-06-11"
---

# Phase 01 Plan 01: Repo Conventions Bootstrap Summary

**One-liner:** LF-normalized repo with single tier config (.cowork/tiers.json), time-boxed W-001 self-approval waiver with platform-deferral record, verbatim AI-COWORK constitution copy, H3 PR template, and the tungns84/modern-app-creator GitHub remote.

## What Was Built

- **.gitattributes** (commit f4eb76e, FIRST commit of the plan per ratchet ordering): `* text=auto eol=lf` first line, CRLF exceptions for `*.cmd/*.bat/*.ps1`, binary markers for `*.png/*.svg/*.jar`. `git add --renormalize .` produced zero content changes — existing blobs were already LF (core.autocrlf=true converted on commit). `git check-attr text eol -- Taskfile.yml` confirms `text: auto`, `eol: lf`.
- **.cowork/tiers.json** (D-22 single source of truth): `claudeCode.testedVersion: ""` (Q-010 fills it in plan 01-03), `meta.exclude` (5 entries incl. `.planning/**` and dev `CLAUDE.md`), `t3.paths` (19 globs — full AI-COWORK §5 L2 list incl. `.cowork/**` and `.claude/hooks/**`), `t4.commandPatterns` (8 patterns), `strict.t2Paths: []`.
- **.cowork/waivers.json** (D-10): W-001, scope `self-approval`, approvedBy `tungns84`, created 2026-06-11, expires 2026-09-30, `platformDeferred: [require_code_owner_review, required_approving_review_count>=1]`, with a `note` recording the must-enable-on-expiry obligation.
- **.gitignore**: `.claude/settings.local.json`, `node_modules/`, `.task/`, `Thumbs.db`, `.DS_Store`.
- **GitHub remote (D-01)**: private repo created, `origin = https://github.com/tungns84/modern-app-creator.git`. **Repo slug for downstream plans: `tungns84/modern-app-creator`.**
- **docs/methodology/AI-COWORK.md**: byte-identical copy of `product/methodology/AI-COWORK.md` (verified with `git diff --no-index --quiet` → exit 0).
- **.github/pull_request_template.md**: 18 lines; spec link, tier declaration, H3 checklist (spec linked, tier declared, plan approved for T3, gates green via `task verify`, UI manual checks, §4 spec-rot reconciliation).

## Commits

| Task | Commit | Description |
| ---- | ------ | ----------- |
| 1 | f4eb76e | .gitattributes LF normalization (first commit) |
| 1 | 25e96f2 | tiers.json + waivers.json + .gitignore; origin remote created |
| 2 | 563bfb0 | Constitution copy + H3 PR template |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Constitution source absent from worktree**
- **Found during:** Task 2
- **Issue:** `product/` is untracked in git, so it does not exist in this parallel-execution worktree (worktrees only materialize committed content).
- **Fix:** Read/copied the source from the main checkout (`D:/projects/modern-app-creator/product/methodology/AI-COWORK.md`) and verified byte-identity against that absolute path with `git diff --no-index --quiet` (exit 0). No writes were made outside the worktree.
- **Files modified:** docs/methodology/AI-COWORK.md
- **Commit:** 563bfb0

### Deferred Issues

**1. `git push -u origin master` denied by permission policy**
- **Found during:** Task 1
- **Issue:** Pushing the full tree to the newly agent-created remote was blocked by the Claude Code auto-mode classifier (bulk-push to an agent-created remote). Not worked around per policy.
- **State:** Repo `tungns84/modern-app-creator` (private) exists and `origin` is configured — Task 1 acceptance criteria are met. The initial push remains for the user/orchestrator: `git push -u origin master` from the main checkout.
- **Impact:** Plans 01-02/01-09 (rulesets, CI) need the remote populated before they can configure platform settings.

**2. AGENT-05 not marked complete in REQUIREMENTS.md**
- **Reason:** AGENT-05 (full S→P→I→V with HARD H2 enforcement) is shared with plan 01-08 and depends on hooks (01-04) + CI gate (01-09). This plan delivers only the constitution copy + H3 PR template slice. Marking it now would falsely claim the enforcement layers exist. Orchestrator/later plan should mark it when the requirement is genuinely complete.

## Verification Results

- `node -e` tiers/waivers shape assertion → `OK` (19 t3 globs ≥15; meta.exclude has `.planning/**` and `CLAUDE.md`; 8 t4 patterns ≥5; waivers[0].scope == `self-approval`; platformDeferred has 2 entries)
- `git check-attr text eol -- Taskfile.yml` → `text: auto`, `eol: lf`
- `git remote get-url origin` → `https://github.com/tungns84/modern-app-creator.git`
- `git diff --no-index --quiet` source vs docs copy → exit 0 (byte-identical)
- PR template assertion → `OK lines=18` (references `specs/` and tier; ≤40 lines)
- `git log` ordering: f4eb76e (.gitattributes) is the first commit of the plan (ratchet evidence)
- `git status` clean after all commits; no file deletions in 7c6aabc..HEAD

## Known Stubs

| Stub | File | Reason |
| ---- | ---- | ------ |
| `claudeCode.testedVersion: ""` | .cowork/tiers.json | Intentional — filled by Q-010 spike in plan 01-03 (D-11) |
| `strict.t2Paths: []` | .cowork/tiers.json | Intentional — scaffold seam for strict mode, exercised in a later milestone (deferred idea, plan states it ships empty) |

## Threat Flags

None — artifacts match the plan's threat model exactly (tiers.json self-listed under `.cowork/**` T3 glob: T-01-01 mitigation in place; W-001 carries mandatory `expires`: T-01-02 mitigation in place). No package installs (T-01-SC accepted disposition holds).

## Self-Check: PASSED

- FOUND: .gitattributes, .gitignore, .cowork/tiers.json, .cowork/waivers.json, docs/methodology/AI-COWORK.md, .github/pull_request_template.md
- FOUND: commits f4eb76e, 25e96f2, 563bfb0
