# STATUS

## Current phase
**Release prepared; preview approval pending — 2026-10-02.** [PR #386](https://github.com/moniaros/policy-wallet/pull/386), application commit `802d56b4`, [hosted CI success](https://github.com/moniaros/policy-wallet/actions/runs/37010917131). [Release evidence and decisions](audits/prevention-production-release-2026-10-02.md); [implementation/limits](audits/prevention-personalization-2026-10-02.md), [home/intake](audits/policyholder-mobile-ux-2026-10-02.md) and [prior B2B history](archive/status-before-policyholder-ui-2026-10-02.md). No production merge, migration, flag write or deployment yet.

## Done
- Source-backed original/renewal composition, term conflicts, missing periods/amendments and unconfirmed activation; bounded gated extraction/cache/independent verification. No model calls on page opening or gap-rule changes.
- Explained personal steps, barriers/planning and separate self-reported benefit use per documented period; legacy calendar-year history retained. Transactional reminder handoff, retry protection, owner access, export and erasure.
- Owner review adjustment: external action-reference links (NHTSA, NICE, WHO and other catalogue sources) hidden from prevention cards; internal authored references and policy-document provenance retained.
- Dev additive migration verified: 88 migrations, three prevention tables/RLS, 34 columns and five cascading FKs. Production untouched.
- Release rerun: all 16 relevant browser cases passed together without retries; unit/build/guardrails passed. Two historical dev-only phantom migrations and dead experimental objects removed after private backup; all 88 checksums now match.
- 7,817 unit tests / 686 files passed; six new browser cases passed across targeted runs at 320/390/430px and desktop, including persistence, period changes and English/keyboard. API/lint/i18n/UTF-8/type/migration checks and standard build passed. Design verdict **ship**, all three new findings resolved.
- 19 PDFs locally read: 592 pages, 9/9 reference spans; 11 manually checked expectations for the original/renewal pair. These are not model-accuracy results. Earlier health-score retirement and meeting artifacts remain preserved.

## In progress
Preview journey and production promotion after the pending permission. Hosted CI is complete; paid-conversion journey was explicitly skipped by its existing credential gate. Kilo review lacked credits. Planned rollout enables the reviewed hub and keeps new personalization off pending actual PDF evaluation.

## Blocked
Automatic approval review rejected configuring the release preview with dev database/auth secrets without payload/destination-specific permission. Preview journey is required before merge. Broad prod-secret export was also rejected; migrations instead use the existing GitHub runner secret. Separate PDF-provider authorization remains pending.

## Top risks ranked
1. Real model recall/precision, latency and cost remain unmeasured; seven corpus samples need visual reading. Page-read status is model-reported, not OCR certification.
2. Conditional benefit eligibility, missing years and incomplete amendments stay unresolved; exact identity matching intentionally requires clarification on variants.
3. Browser coverage is targeted, not complete accessibility certification; earlier B2B/content-assurance backlog remains separate.

## Next 3 actions
1. Obtain the specific preview-configuration authorization; do not bypass the automatic-review rejection.
2. Verify the preview journey, merge, apply/verify prod additive schema on the runner, deploy and check the live product.
3. Complete the separately authorized PDF benchmark before enabling personalization in production.

Before commits/pushes: `audit:api-auth`, `lint`, `type-check`, `verify:migrations`, `lint:i18n-changed`, `lint:utf8`, unit/build and relevant journeys.
