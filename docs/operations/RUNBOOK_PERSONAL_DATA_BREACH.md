# Personal Data Breach Runbook — Art. 33 / Art. 34 GDPR, ΑΠΔΠΧ (HDPA)

**Published commitment** (`lib/legal/legal-content.ts`, /privacy): «Αν συμβεί περιστατικό παραβίασης που
ενδέχεται να σας θίξει, θα ενημερώσουμε εσάς και την ΑΠΔΠΧ σύμφωνα με τα άρθρα 33 και 34 GDPR.» This
runbook is how that sentence is kept. It follows the shape of the other `docs/operations/RUNBOOK_*.md`
files: trigger → immediate → containment → assessment → notification → recovery → evidence.

**The clock.** Art. 33(1): the supervisory authority is notified **without undue delay and, where feasible,
not later than 72 hours after becoming aware** of a breach likely to result in a risk to people's rights
and freedoms. «Aware» is the moment a reasonable degree of certainty exists that a security incident has
compromised personal data — record that moment (step 1.1) because every deadline counts from it. A late
notification must state the reasons for the delay (Art. 33(1), second sentence).

**Who.** PolicyWallet is the controller. There is one operator (halt `H-P4`, §14.5 of the review pack —
the single operator who approves also executes). Every step below is therefore written for one person,
and every step writes evidence so that a second person could pick it up.

**Scope.** Any incident touching the personal data the Art. 30 record lists: `docs/compliance/ROPA.md`
(57 stores; purposes, lawful bases, Art. 9 columns) and `docs/compliance/DPIA-INPUTS.md` (every column,
every processor). Health data (`PolicyholderProfile` Art. 9 columns, health-policy `acord_data`) makes
a breach **high risk by default** → Art. 34 applies.

## 1. Trigger conditions

Any of these opens an incident (step 2) — do not wait to be sure it is a breach:

1. Sentry: a new issue or alert whose payload, stack or breadcrumbs contain personal data, credentials
   or a database error on a personal-data table (org `policywallet`, region `de.sentry.io`;
   `docs/operations/SENTRY_SETUP.md`).
2. The AI incident dispatcher fires (`lib/services/analysis/incident-dispatcher.ts` → Slack
   `AI_INCIDENT_SLACK_WEBHOOK_URL` / PagerDuty `AI_INCIDENT_PAGERDUTY_ROUTING_KEY`) for a shape that
   could mean a provider received data it must not have (a consent bypass, a document sent whole when
   text-first was expected — `lib/services/ai/extraction-input.ts`).
3. Supabase: a service-role key, `DATABASE_URL`/`DIRECT_URL` or `AUTH_SECRET` found in a log, a commit,
   a screenshot or a third party's hands (the prod pooler password was public on `origin/NEW-UI` once —
   `docs/audits/` records it; treat any such find as a breach until proven otherwise).
4. An admin read of another person's data with no `admin_action_log` / `ActivityLog` `_audit` trace
   (`lib/admin/admin-guard.ts` `logAdminRead` is the only sanctioned path;
   `tests/unit/admin-reads-are-audited.test.ts`).
5. A data-subject report («I can see someone else's policy»), a support e-mail, an insurer, an
   intermediary, or a researcher.
6. A Vercel runtime error trend on a route under `app/api/v1/` that returns rows the caller must not
   see (`lib/policy-access.ts` is the one authorisation path — any bypass is a breach candidate).
7. A storage object reachable without a signed URL (`policies` bucket; `lib/storage.ts`).

## 2. Immediate actions (0–1 h) — open the incident

1.1 **Record «aware at»** (UTC, to the minute) and open a row in `docs/compliance/evidence/breach-register.md`
    (`BR-nnnn`). The 72-hour clock runs from this instant.
1.2 Preserve evidence before touching anything: export the Sentry issue(s), copy the log lines, note
    the Vercel deployment id (`vercel inspect`, or the `deploy.yml` run), snapshot the relevant
    `job_runs`, `admin_action_log`, `activity_logs` rows by SELECT (Supabase SQL editor; never delete).
1.3 Classify provisionally: **confidentiality** (data read by someone unauthorised), **integrity**
    (data altered), **availability** (data lost — a restore case: see step 5.3). Note whether Art. 9
    data is plausibly involved.
1.4 Estimate scope from the tables involved: `docs/compliance/ROPA.md` gives subjects and purposes per
    store; `prisma/schema.prisma` gives the columns. Count subjects by SELECT, not by guess.

## 3. Containment (1–6 h)

Do the smallest thing that stops the leak, in this order; each has a rollback:

3.1 **Credential exposure.** Rotate in Supabase (service role, database password) and in Vercel
    (`SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `DIRECT_URL`, `POOLED_DATABASE_URL`, `AUTH_SECRET`,
    `CRON_SECRET`, `STRIPE_WEBHOOK_SECRET`), then redeploy. Rotating `AUTH_SECRET` invalidates every
    OAuth intent and every passkey step-up proof (`lib/auth/step-up.ts`) — intended.
3.2 **Sessions.** For an affected account: `app/(protected)/account/security-actions.ts`
    (`signOutEverywhere`) as that user, or Supabase Auth → Users → sign out. For all accounts: rotate the
    Supabase JWT secret (Supabase dashboard) — every session ends.
3.3 **A leaking route or page.** Roll back to the last known-good deployment in Vercel (promote the
    previous production deployment), or flip the flag that enables the surface
    (`lib/flags/registry.ts` — env-only flags take effect on redeploy).
3.4 **Registrations.** `ALLOW_REGISTRATIONS=NO` closes sign-ups while the exposure is open.
3.5 **A provider that received data it must not have.** Record what left, when, to which processor
    (`docs/compliance/DPIA-INPUTS.md` transfer table); request deletion from the processor in writing;
    keep the request and the reply as evidence.
3.6 **Storage.** Revoke the object's signed URLs by rotating the bucket policy or moving the object;
    never `DELETE` a row or object before step 1.2 is done.

## 4. Assessment (by hour 24) — is notification required?

Answer in the register row, with the evidence that answers it:

4.1 **Risk to rights and freedoms?** Confidentiality of ordinary account data (name, e-mail, policy
    numbers) → likely a risk → **Art. 33 notification**. Health data, ΑΦΜ with identity, financial
    detail, or many subjects → **high risk** → **Art. 33 + Art. 34** (tell the people).
4.2 **No risk?** Encrypted data whose key was not exposed; a leak to a processor under contract that
    confirms deletion; an internal misroute caught before any human read it. Record the reasoning —
    Art. 33(5) requires documenting every breach, notified or not.
4.3 Freeze the facts a notification needs (Art. 33(3)): nature of the breach; categories and approximate
    number of subjects and records; contact point; likely consequences; measures taken and proposed.

## 5. Notification

5.1 **ΑΠΔΠΧ (HDPA)** — within **72 hours** of «aware at» (step 1.1). Submit through the authority's
    breach-notification procedure (Λεωφ. Κηφισίας 1-3, Αθήνα 115 23 · contact@dpa.gr · www.dpa.gr,
    «Γνωστοποίηση περιστατικού παραβίασης»). Notify in phases if the facts are still moving
    (Art. 33(4)); a first notification with «we will follow up» beats a complete one on hour 80.
    Record the submission reference and time in the register.
5.2 **Data subjects (Art. 34)** — when the risk is high: plain language, without undue delay, by e-mail
    through `lib/email/email-service.ts` (`sendEmail`) from the account's address on file, one message
    per affected person, in Greek (English for accounts whose language is `en`). Content: what
    happened; what data; what we did; what they should do (change password, watch for phishing, whom
    to call); the contact point. Keep the sent list. If direct contact is disproportionate (Art. 34(3)(c)),
    a public notice on `/status` and `/trust` is the fallback — record why.
5.3 **A restore that resurrected erased data** is a breach of the erasure, not of confidentiality:
    set `PITR_RESTORE_POINT` and run `POST /api/v1/jobs/pitr-re-erasure`
    (`docs/compliance/DSR_OPERATOR_RUNBOOK_GR-GA-2026.03.md` step 6) before assessing whether anyone
    could have read the resurrected rows in the window.
5.4 **Processors** (Art. 28(3)(f)): if a processor caused it, their notice to us is evidence; if we
    caused exposure at a processor, notify them.

## 6. Recovery validation

6.1 The vector is closed: the route/page/flag/credential change is deployed and verified from a real
    client (`BASE_URL=https://www.policywallet.gr npx playwright test --project=public-anon prod-smoke`
    for the public surface; the owner's session for signed-in surfaces).
6.2 No recurrence in Sentry for 24 h; the incident dispatcher quiet.
6.3 Affected subjects can sign in again (if sessions were revoked) and their data is intact — spot-check
    by SELECT, never by editing.
6.4 Any deletion or truncation done during containment has its export under `docs/archive/`.

## 7. Evidence and close

7.1 Complete the register row: aware at · contained at · assessed at · HDPA notified at (reference) ·
    subjects notified at (count) · closed at · root cause · preventive change (PR number).
7.2 Attach captures under `docs/operations/evidence/` (`breach-<id>-<timestamp>.json` with the timeline
    and the SELECT counts) — the convention `docs/operations/SRE_DRILL_EVIDENCE_GR-GA-2026.03.md` uses.
7.3 Preventive change as a guard test where possible (`tests/unit/` — a guard enumerates its universe
    and ships with a probe), so the class of breach fails CI, not just the instance.
7.4 Review the compliance pack entry (`docs/compliance/DATA_PROTECTION_REVIEW_PACK.md` §13.4) if the
    incident changes what the product can promise.

## 8. Drill

A drill walks this document against a scenario with real tools and real timestamps, exercising what can
be exercised without harming anyone (no real notification, no real rotation) and stating what was not.
Record it in the register as `drill` and under `docs/operations/evidence/`. First drill: 2026-09-12
(`docs/operations/PERSONAL_DATA_BREACH_DRILL_EVIDENCE_2026-09.md`). Repeat after any change to the
credential set, the processor list or the notification path, and at least yearly.

## Guard

`tests/unit/breach-runbook-references.test.ts` fails CI when this document cites a file or route that
does not exist, drops the 72-hour clock, the ΑΠΔΠΧ, Art. 33 or Art. 34, or when the register loses the
drill row. A runbook that cannot be followed at 02:00 is worse than none.
