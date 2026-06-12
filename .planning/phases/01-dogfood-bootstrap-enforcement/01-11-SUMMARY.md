---
phase: 01-dogfood-bootstrap-enforcement
plan: 11
subsystem: claude-pack
tags: [skills, d-21, verify-spine, q-004, d-19, d-22, d-06, agent-02, agent-04, agent-09, lints]

# Dependency graph
requires:
  - phase: 01-dogfood-bootstrap-enforcement/02
    provides: "Q-004 spike report (gate-set contract + timing format) — baseline marker replaced here"
  - phase: 01-dogfood-bootstrap-enforcement/04
    provides: "hooks + .cowork/tiers.json + .claude/settings.json (the lockstep pair settings-lint compares)"
  - phase: 01-dogfood-bootstrap-enforcement/05
    provides: "Taskfile.yml up/down/ps/logs (extended with verify/verify:fast) + infra/compose.yaml (compose-config gate)"
  - phase: 01-dogfood-bootstrap-enforcement/10
    provides: "templates/claude/* + backend/frontend CLAUDE.md content + smoke-commands.json (claude-md-check gate operates on these)"
  - phase: 01-dogfood-bootstrap-enforcement/12
    provides: "approved specs/005-claude-pack + specs/001-hooks-enforcement binding this plan"
provides:
  - "Five skills under .claude/skills/ (D-21 depth split): plan + verify full; new-module (T3), new-feature (T2), design-implement (T2) skeleton contracts forbidding improvisation"
  - "scripts/checks/settings-lint.mjs — T1 allowlist presence (AGENT-04) + bidirectional deny↔tiers t4 lockstep (D-22) + 3-hook wiring check"
  - "scripts/checks/skills-lint.mjs — exact 5-dir set, frontmatter name+description, full-depth minimum, skeleton Skeleton+tier contract (AGENT-02)"
  - "scripts/checks/meta-link-lint.mjs — zero meta-dir references in shipped dirs (D-06/D-07, Pitfall 10), narrow justified allowlist"
  - "scripts/checks/run-gate.mjs — Q-004 timing runner: GATE/TOTAL lines, no short-circuit, fast 60s budget gate, rule-named failure relay"
  - "task verify (full) / task verify:fast (D-19 static seam) — the single gate path shared by CI, the verify skill, and devs"
  - "GATE-12 smoke covers `task --dry verify` on all 3 legs (root CLAUDE.md's documented command non-vacuous)"
affects: [phase-2-backend-gates, phase-4-frontend-gates, phase-8-divergence-audit]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Gate runner = ordered (name, argv) pairs via spawnSync shell:false; per-gate wall-clock; no short-circuit; budget itself is a gate (fast mode)"
    - "node --test invoked with explicit *.test.mjs file lists (readdirSync expansion) — bare directory form broken on Windows node 22.22"
    - "Lint CLIs accept --root/--settings/--tiers overrides so fixture tests spawn the real CLI against mutated temp copies"
    - "Self-referential needle built by concatenation ('.plan'+'ning/') so meta-link-lint never flags itself"

key-files:
  created:
    - .claude/skills/plan/SKILL.md
    - .claude/skills/verify/SKILL.md
    - .claude/skills/new-module/SKILL.md
    - .claude/skills/new-feature/SKILL.md
    - .claude/skills/design-implement/SKILL.md
    - scripts/checks/settings-lint.mjs
    - scripts/checks/skills-lint.mjs
    - scripts/checks/meta-link-lint.mjs
    - scripts/checks/run-gate.mjs
    - scripts/checks/tests/lints.test.mjs
  modified:
    - Taskfile.yml
    - templates/claude/smoke-commands.json
    - .planning/spikes/q004-verify-fast.md

key-decisions:
  - "settings-lint lockstep is BIDIRECTIONAL: missing deny for a t4 pattern fails AND an orphan Bash deny rule with no t4 backing fails — must_haves say 'stays in lockstep' and D-22 makes tiers.json the single source, so drift in either direction is a violation"
  - "meta-link-lint ships a narrow explicit allowlist (4 entries, each justified in the header) instead of failing the real tree: meta-exclusion TEST fixtures must name the excluded dir as data, and docs/methodology/AI-COWORK.md is the D-12 verbatim copy whose footer carries an upstream source citation"
  - "checks-test gate folds scripts/tests/ (init-core suite) into the Q-004 §3 gate list — the suite postdates the spike; static node:test class, assigned to fast per the §4 same-PR assignment rule"
  - "run-gate default mode is full; Taskfile encodes the D-19 seam as two separate task definitions calling --mode full / --mode fast (identical set in Phase 1 by design)"
  - "claude-md-check gate omits --leg so local runs default to the platform leg (01-07 convention) — smoke manifest declares all 4 commands on all 3 legs, so every leg is non-vacuous"

# Metrics
duration: ~18min
completed: 2026-06-12
tasks: 3
files: 13
---

# Phase 01 Plan 11: Claude pack completion + verify spine Summary

**Five D-21 skills (plan/verify full, three skeleton contracts), the lint trio (settings lockstep, skills structure, meta-link separation) with 12 fixture tests, and the Q-004 `task verify`/`verify:fast` spine — first real baseline TOTAL 4909ms PASS, all 7 gates green.**

## What Was Built

1. **`plan` skill (full):** interrogate intent → compute next NNN from `specs/[0-9][0-9][0-9]-*` (000 reserved) → emit AI-COWORK §3.2 plan.md (files/modules/events-SPI/migrations/tests/`tier:` with the §6 rubric table/constitution rules) with an EMPTY `Approved-by:` line the human fills; names the `feat/NNN-slug` branch binding both gates enforce; states T3 writes stay hook-blocked until approval.
2. **`verify` skill (full):** thin wrapper — run `task verify`, parse the GATE/TOTAL lines, summarize failures BY VIOLATED RULE with each gate's own fix hint (FR-E08 seed); fix-the-code-never-the-gate (gate changes are T3); `verify:fast` documented as the D-19 inner loop.
3. **Three skeletons (D-21):** frontmatter + CONTRACT (inputs/outputs/tier) + literal "Skeleton — implemented in Phase 2/4. Do NOT improvise"; `new-module` declares `tier: T3` with the pre-filled specs/NNN plan.md template note; `design-implement` notes the design workflow is OFF/deferred.
4. **`settings-lint.mjs`:** three T1 allow rules present; every tiers t4 pattern mirrored in `permissions.deny` AND every Bash deny rule backed by a t4 pattern; t3-plan-gate (Write|Edit), t4-command-guard (Bash), session-version-warn (SessionStart) all wired. Rule-named failures with fixes.
5. **`meta-link-lint.mjs`:** scans tracked files in docs/, specs/, backend/, frontend/, .claude/, templates/, scripts/, infra/, .github/ for the meta-dir string, fails with file+line; `--root` fs-walk mode for fixtures; allowlist below.
6. **`run-gate.mjs` + Taskfile `verify`/`verify:fast`:** the 7 Phase-1 gates in Q-004 §3 order (hooks-test, checks-test, claude-md-check, settings-lint, skills-lint, meta-link-lint, compose-config), `GATE <name> <millis>ms <PASS|FAIL>` + `TOTAL` verbatim, no short-circuit, fast-mode 60s budget enforced as a gate, failed gates relay their rule-named output after the timing block.
7. **`smoke-commands.json`:** `task --dry verify` added on all legs — GATE-12 proves the root CLAUDE.md's `task verify` resolves, dry-run avoids verify-inside-verify recursion. Verified: claude-md-check now runs 4 smoke commands green.
8. **Q-004 baseline:** spike report §6 marker replaced with the measured first run (full 4909ms / fast 4802ms, all PASS — inside the <10s Phase-1 expectation and 60s ceiling).

## Task Commits

| Task | Name | Commit |
|------|------|--------|
| 1 | plan + verify skills (full, D-21) | `f4cfc78` |
| 2 | three skeleton skills + skills-lint | `7519681` |
| 3 | settings/meta-link lints + tests + verify spine + smoke entry + baseline | `ff4d56c` |

## Verification

- `node --test scripts/checks/tests/lints.test.mjs` → 12/12 pass (settings: missing-deny, missing-allow, orphan-deny, unwired-hook; meta-link: clean/leaky/allowlisted fixtures with file+line assertion; skills: renamed-dir, stripped-tier)
- `node scripts/checks/skills-lint.mjs` exit 0 on real tree; exit 1 on a fixture with `new-module` renamed away (negative check run during development)
- `task verify` exit 0: 7 GATE lines all PASS, `TOTAL 4909ms PASS` (<60s); `task verify:fast` exists as a distinct task, also green
- `task --dry verify` and `task --dry verify:fast` resolve; smoke manifest assertion green; standalone claude-md-check: "4 command(s) ran green"
- meta-link-lint exit 0 on the real tracked tree, exit 1 on the leaky fixture

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical handling] meta-link-lint explicit allowlist**
- **Found during:** Task 3 (pre-write scan of shipped dirs)
- **Issue:** The acceptance criterion assumes "zero .planning/ references in shipped dirs", but the real tree legitimately contains them: `.claude/hooks/tests/`, `scripts/checks/tests/`, `scripts/tests/` reference the meta dir as FIXTURE DATA (the tier system's meta-exclusion logic is untestable without naming the excluded dir), and `docs/methodology/AI-COWORK.md` is the D-12 verbatim copy whose upstream footer cites a meta path (editing the copy would break verbatim-ness).
- **Fix:** Narrow 4-entry allowlist (each justified in the lint header); everything else fails with file+line. Fixture test proves the lint still fires on non-exempt files and that the allowlist is honored.
- **Files modified:** scripts/checks/meta-link-lint.mjs
- **Commit:** `ff4d56c`

**2. [Rule 1 - Bug avoidance] Windows-safe `node --test` invocation**
- **Found during:** Task 3
- **Issue:** Q-004 §3 specifies `node --test <dir>/` directory form, broken on Windows node 22.22 (known from earlier plans in this phase).
- **Fix:** run-gate expands explicit `*.test.mjs` file lists via readdirSync; gate names stay exactly per contract.
- **Commit:** `ff4d56c`

**3. [Rule 2 - Contract gap] `scripts/tests/` folded into the checks-test gate**
- **Found during:** Task 3
- **Issue:** Q-004 §3 lists only `.claude/hooks/tests/` and `scripts/checks/tests/`; the `scripts/tests/` init-core suite (plan 01-08) postdates the spike and was unassigned — but Q-004 §4 mandates every gate be assigned fast or full-only.
- **Fix:** Folded into checks-test (static node:test class → fast), noted in the spike report baseline section.
- **Commit:** `ff4d56c`

### Orchestrator-context deferrals

**4. [Deferred] PR flow (feat/NNN-* → PR → checks green → merge under W-001)**
- The plan objective routes this T3 work through the 01-09 PR flow; this agent runs in a no-push parallel worktree (same as plans 01-05/01-10). Work is committed in-tree on the worktree branch; the orchestrator owns merge/push. All gates were run locally end-to-end green.

No auth gates encountered.

## Known Stubs

None. The three skeleton skills are deliberate D-21 contracts (the plan's own design — implemented Phase 2/4, machine-checked by skills-lint), not stubs: they explicitly forbid improvisation and carry their tier + I/O contracts.

## Threat Model Dispositions Applied

- **T-01-33 (skill tampering):** skills-lint asserts structure every verify run; `.claude/skills/` rides CODEOWNERS `.claude/**` coverage. Note: `.claude/skills/**` is NOT currently on the tiers.json t3.paths list (only settings.json and hooks/** are) — flagged below.
- **T-01-34 (deny↔tiers drift):** settings-lint lockstep in every verify run, bidirectional, fixture-tested.
- **T-01-35 (meta leak):** meta-link-lint in every verify run; allowlist is explicit and justified per entry.
- **T-01-SC:** zero npm dependencies — all new scripts use node: builtins only.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: tier-coverage-gap | .cowork/tiers.json | `.claude/skills/**` is not on t3.paths, so the L1 hook does not gate skill edits (T-01-33 lists skills as T3-adjacent). Adding it is itself a T3 tiers.json change — propose via the plan skill in a follow-up. |

## Deferred Issues

- Tier-coverage gap above (one-line tiers.json addition, T3-reviewed).
- First green `task verify`-adjacent CI runs on GitHub remain owned by the orchestrator post-merge (carried from 01-05/01-10 deferrals; this plan adds no new workflow).

## Self-Check: PASSED

- All 10 created files FOUND on disk; Taskfile.yml / smoke-commands.json / q004-verify-fast.md modifications in place
- Commits `f4cfc78`, `7519681`, `ff4d56c` FOUND in git log
- No untracked files left; no unintended deletions in any commit

---
*Phase: 01-dogfood-bootstrap-enforcement*
*Completed: 2026-06-12*
