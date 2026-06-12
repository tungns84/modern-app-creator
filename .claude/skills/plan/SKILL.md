---
name: plan
description: Draft the bound spec plan (specs/NNN-slug/plan.md) for structural or T3 work — use when asked to plan a change, write a spec, add a module or dependency, touch security/tenancy/gate config, or when a T3 write was denied for a missing approved plan.
---

# plan — emit `specs/NNN-slug/plan.md` (H2 input)

This skill produces the artifact the human approves at checkpoint H2
(AI-COWORK §3.2). It never approves anything itself.

## Step 1 — Interrogate the change intent

Before writing anything, establish with the human (ask if unclear):

- WHAT is changing and WHY (one paragraph; cite REQ-IDs / ADRs if they exist).
- Which areas are affected: backend modules, frontend zones, infra, CI, docs.
- Whether any touched path is on the T3 list (`.cowork/tiers.json` → `t3.paths`).

## Step 2 — Compute the next NNN

Scan the existing spec dirs and take the next free number:

- List directories matching `specs/[0-9][0-9][0-9]-*`.
- `000` is reserved (worked example, Phase 8) — never allocate it.
- Next NNN = highest existing number + 1, zero-padded to 3 digits.
- Pick a short kebab-case slug; the unit lives at `specs/NNN-slug/`.

## Step 3 — Write `specs/NNN-slug/plan.md` (AI-COWORK §3.2 format)

The plan MUST contain every field below. Skeleton to fill:

```markdown
# Plan NNN: <title>

tier: T1|T2|T3

## Why this tier
<classification against the rubric below>

## Files to touch
<every file, one line each, with what changes>

## Modules affected
<Modulith modules, or n/a>

## Events / SPI surfaces
<new/changed events and ::spi surfaces, or n/a>

## Migrations
<Flyway scripts per module, or n/a>

## Tests
<test files/suites that prove the change>

## Constitution rules that apply
<rules from CLAUDE.md / ARCHITECTURE.md / ADRs this change must obey>

## Approval

Approved-by:
```

**The `Approved-by:` line stays EMPTY.** Filling it is the human's H2 act —
this skill, and any agent, must never write a name there. A forged line is
not authorization (the PR review API is); it is also a methodology violation.

## Tier rubric (AI-COWORK §6 — classify with this table)

| Tier | Examples | Consequence |
|------|----------|-------------|
| T1 — routine | planned code, tests, lint fixes, i18n keys, intra-module refactor | no spec dir needed; skip this skill |
| T2 — structural | new endpoint, new event type, new migration, new shared component | plan.md recommended (soft H2) |
| T3 — boundary | new module, new dependency, ADR/gate/CI change, security, auth, tenancy, constitution files | plan.md REQUIRED with Approved-by before any implementation write |

When torn between two tiers, declare the higher one.

## Step 4 — Branch binding

Create/rename the work branch to `feat/NNN-slug`. The branch name is the spec
binding BOTH gates enforce: the L1 PreToolUse hook and the L2 plan-compliance
CI check resolve `specs/NNN-*/plan.md` from the current branch name —
unrelated approved specs never satisfy them.

## Remember

- T3 implementation writes are hook-blocked until the human fills
  `Approved-by:` on the bound plan. Do not work around the deny; hand the
  plan to the human and wait.
- One spec unit per branch/PR; no drive-by scope.
- Commits reference REQ-IDs (e.g. `feat(security): pin JWS algs (refs SEC-04)`).
