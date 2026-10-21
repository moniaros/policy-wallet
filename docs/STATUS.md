# Status

## Current phase
Public Greek plain-language and legal-content correction shipped — 21 October 2026. [PR #404](https://github.com/moniaros/policy-wallet/pull/404); production application `c2c2d29c`.

## Done
- Reviewed all public surfaces, 15 guides, glossary and four legal documents; 432 initial Greek rewrites plus final corrections, with English factual counterparts.
- Corrected ENFIA, motor/letting requirements, coverage/payout promises, withdrawal and privacy wording using official sources. Removed unsupported earthquake prices.
- Contact enquiries no longer join the newsletter list. Cookie settings reopen from public footer/policy without changing consent merely on opening.
- Legal revision `GR-GA-2026.10.21` applies to future terms/privacy consents; previous text archived, historical records unchanged. Light video hero retained.
- 7,874 tests and guardrails/build passed. All 144 public routes at 320/1440px passed locally, on preview and live; live cookie, hero and four anonymous auth checks passed.
- Production CI 39609829330 and deploy 39611226649 succeeded. Dev/prod schema checks: 88 migrations, none pending; no DB/catalogue writes.

## In progress
- Protected application presentation and its remaining privacy-dialog copy are a separate tranche.

## Blocked
- No public-copy release blocker. Complete statutory online withdrawal before enabling consumer paid checkout; existing sandbox restriction and registration pause remain.

## Top risks ranked
1. Online withdrawal needs a complete declaration/confirmation/receipt workflow.
2. Provider account/transfer evidence, retention/deletion messaging and insurance-distribution perimeter require operational/qualified legal review.
3. Existing production session-pool configuration remains an infrastructure follow-up.

## Next 3 actions
1. Implement and verify online withdrawal before consumer paid checkout is enabled.
2. Verify provider/retention evidence and align protected deletion dialogs with the public policy.
3. Continue protected-app presentation and obtain the regulatory-perimeter assessment.

Evidence and limits: [public language/legal audit](audits/public-language-legal-2026-10-21.md).
