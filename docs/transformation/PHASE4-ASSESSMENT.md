# Phase 4 — the design system. Opening assessment.

**Measured 2026-08-26, before any component was written.** Every phase in this run has opened with
an assessment that overturned a premise; this one is no exception, and the premise it overturns is
that the design system needs *building*.

## The design system already exists. It is not adopted.

| | |
|---|---|
| CSS custom properties in `app/globals.css` | **117** |
| `.pw-*` utility classes | **24** |
| Hardcoded `#rrggbb` literals in B2C + landing `.tsx` | **754** |

Eight values account for 739 of the 754. **The top two are already tokens.**

`#29685B` — the brand accent — is defined **three times** in `globals.css`, as
`--brand-accent-primary`, `--brand-accent-cta` and `--pw-primary`, and is hardcoded **164 times**
across components. `#0F172A` is a token and is hardcoded **107 times**.

This is **D-007, adoption incomplete**, at scale and inside the design system itself: the definition
exists, the callers do not use it. Seventh instance of that shape in this programme, and the largest.

**One name per value would have helped.** A component author choosing between
`--brand-accent-primary`, `--brand-accent-cta` and `--pw-primary` for the same colour has three ways
to be right and no way to know which, and `#29685B` is unambiguous. Ambiguity in a primitive is not
a cosmetic problem — it is a reason adoption fails, and the fix is to collapse the three to one with
the other two as documented aliases, not to add a fourth.

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

1. **Make the primitive unambiguous.** Collapse the three names for `#29685B` to one, keep the
   others as documented aliases, and do the same wherever a value has more than one token name.
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
