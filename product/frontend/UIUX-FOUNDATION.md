# UI/UX Foundation Specification

**Status:** Draft 1.0 — 2026-06-10
**Audience:** Developers and AI agents building frontend in generated scaffolds. Ships inside the scaffold; `frontend/CLAUDE.md` points here.
**Scope:** App shell, admin patterns, IAM screens, form/async/i18n/a11y conventions, design-token pipeline, component inventory. Visual design decisions (colors, type, spacing values) live in `DESIGN.md` + `tokens.json` — this spec defines structure and behavior.

---

## 1. Principles

1. **Plain components over meta-frameworks.** Build on shadcn/ui primitives; no Refine/react-admin. Reason: scaffolds are extended by AI agents — auditable, typed, plain React code beats framework abstractions that fight custom UIs (permission matrix, BPM modeler) and constrain agents to framework idioms.
2. **State lives in the URL for anything shareable.** Filters, pagination, sort, active tab → URL params (nuqs). A filtered user list must be bookmarkable and pasteable into chat.
3. **Permission-aware UI:** HIDE actions the user can never perform (permission-based denial); DISABLE with inline explanation for temporary states (not tooltips on disabled controls — they don't work on touch/keyboard). Backend remains the enforcement layer.
4. **Reversible beats confirmed.** Prefer soft-delete + undo toast over confirmation dialogs. Reserve confirmation for irreversible actions; type-to-confirm (typed resource name) for destructive deletes.
5. **Every convention here is gate-backed where possible** (axe, i18n key-diff, token lint, ESLint zones) — this document explains the why; the gates enforce the what.

## 2. App Shell

| Element | Standard |
|---------|----------|
| Sidebar | shadcn `Sidebar` component: collapsible (icon + offcanvas), nested groups, mobile sheet fallback, state persisted (cookie). Do not hand-roll |
| Topbar | Breadcrumbs (shadcn `Breadcrumb`), locale switcher, user menu. Tenant switcher slot reserved (hidden in single-tenant mode) |
| Command palette | cmdk via shadcn `Command`, `Ctrl/Cmd+K`: navigation, entity search (users, roles, processes), actions. Baseline expectation, not a nice-to-have |
| Admin landing | Task-oriented: pending BPM tasks (when BPM on), recent audit events, user/role counts. No vanity charts |
| Route layout | `app/routes/` per React Router 7 library mode; route-level `lazy` code splitting; Suspense fallbacks are layout-shaped skeletons |

## 3. Data Tables

- **Stack:** TanStack Table v8 (headless) + shadcn table primitives. Server-side `manualPagination/manualSorting/manualFiltering` — state up, fetch per state.
- **URL state:** nuqs parsers sync pagination/sort/filters to query string.
- **Standard features:** column visibility menu, faceted filters, row selection checkbox column + floating bulk-actions bar, empty states distinguishing "no data yet" (CTA) from "no results for filter" (clear-filters action).
- **A11y:** `aria-sort` on sortable headers; selection-count announcements via live region; interactive targets ≥ 24×24px (WCAG 2.2 — applies to row checkboxes and icon buttons).
- Reference implementation pattern: openstatus data-table-filters.

## 4. IAM Screens

### 4.1 Auth flows
- Login: generic error ("email or password incorrect"), identical timing for nonexistent accounts; visible rate-limit cooldown ("try again in N minutes").
- TOTP enrollment: QR + "can't scan?" manual key → verify one code BEFORE activation → backup codes with forced acknowledgment (download/copy + checkbox).
- Passkey (when enabled): prompt at account-management moments (signup completion, post-recovery, security settings) — never interrupt sign-in.
- Reset password: neutral "if an account exists..." response; on success revoke other sessions.
- Invite acceptance: link → read-only pre-filled email + inviter/org shown → set password → land in context.
- Sessions screen (Google/GitHub pattern): row per session — device icon, browser+OS, approx location, last active, "current" badge, per-row revoke + "sign out all others".

### 4.2 User management
- List filters that matter: status, role, last-login; search by name/email. Status = colored badges per lifecycle state.
- Detail tabs: Overview | Profile | Roles & Permissions | Security (sessions, MFA) | Activity | Danger Zone.
- Sensitive actions (assign admin role, reset MFA, delete) → confirmation + step-up auth hook + audit (per IAM design doc).

### 4.3 Permission matrix (the hard screen)
- Role × permission grid: rows grouped by module (collapsible), sticky header, search, "only granted" filter, select-all per group with count indicators.
- Risk-level highlighting on dangerous permissions; dependency hints ("write requires read").
- **Diff-before-save:** changes summarized before commit.
- System roles locked with explanation, not editable.
- **Effective permissions viewer** on user detail: "does user X have permission Y — and via which role" (provenance; Keycloak 26.2 Evaluate-tab pattern).
- Scope shown as badge next to each grant (own/team/department/tenant/all).

### 4.4 Audit log
- Newest-first timeline: actor, verb, target, timestamp; filters: actor, module, action type, time range.
- Inline display of 1–3 changed fields; drawer for full before/after diff; export (CSV/JSON) of the filtered view.

## 5. Forms

- Schema-first: one Zod schema per form (`z.infer` types, `zodResolver`). **Zod v4.1+** required (earlier v4 breaks `formState.errors`).
- shadcn `Form` composition (`FormField → FormItem → FormLabel/FormControl/FormMessage`) — auto-wires `aria-describedby`/`aria-invalid`.
- Server validation errors map into fields via `setError(field, {type:'server'})`; non-field errors on `root`.
- Explicit Save + dirty-state navigation guard (`useBlocker` + `beforeunload`). Autosave only for drafts, with visible "Saved" indicator.
- On submit error: focus first invalid field; assertive live-region summary for screen readers.

## 6. Async & Feedback

- Initial loads: layout-shaped skeletons. Refetches: keep stale data visible + subtle `isFetching` indicator — never unmount content to show a spinner.
- Optimistic updates for low-risk admin toggles: `onMutate` snapshot → rollback `onError` + error toast → `invalidateQueries` `onSettled`.
- Errors: inline for validation; route-level error boundary + retry (`QueryErrorResetBoundary`) for query failures; toast (sonner) for mutation/transport errors.
- Undo-toast (action button) over confirm dialog for reversible actions.
- Prefetch on intent: `prefetchQuery` on link hover/focus.
- Timestamps: relative (`Intl.RelativeTimeFormat`) with absolute on hover/title.

## 7. i18n (vi default, en fallback)

- All formatting via `Intl.*` with active locale — never hand-format dates/numbers.
- Vietnamese has no plural forms; English does — ICU/i18next plural keys mandatory, no string concatenation.
- Locale switch: visible control in topbar; persists; updates `<html lang>`; announces via live region.
- Layouts tolerate ~30% text expansion; no fixed-width buttons. Pseudo-localization run in dev to catch truncation and hardcoded strings.

## 8. Accessibility (WCAG 2.2 AA — gate-enforced by axe)

- Route change: move focus to main heading + announce.
- Dialog/sheet close: focus returns to trigger (Radix default — don't break it).
- WCAG 2.2 criteria with admin-UI impact: **2.5.8 Target Size 24×24** (table checkboxes, icon buttons), 2.5.7 Dragging alternatives (BPM modeler needs keyboard/menu equivalents for drag operations), 2.4.11 Focus Not Obscured (sticky headers/floating bars must not cover focused elements).
- Keyboard: command palette as shortcut hub; "?" shows shortcut cheatsheet; every bulk action reachable without pointer.

## 9. Design Tokens Pipeline

- `tokens.json` = W3C DTCG (stable v2025.10): primitive → semantic → component layers via aliases; components consume the semantic tier only.
- Build: Terrazzo with Tailwind v4 plugin → generates `@theme` CSS variables (OKLCH). Replaces hand-written sync scripts. [Verify in frontend phase — open question in PRD]
- shadcn Tailwind v4 mode: theme via `@theme` + CSS vars, `.dark` class redefines variables; no `tailwind.config.js`.
- Scaffold ships its own shadcn registry (`registry.json`) so teams/agents add components via `npx shadcn add @scaffold/x`.
- White-label: one tokens file per brand → per-brand CSS emit.
- RTL future-proofing at zero cost: Tailwind logical utilities (`ps-*/pe-*/ms-*/me-*`) from day one.
- Stitch lint (token drift, raw values) remains the gate.

## 10. Component Inventory

| Need | Source |
|------|--------|
| Table, Dialog, Sheet, Command, Form, Combobox, Date picker, Badge, Tabs, Breadcrumb, Sidebar, Dropdown, Toast (sonner), Skeleton | shadcn/ui stock |
| Data table w/ server state + URL sync | Compose: TanStack Table + shadcn + nuqs |
| **Permission matrix grid** | Custom build (Table + Checkbox composition) |
| **Transfer/dual-list** (role/group assignment) | Custom build |
| **Before/after diff viewer** (audit) | Custom build over a diff lib — evaluate `react-diff-viewer-continued` vs custom render |
| BPMN/DMN/form editors | bpmn.io toolkit (see PRD BPM pack) |
| A11y primitives (SkipLink, VisuallyHidden, FocusTrap, IconButton w/ required aria-label) | Custom, in `shared/components/a11y` |

---
*Draft 1.0 — 2026-06-10. Research: 4 passes 2026-06-10 (admin shell, design system, IAM UX, quality patterns) — sources in `.planning/` research notes; key references: shadcn docs (sidebar, registry, Tailwind v4), DTCG v2025.10, Terrazzo, FIDO UX guidelines, Keycloak 26.2 FGAP, openstatus data-table, WCAG 2.2.*
