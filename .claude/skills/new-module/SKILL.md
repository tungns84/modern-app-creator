---
name: new-module
description: Scaffold a new Spring Modulith module — use when asked to add a backend module, bounded context, or new top-level package under com.acme.app.
---

# new-module — Skeleton contract (implemented in Phase 2)

## CONTRACT

tier: T3 — a new module is a boundary change; skill output includes a
pre-filled specs/NNN plan.md template so the H2 approval artifact exists
before any scaffold write.

**Inputs:** module name, allowed dependencies (other module names), whether
the module exposes events and/or an `::spi` surface.

**Outputs:**
- `backend/src/main/java/com/acme/app/<module>/package-info.java` with
  `@ApplicationModule(allowedDependencies = ...)`
- `spi/` and `events/` packages (when declared)
- per-module Flyway folder
- `@ApplicationModuleTest` stub
- module-count assertion bump
- pre-filled `specs/NNN-<module>/plan.md` template (Approved-by left empty)

## Status

Skeleton — implemented in Phase 2. Do NOT improvise an implementation from
this contract; report to the human instead.
