---
phase: 1
slug: dogfood-bootstrap-enforcement
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-11
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | none yet — Wave 0 installs (Node zero-dependency test scripts + Taskfile smoke tasks; see RESEARCH.md Validation Architecture) |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `node scripts/test/run-hook-tests.mjs` (planner to confirm exact path) |
| **Full suite command** | `task verify` (planner to confirm gate-set per Q-004) |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick run command
- **After every plan wave:** Run full suite command
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| (filled by planner per PLAN.md tasks) | — | — | — | — | — | — | — | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Hook test harness (Node zero-dependency) — stubs for AGENT-01..06, AGENT-09
- [ ] CI gate test fixtures (T3-path diff samples, plan.md with/without `Approved-by:`) — GATE-10, GATE-12
- [ ] `task up` healthcheck smoke — FOUND-02
- [ ] `scripts/init` rename dry-run check — FOUND-12

*Planner refines this list from RESEARCH.md Validation Architecture.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Claude Code interactive deny UX (message + next step shown in session) | AGENT-03 | Requires live Claude Code session on pinned version (Q-010) | Open session, attempt Write on T3 path without approved plan, observe deny message |
| 3-OS `task up` on real Win/macOS/Linux hosts | FOUND-02 | Local machine covers one OS; CI matrix covers rest | Run `task up` per OS, verify all healthchecks green |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
