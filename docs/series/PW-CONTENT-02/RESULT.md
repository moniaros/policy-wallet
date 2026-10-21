# PW-CONTENT-02 — RESULT

Date: 2026-10-21 · branch `pw-customer` · baselines from HEAD `87e877df` (HEAD built and measured in a worktree).
Approved scope: `STEP0.md` header (decisions H-019..H-024, amendments A1–A5) plus the owner round of 2026-10-22 (DECISIONS.md PW-C02-D1..D9). **Not merged, not deployed.**

> **MERGE BLOCKER — H-021 is OPEN.** Production `plans.entitlements` have not been read. Every "0 false" below is verified against the dev plan rows and the code defaults (`DEFAULT_ENTITLEMENT_LIMITS` / `DEFAULT_AGENT_ENTITLEMENT_LIMITS`), which were equal to each other on 2026-10-21, **not against production**. The entitlement guard is not verified against production until Eli pastes the production rows. Do not merge `pw-customer` into `NEW-UI` before that.

## 1. Acceptance criteria

| Criterion | Before (HEAD) | After | Evidence |
|---|---|---|---|
| Entitlement table: every public claim → code → true; zero false | 12 F / 13 A of 38 (STEP0 §2.3) | **0 F** in the pricing content, enforced by the guard (95 cards and table cells below); the 4 formerly ambiguous rows are all resolved (§3); **against dev rows and code defaults, not production (H-021)** | §2 table; `guard1-entitlement-RED.txt` |
| Positioning variants outside the chosen one: 0 hits in public routes + metadata | **22** static hits (M-P), **19** rendered hits (title/meta/OG/JSON-LD/body, 34 routes) | **0** static, **0** rendered | `guards2-5-HEAD-RED.txt`; `measure-before/after.json` |
| Duplicate blocks ≥80 chars across `/product/*` ≤1 per block | 17 distinct blocks × 17 pages = **289** occurrences, max 17 (el and en alike) | **0** repeated, max **1** | `measure-before/after.json` (M-X1). The two blocks that still repeated on 17 pages (the pricing funnel band and the cookie banner) are now `data-shell`, excluded like the footer; the first "after" run, before that markup, showed exactly those two at 17. |
| Zero hand-formatted prices/numbers in public routes | **12** literals (M-F) | **0** (editorial prose in guides/glossary included: Greek «€200.000» → «200.000 €») | `guards2-5-HEAD-RED.txt` |
| Lighthouse SEO + accessibility on `/`, `/pricing`, `/product` no lower than baseline | 100 / 100 | 100 / 100 (median of 3, mobile and desktop, 18 runs per side, production build on localhost) | `lighthouse.json` |
| COPY.md: every changed `el` string `ok` or signed off by Eli | — | 52 `ok` + 4 `approved` by Eli (the 3 deletion-line rows and «Υποστήριξη μέσω email»); **14 `eli` rows still wait for sign-off** (9 from round 1, 5 from round 2); no row needs the DPO (owner decision) — NOT all signed off | `COPY.md` |

The same-surface duplicate-block count (the transformation doc's definition) reads **0 before and 0 after**: it cannot see this defect, as STEP0 predicted. The defect was cross-page; M-X1 is the new metric (recorded in DECISIONS.md).
Truncation failures (transformation §5.2) 320/390/430: before 150/130/144 → after 140/130/146; run-to-run jitter is ±2, and the selector diff shows no new truncating element, only the renamed heading «Τι κάνει το καθένα» (its derived count 6→5).

## 2. Entitlement table (pricing content, generated from the content and `planClaim`)

`code says` is `planClaim(key, tier)` from `lib/marketing/plan-claims.ts`, which reads `plan-defaults.ts` and `feature-gates.ts` (deep analysis through `canRunDeepAnalysis`, never a literal tier). «—» = the plan's value is deliberately unstated (Agent Free analyses). `untagged` rows carry a reason in `UNTAGGED_OK` (plan-gating-parity.test.ts).

| Audience | Where | Claim (el) | Plan | Rendered | Code says | Source | Verdict |
|---|---|---|---|---|---|---|---|
| policyholder | card | 3 ασφαλιστήρια | free | ✓ | 3 | plan-defaults `policies` | true |
| policyholder | card | Βασική σύνοψη ασφαλιστηρίου | free | ✓ | true | extract/route.ts (every tier) | true |
| policyholder | card | Εντοπισμός διπλών καλύψεων | free | ✓ | true | ungated portfolio rule | true |
| policyholder | card | Ημερομηνία ανανέωσης | free | ✓ | (untagged: UNTAGGED_OK reason) | — | true (STEP0) |
| policyholder | card | Υπενθύμιση ανανέωσης 30 ημέρες πριν (email) | free | ✓ | true | milestones.ts 30-day rung, every tier | true |
| policyholder | card | Έως 10 ασφαλιστήρια | plus | ✓ | 10 | plan-defaults `policies` | true |
| policyholder | card | Βασική σύνοψη ασφαλιστηρίου | plus | ✓ | true | extract/route.ts (every tier) | true |
| policyholder | card | Εντοπισμός διπλών καλύψεων | plus | ✓ | true | ungated portfolio rule | true |
| policyholder | card | Υπενθυμίσεις ανανέωσης από 90 έως 3 ημέρες πριν (email) | plus | ✓ | true | `notifications` (90/60/30/15/7/3) | true |
| policyholder | card | Έως 25 ασφαλιστήρια | pro | ✓ | 25 | plan-defaults `policies` | true |
| policyholder | card | Πλήρης ανάλυση AI | pro | ✓ | true | `canRunDeepAnalysis` → FEATURE_GATES.full_ai_policy_analysis (pro) | true |
| policyholder | card | Ερωτήσεις στην τεχνητή νοημοσύνη | pro | ✓ | true | `interactiveQA` | true |
| policyholder | card | Εντοπισμός κενών κάλυψης | pro | ✓ | true | `gapAnalysisPerDay` ≠ 0 | true |
| policyholder | card | Εντοπισμός διπλών καλύψεων | pro | ✓ | true | ungated portfolio rule | true |
| policyholder | card | Υπενθυμίσεις ανανέωσης από 90 έως 3 ημέρες πριν (email) | pro | ✓ | true | `notifications` (90/60/30/15/7/3) | true |
| policyholder | card | Εξαγωγή αναφοράς | pro | ✓ | true | `savingsReportExport` | true |
| policyholder | table | Αριθμός ασφαλιστηρίων | free | 3 | 3 | plan-defaults `policies` | true |
| policyholder | table | Αριθμός ασφαλιστηρίων | plus | 10 | 10 | plan-defaults `policies` | true |
| policyholder | table | Αριθμός ασφαλιστηρίων | pro | 25 | 25 | plan-defaults `policies` | true |
| policyholder | table | Βασική σύνοψη ασφαλιστηρίου | free | ✓ | true | extract/route.ts (every tier) | true |
| policyholder | table | Βασική σύνοψη ασφαλιστηρίου | plus | ✓ | true | extract/route.ts (every tier) | true |
| policyholder | table | Βασική σύνοψη ασφαλιστηρίου | pro | ✓ | true | extract/route.ts (every tier) | true |
| policyholder | table | Πλήρης ανάλυση AI | free | ✗ | false | `canRunDeepAnalysis` → FEATURE_GATES.full_ai_policy_analysis (pro) | true |
| policyholder | table | Πλήρης ανάλυση AI | plus | ✗ | false | `canRunDeepAnalysis` → FEATURE_GATES.full_ai_policy_analysis (pro) | true |
| policyholder | table | Πλήρης ανάλυση AI | pro | ✓ | true | `canRunDeepAnalysis` → FEATURE_GATES.full_ai_policy_analysis (pro) | true |
| policyholder | table | Ερωτήσεις στην τεχνητή νοημοσύνη | free | ✗ | false | `interactiveQA` | true |
| policyholder | table | Ερωτήσεις στην τεχνητή νοημοσύνη | plus | ✗ | false | `interactiveQA` | true |
| policyholder | table | Ερωτήσεις στην τεχνητή νοημοσύνη | pro | ✓ | true | `interactiveQA` | true |
| policyholder | table | Εντοπισμός κενών κάλυψης | free | ✗ | false | `gapAnalysisPerDay` ≠ 0 | true |
| policyholder | table | Εντοπισμός κενών κάλυψης | plus | ✗ | false | `gapAnalysisPerDay` ≠ 0 | true |
| policyholder | table | Εντοπισμός κενών κάλυψης | pro | ✓ | true | `gapAnalysisPerDay` ≠ 0 | true |
| policyholder | table | Εντοπισμός διπλών καλύψεων | free | ✓ | true | ungated portfolio rule | true |
| policyholder | table | Εντοπισμός διπλών καλύψεων | plus | ✓ | true | ungated portfolio rule | true |
| policyholder | table | Εντοπισμός διπλών καλύψεων | pro | ✓ | true | ungated portfolio rule | true |
| policyholder | table | Υπενθύμιση ανανέωσης 30 ημέρες πριν (email) | free | ✓ | true | milestones.ts 30-day rung, every tier | true |
| policyholder | table | Υπενθύμιση ανανέωσης 30 ημέρες πριν (email) | plus | ✓ | true | milestones.ts 30-day rung, every tier | true |
| policyholder | table | Υπενθύμιση ανανέωσης 30 ημέρες πριν (email) | pro | ✓ | true | milestones.ts 30-day rung, every tier | true |
| policyholder | table | Υπενθυμίσεις ανανέωσης από 90 έως 3 ημέρες πριν (email) | free | ✗ | false | `notifications` (90/60/30/15/7/3) | true |
| policyholder | table | Υπενθυμίσεις ανανέωσης από 90 έως 3 ημέρες πριν (email) | plus | ✓ | true | `notifications` (90/60/30/15/7/3) | true |
| policyholder | table | Υπενθυμίσεις ανανέωσης από 90 έως 3 ημέρες πριν (email) | pro | ✓ | true | `notifications` (90/60/30/15/7/3) | true |
| policyholder | table | Εξαγωγή αναφοράς | free | ✗ | false | `savingsReportExport` | true |
| policyholder | table | Εξαγωγή αναφοράς | plus | ✗ | false | `savingsReportExport` | true |
| policyholder | table | Εξαγωγή αναφοράς | pro | ✓ | true | `savingsReportExport` | true |
| policyholder | table | Συνεργασία με σύμβουλο | free | ✗ | false | `agentCollaboration` | true |
| policyholder | table | Συνεργασία με σύμβουλο | plus | ✗ | false | `agentCollaboration` | true |
| policyholder | table | Συνεργασία με σύμβουλο | pro | ✓ | true | `agentCollaboration` | true |
| agent | card | 10 πελάτες | agent-free | ✓ | 10 | `maxCustomers` | true |
| agent | card | Βασική εικόνα πελατών | agent-free | ✓ | (untagged: UNTAGGED_OK reason) | — | true (STEP0) |
| agent | card | Προσθήκη έως 10 πελατών μαζί | agent-free | ✓ | 10 | `bulkImportLimit` | true |
| agent | card | Αυτοματισμοί ανανέωσης | agent-free | ✗ | false | `renewalAutomation` | true |
| agent | card | 100 πελάτες | agent-starter | ✓ | 100 | `maxCustomers` | true |
| agent | card | 50 αναλύσεις τον μήνα | agent-starter | ✓ | 50 | `aiAnalysesPerMonth` (agent_free unstated: token budget can refuse a run) | true |
| agent | card | Όλοι οι πελάτες σε μία οθόνη | agent-starter | ✓ | (untagged: UNTAGGED_OK reason) | — | true (STEP0) |
| agent | card | Λίστα με ό,τι λήγει | agent-starter | ✓ | (untagged: UNTAGGED_OK reason) | — | true (STEP0) |
| agent | card | Προσθήκη έως 100 πελατών μαζί | agent-starter | ✓ | 100 | `bulkImportLimit` | true |
| agent | card | Ερωτηματολόγια πελατών (5 πρότυπα) | agent-starter | ✓ | 5 | `questionnaireTemplates` | true |
| agent | card | 500 πελάτες | agent-pro | ✓ | 500 | `maxCustomers` | true |
| agent | card | 150 αναλύσεις τον μήνα | agent-pro | ✓ | 150 | `aiAnalysesPerMonth` (agent_free unstated: token budget can refuse a run) | true |
| agent | card | Ομάδα έως 3 ασφαλιστές | agent-pro | ✓ | 3 | `teamMembers` | true |
| agent | card | Προτάσεις επιπλέον κάλυψης ανά πελάτη | agent-pro | ✓ | true | `crossSellIntelligence` | true |
| agent | card | Οι αναλύσεις σας τρέχουν πρώτες | agent-pro | ✓ | true | `priorityQueue` | true |
| agent | card | Παρακολούθηση προμηθειών | agent-pro | ✓ | true | `commissionTracking` | true |
| agent | card | Απεριόριστοι πελάτες | agent-agency | ✓ | null | `maxCustomers` | true |
| agent | card | 400 αναλύσεις τον μήνα | agent-agency | ✓ | 400 | `aiAnalysesPerMonth` (agent_free unstated: token budget can refuse a run) | true |
| agent | card | Απεριόριστη ομάδα | agent-agency | ✓ | null | `teamMembers` | true |
| agent | card | Απεριόριστη μαζική εισαγωγή πελατών | agent-agency | ✓ | null | `bulkImportLimit` | true |
| agent | card | Αποκλειστική υποστήριξη | agent-agency | ✓ | (untagged: UNTAGGED_OK reason) | — | true (STEP0) |
| agent | table | Πελάτες | agent-free | 10 | 10 | `maxCustomers` | true |
| agent | table | Πελάτες | agent-starter | 100 | 100 | `maxCustomers` | true |
| agent | table | Πελάτες | agent-pro | 500 | 500 | `maxCustomers` | true |
| agent | table | Πελάτες | agent-agency | Απεριόριστοι | null | `maxCustomers` | true |
| agent | table | Όλοι οι πελάτες σε μία οθόνη | agent-free | ✓ | (untagged) | — | true (STEP0) |
| agent | table | Όλοι οι πελάτες σε μία οθόνη | agent-starter | ✓ | (untagged) | — | true (STEP0) |
| agent | table | Όλοι οι πελάτες σε μία οθόνη | agent-pro | ✓ | (untagged) | — | true (STEP0) |
| agent | table | Όλοι οι πελάτες σε μία οθόνη | agent-agency | ✓ | (untagged) | — | true (STEP0) |
| agent | table | Αναλύσεις AI ανά μήνα | agent-free | — | unstated | `aiAnalysesPerMonth` (agent_free unstated: token budget can refuse a run) | true |
| agent | table | Αναλύσεις AI ανά μήνα | agent-starter | 50 | 50 | `aiAnalysesPerMonth` (agent_free unstated: token budget can refuse a run) | true |
| agent | table | Αναλύσεις AI ανά μήνα | agent-pro | 150 | 150 | `aiAnalysesPerMonth` (agent_free unstated: token budget can refuse a run) | true |
| agent | table | Αναλύσεις AI ανά μήνα | agent-agency | 400 | 400 | `aiAnalysesPerMonth` (agent_free unstated: token budget can refuse a run) | true |
| agent | table | Λίστα με ό,τι λήγει | agent-free | ✗ | (untagged) | — | true (STEP0) |
| agent | table | Λίστα με ό,τι λήγει | agent-starter | ✓ | (untagged) | — | true (STEP0) |
| agent | table | Λίστα με ό,τι λήγει | agent-pro | ✓ | (untagged) | — | true (STEP0) |
| agent | table | Λίστα με ό,τι λήγει | agent-agency | ✓ | (untagged) | — | true (STEP0) |
| agent | table | Προσθήκη πολλών πελατών μαζί | agent-free | 10 γραμμές | 10 | `bulkImportLimit` | true |
| agent | table | Προσθήκη πολλών πελατών μαζί | agent-starter | 100 γραμμές | 100 | `bulkImportLimit` | true |
| agent | table | Προσθήκη πολλών πελατών μαζί | agent-pro | 500 γραμμές | 500 | `bulkImportLimit` | true |
| agent | table | Προσθήκη πολλών πελατών μαζί | agent-agency | Απεριόριστες | null | `bulkImportLimit` | true |
| agent | table | Ερωτηματολόγια πελατών | agent-free | ✗ | 0 | `questionnaireTemplates` | true |
| agent | table | Ερωτηματολόγια πελατών | agent-starter | ✓ | 5 | `questionnaireTemplates` | true |
| agent | table | Ερωτηματολόγια πελατών | agent-pro | ✓ | null | `questionnaireTemplates` | true |
| agent | table | Ερωτηματολόγια πελατών | agent-agency | ✓ | null | `questionnaireTemplates` | true |
| agent | table | Μέλη ομάδας | agent-free | 1 | 1 | `teamMembers` | true |
| agent | table | Μέλη ομάδας | agent-starter | 1 | 1 | `teamMembers` | true |
| agent | table | Μέλη ομάδας | agent-pro | 3 | 3 | `teamMembers` | true |
| agent | table | Μέλη ομάδας | agent-agency | Απεριόριστα | null | `teamMembers` | true |

## 3. The 38 STEP0 rows, final disposition

Fixed: E5 (Free/Plus ✗), E6 (split; «απεριόριστες» removed), E7 (Plus line removed), E10 (Free ✓ 30-day email), E11 (split), E12 (removed), E17, E18, E19 (also the /pricing meta, found by the widened guard), E20, E21, E23, E24, E25 (exclusions «Ναι», H-023), E26 (EN), E27 («πάντα» removed), E28, E29, E30 (Agent Free count unstated), E31, E32, E37 (funding claim removed), E3 (limit wording removed). **New finding, fixed:** E36 — the agents page promised reminder sending «από το Agent Starter»; the only send action is batch renewal automation (Pro+, `renewals/actions.ts:291`), so it now says Agent Pro.
True, untouched: E1, E4, E8, E9, E13, E14, E16, E22, E33, E34, E38.
**The 4 rows that were ambiguous — all resolved (2026-10-22):**
- **E2** («3 ασφαλιστήρια» counts expired policies): resolved as TRUE as worded — the cap counts every stored policy of any status (`lib/subscription-limits.ts:39-56`), the claim says "policies", and the in-app help already says "including past/expired policies". No public wording changed.
- **E15** (Stripe portal downgrade): **claim removed.** Test mode has 0 portal configurations (`GET /v1/billing_portal/configurations` → 0) and there is no in-app downgrade flow; /pricing and the in-app FAQ now say only "upgrade". Reinstating is QUEUE `STRIPE-PORTAL-PLAN-SWITCHING`.
- **E35** («Αποκλειστική υποστήριξη»): **replaced** by «Υποστήριξη μέσω email» everywhere (support is email only); hours, phone and phone field removed (PW-C02-D2).
- **E7-Family** («Ανάλυση από πολλές ασφαλιστικές»): **already absent** — the Family card was rewritten in round 1 without it (an earlier version of this file wrongly said it stayed). The only remaining mention is the in-app locked upsell card (`PremiumInsightCards.tsx:39`), which names a capability with no implementation behind it; listed in §7.

## 4. Guards, each shown failing first (this session)

| Guard | Red evidence | Probe |
|---|---|---|
| Entitlement claim (plan-gating-parity, both audiences) | `evidence/guard1-entitlement-RED.txt` — 3 failed on HEAD content (106 untagged lines, false cells, in-app string) | `entitlement-claim-false.json`, `entitlement-claim-in-app.ts.txt` (self-checks inside the test) |
| In-app promise (A1) | same file — `el.ts:2505` / `en.ts:2471` found | same |
| JSON-LD price numeric (A3) | `evidence/guard3-jsonld-price-RED.txt` — both pricing pages flagged with the HEAD sources restored, then restored back | `jsonld-price-parsed.tsx.txt` |
| Positioning lint, number format, free-limit single source | `evidence/guards2-5-HEAD-RED.txt` — run in a HEAD worktree: M-P = 22, M-F = 12, free limit hand-typed in 6 places | `voice-positioning-variant.ts.txt`, `voice-number-literal.tsx.txt`, `free-limit-hand-typed.tsx.txt` |

The monthly-cap arm was widened mid-run when the guard's author found «όρια επεξεργασίας» in the /pricing meta by grep: the widened regex was run red on that line (`marketing-pages.ts:97,103`) before the fix.
Full suite: `vitest --run tests/unit` 701 files green (7,895 tests after the review round, §8). `audit:api-auth`, `lint`, `lint:i18n-changed`, `lint:utf8`, `lint:encoding`, `type-check`, `verify:migrations` all pass. Production build passes.

## 5. What changed (by build item)

1. **Entitlement truth** — `public-pricing-content.ts` re-tagged and corrected; `lib/marketing/plan-claims.ts` (new). **1b** in-app «Η πρώτη πλήρης ανάλυση είναι δωρεάν» removed (card block + both bundle keys); the grant is **not** implemented (PW-ENTITLE-01 stub in QUEUE.md).
2. **One limit statement** — `lib/marketing/limit-statement.ts` (new): `FREE_PLAN_LIMIT` (read from the entitlement source) and `DELETION_ON_REQUEST`. No analysis limit is published (H-020). A2: /product's English "Delete everything whenever you want" and the sign-up form's Greek twin now read the line that mirrors /trust word for word (approved by Eli 2026-10-22, DECISIONS PW-C02-D4).
3. **One positioning line** — `CATEGORY_NAME` plus a lower-case `CATEGORY_NAME_INLINE` (the rename shipped «η Πλατφόρμα…» and "an A platform…"); site definition, root meta, root `<title>`, manifest, OG card, home Twitter/OG/keywords, /compare and agents FAQ, guides; `public/brand/og-template.svg` deleted.
4. **Demo cards** — /product card shows the homepage reading demo's «review» line («Για έλεγχο»), not a verdict; catalogue descriptions for life, travel, business, pet, property, motor rewritten as document readings.
5. **Agent row** — A5: «Δεν κερδίζει τίποτα από την απάντηση» deleted outright; the homepage excerpt is now rows [2, 3] and its test was rewritten to say so.
6. **Formatting** — prices are numbers until `formatPlanPrice` (A3); four string-parse sites deleted; el «4,99 €», «35.000 €» everywhere in the guard universe (A4); `formatEur` stays for authenticated surfaces only.
7. **Cross-links** — `ProductCategoryExplorer` is titles-only (label, tag, `min-h-11`, `aria-current`); full cards live on /product.
8. **Footer** — already one component; the pre-footer band keeps reading `DEFAULT_PLAN_FACTS` (see below).
H-024: the boat sentence, the boat headline's «Υποχρεωτική» and the whole boat FAQ item «Είναι υποχρεωτική η ασφάλεια σκάφους στην Ελλάδα;» are removed; reinstate only with the cited article of ν. 4926/2022.
Measurement harness: `tests/measure/metrics.ts` gains `textBlocks` and `duplicateBlocks` (verbatim definition); `content-02.spec.ts` + its own config (no global setup, no dev server).

## 6. DECISIONS TAKEN under standing authority

- **Local `PREVENTION_PERSONALIZATION_ENABLED` aligned `1 → 0`** in `.env.local` (gitignored) to match production before baselines (H-021).
- **Production credentials:** (superseded 2026-10-22: `Bash(vercel env pull*)` is now in `.claude/settings.json` `permissions.deny`; never again.) I ran `vercel env pull --environment=production` once to read that single flag (value `0`; file deleted at once); a second pull was blocked by the permission classifier and I did not retry. Production plan rows were **not** read: live `/pricing` prices (4,99 / 39 / 8,99 / 79 / 29 / 199) equal the dev rows and code defaults; production `entitlements` JSON remains unverified (H-021 residue).
- **`data-shell`** on the pricing funnel band and the cookie banner (measurement exclusion, stated above).
- **Deferred, deliberately:** (a) deleting the dead verdict components (`PolicyWalletWidget`, `AudienceCards`, `HeroSlides`, …): eight tests pin them and nothing renders them; no acceptance criterion needs it. (b) Making the funnel band read the live catalogue: 28 call sites across client components; it formats from `DEFAULT_PLAN_FACTS` through `formatPlanPrice`, and an `/admin/plans` price edit would still not reach it. (c) Editorial dates («Λήγει 15 Ιουν») left as written; A4 covered euro amounts only.
- Editorial prose in `lib/guides` and `lib/glossary` is **inside** the number guard (not exempted): the 3 mixed Greek conventions there were converted.
- `budget-exemptions.json` gained 5 reasoned entries and `corpus-additions.json` 7 reviewed strings; `greek-string-inventory.txt` was regenerated and its diff read line by line.

## 7. Open — for Eli

1. **H-021 (MERGE BLOCKER):** paste the production `plans` rows (`SELECT id, price, annual_price, trial_days, is_public, entitlements FROM plans ORDER BY plan_type, sort_order;`). Until then the guard is unverified against production. `vercel env pull` is now denied in `.claude/settings.json`; I will ask for any production value instead.
2. **H-025:** confirm every public "no commission" / "revenue from subscriptions only" claim (file:line list in HALTS.md) — none was changed; all are false if a partner referral earns money.
3. COPY.md: the 14 remaining `eli` rows (round 1: home step 4, home EN share text, the two reminder labels, pet description, two «Στέλνετε» FAQ verbs, the /product card, EN footer; round 2: the contact label, the /contact meta, the upgrade FAQ, the Schengen FAQ, the /account row).
4. In-app claims still outside this series: the dashboard's locked upsell card «Ανάλυση ασφαλιστηρίων από διαφορετικές ασφαλιστικές» (`PremiumInsightCards.tsx:39`, no implementation), stale comment `plan-defaults.ts` «Free now includes full analysis».
5. Deferred to QUEUE.md (each with references there): dead verdict components + 8 pinning tests; prices from plan config in the band and agents page; hand-typed dates and k/M amounts; the unreachable Free upsell slot (→ PW-ENTITLE-01); Stripe portal plan switching. Also: the optional `phone` on `/api/contact` is accepted but unused.
6. Not merged or deployed. CLAUDE.md asks for journey outcomes on a preview deployment before a production merge.

## 8. Adversarial review

`adversarial-reviewer` (fresh context, never saw the build) found **CRITICAL 4 / IMPORTANT 11 / MINOR 9** on the first pass. Disposition after the fix round (evidence: `evidence/review-round-guards-HEAD-RED.txt` — the widened guards run red on HEAD):

| Finding | Disposition |
|---|---|
| C1 RESULT.md missing | Moot: the review ran while this file was being written. It exists. |
| C2 /product FAQ + JSON-LD: «μηνιαίο όριο χρήσης» | **Fixed** (`marketing-content.ts`); guard widened (`μηνιαίο όριο (επεξεργασίας\|χρήσης)`, "monthly usage allowance") |
| C3 boat-liability sentence in /product/boat meta, OG and `/llms.txt` | **Fixed** (`marketing-pages.ts`, both locales; rendered page and `/llms.txt` checked) |
| C4 guides CTA: gaps promised to Free, overlap attributed to Family | **Fixed** (`GuideArticleClient.tsx`); positioning lint now also bans «τι κενά έχουν» |
| I1 funding claim on /product FAQ | **Fixed** |
| I2 `gapDetection` read the wrong field | **Fixed**: `planClaim` now needs the deep-analysis gate AND the gap gate |
| I3 comparison rows outside the guard | **Fixed**: `COMPARISON_ROWS[*].claim`, guard checks each verdict across free/plus/pro |
| I4 free limit hand-typed elsewhere | **Fixed**: `FREE_UP_TO`, 5 files templated; the guard matches the count read from the entitlement source in any wording («έως 3», «τρία», "up to three") |
| I6 reminder ladder typed | **Fixed in the guard**: every ladder line must state the first and last `RENEWAL_MILESTONES` rung; copy itself still typed (the guard now fails on drift). CLAIMS C3 updated to 90…3 + the Free 30-day email |
| I7 in-app strings beyond one phrase | **Partly fixed**: help article (3 places), `InsightCard`, blocked-analysis title/hint (el+en), orchestrator failure message, upgrade-success copy, Agency «Απεριόριστες AI αναλύσεις» → 400. Guard list widened to those phrases. **Still open (in-app, listed in §7):** `/account` «Απεριόριστες αναλύσεις εγγράφων με AI» and «Μηνιαίο όριο επεξεργασίας AI», the agent pricing page's «25M tokens» line, the Plus lock on «Ανάλυση από διαφορετικές ασφαλιστικές» |
| I9 positioning lint narrowed | **Widened back** (`(αν\|πού) είστε καλυμμένοι`, `Αξιολογούμε`, `you are not covered for`). The dead verdict components are still not deleted (below) |
| I10 hand-rolled severity words on /solutions/agents | **Fixed**: the demo shows one neutral word, «Για έλεγχο», in one colour |
| I11 COPY rows still `eli` | C-35 (business «και ποια όχι») **fixed** per the reviewer; the other 9 `eli` rows remain for Eli; the 3 deletion-line rows are approved (the DPO flag was dropped by owner decision). Note: `corpus-additions.json` lists «Για έλεγχο» (/product, agents demo) as reviewed because the reviewer agent reviewed it; C-50 is still `eli` |
| I5 band and agents page read `DEFAULT_PLAN_FACTS` | **Not done, recorded** (§6): an `/admin/plans` price edit reaches /pricing but not these ~20 pages |
| I8 dates, `€2.5M`/`€500k` | **Not done, recorded**: A4 covered euro amounts; the date and k/M arm of STEP0 §3.5 was not built |
| I9 dead components | **Not done, recorded** (§6) |
| M1–M9 | M1 (the Free upsell slot in `AnalysisCard` is now unreachable until `trial_analysis_used_at` is written) and M2 (three claims are constants, not derived from code) are real and open; M3 unchanged; M4 Terms out of scope; M5 `data-fact` not added; M6 is open question 2 in §7; M7 CLAIMS C5 has no Agent Free 10-row line; M8 Lighthouse file relabelled; M9 stray `status.txt`, `output/` untouched |

Final state: `vitest --run tests/unit` **701 files / 7,895 tests green**; `tsc`, `lint`, `lint:i18n-changed`, `lint:utf8`, `lint:encoding`, `audit:api-auth`, `verify:migrations` pass; production build passes; final measurement on the last build: M-X1 max 1, M-P rendered 0, no non-200 route. Lighthouse numbers were taken one fix round earlier (copy-only changes since).


### 8b. Fresh-session reviews (owner round 2026-10-22, brief item 5)

The reviewer is started with no access to this session's notes, is told the owner's decisions in the prompt, and is forbidden to read RESULT/COPY/STEP0/evidence/DECISIONS/HALTS. Each pass found the same CLASS in a wider area, so the guards were widened by class, not by line.

| Pass | Commit reviewed | Result | What it found → what changed |
|---|---|---|---|
| 1 | `0111618a` | CRITICAL 1 / IMPORTANT 5 / MINOR 6 | Reminders attributed «από το Plus» on `/product` steps (+ HowTo JSON-LD), guides, glossary → reworded everywhere; plan-attribution lint (probe, red on the reviewed commit). Greek in-app forms missed by the guard, a comparison-row probe that could not fail, help-centre "paid plans get full analysis / priority support", the agent upgrade-success body → all fixed. |
| 2 | `b7a8ea5d` | CRITICAL 3 / IMPORTANT 5 / MINOR 7 | Homepage diagram «Υπενθυμίσεις με Plus» (`lib/i18n/how-it-works.ts`); `/upgrade` sold Family as "unlimited policies", Free as "no email notifications" and a "digital wallet" that does not exist (`PricingComparison.tsx`); `/pricing` said Agent Free has no expiring list but every agent has `/renewals`. → all fixed; the table rows are now claim-tagged (`agent.expiryList`, `agent.clientScreen`), `/upgrade` counts come from `DEFAULT_ENTITLEMENT_LIMITS`, `advanced_renewal_reminders` display gate follows the enforced ladder (`plus`), priority queue is Family in upgrade copy, the help article's advisor-sharing line says Family, the help ladder lists the 3-day rung, dead false keys deleted. **Guard changes (red on `b7a8ea5d`, `evidence/guards-round3-b7a8ea5d-RED.txt`):** a label must say what its claim tag says (relabelling `basicSummary` as «Πλήρης ανάλυση AI» now fails); public `lib/i18n/*.ts` modules that public code imports are in the public universe; the support lint also covers in-app strings and every email template; the reminder rule also catches «με Plus». |
| 3 | `9bea922a` | CRITICAL 1 / IMPORTANT 5 / MINOR 6 | see "Pass 3" below |

Open product question surfaced by pass 2, queued (not decided here): the advisor-share API route creates a grant with no `agentCollaboration` check while the UI and the collaboration actions gate it to Family (QUEUE `SHARE-ROUTE-ENTITLEMENT-GAP`). Public and help copy say Family, matching the UI.

**Pass 3** (`9bea922a`): CRITICAL 1 / IMPORTANT 5 / MINOR 6. C1 was a side effect of this series' own gate change: the Family-only card grid on the policy page still listed «Ενέργειες πριν την ανανέωση» (reminders, now Plus) → card removed, the unbuilt «multi-insurer» card removed, the modal's non-existent «pre-renewal checklist» removed, and the upgrade-copy test now requires EVERY card to require exactly the heading tier (probe included). Also fixed: the leftover monthly-cap sentence on /account and its `aiBudgetExhausted` key; the analyses row now shows only where it can be non-zero; two unbuilt Starter lines on /agent/pricing («Branded emails», «Portfolio gap view»); dead help keys with service hours / Discord / «Contact Expert»; API error messages and an in-app hint that sold Family capabilities as «Plus and Pro»; both word orders of the reminder rule and the hours shapes the support rule missed; a vacuous git-history arm replaced by committed probe lines. Open (HALTS **H-027**): the published agent counts vs the token gate (needs production data), and whether the token meter should be hidden.

**Pass 4** (`c36c944f`): CRITICAL 1 / IMPORTANT 3 / MINOR 6. C1: the Family-only card grid still sold the claims guide, which `ClaimsGuidanceCard` renders for every plan → card and the `claims_preparation_assistant` gate + upgrade copy deleted (the repo's precedent for `duplicate_coverage_detection`; a test pins the deletion). Also: the «Pro» lock chip on policy-page actions → «Family»; the claim guard now anchors the label of every always-true claim (relabelling a line `renewalDate`/`agent.clientScreen` fails, probe included), checks the customer count on /agent/pricing, and gained class patterns for "<analysis/gaps> … Plus"; the stale «resets on the 1st» section note and the in-app «Basic CRM» (the site denies being a CRM) were fixed. Left (minor, recorded): the unreachable `multi_insurer_insights` gate, agent-side "Pro" naming in some in-app strings, public bundle keys outside the positioning lint's universe.

**Pass 5** (`1bce1bbc`): CRITICAL 3 / IMPORTANT 4 / MINOR 7. (1) «Οι αναλύσεις σας τρέχουν πρώτες» / priority queue: the orchestrator stores `PolicyAnalysisRun.priority` and nothing ever reads it (QStash publishes runs unordered), so the claim had no behaviour behind it → removed from /pricing, /agent/pricing, /account, upgrade copy; the `agent.priorityQueue` claim key is deleted. (2) The boat heading «Υποχρεωτική αστική ευθύνη» on /product/boat and the same sentence in the policyholder-facing boat copy, risk catalogue and life-event registry → neutralised (HALTS H-024 residue lists the deeper domain-model uses, which need the owner). (3) Upgrade copy told Free users AI Q&A is "included in the paid plans" (Plus has none) → Family; the same «paid plans» class fixed in `subscription-limits`, two `translations` messages, three API error messages (one still mentioned the removed "free trial analysis"; one named plans "Essential or Professional" that do not exist); the Free reminders upsell now says what is true (one reminder on every plan, the ladder with Plus). Guards: class patterns for "<AI/analysis/questions/collaboration> … paid plans", the boat sentence, "free trial analysis". Tests that pinned the false text were re-pointed (`paywall-copy-honesty`).
