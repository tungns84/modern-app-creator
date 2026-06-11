# Pitfalls Research

**Domain:** Scaffold preset — Spring Boot 4 Modulith + React 19, embedded IAM, optional Flowable 8 BPM, CI guardrail gates, Claude Code hook enforcement
**Researched:** 2026-06-11
**Confidence:** MEDIUM-HIGH overall (per-pitfall confidence noted; web-verified items marked with sources, pattern-based items marked [Inference])

## Critical Pitfalls

### Pitfall 1: JDK 26 toolchain lag breaks annotation processors and agents (user override risk)

**What goes wrong:**
The application code compiles on JDK 26 (Spring Boot 4 officially supports up to Java 26), but the *toolchain around it* fails: bytecode-manipulating tools choke on class file major version 70. Confirmed example: Lombok fails with `IllegalArgumentException: Unsupported class file major version 70` (projectlombok/lombok#4019). Historically the same lag pattern hits ByteBuddy/Mockito (needs `-Dnet.bytebuddy.experimental=true` until a release catches up), JaCoCo, ErrorProne, and ASM-based ArchUnit/ESLint-equivalent tooling. MapStruct is an annotation processor and sits in the same risk class. CI runners and IDEs may also lack JDK 26 toolchains by default.

**Why it happens:**
JDK 26 is a **non-LTS** release (GA March 2026; superseded by JDK 27 in September 2026). Library maintainers prioritize LTS (21, 25). The user overrode the PRD's Java 21 with JDK 26 — bleeding edge by definition. [Verified: Boot 4.0.6 docs state Java 17–26 compatibility; Paketo/BellSoft Liberica already ship JDK 26.0.1 — runtime is fine, the *build-time tool matrix* is the risk.]

**How to avoid:**
- Run a **JDK 26 toolchain smoke spike in week 1**: compile + test + JaCoCo + ArchUnit + MapStruct + Mockito + Testcontainers + Buildpacks (`BP_JVM_VERSION=26`) on all 3 OS CI runners. Treat it like Q-004/Q-006/Q-010 — a blocking spike before phase commitment.
- Avoid Lombok entirely (records + MapStruct cover the need; Lombok is the confirmed breakage).
- Pin exact JDK distribution + version in `.sdkmanrc`/toolchain config and CI; never "latest".
- Decide and document the **fallback**: compile with `--release 25` on JDK 26, or revert to JDK 25 LTS if any gate-critical tool is blocked. Record as ADR.
- Plan the September 2026 forced migration: JDK 26 stops receiving updates when 27 GAs. A preset that templates JDK 26 ships an expiring runtime to every generated project.

**Warning signs:**
`Unsupported class file major version 70` anywhere in build output; Mockito inline-mock warnings; JaCoCo 0% coverage reports; CI setup-java action failing to resolve 26 on one OS.

**Phase to address:**
Phase 1 (Foundation/walking skeleton) — toolchain spike before any module work. Confidence: HIGH for the risk pattern, MEDIUM for which specific tools are still lagging in June 2026.

---

### Pitfall 2: Flowable engine schema vs Flyway — the "auto-update off" plan collides with Flowable's internal Liquibase

**What goes wrong:**
The plan (FR-C01) is `db-schema-update=false` + Flyway-vendored DDL. Three traps:
1. **Vendored DDL goes stale per Flowable version.** Flowable ships per-release create + upgrade scripts; every Flowable patch bump requires manually importing the matching upgrade script into a new Flyway migration. Skip one and the engine fails validation at startup — or worse, runs against a mismatched schema.
2. **[Inference, must verify in Q-006]** Historically several Flowable engines (app, form, content, eventregistry) manage their tables via *embedded Liquibase*, not plain DDL. With auto-update off, Liquibase still runs a checksum/version check at startup and can throw on hash mismatches between environments. Whether Flowable 8 still does this is exactly what the Q-006 spike must answer empirically — do not assume the BPMN-engine SQL scripts cover all tables.
3. **Shared transaction manager assumption.** Atomic process+business commit requires Flowable's `SpringProcessEngineConfiguration` to use the *same* `DataSource` and `PlatformTransactionManager` as JPA. The silent failure mode: Boot auto-config wires a second transaction manager or Flowable's async executor runs jobs in its own threads/transactions where `TenantContext` and Hibernate filters are absent — commits look atomic in the happy path but aren't under async continuation.

**Why it happens:**
Flowable 8.0.0 released 2026-02-27 — ~3.5 months old, first Spring Boot 4 line, limited production mileage. Community Flyway+Flowable integrations are documented as requiring workarounds even on older versions (Flowable forum threads).

**How to avoid:**
The PRD already mandates spike Q-006 — make its exit criteria explicit: (a) full table inventory created by Flyway equals table inventory engine expects (assert via engine startup with `db-schema-update=false` + schema validation), (b) one transaction rollback test proving process state + JPA entity roll back together, (c) async job thread propagates tenant + executes inside expected transaction boundary, (d) document the Flowable-upgrade runbook (which upgrade script → which Flyway version file).

**Warning signs:**
Startup exceptions mentioning `ACT_` tables or Liquibase changelog locks; a test where a service task throws but the JPA write survives (or vice versa); failed jobs executing without tenant_id.

**Phase to address:**
Q-006 spike phase, before any Group C phase commits. Confidence: HIGH that the trap class exists, MEDIUM on Flowable-8 specifics (that's the spike's job).

---

### Pitfall 3: Event Publication Registry — duplicates, pile-up, and the identical-event completion bug

**What goes wrong:**
Teams enable the JDBC registry and assume "no event loss" is now free. Reality:
- **Republish-on-restart re-delivers** incomplete publications; non-idempotent listeners double-apply effects (double email, double audit row).
- **Two replicas restarting** both republish the same incomplete publications — no built-in distributed claim. The preset deploys to K8s with HPA; rolling restarts make this a real path, not theoretical.
- **Completed publications grow unbounded** unless completion mode `DELETE` or a purge job is configured; registry table bloat slows every publish.
- **Known bug class:** structurally identical events published in the same transaction cause the wrong publication to be marked complete, leaving valid completions stuck incomplete (spring-modulith#1056).
- **Pile-up → OOM:** prolonged listener failure accumulates incompletes; replay on restart can crash the app.

**Why it happens:**
The registry is an outbox for *delivery*, not a guarantee of *exactly-once processing*. Docs are explicit; readers stop at "no event loss."

**How to avoid:**
- Make **listener idempotency a stated convention** in backend CLAUDE.md + an ArchUnit-checkable pattern (e.g., listeners must route through an idempotency-keyed handler for side-effecting work).
- Configure completion mode `DELETE` (or a scheduled purge) from day one in the preset — this is preset code, not user homework.
- The kill-listener test (FR-A03) must assert **both** directions: no loss *and* no double-effect on republish.
- Bound retries and alert on incomplete-publication count (Prometheus gauge) — wire into the observability module.
- Add a two-replica restart test alongside the existing two-replica scheduler test.

**Warning signs:**
`event_publication` table row count climbing in dev; duplicate audit entries after `task up` restart; listeners that send email/write storage without an idempotency key.

**Phase to address:**
Modulith core/eventing phase (FR-A03). Confidence: HIGH (official docs + GitHub issues). Sources: [Spring Modulith events docs](https://docs.spring.io/spring-modulith/reference/events.html), [#1056](https://github.com/spring-projects/spring-modulith/issues/1056), [#796](https://github.com/spring-projects/spring-modulith/issues/796).

---

### Pitfall 4: `shared` becomes a god-module; cycles arrive via "just one helper"

**What goes wrong:**
With 12–13 modules and a `shared` module sanctioned from day one, every type that two modules need migrates into `shared`: DTOs, enums, "common" services, eventually repository helpers. `shared` becomes the de facto coupling hub — Modulith verify stays green (no cycle!) while real boundaries dissolve. Separately, cycles creep in through event payloads that reference another module's domain types, or SPI interfaces returning entities.

**Why it happens:**
Agents and humans both take the path of least resistance; moving a class to `shared` always compiles. Modulith verify only checks *declared* dependencies and cycles — it cannot detect "this class doesn't belong here."

**How to avoid:**
- Define `shared` narrowly in CLAUDE.md and enforce mechanically: ArchUnit rule capping what `shared` may contain (no `@Service`, no repositories, no module-specific vocabulary) and an alert threshold on `shared` size/fan-in growth per PR.
- Events carry **self-contained payloads** (records defined by the publishing module), never another module's entities/DTOs — ArchUnit-enforceable.
- The `new-module` skill must scaffold the allowed-dependencies declaration explicitly so each addition is a reviewable diff (T3 path — already planned).
- [Inference] Treat any PR whose diff is >30% in `shared/` as a review smell; cheap heuristic gate.

**Warning signs:**
`shared` is the most-touched directory in git log; new modules declare `shared` plus 4+ other dependencies; SPI methods returning types from `shared` that mirror one module's domain.

**Phase to address:**
Modulith core phase (rules) + continuously via guardrails phase. Confidence: HIGH (well-documented modular-monolith failure mode; [Inference] on specific thresholds).

---

### Pitfall 5: `@ApplicationModuleTest` green ≠ system works — bootstrap-mode blind spot

**What goes wrong:**
Per-module tests pass (STANDALONE bootstrap mocks all collaborators), Modulith verify passes, but cross-module event choreography is broken: listener never subscribed, event type renamed on one side, SPI contract drift. Nothing catches it until E2E — or production.

**Why it happens:**
`@ApplicationModuleTest` default STANDALONE mode loads only the module under test; cross-module interaction is exactly what it excludes. Teams equate "module tests + verify green" with integration coverage.

**How to avoid:**
- For every published event that another module consumes, require a **Scenario API test** (`PublishedEvents`/`Scenario`) at the consumer side, or a small set of full-context integration tests covering each cross-module edge in the DAG.
- The `new-feature`/`new-module` skills should template this: "publishes event X" ⇒ scaffold a consumer-side scenario test stub.
- Keep a thin layer of whole-app smoke tests (login → one IAM flow → one event flow) in `verify --full`.

**Warning signs:**
Modules with `@EventListener`s but zero Scenario tests; event record renamed with no failing test; integration test count not growing as DAG edges grow.

**Phase to address:**
Modulith core/eventing phase; codified in skills during Claude Code pack phase. Confidence: HIGH (mechanism is documented Modulith behavior).

---

### Pitfall 6: Hibernate tenant filter silently bypassed — native queries, JDBC, scheduled jobs, and Flowable itself

**What goes wrong:**
The tenancy seam (FR-A04) relies on a Hibernate `@Filter`/`@TenantId`. Filters apply **only to HQL/criteria through the filtered Session**. Bypass routes that leak cross-tenant data later: native SQL queries, Spring `JdbcTemplate`/JOOQ-style access, reporting/export code, scheduled jobs and event listeners running on threads where `TenantContext` was never set, and — critically for this preset — **Flowable persists via MyBatis, entirely outside Hibernate**: engine tables get tenant isolation only through Flowable's own first-class tenant-id support, never through the Hibernate filter.

**Why it happens:**
Filter-based discriminator tenancy is session-scoped magic; everything not going through that session is invisible to it. The single-tenant v1 means *nothing fails today* — the seam only breaks when a second tenant appears, i.e., at the most expensive possible time.

**How to avoid:**
- ArchUnit gate already planned ("native query outside wrapper") — make the wrapper *apply tenant predicate explicitly* and ban raw `JdbcTemplate` in business modules.
- `TenantContext` propagation must be wired into: async event listeners (Modulith registry replay threads!), `@Scheduled` jobs wrapper, and Flowable job executor — and the isolation test (FR-D09) must include one async path and one BPM path, not just a controller request.
- Flowable: set tenantId on every deployment + process start (FR-C04) and assert engine queries filter by tenant in the isolation test.
- [Inference] Add a CI grep/ArchUnit check: any new `@Entity` without `tenant_id` column mapping fails.

**Warning signs:**
Isolation test only covers HTTP-request paths; jobs/listeners with no tenant assertion; any `createNativeQuery` outside the sanctioned wrapper; Flowable queries without `.tenantId(...)`.

**Phase to address:**
Tenancy phase for the seam; FR-D09 gate hardened in guardrails phase; BPM path added in Group C. Confidence: HIGH (filter-bypass via native SQL is documented; Flowable-MyBatis bypass is structural fact).

---

### Pitfall 7: Claude Code hook deny is NOT a reliable enforcement layer on its own (Q-010 is justified — and bigger than version drift)

**What goes wrong:**
The L1 plan assumes `PreToolUse` `permissionDecision: "deny"` reliably blocks writes to T3 paths. The public issue tracker shows repeated, *version-specific* failures: deny ignored for the Edit tool (#37210), deny not enforced for MCP server tools (#33106), `ask` silently overriding `permissions.deny` rules (#39344), deny ignored outright in earlier versions (#4669), bypass-mode interaction bugs (#37420). Beyond bugs, there are **structural bypass routes**: the agent writes the file via `Bash` (`echo > file`, `sed -i`, heredoc, `git apply`) instead of Write/Edit; MCP filesystem tools; the human editing in an IDE. A hook matched only on Write|Edit blocks none of these.

**Why it happens:**
Hooks are an evolving product surface in a fast-shipping CLI; semantics shift across versions. And path-based tool-matching is a fundamentally leaky model for "no file in this tree may change."

**How to avoid:**
- Keep the PRD's stance hard: **CI L2 is the floor**, L1 is UX. Never let a phase's DoD claim enforcement on the basis of hooks alone.
- Q-010 spike: pin a Claude Code version, run the hook scenario matrix in CI **on every renovate-style version bump** of the pinned version — not once.
- Hook coverage must include a `Bash` matcher that pattern-checks commands for writes into T3 paths (imperfect; document as best-effort), plus MCP tool names if any FS-capable MCP is configured.
- Hook scripts must be cross-platform (see Pitfall 10) — a hook that errors on Windows may **fail open** depending on exit-code semantics; test the failure mode explicitly and prefer fail-closed design where tolerable.

**Warning signs:**
Hook test matrix green only on one OS; CLAUDE.md or docs describing hooks as "guarantees"; a T3 diff reaching PR without plan and only the CI gate catching it (means L1 silently broke — investigate, don't shrug).

**Phase to address:**
Q-010 spike before Claude Code pack phase; CI L2 (FR-D10) lands in guardrails phase *before* L1 is relied on. Confidence: HIGH (multiple public GitHub issues). Sources: [#37210](https://github.com/anthropics/claude-code/issues/37210), [#33106](https://github.com/anthropics/claude-code/issues/33106), [#39344](https://github.com/anthropics/claude-code/issues/39344), [#4669](https://github.com/anthropics/claude-code/issues/4669).

---

### Pitfall 8: `verify --fast` <60s with Testcontainers — feasible only with deliberate architecture; drift between fast/full erodes trust

**What goes wrong:**
Two failure modes. (a) Fast lane misses 60s: each Spring context variation pays container start + context boot; a handful of `@SpringBootTest` configs alone blows the budget. (b) Fast lane is made fast by *excluding* the tests that actually fail — agents iterate until `--fast` is green, then `--full`/CI fails, the agent's feedback loop breaks, and devs learn to distrust the fast signal (gate fatigue's on-ramp).

**Why it happens:**
Testcontainers cost is dominated by container starts and Spring context cache misses, both invisible until measured. Defining `--fast` contents is a design decision usually made ad hoc.

**How to avoid:**
- Q-004 spike with explicit budget table: compile + unit + ArchUnit + lint + i18n parity are sub-second-to-seconds; ONE reused PG container (`withReuse(true)` locally, singleton pattern) + ONE shared Spring context for the few fast integration smokes.
- Enforce **Spring context-cache discipline**: ArchUnit/convention banning per-test `@MockitoBean`/`@DirtiesContext`/custom `properties` that fork contexts (each fork ≈ full boot + migrations).
- Publish the fast/full split as a documented contract ("fast = correctness of the unit you touched + all static gates; full = everything"), and track a CI metric: % of runs where fast passed but full failed. >5% ⇒ fix the split.
- Reuse flag is dev-machine-only; CI uses fresh containers but parallel test JVMs + cached images.

**Warning signs:**
More than 2–3 distinct Spring contexts in the fast lane (`spring.test.context.cache` logging); fast-green-full-red PRs recurring; devs running `--full` "just to be sure" (signal the fast lane lost trust).

**Phase to address:**
Q-004 spike in sprint 1 (PRD §10.1); harness quality phase (FR-E08). Confidence: HIGH on mechanics (container reuse/singleton patterns are well documented), MEDIUM on hitting <60s with this exact gate set — that's the spike.

---

### Pitfall 9: Refresh rotation + reuse detection logs users out via its own race; jti blacklist dev/prod parity gap

**What goes wrong:**
Strict single-use rotation + theft detection, hit by **concurrent refresh** (two tabs, request burst after laptop wake): both requests present the same refresh token; the second is classified as "reuse ⇒ theft," the session family is revoked, the legitimate user is logged out. Looks like random session loss; gets misdiagnosed for weeks. Second trap: the planned jti blacklist is Caffeine in dev, Redis in prod — revocation works on the laptop, silently doesn't revoke across pods in prod (or vice versa, tests pass against the wrong impl).

**Why it happens:**
Rotation specs are written for the single-request happy path; browsers are concurrent. Dev/prod cache divergence is invisible until a multi-replica deployment.

**How to avoid:**
- Server side: short **reuse grace window** (a previously-rotated token presented within N seconds returns the already-issued successor instead of triggering theft response), or per-session refresh serialization (DB row lock).
- Client side: single-flight refresh queue in the TS client (one refresh in flight; 401-ed requests await it) — bake into the preset's generated API client layer, since every generated project inherits the bug otherwise.
- Theft detection revokes the **token family**, logged distinctly in audit (FR-B19) so "reuse detected" is observable, not mysterious.
- Run the session/revocation integration tests against **Redis via Testcontainers** (the prod path), with Caffeine covered by a contract test against the same interface; add a two-pod revocation test if feasible.

**Warning signs:**
Sporadic "logged out for no reason" reports in the onboarding pilot; refresh endpoint 401 spikes correlated with page-load bursts; revocation tests only exercising the Caffeine bean.

**Phase to address:**
IAM core (AuthN) phase; client single-flight in frontend foundation phase. Confidence: HIGH (widely documented race; multiple sources).

---

### Pitfall 10: Multi-IdP profile switch — the non-default IdP rots; claim shapes diverge

**What goes wrong:**
Spring Authorization Server and Keycloak 26 issue structurally different tokens: Keycloak puts roles in `realm_access.roles`/`resource_access`, SAS in custom claims/`scope`; audience handling, logout, refresh semantics, and JWKS rotation cadence differ. One profile becomes the daily driver; the other only breaks when a real project flips the switch — defeating FR-B15's whole point. The authority seam (claim→authorities mapping) is exactly where the divergence concentrates.

**How to avoid:**
- A single `JwtAuthoritiesConverter` behind the authority seam with **per-IdP claim-mapping config**, covered by contract tests using captured token fixtures from BOTH IdPs.
- CI runs the IAM integration suite in **both profiles** (Keycloak via Testcontainers; SAS in-process) — in `verify --full`, not fast.
- Pin accepted algorithms (RS256/ES256 per FR-B15) and assert audience validation in both profiles — Keycloak's default `aud` behavior surprises people.

**Warning signs:**
Only one profile in the CI matrix; role-mapping code with `realm_access` hardcoded outside the seam; JWKS rotation test exists for one IdP only.

**Phase to address:**
IAM AuthZ phase (seam) + guardrails phase (dual-profile CI). Confidence: MEDIUM-HIGH ([Inference] on Keycloak-26 specifics; the claim-shape divergence itself is well known).

---

### Pitfall 11: Windows-no-WSL is a standing minefield — line endings, hooks, scripts, Docker backend

**What goes wrong:**
- **CRLF**: without a committed `.gitattributes`, Windows checkouts flip line endings; shell scripts (`mvnw`, init.sh, hook scripts) break with `bad interpreter`/`\r` errors; gates that hash or lint files produce OS-dependent results (contract-drift and CLAUDE.md-size gates included).
- **Claude Code hooks on Windows** execute through a different shell; a bash-only hook script errors — and depending on exit-code handling may fail open (see Pitfall 7).
- **Docker without WSL**: Docker Desktop's primary Windows backend IS WSL2; "no WSL" pushes teams to Hyper-V backend, Rancher Desktop, or Podman — each with different volume/network behavior that Testcontainers and `task up` must tolerate. Named-volume performance and `host.docker.internal` quirks differ.
- `./mvnw` vs `mvnw.cmd`, path separators, and `task` (Taskfile/Go — genuinely cross-platform, good choice) shelling out to bash-isms inside task definitions.

**How to avoid:**
- Commit `.gitattributes` (`* text=auto eol=lf`, `*.cmd/*.ps1 eol=crlf`) in the preset's first commit; add a CI check that fails on CRLF in tracked text files.
- All automation that must run on dev machines (hooks, init, gate runners) written in a cross-platform runtime (Node/Go/PowerShell-Core-compatible) or dual-shipped `.sh|.ps1` as FR-A12 already does — extend that rule to **hook scripts and skill helper scripts**, not just init.
- Clarify the Docker story explicitly in ONBOARDING ("no WSL" = you don't work inside WSL; document which container runtimes are supported/tested) and put Windows runners in the CI matrix for `task up` smoke + Testcontainers suite, not just compile.

**Warning signs:**
Any `.sh` without a `.ps1` twin in scripts/hooks; green CI on ubuntu-only for gate jobs; first Windows onboarding pilot burning hours on Docker setup.

**Phase to address:**
Phase 1 (repo bootstrap — .gitattributes, CI 3-OS matrix from the first commit). Confidence: HIGH (well-trodden failure class).

---

### Pitfall 12: The tutorial (`specs/000-example`) and CLAUDE.md rot — the onboarding promise quietly dies

**What goes wrong:**
`specs/000-example` is a frozen narrative referencing commands, paths, and gate names that the living repo evolves away from. The first real onboarding pilot follows it and hits errors at step 2 — the ≤1-day metric fails for reasons that have nothing to do with the methodology. Same dynamic for CLAUDE.md: rules drift from actual code conventions, agents follow stale instructions, and devs learn CLAUDE.md is unreliable (which is fatal for an enforcement-centric product).

**How to avoid:**
- FR-D12 (CLAUDE.md smoke: commands mentioned must run) is the right idea — **extend the same smoke gate to ONBOARDING.md and specs/000-example**: extract referenced commands/paths and execute/verify them in CI.
- Treat tutorial-affecting changes as a declared review concern: gate renames, skill renames, and script moves require a checklist item "tutorial updated?" (cheap: PR template + CODEOWNERS on `specs/000-example/`).
- Re-run an internal mini-pilot (one person, fresh clone) before the real measured pilot.

**Warning signs:**
Tutorial references a command that changed name; ONBOARDING.md untouched for many phases while gates churned; CLAUDE.md line budget hit by appending instead of pruning.

**Phase to address:**
Onboarding phase owns the artifacts; the smoke gates land in guardrails phase. Confidence: HIGH ([Inference] from universal docs-rot dynamics + this repo's own mitigation design).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Putting cross-module DTOs/helpers in `shared` | Compiles instantly | God-module; boundaries dissolve while verify stays green | Never for domain types; only true primitives/infra |
| Skipping listener idempotency "because registry guarantees delivery" | Less code | Double side-effects on republish/restart | Never for side-effecting listeners |
| Single Spring context "for now" without cache discipline | Tests pass | Context-fork explosion; verify --fast budget dies by a thousand `@MockitoBean`s | Acceptable only with the ArchUnit context-discipline rule in place |
| Testing IdP integration on Keycloak only | Faster IAM iteration | SAS profile rots; profile switch is fiction | Acceptable mid-phase; never at phase DoD |
| Hook-only T3 enforcement before CI gate exists | Ship enforcement demo early | Fails open via hook bugs/Bash bypass; trust collapse on first leak | Never claim enforcement before FR-D10 (L2) is live |
| Flowable auto-update ON during the spike | Engine "just works" | Masks the exact schema-ownership question Q-006 must answer | OK in spike scratch branch only |
| Time-boxed gate waiver left past its expiry | Unblocks a PR | Waiver register becomes a bypass register; gate fatigue normalizes | PRD already restricts; enforce expiry in CI |
| JDK 26 without a written fallback to 25 LTS | Matches user decision | Tool blockage = unplanned multi-day stall; Sept 2026 forced upgrade | Acceptable only with fallback ADR + toolchain spike green |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Flowable ↔ JPA | Assuming one DataSource ⇒ one transaction | Explicitly inject the JPA `PlatformTransactionManager` into engine config; prove with rollback test (Q-006) |
| Flowable ↔ tenancy | Relying on Hibernate filter for engine tables | Flowable is MyBatis-based — use Flowable's first-class tenantId on deploy/start/query |
| Flowable ↔ Flyway | Vendoring create-scripts once and forgetting upgrades | Versioned runbook: each Flowable bump = matching upgrade script as new Flyway migration; engine schema-validation on at startup |
| Modulith registry ↔ K8s HPA/rolling restart | republish-on-restart with >1 replica double-fires | Idempotent listeners + bounded retry + restart test with 2 replicas |
| Keycloak 26 ↔ Spring Security | Hardcoding `realm_access.roles` in converters scattered around | One claim-mapping seam, per-IdP config, fixture-based contract tests for both IdPs |
| Orval/OpenAPI ↔ CI drift gate | Non-deterministic spec generation (ordering, timestamps) → false drift failures | Force deterministic serialization (sorted paths/schemas, no volatile fields) before enabling the gate; otherwise gate fatigue starts here |
| axe-core ↔ CI | Running axe against dynamically-loading pages without settle/wait → flaky failures | Run axe in Playwright after explicit network-idle/ready states; pin axe-core version; triage rule: a11y gate failures are either real or test-harness bugs — never "rerun until green" |
| Testcontainers ↔ Windows/no-WSL Docker backends | Assuming Docker Desktop+WSL2 behavior | Test `task up` + Testcontainers on the actually-supported runtimes; document the supported list |
| Claude Code hooks ↔ Windows | bash-only hook scripts | Cross-platform hook runner (Node) or `.ps1` twin; test fail-open vs fail-closed behavior per OS |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Event publication registry table growth | Slowly increasing publish latency; large `event_publication` table | Completion mode DELETE or scheduled purge in preset defaults | Weeks-to-months of normal operation |
| Incomplete-publication pile-up | Restart takes minutes; OOM during replay | Bounded retry + incomplete-count alert | First prolonged downstream outage |
| Spring test context forks | verify time creeps up nonlinearly as tests are added | Context-cache discipline rule; count distinct contexts in CI | ~5–10 distinct contexts ≈ fast budget gone |
| Per-test containers | Each IT class adds 5–15s | Singleton/reused container pattern from day one | Immediately at gate-budget scale |
| Permission cache without invalidation discipline | Stale permissions after role edit; or cache stampede on invalidate-all | FR-B13's targeted invalidation; test assign/revoke→cache-refresh path | First admin role edit in prod |
| Audit via synchronous in-transaction writes | Write-path P95 degrades as audit coverage grows | After-commit async audit events (design already says this — keep it) | High-traffic write endpoints |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Reuse-detection without grace window/serialization | Legit users mass-logged-out; team disables theft detection entirely (worse) | Grace window or per-session lock; family revoke + distinct audit event |
| jti blacklist only validated against Caffeine | Revocation no-ops across prod pods | Redis-backed tests via Testcontainers; contract test on the cache interface |
| Tenant filter assumed on native SQL / jobs / Flowable | Cross-tenant data leak the day tenant #2 arrives | Wrapper-only native queries (ArchUnit); TenantContext propagation into async/scheduled/BPM; isolation test covers non-HTTP paths |
| Flowable REST/engine endpoints mounted outside app filter chain | Unauthenticated process/task API | FR-C02's "engine REST through app SecurityFilterChain" verified by a 401/403 matrix test on BPM endpoints |
| Step-up auth checked in UI only | Direct API call bypasses type-to-confirm/step-up | Server-side step-up enforcement annotation + 403 tests (the PRD's 401/403 matrix must include step-up paths) |
| Permission catalog sync deleting in-use permissions | Silent privilege loss or orphaned grants | FR-B11 deprecation-before-delete flow; ADR before implementing sync |
| Trusting `Approved-by:` text line in plan.md | Agent or human copies the line; "approval" is fiction | PRD already mandates hosting-API identity verification (Q-002) — do not ship the text-only interim as if it enforces anything |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Gate failure messages without rule-ID + fix | Agent burns fix rounds; dev bypass pressure grows | FR-E08 error-legibility format enforced as a gate-output contract (lint the gate runners' output format itself) |
| Hook deny without next-step | Beginner dev stuck, blames the tool | FR-E03 message standard ("run skill `plan`") — test the message text in hook scenario matrix |
| Permission matrix saves without diff preview | Accidental privilege grants | FR-B18 diff-before-save — already specced; don't cut it under schedule pressure (it's the safety net for the riskiest admin action) |
| BPM inbox without overdue/empty/error states | Tasks silently missed | UI-states checklist (§8.2) applied to BPM screens, not just IAM |
| Logged out "randomly" (rotation race) | Trust in the generated app's auth erodes | Pitfall 9 fixes + audit event surfacing "session revoked: reuse detected" |

## "Looks Done But Isn't" Checklist

- [ ] **Event reliability:** kill-listener test passes — but verify **no duplicate side-effects** on republish and with 2 replicas
- [ ] **Tenancy seam:** isolation test passes via HTTP — but verify async listener, @Scheduled job, and Flowable job paths carry tenant
- [ ] **T3 enforcement:** hook denies in demo — but verify Bash-write bypass, MCP tools, Windows shell, and that CI L2 catches what L1 misses
- [ ] **Multi-IdP:** Keycloak profile green — but verify SAS profile runs the same IAM suite in CI
- [ ] **verify --fast:** under 60s — but verify fast-green⇒full-green rate is tracked and >95%
- [ ] **Flowable atomicity:** happy-path process commits — but verify rollback test and failed-job retry under shared TX
- [ ] **Onboarding:** ONBOARDING.md written — but verify a fresh-clone dry run on Windows-no-WSL executed every referenced command
- [ ] **Contract-drift gate:** enabled — but verify spec generation is deterministic (two consecutive builds produce byte-identical spec)
- [ ] **JDK 26:** app compiles — but verify JaCoCo, Mockito, MapStruct, ArchUnit, Buildpacks image, and all 3 OS CI toolchains
- [ ] **Permission checks:** @RequirePermission on controllers — but verify FR-D11 gate actually fails on an undeclared protected endpoint (test the gate, not just the code)

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| JDK 26 tool blockage mid-build | MEDIUM | Execute fallback ADR: `--release 25` or pin JDK 25 LTS; isolate the blocked tool; re-run toolchain matrix |
| Flowable schema drift discovered post-integration | HIGH | Freeze BPM module; reconcile via Flowable's official upgrade scripts into Flyway; restore from the Q-006 runbook; worst case re-baseline engine schema |
| `shared` god-module entrenched | HIGH | Incremental: classify contents, move domain types back to owning modules behind SPI/events, tighten ArchUnit rule each step |
| Duplicate-event side effects in prod-like env | MEDIUM | Add idempotency keys to affected listeners; replay-safe handlers; purge stuck publications via IncompleteEventPublications API |
| Hook enforcement found bypassed | LOW (if L2 exists) / CRITICAL (if not) | CI L2 already blocks merge ⇒ patch hook matrix, add scenario. If L2 wasn't live: audit all merged T3 diffs since regression |
| Fast/full verify drift | LOW | Re-partition gate sets; add the divergence metric; communicate the new contract |
| Tutorial rot found by pilot | LOW | Fix-forward during pilot; add the missing smoke coverage so the class of break is gated |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. JDK 26 toolchain lag | Phase 1 (Foundation) — toolchain spike + fallback ADR | 3-OS CI green incl. coverage/mocking/buildpack jobs |
| 2. Flowable schema/TX | Q-006 spike phase (before Group C commit) | Table-inventory assert + rollback test + upgrade runbook exists |
| 3. EPR duplicates/growth | Modulith eventing phase | Kill-listener + republish-idempotency + 2-replica restart tests; purge configured |
| 4. shared god-module | Modulith core phase (rules) + ongoing | ArchUnit shared-content rule; fan-in trend reviewed at transitions |
| 5. ApplicationModuleTest gaps | Modulith eventing + skills phase | Every cross-module DAG edge has a Scenario/integration test |
| 6. Tenant filter bypass | Tenancy phase; hardened in guardrails + BPM phases | FR-D09 covers HTTP + async + scheduled + BPM paths |
| 7. Hook deny instability | Q-010 spike before Claude Code pack phase | Hook scenario matrix in CI per pinned version, 3 OS; L2 live first |
| 8. verify --fast infeasible/drift | Q-004 spike (sprint 1); harness phase | <60s measured in CI; fast-vs-full divergence metric <5% |
| 9. Rotation race / blacklist parity | IAM AuthN phase + frontend foundation | Concurrent-refresh test; Redis-backed revocation test; single-flight client |
| 10. IdP profile rot | IAM AuthZ phase + guardrails | Dual-profile IAM suite in verify --full CI |
| 11. Windows/no-WSL traps | Phase 1 (first commit: .gitattributes, 3-OS CI) | Windows runner executes task up smoke + gates + hook scripts |
| 12. Tutorial/CLAUDE.md rot | Onboarding phase + guardrails (smoke gates) | FR-D12 extended to ONBOARDING + 000-example; fresh-clone dry run |

## Sources

- Spring Modulith: [events reference](https://docs.spring.io/spring-modulith/reference/events.html), [issue #1056 — identical events complete wrongly](https://github.com/spring-projects/spring-modulith/issues/1056), [issue #796 — event publication lifecycle overhaul](https://github.com/spring-projects/spring-modulith/issues/796), [Getting free outbox with Spring Modulith](https://garstecki.dev/articles/getting-free-outbox-with-spring-modulith/)
- JDK 26: [Spring Boot system requirements](https://docs.spring.io/spring-boot/system-requirements.html) (Java 17–26), [Lombok #4019 — class file v70 unsupported](https://github.com/projectlombok/lombok/issues/4019), [javaalmanac class file versions](https://javaalmanac.io/bytecode/versions/), [Paketo bellsoft-liberica releases (JDK 26.0.1 available)](https://github.com/paketo-buildpacks/bellsoft-liberica/releases)
- Flowable 8: [8.0.0 release announcement (2026-02-27, Spring Boot 4)](https://forum.flowable.org/t/flowable-8-0-0-release/12548), [database schema docs](https://documentation.flowable.com/latest/develop/dbs/overview), [upgrading guide](https://documentation.flowable.com/latest/admin/maintenance/version-upgrade), [Flowable+Flyway forum thread](https://forum.flowable.org/t/flowable-flyway-spring-boot-2-2-2-not-working/7284)
- Claude Code hooks: [hooks reference](https://code.claude.com/docs/en/hooks), issues [#37210](https://github.com/anthropics/claude-code/issues/37210), [#33106](https://github.com/anthropics/claude-code/issues/33106), [#39344](https://github.com/anthropics/claude-code/issues/39344), [#4669](https://github.com/anthropics/claude-code/issues/4669), [#37420](https://github.com/anthropics/claude-code/issues/37420)
- Testcontainers speed: [rieckpil — reuse containers](https://rieckpil.de/reuse-containers-with-testcontainers-for-fast-integration-tests/), [Callista — speed up Testcontainers](https://callistaenterprise.se/blogg/teknik/2020/10/09/speed-up-your-testcontainers-tests/)
- JWT rotation races: [Race conditions in JWT refresh rotation](https://dev.to/silentwatcher_95/race-conditions-in-jwt-refresh-token-rotation-3j5k), [refresh reuse interval & theft detection](https://mihai-andrei.com/blog/refresh-token-reuse-interval-and-reuse-detection/), [Auth.js rotation guide](https://authjs.dev/guides/refresh-token-rotation)
- Hibernate filter tenancy: [Callista multi-tenancy series pt.5/pt.8](https://callistaenterprise.se/blogg/teknik/2020/10/17/multi-tenancy-with-spring-boot-part5/) (native SQL/JDBC bypass filters; session interception limits)
- [Inference]-labeled items: pattern-based from modular-monolith and docs-rot literature plus this PRD's own risk register (§11) — not independently web-verified.

---
*Pitfalls research for: Spring Boot 4 Modulith + React 19 scaffold preset with embedded IAM, Flowable 8 BPM option, guardrail gates, Claude Code enforcement*
*Researched: 2026-06-11*
