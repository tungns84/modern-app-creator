# Phase 2: Backend Foundation — Pattern Map

**Mapped:** 2026-06-13
**Files analyzed:** 18 new files (greenfield — `backend/` contains only `CLAUDE.md`)
**Analogs found:** 2 / 18 (in-repo analogs for gate runner and compose config; all Java files have no in-repo analog — canonical reference patterns from RESEARCH.md used instead)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `backend/pom.xml` | config | — | none in-repo | no-analog |
| `backend/mvnw` / `mvnw.cmd` / `.mvn/wrapper/maven-wrapper.properties` | config | — | none in-repo | no-analog |
| `backend/src/main/java/com/acme/app/Application.java` | config | — | none in-repo | no-analog |
| `backend/src/main/java/com/acme/app/shared/package-info.java` | config | — | none in-repo | no-analog |
| `backend/src/main/java/com/acme/app/shared/scheduling/ScheduledTask.java` | utility | event-driven | none in-repo | no-analog |
| `backend/src/main/java/com/acme/app/shared/query/NativeQuery.java` | utility | CRUD | none in-repo | no-analog |
| `backend/src/main/java/com/acme/app/appconfig/package-info.java` | config | — | none in-repo | no-analog |
| `backend/src/main/java/com/acme/app/appconfig/EventRetryProperties.java` | config | request-response | none in-repo | no-analog |
| `backend/src/main/java/com/acme/app/appconfig/EventRetentionProperties.java` | config | request-response | none in-repo | no-analog |
| `backend/src/main/java/com/acme/app/appconfig/spi/` (package) | config | request-response | none in-repo | no-analog |
| `backend/src/main/java/com/acme/app/i18n/package-info.java` | config | — | none in-repo | no-analog |
| `backend/src/main/java/com/acme/app/caching/package-info.java` | config | — | none in-repo | no-analog |
| `backend/src/main/java/com/acme/app/observability/package-info.java` | config | — | none in-repo | no-analog |
| `backend/src/main/java/com/acme/app/observability/EventPublicationCleanupTask.java` | service | event-driven | none in-repo | no-analog |
| `backend/src/main/resources/application.yml` | config | — | `infra/compose.yaml` | partial (env config idiom) |
| `backend/src/test/java/com/acme/app/ModulithVerifyTest.java` | test | — | none in-repo | no-analog |
| `backend/src/test/java/com/acme/app/ArchitectureGatesTest.java` | test | — | none in-repo | no-analog |
| `backend/src/test/java/com/acme/app/observability/KillListenerTest.java` | test | event-driven | none in-repo | no-analog |
| `scripts/checks/run-gate.mjs` (modify) | utility | request-response | `scripts/checks/run-gate.mjs` | exact (extend existing) |
| `Taskfile.yml` (modify) | config | — | `Taskfile.yml` | exact (extend existing) |

---

## Pattern Assignments

### `backend/pom.xml` (config)

**Analog:** None in-repo — use RESEARCH.md canonical pattern.

**BOM / parent pattern** (from RESEARCH.md Standard Stack section):
```xml
<parent>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-parent</artifactId>
  <version>4.0.7</version>
</parent>

<properties>
  <java.version>25</java.version>   <!-- JDK 25 LTS — class file 69; user override 2026-06-11 -->
  <bpm.enabled>true</bpm.enabled>
</properties>

<dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>org.springframework.modulith</groupId>
      <artifactId>spring-modulith-bom</artifactId>
      <version>2.0.6</version>
      <scope>import</scope>
      <type>pom</type>
    </dependency>
    <dependency>
      <groupId>org.testcontainers</groupId>
      <artifactId>testcontainers-bom</artifactId>
      <!-- version managed by Boot 4.0.7 BOM -->
      <scope>import</scope>
      <type>pom</type>
    </dependency>
  </dependencies>
</dependencyManagement>
```

**Flyway Boot 4 gotcha** — both artifacts required (RESEARCH.md Pitfall 3):
```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-flyway</artifactId>
</dependency>
<dependency>
  <groupId>org.flywaydb</groupId>
  <artifactId>flyway-database-postgresql</artifactId>
  <!-- DO NOT pin version — Boot manages it -->
</dependency>
```

**Modulith starters** (RESEARCH.md Standard Stack):
```xml
<dependency>
  <groupId>org.springframework.modulith</groupId>
  <artifactId>spring-modulith-starter-jdbc</artifactId>  <!-- JDBC EPR -->
</dependency>
<dependency>
  <groupId>org.springframework.modulith</groupId>
  <artifactId>spring-modulith-starter-actuator</artifactId>
</dependency>
<dependency>
  <groupId>org.springframework.modulith</groupId>
  <artifactId>spring-modulith-starter-test</artifactId>
  <scope>test</scope>
</dependency>
```

**ArchUnit — must pin explicitly, Boot does NOT manage it** (CLAUDE.md):
```xml
<dependency>
  <groupId>com.tngtech.archunit</groupId>
  <artifactId>archunit-junit5</artifactId>
  <version>1.4.2</version>  <!-- minimum; 1.4.1 fails on class file 69+ -->
  <scope>test</scope>
</dependency>
```

**BPM option Maven profile** (D-05, RESEARCH.md Pattern context):
```xml
<profiles>
  <profile>
    <id>bpm-off</id>
    <build>
      <plugins>
        <plugin>
          <groupId>org.apache.maven.plugins</groupId>
          <artifactId>maven-compiler-plugin</artifactId>
          <configuration>
            <excludes>
              <exclude>com/acme/app/bpm/**</exclude>
            </excludes>
          </configuration>
        </plugin>
      </plugins>
    </build>
  </profile>
</profiles>
```

**Surefire — pass bpm.enabled to tests** (RESEARCH.md Pattern 2):
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

---

### `backend/src/main/java/com/acme/app/Application.java` (config)

**Analog:** None in-repo — standard Spring Boot entry point.

**Core pattern** (standard Boot 4):
```java
package com.acme.app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

---

### `backend/src/main/java/com/acme/app/<module>/package-info.java` (config — module boundary)

**Analog:** None in-repo — use RESEARCH.md Pattern 1.

**Boundary declaration pattern** (RESEARCH.md Pattern 1, verified via Context7/spring-modulith):
```java
// shared — foundation; no upstream module deps
@org.springframework.modulith.ApplicationModule(
    allowedDependencies = {}
)
package com.acme.app.shared;
```

```java
// appconfig — reads shared only; exposes spi surface
@org.springframework.modulith.ApplicationModule(
    allowedDependencies = { "shared" }
)
package com.acme.app.appconfig;
```

```java
// i18n, caching, observability — reads shared + appconfig's spi surface only
@org.springframework.modulith.ApplicationModule(
    allowedDependencies = { "shared", "appconfig::spi" }
)
package com.acme.app.i18n;
```

Named interface (::spi) means only classes in `com.acme.app.appconfig.spi` are accessible from outside appconfig.

---

### `backend/src/main/java/com/acme/app/shared/scheduling/ScheduledTask.java` (utility, event-driven)

**Analog:** None in-repo.

**Purpose:** Wrapper that replaces bare `@Scheduled` — GATE-02 bans `@Scheduled` outside this package.

**Core pattern** (from RESEARCH.md anti-pattern description + D-03):
```java
package com.acme.app.shared.scheduling;

/**
 * Project-sanctioned scheduling wrapper.
 * All scheduled tasks MUST be registered here — bare @Scheduled is banned by GATE-02.
 * Allows central audit, testing, and enable/disable control.
 */
public interface ScheduledTask {
    String name();
    void execute();
}
```

The `ScheduledTask` implementations register themselves via a `@Scheduled` method declared
only inside this package (satisfying the ArchUnit rule that allows `@Scheduled` exclusively
in `com.acme.app.shared.scheduling..`).

---

### `backend/src/main/java/com/acme/app/shared/query/NativeQuery.java` (utility, CRUD)

**Analog:** None in-repo.

**Purpose:** Sanctioned native query wrapper — GATE-02 bans `@Query(nativeQuery=true)` outside this package.

**Core pattern** (from RESEARCH.md anti-pattern description + D-03):
```java
package com.acme.app.shared.query;

/**
 * Marker/base for all native SQL queries.
 * Native queries outside com.acme.app.shared.query are banned by GATE-02
 * to enforce PII audit trail on raw SQL.
 */
public interface NativeQuery<T> {
    T execute();
}
```

---

### `backend/src/main/java/com/acme/app/appconfig/EventRetryProperties.java` (config, request-response)

**Analog:** None in-repo — use RESEARCH.md Pattern 5 + typed properties pattern.

**Typed properties record pattern** (RESEARCH.md Config Properties section):
```java
package com.acme.app.appconfig;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@ConfigurationProperties("acme.events.retry")
@Validated
public record EventRetryProperties(
    @Min(1) @Max(10) int maxAttempts,
    @NotNull Duration initialDelay,
    double multiplier,
    @NotNull Duration maxDelay
) {
    // Canonical constructor provides defaults — Boot calls this on startup
    public EventRetryProperties() {
        this(3, Duration.ofSeconds(10), 2.0, Duration.ofMinutes(5));
    }
}
```

Key rules:
- `@ConfigurationProperties` record — NOT `@Value` (banned by GATE-02/D-09 outside appconfig)
- `@Validated` — Boot validates at startup; invalid values = fast startup failure
- Exposed via `appconfig::spi` so other modules inject the record, never raw `Environment`
- Jackson 3 note: if this record is serialized, use `tools.jackson.*` (not `com.fasterxml.jackson`)

---

### `backend/src/main/resources/application.yml` (config)

**Analog:** Partial match from `infra/compose.yaml` (env-var injection idiom `${VAR:default}`).

**JDBC EPR + staleness config** (RESEARCH.md Pattern 4, verified via Context7):
```yaml
spring:
  modulith:
    events:
      jdbc:
        schema-initialization:
          enabled: true          # creates EVENT_PUBLICATION (v2 schema — greenfield, never set use-legacy-structure)
      republish-outstanding-events-on-restart: true
      staleness:
        published: 10m
        resubmitted: 30m
    runtime:
      flyway-enabled: false      # App Flyway handles app tables; Modulith handles EPR via schema-init
```

**Actuator / probes config** (RESEARCH.md Observability section):
```yaml
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
  tracing:
    sampling:
      probability: 1.0   # 100% in dev
  otlp:
    tracing:
      endpoint: http://localhost:4318/v1/traces   # otel-lgtm local (port 4318 confirmed in compose.yaml)
```

**Consul profile** (D-07, RESEARCH.md Config switch section):
```yaml
# application-consul.yml
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

**WARNING — open question Q-1:** Spring Cloud release train compatible with Boot 4.0.x is unverified. Planner must add a Wave 0 verification task before writing any consul code.

---

### `backend/src/main/resources/logback-spring.xml` (config, observability)

**Analog:** None in-repo — use RESEARCH.md Observability section.

**MDC PII allowlist pattern** (RESEARCH.md Structured JSON Logs):
```xml
<configuration>
  <appender name="JSON" class="ch.qos.logback.core.ConsoleAppender">
    <encoder class="net.logstash.logback.encoder.LogstashEncoder">
      <!-- Explicit allowlist — everything NOT listed is excluded (PII protection) -->
      <includeMdcKeyName>requestId</includeMdcKeyName>
      <includeMdcKeyName>userId</includeMdcKeyName>
      <includeMdcKeyName>tenantId</includeMdcKeyName>
      <includeMdcKeyName>traceId</includeMdcKeyName>
      <includeMdcKeyName>spanId</includeMdcKeyName>
      <!-- DO NOT add: email, ip, userAgent, name — PII banned from structured logs -->
    </encoder>
  </appender>

  <root level="INFO">
    <appender-ref ref="JSON" />
  </root>
</configuration>
```

Dependency (add to pom.xml):
```xml
<dependency>
  <groupId>net.logstash.logback</groupId>
  <artifactId>logstash-logback-encoder</artifactId>
  <!-- Pin latest stable at plan time; Boot does not manage this -->
</dependency>
```

---

### `backend/src/test/java/com/acme/app/ModulithVerifyTest.java` (test, module boundary)

**Analog:** None in-repo — use RESEARCH.md Pattern 2.

**Dynamic name-set assertion pattern** (RESEARCH.md Pattern 2):
```java
package com.acme.app;

import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;

import static org.assertj.core.api.Assertions.assertThat;

class ModulithVerifyTest {

    static final Set<String> BASE_MODULES =
        Set.of("shared", "appconfig", "i18n", "caching", "observability");

    @Test
    void modulesVerify() {
        var modules = ApplicationModules.of(Application.class);
        modules.verify();  // GATE-01: acyclic DAG + declared-deps-only

        var bpmEnabled = Boolean.parseBoolean(
            System.getProperty("bpm.enabled", "true"));

        var expected = new HashSet<>(BASE_MODULES);
        if (bpmEnabled) {
            expected.add("bpm");
        }

        var actual = modules.stream()
            .map(m -> m.getName())   // [ASSUMED: verify m.getName() API in Modulith 2.0.6 Javadoc]
            .collect(Collectors.toSet());

        assertThat(actual).isEqualTo(expected);
    }
}
```

Key rules:
- Name SET assertion (D-06), not count
- `bpm.enabled` injected via Maven Surefire `systemPropertyVariables` (see pom.xml pattern above)
- `modules.verify()` is GATE-01 — acyclic + declared deps enforcement
- No containers needed — pure classpath scan → belongs in `--fast` gate set

---

### `backend/src/test/java/com/acme/app/ArchitectureGatesTest.java` (test, GATE-02)

**Analog:** None in-repo — use RESEARCH.md ArchUnit section.

**ArchUnit rules pattern** (RESEARCH.md ArchUnit Gate Rules section):
```java
package com.acme.app;

import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.Entity;
import org.springframework.web.bind.annotation.RestController;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noFields;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noMethods;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

@AnalyzeClasses(packages = "com.acme.app")
class ArchitectureGatesTest {

    @ArchTest
    static final ArchRule NO_FIELD_INJECTION =
        noFields()
            .that().areAnnotatedWith(Autowired.class)
            .should().exist()
            .because("GATE-02/NO_FIELD_INJECTION: Use constructor injection. " +
                "Fix: remove @Autowired from field; add constructor parameter.");

    @ArchTest
    static final ArchRule NO_BARE_SCHEDULED =
        noMethods()
            .that().areAnnotatedWith(Scheduled.class)
            .and().areDeclaredInClassesThat()
                .resideOutsideOfPackage("com.acme.app.shared.scheduling..")
            .should().exist()
            .because("GATE-02/NO_BARE_SCHEDULED: Use the shared scheduling wrapper. " +
                "Fix: implement ScheduledTask in com.acme.app.shared.scheduling.");

    @ArchTest
    static final ArchRule NO_TRANSACTIONAL_PRIVATE =
        noMethods()
            .that().areAnnotatedWith(Transactional.class)
            .and().arePrivate()
            .should().exist()
            .because("GATE-02/NO_TRANSACTIONAL_PRIVATE: @Transactional on private methods is a no-op. " +
                "Fix: make the method package-private or public.");

    @ArchTest
    static final ArchRule NO_ENTITY_IN_CONTROLLERS =
        noClasses()
            .that().areAnnotatedWith(Entity.class)
            .should().beAccessedByClassesThat().areAnnotatedWith(RestController.class)
            .because("GATE-02/NO_ENTITY_IN_CONTROLLERS: Map entities to DTOs at API boundary. " +
                "Fix: create a record DTO and map with MapStruct.");

    @ArchTest
    static final ArchRule NO_VALUE_OUTSIDE_APPCONFIG =
        noFields()
            .that().areAnnotatedWith(Value.class)
            .and().areDeclaredInClassesThat()
                .resideOutsideOfPackage("com.acme.app.appconfig..")
            .should().exist()
            .because("GATE-02/NO_VALUE_OUTSIDE_APPCONFIG: Inject typed @ConfigurationProperties record " +
                "from appconfig::spi. Fix: replace @Value with the appropriate Properties record.");

    @ArchTest
    static final ArchRule NO_ENVIRONMENT_INJECTION_OUTSIDE_APPCONFIG =
        noFields()
            .that().haveRawType(Environment.class)
            .and().areDeclaredInClassesThat()
                .resideOutsideOfPackage("com.acme.app.appconfig..")
            .should().exist()
            .because("GATE-02/NO_ENVIRONMENT_INJECTION: Inject typed @ConfigurationProperties record " +
                "from appconfig::spi. Fix: remove Environment field; use Properties record.");
}
```

**Critical open question (RESEARCH.md Q-3):** ArchUnit 1.4.2 JUnit 6 (`@ArchTest`/`@AnalyzeClasses`) compatibility is unconfirmed. Fallback: rewrite each rule as a plain `@Test` method calling `rule.check(importedClasses)` — equally effective, avoids JUnit runner dependency.

---

### `backend/src/test/java/com/acme/app/observability/KillListenerTest.java` (test, event-driven, --full)

**Analog:** None in-repo — use RESEARCH.md Pattern 6.

**Testcontainers 2.x pattern** (RESEARCH.md Pattern 6 + Pitfall 1):
```java
package com.acme.app.observability;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Testcontainers
class KillListenerTest {

    @Container
    @ServiceConnection   // Boot 4 autoconfigures datasource — NO @DynamicPropertySource needed
    static PostgreSQLContainer<?> postgres =
        new PostgreSQLContainer<>("postgres:16-alpine");

    // Test outline (planner fills implementation):
    // Step 1: Publish an application event that triggers a listener
    // Step 2: Force listener to throw BEFORE completing (simulates death)
    // Step 3: Assert EVENT_PUBLICATION record is INCOMPLETE in DB
    // Step 4: Trigger republish (simulate restart via ApplicationModules or direct EPR call)
    // Step 5: Assert EVENT_PUBLICATION record is COMPLETED
    // Step 6: Assert side-effect table has EXACTLY 1 row (not 2 — idempotency)

    @Test
    void eventNotLostOnListenerDeath() {
        // implementation per spec NNN-kill-listener
    }

    @Test
    void sideEffectAppliedExactlyOnceAfterRedelivery() {
        // implementation per spec NNN-kill-listener
    }
}
```

**Testcontainers 2.x anti-patterns to avoid** (RESEARCH.md Pitfall 1):
- WRONG: `.withExposedPorts(5432)` + `@DynamicPropertySource` setting `spring.datasource.url`
- RIGHT: `@ServiceConnection` — Boot 4 reads the container URL automatically
- Import: `org.springframework.boot.testcontainers.service.connection.ServiceConnection`

---

### `backend/src/test/java/com/acme/app/appconfig/ConsulConfigIntegrationTest.java` (test, config, --full)

**Analog:** None in-repo — use RESEARCH.md Consul Testcontainers section.

**Pattern** (RESEARCH.md Config Properties + Consul section):
```java
@SpringBootTest(properties = "spring.profiles.active=consul")
@Testcontainers
class ConsulConfigIntegrationTest {

    @Container
    @ServiceConnection  // [ASSUMED: verify ConsulContainer @ServiceConnection in TC 2.0.5 — see Q-1]
    static ConsulContainer consul = new ConsulContainer("hashicorp/consul:1.19");

    @Test
    void typedPropertiesResolveFromConsulKV(
            @Autowired EventRetryProperties props) {
        // Seed KV via ConsulClient REST before assert
        assertThat(props.maxAttempts()).isGreaterThan(0);
    }
}
```

**Blocker:** This test cannot be written until Q-1 (Spring Cloud + Boot 4 compatibility) is resolved. Planner must gate this test on Q-1 verification.

---

### `backend/src/test/java/com/acme/app/<module>/<Module>ModuleTest.java` (test, module slice)

**Analog:** None in-repo — use RESEARCH.md Pattern 3.

**@ApplicationModuleTest pattern** (RESEARCH.md Pattern 3, verified via Context7):
```java
package com.acme.app.appconfig;

import org.springframework.modulith.test.ApplicationModuleTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;

@ApplicationModuleTest   // boots only this module's slice — faster than @SpringBootTest
class AppConfigModuleTest {

    @Autowired
    EventRetryProperties retryProperties;

    @Test
    void defaultsAreValid() {
        assertThat(retryProperties.maxAttempts()).isBetween(1, 10);
        assertThat(retryProperties.initialDelay()).isNotNull();
    }
}
```

`@ApplicationModuleTest` enforces `allowedDependencies` — if the module imports something outside its declared deps, the test fails.

---

### `scripts/checks/run-gate.mjs` (utility, extend existing — exact match)

**Analog:** `scripts/checks/run-gate.mjs` — exact match. **Read lines 34–73 for the `gates()` function structure.**

**Extension pattern** — add Phase 2 gates to the existing `gates()` function following the same object shape `{ name, argv }`:

```javascript
// Phase 2 fast gates (add to gates() array — these run in --fast mode):
{
  name: "backend-compile",
  argv: ["./mvnw", "-q", "compile", "-f", "backend/pom.xml"],
  fast: true,
},
{
  name: "archunit",
  argv: ["./mvnw", "-q", "test", "-pl", "backend",
         "-Dtest=ArchitectureGatesTest", "-f", "backend/pom.xml"],
  fast: true,
},
{
  name: "modulith-verify",
  argv: ["./mvnw", "-q", "test", "-pl", "backend",
         "-Dtest=ModulithVerifyTest", "-f", "backend/pom.xml"],
  fast: true,
},
{
  name: "backend-unit",
  argv: ["./mvnw", "-q", "test", "-pl", "backend",
         "-Dgroups=unit", "-f", "backend/pom.xml"],
  fast: true,
},

// Phase 2 full-only gates (--full mode only):
{
  name: "backend-integration",
  argv: ["./mvnw", "-q", "verify", "-pl", "backend",
         "-Dgroups=integration", "-f", "backend/pom.xml"],
  fast: false,
},
{
  name: "kill-listener-test",
  argv: ["./mvnw", "-q", "verify", "-pl", "backend",
         "-Dtest=KillListenerTest", "-f", "backend/pom.xml"],
  fast: false,
},
```

The existing `gates()` function (lines 35–73) must gain fast/full awareness. Current Phase 1 code has no fast/full split (`mode` variable exists in `main()` but both modes run the same set). Phase 2 adds the D-19 divergence: the `gates()` function should accept `mode` parameter and filter entries accordingly.

**Gate error output format (AGENT-08, Q-004 §5)**  — already implemented in run-gate.mjs lines 130–136. New Maven gate failures must produce ArchUnit-format output the runner captures and relays:
```
GATE archunit 8412ms FAIL

  VIOLATED: NO_FIELD_INJECTION
  Location: com.acme.app.i18n.MessageService.messageSource (@Autowired field)
  Fix: Replace field injection with constructor injection.
```

---

### `Taskfile.yml` (config, extend existing — exact match)

**Analog:** `Taskfile.yml` — exact match. **Read lines 37–46 for the verify task shape.**

The existing `verify` and `verify:fast` tasks (lines 37–46) already delegate to `run-gate.mjs`. No structural change needed — Phase 2 gate additions live entirely in `run-gate.mjs`. The Taskfile comment on line 13 (`Phase 2 adds container-class gates to 'verify' only`) documents the intended split.

**If Maven wrapper must be called from Taskfile**, add:
```yaml
  backend:build:
    desc: Compile backend (./mvnw compile)
    cmds:
      - ./mvnw -q compile -f backend/pom.xml
```

Note: Taskfile.yml is T3 (listed in `.cowork/tiers.json`) — any change requires H2 approval.

---

## Shared Patterns

### Constructor Injection (all Java files)
**Source:** `backend/CLAUDE.md` (ban on field injection)
**Apply to:** Every Spring component in all modules
```java
// RIGHT — constructor injection
@Component
@RequiredArgsConstructor
public class MyService {
    private final MyDependency dep;  // injected via constructor
}

// WRONG — banned by GATE-02
@Component
public class MyService {
    @Autowired MyDependency dep;  // GATE-02 violation: field injection
}
```

### @ConfigurationProperties consumption (all modules except appconfig)
**Source:** RESEARCH.md D-09 + ArchUnit Rule NO_VALUE_OUTSIDE_APPCONFIG
**Apply to:** All modules other than `appconfig`
```java
// RIGHT — inject the typed record from appconfig::spi
@Component
@RequiredArgsConstructor
public class CacheService {
    private final CacheProperties props;  // appconfig::spi record
}

// WRONG — banned by GATE-02
@Component
public class CacheService {
    @Value("${acme.cache.ttl}") Duration ttl;  // GATE-02 violation
}
```

### Testcontainers 2.x ServiceConnection (all integration tests)
**Source:** RESEARCH.md Pitfall 1 + Pattern 6
**Apply to:** KillListenerTest, ConsulConfigIntegrationTest, any future integration test
```java
// RIGHT — Testcontainers 2.x with Boot 4
@Container
@ServiceConnection
static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");
// Boot 4 autoconfigures spring.datasource.* from container — no @DynamicPropertySource

// WRONG — 1.x idiom, breaks with Boot 4 + TC 2.x
@DynamicPropertySource
static void props(DynamicPropertyRegistry r) {
    r.add("spring.datasource.url", postgres::getJdbcUrl);  // Pitfall 1 anti-pattern
}
```

### Jackson 3 imports (any file using JSON)
**Source:** `backend/CLAUDE.md` + RESEARCH.md Pitfall 2
**Apply to:** Any class deserializing/serializing JSON
```java
// RIGHT — Jackson 3 (Boot 4-managed)
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.JsonNode;

// WRONG — Jackson 2 packages (training data hallucination trap)
import com.fasterxml.jackson.databind.ObjectMapper;  // WRONG in this stack
// EXCEPTION: com.fasterxml.jackson.annotation.* is still valid (annotations kept old package)
```

### Module communication rules
**Source:** `backend/CLAUDE.md`
**Apply to:** Any cross-module interaction
- Writes / state changes → publish Spring Modulith application events
- Reads → only through `<module>::spi` named interface
- Never call directly into another module's internal classes

---

## No Analog Found

All Java backend files are new — no in-repo analogs exist. Every Java pattern comes from RESEARCH.md canonical patterns (verified via Context7 against official Spring Modulith docs).

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `backend/pom.xml` | config | — | First Maven file in the project |
| `backend/src/main/java/com/acme/app/**/*.java` | all | all | Greenfield — `backend/` had only `CLAUDE.md` before Phase 2 |
| `backend/src/test/java/**/*.java` | test | all | No Java tests exist yet |

**Reference for no-analog files:** Use patterns from `02-RESEARCH.md` sections:
- Module boundary → RESEARCH.md Pattern 1
- Module name-set assertion → RESEARCH.md Pattern 2
- @ApplicationModuleTest → RESEARCH.md Pattern 3
- JDBC EPR config → RESEARCH.md Pattern 4
- Typed properties → RESEARCH.md Pattern 5
- Kill-listener test → RESEARCH.md Pattern 6
- Per-module Flyway → RESEARCH.md Pattern 7
- ArchUnit rules → RESEARCH.md ArchUnit Gate Rules section
- Observability config → RESEARCH.md Observability section

---

## Open Questions for Planner (from RESEARCH.md)

These must be resolved before implementing the affected files:

| ID | Question | Blocks | Priority |
|----|----------|--------|----------|
| Q-1 | Spring Cloud release train compatible with Boot 4.0.x | `application-consul.yml`, `ConsulConfigIntegrationTest` | HIGH — add Wave 0 verify task |
| Q-2 | Bounded retry implementation: listener-side counter vs `EventPublicationRepository` decoration | `EventPublicationCleanupTask` + retry logic | MEDIUM |
| Q-3 | ArchUnit 1.4.2 + JUnit 6 `@ArchTest` / `@AnalyzeClasses` compatibility | `ArchitectureGatesTest` | MEDIUM — plan fallback to plain `@Test` + `rule.check()` |
| Q-4 | Does `spring.modulith.runtime.flyway-enabled` auto-discover per-module paths | `FlywayConfigurationCustomizer` | LOW — plan explicit `FlywayConfigurationCustomizer` as default |

---

## Metadata

**Analog search scope:** `/d/projects/modern-app-creator/backend/`, `/d/projects/modern-app-creator/scripts/checks/`, `/d/projects/modern-app-creator/infra/`, `/d/projects/modern-app-creator/.claude/skills/`
**Files scanned:** 5 (backend/CLAUDE.md, scripts/checks/run-gate.mjs, infra/compose.yaml, Taskfile.yml, .claude/skills/new-module/SKILL.md)
**Java files in backend:** 0 (greenfield)
**Pattern extraction date:** 2026-06-13
