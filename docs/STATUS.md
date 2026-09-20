# STATUS

## Current phase

**Interactive marketing UI and plain-language content — 2026-09-20.** Release requested; GitHub/Vercel deployment in progress. Prior historical status preserved in [archive](archive/STATUS-before-analytics-content-2026-09-20.md).

## Done

- Implemented interactive home/product previews, guide search + Higgsfield imagery, and pricing selector refinement on eight EL/EN routes. GA sessions prioritisation: home 122, guides 5, product 5, pricing 3. [UI evidence](audits/interactive-marketing-2026-09-20.md).
- 352 UI/content tests pass; 32 responsive browser observations have correct locale, one H1 and no overflow. JS increases below 25 KB/route; image 18 KB. Final production build passes.

- Reviewed GA4/Search Console and added bilingual answers for insured value, ENFIA, belongings/card cover, renewals and policy organisation. [Analytics findings](audits/analytics-content-2026-09-20.md).
- Reviewed public Greek/English content; simplified wording across 35 source files. Corrected ENFIA history, underinsurance arithmetic, overlap messaging and methodology determinism claims. [Review and evidence](audits/plain-language-2026-09-20.md).
- 319 relevant tests pass; API auth audit, lint, i18n, UTF-8 and type-check pass. All 144 sitemap routes render at 320px with correct language, one H1 and no horizontal overflow. Final production build passes.

## In progress

User authorised production release. Integrated upstream d0feaf34 (registration controls and private-material guard) without losing the marketing work. Full release checks and CI-gated Vercel deployment in progress.

## Blocked

No implementation blocker. Analytics conversion setup and internal-traffic exclusion remain unverified. No database mutations.

## Top risks ranked

1. **Accuracy:** dated tax guidance needs periodic AADE review; official legal quotations retain necessary complexity.
2. **Release:** port 3000 serves another checkout; this work is previewed on port 3001. Production verification pending.
3. **UX/measurement, not launch gates:** editorial simplification is not a reader-tested age score; the small analytics sample does not establish customer intent or conversion gains.

## Next 3 actions

1. Release the verified content changes through the repository's deployment workflow.
2. Test comprehension with readers unfamiliar with insurance, including a supervised teenage reader if age-level validation is required.
3. Verify conversion events/internal-traffic filters and compare the same query groups after a comparable reporting window.

Before commit/push: `audit:api-auth`, `lint`, `type-check`, `verify:migrations`, `lint:i18n-changed`, `lint:utf8`, applicable tests/build. No migration was introduced in this task.
