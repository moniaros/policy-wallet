# Deliverable 2 — Change list by URL

**PolicyWallet repositioning, 2026-08-30.** Companion to deliverable 1 (messaging hierarchy).
Every row: what changes, why, and the page's primary CTA after the change.

Decisions binding this document: **D1** copy follows code, gap *and* duplicate detection are
Family · **D2** the /trust pledge is qualified with consent (legal) · **D3** soft launch / early
access, no GA claim.

---

## Part A — The plan-gating truth table

**The single truth, after D1.** Every surface below must say this and nothing else.

| Feature | Free | Plus | Family | Enforced today? |
|---|---|---|---|---|
| Policies stored | 3 | 10 | 25 | ✅ `plan-defaults.ts:94,111,129` |
| Full AI reading of each policy | ✅ | ✅ | ✅ | ✅ |
| Renewal date shown | ✅ | ✅ | ✅ | ✅ |
| Email renewal reminders | — | ✅ | ✅ | ✅ `notifications` |
| Smart reminders | — | — | ✅ | ✅ `advanced_renewal_reminders` |
| **Gap detection** | — | — | ✅ | ✅ `gapAnalysisPerDay: 0/0/null` |
| **Duplicate-cover detection** | — | — | ✅ | ❌ **gate exists, applied nowhere** |
| Unlimited questions | — | — | ✅ | ✅ `interactiveQA` |
| Claims guide · report export · agent collaboration | — | — | ✅ | ✅ |

### The two things that are not copy edits

**A1 · Apply the duplicate-detection gate.** `feature-gates.ts:130-135` declares
`duplicate_coverage_detection → requiredPlan: "pro"` and **nothing checks it**;
`tests/unit/feature-gate-reachability.test.ts:15` whitelists it in `KNOWN_UNGATED`. Applying it
means gating `duplicateCoverageRules()` output (`lib/services/gap-engine/portfolio-rules.ts:280`)
and **removing the whitelist entry** — the whitelist is what currently certifies the hole, so
leaving it would let the gap silently return.
**This removes a capability Free and Plus users have today.** Open Question 9 — not mine to decide.

**A2 · Add the parity test that does not exist.** `lib/pricing/public-pricing-content.ts` is a
git-tracked file with **no code path tying it to** `plan-defaults.ts` or the DB `entitlements` JSON.
The comparison-table row matches the entitlements today by authoring discipline and a comment, not
by any check. Every copy fix below is undone by the next careless edit unless a test asserts
`public-pricing-content` bullets against `DEFAULT_ENTITLEMENT_LIMITS`.
**Ship the test in the same change as the copy, or do not ship the copy.**

### Surfaces carrying a wrong claim today

| Surface | Says | Should say |
|---|---|---|
| `public-pricing-content.ts:109` Free card | gap detection **included** | remove the bullet |
| `public-pricing-content.ts:133` Plus card | gap & duplicate **included** | remove the bullet |
| `positioning.ts:452,459` → homepage + /compare | verdict `plus` → renders **"Ναι, με το Plus"** | verdict must render **Family** |
| `ProductSections.tsx:126` | «— με το Plus» | «— με το Family» |
| `marketing-content.ts:26-27` → **HowTo JSON-LD** | gap unqualified, duplicate Family | both Family |
| `ServicesGrid.tsx:23`, `HeroSlides.tsx:117`, `marketing-content.ts:24` | comments say "Plus-only" | correct the comments too, or the next author re-drifts |
| **`PremiumInsightCards.tsx:21`** *(in-app)* | «Διαθέσιμα με το Plus» over 6 Family features | **escalate separately — billing risk** |
| **`upgrade-copy.el.ts:209-211`** *(in-app)* | partner offers "with Plus", gate says Family | same escalation |

---

## Part B — Change list by URL

Every consumer page is mirrored at `/en/*`; the mirror carries the identical change unless noted.
`/solutions` and `/guides` are already public **prefixes** in `proxy.ts`, so new pages under them
need no allowlist edit. **A new top-level route would** — none is proposed.

---

### 1. `/` and `/en` — **Edit** · the largest change

**What changes**
1. **Hero restructure.** Fixed `<h1>` carrying the promise; today's rotating slide-1 becomes the
   static sub-head. `HeroSlides` is demoted from headline-rotator to a **sub-head rotator**, or
   removed — see the note below. Wire the existing, unused `PROMISE` constant.
2. **Health becomes hero rotation 1.** Replaces the "hidden benefits" slide (weakest of the three,
   and its «οδική βοήθεια» framing leans motor). Duplicates slide stays but loses «— με το Family»
   in favour of the corrected gating language.
3. **Neutrality sentence replaced** at `WorldClassLanding.tsx:243-244` (deliverable 1 §5).
4. **Trust bullet 2 body rewritten** in `positioning.ts` `DIFFERENTIATORS`. Bullets 1 and 3 keep
   their titles; 3 gains the bank/insurer explicitness.
5. **Data-location claim corrected** — `TRUST_FACTS[1]` «Τα δεδομένα σας μένουν στην Ευρώπη» is
   inaccurate and must become the storage/analysis split (deliverable 1 §3.2).
6. **Gating language corrected** in `ServicesGrid`, `AudienceTabs`, `HeroSlides` and the
   `COMPARISON_ROWS` verdict.
7. **Partner teaser** added above the footer — one line and a link to `/solutions/partners`. No
   institutional logos, no claim of existing partnerships.

**Why** The page currently leads with a feature, states a promise nowhere, carries a sentence that
expires on the first pilot, and makes a data claim that the subprocessors page contradicts.

> **Note for deliverable 3:** demoting the rotator is a **structural** change to a component with
> deliberate accessibility work in it (pause control, `aria-live` discipline, `inert` on inactive
> slides, 44px targets, and a fix for a previous three-`<h1>` bug). Whatever replaces it must keep
> that machinery — `components/growth/use-rotation.ts` is the shared primitive and should be reused,
> not re-solved. Do not hand-roll a second rotator.

**Primary CTA** unchanged — «Δημιουργήστε λογαριασμό» / "Create your account". Secondary stays
«Έλεγχος αναγκών σε 6 βήματα».

---

### 2. `/product/health` and `/en/product/health` — **Expand into the lead wedge page**

**What changes** Today it is a 109-line thin line page on the shared `LoBPageShell` with three
sections. It becomes the deepest consumer page on the site:
- the increase letter — what it is, what it must contain, how to read it
- **ΕΔΑ in one paragraph** — the index that replaced IOBE, and what it does and does not determine
- limits, exclusions, waiting periods, explained in the reader's own words
- «Ερωτήσεις πριν ανανεώσετε» — the questions, never a recommendation
- what PolicyWallet contributes: reads *your* policy and answers these against it

**Why** Wedge 1. The line people understand least, pay most for, and are angriest about — and the
only wedge where the product's contribution (reading a document nobody reads) maps exactly onto the
anxiety.

**Blocked on** Open Question 8 — every figure (7–10%, ΕΔΑ 6.24%, seven in ten) needs a primary
source before publication. **The page can ship without them**; the mechanism explains itself.

**Primary CTA** «Ανεβάστε το ασφαλιστήριο υγείας σας» → signup with source tag. Secondary: the
health guides.

---

### 3. ENFIA guide — **CORRECTED to EXTEND** · and `/product/property` — **Expand**

**Correction (2026-08-30).** The brief proposed a new guide at `enfia-ekptosi-asfalisi-katoikias`.
**A guide already exists at `ekptosi-enfia-asfalisi-katoikias`** — same claim, permuted slug — and
it already carries the 20% figure, the €500.000 threshold, the ΑΑΔΕ declaration process and a
"does my policy qualify" section. Creating the brief's slug would put **two live URLs on one
statutory claim**, which this repo treats as a halt condition, not a judgement call.

**What changes** EXTEND the existing guide with the two things it verifiably lacks: what
«φυσικές καταστροφές» actually includes (the peril-scope question — currently absent from the body),
and the evidence checklist. `/product/property` gains a short ENFIA section linking to it — **the
guide stays canonical, the product page links; never both making the claim.**

**Why** Wedge 2. Concrete, checkable, money-shaped — a reason to open a policy nobody otherwise opens.

**Blocked on** Open Question 8 — the 20% / €500k rule needs its primary source. Unlike the health
figures this one **is** load-bearing: the guide is about the rule.

**Primary CTA** «Δείτε αν το συμβόλαιό σας πληροί τα κριτήρια» → signup.

---

### 4. `/needs` and `/en/needs` — **Edit**

**What changes** Positioned as the household entry point. Add a **health branch** (do you hold
private health cover; have you had an increase letter) and an **ENFIA branch** (do you own the home;
is it insured for natural catastrophe). Existing wording audited so no question or outcome reads as
advice.

**Why** It is the only ungated tool on the site and already the secondary CTA everywhere. It should
route into the two wedges rather than terminating in a generic result.

**Constraint** The form recently gained «Κάτι άλλο» on every required single-choice question and
«Κανένα από αυτά» on every multi-select, because a visitor the list did not describe could not
advance. **Any new branch inherits that rule** — and `tests/unit/needs-check-none-of-these.test.tsx`
enforces it, so a new multi-question without it fails rather than ships.

**Primary CTA** unchanged — the result screen's «Δείτε τι αξίζει να ελέγξετε».

---

### 5. `/solutions/agents` — **Keep** · minor only

**What changes** Align any consumer plan-gating language with Part A. Nothing else. The agent
gating (client quotas, analysis quotas) is a **separate, correct** system and is not touched.

**Why** Agents are customers of the tool. Merging their page with Zone C would blur customer and
partner, which the brief forbids.

**Primary CTA** unchanged.

---

### 6. `/solutions/partners` + `/solutions/synergates` — **New** · English-first

**What changes** New page, per brief §2 Zone C. English is the source; Greek is the mirror —
inverting the site's default, and worth a note in the file so nobody "corrects" it.

Central argument: customers hand **competitor** policies to a layer they perceive as theirs. That
neutrality is why the data exists at all, and why an institution cannot obtain it by building a
captive tool under its own brand.

Named vocabulary: needs-based distribution · IDD demands-and-needs · 360° customer view · consent
architecture · explainable AI · GDPR Art. 9 handling · DORA-ready vendor posture · AI-Act scoping
(needs analysis and explanation only — **never pricing, never underwriting**).

**Hard constraints** No named bank, insurer or group. No implied partnership, pilot or discussion.
No founder-employer reference. No user numbers. Soft-launch register per D3.

**Blocked on** Open Question 2 (intermediary registration / IDD opinion) — an institution's
compliance reader asks this on page one. **And on D2**: the page cannot ship while /trust carries an
unqualified pledge never to transfer data to banks.

**Primary CTA** "Talk to us" → `/contact` with subject **«Συνεργασία»** (the existing partnership
subject — no new form).

---

### 7. `/trust` and `/platform` — **Edit**

**What changes**
- **/trust `pledge`** — qualified with consent per D2. **Legal drafts; I flag.**
- **/trust `documents`** — the storage/analysis split: encrypted at rest in the EU (Supabase, Paris);
  AI analysis only with consent and possibly outside the EU under DPF/SCCs; no provider may train on
  documents. Link to `/subprocessors`.
- **/trust `ai`** — strengthen from "not advice" to also "AI-generated, can be wrong, every extracted
  field is reviewable" (Art. 50 posture).
- **/platform** — same AI-transparency strengthening; it already explains rules-decide-not-the-model
  well and needs less.

**Why** The EU claim is currently inaccurate against the site's own subprocessors page — the single
most likely thing a compliance reader finds first.

**Note** The in-product disclaimer is one shared string, `common.aiAdviceDisclaimer`, rendered by
`components/ui/AiDisclaimer.tsx` across 13+ call sites. It says "not advice" but not "can be
wrong". **One edit fixes every surface** — do that rather than adding page-level copy.

**Primary CTA** «Δείτε τι κάνουμε με τα δεδομένα σας» → `/subprocessors`.

---

### 8. `/pricing` — **Edit**

**What changes** Reconcile cards, comparison table and FAQ to Part A. Remove the gap bullet from
Free and Plus cards. State plainly what is always free: 3 policies, full AI reading, renewal dates,
export and deletion.

**Why** The page contradicts itself within one screen today — cards say Free and Plus include gap
detection, the table below says Family only.

**Ships with** the A2 parity test.

**Primary CTA** unchanged.

---

### 9. `/compare` — **Edit**

**What changes** The `plus` verdict must stop rendering the word "Plus" for Family features.
Columns (folder / insurer / agent / PolicyWallet) stay — they are good. The FAQ line "…and no
company pays us" narrows to "no insurer pays us" (deliverable 1 §6).

**Why** Same source data as the homepage excerpt, so both are wrong together and both are fixed by
one change to `COMPARISON_ROWS`.

**Primary CTA** unchanged.

---

### 10. `/guides` — **Add 6–8**, health-first

Existing corpus is **15** guides, not 12. Underinsurance, short-term letting, uninsured-vehicle and
ΕΛΓΑ already exist and are cited to primary sources.

Proposed, health first: the increase letter · ΕΔΑ explained · waiting periods · exclusions ·
group vs individual health · ENFIA (item 3). Each ends with the product's specific contribution,
never a sell.

**Blocking constraint — this is the important one.** A citation audit of the existing corpus found
**29 of 37 citations are bare origins** that substantiate nothing, and **11 of 15 guides cite
nothing checkable**. Adding correct citations on top of that makes the «Πηγές» heading *less*
trustworthy, because a reader cannot tell which kind they are looking at.
**Recommendation: the citation debt is repaired, or at least sized and scheduled, before new guides
ship.** Full audit at `docs/growth/G07-CITATION-AUDIT.md`.

**Primary CTA per guide** «Ανεβάστε το δικό σας συμβόλαιο» → signup.

---

### 11. `/company` — **Edit**

**What changes** Humble and factual. Operating entity stated (Insurance Martech Ι.Κ.Ε., ΓΕΜΗ
188863359000, seat Chios). Soft-launch register per D3. No founder-employer reference, no group
affiliation.

**Why** It is the page an institutional reader opens second, after the partner page.

**Primary CTA** «Επικοινωνήστε μαζί μας» → `/contact`.

---

### 12. Legal — `/privacy`, `/terms`, `/cookies`, `/subprocessors` — **Flag only**

Routed to DPO/legal, not drafted:
1. **Terms §3** — the transfer pledge, qualified with consent (D2). **Blocks the partner page.**
2. **Art. 9 consent-gate wording** — Open Question 4; product copy must match the reviewed text.
3. **Data-location wording** — align the legal text with the corrected marketing claim, not the
   reverse. The legal pages are already accurate; the marketing page is the one that is wrong.
4. **AI transparency** — confirm the Art. 50 posture is stated where a user meets the output, not
   only in the policy.

---

## Part C — Execution order

1. **Part A gating fix + parity test.** Everything else states plan facts; fix the facts first.
2. **A1 rollout decision** (Open Question 9) — can run in parallel, blocks only the duplicate copy.
3. **/trust and /platform** — data-location accuracy. Independent, and the current claim is wrong now.
4. **Home** — hero restructure, neutrality, trust bullets.
5. **Health wedge**, then **ENFIA guide + /product/property**.
6. **/needs** branches.
7. **/pricing, /compare, /company** — mechanical once Part A lands.
8. **/solutions/partners** — last, blocked on D2 legal and Open Question 2.
9. **Guides** — gated on the citation-debt decision.

**Not in this list, escalated separately:** the in-app `PremiumInsightCards` / `upgrade-copy`
Plus-vs-Family mislabel. It is shown post-signup next to an upgrade button and should not wait for
a marketing repositioning.
