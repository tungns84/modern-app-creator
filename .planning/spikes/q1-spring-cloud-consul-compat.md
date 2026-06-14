# Q-1: Spring Cloud Consul Compatibility with Spring Boot 4.0.x

**Spike date:** 2026-06-13
**Researched by:** Executor agent (Phase 2, Plan 01, Task 1)
**Risk level:** HIGH (per RESEARCH.md — blocks D-07 Consul path in Plan 02 and D-08 Consul test in Plan 05)

---

## VERDICT: COMPATIBLE

Spring Cloud release train **`2025.1.2`** declares Spring Boot **4.0.7** as its required Boot version and manages `spring-cloud-consul` at **version `5.0.2`**.

---

## Findings

### Spring Cloud BOM — Boot 4 Compatible Version

| Artifact | Version | Source | Confidence |
|----------|---------|--------|------------|
| `spring-cloud-dependencies` BOM | **2025.1.2** | repo1.maven.org/maven2/org/springframework/cloud/spring-cloud-dependencies/2025.1.2/spring-cloud-dependencies-2025.1.2.pom — `<spring-boot.version>4.0.7</spring-boot.version>` | **[VERIFIED]** |
| `spring-cloud-consul` (managed version) | **5.0.2** | Same BOM — `<spring-cloud-consul.version>5.0.2</spring-cloud-consul.version>` | **[VERIFIED]** |
| `spring-cloud-starter-consul-config` | **5.0.2** | repo1.maven.org/maven2/org/springframework/cloud/spring-cloud-starter-consul-config/5.0.2/ — pom confirms parent `spring-cloud-consul 5.0.2`, depends on `spring-boot-configuration-processor:4.0.7` | **[VERIFIED]** |

### Available GA Release Trains (Maven Central as of 2026-06-13)

Latest GA trains from `spring-cloud-dependencies` maven-metadata.xml [VERIFIED]:

```
2023.0.x  → Spring Boot 3.x
2024.0.x  → Spring Boot 3.x
2025.0.x  → Spring Boot 3.x  (2025.0.3 is latest 2025.0)
2025.1.x  → Spring Boot 4.0.x  ← THIS IS THE BOOT 4 TRAIN
```

`2025.1.2` is the latest GA of the Boot 4 train [VERIFIED via maven-metadata.xml]. Milestone/RC versions `2025.1.0-M1` through `2025.1.0-RC1` preceded it — all GA now.

### Spring Cloud Consul 5.0.2 Artifacts Available

The following artifacts from `spring-cloud-consul 5.0.2` are published to Maven Central [VERIFIED]:
- `spring-cloud-starter-consul-config` — the D-07 required artifact
- `spring-cloud-consul-config` — pulled transitively by the starter
- `spring-cloud-starter-consul` — service discovery (not needed for Plan 02's config-only use)

---

## Impact on Downstream Plans

### Plan 02 (appconfig module — typed properties + Consul profile)

**Action:** Import the `spring-cloud-dependencies` BOM in `backend/pom.xml`:

```xml
<dependency>
  <groupId>org.springframework.cloud</groupId>
  <artifactId>spring-cloud-dependencies</artifactId>
  <version>2025.1.2</version>
  <type>pom</type>
  <scope>import</scope>
</dependency>
```

Add `spring-cloud-starter-consul-config` as an optional runtime dependency (activated by the `consul` Spring profile — no Maven profile branching per D-07):

```xml
<dependency>
  <groupId>org.springframework.cloud</groupId>
  <artifactId>spring-cloud-starter-consul-config</artifactId>
  <!-- version managed by spring-cloud-dependencies BOM 2025.1.2 -->
</dependency>
```

Create `application-consul.yml` with `spring.config.import: optional:consul:` (per PATTERNS.md Consul profile pattern).

### Plan 05 (Consul Testcontainers integration test)

**Action:** Proceed with `ConsulConfigIntegrationTest` using Testcontainers `ConsulContainer`. Note: `@ServiceConnection` support for Consul in Testcontainers 2.x needs verification during implementation (RESEARCH.md A3 assumption — if `@ServiceConnection` is not supported, fall back to `@DynamicPropertySource` for Consul host/port only).

---

## Residual Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| `spring.config.import: optional:consul:` autoconfiguration behavior in Boot 4 / Spring Cloud 2025.1.x not explicitly verified beyond the dependency existing | LOW | Smoke-test in Plan 02 Task 2 by activating the `consul` profile against a Testcontainers Consul container | [ASSUMED: behavior pattern is stable from Boot 3.x era — Boot 4 change notes mention no breaking change to `spring.config.import`] |
| `@ServiceConnection` for `ConsulContainer` in Testcontainers 2.x Boot 4 | MEDIUM | If not supported, fall back to manual `@DynamicPropertySource` for `spring.cloud.consul.host` + `spring.cloud.consul.port` only (not datasource) — this is acceptable and Pitfall 1 applies only to datasource autoconfiguration | [ASSUMED: Boot 4's `@ServiceConnection` extension point may not include Consul] |
| Spring Cloud 2025.1.x patch bumps may require `2025.1.3` etc. when refreshed | NEGLIGIBLE | Update the BOM version pin; stay on latest 2025.1.x GA | [INFERRED: Spring Cloud follows SemVer within a train] |

---

## Sources

1. `repo1.maven.org/maven2/org/springframework/cloud/spring-cloud-dependencies/maven-metadata.xml` — release train version list [VERIFIED live fetch]
2. `repo1.maven.org/maven2/org/springframework/cloud/spring-cloud-dependencies/2025.1.2/spring-cloud-dependencies-2025.1.2.pom` — `<spring-boot.version>4.0.7</spring-boot.version>` + `<spring-cloud-consul.version>5.0.2</spring-cloud-consul.version>` [VERIFIED live fetch]
3. `repo1.maven.org/maven2/org/springframework/cloud/spring-cloud-starter-consul-config/5.0.2/spring-cloud-starter-consul-config-5.0.2.pom` — artifact present, parent `spring-cloud-consul 5.0.2`, `spring-boot-configuration-processor:4.0.7` [VERIFIED live fetch]
4. Spring Cloud Gateway `intro.adoc` (Context7 `/spring-cloud/spring-cloud-gateway` main branch) — "Spring Framework 7, Spring Boot 4" confirms the 5.x / 2025.1.x line targets Boot 4

---

*Spike resolution: COMPATIBLE — Plan 02 may proceed with Consul profile using `spring-cloud-dependencies:2025.1.2`.*
