---
phase: 01-dogfood-bootstrap-enforcement
plan: 04
subsystem: enforcement-hooks
tags: [hooks, pretooluse, tdd, fail-closed, tiers, branch-binding]
requires:
  - "01-01: .cowork/tiers.json + waivers.json (single tier source, D-22)"
  - "01-03: Q-010 spike PASS on Claude Code 2.1.173 (D-08 gate)"
  - "01-12: specs/001-hooks-enforcement approved (bound spec unit)"
provides:
  - ".claude/hooks/lib/tiers.mjs — shared matcher + binding helpers for the L2 CI gate (plan 01-09, D-22)"
  - ".claude/hooks/t3-plan-gate.mjs — branch-bound T3 Write|Edit deny, fail-closed"
  - ".claude/hooks/t4-command-guard.mjs — T4 deny + best-effort write-bypass scan"
  - ".claude/hooks/session-version-warn.mjs — D-11 version warner"
  - "33-test node:test suite (the per-commit quick check for the milestone)"
affects:
  - "01-09 (CI gate imports findBoundApprovedPlan/specNumberFromBranch unchanged)"
  - "01-11 (settings-lint checks permissions.deny ↔ tiers.json t4 lockstep)"
tech-stack:
  added: []
  patterns:
    - "Fail-closed hook skeleton: whole script in try/catch; catch emits deny JSON + exit 0 (Q-010 A1: crash = fail-open on 2.1.173)"
    - "Zero-dependency Node (node: builtins only) — hooks work on fresh clone before npm ci"
    - "Hand-rolled glob subset: ** crosses dirs, * within segment, literal"
key-files:
  created:
    - .claude/hooks/lib/tiers.mjs
    - .claude/hooks/t3-plan-gate.mjs
    - .claude/hooks/t4-command-guard.mjs
    - .claude/hooks/session-version-warn.mjs
    - .claude/hooks/tests/tiers.test.mjs
    - .claude/hooks/tests/t3-gate.test.mjs
    - .claude/hooks/tests/t4-guard.test.mjs
    - .claude/hooks/tests/fixtures/ (6 fixtures)
  modified:
    - .cowork/tiers.json (claudeCode.testedVersion = "2.1.173")
decisions:
  - "Reused the killed predecessor session's untracked test files + fixtures verbatim — review confirmed full coverage of the 10-case behavior matrix incl. anti-rot and crash fail-closed cases"
  - "Absolute file_path inputs are relativized against CLAUDE_PROJECT_DIR before tier matching; paths outside the project are not the gate's domain (silent pass)"
  - ".claude/settings.local.json (worktree.baseRef) left untouched: it is Claude Code worktree machinery, gitignored since 01-01 — never committable"
metrics:
  duration: "~25 min (continuation agent)"
  completed: 2026-06-12
  tasks: "2.7/3 (Task 3 blocked on one artifact)"
---

# Phase 1 Plan 04: Tier Enforcement Hooks (L1) Summary

**One-liner:** Branch-bound, fail-closed PreToolUse enforcement (T3 plan-gate + T4 command-guard + D-11 version warner) built test-first with a shared zero-dep matcher/binding lib for the CI gate — 33/33 tests green; go-live blocked on one artifact (`.claude/settings.json`) by a runtime permission denial requiring human approval.

## RED (Task 1) — commit 903ba26

Reused and committed the predecessor session's untracked test suite after verifying it pins every case of the plan's 10-case behavior table:

- `tiers.test.mjs` (17 tests): glob subset (`**` crosses dirs incl. deep `security/**`, `*` single-segment only, literals, Windows backslash input), meta-wins-over-T3 (D-06), `isT4Command`, `specNumberFromBranch` (feat/007-x → "007"; main/chore → null), and the **rich `findBoundApprovedPlan` contract** `{found, path, hasApprovedBy, hasTier}` including the marker-missing case (found=true / hasApprovedBy=false — the exact shape the 01-09 CI gate consumes, D-22) and the **anti-rot case** (approved spec 001 never satisfies a lookup bound to 099).
- `t3-gate.test.mjs` (9 tests): spawns the hook as a child process with fixture stdin inside per-case temp git sandboxes — unbound-branch deny (names `specs/`, plan, `feat/NNN-`, next step + retry per AGENT-03), anti-rot deny naming `specs/099-*`, bound-approved silent pass, empty-`Approved-by:` deny, meta pass, non-T3 pass, **malformed-stdin → deny containing "failing closed"** (Pitfall 1), **failed git branch read → deny**, Edit-tool parity.
- `t4-guard.test.mjs` (7 tests): T4 deny says "human", `task verify` passes, redirect/tee bypass into T3 paths denied without bound approval and allowed WITH it, non-T3 redirect passes, crash fail-closed.

RED verified: 33 tests, `# fail 33` (module/scripts missing), then committed.

## GREEN (Task 2) — commit 1d57790

- `lib/tiers.mjs` (~120 lines): `loadTiers`, `matchTier` (meta.exclude wins → "meta"; t3.paths → "T3"; else null), `isT4Command` (substring vs t4.commandPatterns), `specNumberFromBranch` (`^feat\/(\d{3})-`), `findBoundApprovedPlan` (scans ONLY `specs/<nnn>-*/plan.md`, CRLF-normalized regex for `Approved-by:`/`tier: T3`). The ONLY place matching + binding live (verified by grep — D-22).
- `t3-plan-gate.mjs`: stdin → relativize → tier match → branch read via `git rev-parse --abbrev-ref HEAD` (failure on a T3 input = deny) → unbound or `!(found && hasApprovedBy)` = deny naming the bound artifact (actual NNN when bound, feat/NNN-* convention when unbound) + next step. Catch-all deny ("failing closed").
- `t4-command-guard.mjs`: T4 pattern → deny instructing human execution; best-effort write-target extraction (`>`/`>>`, `tee`, `sed -i`, `git apply` tokens) → T3-matched targets get the same branch-bound gate via the shared helpers. Documented best-effort (Pitfall 2/D-16).
- Zero non-builtin imports in all three scripts (verified: only `node:fs`, `node:path`, `node:child_process`, `./lib/tiers.mjs`).

GREEN verified: 33/33 pass. No REFACTOR commit needed — implementation came out clean against the pre-written contract.

## Task 3 (wire + go live) — PARTIAL, commit 2ce7ea0

Done:
- `session-version-warn.mjs`: reads `claudeCode.testedVersion`, compares `claude --version`, warns on mismatch (D-11, Q-010 A9). Whole script try/catch → exit 0 silently; verified exit 0 from a bare temp dir and from repo root.
- `.cowork/tiers.json`: `claudeCode.testedVersion` = **"2.1.173"** (Q-010 report pin).
- `.claude/settings.local.json` confirmed gitignored (01-01).

**BLOCKED — `.claude/settings.json` (D-08 go-live artifact):** the runtime permission classifier denied the Write ("adds wildcard permission allow rules … Self-Modification") and instructed stopping for a human decision. The plan-mandated content (PATTERNS.md Code Example 1, verbatim — Q-010 A2 confirmed `$CLAUDE_PROJECT_DIR` works on Windows, so the as-researched form is correct) is:

- `permissions.allow`: `Bash(task *)`, `Bash(./mvnw *)`, `Bash(npm run *)` (AGENT-04 T1 zero ceremony)
- `permissions.deny`: 8 rules mirroring ALL tiers.json t4.commandPatterns — `Bash(git push --force*)`, `Bash(git push -f*)`, `Bash(kubectl apply*)`, `Bash(kubectl delete*)`, `Bash(flyway clean*)`, `Bash(docker volume rm*)`, `Bash(gh secret set*)`, `Bash(git reset --hard origin*)`
- `hooks.SessionStart` → `node "$CLAUDE_PROJECT_DIR/.claude/hooks/session-version-warn.mjs"`
- `hooks.PreToolUse`: matcher `Write|Edit` → t3-plan-gate.mjs; matcher `Bash` → t4-command-guard.mjs

I did not attempt to bypass the denial (e.g., via Bash file writes) — that would be exactly the write-bypass this plan's own guard exists to block.

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| Hook dispatch not wired — hooks NOT yet live (D-08 incomplete) | `.claude/settings.json` (missing) | Write denied by runtime permission classifier; human must approve creation. All hook scripts + tests are complete and green; the wiring file is the only missing piece. |

The plan's "hooks live in this repo" success criterion is **not** met until settings.json lands. AGENT-09 ratchet evidence: ratchet stage 3 is pending this single artifact.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Verify command form: `node --test <dir>` does not discover tests**
- **Found during:** Task 1
- **Issue:** On Node 22.22.0/Windows, `node --test .claude/hooks/tests/` treats the dot-directory path as a module entry (MODULE_NOT_FOUND) instead of discovering `*.test.mjs` inside it.
- **Fix:** Working invocation is `node --test .claude/hooks/tests/*.test.mjs` (glob). The plan's documented quick command should be read with the glob; plans 01-09/01-11 and Taskfile `verify` should use the glob form.
- **Files modified:** none (command-form only)

**2. [Rule 1 - Bug] JSDoc `*/` sequence terminated a block comment early**
- **Found during:** Task 2 (GREEN debugging)
- **Issue:** The doc comment for `findBoundApprovedPlan` contained `specs/<nnn>-*/plan.md`; the `*/` closed the block comment → SyntaxError, dynamic import failed, all tests reported the import-missing hint.
- **Fix:** Reworded the comment to avoid `*/` inside the block.
- **Files modified:** `.claude/hooks/lib/tiers.mjs`
- **Commit:** 1d57790 (fixed before GREEN commit)

### Blocked Items

**`.claude/settings.json` creation denied by the execution environment's permission classifier** — see Task 3 section. Human action required: approve/create the file with the content above, then re-run the Task 3 verify (`node -e "require('./.claude/settings.json')…"`) and the live human-check at phase end.

## Commits

| Commit | Type | Content |
|--------|------|---------|
| 903ba26 | test(01-04) | RED — 33 failing tests + 6 fixtures (reused predecessor partials) |
| 1d57790 | feat(01-04) | GREEN — lib/tiers.mjs + t3-plan-gate.mjs + t4-command-guard.mjs, 33/33 pass |
| 2ce7ea0 | feat(01-04) | session-version-warn.mjs + testedVersion pin 2.1.173 |

Live-hooks-on commit hash (AGENT-09 ratchet evidence): **pending** — blocked on settings.json (see Known Stubs).

## TDD Gate Compliance

RED gate commit (`test(01-04)` 903ba26) precedes GREEN gate commit (`feat(01-04)` 1d57790); no REFACTOR commit (no cleanup needed). RED proven by `# fail 33` summary before any implementation existed.

## Threat Flags

None — all security surface in this plan was pre-registered in the plan's threat model (T-01-10…13, T-01-36, T-01-SC); mitigations implemented: fail-closed catch deny + crash test (T-01-10), best-effort bypass scan (T-01-11), defensive stdin parse (T-01-12), tiers.json self-protection via `.cowork/**` in t3.paths (T-01-13), branch-bound anti-rot lookup (T-01-36), zero npm deps (T-01-SC).

## Self-Check: PASSED

- `.claude/hooks/lib/tiers.mjs` — FOUND
- `.claude/hooks/t3-plan-gate.mjs` — FOUND
- `.claude/hooks/t4-command-guard.mjs` — FOUND
- `.claude/hooks/session-version-warn.mjs` — FOUND
- Commits 903ba26, 1d57790, 2ce7ea0 — FOUND in `git log`
- `node --test .claude/hooks/tests/*.test.mjs` — 33/33 pass
- `.claude/settings.json` — MISSING **by documented blocker** (not a silent failure)
