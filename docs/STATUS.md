# STATUS

## Current phase
**Policyholder action-flow implementation — 2026-10-21.** Dev journeys verified; preview and production promotion in progress. [Implementation and evidence](audits/policyholder-action-flow-2026-10-21.md). Parallel presentation-review context is preserved in [the archive](archive/status-before-policyholder-implementation-2026-10-21.md).

## Done
- **Correctness:** neutral empty states; claim deadlines separated from withdrawal rights; unsupported phone/legal and income/price assertions removed; yes/no values no longer appear as amounts.
- **Task completion:** reviewed advisor draft, exact recipient, atomic message creation, idempotent retry, unchanged policy grants; direct reminder destinations, current-subject grouping/counts, snooze and completion with delivery history retained. Private notes excluded from inbox previews.
- **UI/UX:** current-first home and renewal-document prompt, direct current-benefit entry, historical-benefit disclosure, usable contact links, common action grouping, collapsed life changes/habits, consistent Actions label and working anchors.
- Dev: 88 migrations up to date; no schema/catalogue/price changes. 697 unit files / 7,861 tests green. 11 home/intake/benefit journeys plus the complete advisor→reminder→completion journey passed; 320/390/430/1280 px, EL/EN, keyboard and persisted progress covered. Type/API/lint/i18n/UTF-8 checks passed; final build/release checks recorded in the audit.

## In progress
Publish an isolated preview of this branch, verify real outcomes, then merge NEW-UI and verify production. Keep unrelated local AGENTS/CLAUDE, presentation and pricing-review work outside this release.

## Blocked
No implementation blocker. Real-mailbox delivery, the prior PDF benchmark and persona extensions (employer-cover profile modelling / evidence-backed natural-language search) are separate work, not certified by this UI release. Dev Redis reports an existing `evalsha` ACL failure and falls back to local memory; infrastructure configuration was not changed.

## Top risks ranked
1. **High — release:** promotion is not complete until preview outcomes and the deployed production revision are verified.
2. **Medium — verification scope:** in-app message persistence is tested; outbound email delivery and real-PDF accuracy are not.
3. **Medium — existing debt:** parallel public/professional presentation findings and dev rate-limit infrastructure remain outside this change.

## Next 3 actions
1. Finish final staged guardrails/build and publish the exact commit as a preview.
2. Verify preview outcomes, merge/deploy NEW-UI, and inspect production home, benefits and reminders.
3. Record release evidence and pursue remaining product extensions as a separate increment.

Before commit/push: `audit:api-auth`, `lint`, `type-check`, `verify:migrations`, `lint:i18n-changed`, `lint:utf8`, unit/build and relevant journeys. No production data mutation is required for this release.
