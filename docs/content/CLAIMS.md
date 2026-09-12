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
| C9 | «14 ημέρες δωρεάν δοκιμή» | `components/monetization/UpgradeModal.tsx` | must equal the Stripe trial configuration; none is documented in the plan catalogue | **unsourced — HALT H-V07** (removal may break the modal's argument, §9.4) |
| C10 | «Οι περισσότεροι ασφαλιστές προσφέρουν 5-15% έκπτωση» (multi-policy) | `lib/services/analysis/deterministic-savings.ts` | none — a market statistic stated as fact, in product voice | **V8 Blocking** — direction: remove the number; keep the question to the ασφαλιστής |
| C11 | «σε λιγότερο από 1 λεπτό» (upload) | `help.shortcuts.uploadDesc` | none measured | **V8 Blocking** — direction: drop the figure (`no-overpromise-copy` already bans seconds-claims about the *analysis*; this is its sibling) |
| C12 | «Όλα καθαρά για τις επόμενες 30 ημέρες!» | `status.allClear30Days` | the check's denominator | **INV Blocking** — reassurance without «τα N που ελέγξαμε»; see H-V03 for the render condition |
| C13 | «Ελέγξαμε N ασφαλιστήρια και δεν εντοπίσαμε κενά» | `dashboard.home.noGapsAmongAssessed*`, `protection.gaps.allClear*` | the assessed count — this is the *correct* shape (denominator stated) | sourced, model for C12 |
| C14 | 12–18 μήνες horizon (onboarding question) | onboarding | question wording, not a claim | n/a |

Rows C1–C7 are re-verified, not re-argued, in each round. New numeric claims found by the
Round-1 audit get a row **before** they are edited. The composed strings (298) are not in
this table yet — their assembled outputs are measured in the Round-1 fixture matrix and
their numbers (counts, days, amounts) come from data, not copy.
