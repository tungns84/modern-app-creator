# Plan 009: AppConfig Module

tier: T3

Approved-by:

## Context

Part of Phase 02 Plan 02-02. Executed on branch `feat/008-backend-skeleton-gates` under T3 approval from spec 008 (`Approved-by: tungns84` in `specs/008-backend-skeleton-gates/plan.md`).

## Files to Touch

### T3 (module boundary declarations)
- `backend/src/main/java/com/acme/app/appconfig/package-info.java` — new, `@ApplicationModule(allowedDependencies = {"shared"})`
- `backend/src/main/java/com/acme/app/appconfig/spi/package-info.java` — new, `@NamedInterface("spi")`

### Application sources
- `backend/src/main/java/com/acme/app/appconfig/spi/EventRetryProperties.java` — new
- `backend/src/main/java/com/acme/app/appconfig/spi/EventRetentionProperties.java` — new
- `backend/src/main/java/com/acme/app/appconfig/spi/ObservabilityProperties.java` — new
- `backend/src/main/java/com/acme/app/appconfig/AppConfigPropertiesRegistration.java` — new
- `backend/src/main/java/com/acme/app/appconfig/ModuleFlywayLocationsCustomizer.java` — new
- `backend/src/main/resources/application-consul.yml` — new

### Test sources
- `backend/src/test/java/com/acme/app/appconfig/AppConfigModuleTest.java` — new
- `backend/src/test/java/com/acme/app/appconfig/AppConfigPropertiesValidationTest.java` — new

### Modified
- `backend/src/main/resources/application.yml` — remove static `spring.flyway.locations` (customizer owns it)
- `backend/src/test/java/com/acme/app/ModulithVerifyTest.java` — BASE_MODULES += "appconfig"

## Scaffold Tooling

- `scripts/new-module/scaffold.mjs` — new (implements new-module skill contract)
- `scripts/new-module/tests/scaffold.test.mjs` — new
- `.claude/skills/new-module/SKILL.md` — update status from Skeleton → full implementation
