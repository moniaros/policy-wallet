# Token Economics — July 2026 (supersedes token_pricing_analysis.md)

**Status:** adopted; the paywall, quotas, and top-up prices in code reflect this document.
**Superseded doc:** `docs/token_pricing_analysis.md.resolved` assumed Gemini **2.0 Flash** at ~€0.175/M blended. The pipeline actually runs **Gemini 2.5 Pro** for extraction and gap detection — ~13× that cost. Every conclusion below is recomputed at real prices.

## 1. Verified consumption (from code)

| Operation | Token budget | Source |
|---|---|---|
| Full policy analysis (with PDF) | ~180–220K (extraction 85K dominates; ×1.2 buffer) | `lib/services/analysis/token-budget-estimator.ts` |
| Policy Q&A question | ~15K | `wallet/actions.ts` estimate |
| Legacy gap analysis | ~60K | `wallet/actions.ts` estimate |

## 2. Provider cost (blended 85% input / 15% output; list prices — re-verify quarterly)

| Model | Blended €/M | Full analysis | Q&A |
|---|---|---|---|
| Gemini 2.5 Pro | ~€2.38 | €0.30–0.48 | — |
| Gemini 2.5 Flash | ~€0.62 | €0.08–0.13 | ~€0.01 |
| GPT-4.1-mini | ~€0.54 | ~€0.11 | ~€0.008 |
| Claude Sonnet (premium failover) | ~€4.46 | ~€0.89 | — |

With clarity/translation/savings/checklist routed to Flash (shipped: `GEMINI_MODEL_CLARITY_ANALYSIS` defaults to `gemini-2.5-flash`), only extraction (85K) and gap detection (~30–45K) stay on Pro → **blended per-analysis cost drops to ~€0.19–0.28**.

## 3. Adopted plan economics

| Plan | Price | Token budget | Max AI exposure (post-routing) | Floor margin at 100% utilization |
|---|---|---|---|---|
| Free | €0 | **0** + one trial analysis | ~€0.28 once | acquisition cost |
| Plus | €2.99/mo (€29/yr) | 1M/mo | ~€1.40 | ~53% |
| Pro | €9.99/mo (€99/yr, 14d trial) | **3M/mo** (was 5M) | ~€4.20 | ~58% |
| agent_free / starter / pro / agency | €0 / 19.99 / 49.99 / 99.99 +VAT | 0.5M / 2M / 10M / 25M | — | 40–76% |

Top-ups (policyholder, paid tiers only — repriced in `lib/billing/token-packages.ts`):
| Pack | Price | €/M | Margin vs €1.40/M |
|---|---|---|---|
| 500K | €1.99 | €3.98 | ~65% |
| 1M ⭐ | €3.99 | €3.99 | ~65% |
| 5M | €16.99 | €3.40 | ~59% |
| 10M | €29.99 | €3.00 | ~53% |

(Old prices €0.49/500K–€0.99/1M sold **below** the 2.5-Pro cost — corrected.)
Agent top-ups (unchanged, already profitable): €1.99/€0.99/€0.49 per 100K by tier.

**Single quota currency:** the token budget is the only AI meter. Per-day counters (`questionsPerDay`, `gapAnalysisPerDay`) remain as abuse guards; `aiAnalysisPerMonth` is display-level.

## 4. Avoiding acquisition costs (the trial + free tier)

Ranked by leverage; ① – ④ are implementable without product changes:

1. **Agent-sponsored acquisition (zero-CAC channel).** When an agent invites a client, attribute the client's first analysis to the **agent's** token budget (agents' budgets carry 40–76% margins). The agent channel then acquires policyholders at zero platform cost — and agents are motivated: an analyzed client generates opportunities. *(Roadmap: attribution flag on `createRun` when initiated via an `agent_client` invite.)*
2. **Trial on the cheap path.** Run the one-time trial with Flash/4.1-mini end-to-end (~€0.08–0.13 instead of €0.28–0.48). Trial users can't compare quality; the upgrade moment is the *existence* of the analysis. *(Roadmap: `routeModel` already takes a tier param — add a `trial` tier mapping.)*
3. **Extraction-cache dedupe (shipped).** Standard Greek policy wordings repeat heavily across users; `extraction-cache` makes the dominant 85K extraction step near-zero marginal cost for repeat documents. At scale this compounds: popular insurer products converge on cache hits.
4. **Qualify before spending.** The trial fires only after a real document upload + AI consent (already the case). Once the auto-signup freeze lands (GitHub issue), require verified email too — bots and drive-by signups never reach the spend.
5. **Trial scope reduction.** Skip savings/checklist steps in trial runs (−~40% tokens) and blur those sections as the upgrade teaser — cheaper AND a stronger hook than giving everything away once.
6. **Batch-API pricing for background runs.** Provider batch endpoints are ~50% off; upload-triggered and trial analyses are already asynchronous — they tolerate minutes of latency.
7. **Context caching for fixed scaffolding.** Gap definitions, checklist pillars, and system prompts are identical across runs; provider prompt-caching discounts cached input ~75%.
8. **Referral-funded generosity.** Extra analyses granted via referral credits (ledger already exists) instead of paid acquisition — CAC becomes a revenue-share with users.

## 5. Optimizing the price of a policy analysis

1. **Step-level model routing (shipped).** Only extraction + gap detection need 2.5 Pro; everything else on Flash. Blended cost −40–50%.
2. **Local text extraction before the LLM.** Most Greek policy PDFs have a text layer; extracting text locally and sending text (not the PDF) uses the estimator's no-document path: extraction 85K → ~20K, **per-analysis cost −~55%**. Highest-leverage single change left.
3. **À-la-carte deep analysis (roadmap).** Sell a one-off "deep analysis" at €1.49 to free users (impulse purchase, ~80% margin post-routing). Monetizes non-subscribers and anchors the €2.99 subscription as the obvious better deal.
4. **Pro budget capped at 3M (shipped)** — keeps worst-case exposure under the plan price; heavy users route to top-ups (positive margin) instead of eroding subscription margin.
5. **Annual prepay (-20%)** — improves cash flow and halves effective CAC amortization via lower churn.
6. **Cost telemetry → pricing loop.** `TokenUsage.costEur` records real per-operation cost; review monthly in `/admin/tokens` and re-tune budgets/prices against actuals instead of estimates.

## 6. KPIs to watch monthly

- AI cost as % of MRR (target < 15%)
- Trial → paid conversion within 14 days (target ≥ 8%)
- % of trial analyses served from extraction cache
- Top-up attach rate among paid users (target 15–20%)
- Per-tier utilization distribution (if p95 Plus utilization > 80%, revisit the 1M budget)
