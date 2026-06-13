---
phase: 2
slug: backend-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-13
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | JUnit 6 (Boot 4-managed) + Testcontainers 2.x + ArchUnit ≥1.4.2 |
| **Config file** | `backend/pom.xml` (surefire/failsafe), `backend/src/test/resources/` |
| **Quick run command** | `./mvnw -q test -Dtest='*ArchTest,*ModularityTest'` (verify --fast gate set) |
| **Full suite command** | `./mvnw verify` (Modulith verify + ArchUnit + Testcontainers IT) |
| **Estimated runtime** | ~45–60 seconds (fast gates); full IT longer with container spin-up |

---

## Sampling Rate

- **After every task commit:** Run quick gate set (`verify --fast`, <60s)
- **After every plan wave:** Run `./mvnw verify` (full Modulith + IT)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds (fast gates per Q-004 / success criterion 5)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| {N}-01-01 | 01 | 1 | FOUND-01 | T-2-01 / — | Modulith verify passes on green skeleton | arch | `./mvnw test -Dtest=ModularityTest` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky — planner populates the full row set per PLAN.md.*

---

## Wave 0 Requirements

- [ ] `ModularityTest` — Spring Modulith `ApplicationModules.of(App.class).verify()` baseline
- [ ] `ArchitectureGatesTest` — ArchUnit rules (field injection, bare `@Scheduled`, unwrapped native query, entity-across-controller, DAG cycle, undeclared dependency)
- [ ] Testcontainers 2.x base IT fixture (`@ServiceConnection` PostgreSQL 16)
- [ ] Event Publication Registry kill-listener test scaffold (no loss + no double-effect)

*Planner finalizes the Wave 0 test list from RESEARCH.md Validation Architecture section.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Profile-switched config source (env+ConfigMap vs Consul KV) | FOUND-05 | Consul KV requires a running Consul agent not in CI base | Boot app under `consul` profile, confirm property resolves from Consul KV |

*If Consul compat (Open Question Q-1) is unresolved, this row escalates to a Wave 0 blocker.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
