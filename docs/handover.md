# Grafí — handover

*2026-08-30. What was built, how to keep building it, and the G12 hostile
review recorded per reader. The ledger (`DS_PROGRESS.md`) is the per-goal
state; `design-system.md` is the written system; this file is the seams.*

## The one-command loops

```bash
npm run tokens        # tokens/*.json → app/grafi.css + contrast-matrix.md (FAILS on a floor miss)
node scripts/brand-assets.mjs   # one SVG → all favicons/app icons/OG rasters
npx vitest --run tests/unit     # the gate — 516 files; run before every commit
```

## Where things live

| Thing | Path | Note |
|---|---|---|
| Tokens (source of truth) | `tokens/{primitives,semantic}.json` | semantic references primitive NAMES only; generator rejects hex |
| Generated CSS | `app/grafi.css` | never hand-edit; byte-drift guarded |
| Components | `src/design-system/` | primitives, layout, product, reading-demo, broker-scan, plan-recommender |
| Landing sections | `components/landing/grafi/` | GrafiHero, CoverageTicker, AnswerBlock, MarketNumbers, ComparisonBand, BrokerBand |
| Marketing content | `lib/marketing/` | positioning (PROMISE/NEUTRALITY_STATEMENT/…), defined-terms (JOINS the glossary — guarded), market-numbers (sourced claims ONLY), reading-demo, broker-band |
| Living docs | `/styleguide` | dev-only; also the utility consumer |
| Choreography CSS | `app/globals.css` tail | `g-ticker-*`, `g-scan`, `g-row-rise` |

## Sharp edges the next builder must know

1. **`cn()` must be taught new utility families.** tailwind-merge silently
   DELETES unregistered custom classes that collide into one inferred group —
   it has now bitten twice (legacy ladder; then `text-fg-on-brand` shipped a
   2.74:1 hero CTA). New `text-*`/`bg-*` namespaces ⇒ extend the groups in
   `lib/utils.ts` first.
2. **`@theme inline` emits on USE.** A token with no consumer produces no
   utility; `/styleguide` exists partly to guarantee emission.
3. **One Inter.** The layout's variable instance (preloaded, all weights) is
   the only font import. Do not add `Inter()` calls in components — that is
   how the H1 ended up painting from an un-preloaded file.
4. **The freeze, the debt, the joins.** Greek copy changes re-run
   `vitest -u tests/unit/greek-string-inventory.test.ts`; hex changes move the
   debt ratchet BOTH directions; answer-block terms must resolve in the
   glossary; market numbers must carry source+date or not exist.
5. **Samples are stamped.** Any new invented data renders under «ΔΕΙΓΜΑ»,
   outside animated regions, three-state chips only (severity is an
   underwriting verdict).
6. **proxy.ts allowlist** governs public reachability — new public routes go
   in it, and `/_vercel` must stay in it.

## G12 hostile review — three readers, recorded separately

### Reader 1 — a bank's compliance officer, cold
Read `/`, `/trust`, `/solutions/partners`. **Passes:** every market number
resolves to a linked, dated primary source; neutrality argued from payment
mechanics (present-tense, checkable), not absence of relationships; the
partners page offers documentation for THEIR assessment and never grades
itself; no institution named anywhere; advice stays the intermediary's.
**Flags (both already queued):** the /trust pledge's unqualified
never-transfer-to-banks sentence coexists with the (noindexed) partners page
— `legal-review-queue.md` item 1 is the resolution; IDD opinion pending is
item 2. **No copy edit made** — both are Terms-backed sentences.

### Reader 2 — 68, iPhone SE, 3G, never heard of it
375px: no horizontal scroll, one promise as H1, one primary action, «Χωρίς
κάρτα» reassurance line, four insurance words explained in plain Greek before
anything is asked of them. Term links widened to real 24px targets during
this pass. **Flag that stands:** on real 3G the page paints at ~1.4s but
settles late (the §4.10 JS-budget gap in `perf-report.md`) — this reader is
the person the marketing-bundle split is FOR.

### Reader 3 — awards jury (design, usability, creativity, content, mobile)
**Strong:** the three-state system carried from tokens to samples; the
ReadingDemo demonstrating the product instead of asserting it; sourced
numbers as design elements; dark as a real theme. **Flags that stand:** the
visual seam mid-page — ServicesGrid, WhyDifferent, ClearLimits, FAQ and the
final CTA band are still legacy-styled (the final CTA's slate #0F172A is off
the Grafí palette); remaining G4 primitives unshipped; motion vocabulary
present but sparse below the fold. All recorded as G6-polish/G4 remainder in
the ledger.

## Outstanding list (per the G12 rule: only §2 items and open verifies)

- Terms §3 consent qualification — with legal (queue item 1). Blocks partners
  de-noindexing.
- IDD / ν.4583/2018 opinion — with legal (queue item 2).
- Art. 9 reviewed wording for marketing reuse — queue item 3.
- `[verify]`-class claims deliberately NOT published: "seven in ten never
  switch", "one in five homes insured", any renewal-percentage figure beyond
  the ΕΔΑ. They stay out until a primary source lands in the register.
- Guides 6–8 of the marketing plan: held on citation debt (28 unresolvable
  legacy citations recorded in `docs/growth/G07-CITATION-AUDIT.md`).

## Not-yet-built (ledger detail)

G4 remainder (Select/Switch/Checkbox/Radio/Tooltip/FAQAccordion/StatCard/
nav rebuilds) · G5 remainder (none — ReadingDemo, PlanRecommender,
BrokerScanPanel, DeviceFrame, ProtectionRing all shipped) · G6 polish (legacy
bands onto Grafí; mobile perf) · G9 full-route restyle · `/solutions/agents`
restyle · screen-reader + forced-colors passes.
