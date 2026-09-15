# PW-VOICE-01 — CLAIMS

Every factual claim in customer-facing Greek traces to a row here naming its **source of
truth**. A claim with no row is a **V8 finding (Blocking)** and is removed, not reworded —
«ίσως», «μπορεί να» and «έως» in front of an unsupported number are the same defect.

**Step-0 calibration.** The brief's named defects — `500+` policyholders, `10.000+` analysed,
`98%` accuracy, testimonials — return **zero hits** in the 9,926-string corpus. The August
2026 marketing audit records «no fabrications anywhere» and the launch report shows «98%
match» reworded; the guards `no-fabricated-public-count` and `marketing-mock-honesty` are
the existing claims-guard for those shapes and are green. What this table does is cover
the claims that *do* exist (149 non-composed numeric statements, 144 distinct).

| # | Claim (as worded) | Where | Source of truth | Status |
|---|---|---|---|---|
| C1 | free plan: 3 ασφαλιστήρια, χωρίς κάρτα | pricing, product FAQ, CTA reassurance, help | `DEFAULT_ENTITLEMENT_LIMITS.free.policies` — pinned by `cta-reassurance-single-source`, `help-content-factual` | sourced |
| C2 | Plus: έως 10 ασφαλιστήρια · Pro: απεριόριστα | `dashboard.home.freePlanHint`, settings | plan entitlements (`lib/subscription-entitlements.ts`) | sourced — verify the Plus figure against the live plan row in Round 1 |
| C3 | reminders 90 / 60 / 30 / 15 / 7 ημέρες πριν τη λήξη | dashboard, renewals, help, digest | notification registry windows — pinned by `help-content-factual` (`/90, 60, 30, 15 (and\|και) 7/`) | sourced |
| C4 | 50 κανόνες σε 14 κλάδους | /methodology, home | `PUBLIC_COUNTS` (catalogue-derived) — literal fails the build | sourced |
| C5 | έως 10 αρχεία με μία κίνηση · έως 100 πελάτες στο Agent Starter | /solutions/agents | bulk-upload limit constant · agent entitlements | sourced — cite the constants by name in Round 1 |
| C6 | Οι τιμές περιλαμβάνουν 24% ΦΠΑ | agent pricing | Greek VAT law | sourced |
| C7 | «μόνο μία μικρή μειοψηφία κατοικιών διαθέτει ασφάλιση — σύμφωνα με την ΕΑΕΕ» | guide | `guide.sources[]` (ΕΑΕΕ) — `sources-freshness` guard | sourced |
| C8 | σεισμός «ενδεικτικά λίγα ευρώ ανά 1.000 ευρώ κεφαλαίου» | guide | hedged; needs a `sources[]` row naming the rate basis | **needs source** |
| C9 | «14 ημέρες δωρεάν δοκιμή» | `components/monetization/UpgradeModal.tsx:38` | **`plans.trial_days`** → `lib/billing.ts:90` (`plan.trialDays ?? TRIAL_DAYS_BY_PLAN[planId]`) → `subscription_data.trial_period_days` → the webhook's `trialing → active` (`stripe-lifecycle.ts:31`) | **sourced 2026-09-15 (H-V07 closed).** Verified against production: `ph-pro` (Family) `trial_days = 14`; every other plan row is 0. The modal renders the line only when `tierPricing('pro').trialDays > 0`, so if an admin sets the column to 0 the claim removes itself — the reason this could never go stale in the UI. Stripe's own prices carry no trial (`recurring.trial_period_days` is null on all ten); the trial comes solely from the row, and the live product metadata `trial_days: "14"` on `prod_V6x9C36oguX5iL` is a mirror, enforcing nothing. **Defect found underneath and fixed (#359):** the deprecated `/api/stripe/checkout` hardcoded 14 days for `plus` too, which production data shows the catalogue never granted. |
| C10 | «Οι περισσότεροι ασφαλιστές προσφέρουν 5-15% έκπτωση» (multi-policy) | `lib/services/analysis/deterministic-savings.ts` | none — a market statistic stated as fact, in product voice | **applied Round 1** — number removed; the line now asks the ασφαλιστής whether a multi-policy discount applies |
| C11 | «σε λιγότερο από 1 λεπτό» (upload) | `help.shortcuts.uploadDesc` | none measured | **applied Round 1** — figure dropped |
| C12 | «Όλα καθαρά για τις επόμενες 30 ημέρες!» | `status.allClear30Days` | the check's denominator | **applied Round 1** — «Στα ελεγμένα: καμία ενέργεια για 30 ημέρες.» names its scope |
| C13 | «Ελέγξαμε N ασφαλιστήρια και δεν εντοπίσαμε κενά» | `dashboard.home.noGapsAmongAssessed*`, `protection.gaps.allClear*` | the assessed count — this is the *correct* shape (denominator stated) | sourced, model for C12 |
| C14 | 12–18 μήνες horizon (onboarding question) | onboarding | question wording, not a claim | n/a |
| C15 | «Αυξάνοντάς την σε €100-150 μειώνετε συνήθως το ασφάλιστρο κατά 5-10%» | `deterministic-savings.ts` (deductible tip) | none — a market rule of thumb stated as fact, and advice in platform voice (V9) | **found and applied Round 1** — numbers removed, the sentence now asks the ασφαλιστής; the whole savings module is attributed to the partner |

Rows C1–C7 are re-verified, not re-argued, in each round. New numeric claims found by the
Round-1 audit get a row **before** they are edited. The composed strings (298) are not in
this table yet — their assembled outputs are measured in the Round-1 fixture matrix and
their numbers (counts, days, amounts) come from data, not copy.

**Round-2 retirements (2026-09-13).** Two timing promises had no row and were removed, not softened: `wallet.emptyState.benefit` «σε λιγότερο από 30 δευτερόλεπτα» and `role-copy createAccountSubtitle` «σε λιγότερο από 2 λεπτά». The claims-guard now matches «σε λιγότερο από N λεπτά/δευτερόλεπτα» for any N (it knew only «1 λεπτό»); the probe carries a «2 λεπτά» line. The public agents-page demo's «Σκορ Προστασίας 87/100» (no row; the product computes no score since Aug 2026) is removed under D-V07.

**C8 re-read (2026-09-15) — larger than the row described, and left alone deliberately.**
The summary's «ενδεικτικά λίγα ευρώ ανά 1.000 ευρώ κεφαλαίου» is not an isolated hedged
figure: it is a plain-language restatement of a full indicative rate table in the guide's
own body (`poso-kostizei-i-asfalisi-seismou` — 0,5‰ / 1‰ / 3‰ with worked examples at
100.000 / 150.000 / 250.000 €, plus the 2 % deductible and a «100 τ.μ.» FAQ). Dropping the
figure from the summary alone would leave the summary vaguer than the article it
summarises, and the `metaDescription` promises «ενδεικτικά κόστη». So the real choice is
not a rewrite: either the rate basis gets named in the guide's `sources[]` (today it
carries ΕΑΕΕ, ΑΑΔΕ and the Bank of Greece, none tied to the coefficients), or the whole
rate apparatus comes out. That is an editorial call on a genuinely useful guide, so C8 is
**re-raised for the owner** rather than half-applied. Status unchanged: **needs source**.

