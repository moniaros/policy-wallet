# Phase 4 — the design system. Opening assessment.

**Measured 2026-08-26, before any component was written.** Every phase in this run has opened with
an assessment that overturned a premise; this one is no exception, and the premise it overturns is
that the design system needs *building*.

## CORRECTION (same day): the first version of this section was wrong twice

Published, then re-measured. Both original claims fail, and both failed the same way — **the
measurement's universe did not match the thing being measured.** Recorded rather than quietly
edited, because the errors are more instructive than the conclusion.

| original claim | status | why it was wrong |
|---|---|---|
| "`#29685B` has three names; collapse to one" | **WRONG** | `--primary` and `--ring` sharing a value is *correct* semantic tokening. The role is the name, and roles legitimately share values. Collapsing them would have destroyed the semantics. |
| "35 `--color-*` tokens have zero references" | **WRONG** | They are declared inside `@theme { }` — Tailwind 4's CSS-first config — so they **generate utility classes**. I grepped for `var(--color-` when the consumption path is `bg-primary` / `text-foreground`. Those 1,186 utility references *are* the `--color-*` references. Acting on this would have deleted 35 live tokens. |

A third error was caught mid-measurement: counting token names across light *and* dark blocks made
`#0f172a` look like it had nine names, when being `--foreground` in light and `--card` in dark is
how theming works.

## What the design system actually is

Coherent, and largely correct Tailwind 4 practice:

| layer | tokens | how components consume it | references |
|---|---|---|---|
| `:root` semantic values (`--primary`, `--foreground`, `--border`…) | 55 | indirectly, via the layer below | — |
| `@theme { --color-* }` → generates Tailwind utilities | 35 | `bg-primary`, `text-foreground`, `border-border` | **1,186** |
| `:root { --pw-*, --brand-* }` | 27 | direct `var()` | **55** |
| hardcoded `#rrggbb` | — | nothing; bypasses all of the above | **754** |

**The system works and is adopted.** The defects are narrower than "not adopted", and there are
exactly two:

1. **754 hardcoded literals bypass it entirely** — the real problem, and unchanged by the correction.
2. **`--pw-*` / `--brand-*` are a parallel legacy path**: 27 tokens, 55 references, alongside a
   working system with 1,186. Not urgent, but it is a second way to be right, and a second way to be
   right is how the 754 got written.

## Distribution decides the work, and it is lopsided

| surface group | literals | Phase 5 rebuilds it? |
|---|---|---|
| `components/landing` | **528** (70%) | **No** — marketing, outside the seven surfaces |
| `components/wallet` | 124 | Yes |
| `app/(protected)` | 98 | Yes |
| `components/dashboard` · `gaps` · `branches` | 4 | Yes |

**226 literals sit in surfaces Phase 5 will rebuild. 528 sit where it will not.**

## The sequencing decision, recorded rather than assumed

**Phase 4 does NOT bulk-migrate the 226 literals in the Phase 5 surfaces.** Rewriting them now and
rebuilding those surfaces next is rework, and a mass mechanical colour substitution carries
visual-regression risk with no measurement to catch it — this repo has no visual-diff gate in CI.

Phase 4's job is therefore:

1. **Converge the legacy path.** Migrate the 55 `--pw-*` / `--brand-*` references onto the semantic
   utilities that already carry 1,186. Do **not** collapse semantic roles that share a value — that
   was the corrected error above.
2. **Stop the bleeding.** A guard that fails on a **new** hardcoded literal in the Phase 5 surfaces
   — enumerated from the filesystem, with the existing 226 carried as an exact debt list that can
   only shrink. That is the shape `sources-freshness` already uses for the 30 legacy citations, and
   it is the shape that works: a new literal fails, and fixing one without delisting it also fails.
3. **Fix the documentation drift.** `MASTER.md` cites `components/ui/design-tokens.ts` **twice**;
   that file was deleted in `834957c`. The design system's own document sends a reader to a file
   that does not exist. `app/globals.css` is the runtime truth and MASTER.md must say so.
4. **Migrate `components/landing` opportunistically, not as a phase gate.** 528 literals, no Phase 5
   rebuild coming, and it is the surface a first-time visitor sees. It is the best migration
   candidate precisely because nothing else is going to touch it.

## What this unblocks

Phase 4's completion is the gate on **two** things, not one: §11's Phase 5 rebuild, and
**GROWTH-HOOKS-01 Track C**, whose in-app journeys are spec-only until the design system exists.
Both are waiting on the same tag.

## Not yet established

- Whether the 117 custom properties are all *used*. A token nobody references is as much a defect as
  a literal nobody tokenised, and the inventory above counts definitions, not references.
- Whether `.pw-*` utilities and Tailwind arbitrary values (`text-[#...]`) overlap or contradict.
- Dark-mode parity: several literals appear in `dark:` variants and were counted once.
