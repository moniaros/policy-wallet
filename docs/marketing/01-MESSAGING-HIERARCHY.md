# Deliverable 1 — Messaging hierarchy for policywallet.gr

## Context

The site is live, insurer-neutral and regulatorily careful. It is not underperforming because the
copy is bad; it is underperforming because it leads with a **feature** and never states its
**promise**, and because one sentence it leans on will become false the day an institutional pilot
is signed. This document fixes the hierarchy so every later page edit has one thing to point at.

Written Greek-first. English carries identical meaning, not a looser paraphrase.

---

## 0. Four things I verified before writing, three of which change the brief

**1. The brief misidentifies the H1.** «Όλα τα ασφαλιστήρια, από όλες τις εταιρείες, σε ένα ασφαλές
σημείο» is not a static headline — it is **slide 1 of a three-slide rotating carousel**
(`components/landing/HeroSlides.tsx`), and whichever slide is active renders as the `<h1>`.
Confirmed against the live page. So "move the promise into the H1" is a **structural** change, not
a copy swap: the H1 must become fixed, and the rotation demoted. That is also the better outcome
independently — a rotating `<h1>` gives crawlers and screen readers a headline that changes every
seven seconds.

**2. A `PROMISE` constant already exists and is never rendered.**
`lib/marketing/positioning.ts:178` defines `PROMISE.lead` / `PROMISE.accent`
(«Η ζωή σας άλλαξε.» / «Η ασφάλειά σας το ξέρει;»). `WorldClassLanding.tsx:27` imports it and
**never uses it** — a dead import, and neither string appears on the live page. The slot this
deliverable fills already exists and is empty. The existing text is not the promise we now want,
so it gets rewritten rather than merely wired up.

**3. The eyebrow is not bilingual.** The brief says the eyebrow line is right and stays. **The
Greek is; the English is a different claim.** `positioning.ts:68` —
el: «Δεν αξιολογούμε συμβόλαια. Αξιολογούμε την προστασία σας.»,
en: "AI Personal Risk Intelligence". One is a promise about neutrality, the other is a category
label. The module's own stated rule is that English must carry the identical meaning. **Needs a
decision — see Open Question 5.**

**4. The neutrality sentence has exactly one home**, `WorldClassLanding.tsx:243-244`, inside a
trust row — confirmed by exhaustive sweep. One file, one string.

**5. But the eyebrow's reach is wider than the hero.** `CATEGORY` also drives the footer identity
line (`PublicMegaFooter.tsx:307`), the **JSON-LD `slogan`** (`lib/seo/jsonld.tsx:65`) and the **OG
card** (`lib/seo/og-card.tsx:38`). The EL/EN mismatch therefore propagates into structured data and
social previews, which is where a mismatched claim is hardest to notice and longest-lived.

**6. The neutrality *concept* is independently worded in three more places, and one of them
conflicts with Zone C** — see §6 below. This is the finding with the largest consequence in this
document.

---

## 1. The promise

**Core promise — becomes the fixed H1, both languages, every page's top of hierarchy.**

> **EL:** Μάθετε τι πραγματικά καλύπτουν τα συμβόλαιά σας.
> **EN:** Know what your policies actually cover.

The brief's English was *"Know what you are actually covered for."* I have written the Greek first
per §5, and «τι καλύπτει το συμβόλαιό σας» is the phrase people actually use — it is in the brief's
own vocabulary list. The plural («τα συμβόλαιά σας») is deliberate: the product's unit is the
household's whole set, not one document, and the singular would quietly re-scope the promise.
The brief's phrasing is available as an alternative if preferred — flagged, not silently changed.

**Sub-head — the demoted feature, verbatim from today's slide 1 plus what it is for:**

> **EL:** Όλα τα ασφαλιστήρια, από όλες τις εταιρείες, σε ένα σημείο — διαβασμένα και εξηγημένα στα ελληνικά.
> **EN:** Every policy, from every company, in one place — read and explained in plain language.

**Eyebrow — unchanged in Greek**, «Δεν αξιολογούμε συμβόλαια. Αξιολογούμε την προστασία σας.»

---

## 2. Three proofs

Ordered. Health leads on every surface where all three appear.

### Proof 1 — Health clarity *(the wedge)*
**Claim:** The policy you already hold, explained: limits, exclusions, waiting periods, and what
the increase letter actually says.
**Why it leads:** private health is the line people understand least, pay most for, and are angriest
about now — 2026 renewals at 7–10%, the IOBE index abolished January 2025 and replaced by ELSTAT's
ΕΔΑ at a first value of 6.24%, seven in ten policyholders never changing programme. `[verify]` all
four figures before any of them is published; none is currently on the site.
**What we do NOT claim:** that we can tell anyone whether to renew, switch or accept an increase.
The output is the questions to ask before renewing.

### Proof 2 — Home & ENFIA
**Claim:** Whether the policy you already hold qualifies for the 20% ENFIA discount, what "natural
catastrophe" actually includes, and the evidence kept in one place.
**Why it works:** roughly one in five Greek homes is insured `[verify]`; the discount is a concrete,
checkable, money-shaped reason to look at a policy nobody otherwise opens.
**What we do NOT claim:** that we file anything, or that we guarantee the discount.

### Proof 3 — The household view
**Claim:** Parents, children, property, vehicles and a small business as one protection map, with
consent held per person.
**Why it works:** it is the only proof that is structurally hard to copy, and it is already built
(the Family plan). It is also the honest frame for special-category data: consent is per person and
per document, not one blanket switch.

---

## 3. Three supporting messages

1. **Insurer-neutral by design, not by abstention.** The analysis is identical for every policy,
   whoever issued it. That is a property of how the product is built and paid for — it does not
   depend on who we do or do not talk to.
2. **Your document, your consent, revocable.** Nothing is read by an AI provider, and nothing
   reaches an adviser, without a separate consent you can withdraw. Storage is encrypted in the EU;
   analysis may involve providers outside it under EU-approved safeguards; **no provider may train
   on your documents.**
3. **Understanding, not advice.** The verbs are *understand, see, organise, prepare*. Where a gap
   is shown, the next step is the questions to ask your insurer or adviser — never a product. This
   is not regulated insurance advice and does not replace your agent.

---

## 4. The never-say list

**Commercial framing — banned outright**
`compare and save` · `best price` · `cheapest` · `marketplace` · `digital broker` ·
`σύγκριση τιμών` · any verb that recommends a product, an insurer or a switch

**Unearned credibility — banned because none of it is true today**
user or customer counts · "trusted by" · testimonials · insurer or bank logos · accuracy
percentages · any named bank, insurer or group · any partner, pilot or negotiation, however hedged ·
the founder's employer or any group affiliation

**Newly banned by this repositioning**
- **«Δεν συνεργαζόμαστε με καμία ασφαλιστική»** and its English pair. Retired — §5.
- **«Τα δεδομένα σας μένουν στην Ευρώπη» / "Your data stays in Europe."** Currently live
  (`positioning.ts` `TRUST_FACTS[1]`, rendered on the homepage) and **not accurate**: AI analysis
  may run outside the EU under DPF/SCCs. Replacement wording in §3.2.
- **Any plan-gating claim at all**, on any surface, until Open Question 1 is answered. Four
  surfaces currently disagree; adding a fifth statement before the truth is settled makes it worse.

**Tone**
no exclamation marks · no fear-selling · no hype · formal plural (εσείς) throughout, never εσύ

---

## 5. The rewritten neutrality sentence

**Retire (live today, `WorldClassLanding.tsx:243-244`):**
> «16 είδη ασφάλισης. Δεν συνεργαζόμαστε με καμία ασφαλιστική — γι' αυτό μπορούμε να σας πούμε την αλήθεια.»
> "16 types of insurance. We do not work with any insurance company — that is why we can tell you the truth."

The claim is not just fragile, it is **the wrong argument**. It grounds trust in an absence of
relationships, which is a fact about our contact list rather than about the product — and it becomes
false the day a pilot is signed, retroactively making everything next to it look negotiable.

**Replace with — grounded in how we are paid and how the analysis works:**

> **EL:** Καμία ασφαλιστική και καμία τράπεζα δεν μας πληρώνει για να σας προτείνουμε κάτι. Δεν παίρνουμε προμήθεια. Η ανάλυση είναι ίδια για κάθε συμβόλαιο, όποιος κι αν το εξέδωσε — και τίποτα από όσα ανεβάζετε δεν κοινοποιείται χωρίς τη δική σας, ξεχωριστή και ανακλητή συγκατάθεση.
>
> **EN:** No insurer and no bank pays us to recommend anything. We take no commission. The analysis is the same for every policy, whoever issued it — and nothing you upload is shared without your separate, revocable consent.

Four clauses, each independently checkable, each true standalone **and** embedded. Note what it no
longer says: nothing about who we work with. That question stops being load-bearing.

### The three trust bullets, rewritten

Current text is `positioning.ts` `DIFFERENTIATORS` (lines 190–226). **Only bullet 2 actually
breaks** — worth stating, because it is the one that would have been missed.

| # | Title (unchanged) | Body today | Body after | Why |
|---|---|---|---|---|
| 1 | Δεν πουλάμε ασφάλειες | «Δεν είμαστε ασφαλιστική εταιρεία. Δεν έχουμε προϊόν να σας προτείνουμε.» | *unchanged* | True in both scenarios. Leave it alone. |
| 2 | Δεν παίρνουμε προμήθεια | «**Πληρωνόμαστε μόνο από εσάς, με συνδρομή.** Δεν κερδίζουμε τίποτα αν αλλάξετε εταιρεία.» | «**Δεν παίρνουμε προμήθεια από καμία ασφαλιστική.** Δεν κερδίζουμε τίποτα αν αλλάξετε εταιρεία — ούτε αν δεν αλλάξετε.» | **"Paid only by you" becomes false when an institution pays for an embedded deployment.** The commission claim is the one that matters and it survives; the funding claim does not. |
| 3 | Δεν πουλάμε τα δεδομένα σας | «Τα συμβόλαιά σας είναι δικά σας. Κανείς δεν τα βλέπει αν δεν το ζητήσετε εσείς.» | «Τα συμβόλαιά σας είναι δικά σας. Κανείς άλλος δεν τα βλέπει — ούτε ασφαλιστική, ούτε τράπεζα — παρά μόνο αν το επιλέξετε εσείς, ξεχωριστά για κάθε έγγραφο.» | True today; made explicit about the two parties a reader will now wonder about, and about per-document granularity. |

English pairs to be written with the page copy, carrying identical meaning.

**Good news worth stating so it does not get churned:** the two-clause line «Δεν πουλάμε ασφάλειες
και δεν παίρνουμε προμήθεια» is re-typed in **~20 other files** (all 16 LOB FAQs, /company,
/pricing, /product, the footer, `lib/seo/site.ts`, `lib/seo/marketing-pages.ts`). **It survives
partnership unchanged and needs no edit.** Only the homepage's bullet-2 body breaks, because only
that one claims *who pays us*.

---

## 6. The neutrality claim exists in three more wordings — and one blocks Zone C

Not verbatim repeats, so a find-and-replace misses them. Ranked by consequence:

| Where | Wording | Under an embedded deployment |
|---|---|---|
| **/trust "pledge"** `TrustSections.tsx:76-90` | «Δεν πουλάμε, δεν μοιραζόμαστε και δεν διαβιβάζουμε δεδομένα ασφαλισμένων ή χαρτοφυλακίου σε ασφαλιστικές εταιρείες, **τράπεζες** ή τρίτα ασφαλιστικά πρακτορεία.» | **DIRECT CONFLICT.** It names banks, it is absolute, and the file cites **§3 of the Terms** as its backing. A partner page describing consented ingestion inside a bank's own app cannot sit on the same site as an unqualified pledge never to transfer data to a bank — even if every actual transfer is consented. **This is a Terms question, not a copy question.** |
| **/compare FAQ** `CompareSections.tsx:32` | "…and no company pays us." | Becomes false the day any institution pays. Narrow fix: "no insurer pays us." |
| **/company** `CompanyPageClient.tsx:55-56` | «…είμαστε το ουδέτερο εργαλείο του ασφαλισμένου.» | Survives. Neutrality-of-analysis, not absence-of-relationships. Leave. |
| **/ClearLimits item 3** `ClearLimits.tsx:37-41` | «Καμία ασφαλιστική δεν βλέπει τι ανεβάσατε.» | Survives literally (a bank is not an insurer) — but it is the same spirit as the pledge and should be reviewed with it. |

**The /trust pledge is the single hardest blocker to Zone C in the current site, and it is
contractual.** Routing to DPO/legal, not rewriting — see Open Question 7.

---

## 7. Plan-gating: mapped, and worse than "inconsistent"

I said in §4 that no plan claim should ship until this is settled. Having now mapped it, that is an
understatement. The full table goes in deliverable 2; the three findings that change *this*
document:

**A. Duplicate-cover detection is paywalled in copy and free in code.** Every marketing surface
gates it (Plus or Family). `feature-gates.ts:64-67` states the gate "is simply not applied
anywhere", and `tests/unit/feature-gate-reachability.test.ts:15` whitelists it as knowingly
unchecked. It runs for **every plan including Free**. We are advertising a paywall on something we
give away — the one disagreement here that changes the actual value proposition rather than its
wording.

**B. "Yes, with Plus" is wrong on the homepage and /compare.** The verdict key is literally named
`plus` and renders the word "Plus"; the authoring comment says the feature is Family; the enforced
limit is `gapAnalysisPerDay: 0` on Plus. Three descriptions, and the one the customer reads is the
false one.

**C. There is no parity test.** The feature bullets are a git-tracked TS file
(`lib/pricing/public-pricing-content.ts`) that **no code path ties to** `plan-defaults.ts` or the DB
`entitlements` JSON. So this is a copy fix across ~8 files, not a migration — and nothing stops the
next edit drifting the same way. **Any fix must ship with the parity test, or it will not hold.**

**Escalated separately, because it is not a marketing problem:** `PremiumInsightCards.tsx:21`
renders «Διαθέσιμα με το Plus» / "Available with Plus" over six features whose enforced requirement
is Family, and `upgrade-copy` says the same for `partner_offers`. That is shown **post-signup, to a
paying customer, next to an upgrade button** — a billing-dispute risk of a different class from a
marketing page, and it should be fixed on its own timeline rather than waiting for this repositioning.

---

## 8. Decisions taken (2026-08-30) — binding on deliverables 2–5

**D1 · Plan gating — AMENDED 2026-08-30.** The original D1 ("copy follows code, both Family")
was overturned by the owner before implementation, on a distinction the first framing missed: for
gap detection, code enforces Family and the copy lied — copy-follows-code is a genuine consistency
fix. For duplicate detection **nothing enforces anything**; there is a declaration nobody
implemented, and enforcing it now would have been a **new pricing decision dressed as a consistency
fix**, made as a side effect of a copy cleanup. The gate registry's own comment agrees: *"Whether
that finding should sit behind a plan is a pricing decision, not a cleanup."*

**The decided truth:**
- **Gap detection: Family**, as enforced today. Copy changes only.
- **Duplicate detection: available on Free, limited rather than gated.** Household-wide scope is
  Family. Copy corrects to match this, not the reverse.
- **OQ9 is closed with no rollout, no grandfathering and no release note** — nobody loses anything.
- The parity test remains non-negotiable and now asserts **the limit as well as the gate**.

**Sizing of "limited", stated before building (per instruction):** the bound already exists
structurally — duplicate detection compares policies inside one wallet, and the wallet is capped by
the plan's policy ceiling (3 / 10 / 25), enforced at upload. Family's 25-policy ceiling *is* the
household-wide set. **No new enforcement code is required.** The remaining Gate-1 code work is
deletion: the dead `duplicate_coverage_detection` gate declaration and its `KNOWN_UNGATED`
whitelist line, both of which now misdescribe the decided truth. **Caveat, named rather than
assumed:** if "household-wide scope" is meant as a distinct multi-person feature beyond the policy
ceiling, no such gate exists today and building one is new work — that reading would need its own
decision.

**D2 · /trust pledge: qualify with consent.** Legal to add «χωρίς τη ρητή, ανακλητή σας συγκατάθεση»
(and the English pair) to the pledge and to Terms §3. Keeps the promise absolute in the sense a
consumer cares about, and makes the consented embedded case describable. **Flag to DPO/legal —
I do not draft Terms.**

**D3 · Launch status: soft launch / early access.** «Σε πρώιμη διάθεση» / "Early access". Applies to
/company, the partner page and anywhere maturity is implied. No GA claim anywhere.

---

## Open questions — blocking, and I will not guess

**9. Existing Free and Plus users lose duplicate detection under D1 — grandfather, announce, or
apply quietly?** The only decision left inside D1, and the only one that touches live accounts. It
is a product/comms call, not a copy call, and it should not be made by whoever writes the pricing
page. My recommendation is to apply the gate and say so plainly in the release note rather than
grandfather — a silently-removed feature a customer had yesterday is the kind of thing that surfaces
as a support ticket phrased as a bug.

**2. Intermediary registration and the IDD / ν.4583/2018 opinion.** INPUTS asks for confirmation
that none exists and none is planned, and whether a legal opinion has been obtained. The partner
page in particular cannot be written without knowing this — an institution's compliance reader will
ask on page one.

**4. The Article 9 consent gate — has it had external DPO review, and what wording does it
require?** §4 asks me to write consent copy that aligns with it. If the reviewed wording exists I
should match it, not invent a parallel phrasing.

**5. The eyebrow's English.** Greek and English currently make different claims (§0.3). Which is
authoritative — should the English become a translation of the Greek promise, or should the Greek
gain the category label? This affects every page's top line.

**8. The ENFIA and health statistics.** 7–10%, ΕΔΑ 6.24%, seven in ten, one in five, the 20% /
€500k rule. None is on the site today. Each needs a primary source with a date before publication —
the repo's standing rule is that a public claim about Greek law or tax resolves to a primary source
or is cut, not hedged. **I have not verified any of them and will not publish them unverified.**

---

## Next, on confirmation

Deliverable 2 (change list by URL, carrying the full plan-gating map from §7), then 3 (page copy,
Greek then English), 4 (SEO layer), 5 (launch checklist).

**Ready to proceed once §1–§5 are agreed.** Open Questions 2–8 do not block deliverable 2 — they
block specific *sentences* in deliverable 3, and I will mark each `[verify]` in place rather than
stall the change list. Open Question 9 blocks only the duplicate-detection rollout, not the copy.
