# Runbook — Rollback & Disaster Recovery

**Owner:** platform · **Last reviewed:** 2026-07-30

Why this exists: the repo carried 12 incident runbooks and **none for rolling
back a bad deploy or restoring the database**. The only restore evidence
(`SRE_DRILL_EVIDENCE_GR-GA-2026.03.md`) is a *record-level*, non-destructive
simulation on one table completing in 1674 ms — useful, but not a database
restore, and no RPO/RTO was written down anywhere. There are 50 migrations and
not one of them has a documented rollback story.

---

## 1. Rolling back the application

Vercel keeps every previous deployment. Application rollback is instant and
does **not** touch the database.

1. Vercel dashboard → project → **Deployments**.
2. Find the last known-good deployment (cross-check the commit against
   `docs/STATUS.md`).
3. **⋯ → Promote to Production**.
4. Verify: apex + www load, `GET /api/health` returns 200 (it runs a real
   `SELECT 1`), and Sentry stops showing the regression's signature.

**Rollback is safe only if the schema still matches.** See §2.

---

## 2. Migrations: expand → contract

A deploy rollback rolls back **code, not schema**. If the bad deploy also
applied a destructive migration, promoting the previous build gives you old
code against a new schema — often worse than the bug.

Rule for every schema change:

- **Expand first.** Add columns/tables as nullable or defaulted. Never drop or
  rename in the same release that starts using the new shape.
- **Ship the code** that writes both shapes and reads the new one.
- **Contract later**, in a separate release, once a rollback to the previous
  version is no longer plausible.

An expand-only migration is inherently rollback-safe: the old code ignores the
new column. This is what makes §1 a one-click operation.

If a destructive migration has already been applied and must be undone, treat
it as data loss and go to §3 — do not hand-write a reverse migration under
incident pressure.

---

## 3. Database restore (PITR)

**Prerequisite — owner action, not yet confirmed enabled:** Supabase
Point-in-Time Recovery is a paid add-on. Without it the recovery floor is the
daily backup, i.e. **up to 24h of data loss**. Enable it before relying on the
targets below.

**Targets** (state them, then drill them):

| Objective | Target |
|---|---|
| RPO — maximum acceptable data loss | **≤ 5 minutes** (PITR granularity) |
| RTO — time to a serving system | **≤ 4 hours** |

**Procedure**

1. **Stop the bleeding.** Roll back the app (§1) so writes stop making it
   worse. If corruption is ongoing, disable the relevant cron entries in
   `vercel.json` and redeploy.
2. **Fix the timestamp.** Identify the last known-good moment from Sentry, the
   audit log or `ActivityLog`. Write it down before touching anything.
3. **Restore into a NEW project**, never over the live one. Supabase dashboard
   → Database → Backups → Point in Time → target timestamp.
4. **Verify on the restored copy** before any cutover: row counts for `User`,
   `Policy`, `PolicyDocument`, `Opportunity`; the newest `PolicyAnalysisRun`;
   spot-check one policy end to end.
5. **Cut over** by repointing `POOLED_DATABASE_URL` and `DIRECT_URL` at the
   restored project, then redeploy. Keep the damaged project — it is evidence.
6. **Re-apply erasures.** See §4.

---

## 4. GDPR erasures and restores — do not skip

A restore resurrects personal data that was lawfully erased. The
`gdpr-deletion-erasure` audit flagged this and it has no automated answer:
restoring to a point before an erasure silently undoes it.

After **any** restore:

1. List erasures completed between the restore timestamp and now:
   `DeletionRequest` rows with `status = 'completed'` and
   `completedAt >= <restore timestamp>`.
2. Re-run the erasure for each through the normal operator path
   (`docs/compliance/DSR_OPERATOR_RUNBOOK_GR-GA-2026.03.md`).
3. Record the re-application in the DSR evidence log — a regulator asking
   "was it erased?" needs the answer to stay yes across the incident.

This step is mandatory and belongs to the restore, not to follow-up work.

---

## 5. After any rollback or restore

- Write what happened into `docs/STATUS.md`, including the trigger.
- If a cron was disabled in step 1, re-enable it and confirm it ran.
- If the cause was a migration, add the missing expand/contract step to the
  change that reintroduces it.

---

## 6. Drill schedule

A restore procedure nobody has executed is a hypothesis.

- **Quarterly:** perform §3 into a scratch project, time it, and record the
  measured RTO in `docs/operations/evidence/`. Include §4 even when no
  erasures fall in the window — the step must stay in muscle memory.
- **On every schema change that contracts:** confirm §1 still works against
  the previous release.
