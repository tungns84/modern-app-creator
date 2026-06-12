#!/bin/sh
# Thin POSIX entry point (D-23) — the single implementation lives in init-core.mjs.
exec node "$(dirname "$0")/init-core.mjs" "$@"
