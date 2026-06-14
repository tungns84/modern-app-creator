# Plan 02-03 Execution Summary — i18n and Caching Modules

**Status:** COMPLETE  
**Date:** 2026-06-13  
**Approved-by:** tungns84

## Deliverables

### i18n module (`com.acme.app.i18n`)
- `package-info.java` — `@ApplicationModule(allowedDependencies = {"shared", "appconfig::spi"})`
- `spi/package-info.java` — `@NamedInterface("spi")`
- `spi/MessageResolver.java` — public interface: `resolve(String key, Locale locale)`, `supportedLocales()`
- `DefaultMessageResolver.java` — package-private impl using `ResourceBundleMessageSource`
- `I18nConfig.java` — `@Configuration`, constructor-injects `I18nProperties`, produces `MessageResolver` bean
- `src/main/resources/i18n/messages_vi.properties` — 3 keys (greeting, app.name, error.generic)
- `src/main/resources/i18n/messages_en.properties` — matching 3 keys
- `I18nModuleTest.java` — 5 tests, all green

### caching module (`com.acme.app.caching`)
- `package-info.java` — `@ApplicationModule(allowedDependencies = {"shared", "appconfig::spi"})`
- `spi/package-info.java` — `@NamedInterface("spi")`
- `spi/AppCache.java` — public interface: `get(String name, String key, Supplier<T> loader)`, `evict(String name, String key)`
- `CaffeineCacheConfig.java` — `@Configuration`, constructor-injects `CacheProperties`, produces `AppCache` bean backed by Caffeine
- `CachingModuleTest.java` — 4 tests, all green

### appconfig module updates
- `AppConfigPropertiesRegistration.java` — centrally registers all 5 SPI properties: `EventRetryProperties`, `EventRetentionProperties`, `ObservabilityProperties`, `I18nProperties`, `CacheProperties`
- `spi/I18nProperties.java` — `@ConfigurationProperties(prefix = "acme.i18n")` record
- `spi/CacheProperties.java` — `@ConfigurationProperties(prefix = "acme.cache")` record

### docs/infra
- `specs/011-i18n/spec.md`, `specs/011-i18n/plan.md` (scaffold)
- `specs/012-caching/spec.md`, `specs/012-caching/plan.md` (scaffold)
- `ModulithVerifyTest.BASE_MODULES` updated to `{shared, appconfig, i18n, caching}`
- `backend/CLAUDE.md` — added `appconfig::spi` consumption pattern (DIRECT_DEPENDENCIES + constructor injection rule)

## Key Findings

### `@ApplicationModuleTest` DIRECT_DEPENDENCIES bean graph
Modulith's DIRECT_DEPENDENCIES mode includes the full dependency module's beans, but its internal bean dependency graph only traverses **constructor parameters**, not `@Bean` method parameters. A `@Configuration` class that injects a cross-module SPI bean via `@Bean` method parameter (e.g., `@Bean Foo foo(BarProperties props)`) will fail with `NoSuchBeanDefinitionException` even in DIRECT_DEPENDENCIES mode. The fix: inject via constructor.

This is why `I18nConfig` (constructor injection of `I18nProperties`) worked, while `CaffeineCacheConfig` (method-parameter injection of `CacheProperties`) failed.

### Central `@EnableConfigurationProperties` registration
All `appconfig.spi` properties are registered by `AppConfigPropertiesRegistration` in the `appconfig` module root. Consuming modules do NOT register their consumed properties. This enables the DIRECT_DEPENDENCIES pattern to work: when the `appconfig` module is loaded, all SPI property beans are available.

## Test Results

```
CachingModuleTest:   4/4 green
I18nModuleTest:      5/5 green
ModulithVerifyTest:  1/1 green
ArchitectureGatesTest: 7/7 green
Total:              17/17
Fast gates:         11/11 PASS
```
