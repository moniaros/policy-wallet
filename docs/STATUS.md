# STATUS

## Current phase
**Production promotion in progress — 2026-10-02.** [PR #386](https://github.com/moniaros/policy-wallet/pull/386) merged as `2de4618f`; [merged CI passed](https://github.com/moniaros/policy-wallet/actions/runs/37012974690). Owner waived the preview prerequisite for this release. [Release evidence and decisions](audits/prevention-production-release-2026-10-02.md).

## Done
- Simplified policyholder home/intake/navigation, trustworthy policy/recommendation context and notification history; unsupported health scores retired. External action references hidden; policy-document provenance retained.
- All-branch prevention hub and optional personal progress; gated original/renewal composition, term conflicts, periods and separate benefit use. Owner access, consent, export/erasure and reminder handoff covered.
- Dev: 88 matching migrations, three prevention tables with RLS, 34 columns and five cascading FKs, queried again after the deployment fix. Two old dev-only phantom migrations/dead objects removed after private backup.
- Local guardrails and build passed; 7,827 unit tests / 688 files, including production-build ordering and exact migration-content checks. Earlier 16 relevant browser cases passed together without retries at mobile/desktop, including persistence and English/keyboard.
- Production flags saved: hub `1`, advanced personalization `0`; effective with the new deployment. No dev secrets transferred to preview.
- First production attempt stopped before DB access: GitHub's `DIRECT_URL` is not production. Corrected execution to Vercel's production build, retaining project/history/schema checks and stopping the application build on failure.
- Vercel confirmed production's 86 matching migrations and two expected pending files, then rejected the SQL guard's false positive on `ON DELETE CASCADE` before writing. Corrected to exact reviewed-content hashes, verified even with no pending dev migrations, with regression/probe coverage.

## In progress
Promote the verified build-path correction, complete CI/deployment and check production schema, deployment identity and authenticated pages.

## Blocked
No unresolved blocker to the restricted rollout. The actual two-PDF provider benchmark remains separately pending authorization; advanced personalization stays off. Money-path CI journey was skipped by its existing credential gate; Kilo review lacked credits.

## Top risks ranked
1. **High — correctness:** real model accuracy, latency and cost remain unmeasured. Nineteen local PDFs / 592 pages and reference spans are not model-accuracy evidence.
2. **Medium — correctness:** conditional eligibility, missing periods and incomplete amendments need clarification; no entitlement or payment confirmation is inferred.
3. **Medium — UI/UX backlog:** targeted browser checks do not certify complete accessibility; prior B2B/content-assurance backlog remains separate.

## Next 3 actions
1. Complete the production build and actual schema verification using credentials already held by Vercel.
2. Verify the authenticated live prevention, intake, dashboard and notification views; record deployment identity.
3. Complete the separately authorized PDF benchmark before enabling advanced personalization.

Before commits/pushes: `audit:api-auth`, `lint`, `type-check`, `verify:migrations`, `lint:i18n-changed`, `lint:utf8`, unit/build and relevant journeys. These passed for this release; the workflow fix changes no UI.
