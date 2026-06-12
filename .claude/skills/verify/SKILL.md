---
name: verify
description: Run the full local gate suite and explain failures — use when asked to verify, run the gates, check the build before a PR, or self-check after a batch of edits.
---

# verify — thin wrapper over `task verify`

There is exactly ONE gate path. CI, developers, and this skill all run the
same Taskfile task — this skill never maintains its own gate list, so it can
never drift from what CI enforces.

## Step 1 — Run

```
task verify
```

For the static-only inner loop, `task verify:fast` is the D-19 subset
(identical to `verify` in Phase 1; container-class gates split off from
Phase 2 onward). Pre-PR, always run the full `task verify`.

## Step 2 — Read the timing output

The runner prints one line per gate plus a total (Q-004 contract):

```
GATE <name> <millis>ms <PASS|FAIL>
TOTAL <millis>ms <PASS|FAIL>
```

All gates run even when one fails (no short-circuit); the exit code is
non-zero if any gate failed or the fast budget (TOTAL < 60s) was exceeded.

## Step 3 — Summarize failures BY VIOLATED RULE

After the timing block the runner prints one block per failed gate carrying
the gate's own rule-named message and fix hint. Your summary to the human
must be grouped by violated rule, not by file or by gate exit code:

- For each failure: name the rule (e.g. `GATE-12/tree-budget`,
  `settings-lint/t4-lockstep`, `meta-link-lint/meta-reference`), the file or
  value that violated it, and the fix the gate suggested.
- Then state the single next action (fix code, re-run `task verify`).

## Hard rules

- **Fix the CODE, never the gate.** Do not skip tests, add lint-disables,
  raise a line budget, remove a deny rule, or edit a check script to get
  green. Gate changes are T3 (AI-COWORK §3.3) — they need an approved plan
  and human sign-off.
- If a gate blocks legitimate work, that is a constitution bug: report it
  and propose a T3 change; never bypass locally.
- Report failures faithfully — paste the failing `GATE` lines verbatim;
  never silence or paraphrase away a red result.
