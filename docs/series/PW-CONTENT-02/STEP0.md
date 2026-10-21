# PW-CONTENT-02 — Step 0: Public site, say only what's true, say it once

Approved: 2026-10-21 — Eli, with amendments A1–A5 and decisions H-019..H-024 below.

**Amendments (binding; override §3 where they conflict)**
- **A1.** Add build item 1b: remove the in-app string «Η πρώτη πλήρης ανάλυση είναι δωρεάν» (`el.ts:2505`, unbacked by code). Extend the entitlement-claim guard to cover in-app strings, not just public routes. Do NOT implement the free-analysis grant.
- **A2.** Replace the English "Delete everything whenever you want" on /product with Greek copy consistent with /trust (deletion on request; legally retained records excepted). Mark it for DPO review in COPY.md.
- **A3.** Prices stay numeric until render. JSON-LD offers use a numeric price and priceCurrency EUR. Add a guard: JSON-LD price parses as a number and equals plan config.
- **A4.** Include the category-rename grammar fixes (/compare, footers) and standardise euro amounts to el-GR "35.000 €".
- **A5.** Delete the comparison-table row «Δεν κερδίζει τίποτα από την απάντηση» entirely. No replacement wording (supersedes build item 5 and E-row wording work; the `homepage-comparison-excerpt` test must be updated to the new last row).

**Decisions:** H-019..H-024 are recorded in `docs/transformation/DECISIONS.md` (PW-CONTENT-02 section) and closed in `docs/transformation/HALTS.md`.

**Status:** investigation only. No product code, test, config or migration was changed.
**Run by:** `step0-investigator` (Opus 5.5, high), 2026-10-21.
**HEAD read:** `87e877df` on `pw-customer` (includes NEW-UI through #409). The public copy was
rewritten **today** at 16:18 +0300 (`27cea6cb`, PR #404, 432 Greek edits). Every baseline in this
series must be taken from HEAD, not from the 21 Oct assessment, which may predate that commit.

**Read before writing:** `docs/STATUS.md`, `CLAUDE.md`, `docs/series/00-RUN-PLAN.md`,
`docs/transformation/DECISIONS.md` (headings + H-009), `docs/content/DECISIONS.md`,
`docs/content/HALTS.md`, `docs/content/CLAIMS.md`, `docs/marketing/06-OPEN-QUESTIONS.md`,
`docs/audits/public-language-legal-2026-10-21.md`, `docs/audits/public-presentation-implementation-2026-10-21.md`,
`docs/transparency/BLOCKED.md` (BL-01), `docs/build/policywallet-transformation-multiagent.md` §5.

**Settled decisions this report relies on and does not reopen**

| Decision | Effect here |
|---|---|
| **D1** (`docs/marketing/06-OPEN-QUESTIONS.md:11`, 2026-08-30): *copy follows code* | Wherever a public claim and the enforced gate disagree, the claim is what's wrong. The halts below ask Eli only where the code itself contradicts a recorded owner decision. |
| D1 amendment / OQ9 (`06-OPEN-QUESTIONS.md:15`): duplicate detection is ungated | The «Εντοπισμός διπλών καλύψεων ✓» cells on every plan are true. |
| D-V07, D-V12, D-V13 (`docs/content/DECISIONS.md`) | Agent tier names stay Latin. No score on public pages. Support identity is `.gr`. |
| Owner, 2026-10-08 (memory: "public site never announces closure") | «Ασφαλής πληρωμή μέσω Stripe» stays on /pricing even while production checkout is restricted. Not a finding. |
| CATALOG COUPLING (`CLAUDE.md`) | No `plans` row is written by this series. Pricing changes are out of scope (series file). |

Findings are split into two backlogs, as CLAUDE.md requires:
- **[BROKEN]**: a false public claim, a contradiction, or something that will break. These gate the series.
- **[UX]**: wording, grammar or duplication I dislike. These do not gate launch.

---

## 1. What the series assumes that turned out false (read this first)

| # | The series says | What the code says | Severity, changed how |
|---|---|---|---|
| A1 | Item 2: «Απεριόριστες αναλύσεις» vs «μηνιαίο όριο επεξεργασίας». State the real rule, with the number. | «Απεριόριστες αναλύσεις» **does not appear on any public route**. It's in-app only (`lib/i18n/translations/el.ts:3424`, rendered by `components/settings/sections/PlanSection.tsx:78`). No B2C tier has a monthly *analysis-count* rule (`aiAnalysisPerMonth: null` on all three, `lib/pricing/plan-defaults.ts:95,111,130`). The public «μηνιαίο όριο επεξεργασίας» line (`lib/landing/content.ts:157`, homepage FAQ, also FAQPage JSON-LD) attaches a monthly limit **to the Free plan**. In production config Free has no monthly metering at all (see A3). | **Worse than described.** The bigger false claim is somewhere else: /pricing marks **«Πλήρης ανάλυση AI» ✓ for Free and Plus** (`lib/pricing/public-pricing-content.ts:197-202`), but the code blocks both (`feature-gates.ts:93`, orchestrator `:640-655`). |
| A2 | Item 1: list what Free / Plus / Family *actually* get. | For Plus, the answer is **contested in writing**. H-009 was CLOSED 2026-08-25 with the decision "deep analysis sits on **both** paid tiers" (`docs/transformation/HALTS.md:638`). The code enforces **Family only** (`lib/monetization/feature-gates.ts:81-96`, with a comment admitting the two decisions disagree). The run plan's H3 says a "depth-based paywall (one free lifetime full analysis)" was already agreed. Nothing implements that, but the in-app wallet **already promises it to every Free user** (`el.ts:2505` «Η πρώτη πλήρης ανάλυση είναι δωρεάν», rendered at `AnalysisCard.tsx:737-746`, confirmed in captured evidence `docs/evidence/policy-detail-mobile/data/free/free-motor-active-390.json`). Nothing anywhere writes `users.trial_analysis_used_at`, and the orchestrator blocks Free outright. | **More serious.** Four sources disagree, and one of them is a live in-app promise. → **H-019**. |
| A3 | A monthly processing limit may exist, and the series wants its number. | Free and Plus extraction is metered by the **policy cap** (`app/api/policies/extract/route.ts:149-157`) and a **30/day spend cap** (`:239-251`). The monthly token budget is reserved on that path **only if** `PREVENTION_PERSONALIZATION_ENABLED=1` (`policy-analysis-orchestrator.service.ts:408-415`). Production keeps it `0` (`docs/audits/prevention-production-release-2026-10-02.md:63`). Local `.env.local` sets it to `1`. **Dev reproduces a Free monthly limit that production doesn't have.** Family deep runs are gated by a 1,500,000-token monthly budget (`:706-719`). That budget has no fixed analysis-count equivalent: the estimate is (118,000 + 1,000 × active rules) × 1.2 = **142,800–151,200 tokens per run** for 1–8 active rules on dev (`token-budget-estimator.ts`). | **Different problem.** No number can be published honestly as "N analyses/month". Also, `plan-defaults.ts:85-87` says the token budget "must never be shown, named, or implied", yet the in-app plan screen shows it (`el.ts:3455-3457`). → **H-020**, **H-021**. |
| A4 | Item 2: "There are at least three [positioning variants] today", quoted as labels. | Commit `27cea6cb` changed `CATEGORY_NAME` **today**, from «Πλατφόρμα προσωπικής ανάλυσης ρίσκου» / "Personal Risk Intelligence Platform" to «Πλατφόρμα οργάνωσης και κατανόησης ασφαλιστηρίων» (`positioning.ts:58-61`). The old variant survives only in lower case, inside `siteConfig.definition` (`lib/seo/site.ts:71-72`). That sentence feeds JSON-LD, the homepage FAQ, /company and `/llms.txt`, and the comment above it says it "must stay aligned" with the label. «Αξιολογούμε την προστασία σας» exists **only** in `public/brand/og-template.svg:17`, a static asset nothing references (still publicly served). «σας λέμε αν είστε καλυμμένοι» is the **headline of the OG image on every page** (`lib/seo/og-card.tsx:22`). | **More visible than described, and there's a new defect.** The label swap broke grammar on every page that embeds it (A5). |
| A5 | (not in series) | `CATEGORY_NAME.en` now begins with "A platform…". Embedded, it renders **"PolicyWallet is an A platform for organising…"** (`app/(public)/compare/CompareSections.tsx:71`), **"PolicyWallet — the A platform for…"** in the footer on every public page (`components/landing/PublicMegaFooter.tsx:292`), and **"The A platform for…"** on the English OG card (`og-card.tsx:28`). In Greek, a capital «Πλατφόρμα» lands mid-sentence: «μια Πλατφόρμα…», «η Πλατφόρμα…». | **[UX], but on every page and in every share preview.** It was introduced today. |
| A6 | Item 4: the agent row is a /compare problem. | The same row is also the **homepage's closing comparison row** (`components/landing/WhyDifferent.tsx:29`, indices `[2,3,5]`). A test pins that the excerpt "ends on the row that carries the argument" by its English text (`tests/unit/homepage-comparison-excerpt.test.ts:37-39`). | **Wider.** Rewording it has to update that test's expectation. Deleting the test isn't an option. |
| A7 | Item 4 suggests the wording «δεν πληρωνόμαστε από ασφαλιστικές». | That's a **funding** claim. The repo deliberately retired funding claims in favour of the commission claim, because a funding claim "becomes false the day an institution pays for an embedded deployment" (`positioning.ts:242-245`, `lib/landing/content.ts:117-121`). The site sells to institutions (`/solutions/synergates`). One funding claim already slipped back in: `app/(public)/solutions/agents/faqs.ts:41` «πληρωνόμαστε μόνο από συνδρομές». | **Contradicts a recorded rationale.** → **H-022**. |
| A8 | Item 6: 16 categories, each re-listing all 16 with descriptions; criterion is "≤1 occurrence per block". | True: all 16 `/product/{cat}` pages render `ProductCategoryExplorer`, which shows 16 full cards (`components/landing/ProductCategoryExplorer.tsx:63-129`), and /product renders the same 16 (`ProductSections.tsx:319-353`). All 16 Greek `descEl` and 15 of 16 `descEn` are ≥80 characters. **But the transformation doc's Duplicate-block count is per surface ("rendered more than once on one surface"), and each description renders once per page, so that metric will read ≈0.** The defect is **cross-page**: 16 blocks × 17 pages × 2 locales. | **Measurement trap.** The criterion needs a cross-page definition, written once in §5 and recorded as new. |
| A9 | Item 7: the footer lists differ between /pricing and /. | **False at HEAD.** Every public route renders the same `PublicMegaFooter`, whose only prop is `locale` (since #395, 2026-10-08). What does differ is the band *above* the footer. `LoBPageShell` adds a pricing funnel band to the 16 product pages, /compare, /company, /contact, /guides, /lexiko, /needs and /solutions/agents (`LoBPageShell.tsx:70-103`). The homepage has its own closing section, and /pricing has none. That band reads prices from `DEFAULT_PLAN_FACTS` instead of the live catalogue (`:18-28`, a risk its own comment accepts), and it carries a third hand-typed variant of the free-tier reassurance (`:78`). | **Smaller.** Build item 8 is already done for the footer itself. What's left is the band. |
| A10 | Item 5: `10.000+` → `10,000+` in English. | **No such literal exists** in any source. `voice-guards` claims-guard bans it (`tests/unit/voice-guards.test.ts:156`). | Refuted, and recorded so nobody "fixes" it. |
| A11 | Item 5: `€4.99` → `4,99 €` in Greek. | True. There's also a trap: the price is a **pre-formatted string**, and three call sites parse it back into a number. JSON-LD uses `amount.replace(/[^0-9.]/g,"")` (`app/(public)/pricing/page.tsx:52`, `en/pricing/page.tsx:45`), and so do `PricingPreview.tsx:49-53` and `pricing-view-model.ts:31-33`. Switching to «4,99 €» naively would make the JSON-LD offer read **499**. | **[BROKEN]-in-waiting.** The design keeps a number in the model and formats it at render time. |
| A12 | Halt: "the code's entitlements contradict Stripe product config". | Stripe holds **no entitlements**. Checkout builds inline `price_data` from the DB plan row on every session (`lib/billing.ts:96-116`). The only Stripe script in the repo, `scripts/setup-billing-catalog.ts`, is marked DEPRECATED (`:4-9`) and carries stale prices (Plus €2.99, Pro €7.99, Agent €19.99/€49.99/€99.99; `:42-46`) that nothing reads. **The halt condition doesn't fire on anything in the repo.** I didn't read the Stripe dashboard. Only the Customer Portal configuration there can confirm the «υποβαθμίσετε οποτεδήποτε» claim. | Reported, not resolved. The portal question is in H-024. |
| A13 | Item 3: verdict-style claims mean the /product demo card. | The demo card is real (`ProductSections.tsx:255-266`, plus its `aria-label` at `:181-184`). But the **live** verdicts are mostly in the category catalogue, which renders on 17 pages: life «φτάνει πραγματικά για την οικογένεια και το στεγαστικό σας» (`lib/product/catalog.tsx:204`), travel «αν τα όρια αρκούν για βίζα» (`:220`), business «ποια έχετε και ποια λείπουν» (`:289`), pet «Ξέρετε ακριβώς» (`:305`). No authored rule backs any of these (`lib/gaps/authored-catalogue.ts` has no life-adequacy, Schengen or business-section rule). The verdict-heavy demo components (`PolicyWalletWidget` «Εντάξει», `RealScreens.DashboardScreen` with priority labels, `WhyNow`, `AudienceCards`, `ComparisonBand`, `ProductStage`) are **dead**: nothing imports them. | **Wider in live copy, narrower in demos.** |

**Broken claims outside this series' scope** (authenticated surfaces). Reported only, not fixed here:
- Free wallet: «Η πρώτη πλήρης ανάλυση είναι δωρεάν» is shown and never honoured (A2).
- `/account` plan section: «Απεριόριστες αναλύσεις εγγράφων με AI» is pushed for **every** tier whose `aiAnalysisPerMonth` is null, Free included (`PlanSection.tsx:78`), next to `noPaidFeatures` «Το δωρεάν πρόγραμμα δεν περιλαμβάνει αναλύσεις AI» (`el.ts:3458`). Free does get AI extraction, so neither line is right.
- `/agent/pricing` lists «Απεριόριστες AI αναλύσεις» for Agency (`app/(protected)/agent/pricing/AgentPricingClient.tsx:117`). The cap is 400.
- In-app, a Plus user sees «Ανάλυση ασφαλιστηρίων από διαφορετικές ασφαλιστικές» as a locked Family feature (`components/monetization/PremiumInsightCards.tsx:39`, gate `feature-gates.ts:109-114`). The public Plus card says it's included (row E7).

---

## 2. What exists (read, with references)

### 2.1 Where entitlements come from

```
DB plans.entitlements (JSON, Zod .strict())          lib/pricing/entitlement-schema.ts:22-67
   │ invalid / legacy shape → code fallback            lib/pricing/plan-catalog.ts:98-120
   ▼
DEFAULT_ENTITLEMENT_LIMITS / DEFAULT_AGENT_…           lib/pricing/plan-defaults.ts:77-257
   ▼
resolveUserEntitlements / resolveAgentEntitlements     lib/subscription-entitlements.ts:149-203
   ▼
FEATURE_GATES (requiredPlan per featureKey)            lib/monetization/feature-gates.ts:74-169
canRunDeepAnalysis(tier)  ← THE deep-analysis gate     lib/monetization/feature-gates.ts:227-229
```

- **Dev `plans` rows (read-only SELECT, project `lzqvtvjggylcujenlelh`, 2026-10-21) equal the code defaults exactly**, for all 7 canonical rows and every key. Prices: ph-plus 4.99/39, ph-pro 8.99/79 with trial 14, agents 29/290, 79/790, 199/1990.
- **Production rows weren't read**, because there's no prod credential in this session. The last recorded production read is BL-01 (`docs/transparency/BLOCKED.md:7`, 2026-09-06): ph-free has `policies 3`, `aiAnalysisPerMonth null`, `monthlyTokenBudget 150000`. That matches dev. H-021 asks for a fresh read.
- Stripe: no entitlements, inline `price_data` (A12).

### 2.2 What each plan actually gets (as of HEAD, dev config, production differences noted)

| Capability | Free | Plus (`plus`) | Family (`pro`) | Enforced at |
|---|---|---|---|---|
| Stored policies (all owned, **any status**, including expired) | 3 | 10 | 25 | `subscription-limits.ts:39-56` (counts `ownerUserId` with no status filter) |
| Upload-time AI extraction (basic parsed summary: identity, dates, coverages, **exclusions**) | yes | yes | yes | `extract/route.ts:149-157`, `policy.service.ts:499-508` |
| Extraction spend cap | 30/day | 30/day | 30/day | `extract/route.ts:239-251` |
| Monthly token budget on the basic path | only if `PREVENTION_PERSONALIZATION_ENABLED=1` (dev: 1, prod: 0 per 2026-10-02) | same | n/a | `orchestrator:408-415` |
| Exclusions rendered from extraction | **yes** | yes | yes | `PolicyDetailsClientView.tsx:370-374, 1042` (`ExclusionsCard`, no gate) |
| Deep analysis (clarity, gaps, translation) | **no** (`free_tier_ai_locked`) | **no** (contested, H-019) | yes, within a 1.5M-token budget | `feature-gates.ts:93`, `orchestrator:640-655, 706-719` |
| Coverage-gap detection | no | no | yes | follows deep analysis |
| Duplicate-cover detection | yes | yes | yes | portfolio rules, ungated (`feature-gates.ts:67-72`) |
| Renewal reminder emails | **30-day email only** | full ladder 90/60/30/15/7/3 | full ladder | `renewal.service.ts:280-290`, `lib/renewals/milestones.ts:12,16`, channel `email` `:579` |
| Interactive Q&A | no | no | yes (`questionsPerDay null`, bounded by tokens) | `wallet/actions.ts:1743` |
| Report export (PDF) | no | no | yes | `api/v1/me/portfolio-report`, `savings-report` routes |
| Advisor collaboration | no | no | yes | `lib/api-entitlements.ts:45`, `collaborationActions.ts:59` |
| Monitoring (dashboard watch) | no | no | yes | `PolicyholderHome.tsx:572` (`advancedAnalytics`) |
| Claims guidance card | **yes** | yes | yes | `PolicyDetailsClientView.tsx:1272`, no gate |
| "Multi-insurer insights" | gated `pro` in the upsell registry; no distinct capability found | — | — | `feature-gates.ts:109-114`, `PolicyholderHome.tsx:626-633` |
| Trial | — | — | 14 days | `plans.trial_days`, CLAIMS C9 |

Agent tiers (`plan-defaults.ts:153-256`, DB-identical on dev):

| | Agent Free | Starter | Pro | Agency |
|---|---|---|---|---|
| Clients | 10 | 100 | 500 | unlimited |
| AI analyses/month | 5 (but the 150k token budget **blocks a full run at zero usage**, `run-preflight.ts:8-10`) | 50 | **150** | **400** |
| Bulk client import rows | **10** | 100 | 500 | unlimited (`api/v1/customers/bulk-import/route.ts:75`) |
| Team members | 1 | 1 | 3 | unlimited |
| Questionnaire templates | 0 | 5 | ∞ | ∞ |
| Renewal automation | no | no | yes | yes (`renewals/actions.ts:291`) |
| Branded report | no | no | yes | yes |
| Priority queue | no | no | yes | yes (`orchestrator:690`) |

### 2.3 Every public string that claims an entitlement, checked against §2.2

The universe is `lib/pricing/public-pricing-content.ts`, `lib/marketing/positioning.ts` (COMPARISON_ROWS, CTA_REASSURANCE), `lib/landing/content.ts`, `lib/seo/site.ts`, `lib/seo/marketing-pages.ts`, `app/(public)/**`, `components/landing/**` (live only) and `lib/product/catalog.tsx`. "T" = true, "F" = false, "A" = ambiguous.

| # | Claim (as rendered) | Where | Code | Verdict |
|---|---|---|---|---|
| E1 | «3 ασφαλιστήρια» / Plus «Έως 10» / Family «Έως 25» | pricing cards `:117,141,167`, table `:189` | 3/10/25 | **T**, pinned by `plan-gating-parity` |
| E2 | «Δωρεάν για 3 ασφαλιστήρια» (4 wordings: CTA_REASSURANCE `positioning.ts:371`; /product hero `ProductSections.tsx:99`; LoB band `LoBPageShell.tsx:78`; /product final CTA EN `ProductSections.tsx:386`) | product, all LoB pages, home | 3, counting **expired** policies | **T** in number. **A** in meaning: a Free user with 3 expired policies can't add a current one (fixture F2) |
| E3 | Free «Ανάλυση εγγράφων, εντός του ορίου του πλάνου» ✓ (also Plus) | `:118,142` | basic extraction yes; "όριο" names no limit that applies in prod | **A** |
| E4 | Table «Βασική σύνοψη ασφαλιστηρίου» ✓✓✓ | `:192-193` | yes | **T** |
| E5 | Table **«Πλήρης ανάλυση AI» ✓ Free, ✓ Plus, ✓ Family** | `:196-202` | Free ✗, Plus ✗ (contested), Family ✓ | **F** (Free), **F** (Plus under D1 copy-follows-code) |
| E6 | Family «Πλήρης ανάλυση AI & απεριόριστες ερωτήσεις» | `:168` | deep yes; questions bounded by the 1.5M token budget | **A** («απεριόριστες») |
| E7 | **Plus «Ανάλυση από πολλές ασφαλιστικές» ✓** (also Family) | `:145,170` | gated `pro` in-app; no distinct capability | **F** for Plus |
| E8 | «Εντοπισμός διπλών καλύψεων» ✓✓✓ (cards and table) | `:119,143,169,218-220` | ungated | **T** |
| E9 | «Εντοπισμός κενών κάλυψης» ✗✗✓ | `:214-216` | Family | **T** |
| E10 | Free **«Υπενθυμίσεις ανανέωσης» ✗**, table «Υπενθυμίσεις ανανέωσης (email)» Free ✗ | `:121,222-224` | Free gets a 30-day email | **F** (understates) |
| E11 | Table «Υπενθυμίσεις & εξαγωγή αναφοράς» ✗✗✓ | `:226-228` | reminders: Plus = Family; export: Family only | **F**: a combined row forces one half to lie (same shape D1 split for gap/dup) |
| E12 | Family «Υπενθυμίσεις, οδηγός ζημιάς & εξαγωγή αναφοράς» | `:171` | claims guide is on **every** plan; "smart" reminders = Plus ladder | **A** (implies Family exclusivity) |
| E13 | Table «Ερωτήσεις στην τεχνητή νοημοσύνη» ✗✗✓ | `:205-207` | Family | **T** |
| E14 | Table «Συνεργασία με σύμβουλο» ✗✗✓ | `:231-233` | Family | **T** |
| E15 | FAQ «Μπορώ να αλλάξω πλάνο… υποβαθμίσετε οποτεδήποτε από τις ρυθμίσεις» | `:259` | via the Stripe Customer Portal (`account/actions.ts:80`); depends on portal config not in the repo | **A** (H-024) |
| E16 | FAQ «Διατηρείτε πρόσβαση μέχρι το τέλος της… περιόδου» | `:279` | `cancel_at_period_end` (`lib/billing.ts:500`) | **T** |
| E17 | Policyholder subtitle EN "…full coverage analysis: gaps, expiry dates, answers." | `:102` | gaps are Family; EN means something the EL doesn't | **F** (EN only) |
| E18 | Homepage FAQ «Το δωρεάν πλάνο… με μηνιαίο όριο επεξεργασίας» (+ FAQPage JSON-LD) | `lib/landing/content.ts:157-158` | no monthly limit for Free in prod config | **F** (prod) / T (dev); H-021 |
| E19 | /pricing meta «…δυνατότητες και όρια επεξεργασίας» | `marketing-pages.ts:97,103` | generic | **A** |
| E20 | Home step 4 «Με το Plus λαμβάνετε υπενθυμίσεις και βλέπετε τι άλλαξε όταν ανεβάζετε την ανανέωση» | `content.ts:85-86` (+ HowTo JSON-LD) | reminders: Free has the 30-day email; "τι άλλαξε": `differentialFromDocuments` is ungated (`wallet/[id]/page.tsx:400`) | **A** (attributes ungated features to Plus) |
| E21 | /product bullet «Σας ειδοποιούμε πριν λήξει κάτι — από το πλάνο Plus» | `ProductSections.tsx:158` | Free gets the 30-day email | **A** |
| E22 | /product bullets: «Πιθανές κοινές καλύψεις σε κάθε πλάνο», «Δείχνετε στον ασφαλιστή σας… με το Family» | `:157,166` | as stated | **T** |
| E23 | `siteConfig.definition` «…δείχνει πού είστε καλυμμένοι και πού όχι — και, με το Family, ποια κενά» | `site.ts:71` (JSON-LD, FAQ, /company, llms.txt) | "πού είστε καλυμμένοι και πού όχι" is gap output (Family) and is stated unattributed | **F** for Free/Plus |
| E24 | Root meta / manifest «δείτε πού είστε καλυμμένοι και πού έχετε κενά» | `site.ts:77`, `public/manifest.json:4` | gaps = Family | **F** (unattributed) |
| E25 | Compare «Βοηθά να βρείτε τι εξαιρείται» → PolicyWallet «Ναι, με το Family» | `positioning.ts:487-496` | exclusions render for **every** plan | **F** (understates). EN "Shows you what is NOT covered" is a different claim (gaps) → H-023 |
| E26 | Compare «Εντοπίζει πιθανές κοινές καλύψεις» → Ναι | `:497-503` | ungated | **T** (EN "Finds if you are paying twice" is a stronger claim than the EL; [UX] drift) |
| E27 | Compare «Ξέρετε πάντα πότε λήγει το καθένα» → Ναι | `:504-513` | end dates shown for all, when extracted | **A** («πάντα»: an unread end date is possible) |
| E28 | Category property «Με το Family, δείτε αν το σπίτι σας είναι ασφαλισμένο για λιγότερα…» | `catalog.tsx:70` | rule `insured_value_below_rebuild_cost` compares two figures **the document states** | **A** (true when the document states both; worded as a fact about the house) |
| E29 | Category motor headline «…και κενά οδικής βοήθειας» (unattributed) | `catalog.tsx:50` | gaps = Family | **F** (unattributed) |
| E30 | Agent card «5 AI αναλύσεις / μήνα» (Agent Free) | `:308` | count 5, but token budget blocks a run at zero usage (`run-preflight.ts:8-10`) | **F** in practice (code-read; fixture F3c) |
| E31 | Agent card «Προσθήκη πολλών πελατών μαζί» ✗ (Agent Free), table «Μαζική αποστολή ασφαλιστηρίων» Agent Free ✗ | `:310,427-433` | `bulkImportLimit 10` | **F** (understates). The label also says "policies" for a **client-row** import → [UX] |
| E32 | **Agent table «Αναλύσεις AI ανά μήνα»: Pro «200», Agency «Απεριόριστες»** | `:408-414` | 150 / 400; the cards on the same page say 150 / 400 | **F**, self-contradicting on one page |
| E33 | Agent cards 100/500/∞ clients, 50/150/400 analyses, 1/1/3/∞ team, 5 templates, bulk 100/500/∞ | `:328-376, 389-452` | match | **T** |
| E34 | Agent Pro «Οι αναλύσεις σας τρέχουν πρώτες», «Παρακολούθηση προμηθειών», «Προτάσεις επιπλέον κάλυψης» | `:353-356` | `priorityQueue`, `commissionTracking`, `crossSellIntelligence` true on Pro | **T** |
| E35 | Agency «Αποκλειστική υποστήριξη» | `:376` | operational, no code | **A** (H-024) |
| E36 | Agents page «Στείλτε στον πελάτη μια υπενθύμιση με το όνομά του… από το Agent Starter» | `AgentsSolutionPageClient.tsx:104` | `renewalAutomation` false on Starter; not traced to a Starter-gated send | **A** (verify in build) |
| E37 | Agents FAQ «πληρωνόμαστε μόνο από συνδρομές» | `solutions/agents/faqs.ts:41` | funding claim the repo retired | **A** (H-022) |
| E38 | «Ασφαλής πληρωμή μέσω Stripe», «Καμία κρυφή χρέωση», «Ακύρωση ανανέωσης όποτε θέλετε» | `PricingPageClient.tsx:116-127, 406-419` | Stripe; no hidden fees in code; cancel via portal | **T** (owner decision on closure) |

**Baseline: 38 rows. 12 F, 13 A, 13 T.** False: E5 counted once, E7, E10, E11, E17, E18, E23, E24, E25, E29, E30, E31, E32.

### 2.4 Positioning variants (item 2): every tagline, meta, OG/Twitter title and footer descriptor

| Variant | File:line | Route / channel |
|---|---|---|
| «Πλατφόρμα οργάνωσης και κατανόησης ασφαλιστηρίων» (CATEGORY_NAME, **current**) | `positioning.ts:58-61` | footer identity line on every public page (`PublicMegaFooter.tsx:292`), /compare (`CompareSections.tsx:70`), OG card sub (`og-card.tsx:23,28`) |
| «Συγκεντρώνουμε τα ασφαλιστήριά σας και εξηγούμε τι γράφουν.» (CATEGORY decode) | `positioning.ts:68-77` | footer, JSON-LD `slogan` (`lib/seo/jsonld.tsx:66`), OG alt |
| «η ανεξάρτητη πλατφόρμα προσωπικής ανάλυσης ρίσκου» / "independent personal risk intelligence platform" | `site.ts:71-72` | JSON-LD description (`jsonld.tsx:63,231`), home FAQ #1 + FAQPage JSON-LD (`content.ts:109`), /company (`CompanyPageClient.tsx:47`), `/llms.txt` (`app/llms.txt/route.ts:25-27`), home meta (`lib/landing/seo.ts:67`) |
| «Ανεξάρτητος έλεγχος ρίσκου με AI: δείτε πού είστε καλυμμένοι…» | `site.ts:77-78` | **root fallback meta description for every page without its own** (`app/layout.tsx:34`), `/llms.txt` home line |
| «Ανεξάρτητος έλεγχος ρίσκου: δείτε πού είστε καλυμμένοι…» | `public/manifest.json:4` | PWA manifest |
| «PolicyWallet \| Ανεξάρτητος έλεγχος ρίσκου» / "An independent risk check" | `content.ts:205,224` | home `twitter:title` |
| keyword «ανεξάρτητος έλεγχος ρίσκου» / "independent risk check" | `content.ts:199,218` | home keywords |
| «PolicyWallet — Δείτε αν είστε καλυμμένοι» | `app/layout.tsx:31` | root default `<title>` for any page without one |
| «Σας λέμε αν είστε καλυμμένοι.» / "We tell you if you are covered." | `og-card.tsx:22,27` | **OG + Twitter image on every page** (`OG_IMAGES`, `TWITTER_IMAGES`) |
| EN home og/twitter description "…tell you where you are covered and where you are not", "We tell you what you are not covered for." | `content.ts:223,225` | /en share text. The Greek twin is a neutral «Ένα μέρος για τα έγγραφα…» |
| «Δεν αξιολογούμε συμβόλαια. Αξιολογούμε την προστασία σας.» | `public/brand/og-template.svg:17` | unreferenced, publicly served at `/brand/og-template.svg` |
| «…με την ίδια ανεξάρτητη ανάλυση ρίσκου ανά πελάτη» | `public-pricing-content.ts:291` | /pricing agent tab subtitle |
| «Η ίδια ανεξάρτητη ανάλυση που εμπιστεύεται ο ασφαλισμένος…» | `solutions/agents/faqs.ts:41` | /solutions/agents FAQ (+ JSON-LD) |
| keyword «ανεξάρτητος έλεγχος ασφάλισης» | `marketing-pages.ts:133` | /compare keywords |
| EN /product title "AI insurance check: coverages and gaps" (EL: «Τα ασφαλιστήριά σας, με απλά λόγια») | `marketing-pages.ts:87` | /en/product `<title>` |
| Stale source comment "PolicyWallet tells you whether you are still protected" | `positioning.ts:16` | not rendered, but the module's own spec states a verdict |

### 2.5 Verdict-style claims on live public pages (item 3)

- `/product` demo «Τι βρήκαμε: Το σπίτι σας είναι ασφαλισμένο για λιγότερα από όσα κοστίζει να ξαναχτιστεί.» (`ProductSections.tsx:255-266`) and its `aria-label` (`:181-184`). It's unattributed, a "found" voice, and sits beside «Δωρεάν για 3 ασφαλιστήρια». **[BROKEN]**
- Catalogue descriptions on 17 pages each: life (`catalog.tsx:204`), travel (`:220`), business (`:289`), pet (`:305`). These are judgments the engine can't substantiate. **[BROKEN]**
- Motor headline «κενά οδικής βοήθειας» (`:50`), liability headline «έλεγχος για διπλή κάλυψη» (`:118`, true, ungated, but its source comment `:120` says "Plus-only", which is stale). /product category heading «16 είδη ασφαλιστηρίων. Μία ανάλυση.» (`ProductSections.tsx:303`) [UX].
- /product/motor «Κενά οδικής βοήθειας… Με το Family» (`motor/PageClient.tsx:58-59`) is attributed. T.
- Comparison table cells that assert a gated capability: E25 (exclusions «Ναι, με το Family»), and E26's English "Finds if you are paying twice".
- Agents page demo severities «Επείγον / Σημαντικό / Μέτριο» (`components/landing/AgentWidgets.tsx:179-195`). These are hand-rolled severity labels on a public page, outside `describeSeverity()`. **[BROKEN]** under the severity invariant, unless `gap-severity-display-single-source` already lists them as debt (it walks `components/landing`, `:298`; verify in build).
- The homepage reading demo (`lib/marketing/reading-demo.ts:34-73`) is **the model to copy**: states are `covered` / `review`, and «Αν τα €180.000 φτάνουν για ανακατασκευή εξαρτάται από το ακίνητό σας. Χρειάζεται έλεγχο.»

Unsourced factual or legal statements on category pages (not verdicts, but «say only what's true» applies):
- boat «Η αστική ευθύνη είναι υποχρεωτική στα ελληνικά ύδατα.» (`catalog.tsx:252`). **I found no official source.** Secondary sources tie the duty to vessel type and length and cite Law 4256/2014 and Ministerial Decision 3131/1999 ([nextdeal.gr](https://www.nextdeal.gr/asfalistis/diamesolavisi/100927/volta-me-skafos-asfalisi-ehete), [insurancedaily.gr](https://www.insurancedaily.gr/asfalisi-skafon-apo-tin-ethniki-asfalistiki), accessed 2026-10-21). Both are non-official. The unqualified sentence needs a `CLAIMS.md` row with an official source, or it goes.
- Travel Schengen «Τουλάχιστον 30.000 €» (`lib/product/lob-faqs.ts:264`, `travel/PageClient.tsx:56`): no `CLAIMS.md` row. Not verified here.
- /contact «Απαντάμε Δευτέρα–Παρασκευή 09:00–18:00» (`marketing-pages.ts:163,167`): an operational fact only Eli can confirm.

### 2.6 Number, currency and date formatting on public routes (item 5)

- **Shared formatter exists:** `lib/i18n/format.ts` provides `formatCurrency` (`:47-60`), `formatNumber` (`:63-70`) and `formatDate` (`:73-87`), using `el-GR` / `en-GB` and Europe/Athens. Node 26 ICU gives `4,99 €`, `39 €`, `10.000`, `1.000` for el-GR. Re-check in Chromium/WebKit for 4-digit grouping.
- **Plan prices do not go through it.** `formatEur` (`pricing-view-model.ts:27-29`) returns `€4.99` in both locales. Its consumers on public routes: pricing cards (`PricingCard.tsx:75`), the homepage band (`PricingPreview.tsx:153`), the LoB funnel band (`LoBPageShell.tsx:84-91`), agents page (`AgentsSolutionPageClient.tsx:187`), and computed savings «Εξοικονομείτε ~€N» (`:44`). The template literals `"€4.99"`, `"€39"` etc. live at `public-pricing-content.ts:112-367`. `formatEur` also has in-app consumers: `UpgradeModal.tsx:255,272`, `TokenUsageCard.tsx:31`, `PricingComparison.tsx:84-103,358`.
- **Hand-formatted demo amounts.** Greek appears in two conventions on the same site: «35.000 €» (motor `:73`, health `:75,81`, group-health `:73,84`, group-pension `:73,84`, cyber `:79`, AgentWidgets `:410-412`) versus «€500.000», «€180.000», «€28.000» (`reading-demo.ts:34-73`, `fine-art/PageClient.tsx:95`). English abbreviates inconsistently: "€500k", "€2.5M" (cyber), "€1M" (health).
- **Hand-formatted dates.** /product demo «Λήγει 15 Ιουν / 3 Μαρ / 1 Ιαν» and "Expires Jun 15" (`ProductSections.tsx:209-226`). Countdowns «Λήγει σε 14 μέρες» (`motor/PageClient.tsx:70`).
- **Counts:** «16 είδη» is derived from `productCategories.length`. T. Public counts go through `lib/marketing/public-counts.ts`, guarded.
- **Editorial prose:** `lib/guides/content.ts` has 49 hand-formatted amounts, `lib/glossary/content.ts` has 4. They're correct per locale but bypass the formatter. Scope decision in §3.6.

### 2.7 Category block duplication (item 6)

`ProductCategoryExplorer` renders all 16 categories as full cards: label, headline, description, tag. The current category renders with `aria-current` (`:63-129`). It's used by all 16 `/product/{cat}/PageClient.tsx`, and `/product` renders the same 16 full cards (`ProductSections.tsx:319-353`). Static estimate: 16 EL description blocks ≥80 characters, each on **17 pages per locale**. Headlines are 46–77 characters, so none reaches 80.

### 2.8 Footer and nav (item 7)

There's one footer, `PublicMegaFooter`, on every public route. It's reached through `LoBPageShell.tsx:106`, `WorldClassLanding`, `PricingPageClient.tsx:451`, `LegalDocumentPage.tsx:181`, and the methodology, platform, status, trust, changelog and perks pages. The header is one component too (`PublicHeader`, via `LoBPageShell.tsx:64`). What remains is the pre-footer band drift described in A9.

### 2.9 Existing guards this series must extend, not duplicate

`plan-gating-parity.test.ts` covers policy ceilings, gap/dup cells and the deleted paywall key (`:46-99`). It does **not** cover E5, E7, E10–E12 or the agent table. `cta-reassurance-single-source.test.ts` missed the three hand-typed variants. `voice-guards.test.ts` covers number format (`:147-153`), but **only English thousands separators in Greek**, so it misses `€4.99` in Greek. Its claims-guard is at `:155-159`. Also relevant: `no-overpromise-copy`, `legal-pricing-claims`, `no-comparative-pricing-claim`, `homepage-comparison-excerpt`, `primary-action-single-source`, `marketing-mock-honesty`, `seo-metadata`, `marketing-content-contracts`, `greek-public-routes-are-pinned`. Rule from CLAUDE.md: **one guard per defect class**, so extend these.

---

## 3. Proposed design

### 3.1 Data model

No schema change. Every fix is code or copy. Prices stay in `plans` rows, and no row is written (catalogue coupling).

```sql
-- PW-CONTENT-02 requires NO migration.
-- Plan entitlements already live in plans.entitlements (validated, code fallback);
-- this series only makes public copy READ them. No plans row is written.
```

### 3.2 API contract

**No new or changed API route**, so `audit:api-auth` and `proxy.ts` are untouched. The contracts below are module contracts.

```ts
// lib/marketing/plan-claims.ts  (NEW, client-safe: imports plan-defaults + feature-gates only)
export type ClaimKey =
  | "policies" | "basicSummary" | "deepAnalysis" | "gapDetection" | "duplicateDetection"
  | "renewalEmails" | "renewalLadder" | "interactiveQA" | "reportExport"
  | "advisorCollaboration" | "claimsGuide" | "exclusions"
  | "agent.clients" | "agent.analysesPerMonth" | "agent.bulkImportRows" | "agent.teamMembers"
  | "agent.questionnaireTemplates" | "agent.renewalAutomation" | "agent.priorityQueue" /* … */
export type ClaimValue = boolean | number | null /* null = unlimited */
export function planClaim(key: ClaimKey, tier: PlanTier | AgentTier,
  entitlements?: EntitlementLimits | AgentEntitlementLimits): ClaimValue
// deepAnalysis := canRunDeepAnalysis(tier)   (THE predicate; never a literal)
// renewalEmails := true for every B2C tier (30-day rung); renewalLadder := limits.notifications
// claimsGuide / exclusions / duplicateDetection := true (ungated, documented with file:line)
```

- Every `PublicPricingFeature` and `PublicPricingComparisonRow` that states a capability carries `claim: ClaimKey`. That's the series' "claims-entitlement" tag. Its `included` or `values` are **computed** by `planClaim` in `pricing-view-model.ts`, not hand-typed. Rows with no claim (prose) carry `claim: null` explicitly, so the guard can tell "untagged" from "not a claim".
- `COMPARISON_ROWS[*].policywallet` gets the same treatment: the verdict `family` is derived when `planClaim` is false for free/plus and true for pro.

```ts
// lib/marketing/limit-statement.ts  (NEW): ONE sentence, used on every route that states a limit
export function limitStatement(catalog: CatalogPlan[], locale: "el"|"en"): string
// Wording waits on H-020. Until then it states only the enforced policy cap from the catalogue
// («Δωρεάν για 3 ασφαλιστήρια…»), replacing CTA_REASSURANCE's literal "3" and the four variants.
```

```ts
// Price model: keep the NUMBER, format at render
interface PublicPricingPlan { pricing: { monthly: { value: number; period }, annual?: { value: number; period; savings } } }
// render:  formatPlanPrice(value, locale) → formatCurrency(value, locale, { decimals: Number.isInteger(value) ? 0 : 2 })
// JSON-LD: price: String(plan.pricing.monthly.value)   — delete the 4 string-parse sites
```

`formatEur` stays as it is for the in-app consumers, which are out of scope. The public route stops importing it. Recorded as a decision: changing it would alter authenticated surfaces.

### 3.3 Components, mapped to existing primitives

| Change | Component | Primitive / source |
|---|---|---|
| Pricing cards and table read `planClaim` | `components/pricing/PricingCard.tsx`, `FeatureComparison` in `PricingPageClient.tsx` | unchanged markup; `ComparisonVerdict` (`components/landing/ComparisonVerdict.tsx`) for cells |
| One limit sentence | `ProductSections.tsx:97-102, 384-387`, `LoBPageShell.tsx:76-78`, homepage CTA, LoB PageClients via `CTA_REASSURANCE` | text only. Mark the element `data-fact="plan.freeLimit"` so duplicate-fact measurement works |
| Positioning | `positioning.ts` (CATEGORY_NAME split into a lower-case **inline** form plus a capitalised **label** form so articles compose), `site.ts` definition/description, `app/layout.tsx:31`, `og-card.tsx`, `content.ts` seo, `public/manifest.json`, `marketing-pages.ts` keywords, agent subtitle, `faqs.ts:41`; **delete** `public/brand/og-template.svg` | text only |
| Demo card shows reading outputs | `/product` card `ProductSections.tsx:255-266` | `src/design-system/reading-demo.tsx` states and `StatusChip` (`src/design-system/product.tsx`) `covered` / `excluded` / `review`. Copy pattern from `reading-demo.ts:58` |
| Catalogue descriptions | `lib/product/catalog.tsx` life/travel/business/pet/motor | text only |
| Agent row | `COMPARISON_ROWS[5]`, rendered by `/compare` and `WhyDifferent` | Wording waits on H-022 and `greek-copy-reviewer`. Update `homepage-comparison-excerpt` expectation |
| Category cross-links, titles only | `ProductCategoryExplorer.tsx` | link grid: `min-h-11` targets, label + tag pill (`.pw-pill`), `aria-current="page"` on the current one, no headline/desc. `/product` keeps full cards |
| Pre-footer band reads the live catalogue | `LoBPageShell.tsx` | receives `plans` like `PricingPreview` does (server component; `getPlanCatalog()` at the page) |
| Formatting | demo amounts and dates in `app/(public)/product/*/PageClient.tsx`, `reading-demo.ts`, `AgentWidgets.tsx`, `ProductSections.tsx` | `formatCurrency` / `formatDate` from `lib/i18n/format.ts`, with sample values as numbers/ISO dates |
| Dead code carrying banned phrases | `PolicyWalletWidget`, `ProductStage`, `WhyNow`, `AudienceCards`, `ComparisonBand`, `HeroSlides`, `ServicesGrid`, `TrustBadges`, `RealScreens.DashboardScreen/RenewalsScreen/CoverageMapScreen` (verify each has no importer) | delete. A dead file with a verdict is "one import away from going live" (`content.ts:17-21`) |

### 3.4 Order of build items (each reversible)

1. Remove false claims first, without new wording (Build item 1): E5 Free/Plus → ✗ (copy follows code, D1), E7 Plus ✗, E10 Free ✓ «email 30 ημέρες πριν», E11 split into two rows, E17/E23/E24/E29 drop the unattributed gap clause, E25 → «Ναι», E31 → 10 rows, E32 → 150/400, E18 → drop «με μηνιαίο όριο επεξεργασίας».
2. Price model and formatter (A11) before any copy touches prices.
3. Positioning, demo, agent row and limit sentence, once H-020 and H-022 are answered.
4. Cross-links, the band, dead-code deletion.

### 3.5 Guards (each shown failing first, with a committed probe)

| Guard | Extends | Universe (enumerated) | Probe |
|---|---|---|---|
| **Entitlement claim** | `tests/unit/plan-gating-parity.test.ts` | every feature/row in `publicPricingContent` (both audiences) + `COMPARISON_ROWS`; fails on (a) a capability-shaped label with no `claim` tag, (b) a rendered value ≠ `planClaim(key, tier, DEFAULT_*)`, (c) a literal tier comparison | `tests/fixtures/guard-probes/entitlement-claim-false.ts.txt` (Agent Pro "200") |
| **Locale number format** | `voice-guards` number-format-guard | files under `app/(public)/**`, `components/landing/**`, `components/public/**`, `src/design-system/**`, `lib/marketing/**`, `lib/landing/**`, `lib/product/**`, `lib/pricing/public-pricing-content.ts`, `lib/seo/**`; bans `€\d`, `\d\s?€`, `\d{1,3}[.,]\d{3}` inside string literals, plus month-abbreviation date literals | `locale-number-literal.tsx.txt` («€4.99» in an `el` slot) |
| **Positioning lint** | `voice-guards` claims-guard (same defect class: a retired claim returns) with a public-scoped banned list | the same public universe **plus** `public/manifest.json`, `public/**/*.svg`, `app/layout.tsx`, `app/llms.txt/route.ts`, `lib/seo/og-card.tsx`. Banned: `έλεγχο[ςυ] ρίσκου`, `ανάλυσης? ρίσκου`, `(αν\|πού) είστε καλυμμένοι`, `[Αα]ξιολογούμε`, `risk (intelligence\|check)`, `(if\|where) you are covered`, `not covered for` | `positioning-banned.ts.txt` |

### 3.6 Decisions taken under standing authority (reversible; record in DECISIONS.md at close-out)

- Editorial prose in `lib/guides/content.ts` and `lib/glossary/content.ts` is **exempt** from the number-format guard, with the reason listed in the guard. It's per-locale correct prose rather than UI data. The sweeper reports it separately. Acceptance "zero hand-formatted prices or numbers in public routes" is read as UI and demo data. Reverse it by deleting the exemption.
- `formatEur` stays for in-app consumers; public routes use `formatPlanPrice`.
- Build item 8 is reduced to the band (A9); the footer is already one component.

---

## 4. Fixtures

Public pages render **no user data**. The only DB inputs are the plan catalogue and partner offers. So each mandatory fixture below says what it can produce. Where it can't reach a public route, it's retargeted to the in-app surface that the entitlement table needs as evidence, and that's stated rather than hidden. All fixtures are dev-only, idempotent, refuse a production project ref, and address `monthly_token_usage` only via `billingMonth()` (memory trap).

| # | Fixture | Produces |
|---|---|---|
| F1 **Empty portfolio** | Free user, 0 policies, consent given | `/account` plan section renders «Απεριόριστες αναλύσεις εγγράφων με AI» (`PlanSection.tsx:78`) and/or «Το δωρεάν πρόγραμμα δεν περιλαμβάνει αναλύσεις AI» (`el.ts:3458`) against public E3/E5. Code-read; the fixture confirms which render together. |
| F2 **All-expired** | Free user, 3 policies all `endDate` < today | Uploading a current 4th policy returns `POLICY_LIMIT_REACHED` (`subscription-limits.ts:46-48` counts every owned policy). Tests E2's meaning: «3 ασφαλιστήρια» includes dead ones. |
| F3 **Failed analysis** | (a) Free user, policy with run `blocked / free_tier_ai_locked` | the wallet shows «Η πρώτη πλήρης ανάλυση είναι δωρεάν» over a blocked run (A2, already in captured evidence) against public E5 «Πλήρης ανάλυση AI ✓» |
| | (b) Family user, `monthly_token_usage` = 1,400,000 for `billingMonth()` | the next deep run returns `TOKEN_LIMIT_BLOCKED` (`orchestrator:706-719`) against E6 «απεριόριστες» |
| | (c) Agent Free, 0 usage, motor policy | `preflightAnalysisTokenGate` refuses (estimate > 150,000) against E30 «5 AI αναλύσεις / μήνα» |
| F4 **Extractor placeholder** | a dev policy with `insurerName='__PENDING_EXTRACTION__'` and `(XXXX)` in `coverageSummary`, then render `/`, `/product`, `/pricing` | **Negative control.** No public route reads policy rows, so the internal-token metric must stay 0. It produces a defect only if a data path to a public page has been introduced. Stated, not assumed. |
| F5 **Longest Greek insurer name** | The public samples use lettered insurers («Ασφαλιστική Α»), so the relevant long strings are the bundle's: «Υπενθυμίσεις, οδηγός ζημιάς & εξαγωγή αναφοράς», «Έργα Τέχνης & Τιμαλφή» (title-only cross-link), the new limit sentence, the reworded agent row, «Υπο-εκτελούντες επεξεργασίας» (footer). Plus the longest name in the insurer reference catalogue substituted into `WalletScreen`'s sample through a dev-only `/styleguide` section (that route 404s in production) | Truncation failures at 320/390/430 on pricing cards, the comparison table, the cross-link grid and the footer. |
| F6 **English summary left over in storage** | The public analog is an English twin saying something the reviewed Greek doesn't. Live pairs: `COMPARISON_ROWS[2,3].job.en`, `public-pricing-content.ts:102`, `content.ts:223-225`, `ProductSections.tsx:386` ("Delete everything whenever you want", **false** against the retained-records policy the legal review just corrected), `marketing-pages.ts:87`, `motor/PageClient.tsx:113` EN | Rendered `/en/*` routes; count of drifted pairs (metric M7). (`WHY_NOW[1]` drifts too, but it's dead code.) |
| F7 Catalogue price ≠ default | dev `ph-plus.price = 4.5` (restore to 4.99 after; content md5 before and after) | `/pricing` shows the catalogue value while the LoB band (`DEFAULT_PLAN_FACTS`) shows €4.99 (A9), and computed savings switch to «~€N» (`pricing-view-model.ts:73-77`). Also proves JSON-LD reads the number. |
| F8 Personalisation flag off | run the F1–F3 checks with `PREVENTION_PERSONALIZATION_ENABLED=0` (prod value) and again with `=1` (dev value) | Shows E18's truth flips with env (A3). |

---

## 5. Measurement plan

Routes: `/`, `/en`, `/pricing`, `/en/pricing` (both audience tabs), `/product`, `/en/product`, all 16 `/product/{cat}` × 2 locales, `/compare`, `/en/compare`, `/solutions/agents`, `/en/solutions/agents`. Widths 320 / 390 / 430. Lighthouse at mobile and desktop presets. Settle procedure exactly as `docs/build/policywallet-transformation-multiagent.md` §5.1.

**Definitions copied word for word from `docs/build/policywallet-transformation-multiagent.md` §5.2:**

> **Duplicate-block count**: Text blocks of ≥80 characters rendered more than once on one surface. Catches boilerplate proliferation — the AI disclaimer paragraph currently renders two to three times on the dashboard.

> **Truncation failures**: Elements sourced from the `el` bundle where `scrollWidth > clientWidth`, plus any server-side string slicing on Greek content, plus mid-word breaks on brand names.

> **Locale purity failures**: Latin-script sentences (≥3 consecutive Latin words) in `el` output, with a narrow allowlist for brand names and acronyms. Applies to outbound templates.

> **Sub-44px targets**: `a, button, [role="button"], input, select, summary, [tabindex]:not([tabindex="-1"])` with a rendered box under 44px in either dimension. Excludes links inside running text and off-canvas chrome. State the selector; note where it differs from any pre-existing viewport spec so the two counts are not confused.

> **Contrast**: WCAG 1.4.3 (text, 4.5:1 body / 3:1 large) **and 1.4.11 (non-text boundaries, 3:1)**. 1.4.11 is mandatory in this phase, not deferred — a near-black card on a near-black background was previously missed precisely because only text contrast was automated, and the harness reported zero failures on a page containing it.

> **Duplicate-fact count**: `data-fact="<namespace>.<key>"` values appearing more than once. Until instrumentation exists, run a parallel value scan counting visible elements whose own text contains each named fact value, and record **both**, because an attribute scan on an uninstrumented page returns a vacuous zero.

The harness has no ≥80-character block function today; `repeatedStrings` uses ≥12 characters at `tests/measure/metrics.ts:1059`. Build adds `duplicateBlocks(page)` implementing the definition above **verbatim**, in `metrics.ts`, imported and never copied.

**New definitions.** These aren't in the transformation doc, so they're written once here and recorded in DECISIONS.md at close-out:

| Id | Metric | Definition |
|---|---|---|
| M-X1 | Cross-page duplicate-block count | For a route set S, a text block of ≥80 characters (own text of a visible element, whitespace-collapsed) rendered on more than one route in S, excluding elements inside `header`, `footer`, `nav` and `[data-shell]`. Reported as (distinct blocks, total occurrences, max occurrences of one block). Acceptance: max occurrences per block ≤1 across `/product/*` ∪ `/product` per locale. |
| M-E | Entitlement false count | Rows of the §2.3 table whose verdict is F against `planClaim` and code, re-derived by the guard. Baseline **12 F / 13 A**. |
| M-P | Positioning-variant hits | Matches of the §3.5 banned list in the positioning-lint universe (static), plus the same patterns in rendered text, `<title>`, meta, OG/Twitter tags and JSON-LD of each measured route. |
| M-F | Hand-formatted literal count | Sweeper count of the §3.5 number-format pattern in the guard universe, minus listed exemptions. |
| M-L | Lighthouse SEO / Accessibility | Category scores from `lighthouse` (not installed; Build adds it as a devDependency or uses `npx`) on `/`, `/pricing`, `/product`, mobile and desktop presets, median of 3 runs, production build on localhost:3000. |
| M7 | en/el drift pairs | Bilingual pairs on live public routes whose `en` asserts a capability, verdict or promise absent from the `el`. Reviewed by `greek-copy-reviewer`; the count is the review output. |

---

## 6. Risks to CLAUDE.md invariants

| Invariant | How this series could break it | Prevention in the design |
|---|---|---|
| Never publish a public claim the code doesn't support | Rewording before H-019/H-020 are answered invents a rule | Build item 1 **removes** false claims only (copy follows code, D1); new wording waits for the halts |
| Catalogue coupling | A "fix" that edits `plans` rows publishes immediately | No row write. Copy *reads* the catalogue; F7 restores the row and proves it by md5 |
| JSON-LD only describes what the page shows; price truth | Locale-formatted price strings parsed back to numbers → JSON-LD «499» | Numbers in the model; the 4 parse sites deleted; a `seo-metadata` assertion on `offers.price` |
| Rules decide gaps; the `missing` operator means "not recorded" | Demo copy that says «δεν καλύπτεται» for a not-recorded field | Demo states are restricted to `covered` / `excluded` / `review` (reading-demo model); no gap verdict |
| Absence isn't reassurance | Removing «Τι βρήκαμε» but leaving «Εντάξει»-style chips | Dead verdict components are deleted, not left importable; `all-clear-honesty` universe extended to `components/landing` |
| Severity isn't a verdict | `AgentWidgets` «Επείγον/Σημαντικό/Μέτριο» | Route through `describeSeverity()` or remove; check the `gap-severity-display-single-source` debt list |
| The product reads; the partner advises (PW-VOICE-01, IDD) | The agent-row rewrite characterises agents, or a funding claim returns | Wording through `greek-copy-reviewer`, Eli sign-off, H-022; advice-verb guard stays green |
| Voice guards (lexicon, length budget, new-string, claims rows) | New Greek strings unregistered; a number without a CLAIMS row | Every changed `el` string goes in `docs/content/corpus-additions.json`; the limit sentence and any published number get a `CLAIMS.md` row before shipping |
| A string under an open halt in `docs/content/HALTS.md` is left alone | Touching H-V06 partner-connection copy | Not in this series' universe; checked |
| i18n: no hardcoded UI strings; `lint:i18n-changed` | New ternary literals in `.tsx` | Use bilingual objects / `t(el,en)` from modules; no `x ? 'el' : 'en'` pairs |
| `data-fact` marks a fact once | The limit sentence rendered in hero + band + CTA | `data-fact="plan.freeLimit"` on each; M-X1 and duplicate-fact count both reported |
| `.pw-scroll-strip` / ≤430 `min-width:0` net | The title-only cross-link grid wrapping long Greek labels | Grid, not a scroll strip; truncation metric at 320 on «Έργα Τέχνης & Τιμαλφή» |
| Guards enumerate and ship a probe | Scoping the number guard to "known files" | Universes are directory globs plus static assets; three probes committed and shown red |
| `lib/gap-detection.ts` SHA pin | n/a | Not touched by any item |
| `proxy.ts` allowlist / API inventory | n/a | No new public route or API route |
| Public site never announces closure (owner) | "Fixing" «Ασφαλής πληρωμή μέσω Stripe» | Out of scope; left as is |
| Shared working tree with parallel sessions (memory) | `git add -A` sweeping PW-ASSET-01 halts or this file | Stage paths explicitly |

---

## 7. Questions only Eli can answer (appended to `docs/transformation/HALTS.md`)

| Id | Question | Run-plan |
|---|---|---|
| **H-019** | Which deep-analysis rule is true: H-009 (both paid tiers), the code (Family only), or the H3 "one free lifetime full analysis"? The in-app Free promise is false under all three as built. | **H3** |
| **H-020** | Which limit number may be published, given that no monthly analysis count exists? | **H3** |
| **H-021** | Confirm production's `PREVENTION_PERSONALIZATION_ENABLED` and re-read prod `plans` rows. Dev and prod differ on the very claim being fixed. | — |
| **H-022** | Positioning default, the agent-row wording, and funding vs commission claims (plus whether partner referrals earn anything). | **H3** (packaging language) |
| **H-023** | Are exclusions meant to be Family-only? Code shows them on every plan; /compare says Family. | **H3** |
| **H-024** | Operational facts no source in the repo can settle: Stripe Customer Portal downgrade, support hours, «Αποκλειστική υποστήριξη», boat-liability and Schengen sources. | — |

STEP0 COMPLETE — awaiting approval
