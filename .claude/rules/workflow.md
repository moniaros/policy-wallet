# Workflow

## Phase-gate discipline

Work proceeds one phase/gate at a time:

1. Build exactly one phase.
2. Run **Code review** on the diff.
3. Run the CI guardrails locally (below).
4. **Conventional commit** at the gate.
5. **STOP and wait** for the explicit "approved, continue" before the next phase.

One branch per phase where practical; conventional commits throughout. Never advance past
a gate, apply a migration to a shared DB, force-push, or open outward-facing changes without
explicit approval.

## Conventional commits

`type(scope): summary` — `feat`, `fix`, `test`, `docs`, `refactor`, `chore`. Scope is the
area (e.g. `feat(ingestion):`, `test(ingestion):`, `docs(status):`). Body explains the
what/why; note guardrail status. End commit messages with:

```
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```

## CI guardrails before committing (blocking, in order)

`audit:api-auth` → `lint` → `lint:i18n-changed` → `lint:utf8` → `type-check` → unit tests
→ build. Run `verify:migrations` on any schema change. Update
`scripts/api-route-policy-inventory.json` when adding/changing an API route.

## Session habit

- Start: read `docs/STATUS.md` (+ any relevant `docs/audits/*.md`) and say where we are.
- End of meaningful work: update `docs/STATUS.md` (Current phase, Done, In progress,
  Blocked, Top risks ranked, Next 3 actions) — one screen.
- Separate "broken / insecure (gates launch)" findings from "UI/UX I dislike" — different backlogs.

## Prompt structure expectation (vibe-coder format)

Larger tasks arrive as a structured prompt; honor each section:
- **ROLE** — repo + the concrete goal.
- **PLUGINS/CONNECTORS** — which to use (Prisma, Supabase, Sentry, GitHub/Commit, Code
  review, Postman, Desktop commander).
- **STANDING RULES** — e.g. no `any`, reuse-before-creating, phase-gate discipline.
- **FORBIDDEN PATTERNS** — treat as hard rules (see cost-guardrails).
- **ARCHITECTURE / GATES** — build in the given order, one gate at a time.
- **KEY CONTRACTS** — refine, don't reinvent.

Start with the first gate, then STOP.
