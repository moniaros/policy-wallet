# STATUS

## Current phase
**Policyholder action-flow improvements shipped — 2026-10-21.** [PR #396](https://github.com/moniaros/policy-wallet/pull/396), production code `ecc83eda`; [implementation and release evidence](audits/policyholder-action-flow-2026-10-21.md). Parallel presentation-review context is preserved in [the archive](archive/status-before-policyholder-implementation-2026-10-21.md).

## Done
- **Correctness:** neutral empty states; claim deadlines separated from withdrawal rights; unsupported phone/legal and income/price assertions removed; yes/no values no longer appear as amounts.
- **Task completion:** editable advisor question, exact recipient, atomic/idempotent send and unchanged policy grants; direct reminder destinations, current-subject grouping/counts, snooze and completion with delivery history retained. Private notes excluded from inbox previews.
- **UI/UX:** current-first home and renewal-document prompt, direct benefit entry, historical-benefit disclosure, contact links, grouped optional actions, collapsed life changes/habits, consistent Actions label and readable mobile thread controls.
- **Dev + preview:** all guardrails, 697 unit files / 7,861 tests and build passed. Protected exact-revision preview: 12 Playwright checks passed (authentication + 11 journeys), without retries; 320/390/430/1280 px, EL/EN, keyboard, saved progress and full advisor/reminder flow. Dev fixture cleanup verified by counts: all zero.
- **Production:** CI and deployment passed; `www.policywallet.gr` points to `dpl_39x1pK78zUzJSaNkhDNhMqVEAYMG`. Actual schema queries verified 88 migrations, no pending changes, 3 prevention tables with RLS, 34 columns and 5 cascading foreign keys. Live authenticated home, benefits, advisor draft, reminders/history/exact action and income explanation checked; browser returned to home. No errors returned in the sampled deployment runtime logs.

## In progress
None for this release. No schema, catalogue or pricing changes; unrelated local work remains outside the release.

## Blocked
No release blocker. External Kilo review lacked credits; CI money-path journey was explicitly skipped without its E2E secret. Neither is represented as executed testing. Real-mailbox delivery and the prior PDF benchmark remain unverified by this UI release.

## Top risks ranked
1. **Medium — verification scope:** in-app persistence is tested; email arrival and real-PDF accuracy are separate checks.
2. **Medium — dev infrastructure:** existing Redis `evalsha` ACL failure falls back to local memory; production configuration was not changed. Preview session-pool exhaustion was fixed with its dev transaction-pool configuration.
3. **Low — future product work:** employer/group-cover profile modelling, evidence-backed natural-language search and parallel presentation findings are separate increments.

## Next 3 actions
1. Review the shipped home → benefit → advisor/action experience in the embedded browser.
2. Repair the existing dev Redis ACL and exercise real provider delivery separately.
3. Resume the PDF benchmark and remaining product increments with their own acceptance evidence.

Release guardrails passed: `audit:api-auth`, `lint`, `type-check`, `verify:migrations`, `lint:i18n-changed`, `lint:utf8`, unit/build and relevant journeys.
