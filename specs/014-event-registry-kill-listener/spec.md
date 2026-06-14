# Spec 014: JDBC Event Publication Registry — Kill-Listener Durability

## Status

Approved

## Objective

Prove the Spring Modulith JDBC EPR is durable: events published in a committed transaction
survive listener crashes and are redelivered exactly once.

Add bounded-retry support (D-12) via `BoundedRetryListenerSupport` in `shared::events`.

Complete Q-004 gate split by adding `backend-unit`, `backend-integration`, and
`kill-listener-test` gates to `run-gate.mjs`.

## Scope

| Item | Description |
|------|-------------|
| `shared::events` named interface | New sub-package exposing `BoundedRetryListenerSupport` |
| `BoundedRetryListenerSupport` | In-memory per-event-ID attempt counter; throws on exceed |
| `EventPublicationMetrics` | Micrometer counter for retry-bound-exceeded events |
| `ObservabilityConfig` update | Wires `BoundedRetryListenerSupport` + `EventPublicationMetrics` |
| `V2__side_effect.sql` | Migration for idempotency test table |
| `BoundedRetryTest` | Unit tests for `BoundedRetryListenerSupport` — `@Tag("unit")` |
| `KillListenerTest` | Integration test extending `PostgresIntegrationTest` |
| Gate updates | `backend-unit`, `backend-integration`, `kill-listener-test` in `run-gate.mjs` |

## Module Boundary Change

`observability` gains `shared::events` dependency:

```java
@ApplicationModule(allowedDependencies = {
    "shared", "shared::scheduling", "shared::events", "appconfig::spi"
})
package com.acme.app.observability;
```

`shared::events` has no `allowedDependencies` (sub-package of `shared` which has none).

## Kill-Listener Test Protocol

1. Register `SampleEventListener` via `@TestConfiguration` (not `@Component`)
2. Publish `SampleEvent` inside a `TransactionTemplate.execute()` callback
3. Listener annotated with `@TransactionalEventListener` throws on first invocation
4. EPR keeps publication `INCOMPLETE` (listener failed)
5. `incompletePublications.resubmitIncompletePublicationsOlderThan(Duration.ZERO)`
6. Listener succeeds; writes idempotent row to `side_effect`
7. Second resubmit: idempotency check prevents duplicate write

## Idempotency Strategy

`side_effect` table has `UNIQUE` constraint on `event_id`. Listener checks
`COUNT(*)` before insert — check-before-write with `UNIQUE` as backstop.

## Acceptance Criteria

- `BoundedRetryTest` — 4 unit tests pass, no container needed
- `KillListenerTest` — 2 integration tests pass against real PostgreSQL
- `task verify:fast` TOTAL < 60,000ms
- ArchUnit + Modulith verify green after module boundary change
- No new module added to the module set (named interfaces are sub-packages)
