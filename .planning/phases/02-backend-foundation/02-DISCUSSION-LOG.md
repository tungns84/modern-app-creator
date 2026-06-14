# Phase 2: Backend Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-13
**Phase:** 2-Backend Foundation
**Areas discussed:** Dogfood & skill new-module, BPM option mechanism, Config switch & Consul, Event registry policy

---

## Dogfood & skill new-module

| Option | Description | Selected |
|--------|-------------|----------|
| Manual-first | Scaffold skeleton + `shared` by hand as reference, codify into skill, generate remaining 4 modules with skill (validated 4×) | ✓ |
| Skill-first | Implement full skill before any module exists — designs blind, rework risk | |

| Option | Description | Selected |
|--------|-------------|----------|
| Skeleton 1 + per-module 1 (~5 specs) | Matches skill contract (skill emits specs/NNN-<module>/plan.md) + D-09 granularity | ✓ |
| 2 grouped specs | Less ceremony, weaker dogfood evidence, off skill contract | |
| 1 spec whole phase | Giant PR, H2 approval meaningless | |

| Option | Description | Selected |
|--------|-------------|----------|
| `shared` minimal | Only what GATE-02 forces: scheduling wrapper, query wrapper, truly shared types | ✓ |
| Pre-carve seams | BaseEntity tenant_id + error scaffolding now — conflicts with Phase 3/4 ownership | |

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal real functional slice per module | appconfig/i18n/caching/observability each ship one usable capability; no empty Flyway | ✓ |
| Boundary shell | Fails success criteria 3/4 | |
| Claude decides | | |

**User's choice:** Manual-first; ~5 specs; shared minimal; minimal functional slices.

---

## BPM option mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Maven property + profile | `bpm.enabled` default true; `bpm-off` profile excludes bpm sources; simulates template-time exclusion; pom already T3 | ✓ |
| `.cowork/preset-options.json` | JSON source of truth — Maven can't read it for source exclusion, two coupled places drift | |
| Spring runtime property | Module still compiled/detected — wrong semantics | |

| Option | Description | Selected |
|--------|-------------|----------|
| Exact module name set | Stronger than count; catches renames/substitutions; skill bumps the set | ✓ |
| Count only | Literal FR-A01 wording but weaker | |

**User's choice:** Maven property + profile; name-set assertion.
**Notes:** Phase 2 lands property + assertion only; `bpm-off` profile exercised in Phase 7.

---

## Config switch & Consul

| Option | Description | Selected |
|--------|-------------|----------|
| Dep always in pom + Spring profile activation | `optional:consul:` import; one classpath; verify Spring Cloud ↔ Boot 4 train | ✓ |
| Maven profile gating dep | Two build branches, CI doubles, drift risk | |

| Option | Description | Selected |
|--------|-------------|----------|
| Testcontainers-only proof | Consul spun in integration test (`verify --full`); compose stays 6 services | ✓ |
| Compose profile service | Bloats stack, off FOUND-02 locked list | |

| Option | Description | Selected |
|--------|-------------|----------|
| ArchUnit rule | Ban `@Value`/`Environment` outside appconfig; machine-enforced | ✓ |
| CLAUDE.md convention only | Violates project core principle (rules live in gates) | |

**User's choice:** Dep in pom + profile; Testcontainers-only; ArchUnit enforcement.

---

## Event registry policy

| Option | Description | Selected |
|--------|-------------|----------|
| Mark-completed + retention cleanup | Cleanup via shared scheduling wrapper; retention typed property; forensics + staleness monitor usable | ✓ |
| Delete-on-completion | No cleanup job but loses trail; FOUND-03 cleanup clause meaningless | |

| Option | Description | Selected |
|--------|-------------|----------|
| At-least-once + idempotent listeners | Rule in backend/CLAUDE.md; kill-listener test asserts redelivery AND single effect | ✓ |
| Generic inbox/dedup table in shared | Heavier infra, overkill before business listeners exist | |

| Option | Description | Selected |
|--------|-------------|----------|
| Claude decides details, architecture locked | Bounded retry, no silent drop, staleness monitor on; numbers = typed properties, defaults per Modulith 2.0 docs | ✓ |
| Pin numbers now | Unnecessary — pure technical, property-changeable | |

**User's choice:** Mark-completed + cleanup; at-least-once + idempotency; planner picks numbers.

---

## Claude's Discretion

- Maven structure (single vs multi-module layout) — Modulith convention, research-backed
- Retry/backoff/retention/staleness default values
- MDC PII allowlist field list + mechanism; OTel wiring approach
- Gate error formatting within Q-004 contract
- new-module skill internals (generator vs instructions) as long as CONTRACT outputs match

## Deferred Ideas

- `bpm-off` profile real exercise + CI leg → Phase 7
- Consul in compose/K8s overlays → Phase 6 if ever
- Generic event inbox/dedup table → revisit Phase 5+ if idempotency gets repetitive
- Tenant seam in shared → Phase 3; ProblemDetail envelope → Phase 4
