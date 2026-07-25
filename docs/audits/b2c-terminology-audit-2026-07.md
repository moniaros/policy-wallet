# B2C Insurance-Terminology Audit — completion summary (July 2026)

Senior-Insurance-Auditor review of the **B2C policyholder** interface for
insurance accuracy, terminology consistency, and professional credibility,
against the PolicyWallet Insurance Dictionary (`/lexiko`). All work sits on
`claude/ui-foundation-audit-gtm05i` (**unmerged/undeployed** — owner review
pending). Every fix is guarded and green under CI (2374 unit tests + build).

Scope note: **B2C policyholder** surfaces only. Agent/admin (B2B) pages and the
public-marketing register were deliberately left untouched; where a shared
component mixes both, only the policyholder-facing strings were changed.

---

## The 14 named insurance-content areas

| # | Area | Canonical term (el / en) | Status | Evidence / guard |
|---|------|--------------------------|--------|------------------|
| 1 | Coverage & benefits | coverage_names map; «Παροχές» | ✅ Sound | motor+home+life+health peril names localized (were raw English); `coverage-names-non-motor.test` |
| 2 | Exclusions & limitations | «Εξαίρεση» / Exclusion | ✅ Sound + hint | neutral (not alarming) styling; `GlossaryHint` (exairesi) on the card heading |
| 3 | Deductibles | «Απαλλαγή» / Deductible | ✅ Sound + hint | consistent; hint wired; dictionary entry |
| 4 | Insured amounts | «Ασφαλισμένο κεφάλαιο» / Sum insured | ✅ Sound + hint | dictionary canonical; hint on Home card |
| 5 | Premiums | «Ασφάλιστρο» / Premium | ✅ Sound | 2-decimal, consistent across hero + comparison; guarded null; frequency labels accurate |
| 6 | Renewals | «Ανανέωση» | ✅ Sound | reminder + workflow copy accurate; **dates Athens-pinned** (`wallet-expiry-date-athens`) |
| 7 | Cancellations & lapses | «Ακύρωση» / «Εκπνοή» / «Λήξη» | ✅ Sound | correctly distinguishes cancellation vs lapse-as-outcome vs expiry-as-status |
| 8 | Beneficiaries | «Δικαιούχος» / Beneficiary | ✅ Sound + hint | consistent; hint on Life card; "no beneficiary" gap warning |
| 9 | Claims | claims workflow | ✅ Sound | branch-resolved claims numbers (health coordination-centre!), extracted deadlines as data, duty-to-mitigate step, never a fabricated number; "Ask my agent"→advisor-aware CTA fixed |
| 10 | Endorsements | «Πρόσθετη πράξη» | ➖ N/A | not surfaced in the B2C UI — no gap to fix |
| 11 | Waiting periods | «Χρόνος/Περίοδος αναμονής» / Waiting period | ✅ Sound + hint | dictionary lists both forms as aliases; hint uses the UI label |
| 12 | Sublimits | «Υποόριο» / Sublimit | ✅ Fixed | **dictionary addition authored** (`/lexiko/ypoorio`) + hint on the condition; was undefined |
| 13 | Policy status | «ΕΝΕΡΓΟ/ΛΗΓΜΕΝΟ/ΑΚΥΡΩΜΕΝΟ» | ✅ Sound | proper all-caps status set; risk-tone discipline (expired=amber, not red) |
| 14 | Advisor info | «Σύμβουλος» / Advisor | ✅ Fixed | standardized EN+EL (was mixed agent/advisor + «ασφαλιστής»); `intermediary-role-term-advisor` |

Also added: **co-payment** «Συμμετοχή» (`/lexiko/symmetochi`) + hint. Dictionary
now 15 terms; 11 in-product `GlossaryHint`s + exclusions wired on the policy
detail (deductible, waiting-period, sum-insured, beneficiary, surrender,
comprehensive, roadside, green-card, underinsurance, sublimit, co-payment).

---

## Cross-cutting corrections (product-wide, guarded)

- **Policy term** standardized on «Ασφαλιστήριο» (was mixed with «συμβόλαιο» 151:59 in the UI label layer; owner-ratified). Editorial long-form prose keeps synonym variation, as the dictionary itself does. `policy-term-asfalistirio.test`.
- **Contractual dates** all Athens-pinned (`formatPolicyDate` + PolicyCard/PolicyWallet/PolicyComparison/PolicyTable/renewals) — a raw-UTC render showed the previous day at Athens midnight and disagreed with the day counts. `wallet-expiry-date-athens.test`.
- **Notifications** localized to the recipient's language at the shared notifier (collaboration notifications were English to Greek policyholders).
- **Greek casing/spelling**: sentence-case + accents enforced. **Five distinct blind spots** were found and closed in the sentence-case guard along the way — final-sigma, parentheses, trailing punctuation, non-`el:` component patterns, abbreviation dots — each surfacing real hidden violations. `greek-sentence-case`, `greek-missing-accents`, `coverage-account-greek-sentence-case`, `account-settings-greek-quality`.

---

## Summary in the directive's requested format

- **Terminology corrected**: advisor role (agent/ασφαλιστής → σύμβουλος), policy term (συμβόλαιο → ασφαλιστήριο), no-claims label (Greeklish → «Έκπτωση μη ζημιάς»), claims "Ask my agent" possessive, ~20 Title-Case Greek labels, missing accents, occupation placeholder, policy-number label casing.
- **Wording standardized**: policy term, advisor term, money format (€-prefix on the paid CTA), coverage names across all four branches, sentence-case product-wide.
- **Glossary links added**: 11 in-product hints + exclusions on the policy-detail page (were 0 reachable from inside the product before this branch).
- **Dictionary additions**: «Υποόριο» (sublimit) and «Συμμετοχή» (co-payment) authored.
- **Unresolved risks / out of scope**:
  - **Owner action only**: review/merge/deploy the ~34-commit branch (suggest themed PRs: terminology, dates/correctness, notifications, casing).
  - **B2B, deliberately untouched**: the agent's customer-policy view (`customers/[id]/policy/[policyId]`) has the same zone-less date render — flagged, not fixed, per B2C-only scope.
  - **Static-audit boundary**: an exhaustive *rendered-pixel* pass (every dynamic state, live tooltips) needs the running app under Playwright — environment-gated in this session.

**Assessment**: the reviewed B2C insurance-content surfaces meet an enterprise-grade
insurance-accuracy standard at the level static audit can certify — terminology
is accurate, dictionary-anchored, consistent, and guarded against regression.
