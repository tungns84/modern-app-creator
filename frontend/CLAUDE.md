# Frontend — React 19 + TypeScript (`frontend/`)

Rules for working in `frontend/`. The root `CLAUDE.md` owns commands, risk
tiers and the anti-stack list — none of that is repeated here.

## Zone rules (lint-enforced)

Import direction is one-way: `shared → features → app`.

- `src/shared/` may import only from `src/shared/`
- `src/features/<name>/` may import from `src/shared/` and from itself —
  **never from another feature** (cross-feature imports fail the zone lint)
- `src/app/` (routing, providers, layout shell) may import from anywhere
- Need the same code in two features? Move it to `src/shared/` — do not
  deep-import across features.

## Styling — tokens only

- Style with Tailwind classes backed by design tokens (`@theme`). No raw hex
  colors and no raw px values in components — the token drift gate scans for
  them.
- The component base is shadcn/ui, vendored as plain code — extend the
  vendored components; never add a second component kit.

## i18n

- Every user-facing string goes through i18next — no hardcoded display text.
- Every key must exist in **both** `vi` and `en` resource files or the i18n
  parity gate fails the build. Add both translations in the same change.

## Accessibility (WCAG 2.2 AA — gated)

- Every icon-only button gets an `aria-label`.
- Interactive elements must be keyboard-reachable; every form input gets a
  label.
- The axe gate (`@axe-core/playwright`) runs WCAG 2.2 AA checks in E2E — fix
  violations, never suppress them.

## Generated code

- **Never edit `src/generated/`** — it is produced from the backend OpenAPI
  contract (`npm run codegen`). Fix the backend contract or the generator
  config instead; manual edits are overwritten and fail the contract drift
  gate.

## State

- Server state: TanStack Query (generated hooks). UI state: Zustand. URL
  state (filters/pagination): nuqs.
- Auth tokens never live in Zustand stores or localStorage-backed state.

Never put backend content here; never duplicate root `CLAUDE.md`.
