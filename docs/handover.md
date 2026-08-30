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

---

# B2C application tier — handover (in progress; `feat/grafi-b2c`)

## B2C — production migration owed (D-B2C-04)

`20260830200000_grafi_app_tier` is applied and verified on dev. The attempt to apply it on
production through the Supabase MCP was denied by the permission classifier (a guardrail chat
authorisation does not lift). Run the following from the Supabase SQL editor on
**PolicyWallet-Prod** (`cquudefwfwrmvpftuhyl`), in one session:

1. The whole of `prisma/migrations/20260830200000_grafi_app_tier/migration.sql` (additive; every
   `CREATE` is `IF NOT EXISTS`; the FKs are added once).
2. Prisma's own ledger row, so `prisma migrate status` against production reports it applied:

```sql
INSERT INTO "_prisma_migrations" ("id","checksum","finished_at","migration_name","logs","rolled_back_at","started_at","applied_steps_count")
SELECT gen_random_uuid(), 'c6f4904cc605a985c43862bf935795d5805e0ed7bff06fe0b4c1851475622096', now(),
       '20260830200000_grafi_app_tier', NULL, NULL, now(), 1
WHERE NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE "migration_name" = '20260830200000_grafi_app_tier');
```

3. Verify (expect 4 tables — 18/9/7/7 columns — 8 FKs with `confdeltype = 'c'` except the
   `grant_id` one (`'n'`), 12 indexes, and the migration row):

```sql
SELECT table_name, (SELECT count(*) FROM information_schema.columns c WHERE c.table_name = t.table_name) AS cols
FROM information_schema.tables t WHERE table_schema = 'public'
  AND table_name IN ('findings','household_people','adviser_share_audits','document_ai_consents') ORDER BY 1;
SELECT conname, confdeltype FROM pg_constraint
 WHERE conrelid::regclass::text IN ('findings','household_people','adviser_share_audits','document_ai_consents') AND contype = 'f' ORDER BY 1;
SELECT count(*) FROM pg_indexes WHERE tablename IN ('findings','household_people','adviser_share_audits','document_ai_consents');
SELECT migration_name, finished_at FROM "_prisma_migrations" WHERE migration_name = '20260830200000_grafi_app_tier';
```

Until this lands, the `FF_APP_*` feature flags stay `false` (A-19) and the Article 9 gate fails
closed — production behaviour is unchanged by the merge.

## B2C — the G14 owed list (2026-08-30, end of the ladder)

1. **Prod DDL** for Finding / HouseholdPerson / AdviserShareAudit /
   DocumentAiConsent — SQL + `_prisma_migrations` INSERT above. Then flip
   `FF_APP_FINDINGS`, `FF_APP_HOUSEHOLD`, `FF_APP_DOCUMENT_CONSENT` in the PR.
2. **`plan.upgraded`** at the Stripe subscription-activation webhook (the
   client cannot truthfully emit completion — docs/analytics-events.md).
3. **Legacy deletion** (A-25 / D-B2C-19): RecommendationCards,
   CoverageInsightsClient, InsightCard, PolicyWallet*, PolicyDetailsClientView
   + policy-detail/*, ProtectionSurface, BatchUploadModal, the /api/policies/
   extract route — each unmounted; delete with the guards that pin their
   class strings rewritten in the same commit.
4. **Reader-pass items logged, not coded** (scratchpad g14-reader*.md have
   the full text): a since-last-visit delta on `/`; a monthly digest built
   from /updates + /money + the ledger; €/month framing on /money; the
   /me/history legacy timeline still shows retired score deltas and 301-ing
   /wallet links; count reconciliation between the home «N πράγματα» line
   and /see; the «18 Με κενό» tile's reassurance sits below the fold; the
   renewal-upload card's copy should name the consent it relies on;
   /me/privacy «Δεν έχει δοθεί» beside AI-processed documents on the seeded
   account needs a data investigation (consent version reset?).
5. **Owed measurements:** Safari device pass (SE / 15 Pro / iPad),
   VoiceOver + forced-colors by a human, Lighthouse on a prod build over 4G.
6. **DPO wording** for the per-document consent framing (legal queue item 5);
   **tariff data** before any paid-twice € renders.

