# Phase 1: Dogfood Bootstrap & Enforcement - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-11
**Phase:** 1-Dogfood Bootstrap & Enforcement
**Areas discussed:** Git hosting & CI target (Q-002), Bootstrap paradox, Layout repo monorepo, Spike failure policy & local stack, Spike sequencing, Five skills depth, T3 path inventory, Init script scope

---

## Git hosting & CI target (Q-002)

| Option | Description | Selected |
|--------|-------------|----------|
| GitHub.com | Full Actions + branch protection + PR review API | ✓ |
| GitLab self-hosted | Approval rules API, self-built runners | |
| GitHub Enterprise | API near GitHub.com, version drift risk | |
| Undecided — Q-002 surveys | Widen spike scope to survey hosting first | |

**User's choice:** GitHub.com

| Option | Description | Selected |
|--------|-------------|----------|
| PR review API source of truth | CI checks PR approval from non-author CODEOWNER; Approved-by line = audit trail only | ✓ |
| Approved-by in file + cross-check API | Parse name from plan.md, verify via API — two steps that drift | |
| Let spike Q-002 decide | Test both mechanisms empirically | |

**User's choice:** PR review API is source of truth

| Option | Description | Selected |
|--------|-------------|----------|
| Merge commit | Preserves S→P→I→V per-commit dogfood evidence on main | ✓ |
| Squash merge | Clean history but evidence only in PRs | |
| Rebase merge | Per-commit history, loses PR boundary | |

**User's choice:** Merge commit

| Option | Description | Selected |
|--------|-------------|----------|
| Ubuntu full + Win/mac container-free smoke | Real task up on ubuntu; task/--list/config/JDK smoke on Win/mac; one manual Win/mac run recorded | ✓ |
| Self-hosted runners | Full fidelity, heavy infra cost | |
| Ubuntu only + manual checklist | Simplest, silent Windows drift risk | |

**User's choice:** Option 1 — after requesting and receiving a detailed explanation of GitHub runner Docker limitations.

---

## Bootstrap paradox — dogfood commit đầu

| Option | Description | Selected |
|--------|-------------|----------|
| Manual dogfood from commit 1 | Hand-written specs, PR review as gate, enforcement ratchets | ✓ |
| Grace window with boundary | Pre-enforcement commits exempt, tagged | |
| Backfill specs later | Build first, retrofit — anti-dogfood | |

**User's choice:** Manual dogfood from commit 1

| Option | Description | Selected |
|--------|-------------|----------|
| Parallel, separated roles | .planning/ = GSD meta (not shipped); specs/ = preset artifacts (shipped); no cross-links | ✓ |
| specs/ links to .planning/ | Dead links at templating | |
| Merge GSD plans into specs/ | Breaks GSD tooling | |

**User's choice:** Parallel, separated roles

| Option | Description | Selected |
|--------|-------------|----------|
| docs/adr/ + docs/spikes/ | Both in shipped tree, ADR links spike | |
| ADR docs/adr/ + spikes .planning/spikes/ | Spikes are build-meta; ADRs summarize evidence inline | ✓ |
| Each spike as specs/NNN | Ceremony on throwaway work | |

**User's choice:** ADR in docs/adr/, spikes in .planning/spikes/ — noted consequence: ADRs must inline spike evidence, never link to .planning/.

| Option | Description | Selected |
|--------|-------------|----------|
| Right after Q-010 pass | Rest of Phase 1 under real enforcement | ✓ |
| Warn first then deny | Tune matchers before deny | |
| End of Phase 1 | Least friction, weakest dogfood | |

**User's choice:** Hooks on immediately after Q-010 passes

| Option | Description | Selected |
|--------|-------------|----------|
| One spec per T3 deliverable | 001-hooks, 002-ci, 003-stack, 004-init, 005-claude-pack; start at 001 | ✓ |
| One big spec for Phase 1 | Violates one-unit-per-PR | |
| 1:1 with GSD plans | Granularity follows planner not T3 boundaries | |

**User's choice:** One spec per T3 deliverable

| Option | Description | Selected |
|--------|-------------|----------|
| Second person exists | Gate runs as designed | |
| Solo — 2 GitHub accounts | Mechanical compliance, self-review in disguise | |
| Solo — waiver register | Gate built to full spec; self-approval waived time-boxed until 2nd person | ✓ |

**User's choice:** Solo — waiver register (register itself becomes a Phase 1 artifact)

| Option | Description | Selected |
|--------|-------------|----------|
| SessionStart warn on mismatch | Recorded tested version vs claude --version; warn only | ✓ |
| Hard block on mismatch | Heavy maintenance per Claude Code update | |
| Comment only | Silent drift | |

**User's choice:** SessionStart hook warn

---

## Layout repo monorepo

| Option | Description | Selected |
|--------|-------------|----------|
| Root + exclusion list | Preset tree at repo root; .planning/, product/, requirements/ excluded at templating | ✓ |
| Subdir preset/ | Path drift vs generated repo | |
| Separate repo | GSD workflow split across 2 repos | |

**User's choice:** Root of this repo + exclusion list

**Root CLAUDE.md handling:** Initial proposal (preset CLAUDE.md takes over root + @import GSD) was **rejected by user** in two freeform turns:
1. "CLAUDE.md root hiện tại là của claudecode dùng để phát triển project này, bạn cần có phương án cho CLAUDE.md root của template" → counter-proposal CLAUDE.template.md at root.
2. PO directive: "CLAUDE.template.md là thuộc về preset nên chỉ sinh ra khi khởi tạo preset" → final: no static template file; root preset CLAUDE.md generated only at preset init.

| Option | Description | Selected |
|--------|-------------|----------|
| CI render-then-check from source | Author source; CI renders with sample placeholders, checks ≤200 + smoke | ✓ |
| Gate directly on source doc | Line counts drift once placeholders appear | |
| Defer root gate to Giai đoạn 2 | Scope change to AGENT-01/GATE-12 | |

**User's choice:** CI render-then-check

| Option | Description | Selected |
|--------|-------------|----------|
| Live in-place | Literal com.acme.app; init renames; real lazy-load dogfood | ✓ |
| Also generated from source | Consistency at cost of dogfood + needless render step | |

**User's choice:** Live in-place — after asking whether tree CLAUDE.md files depend on init-time selections (answer: only packageRoot literal is alive in Giai đoạn 1; designWorkflow OFF, strictness standard, BPM ON fixed).

| Option | Description | Selected |
|--------|-------------|----------|
| settings.json=preset / settings.local.json=dev | Boundary matches Claude Code's own mechanism | |
| Skill prefix separation | Prefix noise in template | |
| Claude decides at plan | Defer mechanics to planner | ✓ |

**User's choice:** Claude decides at plan (settings.json/local split noted as suggested default)

---

## Spike failure policy & local stack

| Option | Description | Selected |
|--------|-------------|----------|
| CI-only floor, L1 best-effort | Hooks downgrade to warn; documented; milestone continues | ✓ |
| Block until stable version | Schedule held hostage to Claude Code releases | |
| Guard wrapper around hooks | More code, can't stop runtime behavior changes | |

**User's choice:** CI-only floor

| Option | Description | Selected |
|--------|-------------|----------|
| Valkey 8 | BSD-3, wire-compatible drop-in; 1-line ADR | ✓ |
| Redis 8 | Tri-license incl. AGPLv3 — avoidable debate | |
| Defer to ADR in phase | Delays a decision already informed | |

**User's choice:** Valkey 8

| Option | Description | Selected |
|--------|-------------|----------|
| otel-lgtm single image | 1 container for collector+Prometheus+Tempo+Loki+Grafana | ✓ |
| Discrete services | Prod parity locally, heavy dev loop | |

**User's choice:** otel-lgtm single image

| Option | Description | Selected |
|--------|-------------|----------|
| Fast = static-only, no containers | compile+ArchUnit+Modulith verify+lint+pure unit; containers in --full | ✓ |
| Fast reuses running task-up PG | Flaky risk, state pollution | |
| Widen budget via ADR | Breaks AGENT-08 commitment | |

**User's choice:** Fast = static-only

---

## Spike sequencing (second-round area)

| Option | Description | Selected |
|--------|-------------|----------|
| All upfront, parallel | First wave = 4 spikes; shortest critical path | ✓ |
| Just-in-time per deliverable | Late-failure cascade risk | |
| Q-010+Q-002 first, rest later | Compromise with little gain | |

**User's choice:** All upfront, parallel

## Five skills depth (second-round area)

| Option | Description | Selected |
|--------|-------------|----------|
| plan+verify full; other 3 skeleton | plan/verify needed by dogfood now; scaffolding skills completed Phases 2/4 | ✓ |
| All 5 full in Phase 1 | Unvalidatable, guaranteed rework | |
| Only plan+verify | Scope change to AGENT-02 | |

**User's choice:** plan + verify full; new-module/new-feature/design-implement skeleton + contract

## T3 path inventory (second-round area)

| Option | Description | Selected |
|--------|-------------|----------|
| Single shared config, full list day 1 | Hook + CI read same file; nonexistent paths never match; file itself is T3 | ✓ |
| Hook and CI separate lists | Guaranteed drift | |
| Minimal list, grow per phase | Gap exactly when new paths appear | |

**User's choice:** Single shared config file, full list from day 1

## Init script scope (second-round area)

| Option | Description | Selected |
|--------|-------------|----------|
| Flags + prompt fallback, idempotent | Rename dirs+literals, auto-commit, 2nd-run detection, CI sh/ps1 parity test | ✓ |
| Prompt-only interactive | Needs non-interactive mode anyway for CI | |
| Claude decides at plan | | |

**User's choice:** Flags + prompt fallback, idempotent-check

---

## Claude's Discretion

- `.claude/` dev-vs-preset separation mechanics (suggested default: settings.json committed = preset; settings.local.json = dev)
- Exact T3 config file name/format
- specs/NNN slugs and deliverable grouping
- Templating exclusion-list mechanism (Giai đoạn 2)

## Deferred Ideas

- Templating/extraction mechanics → Giai đoạn 2
- `strict` mode T2 matcher extension → ships as config, exercised later
- Keycloak realm/IdP wiring → Phase 3 (container itself in `task up` from Phase 1)
