# ADR 0001: Valkey 8 instead of Redis for the cache/key-value service

## Status

Proposed

Ratification: developer review at Phase 1 verification flips Status to Accepted.

## Context

The preset constraint requires all components to be Apache-2.0/MIT-compatible.
The locked stack includes a Redis-protocol cache/key-value service (permission
cache, future jti blacklist). Licensing facts, verified against the upstream
projects on 2026-06-11:

- **Redis 7.4** is licensed RSALv2/SSPLv1 — neither is OSI-approved. This is
  the worst available option under the compatibility constraint.
- **Redis ≥ 8.0** is tri-licensed: RSALv2 / SSPLv1 / **AGPLv3**. AGPLv3 is
  OSI-approved, but under a strict reading of "Apache-2.0/MIT-compatible
  components" an AGPL-licensed default in the shipped infra stack is at best
  ambiguous for downstream teams generating projects from this preset.
- **Valkey 8** (Linux Foundation fork of Redis 7.2) is licensed **BSD-3-Clause**
  — unambiguously compatible with the Apache-2.0/MIT constraint.

Valkey speaks the unmodified Redis wire protocol (RESP). The Lettuce client used
by Spring Data Redis connects to Valkey without any code or configuration
change; switching is an image swap only. Running an unmodified Redis container
as a network service would not contaminate the Apache-2.0 codebase, but the
preset ships infra *defaults* that downstream teams inherit — defaults should be
license-clean without requiring legal interpretation.

## Decision

Use **`valkey/valkey:8`** (BSD-3-Clause) as the cache/key-value image in the
local Docker Compose stack and all derived environments. The Lettuce client and
all Spring configuration remain exactly as they would be for Redis — the change
is confined to the container image reference.

## Consequences

- `infra` Compose definitions and future K8s overlays reference
  `valkey/valkey:8` (minor version pinned at adoption), not a Redis image.
- Phase 2 caching (per-user/role permission cache) and the Phase 5 jti blacklist
  consume this decision unchanged — they target the Redis protocol via Lettuce
  and are image-agnostic.
- Any future feature that depends on a Redis-module-specific capability
  (RedisJSON, RediSearch, Redis Streams extensions beyond core, etc.) must be
  checked against Valkey support **before** adoption; absence in Valkey blocks
  the feature or forces a new ADR.
- Healthchecks use `valkey-cli ping` instead of `redis-cli ping`.

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| Redis 8 (tri-license incl. AGPLv3) | License ambiguity under a strict reading of the Apache-2.0/MIT-compatible constraint for shipped infra defaults; downstream generated projects inherit the ambiguity. |
| Redis 7.4 (RSALv2/SSPLv1) | Not OSI-approved at all — the worst option under the license constraint. |
| Drop the cache service for Phase 1 | The component is locked in the stack (permission cache, jti blacklist consumers are already planned); removing it defers, not resolves, the license decision. |
