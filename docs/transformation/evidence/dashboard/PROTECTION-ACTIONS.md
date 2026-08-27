# `/dashboard` — the `/protection` entry-point consolidation (Phase 5, PW-MOBILE-TRANSFORM-02)

Runs compared: `data/P5-before/` vs `data/P5-after/`, captured by
`tests/measure/dashboard-protection-actions.spec.ts` (project `measure-dash`), 6 portfolio
states × 320/390/430, all eight §11 metrics from the shared `tests/measure/metrics.ts`
definitions. The three `typical-*` states in `P5-after` were re-captured 2026-08-27 after
the renewal-row layout fix (see "The renewal-row crush", below); the other three states
render the renewals card's empty state — no rows, no checkpoint chips — verified in their
capture `fullText`, so their earlier `P5-after` captures remain valid for that change.

## The finding

The §11 duplicate-action metric gated one group on every state of this page (two on the
empty state): the same destination offered repeatedly by the page's own content, as
undifferentiated repeats rather than continuations. Composition per state, from the
before-run at 390 (identical at 320/430):

| state | gated group(s) | content offers |
|---|---|---|
| empty | `href:/protection` ×2 · `href:/wallet/add` ×2 | gaps card + «Όλοι οι κλάδοι» · renewals-card add link + portfolio add link |
| single-unanalysed | `href:/protection` ×2 | gaps card + «Όλοι οι κλάδοι» |
| typical-all-failed | `href:/protection` ×2 | gaps card + «Όλοι οι κλάδοι» |
| all-expired | `href:/protection` ×2 | gaps card + «Όλοι οι κλάδοι» |
| typical-recs-few | `href:/protection` ×4 | «Όλες» + gaps card + «+2 ακόμη» + «Όλοι οι κλάδοι» |
| typical-recs-many | `href:/protection` ×4 | «Όλες» + gaps card + «+5 ακόμη» + «Όλοι οι κλάδοι» |

On the empty state the page also asked for the same upload three times: the hero CTA
(`data-action="upload"`, a verb identity the metric counts separately) plus two
`href:/wallet/add` links — the renewals card's empty state and the portfolio card.

## Per-entry-point disposition — all NINE `/protection` references

**The original enumeration was eight. It was incomplete.** A ninth reference — the branch
map's «Όλοι οι κλάδοι» (`components/branches/BranchCoverageMap.tsx`) — was found during
the consolidation, present in the gated group of the before-run on **every** state. That
the list was wrong matters more than the count being nine: the enumeration was built from
reading the dashboard component tree, and this mount lives in `components/branches/`,
outside the directory the enumeration swept. The lesson is the run's standing one —
enumerate from the filesystem (here: every `href` the *rendered page* offers, which is
exactly what the metric does), never from the directory you happen to be in.

| # | mount | offer | before | disposition | why |
|---|---|---|---|---|---|
| 1 | `ProtectionStatusHero` | «Έλεγχος της προστασίας μου» (primary CTA, `data-action="reviewCoverage"`) | `/protection` | **KEPT, unchanged** | The page's ONE generic entry to `/protection`. Verb identity; never part of the href group. |
| 2 | `AttentionList` header | «Όλες» | `/protection`, rendered whenever the list had items | **KEPT, GATED** — renders only when `totalCount > items.length` | A view-all over a truncated list is a continuation; over a list already showing everything it is the hero CTA re-offered in different words. The two recommendation fixtures (`typical-recs-few` = untruncated, must not render; `typical-recs-many` = truncated, must render) exist to referee exactly this. |
| 3 | `AttentionList` rows | each finding row | `/protection` per row | **KEPT, unchanged** | Subject-scoped (each `li` is its own subject in the action-collector's identity rule): a row is that finding's own destination, not a page-level repeat. |
| 4 | `CoverageGapsWidget` | the whole card was a link | `<Link href="/protection">` wrapping the card | **REMOVED** — card is now a non-interactive tally `<div>` | Sits in the same section as the attention list, whose rows and «Όλες» already own navigation to the finding set; an implicit whole-card link offered the same act with less affordance, and put `role="list"` inside an anchor. The numbers are the content. |
| 5 | `ProtectionPlanCard` | «+N ακόμη στις προτάσεις σας» | `/protection` | **REDIRECTED** to `#attention` (in-page anchor; `section#attention` gained `scroll-mt-20`) | The findings the count refers to render one section up on THIS page. A cross-reference points at where they are; it does not re-offer navigation the attention section owns. |
| 6 | `ProtectionMonitorCard` | monitoring detail | `/protection?lens=risk` | **KEPT, unchanged** | Differentiated destination — the risk lens, not the bare page. |
| 7 | `LifeEventPromptCard` | «Δηλώστε μια αλλαγή» | `/protection#life-events` | **KEPT, unchanged** | Differentiated destination — the life-events anchor. |
| 8 | `PolicyholderHome` Trigger G (`UpgradeTriggerCard`) | `returnTo="/protection"` | prop, not a rendered link | **KEPT, unchanged** | A post-upgrade return destination. It never renders as an offer on this page, so it cannot duplicate one. |
| 9 | `BranchCoverageMap` | «Όλοι οι κλάδοι» — **the ninth reference** | bare `/protection` | **DIFFERENTIATED** to `/protection?lens=branch` | The map's view-all continues into the branch lens that absorbed `/branches` (V2-P2-03) — the same convention the monitor card uses. Bare, it was an undifferentiated repeat on every state. Note: this file is outside `components/dashboard/`; its sole mount is this page (flagged for the commit message). |

Sibling dedup in the same change, outside the `/protection` family: the renewals card's
empty-state «Προσθήκη ασφαλιστηρίου» link was **REMOVED** (and its `addPolicy` label prop
deleted). On an empty wallet the hero, the renewals card and the portfolio card all asked
for the same upload — three asks on a three-screen page. The empty state's one primary is
the hero CTA; the portfolio card keeps its add link (`href:/wallet/add` ×1, no group).

## Before/after matrix — all eight §11 metrics × 3 widths × 6 states

Cells show `before→after`; a single value means unchanged. **Gated duplicate actions are
0 on every state × width, with 6 sections held, and no metric regressed.** The
`nav-overlap` figure beside the gated count is reported-not-gated by design (shell nav
mirroring content is a legitimate pattern; `navPolicy: "separate"`).

| state@width | scrollHeight | sections | containers (depth) | dup-facts | **dup-actions gated** (nav-overlap) | count consistency (verdict / failures) | tap <44px | clipped / overflow-px |
|---|---|---|---|---|---|---|---|---|
| empty@320 | 3135→3103 | 6 | 46 (3) | 0 | **2→0** (2) | consistent-but-unmeasured / 0 | 0 | 0 / 0 |
| empty@390 | 2874→2842 | 6 | 47 (3) | 0 | **2→0** (2) | consistent-but-unmeasured / 0 | 0 | 0 / 0 |
| empty@430 | 2748→2716 | 6 | 48 (3) | 0 | **2→0** (2) | consistent-but-unmeasured / 0 | 0 | 0 / 0 |
| single-unanalysed@320 | 3040 | 6 | 46 (3) | 0 | **1→0** (2) | consistent-but-unmeasured / 0 | 0 | 0 / 0 |
| single-unanalysed@390 | 2779 | 6 | 47 (3) | 0 | **1→0** (2) | consistent-but-unmeasured / 0 | 0 | 0 / 0 |
| single-unanalysed@430 | 2693 | 6 | 48 (3) | 0 | **1→0** (2) | consistent-but-unmeasured / 0 | 0 | 0 / 0 |
| typical-all-failed@320 | 3835→3535 | 6 | 55 (3) | 0 | **1→0** (2) | consistent-and-fully-measured / 0 | 0 | 0 / 0 |
| typical-all-failed@390 | 3663→3177 | 6 | 56 (3) | 0 | **1→0** (2) | consistent-and-fully-measured / 0 | 0 | 0 / 0 |
| typical-all-failed@430 | 3169→3031 | 6 | 57 (3) | 0 | **1→0** (2) | consistent-and-fully-measured / 0 | 0 | 0 / 0 |
| all-expired@320 | 2948 | 6 | 45 (3) | 0 | **1→0** (2) | consistent-but-unmeasured / 0 | 0 | 0 / 0 |
| all-expired@390 | 2672 | 6 | 46 (3) | 0 | **1→0** (2) | consistent-but-unmeasured / 0 | 0 | 0 / 0 |
| all-expired@430 | 2576 | 6 | 47 (3) | 0 | **1→0** (2) | consistent-but-unmeasured / 0 | 0 | 0 / 0 |
| typical-recs-few@320 | 4265→3956 | 6 | 59 (3) | 0 | **1→0** (2) | consistent-and-fully-measured / 0 | 0 | 0 / 0 |
| typical-recs-few@390 | 4043→3547 | 6 | 60 (3) | 0 | **1→0** (2) | consistent-and-fully-measured / 0 | 0 | 0 / 0 |
| typical-recs-few@430 | 3549→3401 | 6 | 61 (3) | 0 | **1→0** (2) | consistent-and-fully-measured / 0 | 0 | 0 / 0 |
| typical-recs-many@320 | 4420→4120 | 6 | 62 (3) | 0 | **1→0** (2→3) | consistent-and-fully-measured / 0 | 0 | 0 / 0 |
| typical-recs-many@390 | 4214→3727 | 6 | 63 (3) | 0 | **1→0** (2→3) | consistent-and-fully-measured / 0 | 0 | 0 / 0 |
| typical-recs-many@430 | 3701→3562 | 6 | 64 (3) | 0 | **1→0** (2→3) | consistent-and-fully-measured / 0 | 0 | 0 / 0 |

Reading notes, so no cell is left to interpretation:

- **scrollHeight fell on every state it moved, and the expectation was that it would
  RISE.** The renewal-row fix stacks the checkpoint chip under the meta line, which costs
  a row of height per renewal row — but the crush it removed was costing far more: the
  starved ~17px title column wrapped «Υγεία: ανανέωση σε 18 ημέρες» into one syllable per
  line, ~380px of hidden scroll inside a 32px clamp and a dozen rendered lines per title.
  Releasing the column shrank the rows by more than the chip row added (e.g.
  typical-recs-few@390: 4043→3547, −496px). The empty state's −32px is the removed
  add-policy link. single-unanalysed and all-expired are unchanged to the pixel — their
  consolidation edits (href swap, Link→div) have no layout effect.
- **nav-overlap 2→3 on `typical-recs-many` is correct behaviour, not noise**: «Όλες» now
  renders only there (the truncated state), and its overlap with the shell's «Προστασία»
  nav item is the reported-not-gated classification. On `typical-recs-few` it no longer
  renders at all, which is the fix doing what it says.
- **containers depth 3** exceeds the §11 ≤2 aspiration on every state in BOTH runs —
  pre-existing, out of this item's scope, unchanged by it, and listed so it is not read
  as resolved.
- **count consistency** is `consistent-but-unmeasured` on the three sparse states in both
  runs (fewer instrumented counts render there; the three-valued verdict refuses to call
  silence a pass) and `consistent-and-fully-measured / 0 failures` on the populated ones.
- The remaining 320 `truncation` probe entry (a non-§11 diagnostic) is the meta line's
  designed `line-clamp-2` hiding its third line (scrollHeight 48 vs clientHeight 32) —
  the two-line compromise documented in the component, not the crush (which showed
  scrollHeight ≈380).

## The renewal-row crush at 320 — fixed, and what it says about the metrics

Before the fix, `RenewalsTimelineCard` put the checkpoint chip in a right-hand
`flex-shrink-0` cluster beside the arrow. The chip's non-wrapping max-content width
(«2 σημεία για έλεγχο», ~140px) came out of the title column's share first: at 320 the
column shrank to ~17px and row titles rendered one syllable per line. **All eight §11
metrics read clean on this** — nothing clipped (`clippedLabels` 0), nothing overflowed
(`pageOverflow` 0), every tap target passed — because degenerate wrap is neither clipping
nor overflow. It was caught by a human looking at the capture, and its only machine trace
was a non-§11 diagnostic probe (`css-truncation` with scrollHeight 383 against
clientHeight 32). The fix moves the chip into the content column, stacked under the meta
line, leaving an arrow-only right cluster. Verified in
`screenshots/P5-after/typical-recs-many-320.png`: titles wrap as words, the chip sits on
its own row, and the UpgradeTriggerCard teaser below wraps its CTA under its copy.

The metric blindness itself is recorded in `docs/transformation/PHASE4-ASSESSMENT.md`
under "Phase 5 precondition", with both instances found in this series. No new metric was
built for it in this item — recorded so the gap is visible to whoever owns the acceptance
criteria.

## Not captured — stated so a silent gap does not read as coverage

- **Dark theme**: every capture in both runs is light theme. The renewal chip, the
  urgency bars and the gated-offer styling all have `dark:` variants that no run here has
  measured.
- **The Pro-tier monitor variant**: the measure-dash account is free-tier; the
  `ProtectionMonitorCard` upsell state is what these runs saw. Its Pro (active
  monitoring) variant and whatever offers it carries are unmeasured.
- The `typical-*` states were re-captured after the renewal-row fix; the other three
  states carry their pre-fix captures, valid because they render no renewal rows (empty
  state of the card, verified in each capture's `fullText`).
