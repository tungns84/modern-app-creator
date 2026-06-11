# Phase 1: Dogfood Bootstrap & Enforcement - Context

**Gathered:** 2026-06-11
**Status:** Ready for planning

<domain>
## Phase Boundary

The repo enforces its own methodology before any application code exists. Phase 1 delivers: the four spikes (Q-010 hook stability matrix, Q-002 hosting-API approver identity, Q-004 verify-fast gate-set, JDK 25 toolchain smoke on 3 OS), the required ADRs (FR-B11 permission sync, FR-B13 undeclared-permission detection, Redis-vs-Valkey), PreToolUse hooks (T3 plan-gate deny, T4 command deny), the `specs/NNN` convention, the L2 plan-compliance CI gate (GATE-10), CLAUDE.md size/smoke checks (GATE-12), the `task up` local stack (FOUND-02), `scripts/init` (FOUND-12), the three-layer CLAUDE.md and five skills (AGENT-01..06, 09). No backend/frontend application code — that starts Phase 2/4.

</domain>

<decisions>
## Implementation Decisions

### Git hosting & CI (Q-002 input)
- **D-01:** Hosting = **GitHub.com**. GitHub Actions, branch protection, PR review API. Q-002 scope narrows to: validate the GitHub mechanism empirically (squash/rebase/bot/self-approval cases).
- **D-02:** Approver identity mechanism (GATE-10): **PR review API is the source of truth**. CI check: diff touches T3 paths → require `specs/NNN-*/plan.md` exists on branch AND PR has approval from a CODEOWNER who is not the PR author. The `Approved-by:` line in plan.md is an audit trail, NOT the proof — it cannot be forged into authorization. Survives squash/rebase because verification binds to the PR, not commits.
- **D-03:** Merge strategy = **merge commit** (no squash). Preserves the S→P→I→V per-commit evidence on main — required by AGENT-09 (commit history is the dogfood evidence) and the Phase 8 tutorial (`specs/000-example`).
- **D-04:** 3-OS verification of `task up`: **ubuntu leg runs real `task up` + healthchecks; Windows/macOS legs run container-free smoke** (task binary install, `task --list`, compose config validation, JDK 25 toolchain smoke). Real `task up` on Win/mac is verified manually once during Phase 1 and recorded in the spike report. Reason: GitHub-hosted macOS runners have no Docker; Windows runners can't run Linux containers reliably.

### Bootstrap paradox (dogfood from commit 1)
- **D-05:** **Manual dogfood from commit 1.** Hand-written `specs/NNN/spec.md` + `plan.md` from the first Phase 1 deliverable; PR review acts as the gate until automation exists. Enforcement ratchets: CI gate comes online → CI enforces; hooks come online → hooks enforce. No grace window, no backfill.
- **D-06:** Two planning systems, **parallel with separated roles, no cross-links**: `.planning/` = GSD (how WE build the preset; never ships); `specs/NNN-*/` = preset methodology artifacts (what gates read; ships in template).
- **D-07:** **ADRs in `docs/adr/`** (ships, constitution per AI-COWORK §2). **Spike reports in `.planning/spikes/`** (meta, not shipped). Consequence: ADRs must summarize spike evidence INLINE — never link into `.planning/` (dead link at templating).
- **D-08:** Hooks turn on for this repo **immediately after Q-010 passes** — the rest of Phase 1 runs under real enforcement.
- **D-09:** **One spec per T3 deliverable**, numbering starts at `001` (`000-example` reserved for the Phase 8 tutorial). Suggested units: 001-hooks-enforcement, 002-plan-compliance-ci, 003-local-stack, 004-init-script, 005-claude-pack (planner may adjust grouping, not granularity philosophy).
- **D-10:** Solo dev + no-self-approval rule: **time-boxed waiver register**. Gate is built to full spec (no self-approval); self-approval is waived via the waiver register until a second person joins. The waiver register itself is a Phase 1 artifact (constraint already mandates it for gate exceptions).
- **D-11:** Claude Code version pin (Q-010): **SessionStart hook warns on mismatch** between recorded tested version and `claude --version`. Warn, not block — L1 is best-effort, CI L2 is the floor.

### Repo layout
- **D-12:** Preset monorepo lives at the **root of this repo** (backend/, frontend/, infra/, docs/, specs/, Taskfile, .claude/, .github/ at root). `.planning/`, `product/`, `requirements/` are meta — excluded at templating (Giai đoạn 2). Real repo == generated repo in paths: hook matchers, CI paths, T3 list transfer verbatim.
- **D-13 (PO decision):** Preset root CLAUDE.md is **preset-owned and only generated at preset initialization** — no static template CLAUDE.md maintained in the working tree. The dev (GSD) root `CLAUDE.md` stays untouched.
- **D-14:** GATE-12/AGENT-01 therefore use **CI render-then-check**: Phase 1 authors the SOURCE of the preset root CLAUDE.md (template source with placeholders); CI renders it with sample values, then asserts ≤200 lines + command smoke on the rendered output.
- **D-15:** `backend/CLAUDE.md` + `frontend/CLAUDE.md` **live in-place** with literal `com.acme.app` values (no live conditional branches in Giai đoạn 1: designWorkflow OFF/deferred, strictness fixed `standard`, BPM fixed ON). `scripts/init` renames literals; placeholder-ization is a Giai đoạn 2 templating concern. Size budget ≤150 lines each, gated directly.

### Spike failure policy & local stack
- **D-16:** Q-010 failure posture: **CI-only floor**. If hooks prove unstable on the pinned version, L1 downgrades to best-effort + warn, limitation documented in spike report + ADR, milestone continues. Core value holds via CI L2.
- **D-17:** **Valkey 8** (`valkey/valkey:8`) instead of Redis — BSD-3, wire-compatible, Lettuce unchanged. One-line ADR in Phase 1 recording license rationale.
- **D-18:** Local observability = **`grafana/otel-lgtm` single image** in `task up`. Discrete components belong to K8s overlays (Phase 6).
- **D-19:** Q-004 pre-defined direction: **`verify --fast` = static-only, no containers** (compile + ArchUnit + Modulith verify + lint + pure unit tests); Testcontainers only in `verify --full`. Spike confirms actual timings; fast-vs-full divergence (<5%) measured in Phase 8.

### Spike sequencing
- **D-20:** All 4 spikes run **upfront, in parallel, as the first wave** of Phase 1. Every later deliverable stands on spike results.

### Five skills depth
- **D-21:** **`plan` + `verify` implemented fully in Phase 1** (the dogfood loop needs them immediately; `verify` runs whatever gates exist and grows with phases). **`new-module`, `new-feature`, `design-implement` ship as skeleton SKILL.md + contract** (inputs/outputs, tier declaration); completed in Phases 2/4 when real trees exist to validate against. Matches the REQUIREMENTS.md cross-phase note (skills dogfood-validated in Phases 2–8).

### T3 path inventory
- **D-22:** **Single shared config file** for the T3 path list (e.g., `.cowork/tiers.json` or equivalent — exact name/format planner's choice) read by BOTH the hook and the CI gate — one source of truth, no drift. Full list per AI-COWORK §5 from day 1 (pom.xml, package.json, security/**, tenancy/**, .github/**, gate configs, CLAUDE.md/constitution files, new module dirs); not-yet-existing paths simply never match. The config file itself is T3 (gate config).

### Init script (FOUND-12)
- **D-23:** `scripts/init.(sh|ps1)`: **flags + prompt fallback** (`--group-id`, `--artifact-id`, `--project-name`; missing flag → prompt). Renames package dirs + replaces literals across the tree (excluding binary globs), then auto-commits one conventional commit. **Idempotent check**: second run detects rename already done and exits clearly. **CI parity test**: run `.sh` on ubuntu and `.ps1` on windows, compare resulting trees.

### Claude's Discretion
- `.claude/` dev-vs-preset separation mechanics (suggested default: `.claude/settings.json` committed = preset hooks T3/T4 + T1 allowlist + 5 skills; `.claude/settings.local.json` gitignored = dev/GSD personal) — decide during planning of the claude-pack spec.
- Exact templating exclusion-list mechanism (manifest file vs convention) — Giai đoạn 2 concern; Phase 1 only needs the meta dirs known: `.planning/`, `product/`, `requirements/`, dev root `CLAUDE.md`, `.code-review-graph/`.
- specs/NNN exact slugs and grouping of Phase 1 deliverables into specs.
- GSD meta-commits (`.planning/`-only changes) are not T3 paths — no spec required for them.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Methodology & enforcement (the thing Phase 1 builds)
- `product/methodology/AI-COWORK.md` — S→P→I→V workflow, tiers T1–T4, checkpoints H1–H3, two-layer enforcement matrix (§5), T3 path list, guardrail catalog (§7), bootstrap obligations (§11)
- `product/cli/CLAUDE-CODE-RUNTIME.md` — three-layer CLAUDE.md content split + size budgets (§1), five skills table (§2), hook set spec (§3), T1 allowlist (§5)
- `product/cli/PRESET-SPEC.md` — preset contract, manifest/options, template-first rule (§7), sanity gate (§6)

### Requirements & product
- `requirements/PRD.md` — authoritative PRD (Vietnamese); §13.1 dogfood rule, §14 open questions Q-002/Q-004/Q-010, §3.3 success metrics
- `.planning/REQUIREMENTS.md` — FOUND-02, FOUND-12, GATE-10, GATE-12, AGENT-01..06, AGENT-09 (Phase 1 set)

### Research (tech pins & pitfalls)
- `.planning/research/STACK.md` — locked version pins (note: JDK decision superseded to 25 LTS per PROJECT.md)
- `.planning/research/PITFALLS.md` — known toolchain/agent pitfalls
- `CLAUDE.md` (root, dev) — embedded stack research tables; JDK 25 LTS is the governing decision (PROJECT.md Key Decisions), not the JDK 26 text in older research tables

</canonical_refs>

<code_context>
## Existing Code Insights

Greenfield — no application code. Repo contains only planning/product docs:
- `.planning/` — GSD meta (stays, never ships)
- `product/` — methodology + specs sources (meta, excluded at templating)
- `requirements/PRD.md` — authoritative source (meta)
- Root `CLAUDE.md` — dev/GSD instruction file (23K; stays dev-owned per D-13)

### Integration Points
- Preset tree (backend/, frontend/, infra/, docs/, specs/, Taskfile.yml, scripts/, .claude/, .github/) is created at repo root alongside the meta dirs (D-12).
- `.claude/settings.json` will carry preset hooks that are ALSO live for this repo's own development (D-08).

</code_context>

<specifics>
## Specific Ideas

- PO framing: "CLAUDE.template.md thuộc về preset nên chỉ sinh ra khi khởi tạo preset" — root preset CLAUDE.md must never exist as a maintained static file in the dev tree; only its source + render pipeline exist (D-13/D-14).
- Enforcement ratchet narrative matters for the PRD §13.1 evidence: commit history should visibly show manual specs → CI gate live → hooks live.

</specifics>

<deferred>
## Deferred Ideas

- Templating/extraction mechanics (`repo → presets/{id}/template/`, exclusion manifest, placeholder-ization of com.acme.app and CLAUDE.md sources) — Giai đoạn 2 milestone.
- `strict` mode hook matcher extension to T2 paths — ships as scaffold option config, exercised later.
- Keycloak realm configuration depth in `task up` — container present from Phase 1 (FOUND-02 lists it), but realm/IdP wiring is Phase 3 scope.

</deferred>

---

*Phase: 1-Dogfood Bootstrap & Enforcement*
*Context gathered: 2026-06-11*
