# Preset Contract Specification

**Status:** Draft 1.1 — 2026-06-10 (1.1: agent-config hand-off targets Claude Code pack; multi-runtime emission = v2)
**Scope:** What a tech-stack preset must provide to be generatable by `cowork-cli`. First preset: `react-springboot-modulith`. Contract exists so the second preset doesn't require a CLI rewrite.

---

## 1. Definition

A **preset** is a self-contained directory tree + manifest the CLI renders into a working project. Valid iff a freshly generated project passes its sanity build (§6) on Win/Mac/Linux.

## 2. Layout

```
presets/{preset-id}/
├── preset.json                # manifest (§3)
├── template/                  # project tree with placeholders
│   ├── backend/...
│   ├── frontend/...
│   ├── infra/...
│   ├── docs/...               # methodology docs copied verbatim
│   ├── specs/000-example/     # worked S→P→I→V example
│   ├── CLAUDE.md.hbs          # root instruction file (rendered)
│   ├── backend/CLAUDE.md.hbs
│   ├── frontend/CLAUDE.md.hbs
│   └── ...
└── README.md                  # shown in CLI picker
```

## 3. Manifest (`preset.json`)

```jsonc
{
  "id": "react-springboot-modulith",
  "name": "React 19 + Spring Boot 4 Modulith",
  "description": "Full-stack modular monolith: multi-IdP, multi-tenant, i18n/a11y, observability",
  "minNode": "22",
  "requires": ["java21", "docker"],          // pre-gen check, warn-only
  "placeholders": ["projectName", "groupId", "artifactId"],
  "computed": {
    "packageRoot": "{{groupId}}.{{artifactIdSanitized}}",
    "packagePath": "{{packageRoot | dots-to-slashes}}"
  },
  "binaryGlobs": ["**/*.png", "**/*.svg", "**/*.jar", "**/mvnw*"],
  "executableGlobs": ["**/mvnw", "**/*.sh"],
  "options": [
    { "id": "designWorkflow", "type": "boolean", "default": true },
    { "id": "strictness", "type": "enum", "values": ["standard", "strict"], "default": "standard" }
  ],
  "postGen": ["git-init", "install?", "sanity-build?"],   // ? = prompted, skippable
  "sanity": {
    "backend": "./mvnw -q verify -DskipITs",
    "frontend": "npm ci && npm run build"
  }
}
```

## 4. Placeholder & Rendering Rules

1. **Token replacement only in v1** (Handlebars-style). No AST transforms — greenfield emission doesn't need them.
2. **Computed values, never extra questions:** `packageRoot` from groupId+artifactId; Java paths rendered via templated directory names (`template/backend/src/main/java/{{packagePath}}/...`).
3. **Binary files copied byte-for-byte** (`binaryGlobs`), never rendered.
4. **Line endings:** stored LF; `.gitattributes` (`* text=auto eol=lf`, `.cmd`/`.bat` CRLF exceptions) ships in template. Renderer preserves stored endings.
5. **No orphan placeholders:** post-render scan for `{{` outside binaryGlobs fails generation.
6. **Idempotent re-render** (prep for `cowork update` v1.x): same inputs → byte-identical output.
7. **No symlinks in template** — Claude Code-first removed the need (no CLAUDE.md→AGENTS.md link); keeps Windows trivially safe.

## 5. Claude Code Pack Hand-off

Preset provides instruction-file sources (`CLAUDE.md.hbs` ×3) and skill sources; the CLI's emission step (CLAUDE-CODE-RUNTIME.md) renders them plus `.claude/settings.json` hooks (strictness-aware), `.claude/skills/`, and `.mcp.json` (if designWorkflow).

Preset does NOT hardcode runtime mechanics — emission is CLI-owned (pure function), so v2 runtimes never touch presets.

## 6. Validity Gate (CI for presets)

Preset change merges only when generation matrix is green:

```
matrix: [windows-latest, ubuntu-24.04, macos-latest]
steps:
  1. cowork generate --preset {id} --name smoke --group-id com.acme --yes
  2. cd smoke && {sanity.backend}
  3. cd smoke/frontend && {sanity.frontend}
  4. assert: no "{{" in tree; initial commit exists; CLAUDE.md ×3 exist;
     .claude/settings.json hooks present; specs/000-example/ present
```

Same guardrail principle as the methodology: preset compliance enforced by a deterministic gate, not review.

## 7. First Preset: `react-springboot-modulith`

Content contract = reference docs (`docs/ARCHITECTURE.md`, ADRs 0001–0004, module canvases) with amendments:

- **12 modules** — runtime `aiagent` module removed (pivot 2026-06-10). Module-count assertion = 12.
- Adds methodology obligations (AI-COWORK.md §11): specs/ dir + worked example, PR template, plan-compliance CI check, CODEOWNERS, branch-protection docs.
- Everything else stands: module DAG, multi-IdP, tenancy, event registry, observability, i18n/a11y, guardrails, Compose stack, K8s manifests.

**Template-first:** preset built as a real repository first; templating is a build step (`repo → presets/{id}/template/`), not a fork. The real repo stays the preset's development environment.

---
*Draft 1.1 — 2026-06-10. Scaffold-CLI research: composable installers deferred (single preset), Copier `update` noted for v1.x, JHipster multi-language pitfalls addressed in §4.*
