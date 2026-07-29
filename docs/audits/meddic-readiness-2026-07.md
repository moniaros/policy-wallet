# MEDDIC readiness review — agent B2B CRM

**Date:** 2026-07-29
**Scope:** Can the current codebase support a top-class MEDDIC sales-qualification implementation?
**Method:** Three parallel code reviews (stakeholder modelling, forecasting infrastructure, product fit), all claims re-verified against source.

---

## Verdict

**The codebase is not ready, and the gap is structural rather than incremental.**

MEDDIC qualifies *complex, multi-stakeholder, high-value* purchases. PolicyWallet sells
€100–800 single-line personal policies from one agent to one individual. Two of MEDDIC's six
dimensions — **Economic Buyer** and **Champion** — are questions about *which person plays which
role on the buy side*, and this schema cannot represent a second person on the buy side at all.

Those dimensions would be free-text boxes. Free-text boxes do not produce deal scoring, forecast
accuracy, or governance — the three things the feature is for.

Separately, and independent of MEDDIC: **the pipeline has no memory.** Stage changes are
destructive overwrites. Nothing records why a deal was lost. There is no immutable close date.
Any qualification score layered on this substrate would be unauditable and unmeasurable.

**Recommendation:** do not ship MEDDIC-as-named. Build the qualification substrate that fits
insurance — which delivers the same three goals — and treat the buying-committee model as a
separate, later schema project if commercial lines ever become real. Detail in
[Recommended direction](#recommended-direction).

---

## What IS ready (genuine assets — do not rebuild)

| Asset | Location | Why it matters |
|---|---|---|
| `Opportunity` entity with money fields | `prisma/schema.prisma:493` | `estimatedPremium`, `quotedPremium`, `wonPremium`, `estimatedCommission`, `currency`, `lineOfBusiness` — properly indexed |
| **Automated pain detection** | `GapInstance` + `lib/gap-detection.ts` + `lib/services/gap-engine/` | MEDDIC's "Identify Pain" already exists, *evidence-backed and AI-explained*, FK-linked via `Opportunity.gapInstanceId`. Better than what MEDDIC asks for. |
| Weighted-scoring precedent | `lib/services/gap-engine/opportunity-scoring.ts`, `protection-score.ts` | Factor weights, tier bands, batch-first query design |
| Commission math on real per-LoB rates | `lib/agent/commission.ts` | `commissionOn(rates, lob, premium)` |
| Structured-outcome precedent | `PolicyRenewal` (`schema.prisma:1259`) — `outcome` / `outcomeNotes` / `outcomeAt` | **The in-repo template for win/loss capture.** Proven pattern, never applied to the sales pipeline. |
| Questionnaire machinery | `QuestionnaireTemplate/Instance/Response` | Real, citable discovery evidence: agent-authored questions → timestamped answers tied to a relationship + thread |
| Private agent notes channel | `CollaborationMessage.isPrivate` | Agent-only, customer-invisible — where qualification notes belong |
| Entitlement gating, server-enforced | `lib/subscription-entitlements.ts` | `pipelineAnalytics`, `commissionTracking` — natural home for a governance tier |
| Scale discipline | `scoreOpportunitiesBatch`, composite indexes with rationale comments | Design target is ~500 opps/agent |

---

## Tier 1 — Structural blockers (cannot be worked around in a feature)

### 1.1 There is no buying committee. There is no second person.

```prisma
model CustomerRelationship {
  agentUserId        String
  policyholderUserId String
  @@unique([agentUserId, policyholderUserId])   // schema.prisma:438
}
```

One agent ↔ one individual `User`. Every CRM object (`Opportunity`, `Proposal`,
`DocumentRequest`, `QuestionnaireInstance`, `CollaborationThread`) hangs off `relationshipId`,
so a deal is structurally bound to a single human.

Verified negatives across all 68 models:
- No `Contact`, `Stakeholder`, `Person`, `Organization`, or `Company` model. (`model Account` is
  the NextAuth OAuth table, not a CRM account.)
- No `companyName`, `vatNumber`, `employeeCount`, `businessName`, or `industry` field anywhere.
- `TenantMembership` is the **broker's own agency**, not the customer's org. No tenant FK on
  `CustomerRelationship`, `Policy`, or `Opportunity`.
- `CollaborationParticipant.role` is a chat roster defaulting to `"participant"` — thread-scoped,
  not a buying role.
- `PolicyholderProfile` is purely personal: marital status, dependents, vehicles, BMI, smoking
  status. `dependentsCount` is a **count**, not rows.

**Consequence:** Economic Buyer and Champion have nothing to point at. On a €400 household motor
policy the economic buyer *is* the policyholder — the field is tautologically self-answering.

### 1.2 Commercial lines — where MEDDIC would fit — are a marketing surface

`lib/insurance/taxonomy.ts` defines 15 B2B branches. **Only 4 are `writeEnabled: true`**
(`business`, `group_health`, `group_life`, `group_pension`). The 11 that constitute a real
commercial risk programme — `business_property`, `equipment`, `stock`, `business_interruption`,
`professional_liability`, `employer_liability`, `technical_works`, `energy`, `transports`,
`guarantees`, `special_risks` — are all `writeEnabled: false`.

`/product/business` promises to map a policy across six sections **the database cannot store**.

Downstream, commercial content is absent entirely:
- Zero commercial gap definitions in `prisma/seed.ts`.
- `GREEK_COVERAGE_MATRIX` (`lib/services/cross-sell.service.ts:7`) — the engine that creates
  *every* opportunity — is 8 hard-coded personal LoBs. **No commercial line can ever generate an opportunity.**
- `LOB_TALKING_POINTS` covers only motor/home/health/life/travel.
- Every B2B branch has `scoreCategory: null` — invisible to the protection score.
- `cyber`, `liability`, `public_liability` are `segment: 'b2c'` here, not commercial signals.

### 1.3 Deal sizes are an order of magnitude below MEDDIC's threshold

| Reference | Value |
|---|---|
| Real production extraction (`scripts/seed-agent-demo.mjs`) | **€104.87** |
| Live-verified agent book (`docs/STATUS.md`) | **~€400 total** |
| Typical catalog premium | €150–800 |
| Largest commercial deal contemplated (`business`, catalog max) | €5,000 premium → **€750 commission** at the 15% default |
| `MAX_PLAUSIBLE_ANNUAL_PREMIUM` (`lib/agent/revenue.ts:16`) | **€100,000 — treated as presumptively a mis-extraction** |

Six qualification fields per deal cannot be justified at €120 average commission.

### 1.4 Opportunities are machine-generated in bulk, and agents cannot create one

All three creation sites are system-triggered:

| Site | Trigger | Born as |
|---|---|---|
| `lib/services/cross-sell.service.ts:177` | Engine detects a missing personal LoB | `open` |
| `app/(protected)/wallet/actions.ts:1378` | Customer clicks "tell me more" on a gap | `open`, **no monetary fields at all** |
| `app/api/v1/collaboration/proposals/[id]/route.ts:171` | Proposal accepted | **`won` on creation** |

**There is no manual "create opportunity" path.** An agent would be facing six MEDDIC fields on
auto-spawned €200 cross-sell leads they never chose to pursue.

---

## Tier 2 — Data-integrity bugs that would corrupt any metric built on top

These are worth fixing **regardless of whether MEDDIC ships.**

### 2.1 Stage changes are destructive overwrites — the pipeline has no memory

`app/(protected)/agent/actions.ts:257` writes `status` in place. There is no history table, no
`previousStatus`, no `stageEnteredAt`, no `closedAt`. `open → quoted → lost` and `open → lost`
are indistinguishable afterwards. `notes` is **clobbered, not appended**, on every transition.

This makes time-in-stage, funnel velocity, stage-conversion rates, slipped-deal detection, and
forecast-accuracy measurement *impossible* — and **unbackfillable**, because the data was never
written.

> The `/activity` feed appears to show stage changes but fabricates them:
> `app/(protected)/activity/actions.ts:123` synthesizes one pseudo-event per opportunity from
> `updatedAt - createdAt > 5000`, labelled with the *current* status. Five real stage changes
> render as one. Do not mistake it for history.

### 2.2 Proposal acceptance creates a duplicate WON row

`app/api/v1/collaboration/proposals/[id]/route.ts:171` **`create`s a new opportunity** at
`status: "won"` rather than closing the one being worked. Consequences:
- `createdAt === updatedAt` → sales-cycle length computes as **zero**
- The original open opportunity dangles open forever → **the same deal double-counts** in pipeline and won
- Win rate is corrupted in both directions

### 2.3 Loss reasons are collected, then deliberately thrown away

The decline UI already collects a taxonomy — `too_expensive`, `not_needed`, `prefer_different`,
`other` — which maps almost directly onto MEDDIC loss categories. It is string-interpolated into
a chat message and discarded. The code says why:

```ts
// We do NOT persist them as a structured `metadata` field —
// the Proposal model has no such column, so writing it threw a Prisma
// validation error and every decline-with-reason / counter-offer crashed.
```

A column was missing, so it was worked around rather than added. **Also asymmetric:** a decline
creates **no `lost` opportunity at all** — so declines are invisible to analytics while accepts
inflate it.

**This is the highest-leverage, lowest-cost fix in the entire review.**

### 2.4 The monthly trend buckets on mutable `updatedAt`

`app/(protected)/commissions/actions.ts` buckets historical revenue by `updatedAt` — bumped by
note edits and owner reassignment. **Editing a note on a February deal moves February's revenue
into July.** Any forecast-accuracy metric built on this column measures noise.

### 2.5 Silent misattribution on reassignment

`lib/services/team.service.ts:349` reassigns opportunities between agents via `updateMany` with
no handover event. Per-rep governance metrics will retroactively misattribute every transferred deal.

---

## Tier 3 — Missing infrastructure

| Capability | Status |
|---|---|
| Probability / stage weighting | **Zero exists product-wide.** Pipeline is a raw sum — an `open` deal and a `quoted` deal contribute identically. Three separate raw-sum implementations disagree on whether `on_hold` counts. |
| Immutable close date | Does not exist |
| Forecast vs. actual | No forecast is ever recorded, so accuracy is unmeasurable by construction |
| Charting library | None in `package.json` — charts are hand-rolled divs and inline SVG. A funnel/waterfall view means a dependency decision (note the first-load-KB sensitivity throughout STATUS.md) or hand-built SVG. |
| Historical data to calibrate from | Essentially none — seeds create zero opportunities; live book was ~€400 |

**Timing reality:** a data-driven forecast is **2–3 sales cycles away from the day the history
table ships**, not from the day the UI ships. Initial stage probabilities must be hand-seeded and
configurable (like `commissionRates` on `AgentProfile`).

---

## Tier 4 — Localization (would block a good Greek UX)

`el.ts` follows a consistent rule: **translate concepts, keep tool-words** (`CRM`, `white label`,
`cross-sell`, `follow-up` stay English; domain concepts get real Greek — `Κρίσιμα Κενά Κάλυψης`,
`αστικής ευθύνης`, `Βαθμολογία προστασίας`).

MEDDIC terms are role/judgement concepts — the category `el.ts` always translates — and each has a problem:

| Term | Problem |
|---|---|
| **Champion** | `Πρωταθλητής` means *sports* champion — actively confusing. `Υποστηρικτής` works, but there is no second person to *be* one. |
| **Economic Buyer** | Collides with `λήπτης της ασφάλισης`, an already legally-defined insurance role |
| **Identify Pain** | Duplicates the shipped, better-localized, evidence-backed `Κρίσιμα Κενά Κάλυψης` |
| **Metrics** | Collides with `Μετρικές`/`Αναλυτικά Στοιχεία`, which mean the *agent's* KPIs |
| Decision Criteria / Process | `Κριτήρια Απόφασης` / `Διαδικασία Απόφασης` — these translate cleanly |

**Pre-existing debt:** `el.ts` renders "pipeline" **four different ways** — `ΔΙΟΧΕΤΕΥΣΗ`,
`Pipeline`, `Ροή`, `Χωνί` (funnel). The sales vocabulary needs consolidating before terms are added to it.

---

## Recommended direction

Build the substrate that serves the three stated goals — **deal scoring, forecast accuracy,
governance** — and that fits transactional insurance. This is strictly more valuable than MEDDIC
fields here, and most of it is prerequisite to MEDDIC anyway if it is ever revisited.

**Phase 1 — Fix the memory (prerequisite to everything; longest lead time, so start now)**
1. `OpportunityStageHistory` (append-only: `opportunityId`, `fromStatus`, `toStatus`, `changedByUserId`, `changedAt`) — index `[opportunityId, changedAt]` from day one. Write it in `updateOpportunityStatus`.
2. Add `outcome` / `outcomeNotes` / `outcomeAt` to `Opportunity`, copying the proven `PolicyRenewal` pattern. Persist the decline taxonomy that is already being collected and discarded (2.3).
3. Stop `notes` being clobbered on transition.
4. Fix the duplicate-WON create (2.2): close the worked opportunity instead of creating a new one. Create a `lost` row on decline.
5. Bucket trends on an immutable `outcomeAt`, not `updatedAt` (2.4).

**Phase 2 — Qualification that fits the product**
A lightweight, insurance-native scorecard instead of MEDDIC's six — e.g. *budget signal*,
*decision timeframe*, *coverage need confirmed* (auto-satisfiable from `GapInstance`),
*competing quote present*, *contactability/engagement* (already computed). Three or four fields
an agent will actually fill on a €300 deal, several auto-populated from data the product already
has. Reuse the weighted-factors + tier-band shape from `opportunity-scoring.ts`.

**Phase 3 — Forecast + governance**
Stage-weighted pipeline using hand-seeded, configurable probabilities; forecast-vs-actual once
history accumulates. Extend `/insights` (it already owns `opportunityMetrics` via a real
`groupBy`) rather than creating a new surface. Gate on the existing `pipelineAnalytics` entitlement.

**If full MEDDIC is still wanted**, the honest scope is: ship a `Contact`/`AccountContact` model
plus an organization entity, migrate `CustomerRelationship` off its single-human unique
constraint, and fence the feature to Pro/Agency on the four writable B2B lines — which are the
*least* popular products in the catalog (`greekMarketPopularity` 40/30/25/20). **That is a schema
programme, not a feature.**

---

## Appendix — key files

`prisma/schema.prisma` (`Opportunity:493`, `CustomerRelationship:422`, `PolicyRenewal:1259`) ·
`app/(protected)/agent/actions.ts:237` · `app/api/v1/collaboration/proposals/[id]/route.ts` ·
`app/(protected)/commissions/actions.ts` · `app/(protected)/activity/actions.ts:123` ·
`lib/services/cross-sell.service.ts` · `lib/services/gap-engine/opportunity-scoring.ts` ·
`lib/insurance/taxonomy.ts` · `prisma/product-catalog.ts` · `lib/agent/revenue.ts` ·
`lib/agent/commission.ts` · `lib/pricing/plan-defaults.ts` · `lib/i18n/translations/el.ts` ·
`types/enums.ts:91`
