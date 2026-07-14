# Free→Paid Conversion Audit — July 2026

_Growth-PM / CRO audit of the live conversion system against the full conversion brief. Grounded in code as of `NEW-UI` @ `599cbfc` and the shipped conversion overhaul (PRs #59–#63, #66). Method: full route/component/config inspection (two systematic sweeps), entitlement + billing code trace, and the 9/9 money-path E2E suite (which drives checkout returns, gates, and the mobile trigger in a real browser). Findings separate **[GATES]** (broken/dead-end journeys) from **[POLISH]** (optimization)._

## 0. Headline verdict

The conversion foundation requested by the brief **already exists and is largely excellent**: a central feature-gate registry (10 of the 12 target keys), a context-aware `UpgradeModal` with billing toggle + trial + `returnTo`, bilingual no-dark-pattern copy with a forbidden-urgency test, 12+ live trigger placements, server-side funnel mirroring, and an admin funnel card. The checkout is 4 clicks (trigger → pay CTA → Stripe → continue) and returns the user to the exact feature — the brief's target journey, verbatim.

The losses are at the edges: **two parallel checkout systems** (the two highest-intent moments use the worse one), **one limit path that dead-ends in a toast**, **an invisible collaboration wall**, **a hidden free "aha" (the complimentary deep analysis) that the UI never advertises**, and a post-upgrade moment that doesn't use the per-feature success copy that already exists.

## 1. Current pricing model (actual, not the working model)

A final model exists, live in Stripe + entitlements — the brief's fallback model is NOT needed:

| Plan | Price | Policies | Deep analyses | AI Q&A | Key flags |
|---|---|---|---|---|---|
| Free | €0 | 3 | 0/mo **+ 1 lifetime trial analysis** | 0/day | all premium flags off |
| Plus (`ph-plus`) | €2.99/mo · €29/yr | 10 | 25/mo | 25/day | most flags on |
| Pro (`ph-pro`) | €9.99/mo · €99/yr · **14-day trial** | unlimited | unlimited | unlimited | + export, priority, advanced analytics |

Agent B2B model also exists (separate planType, not to be conflated): agent_free → Starter €19.99 → Pro €49.99 → Agency €99.99, enforced via `AGENT_ENTITLEMENT_LIMITS`, upsold via `AgentPlanGate` → `/agent/pricing` (legacy pattern only — no context modal; see §10).

**Deltas vs the brief's working model:** names (Plus/Pro vs Essential/Professional) and Pro price (€9.99 vs suggested €19.99). Both are strategy decisions, not defects; the €9.99 Pro with a 14-day trial is coherent. Flagged, not recommended for change in this cycle.

**Pricing definition drift risk [POLISH]:** prices are defined in ~8 places (feature-gates PLAN_PRICING, public-pricing-content, subscription-copy, billing.ts annual map, Stripe catalog script, SEO copy, DB plan rows). No numeric drift today; parity tests cover only 2 of 8. The **charged** price (DB `plan.price`) is pinned by no test.

## 2. Current free-user journey (verified floor)

Upload → **full extraction + review screen free** (no tier gate) → **one lifetime complimentary deep analysis** (race-guarded server-side) → gaps/summary visible → then: 3-policy cap, 0 Q&A/day (input never rendered; pre-empt card instead), 0 further analyses, gap-evidence blurred, export/PDF-preview/collaboration locked.

- ✅ First aha unblocked: extraction, review, key dates, first deep analysis all reachable free. No hard paywall before value. (Brief §5/§13 core requirement: **met**.)
- ⚠️ **[GATES] The free trial analysis is invisible until used.** Nothing in the UI says "your first full analysis is free." Users likely discover it accidentally or bounce before clicking Run Analysis. This is the single cheapest conversion win: advertise the free analysis, then the post-analysis moment ("that was your free one — Plus gives you 25/month") is the natural Trigger B.
- ⚠️ **Free floor vs brief §13 (product decisions needed, not code defects):**
  - Brief: free users "ask at least one AI question." Actual: **0** — the pre-empt card replaces the input. Recommendation: grant **3 lifetime free questions** (mirrors the trial-analysis pattern; Q&A is aha #5 and currently free users never taste it).
  - Brief: free users "get at least one renewal reminder." Actual: `notifications: false` for free — renewal timeline is visible but **no reminder notifications are sent to free users**, while marketing copy promises "βασικές υπενθυμίσεις." Recommendation: grant free users the basic 30-day-before email (retention hook that re-triggers conversion) **or** correct the marketing claim. Decide explicitly — this touches entitlements.

## 3. Current upgrade journey (traced)

**Modern path (standard):** contextual trigger → `UpgradeModal` opens in place (plan auto-recommended, monthly/annual toggle, trial line, trust box) → `POST /billing/checkout {planId, period, returnTo, triggerSource}` → Stripe hosted page (VAT included) → `/upgrade/success` verifies session server-side (webhook-independent, idempotent) → **Continue** deep-links to the original feature → entitlements re-resolve on navigation. ✅ 4 clicks, context preserved on every modern trigger (explicit `returnTo` or pathname fallback). This matches the brief's §7 target journey exactly.

**Legacy paths (the problem):**
1. `AnalysisCard` + single-add `AddPolicyClient` → `LimitReachedModal`/`UpgradePrompt`: **monthly-only, no billing toggle, no trial line, different visual system.** These are the two highest-intent moments in the app (analysis blocked, policy cap on add) — served by the weakest flow.
2. Desktop wallet "Run Analysis" → `router.push("/upgrade?reason=ai_analysis")` — a generic-pricing-page detour the brief explicitly says to avoid.
3. `/upgrade` page + Account overview cards call `upgradeSubscription(..., 'monthly', ...)` — **annual is unreachable** on these paths (brief: "make annual attractive but do not hide monthly" — here it's annual that's hidden).

## 4. Audit table (screen × issue × recommendation)

| # | Screen / flow | Current issue | Opportunity | Recommended trigger/CTA | Psychology | Sev | Cx | Files |
|---|---|---|---|---|---|---|---|---|
| 1 | Batch upload (4th policy) | Server 403 → `toast.error` dead-end; no upgrade surface | Highest-intent moment (user holds more documents in hand) | `UpgradeModal` `policy_upload_limit`/`batch_upload_limit`, returnTo `/wallet/add`; copy = existing Trigger-A set | Momentum: they're mid-task with docs ready | **High** | Low | `components/wallet/BatchUploadModal.tsx:187` |
| 2 | Analysis blocked (detail + wallet) | Legacy `LimitReachedModal` / `/upgrade?reason=` detour; monthly-only, no trial, context loss on detour | Consolidate to `UpgradeModal` (`full_ai_policy_analysis`, returnTo = policy page) | "Ξεκλείδωμα πλήρους ανάλυσης" (copy exists) | Desire at peak: user just asked for the analysis | **High** | Med | `AnalysisCard.tsx:719`, `PolicyWalletClient.tsx:62-65`, `AddPolicyClient.tsx:396` |
| 3 | Free trial analysis | Exists server-side, never advertised; no post-consumption follow-up | Advertise pre-use ("1 δωρεάν πλήρης ανάλυση") + convert post-use | Badge/meter on wallet + detail analysis section; post-trial `UpgradeTriggerCard` under results | Endowment + reciprocity: gift first, ask after | **High** | Low | `AnalysisCard.tsx`, `PolicyDetailsClientView.tsx`, orchestrator flag exposure |
| 4 | My Agent / collaboration (free) | Panel silently hidden; no prompt at the wall (Trigger I missing) | `UpgradeTriggerCard` `agent_collaboration`/`policy_collaboration` where the panel would render + on /agent page | "Σύνδεση με σύμβουλο" (copy exists) | Social proof/delegation: user already wants help | **High** | Low | `PolicyDetailsClientView.tsx:123`, `MyAgentScreen.tsx` |
| 5 | /renewals page | Zero triggers on the dedicated surface (Trigger D exists only as home teaser) | Inline `UpgradeTriggerCard` `advanced_renewal_reminders`/`renewals_page` when free + ≥1 upcoming | "Ενεργοποίηση έξυπνων υπενθυμίσεων" (copy exists) | Loss aversion (honest: real dates exist) | Med | Low | `RenewalsClient.tsx` |
| 6 | Post-upgrade return | Success page uses generic copy; per-feature `successMessage/successCta` copy exists but unused; no `feature_unlocked` event; no in-app plan badge/toast | Per-feature success message + emit `feature_unlocked` + one-time "Plus ενεργό" toast on return | "Η αναβάθμιση ολοκληρώθηκε. Ξεκλείδωσες …" (copy exists) | Reward confirmation cements the purchase | Med | Low | `upgrade/success/page.tsx`, copy files |
| 7 | /upgrade + Account cards | Monthly-only (`upgradeSubscription(...,'monthly')`); annual invisible; PricingComparison toggle is visual-only, fires no events | Wire real billing toggle → checkout with chosen period + `plan_selected`/`billing_period_selected` | — | Anchoring: €29/yr vs €35.88 sells itself | Med | Med | `upgrade/page.tsx:57`, `AccountClientPage.tsx:64`, `PricingComparison.tsx:92` |
| 8 | Coverage-insights page | Only the per-card evidence blur; no page-level context when everything is blurred | Page-level `UpgradeTriggerCard` `advanced_gap_detection` when free + ≥1 smart rec | "Δες το κενό κάλυψης" | Curiosity gap (real data only — already honest) | Med | Low | coverage-insights page |
| 9 | Usage visibility | Meters exist only for policies (home) + tokens (account). No meters: questions, analyses, exports; free users never see "0/3 questions" before hitting walls | Add meters to account CurrentPlanCard (analyses for Plus, questions/day) + trial-analysis state for free | "Απομένει 1 δωρεάν πλήρης ανάλυση" | Predictability builds trust (brief §9) | Med | Low-Med | `CurrentPlanCard.tsx`, `TokenUsageCard.tsx` |
| 10 | Analytics funnel | `pricing_viewed`, `plan_selected`, `checkout_cancelled`, `feature_unlocked`, client `checkout_completed` typed but never emitted; per-feature locked events collapsed into `feature_locked_viewed` (feature dim exists in payload — acceptable) | Emit the five missing events (cancel via `?canceled=` return param); keep single locked event + `feature_requested` dimension | — | — | Med | Low | `funnel.ts` call sites, `/upgrade`, success/cancel pages |
| 11 | Mobile | Wallet tab has one trigger (analysis); no cap-specific mobile prompt; modal itself responsive ✅ (E2E-verified) | Add policy-cap meter variant to `MyPoliciesScreen` when ≥2 policies | Trigger-A copy | Same as home banner | Low | Low | `MyPoliciesScreen.tsx` |
| 12 | Empty states | No upgrade CTAs anywhere in empty states | Correct as-is pre-first-policy (don't sell before value); only exception worth adding: reports/export empty state for Plus users → Pro | — | Don't pitch users with zero policies | Low | Low | — |
| 13 | Agent B2B surfaces | `AgentPlanGate` blur → pricing page only; no context modal, no analytics events on agent gates | Port `UpgradeModal` pattern to agent tiers (separate cycle; marked as agent-monetization opportunity per brief §2) | — | — | Med | Med-High | `AgentPlanGate.tsx`, agent pricing |

## 5. Trigger A–J scorecard

| Trigger | Status | Notes |
|---|---|---|
| A upload limit | ⚠️ Partial | Single-add: legacy modal (works, inconsistent). Batch: **dead-end toast**. Copy ✅ verbatim per brief |
| B full analysis | ⚠️ Partial | Gate+copy+onboarding card ✅; blocked-analysis moments use legacy flow; free-trial never advertised |
| C gap detected | ✅ | `LockedInsightPreview` blurs real evidence only (no fake fear ✅) |
| D renewal | ⚠️ Partial | Home teaser ✅; `/renewals` surface bare |
| E Q&A limit | ✅ | Pre-empt + limit modal; floor question (0 free) → §2 decision |
| F family portfolio | ❌ N/A | No family/household domain exists. **Recommend: defer the gate — never gate a feature that doesn't exist.** Requires a family-members feature first (separate product cycle) |
| G multi-insurer | ✅ | Home card ✅ (add coverage-insights page banner — row 8) |
| H claims assistant | ❌ Deferred by design | No claims domain (guidance card is free and should stay free as a trust builder). Gate only when a real claim-prep checklist ships |
| I agent collaboration | ❌ Missing | Wall exists, prompt doesn't (row 4) |
| J export report | ✅ | Pro-gated savings report with modal ✅ |

## 6. Component & copy inventory vs brief §8/§10

Present: UpgradeTriggerCard, UpgradeModal (incl. inline PricingToggle + trial line), LockedInsightPreview (= SoftPaywall/FeatureLockOverlay role), UsageMeter, PlanBadge, BillingTrustBox, CarriedPlanCard, LimitReachedModal (legacy), PricingComparison. Copy: **all 10 gate keys have full EL+EN sets** incl. benefits, trust, per-feature success message; forbidden-urgency unit test exists (Greek).
Missing by name — recommendation: **do not create duplicates** (brief §15 "avoid duplicate upgrade components"): TrialBadge (inline text suffices), UsageLimitBanner/SoftPaywallCard (roles covered), FeatureUsageMeter (extend UsageMeter). Genuinely worth adding: **HardLimitModal semantics via UpgradeModal variant** (replacing LimitReachedModal), **post-upgrade success consumption of existing copy**, optional shared **UpgradeCTAButton** to stop button-markup drift. English forbidden-phrase test: add (only Greek covered).

## 7. Implementation priority (post-sign-off)

- **P1 — journey leaks (High/Low-Med):** (1) batch-upload upgrade surface; (2) checkout consolidation — retire `LimitReachedModal`+`/upgrade?reason=` detour in favor of `UpgradeModal` at all three legacy sites; (3) advertise + follow up the free trial analysis; (4) agent-collaboration trigger; (5) `/renewals` trigger.
- **P2 — journey polish (Med/Low):** per-feature post-upgrade success + `feature_unlocked` + return toast; the five unemitted analytics events (incl. cancel tracking); annual billing on `/upgrade` + account paths with real toggle events; coverage-insights page banner; account usage meters (analyses/questions) + free trial-analysis meter.
- **P3 — needs explicit product decisions:** free floor changes (3 lifetime free questions; free basic renewal notification **or** marketing-copy correction); pricing single-source consolidation + parity tests incl. DB price; mobile cap meter; agent-side context modal (separate cycle).

## 8. Risks

1. **Revenue integrity regression** — PR #59 closed free-upgrade loopholes; consolidation must keep `upgradeSubscription` Stripe-only and the money-path E2E green (extend it for each new trigger).
2. **`AnalysisCard` fragility** — 737 lines, ~20 useState; swapping its modal touches run-polling logic. Mitigate: replace only the modal-open call sites, not the machinery.
3. **Trigger fatigue** — home already stacks up to 4 cards; new triggers must respect existing dismissal keys and the ≥-conditions (never two modals at once).
4. **Free-floor changes affect COGS** (free questions cost tokens) — cap lifetime, log to conv funnel, monitor via existing admin card.
5. **Concurrent sessions** on this checkout — implementation must follow branch-verify + explicit-staging discipline.

## 9. Acceptance mapping (brief §18)

Already passing: value-before-paywall, natural prompts, short context-preserving journey, clear pricing, polished Greek copy, reusable components, mobile checkout (E2E-verified), analytics per trigger (partially). Will pass after P1/P2: no dead-end limits, single consistent checkout, limits visible before hitting them, post-upgrade felt difference, full funnel instrumentation.
