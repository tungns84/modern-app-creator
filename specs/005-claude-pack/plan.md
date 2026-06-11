# Plan 005: Claude Code Pack

tier: T3

## Why T3

CLAUDE.md files are constitution files; skills and check scripts are gate
configuration; the workflow lives under `.github/**` — all on the AI-COWORK §5 L2
T3 list.

## Files to touch

- `templates/claude/ROOT-CLAUDE.template.md` — root constitution source:
  project description, canonical commands (`task up`, `./mvnw verify`,
  `npm run dev/build/codegen`), workspace map, compact risk-tier table, pointers
  (AI-COWORK.md, ARCHITECTURE.md, ADR index), anti-stack "Do not" list. Rendered
  ≤200 lines. Never: stack tutorials, tree-file duplication.
- `templates/claude/smoke-commands.json` — explicit smoke-able command declaration
  (no prose-regex extraction)
- `backend/CLAUDE.md` (≤150 lines, literal `com.acme.app`) — module DAG summary,
  events-for-writes / `::spi`-for-reads, test conventions, Flyway per-module
  layout, ArchUnit expectations, agent-hallucination warnings (Testcontainers 1.x
  idioms, Jackson 2 imports)
- `frontend/CLAUDE.md` (≤150 lines) — zone rules `shared → features → app`,
  tokens-only styling, i18n key workflow, a11y requirements, never edit
  `src/generated/`
- `.claude/skills/{plan,verify,new-module,new-feature,design-implement}/SKILL.md`
- `scripts/checks/render-claude-md.mjs` — ~20-line zero-dep token replace; fails
  on orphan placeholders after render
- `scripts/checks/claude-md-check.mjs` — size budgets + command smoke; CRLF
  normalized before line counting
- `scripts/checks/settings-lint.mjs`, `scripts/checks/skills-lint.mjs`,
  `scripts/checks/meta-link-lint.mjs`
- `.github/workflows/claude-md-check.yml` — render-then-check on CI (D-14);
  Docker-needing smoke restricted to the ubuntu leg

## Modules affected

n/a — pre-backend; constitutions describe the module rules modules will obey.

## Events / SPI surfaces

n/a.

## Migrations

n/a.

## Tests

- `node --test scripts/checks/tests/` — renderer (placeholder coverage, orphan
  detection), size-budget edges, smoke-manifest zero-command failure, settings
  lockstep, meta-link detection
- CI claude-md-check workflow run green before it becomes a required check.

## Constitution rules that apply

- Size budgets are hard gates (GATE-12), not guidance
- Single tier source: settings deny rules verified against tiers data (D-22)
- Meta/preset separation (D-06): shipped files never reference meta directories.

## Approval

Approved-by: tungns84 2026-06-11 (H2 approval granted via GSD Phase-1 plan review; solo self-approval waived per .cowork/waivers.json W-001)

Per D-02 this line is audit trail, NOT authorization proof. Authorization is the
PR review API plus repository ruleset; a forged `Approved-by:` line never
constitutes approval.

Branch for this unit: `feat/005-claude-pack`.
