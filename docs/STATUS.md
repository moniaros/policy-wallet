# STATUS

## Current phase
**Public site: language, design fixes, funnel and audiences live — 2026-10-08.** All verified on `www.policywallet.gr` after deploy `4e22d582`:
- [#387](https://github.com/moniaros/policy-wallet/pull/387) the URL decides the language (A2–A5, A1 partial: `Content-Language: en`).
- [#388](https://github.com/moniaros/policy-wallet/pull/388) DA1 Grafí sunken surface (live `rgb(231,241,236)`), DA2 dark CTA contrast 9.59:1.
- [#389](https://github.com/moniaros/policy-wallet/pull/389) deploys skip Vercel's build cache — #388 had shipped the OLD CSS chunk under a green deploy.
- [#390](https://github.com/moniaros/policy-wallet/pull/390) owner decision: the public site never announces closed sign-ups (signup page only); homepage shows both audiences in full; top-level «Για ασφαλιστές»; desktop nav from 1280px.
- [#391](https://github.com/moniaros/policy-wallet/pull/391) SEO S1–S4 (deploy `766d73af`): no "what to fix first" in the entity sentence; unknown paths 404 (app paths still sign-in); `/llms.txt` live (107 links); homepage el/en down to 9 real H2s.
Reviews: [code](audits/public-site-and-design-system-2026-10.md) · [product design](audits/public-site-design-review-2026-10.md) · [SEO/GEO/AEO](audits/public-site-seo-geo-aeo-2026-10.md). Kilo review fails on every PR (no credits).

Previous release (2026-10-02, prevention, `f3315f12`): [evidence](audits/prevention-production-release-2026-10-02.md).

## Done
- Simplified policyholder home/intake/navigation, policy/recommendation context and notification history; unsupported health scores retired. External action references hidden; policy-document provenance retained.
- All-branch prevention hub active in production (`PREVENTION_HUB_ENABLED=1`). Original/renewal composition and advanced personalization shipped behind `PREVENTION_PERSONALIZATION_ENABLED=0` pending real-PDF evaluation.
- Dev and prod both queried: 88 matching migrations, zero pending, three prevention tables with RLS, 34 columns and five cascading FKs. Prod applied only the two dev-verified additive migrations.
- Fixed deployment credential scope by running schema verification inside Vercel, and fixed the SQL guard's false rejection of cascading FKs using exact reviewed-content hashes. Both failed attempts stopped before production writes; regression/probe tests added.
- Guardrails, build and 7,827 unit tests / 688 files passed. Earlier 16 relevant dev browser cases passed together without retries, including mobile, persistence and English/keyboard.
- Live authenticated checks passed for prevention/both views/no external action links/no active health score, dashboard, intake, recommendations and notification tabs. Live health: database connected, API operational. Production prevention tab retained for review.
- Owner waived preview for this release; no dev secret transfer or tool-approval changes. Two old dev-only phantom migrations/dead objects removed after private backup; production received no destructive cleanup. `output/` artifacts preserved.

## In progress
No remaining work for this production rollout. Broader B2B/content-assurance and UI/UX work remain separate backlogs.

## Blocked
Actual two-PDF provider benchmark still awaits its separate transmission authorization; advanced personalization stays off. Money-path CI journey was skipped for missing test credentials; Kilo review lacked credits. Neither is represented as completed.

## Top risks ranked
1. **High — correctness:** real model accuracy, latency and cost remain unmeasured. Nineteen local PDFs / 592 pages and reference spans are not model-accuracy evidence.
2. **Medium — correctness:** conditional eligibility, missing periods and incomplete amendments require clarification; entitlement/payment confirmation is not inferred.
3. **Medium — UI/UX backlog:** targeted local/mobile and live smoke checks do not certify complete accessibility.

## Next 3 actions
1. OWNER: design-system direction (Grafí vs legacy); A1/S5 full fix (per-locale root layouts); entity sentence C1 («ανεξάρτητη πλατφόρμα προσωπικής ανάλυσης ρίσκου» vs the concrete «διαβάζει τα ασφαλιστήριά σας…»); rename «Προϊόντα»; homepage 7-section spine.
2. SEO next: B1 keyword-bearing H1s on the 16 branch pages, B2 boilerplate H2s, C2–C3 Organization facts + named reviewer on guides — then content (AEO FAQs, B2B use-case pages) once real query data exists.
3. Complete the separately authorized PDF benchmark before enabling advanced personalization; restore money-path test credentials.

Before future commits/pushes: `audit:api-auth`, `lint`, `type-check`, `verify:migrations`, `lint:i18n-changed`, `lint:utf8`, unit/build and relevant journeys. All applicable checks passed for this release.
