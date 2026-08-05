# Risk-centric recommendations — audit and implementation backlog

**Date:** 2026-08-04 · **Status:** **delivered** — backlog was agreed before coding, then implemented in order
**Target shape** (from the brief):

> Customer owns two dogs. · Potential veterinary exposure exists. ·
> **Current protection:** None · **Risk priority:** Medium ·
> **Suggested action:** Consider pet insurance.

---

## 1. Audit

### 1.1 What is already risk-centric

The `RISK_CATALOG` (21 risks) was rebuilt this month around losses rather than
products. Each entry names a loss, states why it applies to this person, sizes
the impact, and carries priority and confidence. `assessRisks` consults cover
**last**, so a risk that does not apply is never examined for cover and can never
become a recommendation.

The pet example in the brief already produces close to the target shape. That is
not where the problem is.

### 1.2 Finding A — insurance is the *only* mitigation the model can express

**All 21 `suggestedSolution` entries name an insurance product.** One
(`retirement_shortfall`) hedges with "this is a savings decision more than an
insurance one"; the other twenty do not.

The brief's requirement — *insurance is only one possible mitigation* — is not
partially implemented. It is absent. There is no field in which a non-insurance
answer could be written, so no author could have supplied one.

This is the headline finding and the largest piece of work.

### 1.3 Finding B — a recommendation with no risk at all

`no_agent_connected` (`portfolio-rules.ts:342`) recommends connecting an advisor.

> *"A licensed advisor can sanity-check gaps like the ones on this page and
> handle renewals and claims on your behalf."*

There is no loss described, because there is no risk. It is a service-absence
recommendation — structurally the same defect as the `no_health` rule the July
audit removed, surviving in a file the risk rebuild did not touch. It occupies a
slot in the recommendation list, is counted in `gapCount`, and drags the
protection score.

### 1.4 Finding C — five real risks framed as policy deficiencies

`portfolio-rules.ts` bypasses the risk catalog entirely. Its findings are real,
but every title is written from the policy's point of view:

| Rule | Title today | The risk underneath |
|---|---|---|
| `home_no_earthquake` | "Home policy appears to lack earthquake cover" | Seismic damage to your home is uninsured |
| `home_underinsured` | "Home may be underinsured" | A total loss would not rebuild the house |
| `health_low_coverage` | "Health coverage limit looks low" | One hospitalisation exceeds the limit |
| `motor_expiring_soon` | "Motor policy expiring soon" | The vehicle is about to be uninsured, and cover is compulsory |
| `motor_no_roadside` | "Motor policy appears to lack roadside assistance" | A breakdown is paid out of pocket |

The `reason` strings are already risk-shaped; only the headline is inverted. The
customer reads the title.

### 1.5 Finding D — `unclear_exclusions` is a data-quality note, not a risk

> *"Exclusions could not be clearly identified."*

This says something about **our extraction**, not about the customer's exposure.
It belongs in the `needs_review` channel the engine already has, not in the list
of things the customer should act on.

### 1.6 Finding E — portfolio findings carry no assessment payload

Portfolio recommendations are constructed with `NO_ASSESSMENT` — null
`riskStatus`, `confidence`, `expectedImpact`, `suggestedSolution`. Seven of the
recommendation types therefore render as bare cards while the other twenty-one
carry the full six-field explanation. Two classes of card, one list.

### 1.7 Finding F — "Current protection" is never stated

`RiskAssessment.coveredBy` records which lines answer a risk. **It never reaches
the UI.** The card shows a status chip ("protection gap") and leaves the reader
to infer what they currently hold. The brief's format asks for it explicitly, and
it is the line that makes an `already_covered` card worth reading.

### 1.8 Finding G — exposure statements cannot be quantified where the data is boolean

The brief's example says *"Customer owns **two dogs**."* We store `hasPets` as a
boolean, so the best we can write is "you have pets". Same for `ownsBoat`,
`ownsBusiness`, `rentsOutProperty`. Vehicles, properties, children and employees
are counts and read correctly.

---

## 2. Backlog

Ordered by whether it changes what the customer is told.

### P0 — the brief's explicit requirements

| ID | Item | Why |
|---|---|---|
| **R-1** | **Mitigation ladder.** Add `mitigations: Mitigation[]` to every risk — `avoid \| reduce \| retain \| transfer`. Insurance becomes *one* labelled option, never the framing. | Finding A. The headline requirement. |
| **R-2** | **Delete `no_agent_connected`** from the recommendation stream. An advisor prompt is a product affordance, not a protection finding. | Finding B. A recommendation with no risk. |
| **R-3** | **Reclassify `unclear_exclusions`** out of recommendations into `needs_review`. | Finding D. |
| **R-4** | **Reframe the 5 surviving portfolio rules risk-first** and give them a full assessment payload (status, priority, confidence, impact, mitigations). | Findings C + E. |
| **R-5** | **Render "Current protection"** on every card from `coveredBy`, including the explicit "None". | Finding F. |

### P1 — fidelity of the exposure statement

| ID | Item | Why |
|---|---|---|
| **R-6** | `petsCount` alongside `hasPets`, so the card can say "two dogs". Boolean retained for compatibility. | Finding G, and the brief's literal example. |
| **R-7** | Quantified exposure line — a single sentence stating the exposure in the customer's own numbers, leading every card. | The brief's format leads with the exposure, not the risk name. |

### P2 — guards

| ID | Item |
|---|---|
| **R-8** | Test: every risk offers ≥1 **non-insurance** mitigation. |
| **R-9** | Test: no recommendation exists whose justification is the absence of a product — asserted over the catalog *and* the portfolio rules. |
| **R-10** | Test: every recommendation surfaced to a customer carries a full assessment payload (no two-class list). |
| **R-11** | Mobile: the mitigation ladder must not push "what covers it" below the fold at 320px. Re-measure in a real browser. |

### Out of scope, deliberately

- Rewriting AI-detected **policy** gaps (`policy_gap:*`). Those describe a
  specific document's contents — a legitimately policy-shaped finding, because
  the subject genuinely *is* the policy.
- Removing the advisor prompt from the product. R-2 removes it from the
  *recommendation list*; where it belongs instead is a separate product decision.

---

## 3. The mitigation model

Four kinds, from standard risk management, in the order a risk consultant
considers them:

| Kind | Meaning | Example |
|---|---|---|
| `avoid` | Remove the exposure | Deposit the plates on a car you no longer drive |
| `reduce` | Lower frequency or severity | Fit a monitored alarm; keep valuables in a safe |
| `retain` | Deliberately carry it yourself | A €400 vet bill against €20,000 of savings |
| `transfer` | Move it to someone else | Insurance — **or** a landlord's contractual obligation, or an employer's scheme |

Three rules:

1. **Every risk offers at least one non-`transfer` mitigation.** If the only
   honest answer is insurance, that itself is worth stating — but it must be a
   deliberate, tested claim rather than the default shape.
2. **`transfer` is not synonymous with insurance.** An employer's group scheme
   and a landlord's policy are transfers we do not sell.
3. **`retain` is a real recommendation.** For a low-severity risk against solid
   savings, "you can carry this yourself" is the correct advice, and a product
   that cannot say it is not advising.

---

## 4. Definition of done

- Every customer-visible recommendation leads with the exposure, states current
  protection, and offers insurance as one of several options.
- No recommendation exists whose sole justification is a missing product.
- Guards R-8 through R-11 pass.
- Full round green: risk-engine assertions, unit suite with zero regressions,
  guardrail gate, production build.
- 320px re-measured in a real browser.


---

## 5. Delivery record

Backlog agreed first, then implemented in order. Full round green:
**361 risk-engine assertions · 3,167 unit tests, zero regressions · whole
guardrail gate · production build exit 0 · seven widths re-measured in Chrome.**

| ID | Status | What shipped |
|---|---|---|
| **R-1** | done | `Mitigation[]` on every one of the 21 risks — `avoid \| reduce \| retain \| transfer`. `suggestedSolution` is now **derived** from the transfer entries, so the flattened column can never disagree with the ladder the customer sees. |
| **R-2** | done | `no_agent_connected` no longer reaches the recommendation stream. `noAgentRule` is retained and exported for whatever UI surface wants an advisor prompt — it is just not a protection finding. |
| **R-3** | done | `unclear_exclusions` likewise removed from recommendations. |
| **R-4** | done | Five titles rewritten from the customer's exposure. "Motor policy appears to lack roadside assistance" → **"A breakdown would be towed at your own cost."** |
| **R-5** | done | **Current protection** rendered on every applicable card, including the explicit "Καμία / None". |
| **R-6** | done | `petsCount` through schema, migration, intake and catalog. |
| **R-7** | done | Exposure stated in the customer's numbers — «Έχετε 2 κατοικίδια» — degrading to the boolean rather than inventing a number. |
| **R-8** | done | Test: every risk offers ≥1 non-insurance mitigation. |
| **R-9** | done | Test: no `whyItApplies` justifies itself by a missing product; `no_agent_connected` / `unclear_exclusions` asserted absent from the stream; no portfolio title written from the policy's point of view. |
| **R-10** | done | Portfolio recommendations carry the full assessment payload. |
| **R-11** | done | 320–1280 re-measured with the ladder expanded, in Greek: zero overflow, zero sub-24px targets. |

### The pet card, before and after

| | |
|---|---|
| **Before** | "Missing Pet Insurance" |
| **After** | **The risk** — emergency veterinary treatment is paid out of pocket, and a Greek owner is liable for injury their animal causes · **Why it applies** — «Έχετε 2 κατοικίδια» · **Expected impact** — several hundred to a few thousand euros; a bite claim can run higher · **Current protection** — None · **Priority** — Low · **What you can do** — *Carry it yourself:* keep a vet fund · *Reduce:* prevention and registration · *Transfer:* pet cover including liability |

The ordering is the point. For a healthy young animal the honest advice is the
**retain** option, and it appears first; insurance appears last, as one option
among three.

### Judgement calls worth recording

- **`retain` had to be a real recommendation.** For a small loss against solid
  savings, "you can carry this yourself" is correct advice, and a product that
  cannot say it is not advising. Three risks now lead with it.
- **`transfer` is not synonymous with insurance.** An employer's group scheme, a
  bank's assigned borrower policy and a tenancy agreement are all transfers we do
  not sell, and several risks now name them ahead of a product.
- **Two tests were rewritten, not deleted.** `portfolio-gap-rules.test.ts` pinned
  the old behaviour of the two removed rules; it now pins their absence, which is
  a stronger assertion than deleting the cases would have been.
- **Policy gaps (`policy_gap:*`) were left alone.** They describe a specific
  document's contents, so the subject genuinely *is* the policy. Rewriting them
  risk-first would have been miscategorisation, not improvement.
