# Personal Data Breach Drill — Evidence (2026-09)

Runbook: `docs/operations/RUNBOOK_PERSONAL_DATA_BREACH.md` · Register row: `BR-0001` in
`docs/compliance/evidence/breach-register.md` · Capture: `docs/operations/evidence/breach-drill-2026-09-12T00-04-55Z.json`.

## Objective

Walk the breach runbook end to end against one scenario with real tools and real timestamps, executing
every step that harms no one and stating plainly which steps were simulated. This is a **tabletop**
drill run by the agent under standing authority; no human operator was present, no notification was
sent, no credential was rotated.

## Execution Record (2026-09-12)

1. Run type: tabletop, agent-executed, read-only against production.
2. Scenario: a Supabase service-role key appears in a Vercel runtime log line captured by Sentry.
3. Aware at (UTC): `2026-09-12T00:04:55Z` → Art. 33 deadline `2026-09-15T00:04:55Z` (72 hours), computed and recorded in the register.
4. Evidence preserved: Sentry issue search (`firstSeen:-1h`, org `policywallet`) at 2026-09-12T00:03Z returned no issue; the production deployment at the time was `dpl_7zTRR5MoeKdZLYAA7HcSBNR2DDvo` (`bf71ef69`).
5. Classification: confidentiality; Art. 9 data reachable with such a key → high risk by the runbook's default → Art. 33 **and** Art. 34 would apply.
6. Scope: `docs/compliance/ROPA.md` enumerates the stores (74 table rows, 6 Art. 9 references); the subject count would come from SELECTs on production — not run in a drill.
7. Containment, verified but not performed: the credential set exists as env names in code (`AUTH_SECRET`, `DATABASE_URL`, `STRIPE_WEBHOOK_SECRET` in `lib/env.ts`; `SUPABASE_SERVICE_ROLE_KEY`, `DIRECT_URL`, `POOLED_DATABASE_URL`, `CRON_SECRET` via `process.env`); session revocation path `app/(protected)/account/security-actions.ts`; registrations already closed in production (`ALLOW_REGISTRATIONS=NO`).
8. Notification, simulated: ΑΠΔΠΧ contact and procedure named in the runbook; subject e-mails through `lib/email/email-service.ts`; neither sent.
9. Recovery validation, executed: the anonymous production smoke passed at 2026-09-12T00:02Z (Playwright 2/2; 8 public routes 200, 3 authenticated routes 307).
10. Closed at `2026-09-12T00:06:21Z`; register row completed.

## Result Summary

- Executed: steps 1, 4, 6, 7 (evidence, classification, scope, validation, register, guard).
- Simulated (verified the tool exists, did not act): 3.1–3.4, 5.1, 5.2.
- Finding: the runbook's first draft cited two files that did not exist on the branch; the reference guard (`tests/unit/breach-runbook-references.test.ts`) caught both before this record was written — which is the guard's purpose.
- Not exercised, and the owner should exercise once with a disposable key: credential rotation and the Vercel redeploy it needs, and a real session revocation on a test account.

## Sign-Off

Agent-executed under PW-PROVENANCE-01 standing authority, 2026-09-12. No human sign-off; the owner's
review of this record is the next step (HANDOFF).
