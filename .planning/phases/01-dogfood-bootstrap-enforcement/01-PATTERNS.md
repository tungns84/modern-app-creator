# Phase 1: Dogfood Bootstrap & Enforcement - Pattern Map

**Mapped:** 2026-06-11
**Files analyzed:** 38 new files (0 modified)
**Analogs found:** 0 / 38 — **greenfield repo, no codebase analogs exist**

> **Greenfield notice [Unverified analogs: none exist].** The repo contains only docs (`.planning/`, `product/`, `requirements/`, root `CLAUDE.md`). Verified by tree scan 2026-06-11: no `.claude/`, `.github/`, `scripts/`, `Taskfile.yml`, `infra/`, or any `.mjs/.yml/.sh/.ps1` source files outside `.planning/` cache. Therefore every "pattern source" below is an **authoritative spec/research excerpt**, not an existing-code analog. The planner MUST treat the cited excerpts as the copy-from source. RESEARCH.md Code Examples 1–5 are verified against official docs (Context7 / docs.github.com / keycloak.org) per its Sources section.

**Canonical pattern sources (in priority order):**
1. `.planning/phases/01-dogfood-bootstrap-enforcement/01-RESEARCH.md` — Patterns 1–8, Code Examples 1–5, Pitfalls 1–10
2. `product/methodology/AI-COWORK.md` — policy the artifacts implement (tiers §6, enforcement §5, spec format §4)
3. `product/cli/CLAUDE-CODE-RUNTIME.md` — CLAUDE.md split (§1), skills table (§2), hook set (§3), allowlist (§5)
4. `product/cli/PRESET-SPEC.md` — rendering rules (§4), sanity gate (§6)

## File Classification

| New File | Role | Data Flow | Closest Analog | Pattern Source (no analog) |
|----------|------|-----------|----------------|---------------------------|
| `.gitattributes` | config | — | none | RESEARCH Pitfall 6 (lines 403-406); PRESET-SPEC §4.4 |
| `.claude/settings.json` | config | event-driven (hook dispatch) | none | RESEARCH Code Example 1 (lines 431-454) |
| `.claude/hooks/t3-plan-gate.mjs` | middleware (hook script) | event-driven (stdin JSON → stdout decision) | none | RESEARCH Pattern 1 + Code Example 2 (lines 457-478) |
| `.claude/hooks/t4-command-guard.mjs` | middleware (hook script) | event-driven | none | RESEARCH Pattern 1; same deny contract as t3 |
| `.claude/hooks/session-version-warn.mjs` | middleware (hook script) | event-driven | none | RESEARCH Code Example 5 (lines 524-534) |
| `.claude/hooks/lib/tiers.mjs` | utility (shared matcher) | transform (path → tier) | none | RESEARCH "Don't Hand-Roll" (zero-dep matcher, line 160) |
| `.claude/hooks/tests/*.test.mjs` | test | request-response (fixture → assert) | none | RESEARCH Validation Architecture (lines 601-640) |
| `.claude/skills/plan/SKILL.md` | config (skill, full) | — | none | RESEARCH Pattern 7; CLAUDE-CODE-RUNTIME §2; AI-COWORK §3.2 |
| `.claude/skills/verify/SKILL.md` | config (skill, full) | — | none | RESEARCH Pattern 7 ("thin wrapper over `task verify`") |
| `.claude/skills/new-module/SKILL.md` | config (skill, skeleton) | — | none | RESEARCH Pattern 7; CLAUDE-CODE-RUNTIME §2 (T3, pre-filled plan.md) |
| `.claude/skills/new-feature/SKILL.md` | config (skill, skeleton) | — | none | RESEARCH Pattern 7 (T2 contract) |
| `.claude/skills/design-implement/SKILL.md` | config (skill, skeleton) | — | none | RESEARCH Pattern 7 (T2 contract) |
| `.cowork/tiers.json` | config (single source of truth) | — | none | D-22; RESEARCH Architecture map line 119 |
| `.cowork/waivers.json` | config (waiver register) | — | none | D-10; RESEARCH Pattern 3 step 7 |
| `.github/workflows/plan-compliance.yml` | CI workflow | event-driven (PR events → API → verdict) | none | RESEARCH Pattern 3 (lines 305-318) + Code Example 3 (lines 481-490) |
| `.github/workflows/claude-md-check.yml` | CI workflow | batch (render → assert) | none | RESEARCH Pattern 5 (lines 327-331) |
| `.github/workflows/os-matrix.yml` | CI workflow | batch | none | D-04; RESEARCH Pattern 4 "D-04 split" (line 325) |
| `.github/workflows/init-parity.yml` | CI workflow | batch (2-OS diff) | none | RESEARCH Pattern 6 parity test (line 337) |
| `.github/CODEOWNERS` | config | — | none | RESEARCH diagram line 215 (path list) |
| `.github/pull_request_template.md` | config (doc template) | — | none | AI-COWORK §11 (H3 checklist: spec link, tier, UI checks) |
| `Taskfile.yml` | config (task runner) | — | none | RESEARCH Code Example 4 Taskfile part (lines 513-521) |
| `infra/compose.yaml` | config (6-service stack) | — | none | RESEARCH Code Example 4 (lines 493-512) + images table (lines 138-146) |
| `scripts/init.sh` | utility (CLI entry) | file-I/O (tree rewrite) | none | RESEARCH Pattern 6 (lines 333-338) + Pitfall 8 |
| `scripts/init.ps1` | utility (CLI entry) | file-I/O | none | Same as init.sh — parity contract D-23 |
| `scripts/checks/render-claude-md.mjs` | utility (renderer) | transform (template + values → file) | none | RESEARCH Pattern 5 "Renderer" (line 331); PRESET-SPEC §4.1/§4.5 |
| `scripts/checks/claude-md-check.mjs` | utility (gate check) | batch | none | RESEARCH Pattern 5; Pitfall 9 |
| `scripts/checks/settings-lint.mjs` | utility (gate check) | batch | none | RESEARCH test map AGENT-04 row (line 616) |
| `scripts/checks/skills-lint.mjs` | utility (gate check) | batch | none | RESEARCH test map AGENT-02 row (line 625) |
| `scripts/checks/meta-link-lint.mjs` | utility (gate check) | batch | none | RESEARCH Pitfall 10 (lines 422-424) |
| `scripts/checks/assert-non-author-approval.mjs` | utility (gate core) | transform (reviews JSON → verdict) | none | RESEARCH Code Example 3 + Pattern 3 step 5 |
| `scripts/checks/tests/plan-compliance.test.mjs` | test | request-response (fixtures) | none | RESEARCH Pitfall 5 ("unit-test against fixture JSON") |
| `templates/claude/ROOT-CLAUDE.template.md` | template source | — | none | D-13/D-14; CLAUDE-CODE-RUNTIME §1 content split table |
| `backend/CLAUDE.md` | doc (constitution, ≤150 lines) | — | none | D-15; CLAUDE-CODE-RUNTIME §1 table row "backend" |
| `frontend/CLAUDE.md` | doc (constitution, ≤150 lines) | — | none | D-15; CLAUDE-CODE-RUNTIME §1 table row "frontend" |
| `docs/methodology/AI-COWORK.md` | doc (verbatim copy) | — | n/a — copy of `product/methodology/AI-COWORK.md` | D-12 / AI-COWORK §11 last checkbox |
| `docs/adr/0001..0003-*.md` | doc (ADR) | — | none | D-07 (inline evidence, never link `.planning/`); D-17 |
| `specs/001..006-*/{spec,plan}.md` | doc (methodology artifact) | — | none | AI-COWORK §4 format (lines 66-78); D-09 grouping |
| `.planning/spikes/{q010,q002,q004,jdk25}*.md` | doc (spike report, meta) | — | none | RESEARCH Open Questions 1-4 define per-spike scope + exit criteria |

## Pattern Assignments

No-analog rule applied: each assignment cites the authoritative excerpt to copy from, with exact file + line references.

### `.claude/hooks/t3-plan-gate.mjs` (middleware, event-driven)

**Analog:** none — copy from `01-RESEARCH.md` Code Example 2 (lines 457-478), schema verified via Context7 hooks reference.

**Core fail-closed pattern** (RESEARCH lines 459-477):
```javascript
import { readFileSync } from "node:fs";
function deny(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason
    }
  }));
  process.exit(0); // decision carried by JSON, not exit code
}
try {
  const input = JSON.parse(readFileSync(0, "utf8")); // stdin
  const filePath = input.tool_input?.file_path ?? "";
  // … match against .cowork/tiers.json, check specs/*/plan.md Approved-by on branch …
} catch (err) {
  deny(`T3 gate error (${err.message}). Fix .claude/hooks or run the plan skill, then retry.`);
}
```

**Binding design rules** (RESEARCH Pattern 1, lines 292-296):
1. JSON deny output preferred over bare exit 2 (carries message + next step per AGENT-03).
2. Whole script in try/catch; catch emits deny JSON, never lets exception bubble — non-2 exit codes are non-blocking (Pitfall 1, fail-OPEN).
3. Only `node` and `git` may be assumed on PATH — no `jq`, no bash-isms.
4. Deny message must name the missing artifact + next step ("run the `plan` skill → get plan approved → retry").

**Stdin contract** (RESEARCH line 286): `{ session_id, cwd, hook_event_name, tool_name, tool_input: { file_path | command }, permission_mode }`.

---

### `.claude/hooks/t4-command-guard.mjs` (middleware, event-driven)

**Analog:** none — same skeleton as t3-plan-gate (Code Example 2). Differences per RESEARCH diagram lines 205-208:
- Reads `input.tool_input.command` (Bash matcher) instead of `file_path`.
- T4 pattern hit → deny JSON with "human executes" message (AI-COWORK §5 L1: "T4 command patterns (deploy, secret ops, destructive git/db) → PreToolUse deny + human executes", AI-COWORK line 87).
- Best-effort T3 write-via-bash scan (`echo >`, `sed -i`, `tee`, `git apply`, heredoc) — documented as best-effort only (Pitfall 2).
- T4 patterns read from `.cowork/tiers.json`, never hardcoded (D-22).

---

### `.claude/hooks/session-version-warn.mjs` (middleware, event-driven)

**Analog:** none — copy from `01-RESEARCH.md` Code Example 5 (lines 524-534):
```javascript
import { execSync } from "node:child_process";
const pinned = JSON.parse(readFileSync(".cowork/tiers.json", "utf8")).claudeCode.testedVersion;
const actual = execSync("claude --version", { encoding: "utf8" }).trim();
if (!actual.startsWith(pinned)) {
  console.log(`WARNING: Claude Code ${actual} != tested ${pinned}. ` +
              `Hook behavior unverified on this version (Q-010 matrix). CI gates remain the floor.`);
}
```
Warn-not-block (D-11). [Unverified] SessionStart stdout-as-context mechanics — Q-010 assumption A9; wrap in try/catch that exits 0 silently on error (a warn hook must never break sessions).

---

### `.claude/hooks/lib/tiers.mjs` (utility, transform)

**Analog:** none. Contract from RESEARCH "Don't Hand-Roll" + Alternatives (lines 160, 364-374):
- Zero-dependency hand-rolled glob matcher (~30 lines, subset: `**`, `*`, literal dirs) — npm deps would make hooks fail open on fresh clone before `npm ci`.
- Single module consumed by BOTH hooks and CI gate scripts (D-22) — the one place tier matching lives.
- Reads `.cowork/tiers.json`; meta dirs (`.planning/`, `product/`, `requirements/`) excluded in DATA, not in script logic (RESEARCH Pattern 2, line 301).
- Fallback if globs outgrow the subset: `minimatch` (pre-approved, RESEARCH Package Audit line 184).

---

### `.claude/settings.json` (config, hook dispatch)

**Analog:** none — copy verbatim structure from `01-RESEARCH.md` Code Example 1 (lines 431-454):
```jsonc
{
  "permissions": {
    "allow": ["Bash(task *)", "Bash(./mvnw *)", "Bash(npm run *)"],
    "deny":  ["Bash(git push --force*)", "Bash(kubectl *)", "Bash(flyway clean*)"]
  },
  "hooks": {
    "SessionStart": [
      { "hooks": [ { "type": "command",
          "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/session-version-warn.mjs\"" } ] }
    ],
    "PreToolUse": [
      { "matcher": "Write|Edit",
        "hooks": [ { "type": "command",
          "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/t3-plan-gate.mjs\"" } ] },
      { "matcher": "Bash",
        "hooks": [ { "type": "command",
          "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/t4-command-guard.mjs\"" } ] }
    ]
  }
}
```
- `permissions.deny` mirrors tiers.json T4 patterns — lockstep enforced by `settings-lint.mjs` (RESEARCH Pattern 2, line 303).
- [Unverified] `$CLAUDE_PROJECT_DIR` expansion on Windows — Q-010 assumption A2; hooks go live only after Q-010 passes (D-08).
- Dev/GSD personal config goes in gitignored `.claude/settings.local.json` (discretion default, CONTEXT line 56).

---

### `.cowork/tiers.json` + `.cowork/waivers.json` (config)

**Analog:** none. Shape derived from consumers:
- `tiers.json` carries: T3 path globs (full list per AI-COWORK §5 L2, line 90: new module dirs, `pom.xml`/`package.json`, `security/**`, `tenancy/**`, `.github/**`, gate configs, `CLAUDE.md`/constitution files), T4 command patterns, meta-dir exclusions, `claudeCode.testedVersion` (consumed by Code Example 5).
- `waivers.json`: time-boxed entries with scope (`self-approval`) + expiry date; gate evaluates expiry every run — expired = red check (RESEARCH Pattern 3 step 7 + Security table "waiver register rot", line 664).
- Both files are themselves T3 paths (D-22; `.cowork/**` in CODEOWNERS per RESEARCH line 215).

---

### `.github/workflows/plan-compliance.yml` + gate scripts (CI workflow, event-driven)

**Analog:** none — implement the 8-step algorithm in `01-RESEARCH.md` Pattern 3 (lines 305-318) exactly.

**Trigger block (non-negotiable, Pitfall 4):** `on: pull_request: [opened, synchronize, reopened]` AND `pull_request_review: [submitted, dismissed]`.

**Reviews verification core** (Code Example 3, lines 481-490):
```bash
AUTHOR=$(gh api "repos/$REPO/pulls/$PR" --jq '.user.login')
gh api "repos/$REPO/pulls/$PR/reviews" --paginate \
  --jq 'group_by(.user.login) | map(max_by(.submitted_at))
        | map(select(.state == "APPROVED" and (.user.type != "Bot")))
        | map(.user.login)' \
  | node scripts/checks/assert-non-author-approval.mjs --author "$AUTHOR"
```
- Changed files via `gh api repos/$R/pulls/$N/files --paginate` (merge-base-correct, Pattern 3 step 2).
- Latest-review-per-user reduction is mandatory (Pitfall 3 — stale/dismissed reviews).
- Token: `permissions: { contents: read, pull-requests: read }` (Pattern 3, line 318).
- Derive PR number once from event, fetch everything else fresh via API (Pitfall 5).
- CODEOWNERS semantics NOT re-parsed in CI — ruleset enforces it (Don't Hand-Roll, line 368).
- Keep ONE API style: `gh api` (RESEARCH Alternatives line 161).

---

### `.github/workflows/claude-md-check.yml` + `scripts/checks/{render-claude-md,claude-md-check}.mjs` (CI workflow + utilities)

**Analog:** none — RESEARCH Pattern 5 (lines 327-331):
- Render `templates/claude/ROOT-CLAUDE.template.md` with sample values (`projectName=smoke, groupId=com.acme, artifactId=app`) to temp file → assert ≤200 lines → command smoke.
- `backend/CLAUDE.md` + `frontend/CLAUDE.md` checked in place, ≤150 lines each (D-15).
- Renderer: ~20-line zero-dep token replace; fail on orphan `{{` after render (PRESET-SPEC §4.5).
- Smoke: explicitly declared commands only (no prose-regex extraction); assert smoked-command count > 0 so silent extraction failure turns the gate red, not vacuous green (Pitfall 9); Docker-needing commands restricted to ubuntu leg.
- All line counting normalizes `\r\n` first (Pitfall 6).

---

### `.github/workflows/os-matrix.yml` (CI workflow, batch)

**Analog:** none — D-04 split encoded per RESEARCH Pattern 4 (line 325):
- ubuntu: real `task up` + assert `docker compose ps --format json` all healthy.
- windows/macos: `task --version`, `task --list`, `docker compose -f infra/compose.yaml config -q`, JDK 25 toolchain smoke (`actions/setup-java`, `distribution: temurin`, `java-version: 25`).
- Matrix: `[windows-latest, ubuntu-24.04, macos-latest]` (root CLAUDE.md CI table).
- Pin actions by major tag minimum; SHA-pin non-`actions/*` orgs (RESEARCH Security V14).

---

### `Taskfile.yml` + `infra/compose.yaml` (config)

**Analog:** none — copy from `01-RESEARCH.md` Code Example 4.

**Taskfile** (lines 513-521): readiness delegated entirely to compose:
```yaml
version: '3'
tasks:
  up:
    desc: Boot the full local stack (waits for healthchecks)
    cmds:
      - docker compose -f infra/compose.yaml up -d --wait
```
Tasks written in POSIX-sh syntax (mvdan/sh runs it natively on Windows); only `docker`, `node`, `task` callable as executables (Pattern 4, line 323). Also add `verify` task — single path shared by CI and the `verify` skill (Pattern 7).

**Compose — Keycloak healthcheck** (lines 493-508, the hardest service):
```yaml
  keycloak:
    image: quay.io/keycloak/keycloak:26.6.3
    command: start-dev
    environment:
      KC_HEALTH_ENABLED: "true"
      KC_BOOTSTRAP_ADMIN_USERNAME: admin   # dev-only credentials
      KC_BOOTSTRAP_ADMIN_PASSWORD: admin
    healthcheck:
      # image has no curl — bash /dev/tcp probe against mgmt port 9000
      test: ["CMD-SHELL", "exec 3<>/dev/tcp/127.0.0.1/9000; echo -e 'GET /health/ready HTTP/1.1\\r\\nHost: localhost\\r\\nConnection: close\\r\\n\\r\\n' >&3; cat <&3 | grep -q '\"status\": \"UP\"'"]
      start_period: 30s
      interval: 10s
      retries: 12
```
Other 5 services per RESEARCH images table (lines 138-146): `postgres:16-alpine` (`pg_isready`), `valkey/valkey:8` (`valkey-cli ping`), `axllent/mailpit` ([Unverified] `/livez` — A8, verify at adoption), `minio/minio` ([Unverified] `/minio/health/live` — A8), `grafana/otel-lgtm` (ports 3000/4317/4318, pin tag at adoption). Healthchecks run INSIDE containers (Pitfall 7).

---

### `scripts/init.sh` / `scripts/init.ps1` (utilities, file-I/O)

**Analog:** none — contract from RESEARCH Pattern 6 (lines 333-338) + Pitfall 8 + D-23:
- Flags `--group-id/--artifact-id/--project-name`, prompt fallback per missing flag.
- Walk tree excluding `.git/`, PRESET-SPEC `binaryGlobs` (`**/*.png`, `**/*.svg`, `**/*.jar`, `**/mvnw*`), and meta dirs (`.planning/`, `product/`, `requirements/` — these mention `com.acme.app` in docs!).
- Replace word-boundary-aware literal family `com.acme.app` / `com/acme/app` / `acme-app`; rename matching dirs; `git add -A && git commit -m "chore: initialize project as <artifactId>"`.
- Idempotency: zero literal occurrences → "already initialized as <current>", exit 0 distinctly.
- Validate groupId/artifactId against Java-package/npm grammar BEFORE touching files; refuse dirty worktree.
- NO `sed -i` (macOS/Linux divergence, Pitfall 8). Planner option (Pitfall 8, line 415): shared Node core behind thin `.sh`/`.ps1` entry points — reduces parity risk to argument parsing; D-23 mandates entry points, not dual implementations.
- Both legs share a manifest of (literal → placeholder-name) pairs for Giai đoạn 2 reuse.
- go-task pinned version check (v3.51.1) belongs here (root CLAUDE.md constraint; RESEARCH line 168).

---

### `.claude/skills/*/SKILL.md` (config, 5 files)

**Analog:** none — RESEARCH Pattern 7 (lines 340-346) + CLAUDE-CODE-RUNTIME §2 table:
- All: YAML frontmatter `name` + `description` (description = trigger surface).
- `plan` (full): emits `specs/NNN-slug/plan.md` in AI-COWORK §3.2 format — files, modules, events/SPI, migrations, tests, `tier: T1|T2|T3`, empty `Approved-by:` placeholder; computes next NNN from existing `specs/` dirs.
- `verify` (full): thin wrapper over `task verify`; summarizes failures BY VIOLATED RULE (FR-E08 seed).
- `new-module`/`new-feature`/`design-implement` (skeletons): declare inputs/outputs/tier (`new-module` = T3 with pre-filled plan.md template); body states "implemented in Phase 2/4; do not improvise".

---

### `specs/NNN-*/{spec.md, plan.md}` (docs, 6 spec dirs per D-09)

**Analog:** none — format from AI-COWORK §4 (lines 66-78):
```
specs/
└── NNN-short-name/          # NNN = zero-padded sequence
    ├── spec.md              # WHAT/WHY: story, acceptance criteria, REQ-IDs
    ├── plan.md              # HOW: files, modules, events, migrations, tests,
    │                        #   tier: T1|T2|T3, Approved-by: <human> <date>
    └── tasks.md             # optional
```
Branch `feat/NNN-short-name`; commits cite REQ-IDs (`feat(security): pin JWS algs (refs SEC-04)`, AI-COWORK line 76). Numbering from `001` (`000-example` reserved Phase 8). The first hand-written specs ARE the dogfood ratchet evidence — task ordering must show manual specs → CI gate live → hooks live (RESEARCH Pattern 8).

---

### `templates/claude/ROOT-CLAUDE.template.md`, `backend/CLAUDE.md`, `frontend/CLAUDE.md` (template + docs)

**Analog:** none — content contract from CLAUDE-CODE-RUNTIME §1 content-split table (lines 29-31):
- Root template (rendered ≤200 lines): project description ¶, canonical commands (`task up`, `mvnw verify`, `npm run dev/build/codegen`), workspace map, compact risk-tier table, pointers (AI-COWORK.md, ARCHITECTURE.md, ADR index), anti-stack "Do not" list. Never: stack tutorials, tree-file duplication.
- `backend/CLAUDE.md` (≤150, literal `com.acme.app` per D-15): module DAG summary + new-module pointer, events-for-writes/`::spi`-for-reads, test conventions, Flyway per-module layout, ArchUnit expectations phrased "you will fail the build if...". Carry forward agent-hallucination warnings (Testcontainers 1.x idioms, Jackson 2 imports — RESEARCH line 547).
- `frontend/CLAUDE.md` (≤150): zone rules `shared → features → app`, tokens-only styling, i18n key workflow, a11y requirements, never edit `src/generated/`.

---

### `docs/adr/000N-*.md` (docs, 3 ADRs)

**Analog:** none. Constraints from D-07/D-17 + CONTEXT:
- `0001-valkey-not-redis.md` — one-liner: Valkey 8 BSD-3 vs Redis 8 tri-license incl. AGPL; wire-compatible, Lettuce unchanged (RESEARCH State-of-the-Art line 544).
- `0002-permission-sync.md` (FR-B11), `0003-undeclared-permission-detection.md` (FR-B13).
- HARD RULE: spike evidence summarized INLINE — zero links into `.planning/` (dead at templating); enforced by `meta-link-lint.mjs` (Pitfall 10).

---

### Test files (`.claude/hooks/tests/`, `scripts/checks/tests/`)

**Analog:** none — RESEARCH Validation Architecture (lines 601-640):
- Framework: `node:test` built into Node 22, zero install; run `node --test .claude/hooks/tests/ scripts/checks/tests/`.
- Hook tests: fixture stdin JSON → expected decision JSON; MUST include deliberate crash-path case asserting fail-closed (Pitfall 1 warning sign).
- `plan-compliance.test.mjs`: fixture PR-files/reviews JSON covering T3 hit, no-plan fail, approved pass, stale review, bot review, waiver expiry (test map line 617).
- Q-010 scenario matrix lives in `.claude/hooks/tests/` (structure line 251); scenario list at RESEARCH line 570.

---

### `.planning/spikes/*.md` (4 spike reports, meta)

**Analog:** none — scope + exit criteria per RESEARCH Open Questions 1-4 (lines 565-581). Q-010 scenario list verbatim (line 570): {Write deny, Edit deny, Bash T4 deny, Bash write-bypass attempt, crash fail-mode, skip-permissions flag, settings.local override attempt, $CLAUDE_PROJECT_DIR on Win/mac/Linux, SessionStart warn visibility}. All 4 run upfront in parallel (D-20). JDK spike targets **25**, not 26 (local JDK 26 must not leak into results — RESEARCH line 594).

## Shared Patterns

### Fail-closed deny (all hook scripts)
**Source:** `01-RESEARCH.md` Pattern 1 + Code Example 2 (lines 281-296, 457-478)
**Apply to:** `t3-plan-gate.mjs`, `t4-command-guard.mjs`
Try/catch wrapping entire script; catch emits deny JSON + exit 0. Reason: non-2 exit codes are non-blocking → crash = fail-OPEN (Pitfall 1).

### Zero-dependency Node (all scripts)
**Source:** `01-RESEARCH.md` "Don't Hand-Roll" key insight (line 374)
**Apply to:** every `.mjs` in `.claude/hooks/` and `scripts/checks/`
All automation sits in front of dependency installation — hooks must work on fresh clone before `npm ci`. No npm packages, no `jq`, no bash-isms; only `node` + `git` assumed.

### Single tier source (`.cowork/tiers.json` via `lib/tiers.mjs`)
**Source:** D-22; RESEARCH anti-pattern line 359
**Apply to:** both hooks, plan-compliance gate, settings-lint
T3 globs/T4 patterns live in ONE file; any generated duplication (`permissions.deny`) gets a lockstep check.

### CRLF normalization
**Source:** RESEARCH Pitfall 6 (lines 403-406)
**Apply to:** `.gitattributes` (FIRST commit: `* text=auto eol=lf`; `*.cmd`/`*.bat`/`*.ps1` crlf), every line-counting/diffing check script (strip `\r` before counting), init parity test (normalize EOL before `git diff --no-index`). Blocking precondition: this machine has `core.autocrlf=true` and no `.gitattributes` today.

### node:test harness
**Source:** RESEARCH Validation Architecture (lines 603-609)
**Apply to:** all script tests. Per-commit: `node --test ...` (sub-second). Per-wave: `task verify`.

### Deny-message UX contract
**Source:** RESEARCH Pattern 1 rule 4 (line 296); CLAUDE-CODE-RUNTIME §3 table
**Apply to:** both deny hooks + CI gate failure output
Every red verdict names the violated rule + missing artifact + next step.

## No Analog Found

All 38 files — greenfield repo. Per-file authoritative substitute sources are listed in the File Classification table and Pattern Assignments above. The planner should treat RESEARCH.md Code Examples 1–5 as copy-from sources of equal standing to codebase analogs (they were verified against official docs per RESEARCH Sources), and the `[ASSUMED]`-tagged items (A1–A10) as spike-gated, never copy-blind.

## Metadata

**Analog search scope:** entire repo root (`Glob **/*.{mjs,js,ts,yml,yaml,json,sh,ps1}` + directory listing) — only `.planning/` internals and docs found
**Files scanned:** full tree (docs-only: `.planning/`, `product/`, `requirements/`, `.code-review-graph/`, root `CLAUDE.md`)
**Pattern extraction date:** 2026-06-11
**Spec sources read in full:** `product/methodology/AI-COWORK.md` (170 lines), `product/cli/CLAUDE-CODE-RUNTIME.md` (81 lines), `product/cli/PRESET-SPEC.md` (102 lines), `01-CONTEXT.md`, `01-RESEARCH.md` (693 lines)
