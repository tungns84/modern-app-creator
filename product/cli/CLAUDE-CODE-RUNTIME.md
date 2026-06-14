# Claude Code Runtime Pack

**Status:** Draft 1.0 — 2026-06-10 (replaces AGENT-RUNTIMES.md draft 1.0 — multi-runtime matrix moved to v2, §6)
**Scope:** Everything `cowork-cli` emits to make a generated project first-class for Claude Code: layered CLAUDE.md, skills, hooks, MCP config — and the seam left for multi-runtime v2.

---

## 1. Layered CLAUDE.md — the instruction architecture

Claude Code mechanics this design relies on (verified against docs 2026-06-10):
- At launch, Claude Code walks UP from cwd collecting `CLAUDE.md` files.
- `CLAUDE.md` in subdirectories BELOW cwd lazy-load — only when Claude reads/edits files in that subtree. Frontend rules stay out of backend sessions.
- `@path` imports load at launch (organizational tool, not token-saving).

### Emitted layout

```
CLAUDE.md                  # root — ~150 lines MAX
backend/CLAUDE.md          # Modulith rules — lazy-loads in backend work
frontend/CLAUDE.md         # zones/tokens/a11y — lazy-loads in frontend work
```

**No per-Modulith-module CLAUDE.md files.** `package-info.java` (`@ApplicationModule(allowedDependencies=...)`) is already the machine-readable boundary, module canvases document the rest, and 12 extra files would rot. [Inference from nested-file maintenance research.]

### Content split (the "surprise test": would this surprise an experienced dev? No → cut)

| File | Contains | Never contains |
|------|----------|----------------|
| root `CLAUDE.md` | One-paragraph project description; canonical commands (`task up`, `mvnw verify`, `npm run dev/build/codegen`); workspace map; risk-tier table (compact); pointers: AI-COWORK.md, ARCHITECTURE.md, ADR index, DESIGN.md; "Do not" anti-stack list | Stack tutorials, React/Spring basics, anything duplicated in tree files |
| `backend/CLAUDE.md` | Module DAG summary + how to add a module (points to `new-module` skill); events-for-writes/`::spi`-for-reads rule; test conventions (`*Test`/`*Tests`); Flyway per-module layout; ArchUnit expectations phrased as "you will fail the build if..." | Frontend anything; root duplication |
| `frontend/CLAUDE.md` | Zone rules (`shared → features → app`); tokens-only styling; i18n key workflow (all locales or key-diff fails); a11y requirements (IconButton aria-label, axe gate); generated-code rule (never edit `src/generated/`) | Backend anything; root duplication |

**Size budgets (CI-checked):** root ≤ 200 lines; tree files ≤ 150 lines each. Research benchmark: 3,847 → 312 tokens with no quality loss — brevity is a feature.

**Maintenance rules:** CLAUDE.md edits go through PR review like code; constitution files are T3 (gate-triggering paths in the plan-compliance CI check); stale-command smoke test in CI runs every command named in root CLAUDE.md `--help`/dry-run where feasible.

## 2. `.claude/skills/` — executable methodology

| Skill | Purpose | Tier link |
|-------|---------|-----------|
| `new-module` | Scaffold Modulith module: `package-info.java` with `allowedDependencies`, `spi/`+`events/` packages, Flyway folder, `@ApplicationModuleTest` stub, bumps module-count assertion | T3 — skill output includes plan.md template pre-filled |
| `new-feature` | Frontend feature folder: zone-compliant imports, i18n keys all locales, test stub | T2 |
| `design-implement` | Stitch MCP fetch → shadcn/ui + tokens implementation; DESIGN-WORKFLOW.md checklist | T2 |
| `plan` | Emit `specs/NNN-*/plan.md` in the §3.2 format (files, modules, events, migrations, tests, tier declaration) | H2 input |
| `verify` | Run full local gate suite; summarize failures by violated rule | pre-PR self-check |

## 3. `.claude/settings.json` — hooks as hard checkpoints

Emitted hook set (see AI-COWORK.md §5 for the policy these implement):

| Hook | Trigger | Action |
|------|---------|--------|
| T3 plan-gate | `PreToolUse` on Write/Edit matching T3 paths (`backend/src/main/java/**/package-info.java` new module dirs, `pom.xml`, `package.json`, `security/**`, `tenancy/**`, `.github/**`, `CLAUDE.md`, gate configs) | `permissionDecision: deny` with message naming the missing artifact, unless `specs/*/plan.md` with `Approved-by:` exists on current branch |
| T4 command deny | `PreToolUse` on Bash matching deploy/secret/destructive patterns (`kubectl apply`, `kubectl delete`, `git push --force`, `flyway clean`, secret-bearing commands) | deny + instruct human execution |
| Verify reminder | `Stop` hook | warn if gates not run since last edit (soft) |

Notes:
- `PreToolUse` deny holds even under `--dangerously-skip-permissions` — policy, not preference.
- Hooks are version-sensitive (Claude Code behavior may change) → hook configs carry a tested-version comment; CI layer 2 is the floor that never depends on Claude Code.
- `strict` mode scaffold option extends the plan-gate matcher to T2 paths.

## 4. `.mcp.json`

Emitted when design workflow ON: Stitch MCP server entry (screens → `get_screen_code`/`get_screen_image` for the `design-implement` skill). Project-scoped, committed, reviewed.

## 5. Permissions allowlist

`settings.json` pre-allows the read-only and build commands named in CLAUDE.md (`task *`, `./mvnw verify`, `npm run *`) to cut permission-prompt fatigue on T1 work — aligned with the principle: friction at T3/T4, zero ceremony at T1.

## 6. v2 Seam — multi-runtime

Deliberately deferred, architecture preserved:

- Content already lives in markdown files a future emission step can transform; nothing is Claude-Code-syntax-locked except `.claude/` mechanics.
- v2 adds: `AGENTS.md` generated from root `CLAUDE.md` (Linux Foundation standard — native for Codex/Cursor/Copilot/Gemini/Windsurf/Zed; nearest-file-wins gives the same root/backend/frontend layering), `.cursor/rules/*.mdc` glob-scoped extras, `.github/copilot-instructions.md` copy with drift header.
- Enforcement parity note for v2: other runtimes lack plan mode/hooks → they get Layer 2 (CI) only; document the difference, don't pretend parity.
- CLI keeps emission as a pure function `(answers, sources) → file set` so adding runtimes never touches presets (PRESET-SPEC.md §5).

---
*Draft 1.0 — 2026-06-10. Sources: Claude Code memory/hooks docs, nested-instruction research (`.planning/notes/instruction-file-research.md`), AGENTS.md standard research (v2 seam).*
