#!/usr/bin/env pwsh
# Thin PowerShell 7 entry point (D-23) — the single implementation lives in init-core.mjs.
node "$PSScriptRoot/init-core.mjs" @args
exit $LASTEXITCODE
