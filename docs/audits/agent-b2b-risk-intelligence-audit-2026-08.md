# PolicyWallet — B2B / Advisor Experience Audit against the Risk Intelligence Vision

**Date:** 2026-08-03 · **Branch audited:** `NEW-UI` @ `630e458` (live in production)
**Lens:** Principal PM · Staff UX Architect · Senior Insurance Technology Consultant
**Mode:** Audit only. No code was modified. This document is the implementation backlog.

> **Relationship to prior audits.** [`agent-b2b-production-readiness-2026-07.md`](agent-b2b-production-readiness-2026-07.md) is now **substantially stale in the advisor's favour** — see §2. That audit asked *"is the agent product safe and honest enough to sell?"* It largely is now. **This audit asks a different question: does the product deliver the Risk Intelligence promise, or a CRM with AI features attached?**

---

## 1. Executive diagnosis

PolicyWallet's advisor product is **operationally mature and strategically mis-aimed**.

The engineering substrate is genuinely good. Extraction produces a rich, Greek-market-aware normalized structure (ENFIA eligibility, coordination centres, green-card expiry, hospital class). Tenant isolation is consent-based and enforced. Error and loading boundaries now cover ~21 routes. The entitlement matrix — 80% unfenced in July — is now mostly honest. This is not a prototype.

But measured against the stated vision, there is one structural problem, and it is upstream of everything else:

> **The advisor cannot produce the risk intelligence the product promises, because the input that intelligence depends on is reachable only by the customer.**

The Protection Score is computed from a `PolicyholderProfile` (dependants, mortgage, home ownership, vehicles, employment). **Only two code paths ever write that profile: B2C onboarding and the B2C `/api/v1/risk-profile` endpoint.** The agent's questionnaire tool — the one instrument built for advisors to gather exactly this — has **no write-back path to the profile** (verified: `policyholderProfile.upsert|update` has four call sites, all B2C). Consequently, for any client who has not personally completed B2C onboarding, `toProfileFields(null)` returns all-zero defaults, and the scoring model collapses in a specific, demonstrable way (§4.1).

This produces the central contradiction. The advisor is sold *"I see the customer's complete insurance portfolio, identify risks and proactively advise."* What the advisor actually gets, for a typical imported client, is: a **presence** score of roughly 44/100 that mostly says "no health policy", a gap list scoped to documents rather than to the household, and no way to change any of it without the customer logging in.

Three findings follow from this, and they are the backlog's spine:

1. **Risk intelligence is coverage-*presence*, not coverage-*adequacy*.** The score asks "do you hold a policy in this category?", never "is the sum insured adequate?" — despite the extraction layer already capturing `insuredValue`, `rebuildCost`, `annualLimit`, `deathBenefit`, and deductibles. **The data to be a risk platform is already being extracted and then not used for risk.** (§4.2)
2. **The normalized portfolio is not queryable.** All coverage detail lives in `Policy.acordData` as JSON with no materialized projection. No book-level risk question — *"which of my clients lack earthquake cover?"* — can be answered in SQL. Portfolio analytics are therefore commercial (premium, pipeline, conversion), because those are the only fields that are columns. (§4.3)
3. **Advisor Time-to-Value is gated on customer action, and bulk ingestion does not exist for policies.** `bulk-import` imports **contacts only** — it accepts a `customers` array and no policies. The only multi-PDF batch upload in the product, `BatchUploadModal`, is wired **exclusively into the B2C wallet**. The paying advisor has a strictly worse ingestion path than the free consumer. (§4.4)

**Verdict.** The advisor product is a competent, well-fenced insurance CRM with per-policy AI analysis attached. It is not yet a Risk Intelligence Platform, and the distance is not mostly UI — it is three data-layer decisions. The good news: the extraction schema means most of the required signal is **already in the database**, unused. This is a harvesting problem more than a building problem.

---

## 2. What materially changed since the July audit

Re-verified rather than assumed. Several July P1s are closed; the backlog below does not re-litigate them.

| July finding | Status now | Evidence |
|---|---|---|
| `canAgentUseFeature` — **zero** call sites | ✅ **Fixed** — 10 call sites | `commissions`, `agent/page`, `agent/actions` ×2, `renewals/actions`, proposals + document-requests routes, branded-report route, `customers/[id]` |
| Branded report "sold, unbuilt" | ✅ **Built** | `app/api/v1/agent/policies/[id]/branded-report/route.ts` (126 lines), fenced on `brandedReport` |
| `priorityQueue` computed from B2C tier | ✅ **Fixed** | `policy-analysis-orchestrator.service.ts:475` now reads `agentEntitlements.limits.priorityQueue` |
| `pipelineAnalytics` = client-side blur | ✅ **Fixed** — server-withheld | `dashboard/agent/page.tsx:326` returns a zeroed shape below tier |
| `questionnaireTemplates` cap unenforced | ✅ **Fixed** | `questionnaires/actions.ts:89-92` counts before create |
| Zero per-route error boundaries | ✅ **Fixed** | 21 `error.tsx` + 18 `loading.tsx` |
| NotificationBell dead-end (no link when empty) | ⚠️ **Partially fixed** | Footer now always renders; **inline list still never fetches** (acknowledged in-code at `:216`) |
| `AiDisclaimer` missing on agent surfaces | ✅ **Fixed** | `insights/page.tsx:19` |
| Modal a11y (7 modals, no dialog semantics) | ✅ **Largely fixed** | `role="dialog"`, `aria-modal`, `useDialog` focus management in agent modals |
| Health score mislabelled as coverage verdict | ✅ **Fixed** | `lib/agent/health-score.ts` renamed to relationship score with an explicit doc comment |

**Still open from July:** `apiAccess` sold and unbuilt; `collaborationThreads` / `sharedPolicyRoom` / `asyncMessaging` / `privateNotes` unfenced (0 refs); no `/collaboration` inbox index; agency billing flat not per-seat.

---

## 3. Capability scorecard

Classification per the requested taxonomy. **Verdict** is against the Risk Intelligence vision, not against "does the screen work".

| # | Capability | Classification | Verdict |
|---|---|---|---|
| 1 | **Customer Portfolio** | **Implemented** | Genuinely good. `/customers` + 360 view, 4 tabs, consent-gated identity via `presentCustomerIdentity()`, visibility-filtered policies. |
| 2 | **Portfolio Normalization** | **Partial** + **Data Model Gap** | Extraction is excellent and Greek-aware; the result is stored as unqueryable JSON. Normalized in *shape*, not in *substrate*. §4.3 |
| 3 | **Protection Score** | **Partial** + **Data Model Gap** + **AI Opportunity** | Presence-only, structurally degraded for profile-less clients, and one gap penalises all categories. §4.1, §4.2, F-04 |
| 4 | **Coverage Gap Detection** | **Implemented** (document) / **Partial** (portfolio) | Per-policy detection is real, versioned, admin-managed, with an honest `validationState` evidence ladder. Portfolio rules exist but are thin. |
| 5 | **Opportunity Engine** | **Partial** | `Opportunity` + `OpportunityStageHistory` + MEDIC qualification are solid. Creation is near-manual: 5 write sites, only `cross-sell.service:198` is automatic. |
| 6 | **Cross / Up-sell** | **Partial** + **Technical Debt** | `runCrossSellForCustomer` works and is fenced. **`runBulkCrossSell` has zero UI callers** — book-wide cross-sell is built and unreachable. |
| 7 | **Customer Timeline** | **Partial** + **UX Debt** | `ClientActivityTab` shows CRM interactions (calls, notes, messages). No risk lifecycle: policy added, gap detected, score moved, renewal. §5, F-08 |
| 8 | **Renewals** | **Implemented** | `PolicyRenewal` pipeline, live cron, visibility-gated notifications, premium-at-risk metric. The strongest advisor feature. |
| 9 | **Advisor Dashboard** | **Implemented** | KPI strip, action queue, revenue pulse (server-withheld), portfolio health with a real zero-client empty state. |
| 10 | **Bulk Analysis** | **Missing** | Bulk *import* = contacts only. No bulk policy ingestion, no bulk analysis, no bulk re-score. §4.4 |
| 11 | **Executive Reporting** | **Partial** | `/insights` is a well-built **commercial** dashboard. Zero book-level **risk** aggregates. No export. §4.3 |
| 12 | **Activity Feed** | **Implemented** | `/activity` + per-client tab + `ActivityLog`. Caveat: schema is admin-shaped (`adminUserId`) but written with agent ids — July B8, still open. |
| 13 | **Empty States** | **Implemented** | Consistently strong. `PortfolioHealth` explicitly refuses to render 0% rings for zero clients — a genuinely thoughtful touch. |
| 14 | **Loading States** | **Implemented** | 18 `loading.tsx` + skeletons. Gaps: `/customers/[id]`, `/customers/[id]/policy/[policyId]`, `/collaboration/threads/[id]`. |

---

## 4. The four structural findings

### 4.1 The risk profile is unreachable by the advisor — *the single highest-value fix*

**Verified chain:**
- `calculateProtectionScore(profile, activeLobs, profileGaps, policyGapCount)` decides category applicability via `appliesWhen(profile)` (`protection-score.ts:31-86`).
- `toProfileFields(null)` returns `dependentsCount: 0, ownsHome: false, vehiclesCount: 0, mortgageAmount: null, employmentStatus: null, hasLoans: false, travelsFrequently: false, hasPets: false` (`profile-gap-rules.ts:457-485`).
- `policyholderProfile.upsert|update` exists in exactly four places: `api/v1/risk-profile/route.ts:117`, `onboarding/actions.ts:99/172/424`. **All B2C. No agent path. No questionnaire write-back.**

**What that produces.** For a profile-less client holding one motor policy:

| Category | Weight | `appliesWhen` | Applicable? | Score |
|---|---|---|---|---|
| Health | 25 | `() => true` | ✅ | **0** (no health policy) |
| Life & Income | 25 | dependants / mortgage / loans | ❌ | N/A |
| Property & Motor | 20 | ownsHome / vehicles | ✅ *only via held policy* | 100 |
| Income Protection | 15 | employment status | ❌ | N/A |
| Liability & Legal | 10 | self-employed / ownsHome | ❌ | N/A |
| Lifestyle | 5 | travels / pets | ❌ | N/A |

**Overall ≈ (0×25 + 100×20) / 45 ≈ 44/100.** Every profile-less client converges on the same narrow verdict, and the only expressible gap is "no health insurance". Life, income and liability needs — the highest-value advisory conversations, and the highest-commission products — **cannot be surfaced at all**, because the fields that trigger them are unreachable.

**This is why the advisor experience feels like a CRM.** The risk engine is fine. It is being starved.

### 4.2 Presence, not adequacy — the extracted data is already there

`AcordDataSchema` (`lib/schemas/acord-data.ts`) already captures, per line: `estimatedMarketValue`, `deductible`, `coverageTier`, `estimatedRebuildCost`, `insuredValue`, `replacementValue`, `theftCoverageLimit`, `annualLimit`, `roomAndBoardLimit`, `outOfPocketMax`, `hospitalClass`, `deathBenefit`, plus booleans for fire/earthquake/flood/glass/own-damage.

**None of it reaches the Protection Score.** The score's only inputs are the *set of lines held*, a profile, and a count of gaps. A client with a €40,000 home policy on a €400,000 house scores identically to one correctly insured. For a product whose promise is *"I immediately understand my protection level"*, this is the gap between a checklist and an assessment — and closing it requires no new extraction, only new arithmetic over fields already stored.

### 4.3 Normalization without a queryable substrate

Coverage lives in `Policy.acordData Json?`. There is no `Coverage`, `CoverageLimit` or `Peril` model (verified across all 68 Prisma models). Indexes on `Policy` cover `ownerUserId`, `createdByUserId`, `endDate`, `coverageEndDate` — lifecycle only, never coverage.

Consequences, in order of business impact:
- No book-level risk query is possible. *"Which clients lack earthquake cover?"* requires deserializing every policy in the book in application memory.
- `/insights` therefore reports what happens to be columnar: premium, conversion, pipeline, renewal counts. It is a **sales** dashboard wearing an intelligence label.
- `/api/v1/portfolio/gaps` — the one portfolio gap endpoint — is gated on `canUserUseFeature` (**B2C**), not `canAgentUseFeature`. Agents have no book-level gap API at all.
- The agent-schema flags `portfolioGapView`, `analysisComparison`, `savingsReportExport` are dead: the features they name are fenced for B2C only.

### 4.4 Ingestion asymmetry — the advisor's path is worse than the consumer's

- `POST /api/v1/customers/bulk-import` takes `customers: z.array(customerImportSchema).min(1)`. **Contacts only.** No policy payload exists in the schema.
- `BatchUploadModal` — real multi-PDF batch ingestion with `/api/policies/batch-create` — is instantiated in exactly one place: `components/wallet/PolicyWalletClient.tsx:279`. **B2C only.**
- The advisor's sole ingestion route is `UploadPolicyModal`, one PDF at a time, each running a ~90s analysis.

An advisor onboarding a 200-policy book faces 200 sequential modal interactions. **This is the Time-to-Value ceiling for the entire B2B product**, and it is the reason the "complete portfolio" promise is rarely reached in practice.

---

## 5. UI/UX evaluation

Assessed against the requested dimensions. Overall the craft is high — the problems are informational, not visual.

| Dimension | Assessment |
|---|---|
| **Mobile-first** | ⚠️ Mixed. Agent surfaces are desktop-first by intent (`DesktopDashboard`). July's mislabeled bottom-nav "more" → `/account` deep-link should be re-verified; renewals/commissions/questionnaires/tasks/team remain drawer-only on mobile. |
| **Responsive** | ✅ Good. Recent fixes to the `/customers` header action group (`flex-wrap`, `min-w-0`, `shrink-0`) show real attention to 375/768/1024 breakpoints. |
| **Accessibility** | ✅ Much improved — dialog semantics + focus management now present. Remaining: `NotificationBell` lacks `role`/`aria` and is English-only; questionnaires table `overflow-hidden` clips on mobile. |
| **CTA hierarchy** | ✅ Clear. One `pw-primary-button` per surface; secondary actions correctly de-emphasised. |
| **Cognitive load** | ⚠️ **The main UX risk.** Four different 0-100 scores exist: `calculateProtectionScore` (coverage verdict), `provisionalProtectionScore` (100 − severity), `computeClientRelationshipScore` (book management), `calculateCoverageScore` (cross-sell). Three are advisor-visible. Each was individually well-reasoned; together they are an interpretive burden. |
| **Onboarding** | ⚠️ 4-step agent onboarding exists and collects branding/licence. `verificationStatus` still gates **no capability** — an unverified advisor has full AI + CRM access (IDD exposure). |
| **Empty states** | ✅ **Best-in-class in this codebase.** `PortfolioHealth`'s refusal to show 0% rings at zero clients is exemplary. |
| **Perceived value** | ❌ **Weakest dimension.** The first thing a new advisor sees after importing contacts is a portfolio of clients with `healthScore: null` — because no policies, no analysis, no score. Nothing in the product demonstrates intelligence until a PDF is uploaded *and* consent exists *and* quota remains. |
| **Time-to-Value** | ❌ **Critical.** Contacts import in seconds; intelligence requires per-policy manual upload + customer consent + ~90s each. Realistic TTFV for a real book: hours to days. |
| **Executive dashboard** | ⚠️ Well-built but commercially framed (§4.3). No risk aggregates, no export, nothing an advisor can take into a client or manager meeting. |

---

## 6. Findings register

Severity: **S1** business-critical · **S2** major · **S3** moderate · **S4** minor.
Priority: **P0** next · **P1** this quarter · **P2** next quarter.

### F-01 — Questionnaire answers never reach the risk profile
- **Class:** Data Model Gap · Missing · **Severity: S1** · **Priority: P0**
- **Business impact:** The advisor cannot establish the risk profile the Protection Score depends on. Life/income/liability advisory — the highest-value conversations — cannot be triggered. Directly negates the advisor product promise.
- **Root cause:** `QuestionnaireResponse` has no mapping to `PolicyholderProfile`. Profile writes exist only in B2C paths.
- **Recommended solution:** Add a question→profile-field mapping on `QuestionnaireTemplate`; on response submission upsert `PolicyholderProfile` and call `refreshProtectionScore(ownerUserId)`. Record provenance (`advisor_questionnaire` vs `self_reported`) — the advisor's assertion is not the client's declaration and must be distinguishable for IDD.
- **Dependencies:** consent model (attested vs granted); `ConsentAudit`.
- **Effort:** M.

### F-02 — Protection Score measures presence, not adequacy
- **Class:** Partial · AI Opportunity · **Severity: S1** · **Priority: P0**
- **Business impact:** The core product metric cannot distinguish adequate from catastrophically inadequate cover. Underinsurance — the advisor's primary value case and primary liability exposure — is invisible.
- **Root cause:** `calculateProtectionScore` consumes only `activeLobs` + profile + gap count. Rich `acordData` limits are never read.
- **Recommended solution:** Add an adequacy sub-score per category from data already extracted — sum insured vs `estimatedRebuildCost`, `deathBenefit` vs mortgage + income multiple, health `annualLimit` vs a Greek-market benchmark. Keep it a **separate, explainable dimension** ("Coverage present 100 / Adequacy 40") rather than folding it into one opaque number.
- **Dependencies:** F-01 (mortgage/income come from the profile); benchmark table (admin-managed, like `GapDefinition`).
- **Effort:** L.

### F-03 — No bulk policy ingestion for advisors
- **Class:** Missing · **Severity: S1** · **Priority: P0**
- **Business impact:** The Time-to-Value ceiling for all of B2B. Blocks book migration, which blocks the land-and-expand motion entirely.
- **Root cause:** `bulk-import` was scoped to contacts; `BatchUploadModal` was built for B2C and never generalised.
- **Recommended solution:** Reuse `BatchUploadModal` + `/api/policies/batch-create` on the agent side with a customer-resolution step (`customer-resolution.service` already exists and is the hard part — it is built). Queue analyses through the existing QStash path at the agent's `priorityQueue` tier. Show a progress surface; do not block the UI.
- **Dependencies:** analysis quota + token budget accounting; `canAgentRunAnalysis` per batch.
- **Effort:** M–L.

### F-04 — One policy gap penalises every score category
- **Class:** Technical Debt (correctness) · **Severity: S2** · **Priority: P0**
- **Business impact:** Scores are systematically wrong and the error is invisible. Undermines trust in the number the whole product is built on.
- **Root cause:** `protection-score.ts:227-231` computes `policyGapPenalty` from the **global** `policyGapCount` and subtracts it inside the per-category loop — so a motor-only gap also deducts from Health, Life and Liability.
- **Recommended solution:** Attribute gap instances to their category via `GapDefinition.lineOfBusiness` → `coveredByLobs`, and penalise only the owning category. Add unit tests pinning per-category attribution.
- **Dependencies:** none. Self-contained and cheap.
- **Effort:** S. **Best effort-to-correctness ratio in this document.**

### F-05 — Coverage data is not queryable; no book-level risk analytics
- **Class:** Data Model Gap · **Severity: S1** · **Priority: P1**
- **Business impact:** Prevents every book-level risk question, which is the actual Risk Intelligence product. Caps `/insights` at commercial metrics permanently.
- **Root cause:** Normalized extraction persisted only as `Policy.acordData` JSON.
- **Recommended solution:** Materialize a `PolicyCoverage` projection (`policyId`, `category`, `perilKey`, `limitAmount`, `deductible`, `isCovered`, `sourceConfidence`) written by the analysis orchestrator on each run — a derived, rebuildable projection, not a second source of truth. Index `(perilKey, isCovered)`. Then book-level queries become trivial. Postgres GIN on `acordData` is a cheaper stopgap but will not support ranked aggregates well.
- **Dependencies:** orchestrator write path; backfill job for existing policies.
- **Effort:** L.

### F-06 — `runBulkCrossSell` is built and unreachable
- **Class:** Technical Debt · **Severity: S2** · **Priority: P1**
- **Business impact:** Book-wide cross-sell — a top-3 advisor revenue feature, already implemented — ships zero value. Pure waste.
- **Root cause:** No UI entry point was built (verified: zero callers in `app/` and `components/`).
- **Recommended solution:** Add an entry point on `/opportunities` or `/insights`, fenced on `crossSellIntelligence` (already enforced for the per-customer path). Run async with a progress surface; rate-limit per agent.
- **Dependencies:** none — the service exists.
- **Effort:** S.

### F-07 — Four coexisting 0-100 scores
- **Class:** UX Debt · Technical Debt · **Severity: S2** · **Priority: P1**
- **Business impact:** Advisors cannot explain the number to a client, which is precisely the trusted-advisor moment the product is selling.
- **Root cause:** Independent evolution. `health-score.ts` has already been honestly renamed — the pattern to follow.
- **Recommended solution:** Establish one advisor-facing **Protection Score** (client risk) and one internal **Relationship Score** (book management). Retire `provisionalProtectionScore` to a clearly-labelled "provisional, pre-analysis" state. Fold `calculateCoverageScore` into the gap engine. Publish the definition in-product so an advisor can defend it.
- **Dependencies:** F-02 (adequacy changes the headline definition — sequence after).
- **Effort:** M.

### F-08 — Customer Timeline is CRM-shaped, not risk-shaped
- **Class:** Partial · UX Debt · **Severity: S2** · **Priority: P1**
- **Business impact:** The advisor cannot see or narrate the client's risk history — "your protection improved after we added life cover" is the core advisory story and it cannot be told.
- **Root cause:** `ClientActivityTab` renders `interactions` only (`message_sent`, `note_added`, `relationship_created`).
- **Recommended solution:** Merge a risk event stream — policy added, analysis completed, gap detected/resolved, score changed, renewal outcome — into one chronological view. Most events already exist across `PolicyAnalysisRun`, `GapInstance.detectedAt/resolvedAt`, `PolicyRenewal`, `ProtectionScore.computedAt`; the score needs history (currently `@unique` on `userId`, so only the latest value exists — **add `ProtectionScoreHistory` or the trend is unrecoverable**).
- **Dependencies:** score history model.
- **Effort:** M.

### F-09 — New-advisor perceived value is empty until first upload
- **Class:** UX Debt · **Severity: S2** · **Priority: P1**
- **Business impact:** Highest-leverage activation and trial-conversion lever. First impression is a list of clients with null scores.
- **Root cause:** No demonstration path. Intelligence requires PDF + consent + quota.
- **Recommended solution:** Ship a seeded demo client with a real analyzed portfolio, clearly badged as sample and removable. `scripts/seed-agent-demo.mjs` already does this for manual demos — productise it into onboarding.
- **Dependencies:** none.
- **Effort:** S–M.

### F-10 — `/insights` has no risk aggregates and no export
- **Class:** Partial · **Severity: S2** · **Priority: P1**
- **Business impact:** Nothing to take into a client or manager meeting; weakens the Agency tier's reason to exist.
- **Root cause:** §4.3 — only columnar fields are aggregable.
- **Recommended solution:** After F-05, add: protection-score distribution across the book, top under-covered perils, underinsurance exposure (€), score trend. Add CSV export immediately (cheap, independent of F-05) and branded PDF after — `brandedReport` infrastructure already exists per-policy.
- **Dependencies:** F-05 for risk aggregates; nothing for CSV.
- **Effort:** M.

### F-11 — Analysis blocked for activated, non-consenting customers
- **Class:** Partial (by design) · **Severity: S3** · **Priority: P1**
- **Business impact:** Advisor invests upload effort, receives nothing, cannot self-resolve.
- **Root cause:** Correct GDPR behaviour (`agent/actions.ts:1019-1021`). Attestation is deliberately restricted to genuinely unactivated accounts — this restriction is **right and should not be loosened**.
- **Recommended solution:** Not a gate change — a UX change. Make the consent state visible *before* upload, add a one-tap "request AI consent" (`requestAiConsent` already exists), and show pending-consent clients as an actionable dashboard queue rather than a silent null.
- **Dependencies:** none.
- **Effort:** S.

### F-12 — Five entitlement flags still unenforced; `apiAccess` sold and unbuilt
- **Class:** Technical Debt · **Severity: S3** · **Priority: P1**
- **Business impact:** Residual monetization-integrity gap. Much smaller than July.
- **Root cause:** Fencing sweep did not reach these keys.
- **Recommended solution:** Fence `collaborationThreads`, `sharedPolicyRoom`, `asyncMessaging`, `privateNotes`. **Stop selling `apiAccess` until built.** Remove or repoint the dead agent copies of `portfolioGapView` / `analysisComparison` / `savingsReportExport` (currently B2C-gated only).
- **Effort:** S.

### F-13 — Opportunity creation is near-manual
- **Class:** Partial · AI Opportunity · **Severity: S3** · **Priority: P2**
- **Business impact:** "Opportunity Engine" is mostly an opportunity *tracker*.
- **Root cause:** Only `cross-sell.service:198` creates automatically; the rest are user actions.
- **Recommended solution:** Promote validated gaps (`validationState: confirmed|validated` — the ladder already exists) into scored opportunities automatically. `opportunity-scoring.ts` is built and ready.
- **Dependencies:** F-01/F-02 improve input quality — sequence after.
- **Effort:** M.

### F-14 — `verificationStatus` gates nothing
- **Class:** Missing · **Severity: S3** · **Priority: P2**
- **Business impact:** Unverified advisors get full AI + client-data access. IDD / Law 4583/2018 exposure.
- **Recommended solution:** Gate client-data and AI capability on approval; allow sandbox/demo pre-approval so activation is not blocked.
- **Effort:** M.

### F-15 — Missing loading/error boundaries on remaining deep routes
- **Class:** UX Debt · **Severity: S4** · **Priority: P2**
- **Routes:** `/customers/[id]`, `/customers/[id]/policy/[policyId]`, `/collaboration/threads/[id]`.
- **Effort:** S.

### F-16 — NotificationBell list never fetches
- **Class:** Partial · UX Debt · **Severity: S4** · **Priority: P2**
- **Root cause:** Acknowledged in-code (`NotificationBell.tsx:216`). Badge count is live; list is not.
- **Recommended solution:** Fetch on open; add `role`/`aria`; localise (currently English-only).
- **Effort:** S.

### F-17 — `ActivityLog` schema/usage mismatch
- **Class:** Technical Debt · **Severity: S3** · **Priority: P2**
- **Root cause:** Admin-shaped (`adminUserId`, `isBreakGlass`) but written with agent ids — pollutes break-glass audit. Open since July.
- **Recommended solution:** Add `actorUserId` + `actorType`, or split streams. Also add the still-missing GDPR read-access audit for advisor PII views.
- **Effort:** M.

---

## 7. Recommended sequencing

Ordered by *unlocks-the-vision per unit of effort*, not by severity alone.

**Wave 1 — make the score true (P0, ~1 sprint).** F-04 (per-category gap attribution — small, pure correctness), F-01 (questionnaire → profile write-back), F-11 (consent UX). *Outcome: the score reflects the household rather than a default, and the advisor can finally influence it.*

**Wave 2 — make the score meaningful (P0/P1).** F-02 (adequacy sub-score), F-07 (score consolidation), F-09 (demo client). *Outcome: the advisor can say "you are underinsured by €X" — the actual product promise.*

**Wave 3 — make the book ingestible and queryable (P0/P1).** F-03 (bulk policy ingestion), F-05 (`PolicyCoverage` projection). *Outcome: a real book enters the system, and book-level questions become answerable.*

**Wave 4 — harvest (P1).** F-06 (expose bulk cross-sell — one sprint, feature already written), F-10 (risk aggregates + export), F-08 (risk timeline + score history). *Outcome: Agency tier earns its price.*

**Continuous:** F-12, F-14, F-15, F-16, F-17.

> **Sequencing warning.** F-03 before F-01/F-02/F-04 imports a large book and computes wrong scores across it at scale — then every corrected score becomes a visible regression to the advisor. **Fix the arithmetic before scaling the volume.**

---

## 8. KPI framework

| Class | Metric | Why it matters here |
|---|---|---|
| **Time-to-Value** | Minutes from signup → first *adequacy* verdict | The metric Wave 1–3 exist to move. Instrument now for a baseline. |
| Activation | % advisors reaching ≥1 analyzed policy in week 1 | Currently gated by F-03/F-09. |
| Intelligence coverage | % of book with a non-null Protection Score | Exposes the F-01 starvation directly. Expect it to be low today. |
| Profile completeness | % clients with ≥5 populated profile fields | Leading indicator for score validity. |
| Advisory conversion | Validated gap → opportunity → won | Whether intelligence produces revenue. |
| Adequacy | Median underinsurance exposure (€) across book | The Risk Intelligence headline. Requires F-02 + F-05. |
| Trust | Score explanation views / score disputes | Whether advisors can defend the number (F-07). |

---

## 9. What NOT to build

Scope discipline matters more than feature count here.

- **Do not build more CRM.** Tasks, notes, pipeline, commissions are all adequate. More CRM widens the gap between positioning and reality.
- **Do not loosen the AI consent gate** (F-11). It is correct. Fix the surrounding UX.
- **Do not add a fifth score.** Consolidate first (F-07).
- **Do not fold adequacy into the existing headline number.** An unexplainable score is worse than a narrow one — the advisor has to defend it in front of a client.
- **Do not build `apiAccess`** because it is sold. Stop selling it until there is demand evidence.

---

## 10. Target state

An advisor imports a book in one action. Each policy is normalized into queryable coverage, scored for **presence and adequacy**, and placed on a risk timeline. A questionnaire the advisor sends populates the household risk profile, which immediately re-scores the portfolio and surfaces the life, income and liability gaps that are invisible today. The advisor opens `/insights` and sees not "€180k pipeline" but *"31 clients underinsured on property by a median €140k; 12 have no life cover against an active mortgage"* — and exports it, branded, to take into a meeting.

Every component needed for that exists in some form today. **The distance is four data-layer decisions (F-01, F-02, F-03, F-05) and one arithmetic fix (F-04)** — not a rewrite.

---

_Audit basis: direct code inspection of `NEW-UI` @ `630e458` — 68 Prisma models, ~60 protected routes, the gap engine, agent portal, insights, cross-sell, renewal and analysis services, the entitlement schema, and the extraction schema. Prior audits re-verified rather than inherited. No code was modified in producing this report._
