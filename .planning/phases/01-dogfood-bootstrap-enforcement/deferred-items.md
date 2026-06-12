# Deferred Items — Phase 01

Out-of-scope discoveries logged during execution. Do NOT fix inline; pick up via a future plan or /gsd-quick.

## From 01-06 (init script)

- **GitHub Actions Node 20 deprecation warnings** (2026-06-12): `actions/checkout@v4`, `actions/setup-node@v4`, `actions/upload-artifact@v4`, `actions/download-artifact@v4` run on Node 20, which GitHub forces to Node 24 from 2026-06-16 and removes 2026-09-16. All `init-parity.yml` jobs are green today. Action: bump the four actions to their Node-24-ready majors in one sweep across ALL workflows once 01-09 (plan-compliance CI) lands, so versions stay consistent repo-wide. [Unverified] which exact major versions are Node-24-ready — check each action's releases at bump time.
