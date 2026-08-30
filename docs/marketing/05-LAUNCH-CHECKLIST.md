# Deliverable 5 — Launch checklist

The gate before any of deliverables 2–4 ships. Organised as: **the claims register** (every
`[verify]` in one place), then the five ordered gates, then what routes to the DPO. An unchecked
box blocks only the sentences that depend on it — the mapping is explicit so nothing waits on the
wrong thing.

---

## A. Claims register — every `[verify]`, one place, an owner each

**Rule inherited from the repo:** a public claim about Greek law, tax or policy wording resolves to
a primary source with an excerpt and a date, or it is **cut — not hedged**. "Ενδεικτικά" in front
of a wrong number is not a hedge; the site has already had that defect once (the uninsured-vehicle
fines) and the correction is on record.

| # | Claim | Blocks | Verification standard |
|---|---|---|---|
| V1 | 2026 health renewals carried 7–10% increases | health wedge §1 framing, hero slide rationale | named market source with date; else CUT — the wedge survives without it |
| V2 | IOBE index abolished January 2025 | health wedge §2 | primary (ΦΕΚ or ΕΛΣΤΑΤ/ΙΟΒΕ announcement) |
| V3 | ΕΛΣΤΑΤ ΕΔΑ replaced it; first value 6.24% | health wedge §2 | ΕΛΣΤΑΤ publication, deep link |
| V4 | seven in ten policyholders never change programme | nothing yet — **not used in any drafted copy**; stays unused until sourced | named study |
| V5 | ~one in five Greek homes insured | positioning rationale only — **not in drafted copy** | named source or stays internal |
| V6 | ENFIA 20% / ≤ €500k taxable value | already live in the existing guide | **re-verify against the current text** — figures already published carry the same duty as new ones; the guide's source must be a deep link, and the corpus audit (G-07) found this guide's citations are bare origins |
| V7 | the statutory peril set (σεισμός, πυρκαγιά, πλημμύρα) | ENFIA guide extension §2.1 AND the new FAQ pair | current operative text — the peril list is the trap the section is about |
| V8 | minimum cover term ΑΑΔΕ requires | ENFIA checklist §2.2 | current operative text |
| V9 | the increase letter's disclosure obligation | health wedge §1 «οφείλει να εξηγεί» | legal basis, or reword to what letters do in practice |
| V10 | DPF/SCC characterisation in the /trust addition | /trust §2.1 | must match `/subprocessors`' own wording — two pages, one safeguard, one description |
| V11 | "DORA-aware" vendor posture | partner page strip | stays "aware"; **"ready"/"compliant" banned until an assessment exists** |
| V12 | citation anchors render on the health surfaces | health wedge §3's «με παραπομπή στο σημείο του εγγράφου» | verified on the built page, not in the source — else drop the clause |

**V6 is the sleeper.** The new work inherits an old debt: the existing ENFIA guide's figures are
live *now* with citations the audit classed unresolvable. Extending the guide without fixing its
sources upgrades its visibility while leaving its evidence broken.

---

## B. The five gates, in order

### Gate 1 — plan-gating truth (deliverable 2, Part A)
- [ ] **Owner decision recorded: Open Question 9** — Free/Plus users lose duplicate detection;
      grandfather / announce / quiet. *(Recommendation on file: announce.)*
- [ ] Duplicate gate **applied** — `duplicateCoverageRules()` gated; `duplicate_coverage_detection`
      **removed from `KNOWN_UNGATED`** in `feature-gate-reachability.test.ts:15`
- [ ] Parity test exists: `public-pricing-content.ts` bullets asserted against
      `DEFAULT_ENTITLEMENT_LIMITS` — **red-proved before the copy lands**
- [ ] The seven wrong surfaces from the truth table corrected, comments included
- [ ] `COMPARISON_ROWS` verdict key **renamed**, not relabelled
- [ ] In-app `PremiumInsightCards` / `upgrade-copy` escalation acknowledged as its own ticket —
      **not silently absorbed into this launch, not silently dropped**

### Gate 2 — data-location accuracy (independent; the claim is wrong today)
- [ ] `TRUST_FACTS[1]` narrowed to storage-only
- [ ] /trust `documents` gains the transfer bullet · V10 checked against /subprocessors
- [ ] No surface anywhere still says «μένουν στην Ευρώπη» unqualified — **sweep, not spot-check**;
      the string has one home today but the sweep is what proves that stays true

### Gate 3 — AI transparency (Article 50 posture)
- [ ] /trust `ai` fallibility bullet, placed first
- [ ] `common.aiAdviceDisclaimer` extended («μπορεί να περιέχουν λάθη — ελέγξτε τα πεδία») —
      one string, 13+ surfaces
- [ ] Greek copy freeze regenerated; diff reviewed as additions-only

### Gate 4 — consent copy ↔ the Article 9 gate
- [ ] **Open Question 4 answered**: has the consent gate had external DPO review, and what wording
      does it require?
- [ ] Marketing consent copy (trust bullet 3, /trust, partner page) **matches the reviewed product
      wording** — marketing never paraphrases a consent screen; a reader who meets two phrasings of
      one consent has met two consents
- [ ] The per-document, revocable claims verified against product behaviour as shipped

### Gate 5 — the partner page
- [ ] Terms §3 + /trust pledge qualified by legal (**D2**) — page and homepage teaser both wait
- [ ] **Open Question 2 answered** (intermediary registration; IDD/ν.4583/2018 opinion) — the
      "embedding does not make it an intermediary" sentence ships only against the opinion
- [ ] hreflang pair declared explicitly; EN-source inversion noted in the file
- [ ] Never-say list present as an authoring comment in the page file

### Cross-cutting, before any page ships
- [ ] **Open Question 5 answered** (eyebrow EN) — one constant, four surfaces including JSON-LD
- [ ] Bilingual parity: every changed string exists in both locales with identical meaning
- [ ] The site gate: `lint:i18n-changed` · `lint:utf8` · copy freeze · `type-check` · full unit run
- [ ] 320/390/430 checks on changed pages, both locales — Greek runs 20–30% longer and the H1 is new
- [ ] Guides expansion **explicitly deferred** until the citation-debt decision (G-07); deferral
      recorded, not implied

---

## C. Routed to DPO / legal — flag only, nothing drafted

1. **Terms §3** — consent qualification of the transfer pledge (D2). Blocks Gate 5.
2. **Article 9 consent-gate wording** — confirmation of external review + the canonical text
   (Gate 4).
3. **Data-location wording in legal pages** — the legal text is accurate today; confirm the *new
   marketing* wording is consistent with it, direction marketing→legal, never the reverse.
4. **Article 50 placement** — confirm the in-product disclaimer extension satisfies the posture
   where users meet AI output.
5. **Privacy/cookies** — no changes proposed; listed so the DPO signs off on "no change needed"
   rather than it going unexamined.

---

## D. What this launch deliberately does not include

Stated so absence reads as decision, not omission:
- The 6–8 new guides (citation debt first — G-07).
- Any user count, testimonial, logo, accuracy figure (none exists; none is invented).
- Any GA claim (D3: early access).
- The in-app Plus/Family mislabel fix (escalated separately — it must not wait for marketing, and
  marketing must not wait for it).
- Motor anywhere above the fold. Supporting content only.
