# AI-Cowork Methodology Specification

**Status:** Draft 1.1 — 2026-06-10
**Audience:** Humans on the team AND AI coding agents. Ships inside every generated scaffold; referenced from root `CLAUDE.md`.
**Reference implementation:** Claude Code (v1). The methodology itself is runtime-agnostic; §5 enforcement layer 2 (CI) holds for any runtime.
**Changes in 1.1:** added §4 spec artifacts, §5 enforcement matrix (H2-T3 = hard, two layers), failure-mode mitigations.

---

## 1. Principle

> AI agents implement. Humans decide. Deterministic gates enforce.

1. **Agents follow patterns they can read.** Locked decisions live in committed, discoverable documents (the *constitution*), not in heads or chat history.
2. **Prompts are not a security or quality boundary.** Every rule that matters is enforced by a deterministic gate (compiler, ArchUnit, ESLint, hooks, CI). A rule that exists only in prose will eventually be violated.
3. **Human attention is the scarce resource.** Checkpoints sit where human judgment adds value (intent, scope, risk); machines verify the rest (style, boundaries, coverage).

## 2. The Constitution

Minimal document set an agent MUST read before writing code:

| Document | Contains | Agent obligation |
|----------|----------|------------------|
| `CLAUDE.md` (root) | Project map, commands, conventions, pointers | Loaded every session |
| `backend/CLAUDE.md`, `frontend/CLAUDE.md` | Stack-local rules (lazy-loaded when working in that tree) | Read before edits in that tree |
| `docs/ARCHITECTURE.md` | Locked architecture (module DAG, boundary rules, anti-stack) | Read before structural changes |
| `docs/adr/` | Decision records with rationale | Read relevant ADR before touching its area; new ADR before deviating |
| This file | Workflow, checkpoints, tiers, enforcement | Follow the workflow |
| `frontend/docs/DESIGN.md` + `tokens.json` | Design system source of truth | Tokens only; never raw values |

**Constitution change rule:** agents may PROPOSE constitution changes (PR + ADR), always Tier-3 — human approval before merge.

## 3. Workflow: Specify → Plan → Implement → Verify

Applies to non-trivial work: touches >1 file, or any file in a Tier-3 area (§6).

```
SPECIFY ──► PLAN ──► IMPLEMENT ──► VERIFY ──► merge
   │           │                        │
  H1          H2                       H3
(intent)   (approach)             (diff review)
```

### 3.1 Specify — human-led
Human states WHAT and WHY: user story, acceptance criteria, requirement IDs. Agent may draft; human owns. Output: `specs/NNN-feature/spec.md` (§4).
**H1 (intent):** human confirms spec before planning. Soft gate — artifact review.

### 3.2 Plan — agent-led, human-approved
Agent writes `specs/NNN-feature/plan.md`: files to touch, modules affected, events/SPI surfaces, migrations, tests, **tier declaration**, constitution rules that apply.
**H2 (approach):** required for T3+ (HARD — see §5); recommended for T2 (soft). T1 skips.

### 3.3 Implement — agent-led
- Conventional Commits, small commits, branch named after spec dir (`feat/NNN-feature`).
- Tests are part of implementation; done = green gates.
- Reality contradicts plan → STOP and report; never improvise around a locked decision.
- Never weaken a gate to get green (no skipped tests, no lint-disables, no loosened rules). Gate changes = T3.

### 3.4 Verify — machine-led, human-sealed
All gates run (§7).
**H3 (diff review):** one human reviews diff against spec intent (scope, security, intent-match). Mechanics are the gates' job. Enforced hard at merge by branch protection.

## 4. Spec Artifacts

Converged industry format (spec-kit, Kiro):

```
specs/
└── NNN-short-name/          # NNN = zero-padded sequence
    ├── spec.md              # WHAT/WHY: story, acceptance criteria, REQ-IDs
    ├── plan.md              # HOW: files, modules, events, migrations, tests,
    │                        #   tier: T1|T2|T3, Approved-by: <human> <date>
    └── tasks.md             # optional: ordered task breakdown for large features
```

- Branch name contains `NNN-short-name` → traceability spec → commits → PR.
- Commits reference REQ-IDs: `feat(security): pin JWS algs (refs SEC-04)`.
- T1 work needs no spec dir (avoid over-process — see §8).
- Spec rot rule: the spec author (human) owns reconciliation; a merged PR whose behavior diverges from spec.md updates spec.md in the same PR.

## 5. Checkpoint Enforcement — two layers

Decision (2026-06-10): **H2 for T3 is HARD-enforced.** Two layers, defense in depth:

**Layer 1 — in-session (Claude Code):**
- T3 work requires plan mode; `ExitPlanMode` = the H2 approval UX.
- `PreToolUse` hook denies Write/Edit on T3 paths when `specs/NNN-*/plan.md` with `Approved-by:` marker is absent for the current branch. Hook `permissionDecision: deny` holds even under `--dangerously-skip-permissions`.
- T4 command patterns (deploy, secret ops, destructive git/db) → `PreToolUse` deny + human executes.

**Layer 2 — at-merge (CI, runtime-agnostic floor):**
- Required status check: diff touches T3 paths (new module dir, `pom.xml`/`package.json` dependency change, `security/**`, `tenancy/**`, `.github/**`, gate configs, `CLAUDE.md`/constitution files) → `specs/NNN-*/plan.md` must exist on the branch with `Approved-by:` line. Missing → merge blocked.
- Branch protection: H3 human review required on all PRs; CODEOWNERS adds second reviewer for `security/**`, `tenancy/**`.

| Checkpoint | T1 | T2 | T3 | T4 |
|------------|----|----|----|----|
| H1 spec | skip | soft (spec.md) | soft (spec.md) | soft |
| H2 plan | skip | soft (plan.md review) | **HARD** (L1 hook + L2 CI) | n/a — see exec row |
| H3 review | branch protection | branch protection | + CODEOWNERS 2nd reviewer | — |
| Execution | autonomous | autonomous | after H2 | **PreToolUse deny; human executes** |

## 6. Risk Tiers

| Tier | Examples | Agent may | Human involvement |
|------|----------|-----------|-------------------|
| **T1 — routine** | Planned code, tests, lint fixes, i18n keys, intra-module refactor | Act autonomously | H3 only |
| **T2 — structural** | New endpoint, new event type, new migration, new shared component | Act with plan.md | H2 soft; H3 |
| **T3 — boundary** | New module, new dependency, ADR/gate/CI change, security config, auth, tenancy | Propose; implement only after approved plan | **H2 HARD**; H3 + 2nd reviewer for security |
| **T4 — irreversible/external** | Deploy, secret rotation, real-data deletion, publishing, force-push | Never autonomous | Human executes |

Strictness modes (scaffold-time choice): **standard** = table above; **strict** = H2 hard from T2 up, two-human H3 for T3.

## 7. Guardrail Catalog

CI-blocking, locally runnable, failure messages name the violated rule (agents self-correct).

| Gate | Tool | Enforces |
|------|------|----------|
| Module DAG verify | `ApplicationModules.verify()` in `mvn verify` | Acyclic graph; declared deps only; events/`::spi` access |
| Architecture rules | ArchUnit | No field injection, no bare `@Scheduled`, no native query outside wrapper, entities never cross controller boundary |
| Frontend zones | ESLint `import/no-restricted-paths` | `shared → features → app`; no cross-feature imports |
| React correctness | `eslint-plugin-react-compiler` (error) | Compiler-safe React |
| Design tokens | Stitch lint | No raw hex/px; tokens↔Tailwind sync |
| Accessibility | `@axe-core/playwright` | WCAG 2.2 AA |
| i18n parity | key-diff | Every key in all locales |
| Contract drift | `mvn package → codegen → tsc` | FE client matches OpenAPI |
| Secrets | bundle + image scan | No keys in artifacts |
| Tenancy | cross-tenant test | No cross-tenant access |
| Plan compliance | T3-path CI check (§5 L2) | No T3 merge without approved plan |

**Agent contract:** gate fails → fix the CODE, not the gate. Gate blocking legitimate work = constitution bug → T3 proposal, never bypass.

## 8. Failure Modes & Mitigations

| Failure mode | Mitigation (built in) |
|--------------|----------------------|
| Approval fatigue | Tiering: T1 has zero ceremony; hard gates only at T3/T4. Strict mode is opt-in |
| Over-process for small changes | T1 path = no spec, no plan, straight to H3 |
| Spec rot | Same-PR reconciliation rule (§4); spec author owns |
| Agent bypasses plan stage | Mechanical: L1 hook deny + L2 CI check — docs alone don't enforce |
| Gate erosion | Gate changes are T3 + constitution-file CI trigger |

## 9. Agent Conduct Rules

1. Read root `CLAUDE.md` before first edit each session; read tree-local `CLAUDE.md` before edits in that tree.
2. Cite sources: plans reference ADR/REQ-IDs; commits reference REQ-IDs.
3. One unit of work per PR; no drive-by refactors.
4. Report failures faithfully — failing tests reported with output, never silenced.
5. Uncertain between two readings of a locked decision → ask, don't pick silently.
6. Generated artifacts (codegen output, module canvases) never hand-edited.
7. Secrets never in code, committed config, prompts, or logs.

## 10. Human Conduct Rules

1. Specs state acceptance criteria — agents cannot verify "make it nice".
2. H3 reviews intent; gates review mechanics. Repeatedly catching mechanical issues at H3 → add a gate.
3. H2 approvals feel rubber-stamp → loosen to standard mode, don't approve blind.
4. Merged code is the team's code, regardless of author.

## 11. Scaffold Bootstrap Obligations

- [ ] `CLAUDE.md` root + `backend/CLAUDE.md` + `frontend/CLAUDE.md` (see CLAUDE-CODE-RUNTIME.md)
- [ ] Guardrail catalog (§7) wired into CI + local commands
- [ ] `.claude/settings.json` hooks: T3 plan-gate deny, T4 pattern deny
- [ ] `specs/` directory with `000-example/` worked through the full S→P→I→V loop in commit history
- [ ] PR template with H3 checklist (spec link, tier declaration, UI manual checks)
- [ ] CI plan-compliance check (L2) + branch protection + CODEOWNERS config
- [ ] This document at `docs/methodology/AI-COWORK.md` in the generated repo

---
*Draft 1.1 — 2026-06-10. Sources: spec-kit/Kiro mechanics, Claude Code hooks docs, nested-instruction research — `.planning/notes/instruction-file-research.md`.*
