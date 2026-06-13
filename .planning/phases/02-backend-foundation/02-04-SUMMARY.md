# Plan 02-04 Execution Summary — Observability Module

## Status: COMPLETE

**Branch:** feat/008-backend-skeleton-gates
**Approved-by:** tungns84 (T3 authorization)

---

## Deliverables

### New Files
- `backend/src/main/java/com/acme/app/observability/ObservabilityConfig.java` — module Spring config; wires `MdcAllowlistFilter` and conditionally `EventPublicationCleanupTask`
- `backend/src/main/java/com/acme/app/observability/MdcAllowlistFilter.java` — `OncePerRequestFilter` that strips non-allowlisted MDC keys in `finally` block to prevent PII leakage across thread-pool request reuse
- `backend/src/main/java/com/acme/app/observability/EventPublicationCleanupTask.java` — implements `ScheduledTask`; deletes completed Modulith event publications older than `EventRetentionProperties.completedAfter()`
- `backend/src/main/resources/logback-spring.xml` — dual-mode: plain console (default) / JSON via `logstash-logback-encoder` when `json` Spring profile active; allowlisted MDC keys hardcoded in XML
- `backend/src/main/java/com/acme/app/shared/scheduling/package-info.java` — `@NamedInterface("scheduling")` so `observability` (and future modules) can reference `ScheduledTask`

### Modified Files
- `backend/pom.xml` — added 5 observability deps: `spring-boot-starter-actuator`, `micrometer-registry-prometheus` (runtime), `micrometer-tracing-bridge-otel` (runtime), `opentelemetry-exporter-otlp` (runtime), `logstash-logback-encoder:8.0` (runtime, explicitly pinned — not Boot-managed)
- `backend/src/main/java/com/acme/app/appconfig/spi/ObservabilityProperties.java` — added `stalenessPublished` and `stalenessResubmitted` Duration fields (single source of truth for D-12 staleness config)
- `backend/src/main/resources/application.yml` — Modulith staleness values use property placeholders `${acme.observability.staleness-*}`; new `acme.observability.*` section owns the literal values
- `backend/src/main/java/com/acme/app/observability/package-info.java` — added `shared::scheduling` to `allowedDependencies`

### Test Files
- `MdcAllowlistTest` — 3 pure unit tests; no Spring context; verifies allowlist/strip logic
- `ActuatorProbeTest` — 2 integration tests; `RANDOM_PORT` + `RestTemplate`; confirms `/actuator/health/liveness` and `/actuator/health/readiness` return HTTP 200
- `EventPublicationCleanupTaskTest` — 2 Mockito unit tests; verifies `name()` and `execute()` delegation
- `StalenessPropertiesBindingTest` — 2 `@SpringBootTest` tests; verifies D-12 property binding (10m / 30m defaults)
- `ObservabilityModuleTest` — 3 module tests (`BootstrapMode.DIRECT_DEPENDENCIES`); verifies Modulith structure, bean registration, and MDC defaults

---

## Non-Obvious Fixes Applied

### 1. `@AutoConfigureMockMvc` package moved in Boot 4
Boot 4 moved `@AutoConfigureMockMvc` from `org.springframework.boot.test.autoconfigure.web.servlet` to `org.springframework.boot.webmvc.test.autoconfigure` (in `spring-boot-webmvc-test` artifact). That artifact is not included by `spring-boot-starter-test`. Rewrote `ActuatorProbeTest` to use `RANDOM_PORT` + plain `RestTemplate` + `@Value("${local.server.port}")` — no extra dependency needed.

### 2. `shared.scheduling` is an internal sub-package
Spring Modulith treats sub-packages without `@NamedInterface` as internal. Even though `shared` was in `observability`'s `allowedDependencies`, accessing `shared.scheduling.ScheduledTask` violated the module boundary. Fixed by:
- Adding `package-info.java` with `@NamedInterface("scheduling")` to `com.acme.app.shared.scheduling`
- Adding `"shared::scheduling"` to `observability`'s `allowedDependencies`

### 3. `@ConditionalOnBean(CompletedEventPublications.class)`
`EventPublicationCleanupTask` bean is conditional on `CompletedEventPublications` being present. Module tests that exclude EPR autoconfiguration (`JdbcEventPublicationAutoConfiguration`, `EventPublicationAutoConfiguration`) don't fail trying to create a bean that requires a DB-backed registry.

### 4. D-12 staleness single source of truth
`ObservabilityProperties` record owns `stalenessPublished` / `stalenessResubmitted` Duration fields. The `spring.modulith.events.staleness.*` yaml block uses `${acme.observability.staleness-*}` property placeholders. Literal values (`10m`, `30m`) live only under `acme.observability.*`.

---

## Test Results
```
Tests run: 20, Failures: 0, Errors: 0, Skipped: 0  (full set)
```

## Gate Results
```
GATE hooks-test      1743ms PASS
GATE checks-test     3517ms PASS
GATE claude-md-check  201ms PASS
GATE settings-lint     66ms PASS
GATE skills-lint       46ms PASS
GATE meta-link-lint    72ms PASS
GATE compose-config   133ms PASS
GATE backend-compile 2835ms PASS
GATE archunit        5832ms PASS
GATE modulith-verify 6589ms PASS
TOTAL               21034ms PASS
```
