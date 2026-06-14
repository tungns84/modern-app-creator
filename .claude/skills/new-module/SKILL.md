---
name: new-module
description: Scaffold a new Spring Modulith module — use when asked to add a backend module, bounded context, or new top-level package under com.acme.app.
---

# new-module

Scaffold a new Spring Modulith module in `com.acme.app`.

## Usage

```bash
node scripts/new-module/scaffold.mjs <name> [options]
```

Options:
- `--allowed-deps d1,d2`  modules this module may import (comma-separated)
- `--exposes-spi`          create `spi/package-info.java` with `@NamedInterface("spi")`
- `--exposes-events`       create `events/.gitkeep` placeholder
- `--has-tables`           create `db/migration/<name>/` and register in ModuleFlywayLocationsCustomizer
- `--root <path>`          override project root (default: repo root)
- `--dry-run`              print actions without writing

## Outputs

| File | Notes |
|------|-------|
| `backend/src/main/java/com/acme/app/<name>/package-info.java` | T3 — `@ApplicationModule(allowedDependencies=...)` |
| `backend/src/main/java/com/acme/app/<name>/spi/package-info.java` | T3 — `@NamedInterface("spi")` — only when `--exposes-spi` |
| `backend/src/main/java/com/acme/app/<name>/events/.gitkeep` | Only when `--exposes-events` |
| `backend/src/main/resources/db/migration/<name>/` | Only when `--has-tables` |
| `backend/src/test/java/com/acme/app/<name>/<Name>ModuleTest.java` | `@ApplicationModuleTest` stub |
| `specs/NNN-<name>/spec.md` | Draft spec |
| `specs/NNN-<name>/plan.md` | Plan template (`Approved-by:` blank — fill before T3 writes) |

Side effects:
- Bumps `ModulithVerifyTest.BASE_MODULES` with `"<name>"`
- Appends `classpath:db/migration/<name>` to `ModuleFlywayLocationsCustomizer` when `--has-tables`

All outputs are idempotent (existing files are skipped).

## Tier

T3 — scaffold writes `package-info.java` files which are T3 path.
Specs plan.md template has `Approved-by:` blank. Fill it with the spec number approval before proceeding.

## Tests

```bash
node --test scripts/new-module/tests/scaffold.test.mjs
```
