# Spike Report: JDK 25 Toolchain Smoke (3-OS GitHub Actions Matrix)

**Date:** 2026-06-11
**Spike repo:** `tungns84/jdk25-toolchain-spike` (private, throwaway — deleted after spike; harness preserved at `.planning/spikes/jdk25-harness/`)
**Plan:** 01-03, Task 2 — resolves Open Question 4 and the two MEDIUM-confidence risk-register items (MapStruct, JaCoCo on JDK 25)

## Isolation statement

All results below come from **GitHub Actions runners using Temurin 25 resolved by `actions/setup-java@v4`** (`distribution: temurin`, `java-version: '25'`). The local machine's JDK was never used to build or test the spike — locally only files were authored, per the RESEARCH Environment Availability constraint.

Resolved runtime on all three legs (verbatim from logs):

```
openjdk version "25.0.3" 2026-04-21 LTS
OpenJDK Runtime Environment Temurin-25.0.3+9 (build 25.0.3+9-LTS)
```

## Toolchain under test

| Component | Version | Exercised by |
|-----------|---------|--------------|
| maven-compiler-plugin | `<maven.compiler.release>25</maven.compiler.release>` | full compile of main + test sources |
| Maven Wrapper | 3.9.16 | `./mvnw -B verify` on every leg |
| JUnit Jupiter | 5.14.4 | 4 tests across 3 test classes |
| Mockito (+ Byte Buddy agent) | 5.20.0 | `GreetingServiceTest` (mock + inline agent attach) |
| MapStruct | 1.6.3 | annotation processor generates `GreetingMapperImpl`; `GreetingMapperTest` exercises it |
| JaCoCo | 0.8.15 | `prepare-agent` + `report` goals bound; HTML report asserted post-build |
| ArchUnit | 1.4.2 | `ArchitectureTest` reads compiled class-file-69 classes |

## Run history

### Run 1 — `27350127175` (commit `d5e5002`) — FAILURE (harness bug, not toolchain)

https://github.com/tungns84/jdk25-toolchain-spike/actions/runs/27350127175

| OS | Result | Detail |
|----|--------|--------|
| windows-latest | ✅ PASS | Full `mvnw -B verify` green: compile (release 25), 4/4 tests, JaCoCo report produced |
| ubuntu-24.04 | ❌ FAIL | `./mvnw: Permission denied` (exit 126) — **missing executable bit on `mvnw`**, never reached the toolchain |
| macos-latest | ❌ FAIL | Same `./mvnw: Permission denied` — same harness bug |

Root cause: the repo was pushed from Windows without `git update-index --chmod=+x mvnw`, so unix runners could not execute the wrapper. This is a **harness/infra defect, not a JDK 25 toolchain failure** — no Maven, compiler, or test step ever ran on the unix legs. The Windows PASS from this run stands as valid toolchain evidence.

Fix: commit `5db8004` "fix: set executable bit on mvnw for unix runners" (`git update-index --chmod=+x mvnw`).

### Run 2 — `27350513905` (commit `5db8004`) — SUCCESS, all 3 OS

https://github.com/tungns84/jdk25-toolchain-spike/actions/runs/27350513905

| OS | Result | Java resolved | Tests | JaCoCo report |
|----|--------|---------------|-------|---------------|
| windows-latest | ✅ PASS | Temurin 25.0.3+9 (x64, tool-cache) | 4/4 green | `target/site/jacoco/index.html` asserted present |
| ubuntu-24.04 | ✅ PASS | Temurin 25.0.3+9 (x64, tool-cache) | 4/4 green | asserted present |
| macos-latest | ✅ PASS | Temurin 25.0.3+9 (arm64, tool-cache) | 4/4 green | asserted present |

Per-leg test evidence (identical on all OSes): `Tests run: 4, Failures: 0, Errors: 0, Skipped: 0` → `BUILD SUCCESS`. JaCoCo agent line observed on ubuntu: `jacoco:0.8.15:prepare-agent` → `argLine set to -javaagent:...org.jacoco.agent-0.8.15-runtime.jar` → `jacoco:0.8.15:report` loaded `jacoco.exec`.

## Per-tool verdicts on JDK 25

| Tool | Prior confidence | Verdict | Evidence |
|------|------------------|---------|----------|
| **MapStruct 1.6.3** annotation processing | MEDIUM (no official Java 25/26 statement) | ✅ **WORKS on 25** | Processor ran under javac release 25 on all 3 OSes; generated `GreetingMapperImpl` compiled and `GreetingMapperTest` passed |
| **JaCoCo 0.8.15** instrumentation + report | MEDIUM (ASM-based, class-file sensitivity) | ✅ **WORKS on 25** | Agent attached, exec data collected, HTML report generated and asserted on all 3 OSes |
| **ArchUnit 1.4.2** class-file reading | HIGH (1.4.2 ASM upgrade) | ✅ Confirmed | `ArchitectureTest` read release-25 class files (major 69) and passed on all 3 OSes |
| **Mockito 5.20.0 / Byte Buddy** | HIGH | ✅ Confirmed | Mocks created and verified, no `-Dnet.bytebuddy.experimental` flag needed |
| **JUnit Jupiter 5.14.4** | HIGH | ✅ Confirmed | All legs green |
| **Maven Wrapper 3.9.16** | HIGH | ✅ Confirmed | Drove the build on all 3 OSes (after exec-bit fix for unix) |

## Assumption resolution

- **A7 — Temurin 25 available via `actions/setup-java`:** ✅ RESOLVED-YES. `setup-java@v4` with `distribution: temurin`, `java-version: '25'` resolved **Temurin 25.0.3+9 LTS from the runner tool-cache** (no network download needed) on windows-latest (x64), ubuntu-24.04 (x64), and macos-latest (arm64).

## Standing guidance for Phase 2 (backend toolchain pins)

- Pin **ArchUnit ≥ 1.4.2** and **JaCoCo ≥ 0.8.15** explicitly (Boot does not manage ArchUnit; both now empirically verified on 25).
- MapStruct **1.6.3** is safe on JDK 25 — no need for 1.7.0.Beta1 or a compiler-release downgrade. The MEDIUM-confidence risk-register rows for MapStruct and JaCoCo are **CLOSED**.
- Ship `mvnw` with the executable bit set in git (`git update-index --chmod=+x mvnw`) — mandatory for the 3-OS matrix when authoring from Windows. Carry this into the preset template (PRESET-SPEC binaryGlobs / repo hygiene).
- `actions/setup-java@v4` + `temurin` + `25` is the canonical CI JDK setup; tool-cache hit means fast setup on all hosted runners.

## Conclusion

**VERDICT: PASS.** The full backend test toolchain (compiler release 25, JUnit, Mockito/Byte Buddy, MapStruct 1.6.3 annotation processing, JaCoCo 0.8.15 coverage, ArchUnit 1.4.2) runs green on JDK 25 (Temurin 25.0.3) across windows-latest, ubuntu-24.04, and macos-latest. Roadmap success criterion 5's JDK-25 smoke is satisfied; Phase 2 backend pins are empirically grounded.
