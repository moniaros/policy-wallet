# PolicyWallet — Full PXA & Monetization Audit (July 2026)

_Product-experience × monetization audit of the shipped product (policywallet.gr / policy-wallet-omega.vercel.app). Grounded in code as of `feat/seo-geo-aeo-fixes` @ `0063df0` (13 Jul 2026) via four systematic sweeps (billing/entitlements, acquisition funnel, policyholder surfaces, agent/B2B/admin). Builds on — does not repeat — [conversion-audit-2026-07.md](conversion-audit-2026-07.md) and [product-review-15-areas-2026-07.md](product-review-15-areas-2026-07.md). Per repo convention, findings separate **[GATES]** (broken / insecure / dishonest — gates launch) from **[POLISH]** (product judgment)._

---

## 1. Executive summary

The core loop — upload → understand → act → upgrade — is coherent, instrumented, and honest at the moment of sale. The B2C conversion machinery built in PRs #59–#63 is genuinely good. But the audit found that **three of the four systems that come *after* conversion are broken or hollow**, and they matter more than any new trigger:

1. **The retention engine is dormant. [GATES]** `renewal-check` and `protection-score-refresh` exist, are `CRON_SECRET`-gated, and are **not in `vercel.json` crons**. The 90/60/30/15/7-day renewal emails — the product's reason to exist ("η AI σας ειδοποιεί πριν τη λήξη") — never fire in production. Six other daily crons are scheduled; the most important one isn't.
2. **Paying users cannot cancel. [GATES]** `cancelSubscription()` only flips a local `autoRenew` flag and never calls Stripe (`account/actions.ts:352-363`); the v1 checkout flow never persists `stripeCustomerId`, so the billing portal returns 404 for every current subscriber. Stripe keeps billing with no user-reachable exit. This is an EU consumer-law exposure and the single worst trust defect in the product.
3. **The growth loops are theater. [GATES]** The referral tab promises "€10 credit," but the copy button has no handler, the code is minted on-the-fly and never validated, the link points to `/join/<code>` — a route that does not exist — and the `CreditTransaction` ledger is read-only. The agent→client invite loop (the real distribution channel) is broken at its entry: `proxy.ts` intercepts anonymous `/invite/[token]` visits and bounces them to signin. The footer newsletter POST is likewise blocked by the proxy allowlist, so anonymous leads are silently dropped.
4. **The B2B tier matrix is ~80% aspirational. [GATES-adjacent]** Of the agent entitlement flags being sold on the pricing page, only six numeric caps and two blurred widgets are enforced. API access, white-label, renewal automation, commission tracking, cross-sell gating, proposal/document/shared-room flows: either given to every tier free, or not built (branded PDF reports are marketed with no implementation). Agents upgrading to Pro/Agency today buy mostly caps.

**Single best monetization wedge: the agent-distributed renewal loop.** Agents (not consumers) are the party in the Greek market with budget, urgency, and a book to protect; the product already has the CRM, the renewals pipeline, opportunity scoring, team seats, and a verified money path (the one real-card purchase ever completed was Agent Starter). Every agent seat imports 10–500 policyholders as zero-CAC free users through the invite loop. The wedge needs three things, all cheap: schedule the renewal cron, unblock the anonymous invite route, and fence the agent tiers so paid features are actually paid. B2C subscriptions remain the volume floor; a one-time **Policy Check-Up** SKU captures the (large, in Greece) segment that will pay once but never subscribe.

Unit economics support generosity: AI COGS are €0.04–0.77/user/month; the real margin tax is Stripe's fixed fee, which makes **annual-first presentation** worth more than any price change (€2.99 monthly loses ~11.4% to fees; €29 annual loses ~3.8%).

---

## 2. Journey map

Format per journey: **Goal · Trigger · Entry · Steps · Screens · Emotion · Friction · Missing · Conversion · Monetization · Retention · Trust.**

### 2.1 Anonymous visitor / first visit
- **Goal:** "Do I finally have one place for my policies? Can I trust it?" **Trigger:** search (9 Greek guides, product LoB pages), agent referral, word of mouth. **Entry:** `/` hero «Ξέρετε τι σας καλύπτει κάθε ασφαλιστήριο;» → CTA «Ξεκινήστε Δωρεάν».
- **Steps/screens:** hero → trust strip → services → audience tabs (individual/agent fork) → stats → how-it-works → final CTA («Δωρεάν έως 3 συμβόλαια. Χωρίς πιστωτική κάρτα.»). Pricing page has real dual-audience content with annual toggle and FAQ JSON-LD.
- **Emotion:** cautious hope; insurance shame ("I don't know what I have").
- **Friction:** no way to sample the product anonymously — no demo analysis, no interactive teaser. The AudienceTabs fork is good; everything else funnels to signup.
- **[GATES] Trust risks:** fabricated social proof — "10.000+ policies analyzed / 98% accuracy / 500+ policyholders trust us" (`WorldClassLanding.tsx:263-278, 354-374`). PR #72 already removed the fake "12% savings" figure; these survived. One skeptical journalist or agent kills the trust story. Remove or replace with true numbers ("every Greek insurer supported, 20 branches").
- **[GATES] Missing:** footer newsletter POSTs to `/api/v1/landing/waitlist`, which the proxy allowlist blocks for anonymous users — every lead is lost (double-gated: also needs `HUBSPOT_ACCESS_TOKEN`).
- **Conversion:** add an anonymous teaser — a static worked sample of the review screen ("this is what your policy looks like after AI"), and unblock the newsletter as the consolation capture.
- **Monetization:** none here. Keep the top of funnel unmonetized.

### 2.2 Sign-up
- **Goal:** get in with minimum commitment. **Entry:** `/auth/signup/{policyholder|agent}`; role fixed by URL, cross-links swap.
- **Steps:** Greek mobile (required, `normalizeGreekMobile`) + optional email (required for agents) + password + terms → confetti → confirmation "Step 2 of 6" showing the carried plan («Will be activated after onboarding»).
- **Friction:** **Greek-mobile-only** signup excludes diaspora/expat users the new EN routes are courting; **no social login** (Google/Apple absent); synthetic phone-emails are auto-marked verified, and `ENFORCE_EMAIL_VERIFICATION` is off (known launch gate).
- **Conversion:** plan carry-through works (signup → metadata → CarriedPlanCard) — good. **[GATES]** except for agents: `AgentOnboardingFlow` reads no searchParams, so an agent who picked Starter on the pricing page has that choice silently dropped.
- **Trust:** "Takes 90 seconds. Cancel anytime." — the second half is currently false (§2.16).

### 2.3 Onboarding
- **Policyholder (5 steps):** goal picker → upload (AI consent modal at the right moment) → real AI summary with trial analysis + upgrade card → reminders opt-in → advisor invite-code redemption. This is a strong flow.
- **Friction:** step 3 is dead time while Gemini runs (15-area review §1 — teach, don't spin); skip-upload path exits with no scheduled re-engagement beyond the day-3 drip.
- **Agent onboarding:** branding → license upload → **hardcoded demo analysis** (honest, `isDemoData:true`) → first client invite. **Missing:** plan carry (above); no AI-consent capture (defensible only while the demo is fake data — flag for when real analysis enters this flow).
- **Retention:** onboarding step 5 (advisor connect) is the highest-leverage step and is skippable with zero follow-up. A day-2 "connect your advisor" nudge email is missing from the drip.

### 2.4 Policy upload
- **Goal:** get documents out of the drawer. **Entry:** onboarding, `/wallet/add`, batch modal (10-file cap), FAB on home. Agent-side upload for customers exists with consent attestation.
- **Friction / [GATES]:** the 4th policy on **batch** upload dead-ends in a `toast.error` with no upgrade surface (conversion audit row 1 — still the single highest-intent lost moment). Single-add uses the legacy modal.
- **Monetization:** this is Trigger A territory — already designed, needs the P1 fixes. Storage itself has no size cap and shouldn't be monetized (10MB/file is fine); **policy-count is the right meter.**
- **Missing:** no "email-in" ingestion (forward renewal PDFs to upload@…) — cheapest habit-forming acquisition surface an insurance wallet can have; fits the paper-heavy Greek market.

### 2.5 AI / OCR analysis & review
- **Steps:** extraction (free, with per-field confidence + citations flag-gated live) → review screen (confirm/flag) → deep analysis: 1 lifetime free, then paywalled.
- **Emotion:** the "aha" — the product's honest magic. Reviewing your own policy's fine print in Greek is the moment of belief.
- **[GATES] Conversion:** the free trial analysis is still invisible until used (conversion-audit row 3). Advertise it, then convert on the post-trial moment. Cheapest win in the funnel.
- **Trust:** review-state soft gate, "AI can make mistakes," flag-to-admin triage — excellent. Never gate the *review* of extracted data; it's the trust spine. Correctly free today.
- **Monetization nuance:** `aiAnalysisPerMonth` (Plus 25/mo) is display-only; the real limiter is the token budget. Marketing says "~5 analyses." Pick one meter and make the displayed number the enforced number — mismatched meters erode trust exactly where payment happens.

### 2.6 Policy understanding (detail page + Q&A)
- **Screens:** hero → summary + health donut → key dates/renewal trail → coverage tabs → exclusions/fine-print → perks → analysis tabs → recommendations (evidence blurred for free) → Q&A → claims guidance → agent timeline (locked for free) → documents (PDF preview Plus-gated) → savings report (Pro).
- **Emotion:** control; occasionally alarm (exclusions) — the page handles it with hedged tone.
- **Friction:** free users see the Q&A input *removed* (pre-empt card). The conversion audit's recommendation stands: **3 lifetime free questions** — Q&A is the aha free users never taste, and 3 questions cost ~45K tokens ≈ €0.008.
- **Monetization:** the strongest per-policy upsell inventory in the product (evidence blur, PDF lock, export card, collaboration lock) — all present, several on legacy checkout paths (P1 consolidation).
- **Retention:** the health donut and perks card are return-visit material but static — no score deltas, no "perk expires soon" on-page (perk emails exist, the surface doesn't).

### 2.7 Dashboard usage (/home)
- **Modules:** getting-started checklist, carried-plan card, usage meter (free ≥2 policies), stat tiles + protection score, portfolio premium summary, BranchCoverageMap, multi-insurer trigger, renewals timeline, quick actions, recommended actions, gaps widget, status row. All free-visible with honest teasers — right call.
- **Friction:** up to 4 stacked trigger cards for an active free user; dismissal keys exist, keep respecting them.
- **Retention:** the portfolio protection score shipped (#72) — now give it a **trend** (`ProtectionScoreSnapshot`, 15-area review §6). A number that never moves teaches users to stop looking; also the score-refresh cron is unscheduled [GATES].

### 2.8 Alerts & reminders
- **What exists and runs (daily crons):** engagement drip (d0/3/7), churn-prevention (d7/14/30/60 + d30 "bonus credits"), weekly digest, perk reminders, collaboration reminders, synthetic check. Notifications page with per-event email/push prefs exists.
- **[GATES]:** `renewal-check` — the one that matters — unscheduled (§1). And the churn d30 email grants **credits that cannot be spent anywhere** (ledger is display-only): a retention email making a false promise.
- **[GATES-adjacent] Entitlement leak:** all lifecycle email services check only `notificationPreference`, never the free tier's `notifications:false` or the `advanced_renewal_reminders` gate. Free users get everything Plus promises. Decide the free floor deliberately (recommendation: free gets the 30-day renewal email only — it's the honest reading of the marketing's «βασικές υπενθυμίσεις» — and Plus keeps the full 90/60/30/15/7 ladder + channel prefs), then make the code enforce whatever is decided.
- **Missing:** reminder-preference UI per policy/milestone (15-area review §8); push notifications wired but under-used.

### 2.9 Renewal journey
- **Policyholder:** home timeline + KeyDatesCard + «Request quote» → `requestRenewalQuote` notifies user + their agent. There is **no policyholder renewals page** — `/renewals` is agent-only (the conversion audit's "add triggers to /renewals" actually needs a *new surface*, not a trigger).
- **Agent:** full pipeline (pending→contacted→renewed/lapsed), premium-at-risk stats, batch reminders, outcome recording that completes tasks. This is the best-built B2B feature and the core of the wedge.
- **Emotion:** deadline anxiety — the moment PolicyWallet earns its keep, and the moment insurance money actually moves.
- **Monetization:** *do not* charge the policyholder to be reminded (trust-sensitive; also the marketing promises basic reminders). Monetize the agent side: the renewals pipeline is Starter's hero feature — fence `renewalAutomation` (Pro) as batch/auto-sequences vs manual (Starter). Long-term option (post-GA, IDD-sensitive): renewal quote-request routing to agents as a per-lead fee for policyholders *without* an agent — only with explicit user intent, never dark.
- **Retention:** a fired renewal ladder is the churn-killer for both sides. Nothing else in this audit beats scheduling one cron line.

### 2.10 Claims journey
- **State:** guidance-only `ClaimsGuidanceCard` (deadlines, insurer phone, ask-AI/ask-agent). No Claim model, no routes. Deliberate and correct pre-GA.
- **Trust rule:** claims guidance must stay free forever — a user mid-claim is at maximum vulnerability; charging there converts once and churns with prejudice, plus it's the moment reviews get written.
- **Post-GA seed (from 15-area review):** `ClaimDraft` → prepared insurer email/PDF. Monetize *preparation convenience* (Pro feature or one-time €4.90 "claim pack"), never outcome or urgency.

### 2.11 Provider / healthcare journey
- **State: absent.** Only aspirational copy in `honest-copy.ts` ("book appointments with doctors") — not wired anywhere; remove the copy or mark it roadmap. No provider network, no booking. **Verdict:** do not build for monetization now; if health-insurer partnerships emerge, this is a B2B2C conversation (insurer pays), not a consumer fee.

### 2.12 Broker / advisor collaboration
- **Policyholder side:** My Agent screen, invite-code redemption, collaboration timeline (Plus-gated, wall invisible for free — conversion row 4), share-policy by email (mints signup invites — a real viral surface).
- **Agent side:** CRM with per-customer intelligence (health score, cross-sell gaps, opportunity scoring), proposals, document requests, questionnaires, shared rooms, private notes, team/agency with seat caps and customer transfer.
- **[GATES]:** anonymous invite links bounce to signin (proxy); `AgentPlanGate` guards only 2 of ~18 sold features; commissions page ungated; "Contact Sales" on Agency fires a real €99.99 checkout; agent "Share Center" is dead code; branded reports sold-not-built.
- **Monetization:** this is the wedge (§4). The collaboration objects (proposals, doc requests, rooms) are exactly the Starter-tier fence — they exist and are given away.
- **Trust:** attestation trail and owner-consent enforcement are genuinely strong; keep consent un-gameable regardless of tier.

### 2.13 Household / family use
- **State: absent** (confirmed — `dependentsCount` and family history exist only as gap-rule inputs). Yet the gap rules (`dependents_no_life`, `family_history_no_life`) prove family risk is already the product's best emotional lever.
- **Opportunity (later):** Family plan at ~€4.99/mo (2 adults + dependents, shared wallet, per-member coverage view). It's the most natural ARPU expansion for Plus and the only tier that makes Greek households (where one person manages everyone's paperwork) legible. Requires a member domain — a product cycle, not a gate flag. Do not pre-sell it (trigger F correctly deferred).

### 2.14 Power-user workflows
- **Exists:** branches grid, analysis comparison (Plus, enforced at the API), token top-ups (Plus+), savings report (Pro), batch upload, PWA/offline.
- **Missing:** self-serve data export (trust gate, 15-area review §14); policy **archive/history** — expired policies just flip status; there is no year-over-year premium view. For a product whose pitch is "your insurance memory," the absence of memory is notable. An annual "Your Insurance Year" report (premium trend, gaps closed, score delta) is both a retention artifact and a natural **Pro** feature — and its one-time cousin (below) is a purchasable SKU.

### 2.15 Support, trust & error states
- **Strong:** AI consent gate, 10 AiDisclaimer placements, DSR queue, review-state honesty, BillingTrustBox, forbidden-urgency copy tests, empty states (#50).
- **[GATES]:** the four dishonesty bugs — fake social proof, dead referral promise, unspendable bonus credits, "cancel anytime" with no cancel path. Each is small; together they are a pattern the product cannot afford in a trust category.
- **[POLISH]:** stale copy — `subscription-copy.ts` advertises "20% annual discount, coming soon" while annual is live at ~2-months-free.

### 2.16 Cancellation & reactivation
- **[GATES]:** No working path (§1 #2). Fix = persist `stripeCustomerId` in `handleSubscriptionSuccess`, make `cancelSubscription` call Stripe (cancel-at-period-end), backfill existing subscribers' customer IDs from Stripe.
- **Design once fixed:** cancel-at-period-end + one honest save-offer (switch to annual at the discount, or pause) + exit survey. No retention dark patterns — this product's brand is the anti-fine-print. Reactivation: winback email at period-end + the grandfathered-subs courtesy note already in STATUS housekeeping.

### 2.17 Referral & sharing loops
- **Real loops:** agent→client invites (works, blocked at anonymous entry [GATES]); policy-share invites to non-users (works).
- **Fake loop:** friend referral (§1 #3). **Decide:** either wire it (store codes, `/join/[code]` route, credit via Stripe coupons on checkout — models already exist) or delete the tab this week. A visible broken promise is worse than no program.
- **Recommendation:** wire it — referral credit is the only B2C acquisition channel that fits a trust product, and `Referral`/`CreditTransaction` are already in the schema.

### 2.18 Partner / insurer / enterprise journeys
- **State: absent** — no insurer role, no partner API (the `apiAccess` flag is never read; api-docs is internal Swagger), no outbound webhooks, no white-label beyond per-agent branding fields, no admin comp/plan-grant tooling.
- **Verdict:** correct for now. Do not build API/white-label speculatively; **stop selling them** until built (they appear on the pricing page today). The realistic enterprise sequence is: agencies (exists, needs consolidated billing) → bancassurance/insurer white-label discussions with the agent product as proof — a 2027 conversation.

---

## 3. Feature-by-feature monetization audit

Classification: **U** = utility (charge for capacity/convenience), **T** = trust (never aggressively monetize), **M** = monetization surface (sell here).

| Surface | Class | Today | Verdict |
|---|---|---|---|
| Policy storage/wallet (3/10/∞) | U | The core meter | Correct meter. Keep 3 free; it's the whole freemium engine. |
| Extraction + review screen | T | Free, all tiers | Keep free forever — it's the trust spine and the aha. |
| Deep AI analysis | M | 1 free lifetime → Plus | Right. Advertise the free one (P1); post-trial convert. |
| AI Q&A | M | Free: 0, input hidden | Grant 3 lifetime free questions (~€0.008 COGS); then Plus. |
| Gap detection + evidence | M/T | Gaps visible, evidence blurred (free) | Right pattern (real data only, no fear-selling). Keep. |
| Recommendations / AI insights | M/T | Free w/ blur; anti-salesy exclusions | Keep honest; never inject paid product placement into recs. |
| Health/protection score | U | Free, no trend, refresh cron unscheduled | Fix cron [GATES]; add trend; keep free (it's the return hook). |
| Renewal timeline & basic reminder | T | Timeline free; emails dormant [GATES] | Schedule cron. Free floor = 30-day email; ladder+prefs = Plus. |
| Advanced reminder prefs/channels | M | Entitlement exists, no UI, leaks to free | Build the prefs surface; enforce the gate; this is Plus's clearest daily value. |
| Perk/benefit-utilization prompts | T→M | Perk emails cron live, all tiers | Keep free (delight + differentiation); later: "perk concierge" summaries in the annual report (Pro). |
| Analysis comparison | M | Plus, enforced | Fine. Surface it more (it's invisible in UI). |
| PDF preview | M | Plus-gated | Keep — mild, honest gate. |
| Savings report export | M | Pro, per-policy route live | Keep Pro. Also the engine for the one-time Check-Up SKU. |
| Historical / annual report | — | Absent | Build "Your Insurance Year": Pro feature + one-time purchasable (€6.90) for non-subscribers. |
| Sharing / policy invites | T | Free, viral | Keep free — it's distribution, not a feature. Fix anonymous entry [GATES]. |
| Collaboration timeline (policyholder) | M | Plus; wall invisible for free | Add the trigger (conversion P1 row 4). |
| Claims guidance | T | Free static card | Never gate. Future claim-pack = convenience fee only. |
| Compliance (consent, DSR, export) | T | Strong; export admin-only | Ship self-serve export; never monetize any of it. |
| Token top-ups | M | 4 packs €1.99–€29.99, Plus+ | Keep as relief valve; card-test it (STATUS next-action); don't lead with tokens in B2C UI. |
| Agent CRM + intelligence | M | Free-to-all beyond caps | Fence per matrix (§4). The B2B product *is* this. |
| Agent renewals pipeline | M | Real, cron-dependent | Starter hero. `renewalAutomation` (sequences) = Pro fence. |
| Commissions dashboard | M | Estimate ×15%, ungated | Gate to Pro as sold; label as estimate until real accounting exists. |
| Proposals / doc requests / rooms | M | Built, given away | Fence at Starter as sold. |
| Cross-sell intelligence / financials | M | Financials blurred (Pro); cross-sell open | Fence cross-sell at Pro as sold. |
| Branded reports / white-label | M | **Sold, not built** [GATES] | Build branded PDF (Starter) or remove from pricing page this week. |
| Team / agency seats | M | Real caps, per-account billing | Consolidated agency billing before pushing Agency tier. |
| Partner API / outbound webhooks | — | Absent, but sold on Pro | Stop selling until built. Build only against a named customer. |
| Referral credits | M | Theater [GATES] | Wire via Stripe coupons or delete the tab. |
| Admin comp/plan grant | U | Absent | Add a minimal admin grant (support tool + partner pilots need it). |

**Monetization-model checklist** (from the brief): Free plan ✓ (keep generous); freemium conversion ✓ (P1 fixes pending); paid tiers ✓; family plan — later, real build; premium AI ✓ (analysis/Q&A); document storage — don't meter bytes, meter policies; automation/reminders ✓ Plus (after enforcement); concierge/expert help — **yes, one-time** (migration concierge €29; agent-delivered); one-time policy review — **yes, flagship one-time SKU**; one-time audit/report — **yes** (annual report €6.90); claim assistance — later, convenience-fee only; setup/migration fee — **yes for agencies** (book import service €99–€299); add-ons ✓ (tokens); white-label licensing — not yet, stop pre-selling; enterprise/B2B2C — 2027 path via agencies; API access — demand-driven only; usage-based pricing — no for B2C beyond packs (tokens confuse consumers; the displayed meter must equal the enforced meter); referral/partner revenue — referral credits yes, paid insurer placement **no** (fatal to the independent-analysis trust position); transaction fees — only ever the post-GA quote-routing lead fee, opt-in and disclosed.

---

## 4. Pricing model recommendation

**Keep the B2C price points this cycle** (consistent with the conversion audit): Free €0 / Plus €2.99·€29 / Pro €9.99·€99 + 14-day Pro trial. The problems are presentation and integrity, not the numbers:

1. **Annual-first everywhere.** Stripe's fixed fee makes monthly €2.99 lose ~11.4% vs ~3.8% on annual — fix the paths where annual is unreachable (`/upgrade`, account cards) before touching prices. Update the stale "20% discount coming soon" copy.
2. **One meter.** Show what you enforce (token-derived "analyses" estimates vs the display-only 25/mo counter). Users at the payment moment must never see two different numbers.
3. **Kill the `ph-premium` orphan** (€24.99 seeded, RevenueCat-mapped, resolves to *free* entitlements) — a paying mobile subscriber would get nothing. Map it to Pro or delete it everywhere. **[GATES]**
4. **Add one-time SKUs (new):**
   - **Policy Check-Up — €9.90 one-time, per policy** (deep analysis + unlocked evidence + savings report for that policy, no subscription). Greece has a large pay-once-never-subscribe segment; this converts them at the exact aha moment and reuses existing infra (orchestrator + savings-report route + payment-mode checkout already built for tokens). Steer to subscription with "€9.90 credited toward your first year of Plus" once coupons are wired.
   - **Your Insurance Year — €6.90 one-time** (annual portfolio report; free preview, Pro includes it).
   - **Migration concierge — €29 one-time** ("we digitize your folder": user mails/photographs everything, human+AI does the rest). High-trust, high-margin, perfect for the older half of the Greek market; agents can deliver it.
5. **Agent B2B: fence before you upsell.** Do not raise agent prices; make the tiers true. Enforce the sold flags (proposals/doc-requests/rooms → Starter; commissions/cross-sell/financials/renewal-automation → Pro), build the branded PDF report (Starter's marquee), fix Agency "Contact Sales" (today it fires a real checkout), and add an **agency book-import service (€99–€299 one-time)** as the adoption unlock. Consolidated per-seat agency billing before pushing the €99.99 tier.
6. **Do not** adopt usage-based pricing for consumers, paid insurer placement in recommendations, or any charge on claims guidance, renewal-date accuracy, consent, data export, or cancellation. These are the trust surfaces the whole model stands on.

---

## 5. Revenue opportunity matrix

Impact = expected revenue/retention effect at current scale trajectory; Effort = engineering; Conf = confidence it pays.

| # | Opportunity | Model | Impact | Effort | Conf | Trust-sens. | Note |
|---|---|---|---|---|---|---|---|
| 1 | Schedule `renewal-check` (+score-refresh) crons | retention | ★★★★★ | trivial | high | high (promise) | One line in vercel.json + verify. Everything else compounds on this. |
| 2 | Fix cancellation (customerId persist + Stripe cancel + backfill) | trust/legal | ★★★★★ | S | high | maximal | Protects all revenue; legal exposure until fixed. |
| 3 | Conversion P1 set (batch-upload surface, checkout consolidation, advertise free analysis, collab trigger) | subscription | ★★★★ | S–M | high | low | Already specced in conversion audit. |
| 4 | Unblock `/invite/[token]` + waitlist in proxy | growth | ★★★★ | trivial | high | low | Distribution loop + lead capture, both dead today. |
| 5 | Agent tier fencing (enforce sold flags; gate commissions) | B2B sub | ★★★★ | M | high | med (honesty) | Makes Starter→Pro upgrades rational. |
| 6 | Branded agent PDF report | B2B sub | ★★★ | M | high | low | Sold today, unbuilt; Starter's marquee. |
| 7 | Policy Check-Up €9.90 one-time | one-time | ★★★★ | M | med-high | med | Reuses analysis+report+payment-mode infra. |
| 8 | Free floor: 3 lifetime Q&A + 30-day renewal email, enforce email gates | conversion | ★★★ | S | high | high | Resolves marketing/entitlement contradiction deliberately. |
| 9 | Real referral program (codes, /join route, Stripe coupon credit) | growth | ★★★ | M | med | high (promise) | Or delete the tab now; theater is worse than nothing. |
| 10 | Annual-first on all paths + copy fix | ARPU | ★★★ | S | high | low | Pure fee-economics gain. |
| 11 | Renewal-prefs UI + policyholder renewals surface | retention | ★★★ | M | high | high | Makes Plus's daily value visible. |
| 12 | Migration concierge €29 / agency book-import €99–299 | one-time | ★★★ | M (ops) | med | high | Ops-heavy; pilot manually first. |
| 13 | "Your Insurance Year" report (Pro + €6.90 one-time) | mixed | ★★ | M | med | low | Also fills the missing archive/history story. |
| 14 | Agency consolidated billing | B2B | ★★ | M–L | med | low | Prereq for pushing €99.99 tier. |
| 15 | Family plan €4.99 | subscription | ★★★ (later) | L | med | med | Needs member domain; strongest 2027 ARPU lever. |
| 16 | Claim-pack / quote-routing lead fees | one-time/txn | ★★ (later) | L | low-med | maximal | Post-GA, IDD counsel first. |
| 17 | ph-premium orphan fix | integrity | ★ (defensive) | trivial | high | high | Prevents a paying-user-gets-nothing incident. |
| 18 | Remove fake social proof / stale copy | trust | defensive | trivial | high | maximal | Do this week. |

---

## 6. Prioritized roadmap

**Now — integrity week (all [GATES], ~days):**
1. `vercel.json`: add `renewal-check` + `protection-score-refresh` crons; verify first firing in prod logs.
2. Cancellation: persist `stripeCustomerId` in `handleSubscriptionSuccess`; `cancelSubscription` → Stripe cancel-at-period-end; backfill customer IDs; extend money-path E2E to pin "subscriber can open portal and cancel."
3. Proxy allowlist: `/invite/`, `/api/v1/landing/waitlist` (+ set `HUBSPOT_ACCESS_TOKEN` or park the form).
4. Honesty sweep: remove fabricated stats; delete or wire the referral tab; fix "20% coming soon" copy; stop selling API/white-label/branded-reports bullets until built; fix Agency "Contact Sales"; kill or map `ph-premium`.

**Next — the conversion + wedge sprint (2–4 weeks):**
5. Conversion-audit P1 set (batch-upload modal, checkout consolidation, advertise free trial analysis + post-trial CTA, collab trigger, annual on all paths).
6. Free-floor decision implemented: 3 lifetime Q&A, 30-day free renewal email, email services enforce entitlements.
7. Agent fencing wave: gate proposals/doc-requests/rooms/questionnaire-caps (Starter), commissions/cross-sell/financials/renewal-automation (Pro); build branded PDF report.
8. Policy Check-Up SKU (payment-mode checkout, per-policy unlock flag, post-purchase upsell coupon).
9. Renewal-prefs UI + policyholder renewals block; protection-score snapshots/trend.

**Later — expansion (quarter+):**
10. Real referral program; agency consolidated billing; migration-concierge pilot (manual ops first); "Your Insurance Year"; self-serve GDPR export (trust, from 15-area review); family-member domain → family plan; claims ClaimDraft seed; insurer/B2B2C conversations only after agent traction.

---

## 7. Final verdict

PolicyWallet's product is better than its business right now. The trust architecture (consent, honesty, review flows, no-dark-pattern copy) is ahead of most fintech at this stage, and the conversion system is a solved problem awaiting its P1 list. What's actually broken is not pricing or lack of upsell surfaces — it's that **the product's promises outrun its plumbing** in four places: reminders that never send, a cancel button that doesn't cancel, credits that don't exist, and a B2B feature list that's mostly unfenced or unbuilt. Every one of those is cheap to fix and every one compounds: the renewal cron powers retention *and* the agent wedge; the cancellation fix protects every euro of MRR; the invite fix opens the only zero-CAC channel.

The strategy this audit lands on: **agents are the customer, policyholders are the network, renewals are the engine.** Charge consumers gently (generous free tier, €2.99/€9.99 subscriptions, a €9.90 one-time Check-Up for the subscription-averse), charge agents honestly (fence what's sold before selling more), and never charge for trust. Do the integrity week first — it costs days and it's the difference between a monetization strategy and a monetization liability.

---

## 8. Addendum — second independent sweep (13 Jul, same brief)

_A second session ran the same audit brief independently the same day (three sweeps: billing/entitlement trace, journey/surface map, AI-pipeline + docs inventory). The body above stands unchanged; this addendum records only verified deltas the main body does not cover, plus points of divergence for the product owner to settle. Every code claim below was re-verified against the working tree on 13 Jul._

### 8.1 Additional [GATES] findings

- **The live v1 webhook handles only `checkout.session.completed`** (`app/api/v1/billing/webhook/route.ts:52`) — no `invoice.payment_failed`, no `customer.subscription.updated/deleted`. There is **no dunning**, and cancellations/changes made inside Stripe never sync back; only the **deprecated** `/api/stripe/webhook` handles lifecycle events. This compounds §1 #2: even after the portal/cancel fix, subscription state depends on which endpoint is registered in the Stripe dashboard.
- **`handleSubscriptionSuccess` hardcodes `currentPeriodEnd = +30 days`** (`lib/billing.ts:285`) — annual buyers and 14-day Pro trialists get a wrong local period that nothing corrects, because the invoice webhooks that would fix it are unhandled (above).
- **Conflicting agent plan seeds**: `prisma/seed.ts:280-346` seeds `ag-free/ag-starter/ag-pro` at €0/€49/€199 while migration `20260321160000_agent_plan_seed` seeds `agent-*` at €0/€19.99/€49.99/€99.99 — and `normalizeAgentTier` recognizes only the migration names, so a fresh seed mints mis-priced orphan rows. Same family as the `ph-premium` orphan (§4 #3); fix together.
- **Agent token top-ups are priced but unbuyable**: `AGENT_PRICING.tokenTopUpEur` (€1.99/€0.99/€0.49 per 100K by tier) has no consuming checkout — the only top-up path is the B2C `TOKEN_PACKAGES` route. Agents who exhaust 2M–25M budgets mid-month have money in hand and no shelf.
- **Dead monetization code to delete before it misleads a future session**: `requirePayingUser` (`lib/auth-helpers.ts:71`, zero call sites), `getIsPayingUser` computed on every protected page-load and never read (`app/(protected)/layout.tsx:26`), `lib/billing-catalog.json` (real Stripe price IDs, unused at runtime — checkout builds dynamic `price_data`), unwired `CurrentPlanCard`/`TokenUsageCard`/`UpgradePrompt` variants, and `PolicyWalletClient`'s push to the nonexistent `/wallet/[id]/share` route.

### 8.2 Additional opportunities not covered above

- **Agent-sponsored client analyses** — the adopted [TOKEN_ECONOMICS_2026-07.md](../planning/TOKEN_ECONOMICS_2026-07.md) §4.1 roadmap item: attribute an invited client's first analysis to the sponsoring agent's token budget (agents carry 40–76% margins). This is the mechanism that makes §1's wedge *compound* — agents fund consumer acquisition at zero platform CAC and get analyzed clients (= opportunities) in return. Pairs directly with the `/invite/[token]` proxy unblock in the integrity week.
- **Employee benefits (B2B2E) as the nearer enterprise wedge**: `/product/group-health` and `/product/group-pension` marketing pages already exist with no product behind them. An employer-distributed deployment — employees get PolicyWallet with group policies preloaded, the broker who sold the group policy administers via the existing agent portal — reuses the whole product and is a 2026 pilot (one Greek benefits broker), versus the 2027 insurer/white-label track in §2.18. Per-employee-per-month pricing.
- **€1.49 à-la-carte single analysis** (adopted in TOKEN_ECONOMICS §5.3, ~80% margin post-routing) as the low anchor *below* §4's €9.90 Check-Up: one deep analysis, no report, no evidence unlock. Show only on the second+ gate encounter so it never cannibalizes the Plus decision at first contact.
- **Agency per-seat pricing**: `teamMembers: null` (unlimited) at flat €99.99 (`lib/subscription-entitlements.ts:152`) leaves the largest agencies paying the same as a 4-person shop. When consolidated agency billing lands (§6 #14), price per-seat beyond 5. ⚑ pricing change, next cycle.
- **Viber/WhatsApp reminder channels**: modeled in `lib/notifications.ts` (channel enum), unbuilt. In Greece these outperform email open rates by multiples — the clearest *felt-daily* Plus differentiator available, and it strengthens the renewal engine.
- **Write the "constitutionally free" list into code**: a comment block in `lib/monetization/feature-gates.ts` naming the never-gate surfaces (extraction + review, claims guidance, basic 30-day renewal email, GDPR export/deletion, consent flows, help center) so no future conversion pass "optimizes" them behind a gate.

### 8.3 Willingness-to-pay experiments (run before building any SKU)

1. **Fake-door the one-time SKUs**: on the analysis gate's second+ hit, show "Μία ανάλυση χωρίς συνδρομή — €1.49" / "Policy Check-Up €9.90" buttons → measure clicks → fulfill the first cohort via a Stripe payment link + manual unlock before building UI.
2. **Concierge €29**: email stalled onboarders (≥1 upload then 7 days inactive — the drip cron can already segment this) offering "we digitize your folder"; count replies before building anything.
3. **Pre-renewal review**: once `renewal-check` fires, add a purchase CTA to the 30-day milestone email for a cohort; the artifact can initially be hand-assembled from existing analysis output.
4. **Agent lead WTP**: survey the live agent base (admin has emails) — per-qualified-lead vs included-in-Pro decides whether lead flow is metered or a tier fence.
5. **Plus at €4.99**: new-cohort price test post-GA only, and only after the pricing single-source consolidation (conversion audit §1 names ~8 definition sites); never reprice existing subscribers. ⚑

### 8.4 Points of divergence (product-owner decisions, not defects)

- **Family**: §5 #15 proposes a separate ~€4.99 family plan; the second sweep argues for making **Pro the household plan** (members + shared dashboard + cross-member gap analysis) because Pro's current value story is thin at 3.3× Plus. Either works; pick one — don't build both.
- **One-time price points**: §4 proposes €6.90/€9.90/€29; the second sweep (anchored on TOKEN_ECONOMICS) proposes €1.49/€4.90/€9.90/€19.90. Converge on one SKU table before the first fake-door test so the experiment measures the real offer.
- **Wedge sequencing**: same strategy (agents are the customer, renewals are the engine), different fourth unlock — the main body's integrity week (cron + invite + fencing) plus the second sweep's **sponsorship attribution** on `createRun`. Recommend shipping attribution in the same sprint as the invite unblock: the loop only demonstrates ROI to agents when both ends are live.

---

## 9. Status ledger — what shipped in the six days after (19 Jul 2026)

_Added 19 Jul 2026, verified against the working tree at `8949f5a` — code, not changelogs: every "fixed" below was re-checked at the cited file or route. §1–8 stand unchanged above as the historical record._

### 9.1 The four headline defects (§1)

- **Retention engine — FIXED, in two acts.** The integrity week (14 Jul) scheduled `renewal-check` + `protection-score-refresh` in `vercel.json` — and they *still* didn't fire: `proxy.ts` 307-redirected every cron to signin (Vercel counts a 307 as a successful ping), and the routes were POST-only while Vercel Cron issues GET. **#123 (17 Jul)** allowlisted `/api/v1/jobs/` and exported GET on all 8 cron routes; verified live (unauthenticated GET now 401s — handler reached, `CRON_SECRET` enforced; daily at 05:00/07:00 UTC). The free floor shipped *exactly as §2.8 recommended*: free tier gets the 30-day email only, the full 90/60/30/15/7 ladder is entitlement-gated (`lib/services/renewal.service.ts`).
- **Cancellation — FIXED (14 Jul).** `cancelSubscription` now calls Stripe cancel-at-period-end and surfaces errors (`account/actions.ts:403`); `stripeCustomerId` persisted on *all* fulfillment paths so the billing portal works; `currentPeriodEnd` mirrors Stripe (annual/trial-aware); the v1 webhook gained lifecycle sync (`lib/services/billing/stripe-lifecycle.ts`: subscription updated/deleted, invoice paid/failed → dunning via `past_due`) — closing §8.1's two webhook findings in the same stroke; `scripts/backfill-stripe-billing.mjs` repairs pre-fix subscribers; the money-path E2E pins a cancel block. "Cancel anytime" is true now.
- **Growth loops — FIXED where real, retired where theater.** `/invite/` is allowlisted in `proxy.ts:93` — the agent→client loop admits anonymous visitors, and #151 hardened it (redemption bound to the invited email; accepting an invite now sets `activationStatus` so the agent actually sees the customer). The newsletter was rebuilt rather than unblocked: the dead HubSpot waitlist route is deleted; the footer POSTs to `/api/v1/newsletter/subscribe` (Brevo sink, `FormSubmission` persisted before any network call, honeypot). The referral tab is deliberately not rendered (`AccountClientPage.tsx:56`) until a real earn/redeem exists — the false promise is gone; the program itself is still unbuilt (row 9 below).
- **B2B tier matrix — PARTIAL, mostly true now.** #142 de-listed `apiAccess` and softened the branded-reports claim; #145 enforced `brandedPortal` + `pipelineAnalytics` server-side (the blur had been cosmetic); **#147 then built branded reports** — agent-branded report behind a real `brandedReport` entitlement (shipped Pro+, not the Starter marquee §4 proposed); the commissions page is tier-locked (`CommissionsLocked`); manual re-analysis is paying-only across all four triggers (#159); and #160/#161 moved the whole matrix into an admin-managed DB catalog (strict-Zod, fail-closed to code defaults) that *every* advertised figure renders from — pricing-page drift from enforcement is now impossible by construction. Still open: fencing proposals/doc-requests/rooms at Starter (§4 #5) remains a product call.

### 9.2 Recommendations superseded by owner decisions

- **§4's price header — SUPERSEDED (14 Jul, paid-aha-loop v1):** not "Free / Plus €2.99 / Pro €9.99" but Free **1 policy, zero paid AI**; **Starter €2.99/€29** (5 policies, organizer + basic reminders, no AI); **Plus €7.99/€79** (all AI, unlimited, 14-day trial). Code keys unchanged. Since #160 the tier matrix lives in the admin-managed `plans` catalog — price and capacity experiments are admin edits, not deploys.
- **3 lifetime free Q&A (§2.6, row 8) — SUPERSEDED:** `FREE_LIFETIME_QUESTIONS = 0`. The owner chose a hard free/AI split — free converts via the basic parsed summary + locked-insight grid, not free tastes of AI.
- **The one-meter problem (§2.5) — dissolved rather than fixed:** Plus is unlimited-AI and Starter/free are zero-AI (`aiAnalysisPerMonth: 0/0/null`), so the display-only "25/mo" counter no longer exists to disagree with the token budget.
- **`ph-premium` orphan (§4 #3) — FIXED:** orphan seed removed; RevenueCat premium remapped to `ph-pro`; grandfathered rows keep resolving via nullable `tierKey` + `normalizeTier` (#160). A legacy subscriber lands on real Plus entitlements, not free.

### 9.3 The §5 matrix, row by row

| # | Opportunity | Status | Where it landed |
|---|---|---|---|
| 1 | Renewal + score crons | FIXED | Scheduled 14 Jul; actually firing since #123 (17 Jul) — see §9.1. |
| 2 | Cancellation | FIXED | Integrity week + lifecycle webhooks + backfill script. |
| 3 | Conversion P1 set | PARTIAL | Batch-upload cap now routes to the UpgradeModal (14 Jul). "Advertise the free analysis" is moot — the free deep analysis was removed with the tier restructure; `PremiumInsightCards` is the new post-parse conversion surface. |
| 4 | Invite + waitlist unblock | FIXED | `proxy.ts` allowlists `/invite/`; newsletter rebuilt on Brevo (waitlist route deleted). |
| 5 | Agent tier fencing | PARTIAL | #145/#147/#159 + DB-driven fail-closed entitlements (#160). Starter fence for collaboration objects still undecided. |
| 6 | Branded agent report | BUILT | #147 — visibility-checked route, `brandedReport` entitlement (Pro+), marketing re-enabled honestly. |
| 7 | Policy Check-Up €9.90 | PARTIAL | The €3 per-policy gap-report unlock (13 Jul, `report_unlock_purchases`, mode:payment) is the shipped cousin; the full SKU is unbuilt. |
| 8 | Free floor decision | DECIDED | 30-day renewal email floor enforced as recommended; free Q&A rejected (§9.2). |
| 9 | Real referral program | OPEN | Tab hidden 14 Jul (theater removed); nothing wired yet. |
| 10 | Annual-first everywhere | PARTIAL | `annualPrice` is first-class in the catalog every surface renders (#160/#161); stale "20% coming soon" copy fixed. Annual-*default* presentation not re-audited. |
| 11 | Renewal-prefs UI + policyholder renewals surface | OPEN | — |
| 12 | Concierge €29 / book-import €99–299 | OPEN | — |
| 13 | "Your Insurance Year" | OPEN | — |
| 14 | Agency consolidated billing | OPEN | But Agency "Contact Sales" now routes to `/contact` instead of firing a live €99.99 checkout. |
| 15 | Family plan | OPEN | Deliberately deferred, as recommended. |
| 16 | Claim-pack / lead fees | OPEN | Deliberately post-GA, as recommended. |
| 17 | `ph-premium` orphan | FIXED | §9.2. |
| 18 | Fake social proof / stale copy | FIXED | Landing stats replaced with true facts (14 Jul); #166 continued the honesty sweep across marketing. |

**§8 addendum items:** webhook single-event handling and the hardcoded `currentPeriodEnd` — FIXED (§9.1); conflicting agent plan seeds — FIXED (seeds aligned with the migration, orphans removed); agent token top-up shelf, sponsorship attribution, B2B2E pilot, Viber/WhatsApp channels, per-seat Agency pricing, the "constitutionally free" code comment, and the WTP experiments (§8.3) — all OPEN. The deprecated dual webhook is a tracked [LAUNCH] item in [agent-checkout-billing-audit-2026-07.md](agent-checkout-billing-audit-2026-07.md).

### 9.4 Found after this audit (things §1–8 couldn't know)

- **A checkout-integrity class this audit missed:** agent checkout charged **€61.99 for the advertised €49.99** — VAT-inclusive prices treated as net, +24% on top — plus a false "14-day free trial" badge on Agent Pro. Both fixed and deployed (#141); the Stripe-Tax compliance tail (itemized contained VAT, VAT-ID collection) is specced as [LAUNCH].
- **The collaboration wedge got its plumbing (#149–#155):** five cross-side notifications that fired into the void now reach the counterparty in their language; the questionnaire loop was broken at three points (the customer literally couldn't open the form — `/tasks/[id]` ignored its param); proposals gained the missing decline/counter UI and accepted proposals now create WON opportunities; the customer "My Agent" page finally has the promised shared-access ledger with per-policy revoke. §2.12's wedge thesis holds; its trust story is materially stronger.
- **Partner-offers program (#162–#164), a new retention/ARPU surface** in the §3 "perk concierge" direction: vendor/offer catalog, tier-partitioned `/benefits` with locked teasers behind a new `partner_offers` gate, marketing ships dark until the first vendor is signed (catalog seeds empty, per the honesty rule).
- **Full English mirror (#168):** 24 `/en` routes with per-locale SEO — the diaspora audience §2.2 flagged now has a first-class funnel. Signup remains Greek-mobile-only, still no social login.
- **Unit-economics caveat:** token metering under-reported `cost_eur` by **1000×** (per-1K prices against a per-1M divisor; fixed in #157). Historical rows carry the old scale — re-derive any COGS reading from post-fix data before leaning on §1's margin framing.

**Net:** the integrity week did what §6 predicted — days of work closed all four headline defects, and the plumbing (crons, cancel, invites, webhooks) now matches the product's promises. What remains from this audit is the *build* list, not the repair list: the one-time SKUs, the referral program, the renewal-prefs surface, and the agent top-up shelf.
