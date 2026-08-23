# RESULT — Dashboard «Η προστασία μου» (mobile), Goals 0–5

**Date:** 2026-08-23 · **Branch:** NEW-UI · **Locale:** `el` · **Surface:** `/dashboard`
**Evidence:** `data/goal0-prechange/` (the reference) vs `data/goal5/` — 19 captures each,
5 portfolio states × 3 widths + 3 analysis states + Pro.

## Acceptance, measured

| | target | Goal 0 | now |
|---|---|---|---|
| sections | ≤7 | 9–13 | **6 in every state** |
| primary CTAs | 1 | 4 | **1** |
| sub-44 tap targets | 0 | 5–6 per capture | **0** |
| 1.4.11 interactive controls | 0 | 20 on `heavy` alone | **0 across all 19** |
| clipped labels | 0 | 1 | **0** |
| placeholder / fixture-shaped content | 0 | 6–11 | **0** |
| count-consistency failures | 0 | 1–3 per capture | **0** |
| duplicate blocks | each ≤1 | 2 | **0** |
| scroll height | must not regress | — | **all 19 shorter, −13.6% overall** |

Every capture is shorter than its Goal 0 reference: `typical@320` −1021px, `heavy-all-failed@320`
−919px, `heavy@320` −892px. Sections fell from 13 to 6 on every portfolio state that has content.

## What each goal actually changed

**Goal 0 — baseline.** 19 fixture captures, degraded conditions built in. Adjudicated 11 candidates.

**Goal 1-R — the corrective pass.** Six reported regressions adjudicated *before* any code changed:
two pre-existing, one refuted entirely (all four "broken Greek" strings were correct — screenshot
misreads), one data drift, one fixture text, one genuinely introduced. Ten open items closed. The
finding that mattered was not on the list: `resolveGapContent` titled unauthored slugs with the
model's own prose, and `recommendation-generator` **persisted that prose into the database** for the
attention list to render as a heading. 18 of 29 authored catalogue rules had no content entry; five
lines of business had none at all.

**Goal 2 — one structure.** 13 top-level cards became six `section[id]` landmarks. Three of the four
primary CTAs were upgrade buttons. The protection plan was counting five finite setup steps and an
unbounded stream of coverage findings under one progress bar — «11 από 22» — and is now «3 από 5»
with the findings where they were already rendered.

**Goal 3 — trust framing.** `CoverageGapsWidget` and `AttentionList` migrated off their hand-rolled
severity→colour maps to `describeSeverity()`; the severity debt list shrank 11 → 9, and tone becomes
a colour in exactly one place, keyed by tone rather than by the severity words. Two controls that
conveyed their meaning only to sighted readers now have accessible names: the score ring announced
as a bare «74» with no scale or units, and the severity chips as four unrelated «4 υψηλά» with no
subject.

**Goal 4 — density, targets, Greek at 320px.** Interactive-control boundaries were 1.14–1.70:1
against a 3:1 requirement — every renewal row, attention row, branch tile and half the cards. An
interactive `.pw-card` now takes `--pw-border-control`, scoped **by element** so a card cannot become
clickable and silently keep a decorative edge. All tap targets reach 44px. «Αναλύσεις AI» — my own
Goal 1-R translation — overflowed its 56px slot at 60px and is now «Αναλύσεις».

## What is deliberately not zero

`1.4.11` still reports 79 `surface`, 59 `unmeasured`, 19 `shell` and 16 `subpixel` readings. None is
an interactive control failing the criterion:

- **surface** — non-interactive card edges. SC 1.4.11 governs user-interface components and
  graphical objects, not decorative grouping. Darkening every edge in the product to satisfy a
  control criterion would make the product heavier to fix nothing.
- **shell** — app-shell chrome, a separate workstream, reported but never gated.
- **unmeasured** — the sampler's inside and outside bands came back the same colour, meaning it
  never crossed an edge. A reading the instrument failed to take, now labelled as such instead of
  counted as a defect.
- **subpixel** — a 1px border whose top edge lands on a fractional device row is painted across two
  rows at roughly half alpha, so no sampled row reaches the declared contrast: 3.35:1 declared,
  ~2.01:1 measured, on whichever widths put that element on a half pixel. The stylesheet is correct
  and the pixels are correct; only the reading is short. Fourteen of the sixteen are the branch
  tiles. I chose not to thicken borders product-wide to chase a rendering artifact.

The instrument was changed to make those four distinctions, and that is a change to the measurement
mid-series — stated here rather than left for someone to find in a diff.

## Instrument defects found and fixed

Eight, across the series. Every one made results look **better** than they were; none made them look
worse. That is not coincidence — scroll height, section count, container count and leak count are all
"less is better", so every failure mode registers as success.

| | defect | would have reported |
|---|---|---|
| 1 | Sanity check asserted only `rendered.length > 400` | a stale wallet rendered under every state; `empty` measured 13 sections |
| 2 | Specs wrote to a fixed `baseline/` directory | a re-run destroyed its own reference — twice, the second time the *other* series' |
| 3 | Two captures were non-renders | `pro-tier` 6234 → 864px, an "86% improvement" |
| 4 | Playwright retries raced their predecessor's writes | FK and unique violations that read as data bugs |
| 5 | `countConsistency` grouped by noun | a plan limit and the score itself counted as contradictions |
| 6 | `gapSurfaces` counted ancestors | wrapping the page in sections made 4 read as 5 |
| 7 | `gapSurfaces` used `textContent` | a closed `<details>` counted as a rendered surface |
| 8 | 1.4.11 could not tell "no boundary" from "no reading" | 20 phantom control failures |

Every measurement spec is now run-labelled, the harness refuses to record a capture under 1500px or
3 sections, and the contrast probe verifies the screenshot matches the document before reporting.

## Guards added, each enumerating and each with a probe proven red

`score-containment` · `all-clear-honesty` · `dashboard-accessible-names` · placeholder content
(folded into the existing token probe rather than duplicated) · count-consistency (`data-count`
instrumented) · severity debt ceiling lowered 11 → 9.

`CLAUDE.md` and `AGENTS.md` gained one invariant, on its third surface: **absence of a detected
problem is not evidence of no problem, and must never render as reassurance.**

## Still open

- The database enforces a unique index on `(policy_id, gap_definition_id)` that the Prisma model
  does not declare, so `upsert` cannot address it. Needs a migration.
- The dashboard fixture matrix cannot produce recommendation steps, so it could not confirm the
  plan-mixing fix; that was verified on the Pro account instead. A fixture that cannot produce a
  defect cannot confirm its fix.
- Score arithmetic remains out of scope by decision, not by omission.
