---
phase: 1
slug: dogfood-bootstrap-enforcement
status: planned
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-11
updated: 2026-06-11
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` (built into Node 22 — zero install). Test files created RED-first inside TDD plans 01-04/01-06/01-07/01-09 |
| **Config file** | none (node:test needs none) |
| **Quick run command** | `node --test .claude/hooks/tests/ scripts/checks/tests/ scripts/tests/` |
| **Full suite command** | `task verify` (wired in plan 01-11 per Q-004 contract; prints `GATE <name> <millis>ms <PASS|FAIL>` lines) |
| **Estimated runtime** | quick: <5s · full: <60s (Phase-1 baseline expected <10s) |

---

## Sampling Rate

- **After every task commit:** Run quick run command (only suites whose dirs exist yet)
- **After every plan wave:** Run full suite command (from wave 5 on; before that, run all existing checks individually)
- **Before `/gsd-verify-work`:** `task verify` green + all CI workflows green on GitHub + macOS `task up` row resolved (verified or waived per D-04)
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-T1 | 01 | 1 | AGENT-05 | T-01-01/02 | tiers+waivers parse (incl. platformDeferred), T3 self-listing | assertion | inline `node -e` shape check + `git check-attr` | ❌ created by task | ⬜ pending |
| 01-01-T2 | 01 | 1 | AGENT-05 | — | verbatim constitution copy | assertion | `git diff --no-index` product↔docs | ❌ created by task | ⬜ pending |
| 01-12-T1 | 12 | 1 | AGENT-06, AGENT-09 | T-01-03 | specs 001-003 approved, no .planning links | assertion | inline `node -e` over specs/00[1-3] | ❌ created by task | ⬜ pending |
| 01-12-T2 | 12 | 1 | AGENT-06, AGENT-09 | T-01-03 | all 6 approved specs, no .planning links (tasks.md optional per AI-COWORK §4) | assertion | inline `node -e` over specs/00[1-6] | ❌ created by task | ⬜ pending |
| 01-02-T1 | 02 | 1 | GATE-10 | T-01-04/05 | A5/A6/A10 resolved empirically | spike report assertion | inline `node -e` key-presence | ❌ created by task | ⬜ pending |
| 01-02-T2 | 02 | 1 | AGENT-08 (seed) | — | fast/full gate-set contract | spike report assertion | inline `node -e` key-presence | ❌ created by task | ⬜ pending |
| 01-03-T1 | 03 | 1 | AGENT-03 | T-01-07/08 | A1–A4/A9 observed; fail-mode known | spike harness + report | inline `node -e` key-presence | ❌ created by task | ⬜ pending |
| 01-03-T2 | 03 | 1 | (criterion 5) | T-01-09 | toolchain proven on Temurin 25 CI | CI matrix run | inline `node -e` + run URL | ❌ created by task | ⬜ pending |
| 01-04-T1 (RED) | 04 | 2 | AGENT-03 | T-01-10/12/36 | branch-bound deny contract (10 cases) incl. crash fail-closed + anti-rot (unrelated approved spec never passes) | unit (node:test) | `node --test .claude/hooks/tests/` (must FAIL — RED gate matches `fail [1-9]`, never `fail 0`) | ❌ Wave-0-equivalent: created RED-first | ⬜ pending |
| 01-04-T2 (GREEN) | 04 | 2 | AGENT-03 | T-01-10/11/12/36 | hooks green on full 10-case fixture matrix; binding helpers live only in lib/tiers.mjs (D-22) | unit (node:test) | `node --test .claude/hooks/tests/` | ❌ created by task | ⬜ pending |
| 01-04-T3 | 04 | 2 | AGENT-04 | T-01-13 | allowlist + hooks live (D-08) | assertion + suite | inline `node -e` settings check + suite | ❌ created by task | ⬜ pending |
| 01-05-T1 | 05 | 2 | FOUND-02 | T-01-14/15 | pinned images, 6 healthchecks | config validation | `docker compose config -q` + `node -e` | ❌ created by task | ⬜ pending |
| 01-05-T2 | 05 | 2 | FOUND-02 | T-01-16 | task up all-healthy on Windows; macOS row BLOCKING-noted | integration (local) | `task --list` + report assertion | ❌ created by task | ⬜ pending |
| 01-05-T3 | 05 | 2 | FOUND-02 | — | D-04 split green in CI | integration (CI) | `gh run list --workflow=os-matrix.yml` | ❌ created by task | ⬜ pending |
| 01-06-T1 (RED) | 06 | 2 | FOUND-12 | T-01-17/18 | rename edge cases incl. traps | unit (node:test) | `node --test scripts/tests/` (must FAIL — RED gate matches `fail [1-9]`) | ❌ created RED-first | ⬜ pending |
| 01-06-T2 (GREEN) | 06 | 2 | FOUND-12 | T-01-17/18/19 | engine green, no sed -i, manifest | unit (node:test) | `node --test scripts/tests/` | ❌ created by task | ⬜ pending |
| 01-06-T3 | 06 | 2 | FOUND-12 | — | 2-OS parity + idempotency in CI | integration (CI) | `gh run list --workflow=init-parity.yml` | ❌ created by task | ⬜ pending |
| 01-07-T1 (RED) | 07 | 2 | GATE-12 | T-01-21 | CRLF/orphan/oversize/vacuous cases | unit (node:test) | `node --test scripts/checks/tests/claude-md.test.mjs` (must FAIL — RED gate matches `fail [1-9]`) | ❌ created RED-first | ⬜ pending |
| 01-07-T2 (GREEN) | 07 | 2 | GATE-12 | T-01-20/21 | render+check green | unit (node:test) | `node --test scripts/checks/tests/claude-md.test.mjs` | ❌ created by task | ⬜ pending |
| 01-08-T1 | 08 | 2 | FOUND-02 (ADR) | — | license rationale inline | assertion | inline `node -e` key-presence | ❌ created by task | ⬜ pending |
| 01-08-T2 | 08 | 2 | AGENT-05 (ADR) | T-01-22/23/24 | mechanisms locked, no meta links | assertion | inline `node -e` key-presence | ❌ created by task | ⬜ pending |
| 01-09-T1 (RED) | 09 | 3 | GATE-10 | T-01-25..28/36 | 14-case verdict matrix incl. PR↔spec binding (branch feat/NNN-* / plan.md-in-diff), anti-rot (unrelated specs FAIL), waiver-never-bypasses-binding | unit (node:test) | `node --test scripts/checks/tests/plan-compliance.test.mjs` (must FAIL — RED gate matches `fail [1-9]`) | ❌ created RED-first | ⬜ pending |
| 01-09-T2 (GREEN) | 09 | 3 | GATE-10 | T-01-25..28/36 | verdict core green, shared matcher + shared binding helpers (D-22) | unit (node:test) | `node --test scripts/checks/tests/plan-compliance.test.mjs` | ❌ created by task | ⬜ pending |
| 01-09-T3 | 09 | 3 | GATE-10, AGENT-09 | T-01-29/30/36 | dual triggers + --branch wiring, merge-commit only, no-deadlock ruleset (W-001 platform deferral; required checks = existing workflows only) | CI + platform read-back | `gh api repos/... --jq` merge flags + TWO test-PR run URLs (unbound branch → FAIL, feat/002-bound → PASS + mergeable) | ❌ created by task | ⬜ pending |
| 01-10-T1 | 10 | 4 | AGENT-01 | T-01-32 | template renders ≤200, smoke non-vacuous | check CLI | `node scripts/checks/claude-md-check.mjs --root-template ...` | ❌ created by task | ⬜ pending |
| 01-10-T2 | 10 | 4 | AGENT-01 | T-01-31 | tree files ≤150, hallucination warnings | check CLI | `node scripts/checks/claude-md-check.mjs --tree-file ...` | ❌ created by task | ⬜ pending |
| 01-10-T3 | 10 | 4 | GATE-12 | T-01-31 | gate blocking in CI (required only after first green run) | integration (CI) | `gh run list --workflow=claude-md-check.yml` | ❌ created by task | ⬜ pending |
| 01-11-T1 | 11 | 5 | AGENT-02 | T-01-33 | plan/verify skills full (plan skill names feat/NNN-* binding convention) | assertion | inline `node -e` content check | ❌ created by task | ⬜ pending |
| 01-11-T2 | 11 | 5 | AGENT-02 | T-01-33 | skeletons + skills-lint | check CLI | `node scripts/checks/skills-lint.mjs` | ❌ created by task | ⬜ pending |
| 01-11-T3 | 11 | 5 | AGENT-04, AGENT-08 seed | T-01-34/35 | lockstep + meta lint + verify spine + `task --dry verify` smoke-manifest entry | unit + integration | `node --test scripts/checks/tests/lints.test.mjs` + manifest `node -e` check + `task verify` | ❌ created by task | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

No separate Wave 0: this phase BUILDS the test infrastructure. All `MISSING` harnesses are created RED-first inside their owning TDD plans (Nyquist satisfied by construction):

- [x] Hook test harness (incl. git-branch sandbox for binding cases) → plan 01-04 Task 1 (RED) — AGENT-03
- [x] CI gate fixtures (PR files/reviews JSON, branch values, bound/unbound/unrelated-spec trees, plan.md with/without Approved-by) → plan 01-09 Task 1 (RED) — GATE-10
- [x] `task up` healthcheck smoke → plan 01-05 (compose config + CI ubuntu job) — FOUND-02
- [x] init rename fixture tests → plan 01-06 Task 1 (RED) — FOUND-12
- [x] claude-md check fixtures → plan 01-07 Task 1 (RED) — GATE-12
- [x] Spike harnesses (Q-010 scenario runner, Q-002 scripted PRs, Q-004 contract, JDK-25 smoke pom) → plans 01-02/01-03

---

## Manual-Only Verifications (end-of-phase human checks)

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live interactive deny UX (message + next step in session) | AGENT-03 | Requires live Claude Code session on pinned version | Fresh session → attempt Write on T3 path from an UNBOUND branch (e.g., main), then from a feat/NNN-* branch whose bound spec does not exist → observe deny message naming the BOUND artifact + next step both times (plans 01-03/01-04 human-checks; binding makes this pass-able by design even with specs 001-006 merged) |
| macOS `task up` one-time verification | FOUND-02 (D-04) | No macOS hardware in this environment | BLOCKING before `/gsd-verify-work`: run `task up` on a Mac and record runtime + health results into .planning/spikes/local-stack-verification.md, OR add an explicit time-boxed waiver entry (scope: macos-task-up-verification) to .cowork/waivers.json. An unresolved PENDING row blocks phase verification |
| Spec approval integrity (6 Approved-by lines) | AGENT-06/09 | Human H2 act by definition | Developer confirms the six approvals reflect real review (plan 01-12 human-check) |
| ADR 0002/0003 ratification (Status → Accepted) | AUTHZ-03/GATE-11 consumers | Architecture decision authority is human | Review both mechanism ADRs; amend or ratify (plan 01-08 human-check) |
| Ratchet narrative readable in history | AGENT-09 | Human reads commit log against D-05 | `git log --oneline` shows specs → hooks live → CI gate required ordering |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or are RED-first test-creation tasks
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (by construction — RED-first)
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** planner 2026-06-11 (revised 2026-06-11 per checker feedback: 01-01 split → 01-12; waves recomputed to 5; RED gates hardened; D-10 platform deferral; D-04 deadline bound. Revised again 2026-06-11, iteration 2: GATE-10/T3-hook presence-only check replaced with PR↔spec binding via feat/NNN-* branch + plan.md-in-diff fallback (anti-rot cases added → 01-09 = 14 cases, 01-04 = 10 cases, T-01-36); depends_on fixed: 01-09 += 01-05, 01-11 += 01-02 — waves unchanged; `task --dry verify` added to smoke manifest in 01-11-T3; tasks.md-optional note added to 01-12)
