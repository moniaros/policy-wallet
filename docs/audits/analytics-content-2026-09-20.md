# Analytics-led marketing content — 2026-09-20

## Evidence and limits

Read the signed-in GA4 property **policywallet.gr**, property **467560784**, through the owner's browser. Window: **23 August–19 September 2026**. These are small samples, not market research or proof of conversion.

- Traffic acquisition: 259 sessions; organic search 67 sessions, 56 engaged, 83.58% engagement, 1m58s average engagement/session. Direct 74, referral 72, unassigned 44, AI Assistant 3.
- Search Console queries in GA4: 294 rows, 1,870 impressions, 11 clicks, 0.59% CTR. Every visible click belongs to `policy wallet` (15 impressions, 11 clicks, position 2.20). The top 50 rows were inspected by impressions.
- Search Console landing-page report: 2,723 impressions, 38 clicks. `/en` has 18 clicks/154 impressions; `/` 5/85; `/en/guides/prostimo-anasfalistou-oximatos` 3/72; `/product` 2/57. The query and landing-page totals differ; they are recorded separately, not treated as the same denominator. Queries were not joined to individual landing pages.
- All-events key events show zero in these reports. That does not establish that nobody converted: conversion configuration and internal/test traffic exclusion were not verified. The repository describes pre-launch, owner-owned accounts; no claim of real-customer adoption is justified.

| Observed query | Impressions | Clicks | Average position | Editorial response |
|---|---:|---:|---:|---|
| ασφαλεια προσωπικων αντικειμενων | 78 | 0 | 64.28 | Explain what to look for in the actual terms, without asserting universal cover |
| ασφαλιζομενο κεφαλαιο | 63 | 0 | 19.54 | Add the exact accented term as a glossary alias and metadata wording; explain premium vs insured amount |
| ασφαλεια σπιτιου και ενφια | 61 | 0 | 57.05 | Link existing ENFIA guide; explain that a policy alone does not establish eligibility |
| τραπεζικο πακετο | 53 | 0 | 54.98 | Address package-name ambiguity in the belongings answer |
| policy renewal | 52 | 0 | 58.44 | Surface the existing renewal checklist; distinguish a reminder from renewal |
| ασφαλιση καρτων | 52 | 0 | 58.77 | Group with belongings; do not imply PolicyWallet sells bank insurance |
| where can i manage all my insurance policies in one online portal? | 13 | 0 | 9.00 | Answer the exact task in both languages, qualify features by plan |

High-volume but poor-fit queries (`wallet τελη κυκλοφοριασ`, `insurance contributions`, balance transfers, generic insurance quotes) were deliberately not targeted. PolicyWallet does not become a road-tax portal, lender or insurance seller because those terms have impressions.

## Changed

- Shared bilingual `lib/marketing/search-questions.ts` powers a plain, server-renderable answer section on `/`, `/en`, `/guides`, `/en/guides`. Real links preserve locale and use existing destinations; no new competing SEO routes.
- `/lexiko/asfalismeno-kefalaio` and its English mirror now include the missing query synonym and explain the difference between premium and insured amount. Existing slug preserved; no redirect or canonical change.
- No prices, entitlements, consent text, detection rules, database rows or Analytics settings changed. No fabricated popularity label, numeric claim, automatic renewal or guaranteed payout promise.

Sources checked for the bounded insurance explanations:
- [AADE application page](https://aade.gr/aitisi-horigisis-meiosis-enfia-asfalismenon-katoikion) — the relevant cover types and year-specific process. No rate or deadline copied into the new text.
- [Alpha Bank card and belongings programme](https://www.alpha.gr/el/idiotes/asfaleies/asfaleies-gia-kartes-daneia-kai-online-sunallages/asfaleia-karton-alpha-feel-safe) — example demonstrating the need to read programme-specific conditions and claim documentation. Not a recommendation or a universal description of such products.
- Existing repository guides, glossary and plan-qualified product content for product capabilities.

## Broken / insecure (launch gates)

No new security defect established by this read-only review. Attribution, internal-traffic filtering and key-event setup remain unverified measurement questions. Existing local preview on port 3000 was a different checkout and was excluded from verification.

## Content / UX opportunities (not launch gates)

Non-brand queries have visibility but no observed clicks in this query report. The changes are a testable editorial hypothesis, not a demonstrated uplift. Keep the current URLs and assess the same query groups and landing pages after a comparable period; separate Greek/English, impressions/clicks, and configured conversions. Investigate the reported `/&` landing path separately before attributing it to a live routing defect.

## Validation

See `docs/evidence/analytics-content-2026-09-20/RESULT.md` for completed checks and limitations. No deployment or database change is implied by local verification.

Existing design metadata drift: Impeccable reported `DESIGN.md` newer than `.impeccable/design.json`. Left untouched; the skill’s `document` command can refresh the sidecar as a separate task.
