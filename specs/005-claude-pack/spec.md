# Spec 005: Claude Code Pack (CLAUDE.md layers, skills, checks)

## User Story

As an AI agent (and the humans steering it) working in a project generated from
this preset, I get a three-layer constitution (root + backend + frontend CLAUDE.md)
within hard size budgets, five skills covering the S→P→I→V workflow, and CI checks
that keep all of it honest — so agent behavior is grounded in committed,
machine-verified instructions.

## Scope

This unit covers:

- `templates/claude/**` — root CLAUDE.md template source with placeholders (D-13:
  the preset root CLAUDE.md is only generated at preset initialization, never
  maintained as a static file) + explicit smoke-command manifest
- `backend/CLAUDE.md`, `frontend/CLAUDE.md` — in-place constitutions with literal
  `com.acme.app` values (D-15), ≤150 lines each
- `.claude/skills/**` — `plan` + `verify` fully implemented; `new-module`,
  `new-feature`, `design-implement` as skeleton contracts (D-21)
- `scripts/checks/render-claude-md.mjs`, `claude-md-check.mjs`,
  `settings-lint.mjs`, `skills-lint.mjs`, `meta-link-lint.mjs`
- `.github/workflows/claude-md-check.yml` — GATE-12 CI wiring (render-then-check,
  D-14)

## Acceptance Criteria

1. The preset root CLAUDE.md exists ONLY as a template source with placeholders;
   CI renders it with sample values and asserts ≤200 lines (D-13/D-14).
2. `backend/CLAUDE.md` and `frontend/CLAUDE.md` live in place with literal
   `com.acme.app` values, each ≤150 lines (D-15).
3. Command smoke runs every command declared in the explicit manifest per OS leg
   and fails on zero declared commands — silent extraction failure turns the gate
   red, never vacuous green (GATE-12).
4. Five skills exist with valid frontmatter; `plan` emits `specs/NNN-slug/plan.md`
   in AI-COWORK §3.2 format with tier declaration and computes the next NNN;
   `verify` is a thin wrapper over `task verify` summarizing failures by violated
   rule; the other three declare inputs/outputs/tier and defer implementation
   (D-21).
5. settings-lint proves the T1 allowlist exists and `permissions.deny` stays in
   lockstep with the tiers T4 patterns; meta-link-lint fails on any meta-directory
   reference inside shipped dirs (D-06).

## Requirements

- **AGENT-01** — Three-layer CLAUDE.md (root + backend/ + frontend/, lazy-loaded,
  no duplication) within size budgets (FR-E01)
- **AGENT-02** — Five skills shipped: `new-module`, `new-feature`,
  `design-implement`, `plan`, `verify` (FR-E02)
- **GATE-12** — CLAUDE.md checks: size budgets (root ≤200, tree ≤150 lines) +
  smoke test that documented commands run (FR-D12)
