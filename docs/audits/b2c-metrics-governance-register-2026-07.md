# B2C metrics governance register (July 2026)

Product-governance / actuarial-communication / consumer-protection review of
**every** B2C metric, insight, score, warning, and recommendation. Each item is
documented against the seven required dimensions:

**DS** Data source · **CR** Calculation / decision rule · **AS** Assumptions ·
**CL** Confidence & limitations · **UA** Intended user action · **MU** Possible
misunderstanding · **RR** Regulatory / reputational risk.

Status: **retained** (defensible as-is) · **qualified** (kept + disclosure added)
· **revised** (wording changed) · **renamed** · **removed**. B2B surfaces
(opportunity likelihood, agent extraction-confidence, relationship indicator) are
role-gated and out of scope.

---

## Scores

### 1. Portfolio protection score (0–100) — `/dashboard` tile + `/coverage-insights` — **qualified**
- **DS** Rule engine over the user's policies + risk profile (`gap-engine/protection-score`).
- **CR** Expected lines for the profile vs lines actually held, minus in-policy gaps, category-weighted.
- **AS** The risk profile is complete enough to infer "expected" lines; extraction is accurate.
- **CL** Provisional under 80% profile completeness; a flat per-severity fallback is labelled provisional; **now carries an Athens-pinned "as of" date**.
- **UA** Review flagged categories; complete the profile for accuracy.
- **MU** "High = I'm safe" / "low = my claim will be refused." **Closed this program:** the methodology limits now state a high score ≠ adequate cover / loss paid, and a low score ≠ claim rejected; breadth ≠ adequacy.
- **RR** Presenting a completeness proxy as an adequacy verdict → mitigated by methodology + limits + not-advice + provisional labelling.

### 2. Category sub-scores (%) — `/coverage-insights` ProtectionScoreCard — **retained**
- **DS/CR** Same engine, per coverage type. **AS/CL** Inherits the parent score's. **UA** See which types are thin. **MU** "40% = my auto policy is 40% good" — it's coverage-type breadth, under the same methodology disclosure. **RR** Low; covered by the parent disclosure.

### 3. Profile completeness (%) — score card + wizard — **retained**
- **DS** Fields the user has provided. **CR** Proportion of profile fields present. **AS** More fields → sharper inference. **CL** Drives the "provisional" score state. **UA** Complete the profile. **MU** "100% complete = fully insured" — **closed**: the score limits now say completeness/breadth ≠ adequacy. **RR** Low.

### 4. Per-policy health score (0–100 + verdict) — `/wallet/[id]` SummaryCard — **qualified (this pass)**
- **DS** This policy's detected gaps + AI fine-print risk ratings + verification flag.
- **CR** 100 − 15/gap − 10/critical-clause − 4/warning-clause, +5 if verified.
- **AS** Gap detection and clause risk-rating are correct; more gaps/flagged clauses = more to look at.
- **CL** Partly AI-derived (gaps, clause ratings inherit AI uncertainty); shown under an AI chip.
- **UA** Open the flagged sections; verify the reading.
- **MU** A bare "72 / needs a look" donut reading as an objective quality verdict. **Closed this pass:** it now ships the same `ScoreMethodology` disclosure (rule + limits + not-advice); limits state it is not adequacy and not a claim prediction, and that **exclusions do not lower it**.
- **RR** An unexplained score implying claim outcomes → mitigated by the new disclosure. (Prior actuarial bug — docking points per exclusion — already fixed in the engine.)

## Estimates & monetary figures

### 5. Savings report total + per-item estimates (€) — Pro export — **revised**
- **DS** AI `savingsOpportunities`. **CR** Sum of per-item `estimatedAnnualSavingsEur`. **AS** The AI's savings estimate is plausible; insurer quotes will follow. **CL** Indicative only; per-item model confidence removed. **UA** Get real quotes; compare cover, not just price. **MU** "Guaranteed savings." **Closed:** «Ενδεικτική εκτίμηση», pseudo-certainty removed, caveat next to the total (indicative; insurer quotes decide; lower premium can mean less cover; policy is authoritative). **RR** Estimated-as-guaranteed → mitigated.

### 6. Premium footprint (€) — `/dashboard` PortfolioSummary — **retained**
- **DS** Extracted premium amounts. **CR** Plain sum. **AS** Premiums extracted correctly. **CL** Reflects uploaded policies only. **UA** Awareness. **MU** Minimal (labelled sum). **RR** Low.

## Coverage gaps, warnings & risk indicators

### 7. Coverage gap count + severity — `/coverage-insights`, policy detail — **retained**
- **DS** Rule + AI gap detection. **CR** Count of detected gaps; severity from the rule. **AS** Detection is reasonably complete for uploaded policies. **CL** Hedged «πιθανό»; evidence line per gap. **UA** Review each; discuss with an advisor. **MU** "Gap = I'm uninsured / a claim fails" — framed as *possible* exposure, not a verdict. **RR** Fear-inducing framing → mitigated by neutral, hedged copy.

### 8. Fine-print clause risk flags (critical / warning) — policy detail — **retained**
- **DS** AI analysis of the wording. **CR** Per-clause risk rating. **AS** The AI reads the clause correctly. **CL** Under the AI-analysis chip + `AiDisclaimer`; the policy is authoritative. **UA** Read the flagged clause in your own policy. **MU** Treating an AI flag as a legal determination. **RR** Mitigated by AI disclaimer + provenance; **feeds the health score, which now explains itself.**

### 9. Warnings — expiry banner, auto-renewal note, underinsurance, surrender-value — **retained**
- **DS** Extracted dates / sums (expiry, renewal, insured value vs rebuild), branch content. **CR** Rule thresholds (expired, near-expiry, value shortfall). **AS** Extracted dates/sums are correct. **CL** Hedged («φαίνεται»); the expiry notice states consequence + action, not alarm. **UA** Request a renewal quote / review the sum insured / contact insurer or advisor. **MU** False urgency. **RR** Fear/pressure → mitigated (neutral, action-oriented; the gap-alert email was de-escalated earlier).

## AI-generated insights

### 10. Plain-language summary + coverage snapshot — policy detail — **retained**
- **DS** AI analysis of the document. **CR** Model-generated prose / covered–notCovered–exclusions lists. **AS** Extraction is accurate. **CL** Under an explicit AI chip; `AiDisclaimer` present; the document is authoritative. **UA** Read alongside the policy. **MU** Treating the summary as the contract. **RR** AI-over-document → mitigated by chip + disclaimer + provenance.

### 11. Ask-the-AI answers — `PolicyQA` — **retained**
- **DS** Model answering over the policy. **CR** RAG-style generation. **AS/CL** "May not be 100% accurate; verify against the policy." **UA** Verify; ask the insurer/advisor for anything material. **MU** Regulated advice. **RR** Mitigated by the inline `AiDisclaimer` on every answer.

## Recommendations

### 12. Coverage recommendations — `/coverage-insights` RecommendationCards — **retained**
- **DS** Profile + detected gaps. **CR** Rule-generated suggestions with a priority. **AS** Profile reflects real needs. **CL** Priority "is not a definitive risk assessment"; not-advice trust line. **UA** A proportionate next step (review / add cover / talk to an advisor). **MU** Regulated personal advice. **RR** Mitigated: labelled informational suggestions, priority qualified, "consult a licensed intermediary." Each card explains *why it appears* and links to the supporting finding.

---

## Non-B2C (excluded, verified role-gated)
Opportunity likelihood (0–100), agent extraction-confidence (%), client
relationship indicator — all agent/B2B surfaces; never rendered to policyholders.

## Summary of changes across the governance program
- **Removed:** per-item AI confidence % on the savings report; the exclusion
  penalty in the health-score engine (prior actuarial bug).
- **Renamed:** the overlap check (no longer headlined "savings").
- **Revised:** savings framing → indicative + caveat; gap-alert/renewal emails → neutral.
- **Qualified (disclosure/date added):** portfolio protection score (high/low
  disclaimers + "as of" date); **per-policy health score (this pass — full
  methodology, was bare)**.
- **Retained as defensible:** category sub-scores, profile completeness, premium
  footprint, gap count/severity, clause risk flags, all warnings, all AI insights,
  recommendations.
- **Nothing left unexplained:** every 0–100 score a policyholder sees now carries
  a methodology disclosure. No metric required removal.
