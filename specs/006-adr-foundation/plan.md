# Plan 006: ADR Foundation

tier: T3

## Why T3

ADRs are part of the constitution; the constitution change rule (AI-COWORK §2)
makes every ADR addition or change Tier-3 — human approval before merge, no
exceptions.

## Files to touch

- `docs/adr/0001-valkey-not-redis.md` — short decision record: Valkey 8 BSD-3 vs
  Redis 8 tri-license (incl. AGPLv3); wire-compatible, Lettuce client unchanged;
  compose image `valkey/valkey:8`
- `docs/adr/0002-permission-catalog-sync.md` — FR-B11 mechanism: code-declared
  permission catalog synced to DB at startup, deprecated-before-delete lifecycle;
  Status/Context/Decision/Consequences format
- `docs/adr/0003-undeclared-permission-detection.md` — FR-B13 mechanism:
  ArchUnit-based detection that every permission referenced in code is declared in
  the catalog; gate wiring lands in Phase 3

## Modules affected

n/a — pre-backend; ADRs 0002/0003 bind future security/authz modules.

## Events / SPI surfaces

n/a.

## Migrations

n/a.

## Tests

- meta-link-lint (unit 005) verifies zero meta-directory links inside `docs/`
- ADR format consistency checked at review (H3) — no dedicated script in Phase 1.

## Constitution rules that apply

- AI-COWORK §2: agents may PROPOSE constitution changes (PR + ADR), always T3
- D-07: spike evidence summarized inline, never linked to meta directories
  (links would die at templating).

## Approval

Approved-by: tungns84 2026-06-11 (H2 approval granted via GSD Phase-1 plan review; solo self-approval waived per .cowork/waivers.json W-001)

Per D-02 this line is audit trail, NOT authorization proof. Authorization is the
PR review API plus repository ruleset; a forged `Approved-by:` line never
constitutes approval.

Branch for this unit: `feat/006-adr-foundation`.
