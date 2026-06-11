# Spec 006: ADR Foundation (constitution decision records)

## User Story

As an agent or human about to touch caching, the permission catalog, or the
permission gate in later phases, I can read a committed decision record with
inline rationale and evidence — so locked decisions live in the constitution, not
in chat history (AI-COWORK §1).

## Scope

This unit covers `docs/adr/0001..0003`:

- `docs/adr/0001-valkey-not-redis.md` — Valkey 8 (BSD-3) over Redis 8
  (tri-licensed incl. AGPLv3): wire-compatible drop-in, Lettuce unchanged, clean
  fit with the Apache-2.0/MIT-compatible component constraint (D-17). Consumed by
  the Phase 2 caching work and the Phase 5 jti blacklist.
- `docs/adr/0002-permission-catalog-sync.md` — FR-B11: the permission catalog
  code↔DB sync mechanism, with deprecated-before-delete. Phase 3 AUTHZ work
  implements against it.
- `docs/adr/0003-undeclared-permission-detection.md` — FR-B13/GATE-11: the
  undeclared-permission detection mechanism (ArchUnit-based). Phase 3 wires the
  gate against it.

## Acceptance Criteria

1. Each ADR records context, decision, status, and consequences with spike/research
   evidence summarized INLINE — zero links into meta directories (D-07;
   templating-safe; enforced by meta-link-lint from unit 005).
2. ADR 0001 names the license rationale (BSD-3 vs tri-license) in one decisive
   statement.
3. ADRs 0002/0003 lock mechanisms firmly enough that Phase 3 can implement without
   re-deciding.

## Requirements

- **AGENT-09** — Dogfood from start: this preset repo itself is built via S→P→I→V
  with hooks active; commit history is the evidence (PRD §13.1, DoD). ADRs are
  constitution documents; creating or changing them is always T3 (AI-COWORK §2
  constitution change rule), so this unit exists to put their approval on record.
- Downstream PRD requirements referenced: FR-B11 (permission sync), FR-B13
  (undeclared-permission detection), FR-A02 cache component licensing (D-17).
