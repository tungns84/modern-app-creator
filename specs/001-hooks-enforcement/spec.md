# Spec 001: Hooks Enforcement (L1 in-session layer)

## User Story

As the team operating this preset repository, we need Claude Code PreToolUse hooks
that deny T3 writes without an approved, branch-bound plan and deny T4 command
patterns outright, so that high-risk changes cannot bypass the H2 human checkpoint
even inside an agent session (AI-COWORK §5 Layer 1).

## Scope

This unit covers:

- `.cowork/tiers.json` — single source of truth for T3 path globs, T4 command
  patterns, meta-dir exclusions, and the pinned tested Claude Code version (D-22)
- `.cowork/waivers.json` — time-boxed waiver register (D-10)
- `.claude/hooks/**` — `lib/tiers.mjs` shared matcher + binding helpers,
  `t3-plan-gate.mjs`, `t4-command-guard.mjs`, `session-version-warn.mjs`, tests
- `.claude/settings.json` — hook dispatch, T1 allowlist, T4 deny mirror

## Acceptance Criteria

1. A Write/Edit on a T3 path produces a deny decision unless the CURRENT branch's
   BOUND spec exists (branch `feat/NNN-*` → `specs/NNN-*/plan.md` with a non-empty
   `Approved-by:` line); unrelated approved specs never satisfy the gate, and on an
   unbound branch (e.g., `main`) T3 writes are always denied. The deny message names
   the missing bound artifact and the next step.
2. A Bash command matching a T4 pattern produces a deny decision instructing human
   execution.
3. An internal hook error on a T3-relevant input (including a failed git branch
   read) produces a DENY (fail-closed), never a silent pass — proven by a deliberate
   crash-path test.
4. Writes to meta paths are never denied — the meta dev loop is unaffected (D-06).
5. T1 daily commands (`task *`, `./mvnw *`, `npm run *`) are pre-allowed in
   `settings.json` — zero ceremony (AGENT-04).
6. Hooks are live in `.claude/settings.json` for this repository (D-08 — enforcement
   ratchet stage 3).

## Requirements

- **AGENT-03** — PreToolUse hooks deny Write/Edit on T3 paths without approved plan
  (explaining message + next step) and deny T4 command patterns (FR-E03)
- **AGENT-04** — T1 allowlist pre-approves daily commands, zero ceremony (FR-E04)

## Conventions established by this unit

- Spec directory naming: `specs/NNN-short-name/` with zero-padded NNN starting at
  `001` (`000-example` reserved for the tutorial unit).
- Branch naming: `feat/NNN-short-name` — the NNN binds a change to its spec unit;
  both enforcement layers (L1 hook, L2 CI gate) resolve the bound spec from the
  branch name.
- Commits cite REQ-IDs, e.g. `feat(hooks): add T3 plan gate (refs AGENT-03)`.
