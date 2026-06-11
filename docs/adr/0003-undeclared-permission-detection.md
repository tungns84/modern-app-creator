# ADR 0003: Undeclared-permission detection — static-first, two-layer gate

## Status

Proposed

Ratification: developer review at Phase 1 verification flips Status to Accepted.
This decision locks the FR-B13/GATE-11 mechanism; Phase 3 wires the gate
against it without re-deciding.

## Context

Requirement FR-D11 (REQUIREMENTS GATE-11) mandates: a protected API endpoint
shipped without a declared permission is a CI failure, and the detection
mechanism must be locked by ADR before implementation. FR-B13 (AUTHZ-05) makes
`@RequirePermission` plus code-declared permission constants the enforcement
primitives.

The threat this gate closes is elevation by omission: an endpoint added without
any permission declaration is implicitly public — no reviewer prompt, no
runtime check, no audit trail. Prompts and review discipline are not a security
boundary; the rule must be machine-enforced (deterministic gate, failure
message names the violated rule so agents self-correct).

Gate principles that constrain the design (guardrail catalog): CI-blocking,
locally runnable, fast feedback preferred — the project's `verify --fast` gate
set is static-only (no containers, no Spring context boot), with
container-backed checks reserved for `verify --full`.

## Decision

**Two-layer static-first detection:**

1. **Primary — ArchUnit rule (static, `verify --fast`):** an ArchUnit rule
   asserts that every REST handler method (any method annotated with a
   `@RequestMapping`-family annotation: `@GetMapping`, `@PostMapping`,
   `@PutMapping`, `@PatchMapping`, `@DeleteMapping`, `@RequestMapping`) carries
   either `@RequirePermission` or an explicit `@PublicEndpoint` opt-out
   annotation. The rule runs in `verify --fast` (pure bytecode analysis, no
   Spring context, no containers) and its failure message names the violating
   class and method — agents and humans fix the code, not the gate.
2. **Backstop — Spring context test (runtime wiring, `verify --full`):** an
   integration test boots the application context, enumerates every entry in
   `RequestMappingHandlerMapping`, and asserts the same property at the wiring
   level: each mapped handler method resolves to `@RequirePermission` or
   `@PublicEndpoint` (including annotations inherited via meta-annotations or
   composed annotations). This catches edge cases pure bytecode analysis can
   miss — custom composed mappings, meta-annotated controllers, handler methods
   registered programmatically.

**The opt-out is explicit and auditable:** `@PublicEndpoint` is the only way to
ship an unprotected handler. It is a single greppable token — reviewers audit
public surface by searching one annotation, and the CODEOWNERS rule on
`security/**` puts every change to the annotation itself under second review.
There are no implicit public endpoints.

## Consequences

- GATE-11 wires in Phase 3 as: the ArchUnit rule class (added to the existing
  architecture-rules test suite, pinned ArchUnit ≥ the version supporting the
  toolchain class-file level) + the `RequestMappingHandlerMapping` context
  test.
- `@PublicEndpoint` and `@RequirePermission` are defined in the security
  module's API surface; both are T3 paths (security config) — changes require
  an approved plan.
- Fast feedback: the primary layer fails locally in seconds (`verify --fast`)
  before any container or context boot; the backstop runs where integration
  tests already run (`verify --full`, CI ubuntu leg).
- Combined with ADR 0002 (permissions are code-declared constants),
  `@RequirePermission` references are statically resolvable — a reference to a
  non-existent permission constant is a compile error, so "declared but
  unknown permission" cannot occur.
- New handler-mapping styles (e.g. functional router endpoints) are NOT covered
  by the annotation-based rule; adopting one requires extending this ADR first
  (constitution change, T3).

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| Runtime-only enumeration test as the sole layer (context test without the ArchUnit rule) | Slower feedback: requires Spring context boot, so the violation surfaces only in `verify --full`/CI instead of seconds-fast local static analysis; keeps it as backstop, not primary. |
| OpenAPI-spec diffing (generate the spec, diff exposed operations against a permission manifest) | Detects after generation — indirect and late: the springdoc pipeline must run first, mapping operations back to handler methods is lossy, and a misconfigured spec generator hides endpoints from the diff entirely. |
| PreToolUse hook / prompt-level rule only | Prompts and session hooks are not a security boundary; L1 is best-effort while CI is the floor — a rule that exists only in prose or session tooling will eventually be violated. |

## Requirements traceability

- FR-B13 / AUTHZ-05 — `@RequirePermission` enforcement primitive.
- FR-D11 / GATE-11 — protected API without declared permission = CI fail; this
  ADR locks the detection mechanism.
- Composes with ADR 0002 (code-declared permission constants).
