# GOAL 1-R — Dashboard (mobile), corrective pass

**Date:** 2026-08-23 · **Branch:** NEW-UI · **Runs:** `data/goal1r/` vs `data/goal0-prechange/`
**Preceded by:** `BASELINE.md` §1-R.0, which adjudicated the six reported regressions before any
code changed.

---

## 1-R.1 — the six reported regressions

| | verdict from §1-R.0 | what shipped |
|---|---|---|
| **R1** score in the changes feed | **PRE-EXISTING**, not caused by `f23ee784` | Removed **at source**. `lib/services/timeline/build.ts` composed «Το σκορ προστασίας έπεσε στο ${overallScore}»; a timeline states what HAPPENED, and a computed metric is not an event. The entries now read «Η αξιολόγηση υποχώρησε». |
| **R2** orphaned derivative | **CONFIRMED — introduced by `f23ee784`** | `keyReason` («Υγεία: πτώση 20 μονάδων») moved inside the same `<details>` as the score it derives from. The feed's numeric delta badge is gone: a delta with no base in the container is a number the reader cannot check, and it disagreed with the hero's. |
| **R3** placeholder in the attention slot | **fixture text — masking a real defect** | see below |
| **R4** count contradiction | **CONFIRMED — labelling** | «λήγουν σύντομα» was a 30-day window, the monitoring card's a 45-day one, neither said so. Both now state their window. `resolvePolicyLifecycle` untouched. |
| **R5** four broken Greek strings | **REFUTED — all four correct** | «Έκλεισε **ένας κίνδυνος**», «**Μπορούμε** να εξηγήσουμε», «άρχισε να **απαντά**», «**Το** σκορ». Screenshot misreads. |
| **R6** denominator 16 → 22 | **DATA DRIFT** | «11 από 22» is present in the pre-change capture. Mixing fix stays in Goal 2 as specified. |

### R5's one real defect was not a defect either
`74-9` is two sibling `<span>`s separated by `ml-1`. `innerText` concatenates without whitespace, so
the gap is real on screen and absent from the text extraction — the same class of measurement
artifact as the four misreads, this time in my own harness. Recorded rather than "fixed".

### R3 — the mechanism, and it was worse than reported
The attention list renders `recommendation_instances`, and `recommendation-generator.ts:351-369`
builds each title from `resolveGapContent(...)` then **writes it into the database**. With a slug
absent from `GAP_CONTENT_MAP`, that title was `firstSentence(aiExplanationEl, 80)` — the model's
prose, persisted, and rendered back as OUR heading.

Two fixes:

1. **`resolveGapContent` no longer titles an unknown slug with model prose.** It uses the authored
   generic heading; the prose still shows as the body. The trade the old code made — prose so that
   N unknown gaps would not read alike — was the wrong way round, and it reached past the card into
   a stored column. `tests/unit/gap-report.test.ts` carries the reversed assertion.
2. **All 18 unmapped authored catalogue rules are now authored** (29/29 resolve). Five lines of
   business had none at all: motorbike, travel, life, group_health, four fifths of home — including
   `insured_value_above_declared` / `insured_value_below_rebuild_cost`, the pair CLAUDE.md calls the
   reference implementation. `missing` / `all_missing` rules are worded «δεν καταγράφεται», never
   «δεν καλύπτεται».

Production carried 3 prose-shaped titles (one quoting a customer's vehicle model, cut at exactly 80
characters) and 18 whose `el` was identical to `en` with no Greek letter in them. All 32 are
`dismissed`, so nothing defective was rendering; the generator refreshes titles on re-sync, so they
self-heal rather than staying frozen — a correction to what §1-R.0 stated.

## 1-R.2 — the ten open items

| | what shipped |
|---|---|
| **D1-b** | The lapse watch filtered `days >= 0`, silently excluding policies that had ALREADY ended, so an entirely-expired wallet read «Κάλυψη που λήγει: **Εντάξει**». Expired policies now count, and the verdict cannot be `clear` while any exist. |
| **D2** | No overlap reproduced in any of the 19 fixture captures; the user menu is `absolute` within its own container. Not confirmed — see "not reproduced" below. |
| **D3** | Three monitoring labels reworded. «Ανοιχτές σοβαρές εκθέσεις» reads as "open serious *reports*" — «εκθέσεις» is not the Greek for exposures — now «Σοβαροί κίνδυνοι χωρίς κάλυψη». Also «Πόσο πρόσφατο είναι» → «Πότε έγινε ο τελευταίος έλεγχος», «Προστασία που υποχωρεί» → «Κάλυψη που μειώνεται». **«Πείτε μας να θα την επανεκτιμήσουμε» does not exist** — the page says «Πείτε μας **και** θα την επανεκτιμήσουμε», which is correct. |
| **D4** | The premium chips rendered an icon and a euro amount and nothing naming what the amount was for. They now carry the branch label; the icon is `aria-hidden`. |
| **D5** | No code path invents fixture-shaped identifiers — they were fixture DATA rendering correctly. Fixtures now use realistic policy numbers and an advisor name. |
| **D7** | `BranchCoverageMap` was a hand-rolled `flex overflow-x-auto` with `min-w-[128px]` tiles — not enough for «Σύνταξη & Αποταμίευση» (146px), so the label naming the branch was clipped. Now `.pw-scroll-strip`, the repo's primitive for a row meant to run off the edge. Second sighting of policy-detail **B3**. |
| **D8** | «AI Insights» → «Αναλύσεις AI», «Άνοιγμα Help Center» → «Άνοιγμα κέντρου βοήθειας». Fixed once, in the shell. |
| **D9** | «περιοχές» are risk CATEGORIES, the gaps widget counts findings by severity. Both correct — now «κατηγορίες κινδύνου». |
| **D10** | The timeline's count is a subset. Now «ασφαλιστήρια με επερχόμενη ανανέωση». |
| **D11** | The row carried branch + countdown + insurer, which two motor policies can share. It now carries the policy number, through `displayPolicyNumber` so a sentinel never reaches it. |

## Guards — each enumerates, each ships a probe proven red

| guard | universe | probe |
|---|---|---|
| `score-containment.test.ts` | every `.tsx`/`.ts` under `components/` + `app/`, minus admin/agent, walked from disk | reverting either fix turns 2 of 4 red |
| `all-clear-honesty.test.ts` | behavioural, over `monitorRisk` | restoring `days >= 0` turns 1 of 6 red |
| placeholder content | folded into the existing `internalTokenLeaks`, not a second probe | fixture markers detected |
| count-consistency | corrected — see below | |

**New invariant in `CLAUDE.md` + `AGENTS.md`:** *absence of a detected problem is not evidence of no
problem, and must never render as reassurance.* Third surface: the score over a never-analysed
wallet, the lapse watch over an expired one, and `resolveGapContent` over an unauthored slug.

## Two things that went wrong in this pass

**A prefix rename silently corrupted a whole measurement run.** Renaming the fixture policy numbers
orphaned 12 rows the cleanup filter no longer matched, so every portfolio state rendered a stale
`heavy` wallet underneath itself — `empty` measured 13 sections and 80 containers instead of 9 and
45. The spec's state-sanity check passed it, because `rendered.length > 400` cannot tell a correct
wallet from a correct wallet plus somebody else's. Replaced with a policy-link **count**
assertion, which is what the check should always have been.

**A metric I wrote in Goal 0 was producing false positives.** `countConsistency` grouped by the
longest noun in the label, so two renewal rows with different countdowns («σε 14 ημέρες», «σε 164
ημέρες») read as a disagreement, and the score `74` was grouped under «ασφαλιστήρια» because it sat
in the same sentence. Per-row elements are now excluded. "Count-consistency = 0" was not reachable
as originally defined.

**And I repeated the very defect I had just documented.** Running
`--project=measure` with no file filter executed `policy-detail-baseline.spec.ts` as a side effect,
which overwrote the OTHER series' Goal 0 baseline — replacing a pre-restructure reference (13428px,
20 sections) with post-restructure numbers (4930px, 10 sections). Restored from git. Every
reference-writing spec is now run-labelled (`MEASURE_RUN`, defaulting to `current`), so this is now
structurally impossible rather than a thing to remember.

**Two of nineteen captures were non-renders that every metric scored as wins.** `empty@390` at 988px
and `pro-tier` at 864px were shell-only pages; `pro-tier` had measured 6139px correctly in the run
itself before a retry — triggered by the fixture race below — overwrote it. Reported uncritically,
`pro-tier` would have read as 6234 → 864px, an 86% improvement and the best number in the table.
Scroll height, section count, container count and leak count all treat "less" as "better", so a page
that failed to render is indistinguishable from one made dramatically leaner. The harness now
refuses to record a capture under 1500px or 3 sections; the smallest genuine capture in the matrix
(empty portfolio at 430px) is ~2900px.

**A fixture race, and the schema drift it exposed.** Two Playwright workers provisioning one account
both passed a `find-then-create` check and the second hit a unique violation. Now tolerant of P2002.
The index on `(policy_id, gap_definition_id)` is enforced by the DATABASE but **not declared on the
Prisma model** — there is no `@@unique([policyId, gapDefinitionId])` — so `upsert` cannot address it
and the constraint only surfaces at runtime. Not fixed here: adding it needs a migration, and this
goal changes no schema.

All three harness defects, and both of the earlier ones, made results look BETTER than they were.
None made them look worse.


---

# Acceptance — measured, `data/goal1r/` vs `data/goal0-prechange/`

| | required | measured |
|---|---|---|
| placeholder / draft / test / fixture-shaped content | 0 | **0** |
| count-consistency failures | 0 | **0** (`data-count` instrumented) |
| duplicate-block count | each ≤1 | **0** |
| section count | must not regress | **identical on all 19** |
| container count | must not regress | identical or −1 |
| scroll height | must not regress | **all 19 improved** |

| capture | scroll pre → now | Δ | sections |
|---|---|---|---|
| all-expired-320 | 4022 → 3753 | **-269** | 11/11 |
| all-expired-390 | 3602 → 3330 | **-272** | 11/11 |
| all-expired-430 | 3466 → 3181 | **-285** | 11/11 |
| empty-320 | 3311 → 3221 | **-90** | 9/9 |
| empty-390 | 3032 → 2941 | **-91** | 9/9 |
| empty-430 | 2889 → 2815 | **-74** | 9/9 |
| heavy-320 | 6263 → 6196 | **-67** | 13/13 |
| heavy-390 | 5133 → 5032 | **-101** | 13/13 |
| heavy-430 | 4574 → 4479 | **-95** | 13/13 |
| heavy-all-failed-320 | 6285 → 6191 | **-94** | 13/13 |
| heavy-analysis-in-progress-320 | 6263 → 6196 | **-67** | 13/13 |
| heavy-never-analysed-320 | 6301 → 6267 | **-34** | 13/13 |
| pro-tier-320 | 6234 → 6133 | **-101** | 9/9 |
| single-320 | 3524 → 3294 | **-230** | 9/9 |
| single-390 | 3233 → 2999 | **-234** | 9/9 |
| single-430 | 3113 → 2896 | **-217** | 9/9 |
| typical-320 | 5027 → 4831 | **-196** | 13/13 |
| typical-390 | 4720 → 4528 | **-192** | 13/13 |
| typical-430 | 4129 → 3942 | **-187** | 13/13 |

**Captures worse than pre-change: 0 of 19.**

The scroll figures moved twice in this pass and the second move is the interesting one. After the
D7/D11 restructure they were UP by 20–171px, and I was ready to report that as the honest price of
showing an insurer name and a policy number instead of clipping them. Removing the two duplicate
blocks — the AI disclaimer rendered by both `ProtectionStatusHero` and `AttentionList`, and a
severity caveat authored under two keys (`severityNote`, `recPriorityNote`) with identical text and
rendered in adjacent cards — took 34–285px off every capture and turned the regression into an
improvement everywhere. The identity fix was never the problem; the boilerplate above it was.
