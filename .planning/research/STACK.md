# Technology Stack

**Project:** cowork-cli — preset `react-springboot-modulith` (Giai đoạn 1 preset repo)
**Researched:** 2026-06-11
**Stack constraints:** Locked by PRD §10.2 + user override (JDK 26, 2026-06-11). This document pins exact versions, verifies the JDK 26 compatibility matrix, and fills PRD tooling gaps. No alternatives proposed for locked choices.

---

## Executive Verdict on JDK 26

**JDK 26 works with this entire stack today.** Verified chain:

- Spring Boot 4.0.6+ officially supports Java 17 through **Java 26** (official system requirements). [HIGH]
- Byte Buddy 1.17.8 — the exact version managed by Spring Boot 4.0.7 — ships ASM 9.9 with Java 26 (class file 70) support; this covers Mockito 5.20 and Hibernate proxies. [HIGH]
- ArchUnit **1.4.2** added Java 26 / class file major version 70 support (older 1.4.1 fails with `Unsupported class file major version 70`). Must pin ≥1.4.2 explicitly — Boot does not manage ArchUnit. [HIGH]
- Paketo BellSoft Liberica buildpack supports `BP_JVM_VERSION=26`. [HIGH]
- Eclipse Temurin 26 is published (Adoptium API confirms 26 as most recent feature release) — usable for local dev + `actions/setup-java`. [HIGH — verified via Adoptium API]

**The real JDK 26 risk is lifecycle, not compatibility:** JDK 26 is non-LTS (GA 2026-03-17). Public updates end when JDK 27 ships (~September 2026) — ~3 months after this milestone starts. Current LTS is **25**. See Risk Register below.

---

## Recommended Stack

### Core Backend

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| JDK | **26** (Temurin for dev/CI, Liberica via Buildpacks for images) | Language/runtime | Locked by user override. Boot 4.0.6+ supports ≤26. Temurin 26 confirmed available via Adoptium API. [HIGH] |
| Spring Boot | **4.0.7** | App framework | Latest 4.0.x patch (4.0.6 was Apr 2026; 4.0.7 on Maven Central). **Not 4.1.0** — it GA'd days ago and Modulith 2.0.x / Flowable 8.0.0 / springdoc 3.0.x GA lines all target Boot 4.0.x. Take 4.1.x as a later routine bump. [HIGH] |
| Spring Framework | 7.0.8 (Boot-managed) | Core | Managed by Boot 4.0.7 BOM — do not override. [HIGH] |
| Spring Modulith | **2.0.6** (`spring-modulith-bom`) | Module boundaries, Event Publication Registry | Latest 2.0.x GA (2.1 is RC1 — skip). 2.0 baseline = Boot 4 / Framework 7. New event-publication lifecycle + staleness monitor (`spring.modulith.events.staleness.*`) — use the **new** registry schema, not `use-legacy-structure`, since this is greenfield. JDBC registry recommended even with JPA (officially encouraged; registry schema is independent of the app model). [HIGH] |
| Spring Security | 7.0.6 (Boot-managed) | AuthN/AuthZ | Managed version. [HIGH] |
| Spring Authorization Server | **`spring-security-oauth2-authorization-server:7.0.6`** | Self-host IdP profile | **Key finding:** SAS is no longer a separate project — it merged into Spring Security 7 and follows its release train. Use the Spring Security coordinate, version managed by Boot. Simplifies the multi-IdP profile switch (one BOM). [HIGH] |
| Flowable | **8.0.0** (`flowable-spring-boot-starter`) | Embedded BPM engine | Only 8.x GA (released Feb 2026). Built explicitly for Boot 4 / Spring 7 / Jackson 3; Flowable 7.2 does NOT work with Boot 4 (confirmed on Flowable forum). 8.0.0 is the unique Boot-4-compatible line — no choice here. Maturity risk + CIB Seven fallback already in PRD §11; spike Q-006 stands. [HIGH on compat; MEDIUM on maturity] |
| PostgreSQL | **16** (image `postgres:16-alpine`), driver 42.7.11 (Boot-managed) | Only database | Locked. PG16 in active support until Nov 2028. Pin image minor in Compose for reproducibility. [HIGH] |
| Flyway | 11.14.1 (Boot-managed) | Per-module migrations | **Boot 4 gotcha:** `flyway-core` alone no longer auto-configures. Need `spring-boot-starter-flyway` + `org.flywaydb:flyway-database-postgresql`. Do not override the managed version. [HIGH] |
| Testcontainers | **2.0.5** (Boot-managed, `testcontainers-bom`) | Integration tests on real PG | **Major-version gotcha:** Boot 4 manages Testcontainers **2.x** — most tutorials/snippets target 1.x (different artifact layout/APIs). Agents will hallucinate 1.x idioms; pin the correct patterns in backend/CLAUDE.md. [HIGH] |
| MapStruct | **1.6.3** | DTO boundary mapping | Latest stable. JSR-269 source-generating processor — no bytecode manipulation, so JDK 26 javac is expected to work, but **no official Java 26 statement exists**. [MEDIUM — verify in first CI run; fallback: 1.7.0.Beta1 or `maven.compiler.release=25`] |
| springdoc-openapi | **3.0.3** (`springdoc-openapi-starter-webmvc-ui`) | OpenAPI 3.1 → Orval input | 3.0.x is the Boot 4 line (built against Boot 4.0.5). OpenAPI 3.1 output confirmed. [HIGH] |
| Jackson | 3.x (Boot-managed) | JSON | Boot 4 default is **Jackson 3** (new `tools.jackson` packages). Flowable 8 also defaults to Jackson 3 — aligned. Another agent-hallucination hotspot (Jackson 2 imports). [HIGH] |
| Hibernate ORM | 7.2.x (Boot-managed) | JPA + tenant filter | Managed. Hibernate `@Filter` for tenant_id per FR-A04. [HIGH] |
| JUnit | **6.0.3** (Boot-managed) | Test framework | Boot 4 manages JUnit 6 (the renamed Jupiter line). Mostly source-compatible with JUnit 5 idioms; Flowable 8 is JUnit-5+-only (fine). [HIGH] |
| ArchUnit | **1.4.2 minimum** | Architecture gates (FR-D02) | 1.4.2 is the first release reading Java 26 class files (ASM upgrade). Pinning 1.4.1 or lower breaks every ArchUnit gate on JDK 26. [HIGH] |
| Mockito / Byte Buddy | 5.20.0 / 1.17.8 (Boot-managed) | Test mocking | BB 1.17.8 ships ASM 9.9 (Java 26). No `-Dnet.bytebuddy.experimental` flag needed. [HIGH] |
| JaCoCo (if coverage gate) | **0.8.15** | Coverage | ASM-based — older versions fail on class file 70. Use latest; verify on JDK 26 in first CI run. [MEDIUM] |
| Caffeine | 3.2.4 (Boot-managed) | Permission cache (dev), jti blacklist (dev) | Managed. [HIGH] |
| Argon2id | Spring Security `Argon2PasswordEncoder` + Bouncy Castle provider | FR-B05 | Built into spring-security-crypto; needs `bcprov` on classpath. [HIGH] |

### Build Toolchain (Backend)

| Technology | Version | Why |
|------------|---------|-----|
| Maven Wrapper | **Maven 3.9.16** | Latest 3.9.x GA. Stay on 3.9.x — Maven 4 migration is orthogonal noise for this milestone; Boot 4 requires only 3.6.3+. `./mvnw` ships in template (PRESET-SPEC binaryGlobs). [HIGH] |
| maven-compiler-plugin | Boot-managed, with `<release>26</release>` via `<java.version>26</java.version>` | Boot parent wires `java.version` → `maven.compiler.release`. [HIGH] |
| Buildpacks | `spring-boot-maven-plugin:build-image` + Paketo BellSoft Liberica, `BP_JVM_VERSION=26` | Java 26 explicitly in buildpack config options. [HIGH] |

### Core Frontend

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Node | **24 LTS** (engines `>=22`) | Runtime | Node 24 is active LTS; PRESET-SPEC `minNode: 22` stays as floor. [HIGH] |
| React | **19.2.7** | UI | Latest 19.x. [HIGH] |
| Vite | **8.0.16** + `@vitejs/plugin-react` 6.0.2 | Build | Vite 8 (Rolldown/Oxc; esbuild/Rollup/Babel gone). plugin-react 6 is the Vite-8 companion (Oxc-based React Refresh). Vitest 4.1.x declares `vite ^8.0.0` peer — verified compatible. [HIGH] |
| TypeScript | **6.0.3**, strict | Types | TS 6.0 stable (TS 7 native-preview is beta — do not use). If any codegen tool (Orval output, typescript-eslint) misbehaves on 6.0, 5.9.x is the documented fallback; typescript-eslint 8.61 supports TS 6.0. [MEDIUM on full-toolchain 6.0 compat — smoke-test in week 1] |
| Tailwind CSS | **4.3.0** + `@tailwindcss/vite` 4.3.0 | Styling + token layer | Tailwind 4 CSS-first config (`@theme`) is the natural home for the DTCG token pipeline (FR-D04 drift check). [HIGH] |
| shadcn/ui | CLI **4.11.0** (`shadcn`), components vendored | Component base | Copy-in model = agent-extendable plain code (locked decision). Pin CLI version in devDeps so `npx shadcn add` is reproducible. [HIGH] |
| TanStack Query | **5.101.0** | Server state | Latest 5.x. Orval generates its hooks directly. [HIGH] |
| Zustand | **5.0.14** | UI state (no tokens) | Latest. [HIGH] |
| React Hook Form | **7.78.0** + `@hookform/resolvers` **5.4.0** | Forms | resolvers 5.x auto-detects Zod v4 schemas. [HIGH] |
| Zod | **4.4.3** | Validation schemas | Satisfies PRD's v4.1+ floor. Orval can emit Zod schemas from OpenAPI. [HIGH] |
| React Router | **7.17.0** (library mode) | Routing | Locked: library mode only — no framework/SSR mode (anti-stack). [HIGH] |
| nuqs | **2.8.9** | URL state (filters/pagination) | Latest 2.x. [HIGH] |
| Orval | **8.16.0** | OpenAPI 3.1 → TS client + TanStack Query hooks + MSW mocks + Zod | One generator covers contract client, test mocks (MSW), and runtime validation — fewer moving parts in the drift gate (FR-D07). [HIGH] |
| i18next / react-i18next | **26.3.1 / 17.0.8** + `i18next-browser-languagedetector` 8.2.1 | i18n vi/en | Latest majors. i18n parity gate (FR-D06) scans resource JSON — keep flat-ish key files per feature. [HIGH] |
| bpmn-js | **18.18.0** | BPMN diagram viewer (bậc 1: viewer only) | Latest; keep bpmn.io watermark (license condition, locked). [HIGH] |

### Frontend Test & Lint Toolchain

| Technology | Version | Why |
|------------|---------|-----|
| Vitest | **4.1.8** | Vite-8-native peer range verified (`^8.0.0`). |
| @testing-library/react | 16.3.2 | RTL for React 19. |
| MSW | **2.14.6** | Orval generates handlers for it. |
| Playwright | **1.60.0** (`@playwright/test`) | Chromium/Firefox/WebKit E2E (locked). |
| @axe-core/playwright | **4.11.3** | WCAG 2.2 AA gate (FR-D05) inside Playwright runs. |
| ESLint | **10.4.1** (flat config only) + typescript-eslint **8.61.0** | ESLint 10 removed eslintrc — author flat config from day one. |
| eslint-plugin-import-x | **4.16.2** | Provides `import-x/no-restricted-paths` for frontend zones (FR-D03). Use **import-x**, not the stale `eslint-plugin-import` — same rule schema, maintained, ESLint-10-compatible. |
| eslint-plugin-react-hooks | **7.1.1** | **Gap-fill correction:** React Compiler lint rules now live in `eslint-plugin-react-hooks` (recommended preset) backed by compiler 1.0. The standalone `eslint-plugin-react-compiler` is frozen at 19.1.0-rc.2 (superseded). Use react-hooks 7.x + `babel-plugin-react-compiler` 1.0.0 if enabling the compiler itself. [Inference on supersession — based on package release states observed on npm; cross-check React docs when wiring] |

### Infrastructure & Local Stack (`task up`)

| Technology | Version / Image | Why |
|------------|-----------------|-----|
| Taskfile (go-task) | **v3.51.1** | Locked-direction gap-fill: cross-platform (single Go binary, Windows-native, no WSL) — the only Make-class runner that meets the 3-OS-no-WSL constraint. Install via winget/brew/apt + pinned version check in `scripts/init`. [HIGH] |
| Docker Compose | v2 (Compose Spec) | `task up` wraps `docker compose up -d` + healthcheck waits. |
| PostgreSQL | `postgres:16-alpine` | Locked. |
| Redis | `redis:8.x` (or **Valkey 8** `valkey/valkey:8`) | Locked component. **License note:** Redis ≥8.0 is tri-licensed incl. AGPLv3; 7.4 is RSAL/SSPL (not OSI). Running an unmodified Redis container as a network service does not contaminate the Apache-2.0 codebase, but if the "Apache-2.0/MIT-compatible components" constraint is read strictly for shipped infra defaults, **Valkey 8 (BSD-3) is a wire-compatible drop-in** Lettuce talks to unchanged. Decide via 1-line ADR. [HIGH on facts; decision left to ADR] |
| Keycloak | **26.6.3** | Latest (June 2026). PRD says "Keycloak 26" — 26.6.x is that line. JWT Authorization Grant + federated client auth landed in 26.6.0. [HIGH] |
| Mailpit | latest (`axllent/mailpit`) | SMTP capture for email flows (verification, invite, reset). |
| MinIO | latest stable image | S3-compatible storage module backend. |
| Observability | **`grafana/otel-lgtm`** single image (local) | Gap-fill: one container = OTel collector + Prometheus + Tempo + Loki + Grafana. Massively simpler `task up` than 4 separate services; K8s overlays use real components. [HIGH that it works; MEDIUM as recommendation — swap for discrete services if the team wants prod-parity locally] |
| K8s | Kustomize (built into kubectl) | Locked. |
| FE image | nginx `stable-alpine` multi-stage | Locked. |
| BE image | Buildpacks (Paketo) | Locked; `BP_JVM_VERSION=26`. |

### CI (gap-fill)

| Item | Recommendation | Why |
|------|----------------|-----|
| Platform | **GitHub Actions** assumed; matrix `[windows-latest, ubuntu-24.04, macos-latest]` | Matches PRESET-SPEC §6 verbatim. **Q-002 (internal hosting branch-protection/approver API) may override this — confirm before building FR-D10.** |
| JDK in CI | `actions/setup-java` with `distribution: temurin`, `java-version: 26` | Temurin 26 published (verified via Adoptium API). |
| Docker on macOS/Windows runners | Run Testcontainers-dependent jobs on `ubuntu` leg only; Win/macOS legs do compile + unit + FE | GitHub-hosted macOS runners have no Docker; Windows runners can't run Linux containers reliably. The 3-OS matrix proves *toolchain* portability; integration tests need only one OS. [HIGH — well-known runner limitation] |
| Secret/CVE scan (FR-D08) | gitleaks (secrets) + Trivy (images/CVE) | Both Apache-2.0, single-binary, 3-OS, de-facto standard. [MEDIUM — verify org-approved scanners] |

---

## JDK 26 Risk Register (quality-gate item)

| # | Risk | Severity | Status / Mitigation |
|---|------|----------|---------------------|
| 1 | **Non-LTS lifecycle:** JDK 26 public updates end ~Sept 2026 (JDK 27 GA). Preset will sit on an unsupported JDK months after this milestone. Current LTS = 25. | **HIGH (process)** | Plan a routine 26→27 bump in Sept 2026; keep `java.version` a single property. Consider `maven.compiler.release=25` so emitted bytecode stays LTS-compatible while running on 26 — cheap insurance, but blocks Java 26 language features. Surface this in PROJECT.md Key Decisions. |
| 2 | Paketo buildpacks historically drop non-LTS JDK lines when superseded — image builds may start failing when 26 disappears post-27 | MEDIUM | Same Sept-2026 bump; pin builder image digest so existing builds stay reproducible. [Inference — based on Paketo's stated LTS-favoring policy; exact removal timing unverified] |
| 3 | ArchUnit < 1.4.2 cannot read class file 70 → all architecture gates explode | HIGH if unpinned | Pin **1.4.2+** explicitly. Verified fixed. |
| 4 | Byte Buddy / Mockito / Hibernate proxies on Java 26 | Resolved | BB 1.17.8 (Boot-managed) ships ASM 9.9 with Java 26 support. No experimental flag. |
| 5 | MapStruct 1.6.3 has no official Java 26 statement | MEDIUM | Source-gen processor — expected fine [Inference]. Verify in first CI run; fallbacks: 1.7.0.Beta1, or `release=25`. |
| 6 | JaCoCo / any other ASM-based tool added later | MEDIUM | Standing rule for backend/CLAUDE.md: any bytecode-touching tool must state class-file-70 support; JaCoCo ≥0.8.15. |
| 7 | Flowable 8.0.0 on JDK 26 | LOW | Engine requires JDK ≥17, no bytecode generation in core engine [Inference]. Spike Q-006 runs on JDK 26 and settles this empirically. |
| 8 | Spring Boot 4.0.x support ceiling | Resolved | Official docs: compatible up to and including Java 26 (from 4.0.6). |

**Net assessment:** [Verified for #1–#4, #8] The compatibility matrix is green today. The single decision the user should re-confirm is accepting the September 2026 non-LTS cliff (#1/#2).

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Spring Boot line | 4.0.7 | 4.1.0 (GA ~May 2026) | Too fresh; Modulith 2.0.x / Flowable 8.0.0 / springdoc 3.0.x GA against 4.0.x. Bump later as T2 routine. |
| Modulith line | 2.0.6 | 2.1.0-RC1 | RC; nothing in 2.1 is needed for FR scope. |
| Task runner | go-task v3.51.1 | Make / just / npm scripts | Make needs extra install + POSIX-isms on Windows (violates no-WSL); just lacks the `task up` ecosystem conventions already in PRD vocabulary; npm scripts can't own backend/infra lifecycles cleanly. |
| Import-zone lint | eslint-plugin-import-x | eslint-plugin-import; eslint-plugin-boundaries | `import` plugin is unmaintained re: ESLint 10; `boundaries` is more powerful but a second mental model — `no-restricted-paths` is already named in the PRD. |
| Compiler lint | eslint-plugin-react-hooks 7.x | eslint-plugin-react-compiler (PRD-named) | Standalone plugin frozen at RC, superseded — rules merged into react-hooks. Honors PRD *intent* (compiler-aware lint gate). |
| Local observability | grafana/otel-lgtm | Discrete Prometheus+Grafana+Tempo+Collector services | 4 fewer containers in `task up`; discrete set retained in K8s overlays where prod-parity matters. |
| Redis image | Valkey 8 or Redis 8 (ADR) | Redis 7.4 | 7.4 is RSAL/SSPL — the worst license option under the Apache-2.0/MIT constraint. |
| MapStruct | 1.6.3 | 1.7.0.Beta1 | Beta in a production-grade scaffold only if 1.6.3 demonstrably breaks on JDK 26. |

## What NOT to Use (anti-stack, locked — recorded for agent context)

GraphQL · Next.js/SSR (React Router framework mode included) · message broker in v1 (`@Externalized` is the future seam) · H2 (Testcontainers PG everywhere, including `verify --fast` scope per Q-004) · Redux · MUI · Refine/react-admin · Consul-by-default · gateway app · **Lombok** (not in stack; had a known Java 26 support gap — MapStruct + records cover the need) · Jackson 2 imports (`com.fasterxml.jackson` → Boot 4 uses Jackson 3 `tools.jackson`) · Testcontainers 1.x idioms · `.eslintrc.*` (ESLint 10 is flat-config only) · standalone Spring Authorization Server coordinates (merged into Spring Security 7).

## Installation (reference snippets)

```xml
<!-- backend/pom.xml -->
<parent>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-parent</artifactId>
  <version>4.0.7</version>
</parent>
<properties>
  <java.version>26</java.version>
  <spring-modulith.version>2.0.6</spring-modulith.version>
  <flowable.version>8.0.0</flowable.version>      <!-- bpm option only -->
  <mapstruct.version>1.6.3</mapstruct.version>
  <archunit.version>1.4.2</archunit.version>
  <springdoc.version>3.0.3</springdoc.version>
</properties>
<!-- Flyway under Boot 4: starter + PG module, NOT flyway-core alone -->
<!-- spring-boot-starter-flyway + org.flywaydb:flyway-database-postgresql -->
<!-- SAS: org.springframework.security:spring-security-oauth2-authorization-server (Boot-managed) -->
```

```bash
# frontend
npm i react@19.2.7 react-dom@19.2.7 @tanstack/react-query@5.101.0 zustand@5.0.14 \
  react-hook-form@7.78.0 @hookform/resolvers@5.4.0 zod@4.4.3 react-router@7.17.0 \
  nuqs@2.8.9 i18next@26.3.1 react-i18next@17.0.8 i18next-browser-languagedetector@8.2.1
npm i -D vite@8.0.16 @vitejs/plugin-react@6.0.2 typescript@6.0.3 tailwindcss@4.3.0 \
  @tailwindcss/vite@4.3.0 shadcn@4.11.0 orval@8.16.0 vitest@4.1.8 \
  @testing-library/react@16.3.2 msw@2.14.6 @playwright/test@1.60.0 \
  @axe-core/playwright@4.11.3 eslint@10.4.1 typescript-eslint@8.61.0 \
  eslint-plugin-import-x@4.16.2 eslint-plugin-react-hooks@7.1.1
# bpm option: npm i bpmn-js@18.18.0
```

## Confidence Summary

| Area | Confidence | Basis |
|------|------------|-------|
| Spring Boot 4.0.7 / Framework 7.0.8 / Modulith 2.0.6 / Security+SAS 7.0.6 | HIGH | Maven Central metadata + Boot 4.0.7 BOM read directly + official release notes |
| JDK 26 compat (Boot, ArchUnit, Byte Buddy, Buildpacks, Temurin availability) | HIGH | Official docs, release notes, Adoptium API |
| Flowable 8.0.0 ↔ Boot 4 | HIGH (compat) / MEDIUM (maturity — single GA, Feb 2026; Q-006 spike stands) | Flowable forum + Maven Central |
| Frontend pins (npm) | HIGH | npm registry `latest` dist-tags fetched 2026-06-11 |
| MapStruct + JaCoCo on JDK 26 | MEDIUM | No official Java 26 statement found — verify in first CI run |
| TS 6.0 across full toolchain | MEDIUM | TS 6.0 stable; per-tool 6.0 support not individually verified |
| CI scanner picks (gitleaks/Trivy), otel-lgtm local image | MEDIUM | Standard practice; org constraints (Q-002 hosting) may override |

## Sources

- [Spring Boot system requirements (Java 17–26)](https://docs.spring.io/spring-boot/system-requirements.html) · [Spring Boot 4.0 release notes](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Release-Notes) · [Spring Boot 4.0.6 announcement](https://spring.io/blog/2026/04/23/spring-boot-4-0-6-available-now/) · spring-boot-dependencies 4.0.7 POM (read directly from repo1.maven.org)
- [Spring Modulith 2.0 GA announcement](https://spring.io/blog/2025/11/21/spring-modulith-2-0-ga-1-4-5-and-1-3-11-released/) · [Modulith events reference](https://docs.spring.io/spring-modulith/reference/events.html)
- [Spring Authorization Server moving into Spring Security 7](https://spring.io/blog/2025/09/11/spring-authorization-server-moving-to-spring-security-7-0/) · [SAS project page](https://spring.io/projects/spring-authorization-server/)
- [Flowable 8.0.0 release announcement](https://forum.flowable.org/t/flowable-8-0-0-release/12548) · [Flowable 7.2 not working with Boot 4 (forum)](https://forum.flowable.org/t/spring-boot-4-compatible-flowable-8-release-date-existing-flowable-7-2-0-not-working-with-spring-boot-4/12478)
- [JDK 26 project page](https://openjdk.org/projects/jdk/26/) · [Oracle Java 26 release announcement (2026-03-17)](https://www.oracle.com/news/announcement/oracle-releases-java-26-2026-03-17/) · Adoptium available-releases API (fetched live)
- [ArchUnit releases (1.4.2 Java 26 support)](https://github.com/TNG/ArchUnit/releases) · [Byte Buddy (ASM 9.9 / Java 26 in 1.17.8)](https://github.com/raphw/byte-buddy)
- [Paketo BellSoft Liberica buildpack (BP_JVM_VERSION 26)](https://github.com/paketo-buildpacks/bellsoft-liberica) · [Paketo Java 25 support post (LTS default policy)](https://blog.paketo.io/posts/paketo-java-25-support/)
- [Keycloak 26.6.3 release](https://www.keycloak.org/2026/06/keycloak-2663-released) · [Keycloak 26.6.0 release](https://www.keycloak.org/2026/04/keycloak-2660-released)
- [springdoc-openapi (Boot 4 / OpenAPI 3.1)](https://springdoc.org/) · [Flyway in Spring Boot 4.x changes](https://pranavkhodanpur.medium.com/flyway-migrations-in-spring-boot-4-x-what-changed-and-how-to-configure-it-correctly-dbe290fa4d47)
- [Vite 8 announcement (Rolldown)](https://vite.dev/blog/announcing-vite8) · [Testcontainers Java](https://java.testcontainers.org/) · [react-hook-form resolvers (Zod v4 auto-detect)](https://github.com/react-hook-form/resolvers) · [Orval](https://orval.dev/) · [go-task releases](https://github.com/go-task/task/releases)
- npm registry dist-tags + repo1.maven.org maven-metadata.xml — fetched live 2026-06-11 (authoritative version pins)
