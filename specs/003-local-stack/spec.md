# Spec 003: Local Stack (`task up`)

## User Story

As a developer on any of Windows, macOS, or Linux (no WSL), I can boot the full
local infrastructure stack with one command — `task up` — and trust that it blocks
until every service is actually healthy, so application work always starts against
a known-good environment.

## Scope

This unit covers:

- `infra/compose.yaml` — 6-service stack: PostgreSQL 16, Valkey 8, Mailpit, MinIO,
  Keycloak 26.6, grafana/otel-lgtm — each with an in-container healthcheck
- `Taskfile.yml` — `up`/`down`/`ps`/`logs` tasks in POSIX-sh syntax (mvdan/sh,
  Windows-native via go-task)
- `.github/workflows/os-matrix.yml` — 3-OS CI matrix encoding the D-04 split

## Acceptance Criteria

1. `task up` boots all 6 services and blocks until every healthcheck passes
   (`docker compose up -d --wait` — no hand-rolled wait loops).
2. `task down` tears the stack down; `task --list` shows task descriptions.
3. CI ubuntu leg runs real `task up` and asserts all services healthy;
   Windows/macOS legs run container-free smoke (task binary install, `task --list`,
   compose config validation, JDK 25 toolchain smoke) per D-04.
4. Local Windows `task up` verification is recorded with the runtime named; the
   one-time macOS verification is completed or explicitly waived in
   `.cowork/waivers.json` before phase verification (D-04 manual evidence).

## Requirements

- **FOUND-02** — Developer can boot the full local stack (PostgreSQL 16,
  Redis-compatible cache, Mailpit, MinIO, Keycloak, observability) with one command
  `task up` on Win/macOS/Linux without WSL (FR-A02)

Note: the Redis-compatible cache ships as Valkey 8 (BSD-3) — license rationale is
recorded in `docs/adr/0001-valkey-not-redis.md` (unit 006).
