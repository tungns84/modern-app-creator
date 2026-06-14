# Design Workflow — Stitch + DESIGN.md + Tokens

**Status:** Draft 1.1 — 2026-06-10 (1.1: Claude Code-first — Stitch MCP wired via project `.mcp.json`; `design-implement` is a Claude Code skill, playbook fallback removed to v2)
**Audience:** designers/PMs, developers, and AI agents. Ships inside generated scaffolds when the design workflow option is enabled.
**Language:** English (agent-consumable).

---

## 1. Principle

One source of truth for visual decisions: `frontend/docs/DESIGN.md` (human-readable spec) + `frontend/docs/tokens.json` (machine-readable W3C design tokens). Everything else — Tailwind config, components, Stitch generations, agent implementations — derives from these two files. Raw color/spacing literals are a build error, not a style nit.

```
        DESIGN.md  ◄──── humans decide here
            │
        tokens.json ◄─── machine mirror of DESIGN.md decisions
            │ sync-tokens script
            ▼
      tailwind config ──► shadcn/ui components ──► features
            ▲
       Stitch lint (CI): no raw hex/px in JSX/CSS; tokens↔Tailwind drift check
```

## 2. Roles

| Actor | Does | Never does |
|-------|------|-----------|
| Designer / PM | Prompts Stitch for screens; curates DESIGN.md | Commits component code |
| Stitch (Google) | Generates screens (reads DESIGN.md as project context); exports HTML+Tailwind, Figma, screenshots | Acts as source of truth — its output is a *proposal* |
| AI agent | Implements screens as React + shadcn/ui + tokens, from Stitch output via MCP | Copies Stitch HTML verbatim; invents token values |
| Stitch lint (CI) | Blocks raw values and token drift | — |

## 3. The Loop

1. **Designer:** prompt Stitch with the screen intent. Stitch project has DESIGN.md loaded so generations stay on-system.
2. **Hand-off:** screen reaches the developer's agent through Stitch MCP (`get_screen_code`, `get_screen_image`) — no manual export needed. Fallback: HTML export + screenshot attached to the spec.
3. **Agent (`design-implement` skill):**
   - fetch screen code + image
   - map visual decisions to existing tokens; if a value has no token → STOP, propose token addition (DESIGN.md + tokens.json change = reviewed PR, T2)
   - implement with shadcn/ui primitives + Tailwind token classes; Stitch HTML is a translation base, NOT production code (it has no state, routing, data, a11y guarantees)
   - i18n: all strings as keys in every locale; a11y: axe clean, keyboard path works
4. **Verify:** Stitch lint + axe + key-diff gates; H3 diff review includes screenshot comparison against the Stitch image.

## 4. Stitch Specifics (as of 2026-06)

- Official MCP server; clients include Claude Code, Cursor, Codex, Gemini CLI. Configured in the scaffold's MCP config when this workflow is enabled.
- DESIGN.md format is Google's open-source spec (`github.com/google-labs-code/stitch-skills`); a shadcn/ui integration skill exists in that repo — the scaffold's `design-implement` skill builds on the same flow.
- Exports verified: Figma (editable), semantic HTML + Tailwind, screenshots. **[Unverified]** native `tokens.json` export — conflicting sources; until verified hands-on, tokens.json is maintained in-repo and Stitch consumes DESIGN.md only. → Spike task at design-workflow phase start.
- Free tier limits generation volume (~350/month as reported 2026-03); plan for shared team account or paid tier.

## 5. Without Stitch

The workflow degrades gracefully — Stitch is a client, not a dependency:
- DESIGN.md + tokens.json + Stitch lint + shadcn/ui pipeline functions identically with hand-written specs, Figma screenshots, or v0.dev output as the visual proposal.
- The `design-implement` skill accepts any image+markup input; only the MCP fetch step is Stitch-specific.

## 6. Scaffold Obligations (design workflow ON)

- [ ] `frontend/docs/DESIGN.md` seeded (starter design system: palette, type scale, spacing, component inventory)
- [ ] `frontend/docs/tokens.json` matching DESIGN.md; `sync-tokens` script wired to Tailwind config
- [ ] Stitch lint in CI (ESLint rule + stylelint + drift check) — error level
- [ ] Stitch MCP entry in generated agent configs
- [ ] `design-implement` skill/playbook emitted per runtime
- [ ] PR template UI section: screenshot vs design, keyboard + SR manual check

---
*Draft 1.0 — 2026-06-10. Sources: Stitch research pass 2026-06-10 (MCP, DESIGN.md open-source spec, stitch-skills/shadcn integration, export capabilities + [Unverified] tokens export); existing reference docs (Stitch lint pipeline) in docs/README.md, docs/ARCHITECTURE.md §8.9.*
