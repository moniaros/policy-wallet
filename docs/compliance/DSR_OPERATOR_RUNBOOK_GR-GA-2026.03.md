# DSR Operator Runbook (GR-GA-2026.03)

## Scope
1. Covers GDPR Data Subject Request (DSR) operations for:
2. Data export requests.
3. Deletion requests.
4. Applies to admin operators for Greece public GA.

## Systems and Entry Points
1. Admin queue UI:
2. `/admin/dsr`
3. DSR API endpoints:
4. `POST /api/v1/me/data-export`
5. `GET /api/v1/me/data-export/[id]`
6. `POST /api/v1/me/deletion-request`
7. `GET /api/v1/me/deletion-request/[id]`
8. DSR evidence job:
9. `POST /api/v1/jobs/dsr-evidence-snapshot`
10. Audit source:
11. `activity_logs` entries from admin actions in `app/(protected)/admin/actions.ts`.

## Queue Status Model
1. Data export statuses:
2. `requested`, `processing`, `completed`, `failed`, `expired`
3. Deletion statuses:
4. `requested`, `in_review`, `approved`, `processing`, `completed`, `rejected`, `failed`

## Standard Operating Procedures
### A) Data Export Request
1. Open `/admin/dsr` and locate request.
2. If status is `requested`/`failed`/`expired`, run Execute.
3. Confirm terminal state is `completed` or `failed`.
4. If failed:
5. Capture error message.
6. Re-run once after validating data integrity.
7. Escalate to engineering if second attempt fails.

### B) Deletion Request
1. Open `/admin/dsr` and validate requester identity and legal basis.
2. Move to `in_review` and add operator note.
3. Approve if criteria met; reject with reason if not.
4. Execute only when status is `approved` (or retry when `failed`).
5. Confirm terminal state is `completed`.
6. Verify anonymization and cleanup side effects:
7. User PII fields are anonymized.
8. Active sessions/access grants revoked.
9. User-owned policies removed.

## SLA and Escalation
1. Target handling SLA:
2. Initial triage within 24h.
3. Completion target within 72h unless legal hold applies.
4. Escalate to compliance lead when:
5. Request is pending beyond 24h without action.
6. Any request remains in failed status after retry.
7. Legal basis/retention exception is unclear.

## Evidence Capture Procedure
1. Run `POST /api/v1/jobs/dsr-evidence-snapshot`.
2. Record:
3. `generated_at`
4. `needs_attention`
5. summary counts.
6. Capture `/admin/dsr` screenshots for active and completed states.
7. Record corresponding `activity_logs` rows for operator actions.
8. Attach outputs to:
9. `docs/compliance/DSR_E2E_EVIDENCE_GR-GA-2026.03.md`

## Incident Handling
1. If DSR snapshot reports `needs_attention=true`:
2. Prioritize oldest pending requests.
3. Resolve failed requests first.
4. Re-run snapshot and confirm attention flags cleared.
5. If unresolved after one operator cycle, escalate to engineering + DPO.

## 2026-07 Amendments (post gdpr-deletion-erasure audit)
1. **Legal deadline**: the queue now shows a "Due (Art. 12)" column — one month
   from `requestedAt`. Overdue or ≤7-days-left rows take priority over the 72h
   internal target. The evidence snapshot runs daily via Vercel cron (06:30 UTC)
   and raises a Sentry warning when `needs_attention=true`.
2. **Execution side effects** (all in `lib/services/gdpr-erasure.service.ts`,
   ordered for retry safety): Stripe subscriptions cancelled → Brevo contact
   deleted → Supabase auth identity deleted → storage PDFs deleted → DB
   anonymization transaction. Any step failing marks the request `failed` with
   the reason; **Execute again to retry — every step is idempotent.** A request
   stuck in `processing` (crash mid-run) can also be re-executed directly.
3. **User notifications** (automatic, Art. 12(4)): approval, rejection (with the
   reason you type — write it for the data subject, not for the log) and
   completion each email the user in their language. The completion email goes
   to the pre-erasure address; no email is sent on retries of an already-
   anonymized account.
4. **User-withdrawn requests** appear as `rejected` with the operator note
   "Withdrawn by the data subject (self-service)". Do not treat these as
   operator rejections; no notification email is sent for them.
5. **Admin-initiated deletions** (from `/admin/users` → Delete) create an
   `ADMIN_INITIATED` request already approved and execute it immediately —
   same eraser, same audit trail.
6. **Backups / PITR**: database restores can resurrect erased personal data.
   After ANY production restore, list `deletion_requests` with
   `status='completed'` and `completed_at` AFTER the restore point and
   re-execute each (idempotent). Record this in the evidence doc.
7. **Retention sweep**: `/api/v1/jobs/privacy-retention` (daily cron, 06:45
   UTC) purges expired data-export payloads and 90-day-dead invites. If it
   fails repeatedly, escalate — expired export rows hold full PII snapshots.
8. **First-execution drill**: before the first real production erasure, run one
   against a throwaway account on the dev environment and verify: login
   impossible afterwards, storage objects gone, Stripe test subscription
   cancelled, completion email received.

## Sign-Off
| Role | Name | Decision | Date (YYYY-MM-DD) | Notes |
|---|---|---|---|---|
| Operations Lead |  | Pending |  |  |
| Compliance Lead / DPO |  | Pending |  |  |
| Engineering Lead |  | Pending |  |  |
