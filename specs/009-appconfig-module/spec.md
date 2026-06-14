# Spec 009: AppConfig Module

## Status

Approved

## Objective

Add the `appconfig` module to `com.acme.app`. This module owns all typed `@ConfigurationProperties` records for the application, provides a single `ModuleFlywayLocationsCustomizer` bean that owns the programmatic Flyway location list, and integrates the Consul config profile.

## Module Boundary

```java
@ApplicationModule(allowedDependencies = { "shared" })
package com.acme.app.appconfig;
```

## Named Interface

`appconfig::spi` — `com.acme.app.appconfig.spi.*` is accessible to modules that declare `"appconfig::spi"` in their `allowedDependencies`. All property records live in this package so downstream modules can inject them without importing from the root package.

## Exposed Types (spi/)

| Type | Prefix | Purpose |
|------|--------|---------|
| `EventRetryProperties` | `acme.events.retry` | Bounded-retry config (maxAttempts, initialDelay, multiplier, maxDelay) — D-12 |
| `EventRetentionProperties` | `acme.events.retention` | EPR completed-record cleanup threshold — D-10 |
| `ObservabilityProperties` | `acme.observability` | MDC PII allowlist |

## Internal Types (appconfig/)

| Type | Purpose |
|------|---------|
| `AppConfigPropertiesRegistration` | `@EnableConfigurationProperties` for all records |
| `ModuleFlywayLocationsCustomizer` | Single `FlywayConfigurationCustomizer` owning the module location list; scaffold append target |

## Consul Profile

`application-consul.yml` activates when `spring.profiles.active=consul`. Consul config source is optional (`optional:consul:`) so the app boots without Consul in local/test.

## hasTables

`false` — appconfig has no database tables. `ModuleFlywayLocationsCustomizer` is the OWNER of the location list that other modules (with hasTables=true) append to.

## Acceptance Criteria

- `AppConfigModuleTest` boots the module slice without a DataSource (property-only; DataSource/Flyway auto-config excluded)
- `AppConfigPropertiesValidationTest` confirms validation annotations fire for out-of-range values (no Spring context)
- `ModulithVerifyTest.BASE_MODULES` contains "appconfig"
- `ArchitectureGatesTest` passes with appconfig on the classpath (no new violations)
