# Plan 003: Local Stack

tier: T3

## Why T3

`Taskfile.yml` is the canonical command surface referenced by the constitution and
the verify gate; `.github/**` workflows are T3 paths; `infra/compose.yaml` is
infrastructure configuration consumed by CI gates. All sit on the gate-config
surface of AI-COWORK §5.

## Files to touch

- `infra/compose.yaml` — services: `postgres:16-alpine` (`pg_isready`),
  `valkey/valkey:8` (`valkey-cli ping`), `axllent/mailpit`, `minio/minio`,
  `quay.io/keycloak/keycloak:26.6.3` (`start-dev`, mgmt-port TCP probe — image has
  no curl), `grafana/otel-lgtm` (ports 3000/4317/4318). Healthchecks run INSIDE
  containers; dev-only credentials only.
- `Taskfile.yml` — `up` = `docker compose -f infra/compose.yaml up -d --wait`;
  `down`, `ps`, `logs`; POSIX-sh task bodies; only `docker`, `node`, `task`
  assumed callable
- `.github/workflows/os-matrix.yml` — matrix
  `[windows-latest, ubuntu-24.04, macos-latest]`; ubuntu = real `task up` + assert
  compose services healthy; win/mac = `task --version`, `task --list`,
  `docker compose -f infra/compose.yaml config -q`, JDK 25 smoke
  (`actions/setup-java`, temurin, 25)

## Modules affected

n/a — pre-backend.

## Events / SPI surfaces

n/a.

## Migrations

n/a — database schema migrations start with the first backend module.

## Tests

- CI os-matrix workflow IS the test (D-04 split).
- `docker compose config -q` validates compose syntax on all three OS legs.
- Manual once-per-phase Win/mac real-boot evidence recorded per D-04.

## Constitution rules that apply

- 3-OS-no-WSL platform constraint (root constitution)
- Image pins are reproducibility-relevant: pin minors in compose
- GitHub-hosted macOS runners have no Docker; Windows runners cannot reliably run
  Linux containers — hence the D-04 split (toolchain portability proven on 3 OS,
  containers proven on ubuntu).

## Approval

Approved-by: tungns84 2026-06-11 (H2 approval granted via GSD Phase-1 plan review; solo self-approval waived per .cowork/waivers.json W-001)

Per D-02 this line is audit trail, NOT authorization proof. Authorization is the
PR review API plus repository ruleset; a forged `Approved-by:` line never
constitutes approval.

Branch for this unit: `feat/003-local-stack`.
