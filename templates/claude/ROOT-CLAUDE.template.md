# {{projectName}}

{{projectName}} is a full-stack web application generated from the
`react-springboot-modulith` preset: a Spring Boot 4 / Spring Modulith backend
(base package `{{groupId}}.{{artifactId}}`), a React 19 + TypeScript frontend,
and a Docker-Compose local stack — pre-wired for the AI-cowork +
human-in-the-loop methodology with Claude Code. Architecture rules are
machine-enforced: CI gates block module-boundary violations and unapproved
high-risk (T3) changes; quality never depends on prompting alone.

## Canonical commands

Run everything through `task` (go-task v3.51.1, pinned — `scripts/init`
verifies the version). Commands marked **[not yet available]** arrive in a
later phase; do NOT run or smoke-test them until they exist.

| Command | What it does |
|---------|--------------|
| `task up` | Boot the full local stack and wait for all healthchecks |
| `task down` | Tear the local stack down |
| `task ps` / `task logs` | Stack service status / follow logs |
| `task verify` | Run the full local gate suite (same gates CI runs) |
| `./mvnw verify` | Backend build + backend gates **[not yet available — arrives Phase 2]** |
| `npm run dev` | Frontend dev server **[not yet available — arrives Phase 4]** |
| `npm run build` | Frontend production build **[not yet available — arrives Phase 4]** |
| `npm run codegen` | Regenerate typed API client from OpenAPI **[not yet available — arrives Phase 4]** |

## Workspace map

| Path | Contents |
|------|----------|
| `backend/` | Spring Boot 4 Modulith backend (`{{groupId}}.{{artifactId}}`) — see `backend/CLAUDE.md` |
| `frontend/` | React 19 + TypeScript frontend — see `frontend/CLAUDE.md` |
| `infra/` | Local stack (`infra/compose.yaml`) and deployment overlays |
| `docs/` | Methodology, architecture, ADRs (`docs/adr/`) |
| `specs/` | Spec units (`specs/NNN-slug/spec.md` + `plan.md`) — the artifacts gates read |
| `scripts/` | Init + gate-check scripts (zero-dependency Node) |
| `.claude/` | Claude Code pack: settings, hooks, skills |
| `.cowork/` | Enforcement config: `tiers.json` (risk-tier paths), `waivers.json` |

## Risk tiers

Every change carries a risk tier. Tier path patterns live in
`.cowork/tiers.json` — the single source both the Claude Code hooks (L1) and
the CI gates (L2) read.

| Tier | Examples | Agent may | Human involvement |
|------|----------|-----------|-------------------|
| **T1 — routine** | Planned code, tests, lint fixes, i18n keys, intra-module refactor | Act autonomously | H3 review only |
| **T2 — structural** | New endpoint, new event type, new migration, new shared component | Act with a plan.md | H2 soft; H3 |
| **T3 — boundary** | New module, new dependency, ADR/gate/CI change, security, tenancy, CLAUDE.md edits | Propose; implement only after an approved `specs/NNN-*/plan.md` | **H2 HARD**; H3 |
| **T4 — irreversible/external** | Deploy, secret rotation, real-data deletion, force-push | Never autonomous | Human executes |

## Pointers

- `docs/methodology/AI-COWORK.md` — Specify→Plan→Implement→Verify workflow,
  checkpoints H1–H3, full tier definitions, guardrail catalog
- `docs/ARCHITECTURE.md` — system architecture **[not yet available — arrives Phase 2]**
- `docs/adr/` — Architecture Decision Records (read before re-deciding
  anything already decided there)

## Do not

- **No GraphQL** — REST + OpenAPI only; the typed client is generated
- **No SSR / Next.js** — React Router library mode only
- **No H2** — PostgreSQL everywhere, tests included (Testcontainers)
- **No Redux** — TanStack Query for server state, Zustand for UI state
- **No MUI or other component kits** — shadcn/ui + Tailwind tokens only
- **No message broker in v1** — Spring Modulith events + event publication
  registry handle cross-module communication
- Do not edit generated code, gate configs, or CI workflows without an
  approved T3 plan (`specs/NNN-*/plan.md`)
