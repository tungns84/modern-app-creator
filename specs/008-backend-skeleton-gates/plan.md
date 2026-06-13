# Plan 008: Backend Skeleton + Shared Module + Architecture Gates

tier: T3

## Why this tier

Touches `**/pom.xml` (T3), `**/package-info.java` (T3), `scripts/checks/**` (T3),
`Taskfile.yml` (T3). Any of these paths alone triggers T3. This plan touches all four
categories simultaneously — classify T3 without reservation.

## Files to touch

- `backend/pom.xml` — new: Spring Boot 4.0.7 parent, Modulith 2.0.6 BOM, Spring Cloud
  2025.1.2 BOM, Testcontainers 2.x BOM, ArchUnit 1.4.2 pin, Flyway Boot-4 pair,
  bpm-off Maven profile, Surefire bpm.enabled passthrough, JDK 25
- `backend/mvnw` — new: Maven Wrapper launcher (Maven 3.9.16)
- `backend/mvnw.cmd` — new: Maven Wrapper launcher (Windows)
- `backend/.mvn/wrapper/maven-wrapper.properties` — new: pins Maven 3.9.16
- `backend/src/main/java/com/acme/app/Application.java` — new: @SpringBootApplication entry point
- `backend/src/main/java/com/acme/app/shared/package-info.java` — new (T3): @ApplicationModule(allowedDependencies = {})
- `backend/src/main/java/com/acme/app/shared/scheduling/ScheduledTask.java` — new: sanctioned scheduling interface
- `backend/src/main/java/com/acme/app/shared/scheduling/ScheduledTaskRegistrar.java` — new: only class allowed to carry @Scheduled
- `backend/src/main/java/com/acme/app/shared/query/NativeQuery.java` — new: sanctioned native-query wrapper
- `backend/src/main/resources/application.yml` — new: Modulith EPR + actuator config
- `backend/src/main/resources/db/migration/shared/V1__shared_baseline.sql` — new: shared module Flyway baseline
- `backend/src/test/resources/application-test.yml` — new: test profile config
- `backend/src/test/java/com/acme/app/ModulithVerifyTest.java` — new: GATE-01 dynamic name-set assertion
- `backend/src/test/java/com/acme/app/ArchitectureGatesTest.java` — new: GATE-02 ArchUnit rules
- `backend/src/test/java/com/acme/app/PostgresIntegrationTest.java` — new: FOUND-05 Testcontainers PG16 base
- `backend/src/test/java/com/acme/app/SharedFlywaySchemaTest.java` — new: per-module Flyway schema assertion
- `scripts/checks/run-gate.mjs` — modify (T3): add fast/full mode, Phase 2 gates
- `Taskfile.yml` — modify (T3) only if backend:build helper needed; gate-set lives in run-gate.mjs

## Modules affected

`com.acme.app.shared` — new; `allowedDependencies = {}` (no upstream deps)

## Events / SPI surfaces

n/a — Plan 01 scope is structural skeleton only; no domain events or SPI surfaces yet

## Migrations

`db/migration/shared/V1__shared_baseline.sql` — creates a `shared`-owned table
(specifically: `scheduled_task_audit` — execution audit log owned by the shared scheduling wrapper).
This is real shared-module footprint, not a throwaway migration (per D-04).

## Tests

- `ModulithVerifyTest.java` — GATE-01: ApplicationModules.of(Application.class).verify()
  + dynamic name-set assertion (BASE_MODULES = Set.of("shared") for Plan 01 state)
- `ArchitectureGatesTest.java` — GATE-02: 7 ArchUnit rules (NO_FIELD_INJECTION,
  NO_BARE_SCHEDULED, NO_NATIVE_QUERY_OUTSIDE_WRAPPER, NO_TRANSACTIONAL_PRIVATE,
  NO_ENTITY_IN_CONTROLLERS, NO_VALUE_OUTSIDE_APPCONFIG, NO_ENVIRONMENT_INJECTION_OUTSIDE_APPCONFIG)
- `PostgresIntegrationTest.java` — FOUND-05: Testcontainers 2.x @ServiceConnection PG16 base
- `SharedFlywaySchemaTest.java` — FOUND-05: asserts shared baseline in flyway_schema_history

## Constitution rules that apply

- `backend/CLAUDE.md`: constructor injection only; no H2; Testcontainers 2.x only (not 1.x idioms); Jackson 3 (`tools.jackson.*`); JDK 25
- `CLAUDE.md`: tech stack locked — Boot 4.0.7, Modulith 2.0.6, JDK 25, ArchUnit ≥1.4.2; no unapproved T3 writes
- AI-COWORK §6: T3 boundary writes require `Approved-by:` filled via H2 gate before merge
- Gate rule: fix the code, never the gate; gate tests must assert rules FIRE on violations

## Approval

Approved-by: tungns84
