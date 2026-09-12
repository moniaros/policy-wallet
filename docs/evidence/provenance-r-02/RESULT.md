# PW-PROVENANCE-01 R-02 — production verification after PR #348 (NEW-UI `6d4ac289`)

The post-restore re-erasure is a daily job, not a runbook step (review pack §14.6):
`/api/v1/jobs/pitr-re-erasure` (06:50 UTC, the 17th cron through `withJobRun`) re-executes
`eraseUserData` for every `deletion_requests` row `completed` after `PITR_RESTORE_POINT`, records the
outcome in `job_runs.summary`, fails visibly on a failed re-execution and skips a restore point a
failure-free run already handled (D-P43). With the variable unset — production's state — every run
records `no_restore_point`. Script in this directory: `prod-smoke.sh`.

## Timeline (UTC, 2026-09-12)

| Step | Evidence |
|---|---|
| PR #348 (`origin/NEW-UI` merged in three times as W3-01, R-01 landed; the route inventory rebuilt as the union each time) | CI run 34662252568 **success** 00:48:07Z, 5/5 jobs |
| Squash merge to NEW-UI | `6d4ac289` at `00:53:38Z`, via the GitHub connector |
| CI on NEW-UI | run `34663121300` **success** `01:04:55Z, first attempt` |
| Deploy, run `34663722041` (`workflow_run`, on NEW-UI's head `6d4ac289`) | **success** `01:08:11Z`; Vercel deployment `dpl_9gQScnVrQAWd1XtVEqscku9RSdX9`, `githubCommitSha` `6d4ac289…`, READY `01:08:08Z`, aliases `www.policywallet.gr`, `policywallet.gr`, `app.policywallet.gr` |
| Smoke window | `01:08:25Z – 01:09:02Z` |

## Local gate on the PR tree

audit:api-auth (0 findings) · lint · lint:i18n-changed (SCAN_ALL) · lint:utf8 · lint:encoding ·
type-check · verify:migrations · `vitest --run tests/unit` (all files, all tests) · build — green.

**The guard, red before green on the real tree:** `pitr-re-erasure` — `RE_ERASURE_STATUS` switched to
`failed` → the universe case (every `DeletionRequestStatus` value from the schema) and the probe red;
restored → 7 of 7 green.

## Anonymous production smoke

`BASE_URL=https://www.policywallet.gr npx playwright test --project=public-anon prod-smoke`
→ `**2 passed (35.6s)**`.

`prod-smoke.sh` (curl, no session): the eight public routes **200** in Greek, the three authenticated
routes **307** to signin; `GET`/`POST /api/v1/jobs/pitr-re-erasure` → `**401 / 401**` to an anonymous
caller (the cron secret or an admin session is required; never 5xx, never 200).

## Sentry (org `policywallet`)

`firstSeen:-1h`: `at ~01:09Z, **no group first seen after this deploy**`. Server traces are 10 % sampled and the window is minutes long — weak
evidence, recorded as such.

## Not run

- **A real restore:** none has happened (BLOCKED BL-P2). The job's first production run will record
  `no_restore_point` in `job_runs`; that row, once the cron has fired at 06:50 UTC, is the evidence the
  schedule works — check it in the admin jobs console.
- **Signed-in production pass:** none (BL-C2); nothing signed-in changes.
- **Database:** none — no migration; `job_schedules` gains its row on the first run through `withJobRun`.
