# Plan 001: Hooks Enforcement

tier: T3

## Why T3

Gate configs and hook scripts are T3 paths by definition (AI-COWORK §5 L2 list:
gate configs, `.claude/` enforcement surface). Changing them alters what the
machine enforces.

## Files to touch

- `.cowork/tiers.json` — T3 path globs (full AI-COWORK §5 list from day 1),
  T4 command patterns, meta-dir exclusions in DATA (not code), `claudeCode.testedVersion`
- `.cowork/waivers.json` — waiver register; entry W-001 (solo self-approval,
  time-boxed, expiry evaluated on every gate run)
- `.claude/hooks/lib/tiers.mjs` — zero-dependency glob matcher + tiers loader +
  spec-binding helpers (`specNumberFromBranch`, `findBoundApprovedPlan`); shared
  with the CI gate (D-22 — one matcher, one binding implementation)
- `.claude/hooks/t3-plan-gate.mjs` — PreToolUse Write|Edit deny, branch-bound,
  fail-closed (whole script in try/catch; catch emits deny JSON, exit 0)
- `.claude/hooks/t4-command-guard.mjs` — PreToolUse Bash deny + best-effort
  write-bypass scan
- `.claude/hooks/session-version-warn.mjs` — SessionStart version warn (D-11,
  warn-not-block)
- `.claude/settings.json` — hook dispatch, T1 allowlist, `permissions.deny`
  mirroring tiers T4 patterns (lockstep checked by settings-lint, unit 005)
- `.claude/hooks/tests/*.test.mjs` — node:test suites incl. deliberate crash-path
  fail-closed case and anti-rot binding cases

## Modules affected

n/a — pre-backend; no application modules exist yet.

## Events / SPI surfaces

n/a.

## Migrations

n/a.

## Tests

- `node --test .claude/hooks/tests/` — fixture stdin JSON → expected decision JSON
- Mandatory cases: T3 write denied without bound spec; unrelated approved spec does
  NOT pass; meta paths never denied; T4 command denied; crash path emits DENY
  (fail-closed); version warner never breaks a session.

## Constitution rules that apply

- AI-COWORK §5 (two-layer enforcement; L1 deny holds under permission-skip flags)
- AI-COWORK §3.3 (never weaken a gate to get green; gate changes = T3)
- Zero-dependency rule: hooks run on fresh clone before any `npm ci`; only `node`
  and `git` assumed on PATH.

## Approval

Approved-by: tungns84 2026-06-11 (H2 approval granted via GSD Phase-1 plan review; solo self-approval waived per .cowork/waivers.json W-001)

Per D-02 this line is audit trail, NOT authorization proof. Authorization is the
PR review API plus repository ruleset; a forged `Approved-by:` line never
constitutes approval.

Branch for this unit: `feat/001-hooks-enforcement`.
