# STATUS

## Current phase
**Public-site language labelling released — 2026-10-08.** [PR #387](https://github.com/moniaros/policy-wallet/pull/387) → `6b71fe38`, CI + Vercel deploy green. Fixes A2–A5 (+ A1 partial) of [the public-site & design-system review](audits/public-site-and-design-system-2026-10.md). Verified live: `/en/*` sends `Content-Language: en`; `/solutions/partners` 308 → `/en/solutions/partners`; ΕΛ/EN toggles land on real pages; with `localStorage.language=en`, `/`, `/trust`, `/product/health`, `/solutions/synergates` render `lang="el"` (Playwright). Kilo review failed (no credits).

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
1. OWNER: pick the design-system direction (Grafí vs legacy) and the A1 full fix (per-locale root layouts = full reloads between site sections) — see the review doc, Next steps §1–2.
2. Mechanical design fixes (review §3): DA2 `BrandActionButton` dark contrast 1.66:1, DA1 duplicate `--surface-sunken`, non-flipping `primary-soft` tokens.
3. Complete the separately authorized PDF benchmark before enabling advanced personalization; restore money-path test credentials.

Before future commits/pushes: `audit:api-auth`, `lint`, `type-check`, `verify:migrations`, `lint:i18n-changed`, `lint:utf8`, unit/build and relevant journeys. All applicable checks passed for this release.
