---
phase: 01-dogfood-bootstrap-enforcement
plan: 08
subsystem: docs
tags: [adr, constitution, license, authz, gate, fr-b11, fr-b13, d-17]

# Dependency graph
requires:
  - phase: 01-dogfood-bootstrap-enforcement
    plan: 12
    provides: "Approved spec unit specs/006-adr-foundation (T3, Approved-by audit line)"
  - phase: 01-dogfood-bootstrap-enforcement
    plan: 01
    provides: "Waiver register + config bootstrap (Valkey choice already wired in compose direction)"
provides:
  - "ADR 0001 — Valkey 8 (BSD-3) over Redis, license rationale recorded (D-17); consumed by Phase 2 caching + Phase 5 jti blacklist"
  - "ADR 0002 — FR-B11 permission catalog code↔DB sync mechanism locked: code is source of truth, startup sync, deprecated-before-delete, boot-fail on referenced-deprecated past grace window"
  - "ADR 0003 — FR-B13/GATE-11 undeclared-permission detection mechanism locked: ArchUnit static rule in verify --fast + RequestMappingHandlerMapping context backstop, explicit @PublicEndpoint opt-out"
  - "docs/adr/NNNN-slug.md convention with Status/Context/Decision/Consequences/Alternatives sections"
affects: [phase-2 caching, phase-3 AUTHZ-03, phase-3 GATE-11, phase-5 jti-blacklist, 01-09 CODEOWNERS (docs/adr is T3), 01-11 meta-link-lint]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ADR convention: docs/adr/NNNN-slug.md, sections Status / Context / Decision / Consequences / Alternatives considered; Status starts Proposed, ratified to Accepted at phase verification"
    - "D-07 discipline: spike/research evidence summarized inline in ADRs, zero .planning/ links (templating-safe)"

key-files:
  created:
    - docs/adr/0001-valkey-not-redis.md
    - docs/adr/0002-permission-catalog-sync.md
    - docs/adr/0003-undeclared-permission-detection.md
  modified: []

key-decisions:
  - "ADR 0002 locks code-as-source-of-truth: Java constants per module, startup sync (insert/update-metadata/mark-Deprecated, never delete), startup FAILS if a Deprecated code is still role-granted past its grace window"
  - "ADR 0003 locks two-layer static-first detection: ArchUnit @RequestMapping-family ⇒ @RequirePermission|@PublicEndpoint rule (verify --fast) + Spring RequestMappingHandlerMapping enumeration backstop (verify --full)"
  - "ADR 0001 records Valkey 8 BSD-3 vs Redis 7.4 RSAL/SSPL and Redis ≥8 tri-license incl. AGPLv3; image swap only, Lettuce unchanged"
  - "All three ADRs ship with Status: Proposed + explicit ratification note — developer flips to Accepted at end-of-phase verification (human_verify_mode: end-of-phase)"

patterns-established:
  - "Every ADR carries a Requirements traceability / consequences section binding it to the consuming phase so downstream plans implement without re-deciding"

requirements-completed: [AGENT-05, FOUND-02]

# Metrics
duration: 8min
completed: 2026-06-11
---

# Phase 1 Plan 08: ADR Foundation Summary

**Three constitution ADRs (docs/adr/0001–0003) lock the Valkey license decision (D-17), the FR-B11 code-as-source-of-truth permission catalog sync with deprecated-before-delete, and the FR-B13/GATE-11 two-layer ArchUnit-first undeclared-permission gate — clearing the STATE.md blockers that held Phase 3 planning**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-06-11T13:45:51Z
- **Completed:** 2026-06-11T13:53:30Z
- **Tasks:** 2
- **Files modified:** 3 (all created)

## Accomplishments

- Roadmap success criterion 5's ADR set is complete: FR-B11 (0002), FR-B13 (0003), Redis-vs-Valkey (0001)
- Phase 3 AUTHZ-03 and GATE-11 now have ADR-locked mechanisms to implement against ("locked by ADR before implementation" requirement texts satisfied, pending end-of-phase ratification)
- ADR 0002's decision text itself encodes the T-01-22 elevation control (deprecated-before-delete + boot-fail on referenced-deprecated); ADR 0003 encodes T-01-23 (no implicit public endpoints — `@PublicEndpoint` is the only auditable opt-out)
- All evidence (license facts, catalog field model, gate principles) summarized inline — zero `.planning/` references across all three ADRs (D-07; meta-link-lint in 01-11 will enforce continuously)
- Each ADR has ≥2 documented alternatives with rejection reasons and a Requirements-traceability binding

## Task Commits

Each task was committed atomically:

1. **Task 1: ADR 0001 — Valkey 8 instead of Redis (D-17)** - `186934f` (docs)
2. **Task 2: ADRs 0002 + 0003 — FR-B11 sync + FR-B13 detection mechanisms** - `576e25c` (docs)

## Files Created/Modified

- `docs/adr/0001-valkey-not-redis.md` - License decision record (D-17): BSD-3 Valkey 8 vs RSAL/SSPL Redis 7.4 vs tri-licensed Redis ≥8; wire-compatible image swap, Lettuce unchanged
- `docs/adr/0002-permission-catalog-sync.md` - FR-B11 mechanism: code-declared constants per module, startup sync, deprecated-before-delete, fail condition on referenced-deprecated past grace window
- `docs/adr/0003-undeclared-permission-detection.md` - FR-B13/GATE-11 mechanism: ArchUnit static rule (verify --fast) + RequestMappingHandlerMapping context backstop; `@PublicEndpoint` explicit opt-out

## Decisions Made

- Sync trigger fixed at application startup (vs build-time annotation processor or Flyway-maintained catalog) — same guarantees, plain testable Spring bean, no extra codegen toolchain
- Detection primary layer is bytecode-static (ArchUnit) so violations fail locally in seconds inside `verify --fast` (D-19 static-only gate set); the Spring context test is the backstop for meta-annotation/composed-mapping edge cases
- Functional router endpoints explicitly out of scope for the annotation-based rule — adopting them requires extending ADR 0003 first (noted as a consequence, prevents silent gate erosion)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `product/` (security design, AI-COWORK.md sources) is untracked in the main repo, so it is absent from this worktree. Read the source files read-only from the main repo checkout (`D:\projects\modern-app-creator\product\...`) — no writes outside the worktree occurred.

## Human Verification Pending (end-of-phase)

Task 2 carries a `human-check`: the developer reviews both mechanism decisions (0002, 0003) and ratifies — Status flips Proposed → Accepted — or amends. These lock Phase 3 implementation (AUTHZ-03, GATE-11). Config `human_verify_mode: end-of-phase`; not blocking this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 3 planning unblocked: AUTHZ-03 implements the catalog constant classes + startup sync component + grace-window config against ADR 0002; GATE-11 wires the ArchUnit rule + context test against ADR 0003
- Phase 2 caching and Phase 5 jti blacklist consume ADR 0001's `valkey/valkey:8` decision unchanged
- `docs/adr/**` is T3 — plan 01-09 CODEOWNERS/tiers coverage applies (T-01-24 mitigation)

## Self-Check: PASSED

- All 3 created files exist on disk (verified via combined node assertion: key-presence + acceptance tokens + zero `.planning/` links)
- Commits `186934f` and `576e25c` exist in git log
- Plan `<verify>` blocks for both tasks returned OK; overall verification returned `OK all 3 ADRs`

---
*Phase: 01-dogfood-bootstrap-enforcement*
*Completed: 2026-06-11*
