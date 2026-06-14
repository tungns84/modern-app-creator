# Plan 02-05 Execution Summary — EPR Durability Proof + Gate Split

## Status: COMPLETE

**Branch:** feat/008-backend-skeleton-gates
**Approved-by:** tungns84 (T3 authorization)

---

## Deliverables

### New Production Files
- `backend/src/main/java/com/acme/app/shared/events/package-info.java` — `@NamedInterface("events")` on `com.acme.app.shared.events`; exposes the sub-package to `observability` without widening `shared`'s own `allowedDependencies = {}`
- `backend/src/main/java/com/acme/app/shared/events/BoundedRetryListenerSupport.java` — Q-2 Option A bounded-retry guard; `ConcurrentHashMap<UUID, AtomicInteger>` per event-ID; `guard()` throws + fires `onBoundExceeded` callback when `maxAttempts` exceeded; `markCompleted()` resets counter; no appconfig imports (only `java.util`)
- `backend/src/main/java/com/acme/app/observability/EventPublicationMetrics.java` — Micrometer counter `acme.events.retry.bound.exceeded`; incremented via `BoundedRetryListenerSupport` callback (D-12 alerting)
- `backend/src/main/resources/db/migration/shared/V2__side_effect.sql` — `side_effect (id BIGSERIAL PK, event_id UUID UNIQUE)` for idempotency proof

### Modified Production Files
- `backend/src/main/java/com/acme/app/observability/package-info.java` — added `"shared::events"` to `allowedDependencies`
- `backend/src/main/java/com/acme/app/observability/ObservabilityConfig.java` — rewritten: constructor injection of `EventRetryProperties` (DIRECT_DEPENDENCIES compat); factory beans for `EventPublicationMetrics` and `BoundedRetryListenerSupport`

### New Test Files
- `backend/src/test/java/com/acme/app/observability/SampleEvent.java` — record `(UUID id, String payload)` for test fixture
- `backend/src/test/java/com/acme/app/observability/SampleEventListener.java` — `@TransactionalEventListener` (AFTER_COMMIT, no @Async); `failNext` toggle throws before DB write; idempotent write via `COUNT(*)` check-before-insert
- `backend/src/test/java/com/acme/app/observability/TestEventConfig.java` — `@TestConfiguration` registering `SampleEventListener` as `@Bean`
- `backend/src/test/java/com/acme/app/observability/BoundedRetryTest.java` — 4 `@Tag("unit")` tests, no Spring context; proves guard/callback/independence/reset
- `backend/src/test/java/com/acme/app/observability/KillListenerTest.java` — 2 `@Tag("integration")` tests extending `PostgresIntegrationTest`; proves no-loss (INCOMPLETE→redelivered) and no-double-effect (exactly 1 side-effect row after redelivery)

### Modified Test Files
- `backend/src/test/java/com/acme/app/PostgresIntegrationTest.java` — changed to `public abstract class` so `KillListenerTest` (package `com.acme.app.observability`) can extend it

### Spec Files
- `specs/014-event-registry-kill-listener/spec.md` — durability proof objective, module boundary change, kill-listener protocol, acceptance criteria
- `specs/014-event-registry-kill-listener/plan.md` — tier T3, `Approved-by: tungns84`

### Gate Runner
- `scripts/checks/run-gate.mjs` — added 3 gates: `backend-unit` (fast=true, `-Dgroups=unit`), `backend-integration` (fast=false, `-Dgroups=integration`), `kill-listener-test` (fast=false, `-Dtest=KillListenerTest`)

---

## Non-Obvious Fixes Applied

### 1. `PostgresIntegrationTest` visibility
`KillListenerTest` lives in `com.acme.app.observability`; `PostgresIntegrationTest` in `com.acme.app`. Package-private class is inaccessible across packages. Fixed by making it `public abstract class`.

### 2. `@TransactionalEventListener` vs `@ApplicationModuleListener`
`@ApplicationModuleListener` includes `@Async`. In tests, async dispatch requires `CountDownLatch` / `Awaitility` synchronization. Used plain `@TransactionalEventListener` (AFTER_COMMIT) instead — still tracked by EPR `CompletionRegisteringAdvisor`, no async complication. Resubmission via `processEvent()` is synchronous — no sleep needed.

### 3. `afterCommit` exception propagation
Spring does not guarantee exception propagation from `afterCommit` synchronizations (may be swallowed by `TransactionSynchronizationUtils`). Test wraps `tx.execute()` in `try-catch` to handle both behaviors.

### 4. Module DAG — `shared::events` named interface
`BoundedRetryListenerSupport` takes only primitive/`Runnable` params — zero imports from appconfig. `shared.events` package exposed via `@NamedInterface("events")`. `observability` adds `"shared::events"` to its `allowedDependencies`. No cycle: `shared` retains `allowedDependencies = {}`.

### 5. Constructor injection for DIRECT_DEPENDENCIES compat
`ObservabilityConfig` constructor takes `EventRetryProperties` directly. Modulith's `DIRECT_DEPENDENCIES` mode follows constructor parameters to resolve which dependency-module beans to load — `@Bean`-method-param injection does not traverse the graph.

---

## Test Results

```
BoundedRetryTest:  Tests run: 4, Failures: 0, Errors: 0, Skipped: 0  (unit, no container)
KillListenerTest:  Tests run: 2, Failures: 0, Errors: 0, Skipped: 0  (integration, PG16)
```

## Fast Gate Results (Phase 2 baseline — 11 gates)

```
GATE hooks-test       1440ms PASS
GATE checks-test      3102ms PASS
GATE claude-md-check   189ms PASS
GATE settings-lint      45ms PASS
GATE skills-lint        49ms PASS
GATE meta-link-lint     75ms PASS
GATE compose-config    141ms PASS
GATE backend-compile  2920ms PASS
GATE archunit         6072ms PASS
GATE modulith-verify  6663ms PASS
GATE backend-unit     4937ms PASS
TOTAL               25633ms PASS   ← under 60,000ms budget (Q-004 §5)
```

## Requirements Satisfied

| Requirement | Evidence |
|-------------|----------|
| FOUND-03: no event loss + no double-effect | `KillListenerTest.eventNotLostOnListenerDeath` + `sideEffectAppliedExactlyOnceAfterRedelivery` |
| FOUND-05: real PG16 integration tests | `KillListenerTest` extends `PostgresIntegrationTest` (`@ServiceConnection` PG16, Testcontainers 2.x) |
| D-11: idempotent listeners | `SampleEventListener` check-before-insert via `side_effect.event_id UNIQUE` |
| D-12: bounded retry + metric + no silent drop | `BoundedRetryListenerSupport` + `EventPublicationMetrics` + `BoundedRetryTest` |
| AGENT-08: verify --fast < 60s | TOTAL 25633ms PASS |
| Q-004 gate split | `backend-unit` fast=true; `backend-integration` + `kill-listener-test` fast=false |
