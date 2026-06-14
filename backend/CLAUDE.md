# Backend — Spring Boot 4 Modulith (`com.acme.app`)

Rules for working in `backend/`. The root `CLAUDE.md` owns commands, risk
tiers and the anti-stack list — none of that is repeated here.

## Module layout

- Base package: `com.acme.app`. Each Modulith module is a direct subpackage
  (`com.acme.app.<module>`) whose `package-info.java` declares
  `@ApplicationModule(allowedDependencies = ...)` — that file IS the boundary
  and is a T3 path.
- Module DAG summary: no application modules exist yet (the first ones arrive
  in Phase 2). To add a module, use the `new-module` skill
  (`.claude/skills/new-module/`) — do not improvise the layout; the skill owns
  `package-info.java`, `spi/`, `events/`, the Flyway folder and the test stub.

## Module communication

- **Writes / state changes:** publish Spring Modulith application events.
  Never call into another module to mutate its state.
- **Reads:** only through the target module's `::spi` named interface
  (`com.acme.app.<module>.spi`). No deep imports across module boundaries.

## Persistence & migrations

- PostgreSQL only — no H2 anywhere, tests included.
- Flyway migrations are per-module:
  `backend/src/main/resources/db/migration/<module>/`. Never edit an applied
  migration — add a new versioned file.

## Tests

- Naming: `*Test` (unit) / `*Tests` (suites) — both are picked up by the build.
- Integration tests run against real PostgreSQL via **Testcontainers 2.x**;
  module slices use `@ApplicationModuleTest`.
- Pure unit tests must not start containers (they belong to the fast gate set).

## You will fail the build if ... (ArchUnit gates)

- you use field injection (`@Autowired` on fields) — constructor injection only
- you use bare `@Scheduled` — use the project scheduling wrapper instead
- you write a native query outside the sanctioned query wrapper
- you let a JPA entity cross the controller boundary — map to DTOs (MapStruct)
  at the API edge

## Agent-hallucination warnings (this stack is newer than your training data)

- **Testcontainers is 2.x** (Spring Boot 4-managed). Most tutorials and
  snippets target 1.x — different artifact layout and APIs. 1.x idioms WILL
  be wrong here.
- **Jackson is 3.x** — packages live under `tools.jackson.*`.
  `com.fasterxml.jackson` imports WILL be wrong (only the annotations artifact
  kept its old package).
- **JDK is 25 LTS** (class file 69). Do not assume Java 17/21 limits, and any
  bytecode-touching tool added later must state class-file-69 support.
- JUnit is 6 (the renamed Jupiter line); Spring Boot 4 / Framework 7 /
  Modulith 2 — check managed versions before pinning anything.
- **Boot 4 autoconfigure packages moved** — per-feature JARs, new package pattern `org.springframework.boot.<feature>.autoconfigure`:
  - Flyway: `org.springframework.boot.flyway.autoconfigure.FlywayAutoConfiguration` / `FlywayConfigurationCustomizer` (NOT `...boot.autoconfigure.flyway`)
  - JDBC/DataSource: `org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration` / `DataSourceTransactionManagerAutoConfiguration` (NOT `...boot.autoconfigure.jdbc`)
  - Any `@TestPropertySource` exclude list must use Boot 4 paths or exclusions silently no-op.
- **`@ApplicationModuleTest` for modules consuming `appconfig::spi`** — use `BootstrapMode.DIRECT_DEPENDENCIES` so the `appconfig` module is loaded and `AppConfigPropertiesRegistration` can register its beans. STANDALONE mode won't include `appconfig` root beans. Also, `@Configuration` classes in these modules MUST inject `appconfig.spi` properties via **constructor injection** — Modulith's DIRECT_DEPENDENCIES bean graph only follows constructor parameters (not `@Bean` method parameters) when deciding what to load from dependency modules.
  ```java
  @ApplicationModuleTest(mode = BootstrapMode.DIRECT_DEPENDENCIES)
  class MyModuleTest { ... }
  
  // In config class — constructor injection required, NOT @Bean method param:
  class MyConfig {
      private final MyProperties props;
      MyConfig(MyProperties props) { this.props = props; }
      @Bean MyService myService() { return new MyServiceImpl(props); }
  }
  ```
- **`@ApplicationModuleTest` for no-DB modules** — modules without DataSource (`hasTables=false` and no events) need this full exclusion list to prevent Spring Modulith's JDBC event infra from trying to connect to Postgres:
  ```
  spring.autoconfigure.exclude=
    org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration,
    org.springframework.boot.flyway.autoconfigure.FlywayAutoConfiguration,
    org.springframework.boot.jdbc.autoconfigure.DataSourceTransactionManagerAutoConfiguration,
    org.springframework.modulith.events.jdbc.JdbcEventPublicationAutoConfiguration,
    org.springframework.modulith.events.config.EventPublicationAutoConfiguration,
    org.springframework.modulith.events.config.EventExternalizationAutoConfiguration
  ```
  The `new-module` scaffold generates this automatically in the module test stub.

Never put frontend content here; never duplicate root `CLAUDE.md`.
