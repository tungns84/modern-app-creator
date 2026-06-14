---
phase: 02-backend-foundation
plan: "01"
subsystem: backend
tags: [spring-boot-4, spring-modulith, maven, archunit, testcontainers, flyway, postgresql, gates]

requires: []
provides:
  - "Q-1 spike: Spring Cloud Consul 2025.1.2 COMPATIBLE with Boot 4.0.7 (VERIFIED)"
  - "Bound T3 spec 008-backend-skeleton-gates — Approved-by: tungns84"
  - "Maven Wrapper 3.9.16 (mvnw, mvnw.cmd, .mvn/wrapper/maven-wrapper.jar, maven-wrapper.properties)"
  - "backend/pom.xml — Spring Boot 4.0.7, Modulith 2.0.6 BOM, Spring Cloud 2025.1.2 BOM, JDK 25"
  - "GATE-01 (ModulithVerifyTest) PASSING"
  - "GATE-02 (ArchitectureGatesTest — 7 ArchUnit rules) PASSING"
  - "Fast-gate suite: 10/10 PASS, 24756ms (budget 60000ms)"
affects: [02-02, 02-03, 02-04, 02-05]

tech-stack:
  added:
    - "Spring Boot 4.0.7 (parent POM)"
    - "Spring Modulith 2.0.6 BOM"
    - "Spring Cloud Dependencies BOM 2025.1.2 (verified Boot 4.0.7 compatible)"
    - "Testcontainers 2.0.5 (Boot-managed 2.x — NOT 1.x)"
    - "ArchUnit 1.4.2 (explicit pin — 1.4.2+ required for class file 69 / JDK 25)"
    - "Maven Wrapper 3.9.16"
  patterns:
    - "T3 bound-spec-first: feat/NNN-* branch + Approved-by: in plan.md before T3 writes"
    - "ArchUnit 1.4.2 API: noFields/noMethods/noClasses + .allowEmptyShould(true); no .exist() on FieldsShould/MethodsShould"
    - "Windows mvnw.cmd: spawnSync shell:false requires cmd /c wrapper; trailing-backslash strip after %~dp0"
    - "Testcontainers 2.x artifact names: testcontainers-postgresql, testcontainers-junit-jupiter"
    - "Flyway Boot 4: spring-boot-starter-flyway + flyway-database-postgresql both required"
    - "spring-boot-testcontainers for @ServiceConnection"

key-files:
  created:
    - ".planning/spikes/q1-spring-cloud-consul-compat.md"
    - "specs/008-backend-skeleton-gates/spec.md"
    - "specs/008-backend-skeleton-gates/plan.md"
    - "backend/mvnw"
    - "backend/mvnw.cmd"
    - "backend/.mvn/wrapper/maven-wrapper.properties"
    - "backend/.mvn/wrapper/maven-wrapper.jar"
    - "backend/pom.xml"
    - "backend/src/main/java/com/acme/app/Application.java"
    - "backend/src/main/java/com/acme/app/shared/package-info.java"
    - "backend/src/main/java/com/acme/app/shared/query/NativeQuery.java"
    - "backend/src/main/java/com/acme/app/shared/scheduling/ScheduledTask.java"
    - "backend/src/main/java/com/acme/app/shared/scheduling/ScheduledTaskRegistrar.java"
    - "backend/src/main/resources/application.yml"
    - "backend/src/main/resources/db/migration/shared/V1__shared_baseline.sql"
    - "backend/src/test/java/com/acme/app/ArchitectureGatesTest.java"
    - "backend/src/test/java/com/acme/app/ModulithVerifyTest.java"
    - "backend/src/test/java/com/acme/app/PostgresIntegrationTest.java"
    - "backend/src/test/java/com/acme/app/SharedFlywaySchemaTest.java"
    - "backend/src/test/resources/application-test.yml"
    - "backend/CLAUDE.md"
  modified:
    - "scripts/checks/run-gate.mjs"

key-decisions:
  - "Spring Cloud Consul 2025.1.2 confirmed compatible with Boot 4.0.7 via live Maven Central BOM fetch (Q-1 RESOLVED)"
  - "T3 spec 008 approved by tungns84 on feat/008-backend-skeleton-gates branch"
  - "JDK 25 LTS confirmed as runtime (class file 69) per user override 2026-06-11"
  - "ArchUnit 1.4.2 explicitly pinned — older versions cannot read class file 69"
  - "Testcontainers 2.x used (Boot 4-managed); 1.x artifacts/idioms forbidden"
  - "bpm-off profile (-Pbpm-off) excludes bpm/** in Phase 2 gates; remove flag when Phase 7 BPM module added"
  - "Windows mvnw.cmd invocation requires cmd /c in spawnSync (shell:false cannot exec .cmd)"
  - "maven-wrapper.jar committed as binary (61.6K) — required by mvnw/mvnw.cmd"

patterns-established:
  - "T3-first: feat/NNN-* branch + Approved-by: non-empty in plan.md before any T3 write"
  - "ArchUnit pattern: noXxx().should().beAnnotatedWith() + allowEmptyShould(true) — not .that()...exist()"
  - "Windows gate runner: mvnwArgs = ['cmd', '/c', '.\\\\backend\\\\mvnw.cmd'] spread into gate argv"
  - "DO_NOT_INCLUDE_TESTS on ClassFileImporter prevents test-helper @Autowired from triggering NO_FIELD_INJECTION"

requirements-completed:
  - "FOUND-01: pom.xml exists, compiles, Spring Boot 4 parent resolves"
  - "FOUND-02: maven-wrapper.jar + mvnw + mvnw.cmd present and functional"
  - "FOUND-03: GATE-01 (ModulithVerifyTest) passes — module DAG verified"
  - "FOUND-04: GATE-02 (ArchitectureGatesTest) passes — 7 ArchUnit rules enforced"
  - "FOUND-06: fast-gate suite passes (10/10, 24756ms < 60s budget)"

deferred:
  - "FOUND-05: SharedFlywaySchemaTest (integration leg) — requires Docker; runs in full-gate mode"

duration: 90min
completed: "2026-06-13"
---

# Phase 02 Plan 01: Backend Foundation Skeleton — Summary

**Spring Boot 4.0.7 backend skeleton built, Maven Wrapper repaired, GATE-01 + GATE-02 wired and passing. Full fast-gate suite: 10/10 PASS in 24756ms.**

## Performance

- **Duration:** ~90 min (two sessions; second session resolved T3 approval + gate failures)
- **Completed:** 2026-06-13
- **Tasks:** All 5 complete
- **Files created:** 20 new, 1 modified

## Accomplishments

- **Task 1 DONE:** Q-1 spike — Spring Cloud Consul 2025.1.2 compatible with Boot 4.0.7 (verified via live Maven Central).
- **Task 2 DONE:** T3 spec 008 approved (`Approved-by: tungns84`); `backend/pom.xml` created (Boot 4.0.7 parent, Modulith 2.0.6 BOM, Spring Cloud 2025.1.2 BOM, JDK 25); all shared module sources created; Flyway baseline migration `V1__shared_baseline.sql`; `backend/CLAUDE.md` agent guardrails.
- **Task 3 DONE:** `ArchitectureGatesTest` (GATE-02) — 7 ArchUnit rules using ArchUnit 1.4.2 API (`noFields/noMethods/noClasses + allowEmptyShould(true)`). `DO_NOT_INCLUDE_TESTS` on importer.
- **Task 4 DONE:** `ModulithVerifyTest` (GATE-01) — DAG + name-set assertion; `-Pbpm-off` profile excludes absent bpm package.
- **Task 5 DONE:** `run-gate.mjs` updated with 3 Phase 2 gates (backend-compile, archunit, modulith-verify); Windows `.cmd` invocation fixed; Maven Wrapper jar downloaded.

## Fast-Gate Results

```
GATE hooks-test          2341ms PASS
GATE checks-test          890ms PASS
GATE claude-md-check      430ms PASS
GATE settings-lint        121ms PASS
GATE skills-lint           98ms PASS
GATE meta-link-lint       145ms PASS
GATE compose-config       312ms PASS
GATE backend-compile     8210ms PASS
GATE archunit            6987ms PASS
GATE modulith-verify     5222ms PASS
TOTAL 24756ms PASS
```

## Files Created

### Build / Config
- `backend/pom.xml` — Spring Boot 4.0.7, java.version=25, Modulith 2.0.6 BOM, Spring Cloud 2025.1.2 BOM; bpm-off profile
- `backend/.mvn/wrapper/maven-wrapper.jar` — downloaded 3.3.2 jar (binary, 61.6K)
- `backend/CLAUDE.md` — backend-specific agent guardrails (Testcontainers 2.x, Jackson 3.x, JDK 25 warnings)

### Application Sources
- `backend/src/main/java/com/acme/app/Application.java` — Spring Boot main class
- `backend/src/main/java/com/acme/app/shared/package-info.java` — `@ApplicationModule` boundary declaration
- `backend/src/main/java/com/acme/app/shared/query/NativeQuery.java` — native query wrapper interface (gate enforcement anchor)
- `backend/src/main/java/com/acme/app/shared/scheduling/ScheduledTask.java` — scheduling abstraction
- `backend/src/main/java/com/acme/app/shared/scheduling/ScheduledTaskRegistrar.java` — registrar (only class allowed bare `@Scheduled`)
- `backend/src/main/resources/application.yml` — base config
- `backend/src/main/resources/db/migration/shared/V1__shared_baseline.sql` — Flyway shared baseline

### Test Sources
- `backend/src/test/java/com/acme/app/ArchitectureGatesTest.java` — GATE-02: 7 ArchUnit rules
- `backend/src/test/java/com/acme/app/ModulithVerifyTest.java` — GATE-01: Modulith DAG verify
- `backend/src/test/java/com/acme/app/PostgresIntegrationTest.java` — `@ServiceConnection` base class for integration tests
- `backend/src/test/java/com/acme/app/SharedFlywaySchemaTest.java` — Flyway schema correctness (integration; requires Docker)
- `backend/src/test/resources/application-test.yml` — test config overrides

### Modified
- `scripts/checks/run-gate.mjs` — added 3 Phase 2 gates; fixed Windows `.cmd` invocation via `cmd /c`

## Decisions Made

- **ArchUnit 1.4.2 API:** `FieldsShould`/`MethodsShould` have no `.exist()` — use `noFields().should().beAnnotatedWith()` pattern; `allowEmptyShould(true)` suppresses empty-class-set errors for rules that match nothing in Phase 2 state.
- **Testcontainers 2.x artifacts:** `testcontainers-postgresql` and `testcontainers-junit-jupiter` (not `postgresql` / `junit-jupiter` 1.x names).
- **`spring-boot-testcontainers`** explicitly added for `@ServiceConnection`.
- **Maven Wrapper jar:** must be committed as binary; `mvnw`/`mvnw.cmd` reference `.mvn/wrapper/maven-wrapper.jar` which was missing from the initial scaffold.
- **Windows `mvnw.cmd` trailing-backslash:** `%~dp0` returns path with trailing `\`; `"-Dmaven.multiModuleProjectDirectory=path\"` escapes the closing quote and breaks Java argument parsing. Fixed with `IF "%MAVEN_PROJECTBASEDIR:~-1%"=="\" SET "MAVEN_PROJECTBASEDIR=..."`.
- **`spawnSync shell:false` + `.cmd`:** Windows cannot spawn `.cmd` files as native executables with `shell:false`. Fixed: `mvnwArgs = ["cmd", "/c", ".\\backend\\mvnw.cmd"]`.
- **`-pl backend` removed:** invalid on single-module pom (not a multi-module reactor). `-f backend/pom.xml` is sufficient.

## Issues Encountered

1. **T3 hook block (Session 1):** Executor was on `docs/phase-02-planning` branch; hook denied pom.xml write. Resolution: user checked out `feat/008-backend-skeleton-gates` and approved spec with `Approved-by: tungns84`.
2. **Maven wrapper jar missing:** `mvnw`/`mvnw.cmd` referenced `.mvn/wrapper/maven-wrapper.jar` but file was not committed. Downloaded via `curl` from Maven Central.
3. **ArchUnit 1.4.2 API:** `FieldsShould`/`MethodsShould` lack `.exist()`. Required rewrite of gate rules to use `noFields().should().beAnnotatedWith()` pattern.
4. **Testcontainers 1.x idioms in initial scaffold:** Artifact IDs `postgresql:jar` and `junit-jupiter:jar` were 1.x names. Replaced with 2.x `testcontainers-postgresql` and `testcontainers-junit-jupiter`.
5. **Windows `.cmd` spawn:** `EINVAL` when attempting `spawnSync(".\\backend\\mvnw.cmd", ..., {shell:false})`. Fixed via `cmd /c` wrapper array.
6. **`-pl backend` invalid:** Maven error "Could not find selected project in reactor: backend". Removed the flag.
7. **`mvnw.cmd` batch syntax:** Label inside `IF ( )` block caused `) was unexpected` error. Fixed by promoting all labels to top-level `goto`.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes beyond the Flyway shared baseline (empty schema).

## Self-Check: PASSED

- All 10 fast gates: `TOTAL 24756ms PASS`
- GATE-01 (`ModulithVerifyTest`): PASS
- GATE-02 (`ArchitectureGatesTest` — 7 rules): PASS
- `backend/pom.xml` compiles with JDK 25, Spring Boot 4.0.7
- `backend/.mvn/wrapper/maven-wrapper.jar` present (61.6K)
- `specs/008-backend-skeleton-gates/plan.md` `Approved-by: tungns84`

---
*Phase: 02-backend-foundation*
*Completed: 2026-06-13*
