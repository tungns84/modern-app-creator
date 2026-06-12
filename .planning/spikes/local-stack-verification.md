# Local Stack Verification — `task up` (FOUND-02, D-04 manual evidence)

- **Plan:** 01-05, Task 2
- **Date:** 2026-06-12
- **Scope:** live one-command boot of the 6-service stack defined in `infra/compose.yaml`, readiness gated exclusively by compose healthchecks (`up -d --wait`), no hand-rolled wait loops.

## Windows verification — COMPLETED

| Item | Value |
|------|-------|
| OS | Microsoft Windows NT 10.0.26200.0 (Windows 11 Pro) |
| Docker runtime (named per D-04) | **Docker Desktop**, Engine 29.5.3 (linux/amd64), **WSL2 backend** (kernel `6.6.87.2-microsoft-standard-WSL2`) |
| Docker Compose | v5.1.4 |
| go-task | `task --version` → **3.51.1** (pinned; installed from official go-task/task GitHub release `v3.51.1`, SHA-256 of `task_windows_amd64.zip` verified against published `task_checksums.txt`: `422d79dff5afd5a55fb46ae1cfacc7350ec96d4ef27a63a3ec77a5c30a7b0f03`) |
| `task up` wall time | 96s (1m36.182s, includes image pulls; `--wait` returned only after all healthchecks passed) |
| `task down` | clean teardown, network removed |

> Pitfall 7 clarification (D-04): "no WSL" means developers do not work *inside* WSL as their workspace. Docker Desktop using a WSL2 *daemon backend* is acceptable — the workspace, shell, task binary, and compose CLI all ran Windows-native.

### Per-service health result (`docker compose -f infra/compose.yaml ps --format json`, asserted by script)

| Service | Image | Health |
|---------|-------|--------|
| postgres | `postgres:16.14-alpine` | healthy |
| valkey | `valkey/valkey:8.1.8` | healthy |
| mailpit | `axllent/mailpit:v1.30.1` | healthy |
| minio | `minio/minio:RELEASE.2025-09-07T16-13-09Z` | healthy |
| keycloak | `quay.io/keycloak/keycloak:26.6.3` | healthy |
| lgtm | `grafana/otel-lgtm:0.28.0` | healthy |

**ALL 6 HEALTHY** — assertion script required exactly 6 services and `Health == "healthy"` on every row; it passed.

### Assumption A8 resolution (healthcheck endpoints, verified empirically by this run)

- mailpit: `wget -q -O - http://localhost:8025/livez` inside the container → healthy. RESOLVED-YES.
- minio: image ships curl; `curl -f http://localhost:9000/minio/health/live` → healthy. RESOLVED-YES.
- lgtm: image ships curl; `curl -f http://localhost:3000/api/health` → healthy. RESOLVED-YES.
- keycloak: no curl in image; bash `/dev/tcp` CMD-SHELL probe against management port 9000 `/health/ready` (`KC_HEALTH_ENABLED=true`) → healthy with `start_period: 30s / interval: 10s / retries: 12`. RESOLVED-YES (T-01-16 mitigation held — no flake observed).

## macOS verification — PENDING

| Item | Value |
|------|-------|
| Status | **PENDING** — one-time `task up` verification on a macOS machine not yet run |

> **BLOCKING for phase verification — must be either completed and recorded here, or explicitly waived via a time-boxed entry in .cowork/waivers.json (scope: macos-task-up-verification), BEFORE /gsd-verify-work runs.** (D-04 requires the verification DURING Phase 1, not open-ended. Note: the CI `smoke-macos` leg is container-free by design — GitHub-hosted macOS runners ship no Docker daemon — so it cannot substitute for this manual run.)
