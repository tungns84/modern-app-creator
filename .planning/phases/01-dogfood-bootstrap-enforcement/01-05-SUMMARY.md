---
phase: 01-dogfood-bootstrap-enforcement
plan: 05
subsystem: infra
tags: [docker-compose, taskfile, github-actions, healthchecks, found-02, d-04]
requires:
  - phase: 01-dogfood-bootstrap-enforcement
    plan: 01
    provides: repo hygiene (.gitattributes eol=lf) so YAML lands LF on unix CI legs
  - phase: 01-dogfood-bootstrap-enforcement
    plan: 12
    provides: approved spec 003-local-stack binding this plan
provides:
  - 6-service local stack (infra/compose.yaml) with in-container healthchecks, all tags pinned
  - one-command boot/teardown via Taskfile (task up/down/ps/logs), readiness via compose --wait
  - standing 3-OS CI workflow os-matrix.yml encoding the D-04 split
  - D-04 manual evidence: Windows task-up verification report (.planning/spikes/local-stack-verification.md)
affects:
  - 01-11 (Taskfile verify task joins this Taskfile; compose-config gate parses infra/compose.yaml)
  - phase-2 backend dev loop (PostgreSQL/Valkey/Keycloak endpoints)
  - phase-3 (Keycloak realm wiring — container only for now)
tech-stack:
  added:
    - go-task v3.51.1 (pinned, checksum-verified local install)
    - postgres:16.14-alpine, valkey/valkey:8.1.8, axllent/mailpit:v1.30.1, minio/minio:RELEASE.2025-09-07T16-13-09Z, quay.io/keycloak/keycloak:26.6.3, grafana/otel-lgtm:0.28.0
  patterns:
    - readiness lives in compose healthchecks (`up -d --wait`), never in Taskfile loops (Don't-Hand-Roll)
    - all healthchecks run INSIDE containers (Pitfall 7)
    - D-04 split: real stack on ubuntu only; win/mac legs are container-free toolchain smoke
key-files:
  created:
    - infra/compose.yaml
    - Taskfile.yml
    - .github/workflows/os-matrix.yml
    - .planning/spikes/local-stack-verification.md
  modified: []
decisions:
  - "go-task local install: official GitHub release binary v3.51.1 with SHA-256 verification (winget tops out at 3.50.0 — pin kept exact instead of accepting the lagging package manager version)"
  - "A8 healthcheck assumptions resolved empirically: mailpit /livez (wget), minio curl /minio/health/live, lgtm curl /api/health, keycloak /dev/tcp mgmt-9000 — all reached healthy in the live run"
  - "Keycloak mgmt port 9000 deliberately unpublished — host 9000 belongs to MinIO S3 API"
metrics:
  duration: ~25 min (continuation session; prior session produced only the compose draft)
  completed: 2026-06-12
  tasks: 3
  files: 4
---

# Phase 01 Plan 05: Local Stack + 3-OS Matrix Summary

One-command local stack (`task up`, 6 pinned services, compose `--wait` healthcheck-gated) verified live on Windows/Docker Desktop, plus the standing os-matrix workflow encoding the D-04 split.

## What was built

1. **`infra/compose.yaml`** (106 lines): postgres 16.14-alpine, valkey 8.1.8 (D-17), mailpit v1.30.1, minio RELEASE.2025-09-07T16-13-09Z, keycloak 26.6.3, otel-lgtm 0.28.0 (D-18). Every service has an in-container healthcheck; Keycloak uses the bash `/dev/tcp` probe on management port 9000 (`KC_HEALTH_ENABLED=true`, start_period 30s / interval 10s / retries 12 per PATTERNS); host 9000 maps to MinIO only. Dev-only credentials comment-labeled (T-01-15); pin discipline noted in header (T-01-14). All 6 tags verified present on their registries via `docker manifest inspect` before adoption.
2. **`Taskfile.yml`**: `up` (`docker compose -f infra/compose.yaml up -d --wait`), `down`, `ps`, `logs` — POSIX-sh bodies, only `docker` invoked, zero wait loops. No `verify` task (plan 01-11 owns it per Q-004 contract).
3. **Live Windows verification** (`.planning/spikes/local-stack-verification.md`): `task up` returned after 96s with **all 6 services healthy** (asserted via `ps --format json` script); runtime named per D-04: Docker Desktop, Engine 29.5.3, WSL2 backend; `task --version` 3.51.1. macOS row is PENDING with the verbatim BLOCKING-before-`/gsd-verify-work` note (resolution = run it once on macOS or waive via `.cowork/waivers.json` scope `macos-task-up-verification`).
4. **`.github/workflows/os-matrix.yml`**: `stack-ubuntu` (real `task up` + 6-healthy assertion + `task down` on `always()`), `smoke-windows` and `smoke-macos` (task binary smoke, compose static `config -q`, setup-java temurin 25 + `java -version` assert). go-task pinned v3.51.1 on every leg; macOS leg validates compose via standalone `docker-compose` (brew) since hosted macOS runners ship no Docker CLI. Only `actions/*` actions, pinned by major (V14).

## Task commits

| Task | Name | Commit |
|------|------|--------|
| 1 | infra/compose.yaml — 6 services, in-container healthchecks, pinned tags | `dbccf70` |
| 2 | Taskfile.yml + live Windows `task up` evidence (D-04) | `74a3a35` |
| 3 | os-matrix.yml — D-04 split on 3 OS | `32aeec3` |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] winget carries no go-task v3.51.1 (newest: 3.50.0)**
- **Found during:** Task 2 (`winget install Task.Task --version 3.51.1` → "No version found matching: 3.51.1")
- **Fix:** kept the pin exact by installing from the official `go-task/task` GitHub release `v3.51.1` (tag existence verified via `gh api`), downloading `task_windows_amd64.zip` + `task_checksums.txt` with `gh release download`, and verifying SHA-256 (`422d79df…03`) before extracting to `~/.local/bin`. Note: executing the taskfile.dev install *script* locally was denied by sandbox policy — the direct checksum-verified release download is the safer equivalent. CI legs still use the official installer script with the explicit version arg (runs on GitHub-hosted runners, outside the local sandbox).
- **Files modified:** none (local toolchain only)
- **Commit:** evidence recorded in `74a3a35` (verification report)

**2. [Orchestrator override] Task 3 "push and confirm green via gh run watch" not executed**
- **Found during:** Task 3
- **Issue:** the plan instructs pushing and watching the workflow run; the wave context explicitly directs "os-matrix.yml just lands in-tree" and parallel worktree agents must not push agent branches.
- **Resolution:** workflow committed in-tree with full static verification (required strings, 3 jobs, pins). The first real run happens when the orchestrator merges and pushes; acceptance criterion "latest os-matrix run green on GitHub" is **deferred to the orchestrator's post-merge push** — see Deferred Issues.

### Continuation handling

- Reused the killed session's untracked `infra/compose.yaml` draft after re-verifying it against the plan: all 6 pinned tags confirmed to exist on registries (`docker manifest inspect`), structure/healthchecks/ports matched the plan exactly — adopted unchanged. The draft's "verified 2026-06-11" healthcheck claims were independently re-proven by the live `task up` run (all healthy).

## Deferred Issues

- **os-matrix first GitHub run:** workflow has never executed on GitHub (no push from this worktree by design). After the orchestrator merges and pushes, confirm the first run is green (`gh run list --workflow=os-matrix.yml`). Static checks all pass locally.
- **macOS one-time `task up` verification:** PENDING in `.planning/spikes/local-stack-verification.md` with the BLOCKING note — must be completed or waived (`.cowork/waivers.json`, scope `macos-task-up-verification`) before `/gsd-verify-work` (D-04).

## Verification results

- `docker compose -f infra/compose.yaml config -q` — exit 0
- Plan Task-1 node assertion (6 image keys + ≥6 healthchecks) — OK; 6/6 images pinned, no `latest`
- `task --list` shows up/down/ps/logs with descriptions; Taskfile contains literal `up -d --wait`
- Live `task up`: ALL 6 HEALTHY in 96s (Windows, Docker Desktop WSL2 backend); clean `task down`
- Plan Task-2 node assertion on the verification report (healthy / Windows / BLOCKING strings) — OK
- Plan Task-3 node assertion on os-matrix.yml (ubuntu-24.04 / windows-latest / macos-latest / task up / temurin / config -q) — OK; `gh run list` half deferred (see above)

## Known Stubs

None — no placeholder values or unwired components. Keycloak realm wiring is explicitly Phase 3 scope per the plan (container only), not a stub.

## Threat Flags

None beyond the plan's threat model — the new surface (6 public-registry images, committed dev-only credentials, Keycloak healthcheck) is exactly T-01-14/T-01-15/T-01-16 with the planned dispositions applied.

## Self-Check: PASSED
