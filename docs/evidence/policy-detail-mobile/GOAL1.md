# GOAL 1 — Fix what is broken. Change nothing else.

**Date:** 2026-08-22 · **Branch:** NEW-UI · **Baseline:** [BASELINE.md](BASELINE.md) (Goal 0, commit `7c7d222d`)
**Acceptance harness:** `tests/measure/policy-detail-goal1.spec.ts` — asserts the OUTCOME of each fix at
320/390/430, on the state that produced the defect.
**Run:** `npx playwright test --project=measure policy-detail-goal1`

Scope discipline: only items **confirmed in 0b** were touched. No restyling, no rearranging, no copy
improvements beyond correcting what was actually wrong. `lib/gap-detection.ts` is byte-identical
(`git diff` empty); no AI provider schema accepts `isDetected` or `severity` (the only occurrences in
`lib/services/ai/**` are the comments recording their deliberate removal).

## The defect fixtures — why this goal added three

The six matrix fixtures are healthy by construction, which is right for measuring layout and useless
for proving a fix to a broken state. Three `defect-*` fixtures (`tests/measure/fixtures.ts`) reproduce
the confirmed conditions exactly, in the local-dev database only:

| fixture | reproduces | how |
|---|---|---|
| `defect-english-summary` | B2 | English `coverageSummary`, **no** language tag — the state of every row written before the tag existed, and of production policy 64504715 |
| `defect-unreadable` | B10 | extractor placeholder `XXXX` as the whole plate value **and** embedded in the composed summary sentence |
| `defect-failed-run` | B5 | a `completed` run followed by a `failed` one + the `acordData.processingError` the page reads |

## What changed, per confirmed item

### B2 — wrong-language summary (trust failure #1)

Both halves of the brief's requirement, plus the dev assertion:

1. **Locale pinned in the phrasing request.** `coverageSummary` is the one COMPOSED field in the
   extraction contract — the prompt's existing rule ("keep the document's original language") does not
   apply to a sentence the model writes itself, which is why an unpinned Greek document produced English
   prose. Pinned in both places the model reads: the schema description
   (`lib/services/ai/extraction-schema.ts`) and the shared prompt's LANGUAGE block as an explicit
   EXCEPTION (`lib/services/ai/prompts.ts`).
2. **Stored summaries carry a language tag.** `enrichExtractionPayload` — the single place the
   extraction envelope is built — now records `acordData.extraction.summaryLanguage`, **detected from
   the returned text rather than assumed from the request** (what was asked for is not evidence of what
   arrived). A run that produces no summary preserves the existing tag rather than erasing it. No
   migration: the envelope is a JSON column.
3. **A mismatched summary is detected and never displayed.** New single-owner module
   `lib/wallet/summary-language.ts`: tag first, script inspection as the fallback for the untagged rows
   that are the entire book today. `SummaryCard` no longer reads `policy.coverageSummary` at all — it
   receives a resolved value, so wrong-language text has no path to the screen. The reader gets a plain
   Greek explanation and a link to the analysis.
4. **Dev assertion.** `assertSummaryLanguageInDev` logs loudly outside production (once per process).
   It deliberately does **not** throw: the resolver has already suppressed the text, and throwing would
   turn a copy defect into a blank policy page.

**Deliberate deviation, stated:** the brief says a mismatched cache should be "regenerated rather than
displayed". Regeneration is a **metered AI call that spends the customer's allowance**, so this ships the
detection and suppression and *offers* the re-run rather than silently spending money on the customer's
behalf. If automatic regeneration is wanted, it belongs behind the same quota accounting as any other
analysis run — flagged for the owner's decision.

### B4 — status, expiry and countdown from one source

`resolvePolicyLifecycle` (server, Athens-calendar) already resolved all three correctly — renewal
history → extracted envelope → `endDate` column. The client then re-derived the end date with its own
resolution order and the day count with `Math.floor((end - Date.now()) / 86_400_000)`: raw UTC
milliseconds, the exact pattern `lib/policy-status.ts` documents as the recurring defect.

The page now renders the server's values: `resolvedEndDate` is passed down and `computedDaysLeft` is
the server's `daysLeft`. One call decides status, expiry and countdown; the arithmetic that could
disagree is gone rather than corrected in place.

Asserted for all six type×state fixtures at all three widths: every status rendering agrees, every
countdown rendering reports the same number, an expired policy renders no countdown at all, and an
expiring one stays inside the 30-day window.

### B10 — unreadable ≠ redacted

New single-owner module `lib/wallet/unreadable-value.ts`. It states the fact the codebase had never
written down: **PolicyWallet redacts nothing on this surface** — so a masked-looking value is the
model's own placeholder for something it could not read, stored verbatim and rendered with the
confidence of real data.

- Whole-field placeholders (`XXXX`, `(XXXX)`, `????`, `N/A`, Greek chi variants) render as
  «Δεν διαβάστηκε από το έγγραφο» plus a link to the source document — the only place the true value
  exists. Never styled like a value.
- A placeholder embedded mid-sentence in the composed summary cannot be replaced without rewriting the
  model's sentence, so it is annotated: the note says the values are *not hidden* and offers the document.
- Deliberately narrow: it matches placeholder SHAPES only, so a genuine value containing an X
  (a Greek plate «ΧΥΖ-1234») is untouched. Verified against a 16-case table.

### B1 — the hero void

The premium card carried `bg-[#111111]` — the hero's own background — separated from it only by a
15%-alpha border, so on a phone (where it stacks between the metadata tiles and the action row) it read
as a large black void. It now uses `bg-white/5`, the same lifted surface its sibling tiles already use.
Asserted: the card's background differs from the hero's and has alpha < 1 at all three widths.

### B3 — the section nav, fixed in the shared primitive layer

Root cause was global: `:where(.grid, .flex) > * { min-width: 0 }` under `@media (max-width: 430px)` —
a safety net that lets text blocks shrink so a long Greek compound cannot push the page sideways.
Applied to a scroll strip it removes the floor that *makes* it scroll, so fourteen pills compressed into
the viewport instead of overflowing, each ~34px with its label clipped mid-word.

Per invariant 5 this is fixed as a **shared primitive**, not a per-page patch: `.pw-scroll-strip` in
`app/globals.css` (the runtime source of truth for utilities) declares that a strip's children never
shrink and never wrap — the strip overflows, which is the point of it. `PolicySectionNav` uses it; the
next strip inherits the fix instead of rediscovering the bug.

Asserted: zero clipped nav labels, no pill narrower than 60px, and the strip actually scrolls at every
width (it must — the fix is "the strip overflows", not "the labels were made to fit").

### B5 — a failed run is not a finding

The failure banner rendered inside the analysis card, in the same register as the findings, which put
«Απαιτείται ενέργεια / Επανάληψη» directly above a reassuring «Δεν εντοπίστηκαν ασφαλιστικά κενά».

- The failure state now renders **outside** the card, above it, with its own retry.
- The findings below carry «Τα παρακάτω προέρχονται από προηγούμενη ανάλυση…» whenever the latest run
  failed — the other half of the requirement, and the one that matters most on the real policy, where
  the page body is a *valid* extraction from an earlier successful run while the newest run is broken.

Asserted structurally (the failure element is not a descendant of the findings card) rather than by
appearance.

### B6 — the garbled heading

For a slug the authored catalogue does not know, a gap card's heading is the AI's first Greek sentence
truncated to 80 chars — and `firstSentence` sliced at the character index, ending headings mid-word.
It now cuts at a word boundary (falling back to the hard slice when a single word would leave too
little), and trims a trailing separator before the ellipsis.

**Register is NOT claimed by this goal.** Goal 1 corrected the informal strings this page's *own*
bundle carried (`wallet.policyDetailsPage.askStarter`, `.quoteRequestedAgent`, `.quoteRequested`, and
the export card's inline literal) — `wallet.policyDetailsPage` is now free of informal address. The
remaining mixing comes from the per-branch editorial layer (`lib/insurance/content/*.ts`, 33 of 35
files) which renders on this page *and* on the out-of-scope `/branches` pages; the goal series assigns
that sweep to **Goal 3**, and the acceptance spec says so where the assertion would otherwise sit.

### B7 — a meter with nothing to measure

Pricing v2 set `aiAnalysisPerMonth: null` on every consumer tier deliberately ("analyses are unlimited,
because metering them was what made the old model incomprehensible"). The widget predates that: it
rendered «0 / Απεριόριστες αναλύσεις» above an upgrade button whose own href reads
`reason=ai_analysis_limit` — an upsell arguing from a removed constraint. On an unlimited plan the
widget now renders nothing. The locked-report variant is untouched, and the free tier's upgrade path
(the sidebar's own upgrade card) is unaffected.

**Ledger:** capability #54 (AI usage meter) is **retired**, not relocated — it measured a limit that no
longer exists. #55 (report-unlock variant) is unchanged.

### B8 — one string, one place

`CollaborationPanel` rendered the same «Δεν έχει μοιραστεί ακόμα» twice at zero shares: header subtitle
and empty-state heading, ~150px apart. The empty state keeps it (it can also explain and offer the
invite); the header now renders the collaborator count only, which is the one thing it can say that the
panel below cannot.

### B9 — nothing to fix

Confirmed in Goal 0 as already resolved by the 2026-08-21c tel-link pass. A **regression hold** is kept
in the acceptance spec so it cannot silently come back.

## Acceptance

**`tests/measure/policy-detail-goal1.spec.ts` — 16 assertions, all green** at 320/390/430:

| test | covers | scope |
|---|---|---|
| B2 withheld + explained + re-analysis offered | B2 | 3 widths, defect fixture |
| B2 a Greek summary still renders | B2 (not a blanket suppression) | 390 |
| B4 × 6 (one per type×state) | B4 | 18 captures: one expiry date, one status, one countdown |
| B10 placeholders named as unread | B10 | 3 widths, defect fixture |
| B1 premium card ≠ hero ground, alpha < 1 | B1 | 3 widths |
| B3 no clipped label, no pill < 60px, strip scrolls | B3 | 3 widths |
| B9 every phone is a `tel:` target | B9 | 3 widths — regression hold |
| B5 failure outside the findings card + stale note | B5 | 3 widths, defect fixture |
| B7 no meter, no limit-reasoned upsell, sidebar intact | B7 | 3 widths |
| B8 the empty-state string renders at most once | B8 | 3 widths |
| B6 no heading truncated mid-word | B6 | 3 widths |

**`tests/unit/policy-detail-goal1-fixes.test.ts` — 34 probes, and they have been watched failing.**
Playwright is not in CI in this repo, so the deterministic halves of the fixes are also covered by unit
probes that DO run on every commit. Each was proven red against the pre-fix behaviour and green with
the fix, in this session:

| probe group | reverted to pre-fix | result |
|---|---|---|
| B2 (7 probes) + B10 (21 probes) | gate disabled | **14 failed** / 20 passed |
| B6 (4 probes) | character-index slice restored | **3 failed** / 31 passed |
| all | fixes in place | **34 passed** |

The B6 probe was itself corrected during that check: its first fixture (maxLen 80) happened to land on
a word boundary under the old slice, so it passed against the defect. It now runs at 60/90/100 —
budgets verified to land *inside* a word pre-fix. A probe that cannot go red is not a probe, and this
one was caught being exactly that.

**Run honesty — the 16 did not all go green in one pass.** The final full run was
**15 passed / 1 failed**, and an earlier one failed a different test. Both failures were the same
environmental flake, not a product result: the captured page was `/auth/signin` (session dropped
during a 12-minute run) or the bare app shell (RSC body still streaming). The affected tests —
B2 and B6 — were re-run immediately and passed (`4 passed (2.2m)`), as they had in the targeted runs
minutes before. This matches the known instability recorded for 2026-08-21c ("the dev Supabase project
was ~50% unavailable… the green run took four attempts at global-setup"). Every assertion in the table
above has been observed green; no assertion has been observed failing for a reason inside the product.

**Full unit suite: 4,977 tests / 456 files green** — no regressions from these changes.
**Guardrails:** `lint`, `type-check`, `lint:i18n-changed`, `lint:utf8`, `lint:encoding`,
`audit:api-auth` all pass.

### Two harness defects found and fixed during acceptance

Both would have produced false verdicts, and both are the kind the baseline document warns about:

1. **Measuring a half-rendered page.** Under `next dev` the app shell paints before the RSC body
   finishes streaming, so `networkidle + 1s` could elapse with no policy content — which reads as
   "the fix did not render". Both the acceptance spec and the BASELINE harness now wait for the page's
   own content (`#summary`) and refuse to measure otherwise, the same shape as the existing
   refuse-to-measure-a-redirect guard.
2. **Counting the RSC payload as rendered text.** The Next.js payload ships every translation string
   inside `<script>`, so an unfiltered DOM scan found «Δεν έχει μοιραστεί ακόμα» twice — once in the
   sidebar and once in serialised props — and reported a duplicate no reader can see. The scan is now
   rendered-text-only. (The measurement module's own `repeatedStrings` probe was already immune: it
   filters on computed visibility, and `<script>` is `display:none`.)

## A factual correction to the Goal 0 baseline

`BASELINE.md` claimed the E2E account is free-tier. It is not: `e2e-ph@policywallet.test` holds an
active **`ph-pro` (Family)** subscription. The correction is recorded in that document rather than
quietly edited away. Consequences:

- the baseline captures exercise the **pro** paths (direct savings-report export, collaboration panel
  visible — which is why B8's duplicate string appears in them at all);
- they do **not** exercise the free-tier paths: the locked gap report and its €3 unlock CTA, the
  PDF-preview lock, the premium-insight upsell cards, the sidebar upgrade banner. **Those states are
  unmeasured**, and must be added before Goal 5 can claim the Relocation Ledger is complete.

Every metric in the baseline table stands — the tier decides which optional blocks render, not how any
of them were measured.

## Ledger delta (Goal 1)

| # | Capability | Change |
|---|---|---|
| 54 | AI usage meter («N / Απεριόριστες αναλύσεις» + limit-reasoned upgrade CTA) | **RETIRED** — measured a limit that pricing v2 removed. Not relocated; nothing is lost, and the free-tier upgrade path (sidebar card, #50) is untouched. |
| 17 | AI plain-language summary | unchanged in place; gains a withheld/explained state when the stored language disagrees |
| 9 | Policy identity fields (policy number, plate) | unchanged in place; gain an explicit "could not be read" state with a link to the document |
| 33 | Analysis retry controls | **relocated** out of the findings card to a state block directly above it |
| 56 | Collaboration panel | unchanged; its header no longer repeats the empty-state sentence |

Everything else in the 60-row ledger is untouched by this goal and still carries its Goal 2 destination.

## Deliberately NOT done in Goal 1 (and where it goes)

- **Register sweep** beyond this page's own bundle — the per-branch editorial layer
  (`lib/insurance/content/*.ts`, 33 of 35 files) renders here *and* on out-of-scope `/branches` pages.
  **Goal 3** owns it by name.
- **Automatic regeneration** of a mismatched summary — it spends the customer's metered allowance.
  Needs an owner decision; see B2 above.
- **Everything structural**: 20 sections, ~13,500px at 320px, the three navigation systems, the score's
  verdict label on an expired policy, duplicate countdown/quote CTAs. Goals 2–4, per the brief.

**Metrics were not a goal here and did not move materially** — that is expected and stated in the
brief. The re-measurement of the full 18-capture matrix belongs to Goal 5, against this same harness.
