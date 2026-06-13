# Plan 014: JDBC Event Publication Registry — Kill-Listener Durability

tier: T3

Approved-by: tungns84

## Files to Touch

### New — Main Sources
- `backend/src/main/java/com/acme/app/shared/events/package-info.java` — `@NamedInterface("events")` (T3 boundary)
- `backend/src/main/java/com/acme/app/shared/events/BoundedRetryListenerSupport.java` — in-memory retry counter
- `backend/src/main/java/com/acme/app/observability/EventPublicationMetrics.java` — Micrometer counter

### Modified — Main Sources
- `backend/src/main/java/com/acme/app/observability/package-info.java` — add `shared::events` (T3 boundary)
- `backend/src/main/java/com/acme/app/observability/ObservabilityConfig.java` — add two new factory beans

### New — Migrations
- `backend/src/main/resources/db/migration/shared/V2__side_effect.sql` — idempotency table

### New — Test Sources
- `backend/src/test/java/com/acme/app/observability/SampleEvent.java` — test event record
- `backend/src/test/java/com/acme/app/observability/SampleEventListener.java` — controllable listener
- `backend/src/test/java/com/acme/app/observability/TestEventConfig.java` — `@TestConfiguration` registering listener
- `backend/src/test/java/com/acme/app/observability/BoundedRetryTest.java` — unit tests (`@Tag("unit")`)
- `backend/src/test/java/com/acme/app/observability/KillListenerTest.java` — integration test

### Modified — Scripts
- `scripts/checks/run-gate.mjs` — replace placeholder with 3 gate entries (T3)

## Execution Order

1. Flyway migration (`V2__side_effect.sql`) — stable schema before tests
2. `shared::events` package-info + `BoundedRetryListenerSupport`
3. `EventPublicationMetrics`
4. `observability` package-info update
5. `ObservabilityConfig` update
6. Test fixtures (`SampleEvent`, `SampleEventListener`, `TestEventConfig`)
7. `BoundedRetryTest` + `KillListenerTest`
8. `run-gate.mjs` gate entries
9. Run `BoundedRetryTest` (unit, no container)
10. Run `KillListenerTest` (integration, Testcontainers)
11. Run `task verify:fast` — confirm TOTAL < 60,000ms
