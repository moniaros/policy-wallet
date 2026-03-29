# PolicyWallet: Coverage Gap Detection & Recommendation Engine
## Full Analysis & Implementation Plan

---

## 1. Current State Assessment

### What Already Exists (Implemented)

| Capability | Location | Maturity |
|---|---|---|
| **Policy CRUD + storage** | `lib/services/policy.service.ts`, Prisma `Policy` model | Production-ready |
| **Gap definitions (rule DB)** | `GapDefinition` model + seed data | Production-ready |
| **Gap instances (detected gaps)** | `GapInstance` model with status lifecycle | Production-ready |
| **Deterministic gap detection** | `lib/gap-detection.ts` | Functional, basic |
| **AI-powered gap analysis** | `lib/services/gap-analysis.service.ts` + 3-provider AI layer | Production-ready |
| **8-step policy analysis pipeline** | `lib/services/analysis/policy-analysis-orchestrator.service.ts` | Production-ready |
| **Portfolio gap view** | `lib/services/analysis/portfolio-gap-view.ts` | Functional (Plus+ tier) |
| **Cross-sell service** | `lib/services/cross-sell.service.ts` | Functional |
| **Risk profile collection** | `PolicyholderProfile` model + `/api/v1/risk-profile` | Basic (7 fields) |
| **Coverage insights UI** | `components/coverage/CoverageInsightsClient.tsx` | Functional |
| **Gap cards UI** | `components/gaps/GapCard.tsx`, `GapRecommendationCard.tsx` | Functional |
| **Health score** | `components/wallet/CoverageHealthScore.tsx` | Implemented |
| **Engagement scoring** | `lib/services/engagement-scoring.ts` | Production-ready |
| **Agent opportunity pipeline** | `Opportunity` model + `OpportunitiesClient` | Functional |
| **Agent-policyholder collab** | Full thread/message/proposal system | Production-ready |
| **Renewal tracking** | `lib/services/renewal.service.ts` + cron | Production-ready |
| **Subscription & entitlements** | 3-tier (Free/Plus/Pro) with feature gating | Production-ready |
| **Bilingual (EN/EL)** | Full i18n across UI + AI outputs | Production-ready |

### What's Partially Implemented

| Capability | Current State | Gap |
|---|---|---|
| **Risk profiling** | 7 demographic fields only | No income, no occupation detail, no risk tolerance, no life events |
| **Gap detection logic** | Rule-based on single policy + LoB-level missing coverage | No cross-policy correlation with risk profile, no "expected vs actual" |
| **Coverage score** | Two separate scores (health score in UI vs coverage score in cross-sell) | Not unified; not driven by risk profile |
| **Recommendations** | AI suggestions per gap + cross-sell by missing LoB | No prioritization engine, no product matching, no personalized urgency |
| **Agent opportunity dashboard** | Basic CRUD | No scoring, no conversion likelihood, no prioritized queue |

### What's Missing

| Capability | Impact |
|---|---|
| **Structured Risk Profile Engine** | Cannot compute "expected coverage" without knowing user's actual risk exposure |
| **Expected Coverage Model** | No definition of "what coverage a person *should* have" given their profile |
| **Protection Score (unified)** | Two disconnected scores confuse both users and agents |
| **Recommendation prioritization** | Gaps are listed but not ranked by personal urgency or financial impact |
| **Product catalog / insurer matching** | Gaps found but no linkage to actual purchasable products |
| **Gap-to-action pipeline** | No seamless flow from "gap detected" -> "here's what to buy" -> "connect with agent" |
| **Life event triggers** | No mechanism for "just had a baby" -> re-run gap detection |

### Reusable Components (Strong Foundation)

1. **`GapDefinition` + `GapInstance` models** -- the gap lifecycle is already modeled correctly
2. **AI service layer with 3 providers** -- can be extended for risk reasoning
3. **Cross-sell coverage matrix** -- already has Greek market LoB mapping with essential/optional classification
4. **Health score UI (donut chart)** -- just needs new data source
5. **`GapRecommendationCard` component** -- already renders priority + suggestion + CTA
6. **Agent `Opportunity` model** -- already links to relationships and tracks status/value
7. **Notification infrastructure** -- can push gap alerts immediately
8. **Cron job framework** -- can schedule periodic re-analysis

### Technical Constraints

- **PostgreSQL via Supabase** -- no vector DB for ML features (but not needed for MVP)
- **No product catalog** -- no `InsuranceProduct` table; only `Insurer` exists
- **`PolicyholderProfile` is thin** -- only 7 fields, missing income/occupation/age
- **Coverage score is ad-hoc** -- computed differently in 3 places
- **AI token budget** -- analysis costs real money per policy; can't re-run freely

---

## 2. Target Architecture

```
+-------------------------------------------------------------------+
|                      PolicyWallet Platform                         |
+---------------+----------------------+----------------------------+
|  Data Layer   |  Engine Layer        |  Presentation Layer        |
|               |                      |                            |
| Risk Profile  |  Risk Profile        |  Policyholder:             |
| (enhanced)    |  Builder ----------> |  - Protection Score        |
|               |       |              |  - Gap Cards + Urgency     |
| Policy        |  Expected Coverage   |  - Recommendations         |
| Portfolio     |  Calculator -------->|  - "Get Protected" CTA     |
|               |       |              |                            |
| Gap           |  Gap Detector        |  Agent:                    |
| Definitions   |  (rule + AI) ------> |  - Opportunity Score       |
|               |       |              |  - Client Priority Queue   |
| Product       |  Recommendation      |  - Suggested Playbook      |
| Catalog       |  Ranker ------------>|  - Revenue Projections     |
| (new)         |       |              |                            |
| Opportunity   |  Protection Score    |                            |
| Pipeline      |  Calculator -------->|                            |
+---------------+----------------------+----------------------------+
```

**Key principle:** The engine sits between existing data and existing UI, computing derived state that both policyholders and agents consume. It does **not** replace the AI pipeline -- it wraps it with structured reasoning.

---

## 3. Data Model Changes

### A. Enhance `PolicyholderProfile` (schema change)

New fields to add:
- `dateOfBirth` (DateTime?) -- determines life insurance urgency
- `annualIncome` (Decimal?) -- sizes income protection gaps
- `occupation` (String?) -- e.g. 'office_worker', 'manual_labor', 'freelancer'
- `riskTolerance` (String?) -- 'conservative', 'moderate', 'aggressive'
- `hasLoans` (Boolean, default false) -- triggers life/mortgage cover rules
- `loanAmount` (Decimal?) -- loan exposure amount
- `travelsFrequently` (Boolean, default false) -- triggers travel insurance rules
- `smokingStatus` (String?) -- 'non_smoker', 'smoker', 'former_smoker'
- `lifeEvents` (Json?) -- [{type: 'new_baby', date: '2026-03'}]

### B. New Model: `RecommendationInstance`

Stores personalized recommendations linked to gaps, with urgency, estimated cost, personal reasoning, and lifecycle status.

### C. New Model: `ProtectionScore`

Caches the unified protection score (0-100), category breakdowns, expected vs actual lines of business. One row per user, recomputed on profile/policy change.

### D. Optional (Phase 2): `InsuranceProduct`

Product catalog linking insurers to specific products by line of business with pricing ranges.

---

## 4. Gap Detection Engine Design

### Layer 1: MVP (Rule-Based)

Profile-based gap detection rules that check user risk profile against their actual policy portfolio. Examples:

- `mortgage_no_life`: Has mortgage AND no life insurance -> critical gap
- `dependents_no_life`: Has dependents AND no life insurance -> critical gap
- `homeowner_no_home`: Owns home AND no home insurance -> high gap
- `vehicles_no_motor`: Has vehicles AND no motor insurance -> critical gap (mandatory in Greece)
- `no_health`: No private health insurance -> high gap
- `pets_no_pet`: Has pets AND no pet insurance -> low gap
- `travels_no_travel`: Travels frequently AND no travel insurance -> medium gap
- `income_no_income_protection`: Working with dependents AND no income protection -> high gap

### Layer 2: Protection Score Calculator

Unified score across 6 categories:
- Life (weight: 25, essential)
- Health (weight: 25, essential)
- Property (weight: 20, essential) -- home + motor
- Income (weight: 15, optional)
- Liability (weight: 10, optional)
- Other (weight: 5, optional) -- travel, pet, legal

Categories that don't apply to the user are excluded from the denominator.

### Layer 3: Future AI Layer (Phase 2)

Extend existing AI service with `analyzeRiskProfile()` for natural-language insights and behavioral nudges.

---

## 5. Recommendation Engine

- Map gaps to specific product lines with estimated costs (reuse Greek market estimates from cross-sell service)
- Prioritize by severity then financial impact
- Agent-side: opportunity scoring based on gap severity, profile completeness, engagement score, and detection recency

---

## 6. UX Integration

### Policyholder
- **Protection Score:** Reuse existing donut chart component with new data source + category breakdown
- **Gap Explanations:** Add personal context to existing GapRecommendationCard
- **Nudges:** Home page banner, post-upload trigger, life event prompts

### Agent
- **Opportunity Dashboard:** Add conversion likelihood badge, sort by score
- **Client Priority Queue:** "3 clients with critical gaps" in ActionQueueCard
- **Suggested Actions:** Auto-generated playbook per opportunity

---

## 7. MVP Roadmap (Phased)

### Phase 0: Foundation (Week 1-2)
1. Prisma migration (enhance profile + new tables)
2. Profile gap rules engine (pure functions)
3. Protection score calculator (unified scoring)
4. API endpoints (protection-score, recommendations)
5. Wire into existing coverage insights page

### Phase 1: Smart Recommendations + Agent View (Week 3-4)
1. Recommendation persistence and lifecycle
2. Agent opportunity scoring
3. Agent dashboard enhancements
4. Life event triggers
5. Daily protection score cron job

### Phase 2: AI Enhancement + Product Matching (Week 5-8) ✅ COMPLETED
1. ✅ AI risk insights via existing multi-provider layer (`analyzeRiskProfile()` on all 3 providers: Gemini, OpenAI, Anthropic + mock)
2. ✅ Product catalog model + seed data (`InsuranceProduct` model, 9 Greek market products)
3. ✅ Product matching in recommendations (`matchProductsToRecommendations()` with profile tag scoring)
4. ✅ Behavioral nudges in weekly digest (top 3 recommendations + profile completeness nudge)
5. A/B testing + conversion tracking (deferred — tracking infrastructure exists via `dismissReason`)
6. ✅ Agent playbooks (`agent-playbook.ts` + `GET /api/v1/agent/playbooks` API)

### Phase 3: UX Integration + Agent Intelligence ✅ COMPLETED
1. ✅ Post-upload gap engine trigger (auto-refresh protection score after policy analysis + creation)
2. ✅ Critical gaps summary banner in agent ActionQueueCard (top 3 clients with critical/high gaps)
3. ✅ Conversion likelihood badge on agent opportunity cards (CustomerProfile, ClientOverviewTab, OpportunitiesClient)
4. ✅ Opportunity scoring in pipeline view (batch scoring with `scoreOpportunity()` for open/contacted opportunities)
5. ✅ Home page protection score integration (cached score from gap engine replaces legacy ad-hoc calculation)

---

## 8. Risks & Constraints

### Data Limitations
- Risk profiles will be sparse initially. Mitigation: gate protection score behind profile completion.
- No product catalog in Phase 0-1. Recommendations will be generic by LoB.

### Performance Considerations
- Protection score computation is lightweight; cache in table with 24h TTL.
- Gap detection on page load is fine for <50 policies per user.
- Phase 2 AI insights should be computed asynchronously.

### Technical Debt
1. Inconsistent `GapInstance.status` values ('detected' vs 'open') -- should normalize.
2. Health score computed in 3 different places -- unified ProtectionScore resolves this.
3. `coverageSummary` is unstructured text -- prefer ACORD data path.

### Key Trade-offs

| Decision | Trade-off | Why |
|---|---|---|
| Rule-based MVP over AI-first | Less "magical" but explainable | AI can't explain mortgage-specific rules as trustworthily |
| Separate `ProtectionScore` table | Extra write on change | Avoids N+1 queries on agent dashboard |
| No product catalog Phase 0-1 | Generic recommendations | Speeds delivery by 3-4 weeks |
| Cache-first architecture | Scores 24h stale | Acceptable for insurance; forced refresh on edit |
| Extend `PolicyholderProfile` | Wider model | Avoids join complexity |
