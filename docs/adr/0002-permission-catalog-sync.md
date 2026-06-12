# ADR 0002: Permission catalog code↔DB sync — code is the source of truth

## Status

Proposed

Ratification: developer review at Phase 1 verification flips Status to Accepted.
This decision locks the FR-B11 mechanism; Phase 3 (AUTHZ-03) implements against
it without re-deciding.

## Context

The authorization design defines a permission catalog: every permission has
`code` (format `<module>.<resource>:<action>`, e.g. `iam.users:read`), `name`,
`description`, `module`, `resource`, `action`, `risk_level`
(Low/Medium/High/Critical), `status` (Active/Deprecated/Removed), and
`is_system`. The catalog lives in a DB table so admins can browse it and grant
permissions to roles — but permissions are only meaningful when they correspond
to real code paths (`@RequirePermission` checks on endpoints and services).

Requirement FR-B11 (REQUIREMENTS AUTHZ-03) mandates: a code↔DB sync mechanism
with a **deprecated-before-delete** rule, and the mechanism must be locked by
ADR before implementation. Two failure modes must be impossible:

1. Code references a permission that the DB catalog does not know — grants
   cannot be administered, enforcement silently has no admin-visible identity.
2. A permission is removed from code while role grants still reference it —
   silent privilege drift; admins keep granting a right that no longer guards
   anything, or (worse) the row is deleted while grants dangle.

The authorization model also forbids hard-coded roles in business logic
(AUTHZ-01) while permissions themselves are code-declared constants — the
catalog must therefore be derivable from code, not hand-maintained in the DB.

## Decision

**Code is the source of truth.** The mechanism:

1. **Declaration:** permissions are declared as Java constants — one catalog
   class per Modulith module — carrying the full metadata set (`code` in
   `<module>.<resource>:<action>` form per AUTHZ-01, plus name, description,
   resource, action, risk level). The constants are what
   `@RequirePermission` references; no string literals at call sites.
2. **Sync trigger — application startup:** a startup sync component (runs
   before the app serves traffic) reconciles the DB catalog table against the
   code-declared set:
   - codes present in code but not in DB → **insert** (status `Active`);
   - codes present in both → **update metadata** (name, description, module,
     resource, action, risk_level) so the DB never drifts from code;
   - codes present in DB but missing from code → **mark `status = Deprecated`**
     — never delete (deprecated-before-delete). Physical removal (`Removed`)
     happens only via an explicit, human-approved migration after the grace
     window.
3. **Fail condition:** startup **FAILS** (application refuses to boot) if a
   `Deprecated` code is still referenced by any role grant after its grace
   window has elapsed. A deprecated-but-granted permission inside the window
   logs a warning with the offending grants; past the window it is a boot
   error naming the code and the roles that still reference it.

## Consequences

- The catalog is deterministic and reproducible: drop the table, restart, and
  the `Active` set is rebuilt from code. Only grant data and
  deprecation history carry state.
- The sync component is a plain Spring bean — unit-testable with an in-memory
  declared-set and Testcontainers-backed integration tests (insert / update /
  deprecate / fail-on-referenced-deprecated paths each get a test).
- Phase 3 (AUTHZ-03) implements: the per-module catalog constant classes, the
  startup sync component, the grace-window configuration property, and the
  test suite above.
- Removing a permission becomes a two-step, audit-visible process: delete the
  constant (code review catches intent) → sync marks `Deprecated` → grants are
  migrated off → explicit migration sets `Removed`. Silent deletion is
  impossible by construction — this is the control for the
  "permission silently deleted while still granted" elevation threat.
- ADR 0003's detection gate composes cleanly: every `@RequirePermission`
  reference points at a declared constant, so undeclared usage is statically
  detectable.

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| Flyway-migration-maintained catalog (each permission added by a hand-written migration) | Drifts from code: nothing forces a migration when a constant is added or removed; manual, error-prone, and the DB silently becomes a second source of truth. |
| Annotation-processor build-time export + migration diff (generate catalog SQL at compile time, diff in CI) | Heavier toolchain (JSR-269 processor + generated-artifact discipline) for the same guarantees a startup sync achieves with a plain bean; adds a codegen step agents can mis-handle. |
| DB as source of truth (admins create permissions, code looks them up) | Violates the model: permissions must map to real code paths; code-declared constants are what agents and reviewers can read (agent-readability), and "no hard-coded roles BUT code-declared permissions" is the locked design. |

## Requirements traceability

- FR-B11 / AUTHZ-03 — catalog fields, sync, deprecated-before-delete (this ADR
  locks the mechanism).
- AUTHZ-01 — `<module>.<resource>:<action>` code format, constants not strings.
- Consumed by Phase 3 implementation; gate principles per the guardrail catalog
  (CI-blocking, locally runnable, failure names the rule).
