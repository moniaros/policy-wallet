# Collaboration Reminder Cron Workflow

This document defines how to run collaboration reminder jobs automatically on Vercel.

## Goal

Run `POST /api/v1/jobs/collaboration-reminders` on a schedule for:

- unread follow-up checks (hourly)
- overdue action reminders (daily cadence enforced in app logic)
- unresolved-thread daily digest (daily cadence enforced in app logic)

## Schedule Configuration

The schedules are defined in `vercel.json`:

- Hourly: `0 * * * *`
- Daily: `0 8 * * *` (08:00 UTC)

Both schedules call the same endpoint:

- `/api/v1/jobs/collaboration-reminders`

## Endpoint Security

The endpoint supports two auth modes:

1. `x-cron-secret` header matching `CRON_SECRET` (for scheduler/automation)
2. Admin session auth fallback (`requireApiUser({ roles: ["admin"] })`) for manual runs

File:

- `app/api/v1/jobs/collaboration-reminders/route.ts`

## Required Environment Variable

Set this in Vercel (Production and Preview as needed):

- `CRON_SECRET` = long random value

Also keep collaboration dependencies configured:

- `DATABASE_URL`
- `DIRECT_URL`
- `BREVO_API_KEY` (if email delivery via Brevo is desired)
- `SENDER_EMAIL`

## Vercel Setup Steps

1. Commit and push `vercel.json`.
2. In Vercel project settings, add/update `CRON_SECRET`.
3. Redeploy the project.
4. In Vercel dashboard, verify both cron jobs appear under Cron Jobs.

## Manual Verification

You can trigger the job manually as admin (signed-in), or via curl with secret:

```bash
curl -X POST "https://<your-domain>/api/v1/jobs/collaboration-reminders" \
  -H "x-cron-secret: <CRON_SECRET>"
```

Expected success payload (shape):

```json
{
  "data": {
    "summary": {
      "unreadFollowupsSent": 0,
      "overdueActionRemindersSent": 0,
      "dailyDigestsSent": 0
    }
  },
  "error": null,
  "meta": {
    "request_id": "...",
    "language": "el"
  }
}
```

## Operational Notes

- Hourly run may also attempt overdue/digest checks, but duplicate sends are prevented by per-day checks in `NotificationEvent`.
- Daily digest is explicitly limited to once per user per day.
- Overdue reminders are explicitly limited to once per action per day.
- Unread follow-up sends only once per message (tracked by `relatedObjectId = message.id`).

## Troubleshooting

If no emails are sent:

1. Confirm `BREVO_API_KEY` and `SENDER_EMAIL`.
2. Confirm users have valid emails in `users.email`.
3. Check `notification_events` rows for `status = failed` and `failure_reason`.

If cron runs do not appear:

1. Confirm `vercel.json` is at repo root (`policy-wallet/vercel.json`).
2. Confirm deployment used this branch/commit.
3. Check Vercel project Cron Jobs UI for schedule parsing errors.
