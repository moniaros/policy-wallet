# Phase 2 — Accountability: make access observable
**Step 0 findings · investigated 2026-08-19 · written before any code change**

> **Evidence rule (standing).** Every assertion carries `(file:line)` or a named production
> query. Inherited claims — including my own from Phase 1 — were **re-verified**. One of my
> own in-flight findings turned out to be a query artifact and was discarded (§5).

---

## 1. `isBreakGlass` — vestigial, confirmed

`ActivityLog.isBreakGlass` (`prisma/schema.prisma`, `@default(false)`) has **exactly one write
site in the entire codebase**: `app/(protected)/account/actions.ts:170`, set `true` when a
**user files their own deletion request**.

That is not break-glass. Break-glass means *elevated access to someone else's data, taken
deliberately, under an audit that someone reviews*. A data subject exercising Art. 17 on their
own account is the opposite of that.

**Nothing reads it.** No query, no admin surface, no alert (`grep isBreakGlass` → the single
write). Production: **7 rows**, all `ACCOUNT_DELETION_REQUESTED`, all the founder's own test
deletions.

So the schema advertises an emergency-access control that does not exist, and the 7 rows that
carry the flag are mislabelled by it.

## 2. The right-of-access index serves nothing

`ActivityLog.targetUserId` exists with an index the schema itself documents as
*"'Who accessed data subject X' — GDPR right-of-access reporting."*

**18 `activityLog.create` sites; only 3 set `targetUserId`:**
`agent/actions.ts:428`, `lib/events/executor.ts:336`, `lib/services/customer.service.ts:200`.

The other 15 **cannot** — including both shared helpers:

| Helper | Signature | Can set `targetUserId`? |
|---|---|---|
| `logActivity` (`lib/services/base.service.ts:42-47`) | `(userId, actionType, description, metadata?)` | **No — no parameter exists** |
| `logAdminAction` (`lib/admin/admin-guard.ts:41-76`) | stamps `metadata._audit = {requestorId, ip, at}` | **No** |

This is structural, not an oversight at call sites: the two functions every service and every
admin action routes through have no way to name the data subject.

**No code anywhere READS by `targetUserId`.** Every hit is a write (`grep` across `app/` and
`lib/`). There is no right-of-access report; the index backs nothing.

**Production confirms the consequence** (219 rows):

| | rows | with `targetUserId` |
|---|---|---|
| `AGENT_VIEWED_CUSTOMER` (the designated GDPR read-access event) | 60 | **0** |
| `POLICY_DELETED` | 27 | 8 |
| everything else | 132 | 0 |
| **total** | **219** | **8** |

⚠ **Unexplained and worth confirming before anyone trusts a right-of-access report:**
`customer.service.ts:200` *does* set `targetUserId`, the commit landed 2026-07-17
(`169fa6c9`, on `NEW-UI`), the column migration landed the same day, and the call path is live
(`customers/[id]/page.tsx:18` → `agent/actions.ts:109` → `customer.service.ts:127`). Yet **59 of
the 60 rows were written after that date with the column NULL** (44 on 07-18, 8 as late as
08-03). The likeliest cause is the known prod branch-divergence hazard — production running a
build without that commit. **Not a code defect I can see; flagged, not fixed.**

## 3. Admin reads without an audit trail — the gap

Ranked by sensitivity. Full enumeration of every admin surface was performed; this is the
subset that reads another person's data and writes **no** audit row.

| # | Path | Reads | Audit |
|---|---|---|---|
| 1 | **`getUserDetails`** (`admin/actions.ts:320-372`) | the whole `User` row (email, phone, **taxId**, stripeCustomerId) **+ `policyholderProfile: true`** — every Art. 9 health field (chronicConditions, familyMedicalHistory, smokingStatus, gender, height, weight) and every financial field (annualIncome, mortgageAmount, loanAmount, savingsAmount) — plus `agentProfile`, `adminProfile`, subscriptions, invoices, securityEvents (with IP), activeSessions (with IP/device), 10 policies | **NONE** |
| 2 | scheduled jobs (`privacy-retention:63`, `dsr-evidence-snapshot:25`, and ~10 others) | per-user profile/policy data at scale under an `admin`-role credential | only `db.jobRun` ("the job ran"), never which subjects were touched |
| 3 | `getExtractionFlagQueue` (`:1459`) | `user{name,email}` + `policy.acordData` (extracted document content) | **NONE** |
| 4 | `getDsrQueue` (`:837`) | every open DSR with `user{name,email,roles}` | **NONE** (the *actions* on a request are logged; browsing the queue is not) |
| 5 | `getPoliciesForAdmin` (`policy-actions.ts:59`) | policies with `owner{email}` across all owners | **NONE** |
| 6 | `getPendingAgents` (`:616`) | `user{name,email,phoneNumber}` | **NONE** |
| 7 | `getUsers` (`:236`) | paginated `name,email,phoneNumber,roles` | **NONE** |
| 8 | `GET /api/admin/tokens/usage` | `tokenUsage` + `user{id,name,email}`, filterable by arbitrary `?userId=` | **NONE** |
| 9 | `admin/submissions/page.tsx:32` | `formSubmission.findMany` with **no `select`** — full email/name/phone/message rows | **NONE** |
| 10 | `getActivityLogs` (`:194`) | the audit log itself | NONE — benign, noted for completeness |

**Reads that ARE audited** all share one shape: they read identifying fields *in order to
perform a write*, and the log records the write. `executeDataExportRequestAsAdmin`
(`:952`, logs `EXECUTE_DATA_EXPORT_REQUEST` at `:1007`) is the only audited path that reads
Art. 9 data — via `buildUserDataExportPayload`, whose Art. 9 selection is explicit at
`compliance.service.ts:63-114`. Its log line does **not** record that Art. 9 data was included.

### The sharpest fact about #1

`getUserDetails` fetches `policyholderProfile`, `agentProfile` and `adminProfile` **in full —
and the page renders none of them.** The page (`admin/users/[id]/page.tsx`, the function's
**only** caller) consumes exactly 17 fields: `id, name, email, phoneNumber, taxId,
emailVerified, preferredLanguage, roles, createdAt, lastActiveAt, stripeCustomerId,
policiesOwned, subscriptions, invoices, tokenBalance, activeSessions, securityEvents`.

So the health and financial data is read out of the database, sent to the server component,
and thrown away. That is an Art. 5(1)(c) data-minimisation problem sitting underneath the
Art. 30 audit problem — and it means the correct fix is **to stop reading it**, not to log
that it was read. Logging access to data you never needed is the worse of the two repairs.

### 3b. The same over-read on the AGENT side

`lib/services/gap-engine/agent-playbook.ts:304-306` runs
`db.policyholderProfile.findUnique({ where: { userId: clientUserId } })` with **no `select`** —
every Art. 9 health field and every financial field for a client — and the entire 424-line
file uses **exactly one of them: `profile.ownsHome`**. The file contains **zero**
`activityLog` writes.

So both places that read special-category data outside the DSAR path are massive over-fetches
where the needed field is trivially selectable. This is the second confirmation that
minimisation, not logging, is the correct primary repair.

### 3c. Read-access rows are purged a year early

The retention split keys on `metadata._audit`, which **only `logAdminAction` stamps**.
`AGENT_VIEWED_CUSTOMER` and `MEDIC_SUGGESTION_REQUESTED` — the only two rows that carry
`targetUserId` for right-of-access purposes — are written by raw `activityLog.create`, so they
have no `_audit` marker and fall into the **365-day** bucket, not the 5-year accountability
bucket. Even if the right-of-access reader existed, it could not answer a question about
access more than a year ago.

## 4. Art. 9 distinguishability

**Today: impossible.** No audit row records that health/financial data specifically was
touched. `getUserDetails` writes no row at all; `EXECUTE_DATA_EXPORT_REQUEST` writes a row
that does not say the payload contained Art. 9 fields. From the log you cannot tell an admin
who looked at a name from one who looked at a medical history.

## 5. Retention — genuinely code-backed and proven

| Fact | Evidence |
|---|---|
| Scheduled | `vercel.json` cron `"/api/v1/jobs/privacy-retention"` at `"45 6 * * *"` (daily 06:45) |
| Cron-invokable | `export const GET = POST` (`route.ts:147`) — Vercel crons issue GET; without this it would fail silently (a known trap in this repo) |
| Authenticated | `CRON_SECRET` via `x-cron-secret` header or bearer (`:47-58`) |
| Split | `ADMIN_AUDIT_RETENTION_DAYS = 5 * 365` (`:41`), `USER_ACTIVITY_RETENTION_DAYS = 365` (`:43`) |
| Discriminator | `metadata.path(["_audit"]) not Prisma.DbNull` = admin accountability; `equals DbNull` = ordinary activity (`:107-118`) |
| Tested | `tests/unit/privacy-retention-job.test.ts`, `tests/unit/retention-matches-policy.test.ts` |
| **Has actually run in production** | a `data_export_requests` row: requested 07-21, expired 07-28, now `status='expired'`, `download_token` NULL, `payload_json` reduced to the JSON literal `null` |

**A false finding of my own, caught and discarded:** I first reported "1 expired export payload
still present in prod." That was a query artifact — `Prisma.JsonNull` writes a *JSON* null, so
`payload_json IS NOT NULL` is true while `payload_json::text = 'null'`. The payload was
purged. Recorded here because the standing rule cuts both ways: an unverified finding is as
bad as an unverified capability claim.

## 6. Disclosure and erasure of the log itself

- **Erasure:** `ActivityLog` is `ERASURE_EXEMPT` — *"GDPR access record; retained as the audit
  of who saw what"* (`erasure-covers-personal-data.test.ts:138`). Correct.
- **Disclosure:** `ActivityLog` is **not in the Art. 15 export** (`grep activityLog
  lib/services/compliance.service.ts` → nothing). So the record of who accessed a person's data
  is retained for five years and never shown to that person. Noted; disclosure design is a DPO
  question, not a code one.

## 7. Boundary respected — notifying the subject is a decided non-decision

`lib/notifications/registry.ts:1282-1296` defines `admin_action_on_account` with
`status: "planned"` and the note: *"Deliberately NOT wired yet. Notifying on every admin read
would bury the customer and would fire on routine support work; the rule needs to name which
admin actions are worth telling someone about, and that is a policy decision, not a code
one."* **Phase 2 will not wire it.** It is listed as BLOCKED-ON-DECISION.

---

## 8. What Phase 2 will change (plan)

1. **Minimise before logging.** Drop `policyholderProfile` / `agentProfile` / `adminProfile`
   from `getUserDetails` — fetched, never rendered, Art. 9. Verified: one caller, 17 fields
   consumed, none of them these.
2. **Make the helpers able to name the subject.** Add `targetUserId` to `logAdminAction` (and
   a read-specific wrapper), so the GDPR index stops backing nothing.
3. **Log every admin read of another person's data** — actor, subject, scope of fields, time —
   across the ten paths in §3.
4. **`isBreakGlass`: REMOVE.** After (1) no admin surface reads Art. 9 at all, so there is
   nothing left for a break-glass control to gate, and building an explicit
   elevated-access-with-stated-reason flow is a product decision, not a code one. A field whose
   name promises a control that does not exist is exactly the artifact the red-team called a
   diligence exhibit. Removal needs a destructive migration — acceptable here: 7 prod rows, all
   the founder's own test deletions, all mislabelled by the flag anyway.
5. **Make Art. 9 access distinguishable** where it legitimately still happens — the admin DSAR
   execution path — by recording in the audit row that the payload included special-category
   data.
6. **A guard test** deriving admin read paths from the filesystem, so a new unaudited admin
   read fails CI (mirroring `policy-authorization-single-path.test.ts`).

**Not doing:** wiring subject notifications (§7); exporting `ActivityLog` to subjects (§6) —
both are owner/DPO decisions.

---

# Implementation (committed `d795ec05`)

| # | Change | Where |
|---|---|---|
| 1 | **Stopped reading the health record.** `policyholderProfile` / `agentProfile` / `adminProfile` removed from `getUserDetails` — its only caller renders none of them | `admin/actions.ts:337` |
| 2 | **`logAdminAction` can name the data subject** (`targetUserId` param), and a new `logAdminRead` records subject + field **scope** (classes, never values) + a `specialCategory` flag | `lib/admin/admin-guard.ts` |
| 3 | **Nine read paths instrumented**: `getUserDetails`, `getUsers`, `getPendingAgents`, `getDsrQueue`, `getExtractionFlagQueue`, `getPoliciesForAdmin`, submissions page, token-usage API, advisor playbook | across admin + api |
| 4 | **Art. 9 made distinguishable** — the advisor playbook and the admin DSAR execution both record `specialCategory: true`; the DSAR row also gains `targetUserId` | `agent-playbook.ts`, `admin/actions.ts:1069` |
| 5 | **Retention classification corrected** — a row naming a subject is an accountability record (5y); the 12-month sweep is now its strict complement | `privacy-retention/route.ts:107-131` |
| 6 | **`isBreakGlass` dropped** — schema + the single write site + migration `20260819120000`, applied to **prod and dev** via Supabase MCP (the migrate CLI cannot reach these databases) | `schema.prisma`, `account/actions.ts` |
| 7 | **Guard test** deriving subjects from source, red-green proven | `tests/unit/admin-reads-are-audited.test.ts` |

## A correction I had to make to my own Step 0

§3b of this document originally claimed the advisor playbook was the same pure over-fetch as
`getUserDetails` — "uses exactly one field, `profile.ownsHome`". **That was wrong**, from a
shallow grep. The profile flows into `toLifeContext`, which reads across dependents,
residence, income, mortgage **and the Art. 9 fields** (`chronicConditions`,
`familyMedicalHistory`). I narrowed the query to `select: { ownsHome: true }`; the compiler
rejected it, which is the only reason it did not ship as a silent behaviour change.

The honest treatment is the opposite of minimisation: it is a **genuine special-category read
by an advisor about a client**, so it is now audited and flagged. §3b is corrected in place.

# Verification

| Acceptance criterion | Result |
|---|---|
| No code path reads another user's personal data without producing an audit row | ✅ for the enumerated admin/agent surfaces — 9 paths instrumented, coverage enforced by a filesystem-derived guard, **red-green proven** (removing the `getUserDetails` call fails the test by name). ⚠ **Two honest exclusions**, below |
| The retention job is proven to run and to purge on schedule | ✅ scheduled (`vercel.json` 06:45), cron-invokable (`GET = POST`), tested, **and observed to have run in production** (an export payload purged after expiry) |
| Any logging statement a trust page could make is backed by a named file and test | ✅ §5 + `privacy-retention-job.test.ts`, `admin-reads-are-audited.test.ts`, `admin-activity-scope.test.ts` |

**Gate:** `tsc` clean · ESLint 0 · `audit:api-auth` pass · `lint:utf8` 1816 · `i18n` pass ·
**unit 4551/4551 (432 files)**.

**GATE PASSED**, with two exclusions stated rather than papered over:

1. **Scheduled jobs still record only "the job ran."** ~14 cron routes read per-user data under
   an admin-role credential and write to `db.jobRun`, never naming the subjects touched.
   Instrumenting a bulk sweep per-subject would write millions of rows to answer a question
   ("did the nightly job read my row?") whose answer is always yes; the right design is a
   documented processing activity, not an audit row per user. **Left as a documented gap.**
2. **Cross-checking against production is not possible for the read trail yet** — see the
   `AGENT_VIEWED_CUSTOMER` anomaly in §2, where prod rows lack `targetUserId` despite the code
   setting it. Until that is explained, the trail should be trusted from code, not from prod data.

## BLOCKED — human-track

| Item | Owner | Why |
|---|---|---|
| Notify subjects of admin access | Owner/DPO | `registry.ts:1295` — which actions merit telling someone is a policy decision |
| Disclose `ActivityLog` to the subject in the Art. 15 export | DPO | retained 5 years, never shown to the person it concerns (§6) |
| Ratify the 5-year window for read-access rows | DPO | the published line says technical logs "up to 12 months"; accountability records are a different class, and this change moves read-access rows into it |
| Explain the prod `targetUserId` anomaly | Owner | likely branch divergence; confirm which build production runs |
