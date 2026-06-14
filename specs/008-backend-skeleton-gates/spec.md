# Spec 008: Backend Skeleton + Gates

tier: T3

## Summary

Bootstrap the Spring Boot 4 / Spring Modulith 2.0 Maven backend skeleton with the `shared`
reference module and wire both architecture gates (GATE-01 Modulith verify, GATE-02 ArchUnit)
into the `run-gate.mjs` verify spine. Land the FOUND-05 Wave-0 database fixture
(real PostgreSQL 16 via Testcontainers 2.x + per-module Flyway schema assertion).

## Requirements Addressed

- FOUND-01: Backend builds as Spring Modulith; DAG declared; module-count dynamic by BPM option
- FOUND-05: PostgreSQL 16 only; Flyway per-module; Testcontainers for integration tests
- GATE-01: Modulith verify gate — acyclic DAG, declared deps only; dynamic by BPM option
- GATE-02: ArchUnit gate — field injection, bare @Scheduled, native query, @Transactional private,
  entity at boundary, @Value outside appconfig, Environment outside appconfig
- AGENT-08: Gate errors name rule + fix; `verify --fast` <60s

## Work Branch

`feat/008-backend-skeleton-gates`
