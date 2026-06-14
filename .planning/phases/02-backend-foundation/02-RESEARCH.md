# Phase 2: Backend Foundation — Research

**Researched:** 2026-06-13
**Domain:** Spring Boot 4 / Spring Modulith 2.0 / ArchUnit / JDBC Event Publication Registry
**Confidence:** HIGH (stack locked in CLAUDE.md; patterns verified via Context7 + official docs)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Manual-first bootstrap — scaffold `shared` by hand as reference shape; codify into `new-module` skill; generate remaining 4 modules WITH the skill (4 dogfood runs).
- **D-02:** ~5 T3 specs: one for skeleton + `shared` + gates wiring; one per skill-generated module.
- **D-03:** `shared` scope minimal — scheduling wrapper, sanctioned query wrapper, genuinely shared types. NO BaseEntity/tenant_id (Phase 3). NO ProblemDetail (Phase 4).
- **D-04:** Each skill-generated module ships a minimal real functional slice (`appconfig` = typed properties + profile switch; `i18n` = vi/en resolution; `caching` = Caffeine; `observability` = MDC PII allowlist + OTel + Prometheus). Flyway folder only when module has real tables.
- **D-05:** BPM option via Maven property `bpm.enabled` (default `true`) + Maven profile `bpm-off` excluding `com/acme/app/bpm/**`. Phase 2 lands the property + dynamic name-set assertion only; `bpm-off` profile exercised in Phase 7.
- **D-06:** Assert the exact module NAME SET, not a count. Phase 2 expected set: `{shared, appconfig, i18n, caching, observability}`. `bpm` joins conditionally when `bpm.enabled=true`.
- **D-07:** `spring-cloud-consul-config` in pom always; activated via Spring profile `consul` with `spring.config.import: optional:consul:` — no Maven build branching. **Researcher must verify which Spring Cloud release train is compatible with Boot 4.0.x.**
- **D-08:** Consul proof via Testcontainers only (integration test, `verify --full`). `task up` stays at locked 6-service stack — no Consul container added.
- **D-09:** ArchUnit rule banning `@Value` and injected `Environment` outside `appconfig` module. Every other module consumes `@ConfigurationProperties` records only. Violation = build fail with rule + fix message.
- **D-10:** Mark-completed (Modulith default) + periodic cleanup job (via `shared` scheduling wrapper) deleting completed records past retention. Retention = typed property in `appconfig`.
- **D-11:** At-least-once + mandatory idempotent listeners. Kill-listener test proves BOTH: event redelivered after listener death/restart AND side-effect applied exactly once. No generic inbox/dedup table in Phase 2.
- **D-12:** Bounded retries (never infinite). Past bound → publication stays incomplete + logged + alerting metric. Staleness monitor enabled. Retry count, backoff, staleness thresholds = typed properties.

### Claude's Discretion

- Maven structure (single-module vs multi-module Maven layout).
- Exact retry/backoff/retention/staleness default values (D-12).
- MDC PII allowlist field list and mechanism details; OTel wiring approach.
- Gate error message formatting details (within `GATE <name> <millis>ms <PASS|FAIL>` contract).
- `new-module` skill internals (generator script vs instructions), as long as outputs match CONTRACT section.

### Deferred Ideas (OUT OF SCOPE)

- `bpm-off` Maven profile real exercise + CI leg — Phase 7.
- Consul container in compose / K8s Consul overlay — Phase 6.
- Generic inbox/dedup table — revisit Phase 5+.
- Tenant seam in `shared` (BaseEntity/tenant_id) — Phase 3.
- ProblemDetail/error envelope — Phase 4.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FOUND-01 | Backend builds as Spring Modulith with base modules; DAG declared; module-count assertion dynamic by BPM option | Module structure section; dynamic name-set assertion pattern |
| FOUND-03 | Cross-module events via JDBC Event Publication Registry; bounded retry; kill-listener test proves no-loss + no-double-effect | JDBC EPR section; kill-listener test pattern |
| FOUND-05 | PostgreSQL 16 only; Flyway per-module; Testcontainers for integration tests; record DTOs + MapStruct at boundary | Persistence section; Testcontainers 2.x patterns |
| FOUND-07 | Liveness/readiness probes; structured JSON logs with MDC PII allowlist; OTel traces; Prometheus metrics | Observability section |
| FOUND-10 | Modules read typed properties only; profile-based source switch: env+ConfigMap vs Consul KV | Config section; Consul Spring Cloud research |
| GATE-01 | Modulith verify gate — acyclic DAG, declared deps only; dynamic by BPM option | Modulith verify patterns |
| GATE-02 | ArchUnit gate — field injection, bare @Scheduled, native query, @Transactional private, entity at boundary, DAG cycles, undeclared dep | ArchUnit rules section |
| AGENT-08 | Gate errors name rule + fix; `verify --fast` <60s (compile + ArchUnit + Modulith verify + pure unit) | Q-004 contract; gate error format |
</phase_requirements>

---

## Summary

Phase 2 lays the architectural skeleton of the backend: a buildable Spring Boot 4 + Spring Modulith 2.0 Maven project with 5 infrastructure modules whose boundaries are machine-verified at every `./mvnw verify`. The phase is simultaneously the first real dogfood of the `new-module` skill — `shared` is hand-crafted as the reference shape, then the skill is codified and used 4 times to generate `appconfig`, `i18n`, `caching`, and `observability`.

The two most technically demanding deliverables are (1) the JDBC Event Publication Registry wired correctly for the new Modulith 2.0 schema (not legacy), with bounded retry and staleness monitoring driven by typed properties; and (2) the kill-listener integration test that must prove both no-loss AND no-double-effect — not just redelivery. The `verify --fast` gate set grows from Phase 1's 7 gates by adding backend compile, ArchUnit, Modulith verify, and pure unit tests, all staying inside the 60s budget.

Critical stack landmines to surface for every downstream agent: Testcontainers is 2.x (completely different artifact layout from 1.x tutorials), Jackson is 3.x (`tools.jackson.*` not `com.fasterxml.jackson`), JDK is 25 LTS (class file 69), JUnit is 6. Spring Cloud release train for Consul compatibility with Boot 4.0.x must be verified before locking (D-07).

**Primary recommendation:** Use single-module Maven layout with Modulith's logical module split (subpackages under `com.acme.app`). Multi-module Maven adds T3 pom.xml churn on every new module and fights Modulith's tooling which expects a single compiled classpath. [ASSUMED — see Architectural Responsibility Map rationale]

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Module boundary declaration | Backend (compile-time) | — | `package-info.java` + `@ApplicationModule` is a JVM build-time artifact |
| Architecture gate (ArchUnit) | Backend (test/verify) | CI | Static bytecode analysis; runs in Maven `verify` phase |
| Modulith DAG verification | Backend (test/verify) | CI | `ApplicationModules.of()` verifies the module graph |
| JDBC Event Publication Registry | Backend (runtime) | PostgreSQL | Modulith manages the `EVENT_PUBLICATION` table; registry must be in the same datasource as the app |
| Event delivery + retry | Backend (runtime) | DB scheduler | Completion + retry is in-process; republish-on-restart uses the registry as source of truth |
| Typed config properties | Backend (runtime) | Spring Environment | `@ConfigurationProperties` records; profile controls `spring.config.import` source |
| Consul KV source | Backend (runtime, `consul` profile) | Testcontainers (test) | `spring-cloud-consul-config`; prod uses Consul agent; test uses TC container |
| Flyway migrations | Backend (startup) | PostgreSQL | Per-module migration paths; Boot 4 requires `spring-boot-starter-flyway` + `flyway-database-postgresql` artifact |
| Structured JSON logging | Backend (runtime) | Logback/Logstash encoder | MDC context populated per request; PII allowlist controls what fields pass through |
| OTel traces | Backend (runtime) | OTel collector (local: otel-lgtm) | `spring-boot-starter-actuator` + Micrometer OTel bridge; Boot 4 autoconfigures OTLP export |
| Prometheus metrics | Backend (runtime) | Actuator `/actuator/prometheus` | Micrometer; scraped by Prometheus in `grafana/otel-lgtm` locally |
| Liveness/readiness probes | Backend (runtime) | Kubernetes | Actuator `management.endpoint.health.probes.enabled=true`; liveness = out of memory / deadlock; readiness = DB connection |
| `verify --fast` gate set | Scripts layer | Maven | `run-gate.mjs --mode fast` orchestrates; Maven gates are subprocesses |
| Kill-listener test | Backend (test, `--full`) | Testcontainers | Needs real PostgreSQL + PG-persisted event registry to survive JVM restart simulation |

---

## Standard Stack

### Core — Backend (all versions from CLAUDE.md / STACK.md — treated as locked, no re-research per efficiency directive)

| Library | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| JDK | **25 LTS** (Temurin) | Runtime — class file 69 | HIGH [VERIFIED: CLAUDE.md user override 2026-06-11] |
| Spring Boot | **4.0.7** | App framework + BOM anchor | HIGH [VERIFIED: CLAUDE.md] |
| Spring Modulith | **2.0.6** (`spring-modulith-bom`) | Module boundaries + JDBC EPR | HIGH [VERIFIED: CLAUDE.md] |
| Spring Framework | 7.0.8 (Boot-managed) | Core | HIGH [VERIFIED: CLAUDE.md] |
| PostgreSQL driver | 42.7.11 (Boot-managed) | JDBC | HIGH [VERIFIED: CLAUDE.md] |
| Flyway | 11.14.1 (Boot-managed) via `spring-boot-starter-flyway` + `flyway-database-postgresql` | Per-module migrations | HIGH [VERIFIED: CLAUDE.md + pitfall] |
| Testcontainers | **2.0.5** (Boot-managed BOM, `testcontainers-bom`) | Integration tests on real PG | HIGH [VERIFIED: CLAUDE.md; WARNING: 2.x API differs from all 1.x tutorials] |
| MapStruct | **1.6.3** | DTO boundary mapping | MEDIUM [VERIFIED: CLAUDE.md; no official Java 25 statement — verify in first CI run] |
| ArchUnit | **≥1.4.2** (pin explicitly — Boot does not manage it) | Architecture gates | HIGH [VERIFIED: CLAUDE.md; 1.4.1 fails on class file 70; 1.4.2 added Java 26 ASM — class file 69 works on 1.4.x] |
| Jackson | 3.x (Boot-managed) | JSON — `tools.jackson.*` packages | HIGH [VERIFIED: CLAUDE.md; `com.fasterxml.jackson` imports WRONG in this stack] |
| JUnit | **6.0.3** (Boot-managed) | Test framework | HIGH [VERIFIED: CLAUDE.md] |
| Mockito / Byte Buddy | 5.20.0 / 1.17.8 (Boot-managed) | Test mocking | HIGH [VERIFIED: CLAUDE.md] |
| Caffeine | 3.2.4 (Boot-managed) | Caching module | HIGH [VERIFIED: CLAUDE.md] |
| Logback + logstash-logback-encoder | Boot-managed + `net.logstash.logback:logstash-logback-encoder` | Structured JSON logs | HIGH [ASSUMED for logstash version — pin latest stable at plan time] |
| Micrometer OTel bridge | Boot-managed | OTel + Prometheus | HIGH [VERIFIED: CLAUDE.md] |
| Spring Cloud Consul Config | **TBD** — must verify compatible release train with Boot 4.0.x | `spring.config.import: optional:consul:` | **MEDIUM [ASSUMED — see Open Questions Q-1]** |

### Modulith Starter Artifacts

```xml
<!-- BOM in dependencyManagement -->
<dependency>
  <groupId>org.springframework.modulith</groupId>
  <artifactId>spring-modulith-bom</artifactId>
  <version>2.0.6</version>
  <scope>import</scope>
  <type>pom</type>
</dependency>

<!-- Runtime: event publication via JDBC -->
<dependency>
  <groupId>org.springframework.modulith</groupId>
  <artifactId>spring-modulith-starter-jdbc</artifactId>
</dependency>

<!-- Runtime: actuator/observability -->
<dependency>
  <groupId>org.springframework.modulith</groupId>
  <artifactId>spring-modulith-starter-actuator</artifactId>
</dependency>

<!-- Test: ApplicationModuleTest, Scenario, PublishedEvents -->
<dependency>
  <groupId>org.springframework.modulith</groupId>
  <artifactId>spring-modulith-starter-test</artifactId>
  <scope>test</scope>
</dependency>
```

### Flyway Boot 4 Gotcha — Required Artifacts

```xml
<!-- Boot 4: flyway-core alone does NOT autoconfigure; need both: -->
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-flyway</artifactId>
</dependency>
<dependency>
  <groupId>org.flywaydb</groupId>
  <artifactId>flyway-database-postgresql</artifactId>
</dependency>
<!-- Boot manages version; DO NOT override -->
```

[VERIFIED: CLAUDE.md cites pitfall — `flyway-core` alone no longer auto-configures in Boot 4]

---

## Architecture Patterns

### Maven Layout Recommendation

**Single-module Maven project** with Modulith's logical module split (subpackages).

Rationale: Spring Modulith is designed for a single compiled classpath — its `ApplicationModules.of(App.class)` discovers modules by scanning subpackages. A multi-module Maven layout forces module jars onto separate classpaths and breaks Modulith's scanner without non-trivial aggregator configuration. The Spring Modulith reference and all example projects use single-module Maven. [ASSUMED — based on Modulith documentation patterns observed in Context7; verify against https://docs.spring.io/spring-modulith/reference/ if unsure]

### Recommended Project Structure

```
backend/
├── pom.xml                                    # Single Maven module; Boot parent
├── mvnw / mvnw.cmd                            # Maven Wrapper (Maven 3.9.16)
└── src/
    ├── main/
    │   ├── java/com/acme/app/
    │   │   ├── Application.java               # @SpringBootApplication
    │   │   ├── shared/
    │   │   │   ├── package-info.java          # @ApplicationModule(allowedDependencies = {})
    │   │   │   ├── scheduling/                # Project scheduling wrapper (replaces bare @Scheduled)
    │   │   │   └── query/                     # Sanctioned native query wrapper
    │   │   ├── appconfig/
    │   │   │   ├── package-info.java          # @ApplicationModule(allowedDependencies = {"shared"})
    │   │   │   └── spi/                       # exposes typed properties beans for other modules
    │   │   ├── i18n/
    │   │   │   ├── package-info.java          # @ApplicationModule(allowedDependencies = {"shared", "appconfig::spi"})
    │   │   │   └── spi/
    │   │   ├── caching/
    │   │   │   ├── package-info.java          # @ApplicationModule(allowedDependencies = {"shared", "appconfig::spi"})
    │   │   │   └── spi/
    │   │   └── observability/
    │   │       ├── package-info.java          # @ApplicationModule(allowedDependencies = {"shared", "appconfig::spi"})
    │   │       └── spi/
    │   └── resources/
    │       ├── application.yml
    │       ├── application-consul.yml
    │       └── db/migration/
    │           └── <module>/                  # Per-module Flyway paths (only when module has tables)
    │               └── V1__init.sql
    └── test/
        └── java/com/acme/app/
            ├── ModulithVerifyTest.java        # ApplicationModules.of() name-set assertion
            ├── shared/
            │   └── SharedModuleTest.java      # @ApplicationModuleTest
            ├── appconfig/
            │   ├── AppConfigModuleTest.java
            │   └── ConsulConfigIntegrationTest.java   # --full: Testcontainers Consul
            └── observability/
                └── KillListenerTest.java              # --full: event loss + double-effect proof
```

### Pattern 1: Module Boundary Declaration

```java
// Source: https://docs.spring.io/spring-modulith/reference/fundamentals.html
// File: src/main/java/com/acme/app/appconfig/package-info.java

@org.springframework.modulith.ApplicationModule(
  allowedDependencies = { "shared" }
)
package com.acme.app.appconfig;
```

Named interface access (::spi):

```java
// In i18n/package-info.java — reads appconfig's SPI surface only:
@org.springframework.modulith.ApplicationModule(
  allowedDependencies = { "shared", "appconfig::spi" }
)
package com.acme.app.i18n;
```

[VERIFIED: Context7 / spring-projects/spring-modulith]

### Pattern 2: Dynamic Module Name-Set Assertion (D-06)

This asserts the exact module NAME SET instead of a count, and handles the BPM option via a system property injected by Maven Surefire.

```java
// src/test/java/com/acme/app/ModulithVerifyTest.java
import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;

class ModulithVerifyTest {

    static final Set<String> BASE_MODULES =
        Set.of("shared", "appconfig", "i18n", "caching", "observability");

    @Test
    void modulesVerify() {
        var modules = ApplicationModules.of(Application.class);
        modules.verify(); // acyclic DAG + declared-deps-only

        var bpmEnabled = Boolean.parseBoolean(
            System.getProperty("bpm.enabled", "true"));

        var expected = new HashSet<>(BASE_MODULES);
        if (bpmEnabled) {
            expected.add("bpm");
        }

        var actual = modules.stream()
            .map(m -> m.getName())
            .collect(Collectors.toSet());

        assertThat(actual).isEqualTo(expected);
    }
}
```

Maven Surefire config to pass the property:
```xml
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-surefire-plugin</artifactId>
  <configuration>
    <systemPropertyVariables>
      <bpm.enabled>${bpm.enabled}</bpm.enabled>
    </systemPropertyVariables>
  </configuration>
</plugin>
```

[ASSUMED — pattern derived from Modulith API shape + D-05/D-06 decisions; verify `m.getName()` API against Modulith 2.0.6 Javadoc]

### Pattern 3: @ApplicationModuleTest

```java
// Source: Context7 / spring-projects/spring-modulith
@ApplicationModuleTest
@RequiredArgsConstructor
class AppConfigModuleTest {

    private final AppConfigService service;

    @Test
    void publishesEvent(Scenario scenario) {
        scenario.stimulate(() -> service.doSomething())
            .andWaitForEventOfType(SomethingHappened.class)
            .toArrive();
    }
}
```

`@ApplicationModuleTest` bootstraps ONLY the current module's slice — faster than full `@SpringBootTest`. It honors `allowedDependencies` declared in `package-info.java`. [VERIFIED: Context7 / spring-projects/spring-modulith]

### Pattern 4: JDBC Event Publication Registry (Modulith 2.0)

**Critical: use the new schema (`v2`), NOT `use-legacy-structure`. This is a greenfield project.**

```yaml
# application.yml
spring:
  modulith:
    events:
      jdbc:
        schema-initialization:
          enabled: true          # Let Modulith create EVENT_PUBLICATION table
      republish-outstanding-events-on-restart: true
      staleness:
        published: 10m           # Event stuck in PUBLISHED state = stale after 10 min
        resubmitted: 30m         # Event stuck in RESUBMITTED state = stale after 30 min
    runtime:
      flyway-enabled: false      # App Flyway handles app tables; Modulith handles EPR via jdbc schema-init
```

Completion mode configuration (D-10 = UPDATE/mark-completed):

```java
// JDBC EPR uses UPDATE completion by default in Modulith 2.0
// The three modes from docs:
// - UPDATE (default): keeps records; requires cleanup job
// - DELETE: removes on completion; no cleanup needed but no forensics
// - ARCHIVE: moves to separate table
// Decision D-10 = UPDATE (default) + periodic cleanup via shared scheduling wrapper
```

[VERIFIED: Context7 — completion modes documented; UPDATE is default; staleness config properties verified]

### Pattern 5: Bounded Retry with Typed Properties

Modulith 2.0 event retry configuration via typed properties (D-12):

```java
// src/main/java/com/acme/app/appconfig/EventRetryProperties.java
@ConfigurationProperties("acme.events.retry")
public record EventRetryProperties(
    int maxAttempts,       // default 3
    Duration initialDelay, // default PT10S (10 seconds)
    double multiplier,     // default 2.0
    Duration maxDelay      // default PT5M
) {
    public EventRetryProperties() {
        this(3, Duration.ofSeconds(10), 2.0, Duration.ofMinutes(5));
    }
}
```

The actual Spring Modulith retry mechanism: Modulith's event publication tracks incomplete publications and republishes them on restart (`republish-outstanding-events-on-restart: true`). For bounded retry, a custom `EventPublicationRepository` wrapper or a `@TransactionalEventListener` with retry tracking is needed. [ASSUMED — Modulith 2.0 does not natively bound retry count; custom implementation required. See Open Question Q-2 for the design choice.]

### Pattern 6: Kill-Listener Test (D-11)

The flagship integration test. Must prove two things:
1. Event is NOT lost when listener dies mid-processing (redelivered on restart)
2. Side-effect is applied EXACTLY ONCE despite at-least-once delivery (idempotency)

```java
// src/test/java/com/acme/app/observability/KillListenerTest.java
// This test requires --full (Testcontainers PG16 + real event registry)

@SpringBootTest
@Testcontainers // Testcontainers 2.x annotation — @Container field injection
class KillListenerTest {

    // Testcontainers 2.x: use ServiceConnection stereotype
    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres =
        new PostgreSQLContainer<>("postgres:16-alpine");

    // Step 1: Publish an event; listener throws before completing
    // Step 2: Assert EVENT_PUBLICATION record is still INCOMPLETE
    // Step 3: Republish outstanding events (simulate restart)
    // Step 4: Assert listener completed; side-effect table has exactly 1 row
    //         (NOT 2 — idempotency enforced via natural key / check-before-write)
}
```

**Testcontainers 2.x critical differences from 1.x (agent hallucination trap):**
- `@Testcontainers` + `@Container` annotation approach is the same surface API
- `@ServiceConnection` replaces manual datasource URL property wiring — Boot 4 autoconfigures from the container
- Artifact: `org.testcontainers:postgresql` (managed by `testcontainers-bom` 2.0.5 via Boot)
- Import: `org.testcontainers.containers.PostgreSQLContainer` (same as 1.x — this class path is stable)
- The `@ServiceConnection` annotation is in `org.springframework.boot.testcontainers.service.connection` package (Boot 3/4 addition)

[ASSUMED on @ServiceConnection being in Boot 4 — pattern was introduced in Boot 3.1; should be present in Boot 4. Verify against Boot 4 docs.]

### Pattern 7: Per-Module Flyway Configuration

```yaml
# application.yml
spring:
  flyway:
    enabled: true
    locations: "classpath:db/migration/{vendor}"
    # OR per-module explicit locations via custom FlywayConfigurationCustomizer
```

For per-module isolation, each module's SQL lives at its own path:
```
db/migration/shared/V1__scheduling_wrapper.sql
db/migration/appconfig/V1__config_tables.sql   # only if appconfig has tables
```

Boot 4 Flyway customization to run module-specific migrations independently:

```java
// Each module that needs DB tables defines its Flyway location;
// the simplest approach (greenfield): single Flyway instance, multiple locations
@Bean
FlywayConfigurationCustomizer flywayLocationsCustomizer() {
    return config -> config.locations(
        "classpath:db/migration/shared",
        "classpath:db/migration/appconfig"
        // add more as modules arrive
    );
}
```

[ASSUMED — there is no official Spring Modulith per-module Flyway auto-discovery in 2.0. Each new module's location must be added. The `new-module` skill should add the location to the customizer. Verify against Modulith reference docs.]

**Note:** `spring.modulith.runtime.flyway-enabled=true` enables module-aware Flyway in Modulith context; the interaction with Boot's Flyway autoconfiguration in Boot 4 needs verification during implementation.

### Anti-Patterns to Avoid

- **Field injection (`@Autowired` on fields):** Banned by GATE-02. Use constructor injection. ArchUnit rule: no `@Autowired` on fields in `com.acme.app..`.
- **Bare `@Scheduled`:** Banned by GATE-02. All scheduling goes through `com.acme.app.shared.scheduling.ScheduledTask` wrapper (or equivalent) so it can be audited and tested.
- **Native query outside wrapper:** Banned. Native SQL only through `com.acme.app.shared.query.NativeQuery` wrapper.
- **JPA entity at controller boundary:** Banned. Map to record DTOs via MapStruct at API edge.
- **`@Transactional` on private methods:** Spring proxies skip private methods — silent no-op. ArchUnit catches this pattern.
- **`@Value` outside `appconfig` module:** Banned by D-09 ArchUnit rule. All other modules consume `@ConfigurationProperties` records via `appconfig::spi`.
- **Using 1.x Testcontainers idioms:** `withExposedPorts`, manual `spring.datasource.url` = `container.getJdbcUrl()` wiring — replaced by `@ServiceConnection` in Boot 3+/4.
- **Jackson 2 imports (`com.fasterxml.jackson.*`):** Wrong — only annotations artifact kept old package. Use `tools.jackson.*`.
- **Infinite retry:** D-12 bans this. Retry MUST be bounded; past bound = INCOMPLETE + log + metric.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Module boundary enforcement | Custom classloader isolation | `@ApplicationModule` + `modules.verify()` | Handles cyclic deps, allowed-deps validation, SPI surfaces automatically |
| Event publication durability | Custom outbox table | Spring Modulith JDBC EPR | Already handles republish-on-restart, registry schema, completion lifecycle |
| Event retry state machine | Custom retry scheduler | Modulith EPR + `republish-outstanding-events-on-restart` + staleness monitor | Built-in persistence + monitor; only bounded-count extension is custom |
| DB container in tests | `DockerComposeContainer` or manual docker calls | Testcontainers `@ServiceConnection` + `PostgreSQLContainer` | Boot 4 autoconfigures datasource from container automatically |
| Flyway migration history | Ad-hoc SQL version tracking | Flyway with Boot starter | Atomic, versioned, checksummed; already managed by Boot |
| Structured JSON logging | Custom Logback encoder | `logstash-logback-encoder` | Industry standard; MDC field inclusion/exclusion is config-only |
| OTel instrumentation | Manual `Span` creation for HTTP/DB/cache | `spring-boot-starter-actuator` + Micrometer OTel bridge | Boot 4 autoconfigures OTLP export from existing Micrometer meters |
| Config property validation | Manual null checks | `@Validated` on `@ConfigurationProperties` record | Boot validates at startup; fails fast with legible error |

**Key insight:** The three hand-roll temptations in this phase are (1) writing a custom outbox instead of using EPR, (2) managing Flyway manually instead of via Boot's starter, and (3) writing manual datasource URL wiring in Testcontainers tests instead of using `@ServiceConnection`.

---

## ArchUnit Gate Rules (GATE-02)

Full rule set to implement. Each rule must emit a message naming the violated rule and the fix (AGENT-08 requirement).

```java
// src/test/java/com/acme/app/ArchitectureGatesTest.java
@AnalyzeClasses(packages = "com.acme.app")
class ArchitectureGatesTest {

    // Rule 1: No field injection
    @ArchTest
    static final ArchRule NO_FIELD_INJECTION =
        noFields()
            .that().areAnnotatedWith(Autowired.class)
            .should().exist()
            .because("Use constructor injection. Field injection hides dependencies and breaks tests.");

    // Rule 2: No bare @Scheduled — must use project wrapper
    @ArchTest
    static final ArchRule NO_BARE_SCHEDULED =
        noMethods()
            .that().areAnnotatedWith(Scheduled.class)
            .and().areDeclaredInClassesThat().resideOutsideOfPackage("com.acme.app.shared.scheduling..")
            .should().exist()
            .because("Use the shared scheduling wrapper instead of bare @Scheduled.");

    // Rule 3: No native queries outside sanctioned wrapper
    @ArchTest
    static final ArchRule NO_NATIVE_QUERY_OUTSIDE_WRAPPER =
        noMethods()
            .that().areAnnotatedWith(Query.class)
            .and(haveNativeQueryTrue()) // custom condition
            .and().areDeclaredInClassesThat().resideOutsideOfPackage("com.acme.app.shared.query..")
            .should().exist()
            .because("Native queries must go through com.acme.app.shared.query to ensure PII audit.");

    // Rule 4: No @Transactional on private methods
    @ArchTest
    static final ArchRule NO_TRANSACTIONAL_PRIVATE =
        noMethods()
            .that().areAnnotatedWith(Transactional.class)
            .and().arePrivate()
            .should().exist()
            .because("@Transactional on private methods is a no-op (Spring proxy skips them).");

    // Rule 5: JPA entities must not cross controller boundary
    @ArchTest
    static final ArchRule NO_ENTITY_IN_CONTROLLERS =
        noClasses()
            .that().areAnnotatedWith(Entity.class)
            .should().beAccessedByClassesThat()
            .areAnnotatedWith(RestController.class)
            .because("Map entities to DTOs at the API boundary using MapStruct.");

    // Rule 6: @Value banned outside appconfig module (D-09)
    @ArchTest
    static final ArchRule NO_VALUE_OUTSIDE_APPCONFIG =
        noFields()
            .that().areAnnotatedWith(Value.class)
            .and().areDeclaredInClassesThat()
                .resideOutsideOfPackage("com.acme.app.appconfig..")
            .should().exist()
            .because("Use @ConfigurationProperties records from appconfig::spi instead of @Value.");

    // Rule 7: Environment injection banned outside appconfig module (D-09)
    @ArchTest
    static final ArchRule NO_ENVIRONMENT_INJECTION_OUTSIDE_APPCONFIG =
        noFields()
            .that().haveRawType(Environment.class)
            .and().areDeclaredInClassesThat()
                .resideOutsideOfPackage("com.acme.app.appconfig..")
            .should().exist()
            .because("Inject typed @ConfigurationProperties records from appconfig::spi, not raw Environment.");
}
```

[ASSUMED — ArchUnit DSL shape is based on training knowledge of ArchUnit 1.x API. Verify that `noFields()`, `noMethods()` etc. DSL methods exist in ArchUnit 1.4.2. The JUnit 6 annotation import path may differ slightly from JUnit 5 — check ArchUnit 1.4.2 release notes for JUnit 6 runner support.]

**ArchUnit + JUnit 6 wiring:** ArchUnit provides a JUnit 5 extension; JUnit 6 is the renamed Jupiter line and should be source-compatible. Confirm `@AnalyzeClasses` and `@ArchTest` still work under JUnit 6 in first CI run.

---

## JDBC Event Publication Registry — Deep Dive

### Schema Strategy (greenfield = new schema)

Since this is a greenfield project, use the **v2 schema** (NOT legacy). Set:

```yaml
spring:
  modulith:
    events:
      jdbc:
        schema-initialization:
          enabled: true
```

This creates `EVENT_PUBLICATION` table automatically. The `DatabaseSchemaInitializer` checks if the table already exists — if you later switch to managing it via Flyway, set `enabled: false` and add a migration at `db/migration/shared/V1__event_publication.sql` using the Modulith-provided DDL. [VERIFIED: Context7 — `DatabaseSchemaInitializer` source shows table-exists check]

### Event Publication Lifecycle

```
Publisher thread:
  TX start → business logic → publish event → EPR records INCOMPLETE → TX commit
  → ApplicationEventPublisher fires → listener called in same TX (default)
  OR
  → @TransactionalEventListener(phase=AFTER_COMMIT) called after TX commits

EPR state machine:
  INCOMPLETE → listener completes successfully → COMPLETED (UPDATE mode keeps record)
  INCOMPLETE → listener throws → stays INCOMPLETE → republished on restart
  INCOMPLETE for > staleness.published duration → staleness monitor logs/metrics
```

### Republish-on-Restart Configuration

```yaml
spring:
  modulith:
    events:
      republish-outstanding-events-on-restart: true
```

On startup, Modulith queries `EVENT_PUBLICATION` for INCOMPLETE records and re-fires them. This is the "no event loss" guarantee — the listener must be idempotent (D-11).

### Staleness Monitor (D-12)

```yaml
spring:
  modulith:
    events:
      staleness:
        published: 10m     # PUBLISHED state (listener invoked but not returned) = stale after 10m
        resubmitted: 30m   # RESUBMITTED state = stale after 30m
```

If no staleness durations configured, monitor is inactive. [VERIFIED: Context7 — "If no staleness durations are configured, the monitor remains inactive"]

### Bounded Retry (D-12) — Custom Implementation Required

Modulith 2.0 does NOT natively cap retry count. The compliant implementation (D-12: "bounded retries + past bound → stays INCOMPLETE + logged + alerting metric") requires:

```java
// Option A: Custom @TransactionalEventListener wrapper that tracks attempt count
// in a typed-property-configurable counter stored alongside the event or in a
// separate retry_tracking table.

// Option B: Decorate EventPublicationRepository to count publications per eventId
// and stop republishing past maxAttempts.

// Recommended: Option A — simpler, no framework internals needed.
// Planner should pick the approach; researcher recommends Option A.
```

[ASSUMED — implementation choice. Confirm with Modulith 2.0 javadoc whether `EventPublicationRepository` is a stable extension point.]

### Cleanup Job (D-10)

```java
// Uses the shared scheduling wrapper (not bare @Scheduled)
@Component
@RequiredArgsConstructor
public class EventPublicationCleanupTask {

    private final CompletedEventPublications completedEvents;
    private final EventRetentionProperties retention; // from appconfig::spi

    // Called via shared ScheduledTask wrapper — not bare @Scheduled
    public void cleanupOldCompletedPublications() {
        completedEvents.deletePublicationsOlderThan(retention.completedRetention());
    }
}
```

`CompletedEventPublications` is a Modulith 2.0 API for querying/deleting completed records. [ASSUMED — verify class name in Modulith 2.0.6 Javadoc]

---

## Observability (FOUND-07)

### Liveness / Readiness Probes

```yaml
# application.yml
management:
  endpoint:
    health:
      probes:
        enabled: true
  health:
    livenessstate:
      enabled: true
    readinessstate:
      enabled: true
  endpoints:
    web:
      exposure:
        include: health,prometheus,info,metrics
```

Endpoints:
- `GET /actuator/health/liveness` → liveness probe (JVM state)
- `GET /actuator/health/readiness` → readiness probe (DB + downstream connections)

[ASSUMED — standard Boot 4 actuator pattern; verify endpoint paths in Boot 4 docs]

### Structured JSON Logs + MDC PII Allowlist

```xml
<!-- logback-spring.xml -->
<appender name="JSON" class="ch.qos.logback.core.ConsoleAppender">
  <encoder class="net.logstash.logback.encoder.LogstashEncoder">
    <includeMdcKeyName>requestId</includeMdcKeyName>
    <includeMdcKeyName>userId</includeMdcKeyName>
    <includeMdcKeyName>tenantId</includeMdcKeyName>
    <includeMdcKeyName>traceId</includeMdcKeyName>
    <includeMdcKeyName>spanId</includeMdcKeyName>
    <!-- DO NOT include: email, ip, userAgent — PII not allowed in structured logs -->
  </encoder>
</appender>
```

MDC PII allowlist enforcement: use `LogstashEncoder`'s `includeMdcKeyName` whitelist (explicit include = everything else excluded). This is the allowlist approach — only listed keys propagate to JSON log fields. [ASSUMED — based on logstash-logback-encoder API; verify `includeMdcKeyName` tag name in encoder docs]

**PII allowlist fields for Phase 2 (Claude's Discretion):**
- `requestId` — request correlation
- `userId` — opaque UUID (not email/name)
- `tenantId` — opaque UUID
- `traceId`, `spanId` — OTel trace context (auto-populated by Micrometer)

### OTel Wiring (Boot Starter Approach)

```yaml
# application.yml
management:
  tracing:
    sampling:
      probability: 1.0   # 100% in dev; reduce in prod
  otlp:
    tracing:
      endpoint: http://localhost:4318/v1/traces  # otel-lgtm local
    metrics:
      export:
        url: http://localhost:9090/api/v1/write   # Prometheus in otel-lgtm
```

Dependencies (Boot-managed via `spring-boot-starter-actuator`):
- Micrometer Tracing + OTel bridge (Boot 4 manages versions)
- `micrometer-registry-prometheus` for Prometheus endpoint

[ASSUMED — OTel endpoint configuration; verify against Boot 4 Actuator docs. The exact property paths may differ between Boot 3 and Boot 4.]

---

## Config Properties + Consul Switch (FOUND-10)

### Typed Properties Pattern

```java
// All config consumed via @ConfigurationProperties records in appconfig module
@ConfigurationProperties("acme.events.retry")
@Validated
public record EventRetryProperties(
    @Min(1) @Max(10) int maxAttempts,
    @NotNull Duration initialDelay,
    double multiplier,
    @NotNull Duration maxDelay
) {
    public EventRetryProperties() {
        this(3, Duration.ofSeconds(10), 2.0, Duration.ofMinutes(5));
    }
}

// Exposed via appconfig::spi so other modules can inject it
// Other modules: inject EventRetryProperties, NOT @Value or Environment
```

### Profile-Based Consul Switch (D-07)

```yaml
# application.yml (default profile — env vars + ConfigMap)
spring:
  config:
    import: optional:file:.env[.properties]   # local dev

# application-consul.yml (consul profile)
spring:
  config:
    import: optional:consul:
  cloud:
    consul:
      host: ${CONSUL_HOST:localhost}
      port: ${CONSUL_PORT:8500}
      config:
        prefix: acme
        default-context: app
```

**Spring Cloud + Boot 4 Compatibility (D-07 — MUST VERIFY):**

[ASSUMED — Spring Cloud 2025.x or 4.2.x release train; exact Boot 4.0.x compatible version is UNKNOWN. See Open Question Q-1. This is the highest-risk unverified decision in Phase 2.]

### Consul Testcontainers Test (D-08)

```java
@SpringBootTest(properties = "spring.profiles.active=consul")
@Testcontainers
class ConsulConfigIntegrationTest {

    @Container
    @ServiceConnection  // Boot 4 autoconfigures consul host/port from container
    static ConsulContainer consul = new ConsulContainer("hashicorp/consul:1.19");

    @Test
    void typedPropertiesResolveFromConsulKV(
            @Autowired EventRetryProperties props) {
        // Seed KV before test via ConsulClient or REST
        // Assert typed properties reflect seeded values
        assertThat(props.maxAttempts()).isEqualTo(5);
    }
}
```

[ASSUMED — `ConsulContainer` exists in Testcontainers 2.x; `@ServiceConnection` support for Consul may need verification. Confirm class `org.testcontainers.consul.ConsulContainer` availability in TC 2.0.5.]

---

## verify --fast Gate Set (Phase 2 additions, Q-004 §7)

Per Q-004 §7 growth rule, Phase 2 adds to `--fast`:

| # | Gate name | Command | Class |
|---|-----------|---------|-------|
| 8 | `backend-compile` | `./mvnw -q compile -f backend/pom.xml` | Compile — no containers |
| 9 | `archunit` | `./mvnw -q test -pl backend -Dtest=ArchitectureGatesTest -f backend/pom.xml` | ArchUnit static analysis — no containers |
| 10 | `modulith-verify` | `./mvnw -q test -pl backend -Dtest=ModulithVerifyTest -f backend/pom.xml` | Modulith DAG verify — no containers |
| 11 | `backend-unit` | `./mvnw -q test -pl backend -Dgroups=unit -f backend/pom.xml` | Pure unit tests (no Spring context, no DB) |

Phase 2 additions to `--full` only:

| # | Gate name | Command | Class |
|---|-----------|---------|-------|
| 10 | `backend-integration` | `./mvnw -q verify -pl backend -Dgroups=integration -f backend/pom.xml` | Testcontainers PG16 integration tests |
| 11 | `kill-listener-test` | `./mvnw -q verify -pl backend -Dtest=KillListenerTest -f backend/pom.xml` | Event loss + double-effect proof |

**Budget constraint:** All fast gates together must keep TOTAL under 60s. ArchUnit + Modulith verify on a fresh 5-module project should run in ~10-20s. If `backend-unit` pushes over budget, move to `--full` via T3 Taskfile change.

**Gate error message format (AGENT-08):**

```
GATE archunit 8412ms FAIL

  VIOLATED: NO_FIELD_INJECTION
  Location: com.acme.app.i18n.MessageService.messageSource (@Autowired field)
  Fix: Replace field injection with constructor injection.

  VIOLATED: NO_VALUE_OUTSIDE_APPCONFIG
  Location: com.acme.app.caching.CacheConfig.ttl (@Value field)
  Fix: Inject appconfig::spi typed properties record instead.
```

The runner (`run-gate.mjs`) must capture Maven test output and parse ArchUnit failure messages into this format. Each violation line must include class + field/method location.

---

## Common Pitfalls

### Pitfall 1: Testcontainers 2.x vs 1.x API

**What goes wrong:** Agent generates `new PostgreSQLContainer<>("postgres:16-alpine").withExposedPorts(5432)` and manually sets `spring.datasource.url = container.getJdbcUrl()` in `@DynamicPropertySource`.
**Why it happens:** 99% of internet tutorials target 1.x; Boot 4 manages 2.x with a different integration model.
**How to avoid:** Use `@ServiceConnection` on the `@Container` field. Boot 4 reads the container's JDBC URL automatically. No `@DynamicPropertySource` needed.
**Warning signs:** Any import of `org.testcontainers.junit.jupiter.Testcontainers` that works WITHOUT `@ServiceConnection` annotation on the container field.

### Pitfall 2: Jackson 3 Package Imports

**What goes wrong:** `import com.fasterxml.jackson.databind.ObjectMapper` — compiles if Jackson 2 is somehow on classpath; runtime `ClassNotFoundException` or wrong version used.
**Why it happens:** All training data (pre-2025) uses Jackson 2 package names.
**How to avoid:** Use `tools.jackson.databind.ObjectMapper`. The ONLY safe `com.fasterxml.jackson` import is `com.fasterxml.jackson.annotation.*` (annotations artifact kept old package).
**Warning signs:** Any `import com.fasterxml.jackson.databind` or `com.fasterxml.jackson.core`.

### Pitfall 3: Flyway Not Autoconfiguring in Boot 4

**What goes wrong:** App starts but migrations don't run; no error message.
**Why it happens:** Boot 4 removed `flyway-core` auto-trigger; both `spring-boot-starter-flyway` AND `flyway-database-postgresql` are required.
**How to avoid:** Add both artifacts to pom.xml. Do not override the managed version.
**Warning signs:** `FlywayAutoConfiguration` bean not found in context, or no `flyway_schema_history` table created.

### Pitfall 4: Modulith 2.0 Legacy Schema

**What goes wrong:** Using `spring.modulith.events.jdbc.schema-initialization.use-legacy-structure=true` — creates old schema; Modulith 2.0 features (staleness monitor fields) won't work.
**Why it happens:** Old blog posts / pre-2.0 documentation.
**How to avoid:** On greenfield, never set `use-legacy-structure`. Let `schema-initialization.enabled=true` create the new v2 schema.
**Warning signs:** Missing columns in `EVENT_PUBLICATION` table compared to v2 schema DDL.

### Pitfall 5: @Transactional on @TransactionalEventListener

**What goes wrong:** Event listener marked `@Transactional` with no phase — it runs IN the publisher's transaction, not after commit. Event published, transaction rolls back, but listener ran.
**Why it happens:** Missing `phase = TransactionPhase.AFTER_COMMIT` or forgetting that event publication registry requires AFTER_COMMIT to work correctly.
**How to avoid:** Always specify `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)` for listeners that should run after the publishing transaction commits.

### Pitfall 6: ArchUnit JUnit 6 Compatibility

**What goes wrong:** `@AnalyzeClasses` and `@ArchTest` fail with unexpected runner errors under JUnit 6.
**Why it happens:** ArchUnit's JUnit 5 extension may need a minor adaptation for JUnit 6 (renamed Jupiter line); not confirmed in available docs.
**How to avoid:** Confirm ArchUnit 1.4.2 JUnit 6 compatibility in the first CI run. Fallback: use `ArchUnit.check()` in a plain `@Test` method without `@ArchTest` annotation.

### Pitfall 7: Multi-Module Maven Breaking Modulith Scanner

**What goes wrong:** `ApplicationModules.of(Application.class)` finds 0 modules or fails with classpath errors.
**Why it happens:** Multi-module Maven places each module in a separate jar; Modulith's package scanner expects all modules in a single compiled output.
**How to avoid:** Use single-module Maven layout (confirmed recommendation).

---

## Runtime State Inventory

This is a greenfield phase — no existing modules, no existing data, no renamed entities.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no backend DB exists before Phase 2 | None |
| Live service config | None — `backend/` contains only `CLAUDE.md` | None |
| OS-registered state | None | None |
| Secrets/env vars | None backend-specific yet | None |
| Build artifacts | None — first Maven build | None |

---

## Environment Availability Audit

| Dependency | Required By | Available | Fallback |
|------------|------------|-----------|---------|
| JDK 25 (Temurin) | Backend compile | Must verify — install via `winget install EclipseAdoptium.Temurin.25.JDK` on Windows | None (required) |
| Maven Wrapper (`./mvnw`) | Backend build | Lands in Phase 2 (doesn't exist yet) | None — scaffold in Wave 0 |
| PostgreSQL 16 (Docker) | Integration tests | ✓ (in `infra/compose.yaml` from Phase 1) | — |
| Valkey 8 (Docker) | Caching integration tests | ✓ (in `infra/compose.yaml` from Phase 1) | — |
| Node ≥22 | Gate runner (`run-gate.mjs`) | ✓ Phase 1 baseline shows node working | — |
| go-task | Taskfile | ✓ Phase 1 baseline shows task working | — |

**Missing dependencies with no fallback:**
- JDK 25 — must be installed before Phase 2 work begins. CI already configured with `actions/setup-java distribution: temurin, java-version: 25` (per CLAUDE.md pattern).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | JUnit 6.0.3 (Boot-managed, renamed Jupiter line) |
| Config file | `backend/src/test/resources/application-test.yml` |
| Quick run command | `./mvnw -q test -Dgroups=unit -f backend/pom.xml` |
| Full suite command | `./mvnw -q verify -f backend/pom.xml` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOUND-01 | Module name-set matches expected set (5 modules; +bpm when bpm.enabled) | unit (no containers) | `./mvnw -q test -Dtest=ModulithVerifyTest` | ❌ Wave 0 |
| FOUND-01 | Module DAG is acyclic with declared deps only | unit (no containers) | Same — `modules.verify()` in ModulithVerifyTest | ❌ Wave 0 |
| FOUND-03 | JDBC EPR records event as INCOMPLETE before listener completes | integration (TC) | `./mvnw -q verify -Dtest=KillListenerTest` | ❌ Wave 0 |
| FOUND-03 | Event redelivered after listener simulated death (republish-on-restart) | integration (TC) | Same | ❌ Wave 0 |
| FOUND-03 | Side-effect applied exactly once despite redelivery | integration (TC) | Same | ❌ Wave 0 |
| FOUND-05 | Flyway creates schema on Testcontainers PG16 | integration (TC) | `./mvnw -q verify -Dtest=*ModuleTest` | ❌ Wave 0 |
| FOUND-07 | `/actuator/health/liveness` returns UP | unit (Spring slice) | `./mvnw -q test -Dtest=ActuatorProbeTest` | ❌ Wave 0 |
| FOUND-07 | `/actuator/health/readiness` returns UP with DB connected | integration (TC) | `./mvnw -q verify -Dtest=ActuatorReadinessTest` | ❌ Wave 0 |
| FOUND-07 | MDC log output contains only allowlisted fields | unit | `./mvnw -q test -Dtest=MdcAllowlistTest` | ❌ Wave 0 |
| FOUND-10 | Typed properties reject invalid values at startup | unit | `./mvnw -q test -Dtest=AppConfigPropertiesTest` | ❌ Wave 0 |
| FOUND-10 | Consul KV values resolve to typed properties under `consul` profile | integration (TC Consul) | `./mvnw -q verify -Dtest=ConsulConfigIntegrationTest` | ❌ Wave 0 |
| GATE-01 | Modulith verify passes | Same as FOUND-01 above | Same | ❌ Wave 0 |
| GATE-02 | ArchUnit rules fire on intentional violations | unit | `./mvnw -q test -Dtest=ArchitectureGatesTest` | ❌ Wave 0 |
| AGENT-08 | verify --fast completes under 60s | meta-gate | `task verify:fast` → check TOTAL line | ❌ Wave 0 (timing verified at runtime) |

### Wave 0 Gaps

- [ ] `backend/pom.xml` — Maven skeleton with Boot 4.0.7 parent, Modulith 2.0.6 BOM, all Phase 2 deps
- [ ] `backend/src/main/java/com/acme/app/Application.java` — `@SpringBootApplication`
- [ ] `backend/src/test/java/com/acme/app/ModulithVerifyTest.java`
- [ ] `backend/src/test/java/com/acme/app/ArchitectureGatesTest.java`
- [ ] `backend/src/test/resources/application-test.yml` — test profile config
- [ ] `scripts/checks/run-gate.mjs` — Phase 2 gate additions (backend-compile, archunit, modulith-verify, backend-unit in fast; backend-integration, kill-listener-test in full)
- [ ] Maven Wrapper files: `backend/mvnw`, `backend/mvnw.cmd`, `backend/.mvn/wrapper/maven-wrapper.properties`

---

## Security Domain

> FOUND-07 includes structured logs with PII allowlist — the MDC allowlist is a security control.

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No (Phase 3) | — |
| V3 Session Management | No (Phase 3) | — |
| V4 Access Control | No (Phase 3) | — |
| V5 Input Validation | Yes — `@ConfigurationProperties` + `@Validated` | Zod on FE (Phase 4); Bean Validation on BE config |
| V6 Cryptography | No (Phase 2) | — |
| V7 Error Handling / Logging | Yes — MDC PII allowlist | logstash-logback-encoder whitelist config |

### PII Logging Threat

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| PII leaking into structured logs | Information disclosure | logstash-logback-encoder `includeMdcKeyName` whitelist — explicit allowlist, everything else excluded |
| Config property values in logs | Information disclosure | Spring Boot `management.endpoint.env.show-values=NEVER` (default in Boot 4) |

---

## Open Questions (RESOLVED)

> All four open questions are resolved by Phase 2 plan decisions (see each RESOLVED: line below). Resolutions are binding for execution.

### Q-1: Spring Cloud + Boot 4.0.x Consul Compatibility (HIGH PRIORITY — D-07 locked)

**What we know:** D-07 locks `spring-cloud-consul-config` as the Consul integration. Boot 4.0.x is a 2026 release. Spring Cloud release trains lag behind Boot releases.
**What's unclear:** Which Spring Cloud release train (e.g., `2025.x`, `2024.x`) is compatible with Spring Boot 4.0.x? Does Spring Cloud Consul 4.x support Boot 4? Is the `spring.config.import: optional:consul:` pattern stable in the Boot 4 era?
**Risk if wrong:** Consul dependency fails to compile or autoconfigure; D-08 Testcontainers test cannot run; FOUND-10 partial.
**Recommendation:** The planner MUST add a "verify Spring Cloud compatibility" task in Wave 0, before any consul code is written. Check https://spring.io/projects/spring-cloud for the Boot 4 compatible release train. If no compatible train exists, flag as blocker before implementing D-07.
**RESOLVED:** Plan 01 Task 1 is the Wave-0 spike (.planning/spikes/q1-spring-cloud-consul-compat.md, VERDICT COMPATIBLE|BLOCKED). Plan 02 Task 2 gates the Consul BOM/profile on that verdict; BLOCKED defers Consul to env+ConfigMap and skips the Plan 05 Consul Testcontainers test.

### Q-2: Bounded Retry Implementation in Modulith 2.0 (MEDIUM PRIORITY — D-12)

**What we know:** D-12 requires bounded retries. Modulith 2.0 republishes outstanding events on restart but does not natively cap retry count.
**What's unclear:** Does Modulith 2.0.6 expose `EventPublicationRepository` as a stable bean for decoration? Or is the retry count better tracked in the listener itself via a separate counter table?
**Recommendation:** Planner should spec out Option A (listener-side counter using natural key) for Phase 2 since it needs no framework internals. A separate `event_retry_tracking` table (or a check-before-write count in each idempotent listener) is sufficient for the bounded-retry proof.
**RESOLVED:** Option A (listener-side attempt counter) adopted in Plan 05 Task 1 -- shared/events/BoundedRetryListenerSupport reads EventRetryProperties from appconfig::spi; BoundedRetryTest proves the bound. No framework-internal decoration.

### Q-3: ArchUnit 1.4.2 + JUnit 6 Compatibility (MEDIUM PRIORITY)

**What we know:** ArchUnit 1.4.2 supports Java 26 (class file 70) via ASM upgrade. JUnit 6 is the renamed Jupiter line.
**What's unclear:** Does ArchUnit 1.4.2 support the JUnit 6 module name / runner class? Or does it still bind to JUnit 5 extension API (which should be binary-compatible)?
**Recommendation:** Plan a fallback: if `@ArchTest` runner fails under JUnit 6, rewrite ArchUnit tests using `ArchUnit.check()` in plain `@Test` methods. This is equally effective and avoids JUnit runner dependencies.
**RESOLVED:** Plan 01 Task 3 carries the fallback explicitly -- if @ArchTest/@AnalyzeClasses fail under JUnit 6, use plain @Test + rule.check(importedClasses) over a shared ClassFileImporter().importPackages(com.acme.app); the chosen path is recorded in the SUMMARY.

### Q-4: Modulith Per-Module Flyway Auto-Discovery (LOW PRIORITY)

**What we know:** `spring.modulith.runtime.flyway-enabled=true` exists in Modulith config. Boot 4 Flyway auto-configures from `spring-boot-starter-flyway`.
**What's unclear:** Does Modulith 2.0's `flyway-enabled` flag automatically pick up `db/migration/<module>/` paths, or must they be registered explicitly in a `FlywayConfigurationCustomizer` bean?
**Recommendation:** Plan for explicit registration in `FlywayConfigurationCustomizer` — safer and more transparent. The `new-module` skill can append to this customizer as part of its output contract.
**RESOLVED:** Explicit registration chosen. Plan 02 Task 2 creates the single appconfig/ModuleFlywayLocationsCustomizer (FlywayConfigurationCustomizer) that owns per-module locations; the Plan 02 new-module scaffold appends classpath:db/migration/<module> to THAT file when hasTables=true. Plan 01 seeds the shared location and SharedFlywaySchemaTest proves it on real PG.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Single-module Maven layout is correct for Modulith | Architecture Patterns | Multi-module Maven would require non-trivial aggregator config + may break `ApplicationModules.of()` scanner |
| A2 | `m.getName()` returns the module's subpackage simple name | Pattern 2 | Dynamic name-set assertion would need different API call |
| A3 | `@ServiceConnection` for Consul is supported in Testcontainers 2.x + Boot 4 | Pattern 6 / Consul section | ConsulConfigIntegrationTest would need manual property wiring |
| A4 | `CompletedEventPublications` is a Modulith 2.0 API class name | EPR Deep Dive | Cleanup task code would use wrong class |
| A5 | OTel endpoint property path is `management.otlp.tracing.endpoint` | Observability | OTel traces won't export locally |
| A6 | logstash-logback-encoder `includeMdcKeyName` tag is correct | Observability | MDC allowlist would not filter PII fields |
| A7 | `EventPublicationRepository` is a stable extension point in Modulith 2.0.6 | Bounded Retry | Retry decoration approach would fail |
| A8 | ArchUnit 1.4.x works under JUnit 6 with `@ArchTest` annotation | ArchUnit Gates | Need fallback to plain `@Test` + `ArchUnit.check()` |
| A9 | Spring Cloud 2025.x (or equivalent) is compatible with Spring Boot 4.0.x | Config/Consul | D-07 Consul path blocked; Testcontainers test cannot prove FOUND-10 |
| A10 | Modulith 2.0 `spring.modulith.runtime.flyway-enabled` controls per-module path scanning | Flyway section | Need explicit `FlywayConfigurationCustomizer` regardless |

---

## Sources

### Primary (HIGH confidence — from CLAUDE.md which cites authoritative sources)
- `CLAUDE.md` Technology Stack section — all version pins with cited sources (verified 2026-06-11 by prior research phase)
- `CLAUDE.md` JDK 25 LTS override — user decision 2026-06-11, binding
- Context7 / spring-projects/spring-modulith — JDBC EPR completion modes, staleness config, `@ApplicationModule`, `@ApplicationModuleTest`, `Scenario` API
- `.planning/spikes/q004-verify-fast.md` — gate-set growth rules, timing format, budget contract

### Secondary (MEDIUM confidence — Context7 with Low-reputation source)
- Context7 / spring-projects/spring-modulith: `DatabaseSchemaInitializer` source code — schema initialization logic, table-exists check, v2 schema
- Context7 / spring-projects/spring-modulith: configuration property appendix — staleness properties, runtime flags

### Tertiary (LOW confidence — training knowledge, marked [ASSUMED])
- Maven single-module layout recommendation
- ArchUnit DSL method names for JUnit 6
- Testcontainers 2.x `@ServiceConnection` for Consul
- Spring Cloud Boot 4 compatible release train (UNKNOWN — Open Question Q-1)
- OTel/Actuator endpoint property paths in Boot 4
- MDC allowlist mechanism in logstash-logback-encoder

---

## Metadata

**Confidence breakdown:**
- Standard stack versions: HIGH — locked in CLAUDE.md from prior authoritative research
- Module structure / Modulith patterns: HIGH for core patterns (Context7 verified); MEDIUM for edge cases (per-module Flyway, name-set assertion API)
- ArchUnit rules: MEDIUM — DSL shape from training knowledge; JUnit 6 compat unconfirmed
- JDBC EPR: HIGH for completion modes + staleness config (Context7 verified); MEDIUM for bounded retry extension (custom implementation required)
- Consul/Spring Cloud compatibility: LOW — Open Question Q-1 is a genuine blocker risk
- Observability wiring: MEDIUM — Boot 4 Actuator patterns assumed from Boot 3 basis

**Research date:** 2026-06-13
**Valid until:** 2026-07-13 (Spring Modulith 2.0.x is a stable line; Boot 4.0.x patch releases don't affect patterns)
