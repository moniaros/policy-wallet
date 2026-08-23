# GOAL 2 — Dashboard (mobile): one structure

**Date:** 2026-08-23 · **Runs:** `data/goal2/` vs `data/goal2-pre/` (pre-change, same tree as `goal1r`)

## Acceptance

| | target | before | after |
|---|---|---|---|
| sections | ≤7 | 13 | **6** |
| primary CTAs | 1 | 4 | **1** |
| surfaces rendering coverage findings | consolidate | 3 | **2**, both in `#attention` |
| plan progress denominator | stop mixing | «11 από 22» | **«3 από 5»** |
| renewals depth | promote | ~70% | **§2 of 6** |
| scroll height | must not regress | — | **all 19 improved** |
| placeholder content · count-consistency · duplicate blocks | 0 · 0 · ≤1 | | **0 · 0 · 0** |

Scroll, at 320px: `heavy` 6196→5345 (−851), `typical` 4831→3980 (−851), `all-expired` 3753→3237
(−516), `pro-tier` 6133→5835 (−298). Containers on `heavy` 80→72.

## Relocation Ledger

Nothing was deleted. Every capability is still on the page; six of them moved.

| # | Capability | Before | After | Note |
|---|---|---|---|---|
| 1 | Page header, open review, score hero, carried-plan card | 3 top-level cards | `#overview` | |
| 2 | Attention list | own card | `#attention` | |
| 3 | Coverage-gaps severity tally | own card | `#attention` | beside the list it tallies |
| 4 | **Renewals timeline** | ~70% page depth | `#attention`, §2 of 6 | **promoted** — the only items with a deadline were the hardest to reach |
| 5 | Protection plan | own card, mixed list | `#plan` | setup steps only |
| 6 | Coverage findings as plan steps | in the plan's list and denominator | removed from the plan; `#attention` renders them | not a deletion — the same rows, in one place |
| 7 | Protection monitor / monitoring upsell | own card | `#plan` | |
| 8 | Life-event prompt | own card | `#coverage` | |
| 9 | Branch coverage map | own card | `#coverage` | |
| 10 | Portfolio summary | own card | `#portfolio` | |
| 11 | Policy-cap upgrade meter | own card, after the hero | `#portfolio`, conditional | it is about policy storage; it now sits with the portfolio |
| 12 | Multi-insurer upgrade teaser | own card | `#portfolio`, conditional | |
| 13 | Recent changes | own card | `#activity` | |
| 14 | Advisor status + help | own card | `#activity` | |

**Six sections:** `#overview` · `#attention` · `#plan` · `#coverage` · `#portfolio` · `#activity`.
Each is a `section[id]` with an `aria-label`, so the page also gains six navigable landmarks it did
not have.

## The three things this goal was actually about

**One primary action.** Four controls were styled `pw-primary-button`, and **three of them were
upgrade buttons** — the policy-cap meter, the monitoring placeholder and the multi-insurer teaser.
The page's strongest visual signal was mostly used to sell, so the reader had to work out which of
four equally-loud controls was the thing to do. `UpgradeTriggerCard` is now secondary, and at most
ONE standalone offer renders: when the monitoring placeholder is showing (it substitutes for the
monitor card rather than adding one), the others stand down. Total CTAs fell 28→24 on `heavy`; the
reduction that matters is 4 primaries → 1.

**The plan stopped counting two different things.** `buildProtectionPlan` returns `setup` steps
(upload a policy, run an analysis, connect an advisor — five, finite, genuinely completable) and
`recommendation` steps (coverage findings — unbounded, and "completing" one means buying or changing
cover). They shared one list and one progress bar, so «11 από 22» told a customer they were half way
through something with no end, and the denominator moved whenever the engine found anything. The
plan is now setup-only — «3 από 5» — and the findings are where they were already being rendered, in
the attention list, with the plan carrying a «+9» link to them.

**Findings render in two shapes, not three.** The attention list and the severity tally are a list
and its count; they now sit in the same section. The plan's copy of them is gone.

## The measurement changed three times during this goal, and I should say why

`gapSurfaces` is new, and its first three versions were wrong in ways that flattered or maligned the
change:

1. It counted ancestors, so wrapping the page in `section[id]` blocks made 4 surfaces read as 5 when
   nothing had been added. Now counts the innermost match only.
2. It matched «κενά κάλυψης» anywhere, so the plan's *signpost* step («Ελέγξτε τα κενά κάλυψης»,
   which links to the gaps page and restates no finding) counted as a third copy of the list. Now
   requires the severity ladder or the attention framing — the vocabulary that only appears where
   findings are actually rendered.
3. It used `textContent`, which includes the contents of a CLOSED `<details>` — so the hero counted
   as a gap surface on the strength of a delta the reader cannot see until they open the score
   disclosure. Now `innerText`.

Because of (1)–(3), the "before" figure of 3 is taken from the captured TEXT of `goal2-pre`, not
from that run's stored metric value, which used an earlier definition. The two are not the same
measurement and I have not presented them as one.

**And the plan fix is not visible in the dashboard fixture matrix at all.** `heavy` renders «2 από 5»
both before and after, because that fixture generates no recommendation steps. R6 reproduces only on
the Pro account, and that is where it was verified: «11 από 22» → «3 από 5». A fixture matrix that
cannot produce a defect cannot confirm its fix, and reporting the matrix alone would have shown a
green board for a change it never exercised.
