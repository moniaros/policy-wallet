-- Notification bus.
--
-- Specification: docs/architecture/notification-automation.md
--
-- Three things, all additive except one drop of a table that nothing reads.
--
-- 1. notification_events gains the fields a delivery record needs and never had:
--    a priority, an idempotency key, retry bookkeeping and an expiry. Before
--    this, `failure_reason` was written and nothing ever read it, so a failed
--    notification was simply lost, and a cron re-run that recomputed the same
--    finding sent it again.
--
-- 2. push_devices replaces users.push_token. The single-token column meant
--    registering a second device silently evicted the first. In practice it was
--    always NULL — nothing in the app ever registered a token — which is why
--    every push the dispatcher recorded as `sent` was never attempted. The
--    column is KEPT (read-only) rather than dropped: dropping it is a separate,
--    riskier migration, and erasure still needs to clear it.
--
-- 3. The read-model backfill. `status` used to double as read state on one
--    surface (`queued` meant unread) while `read_at` meant it everywhere else.
--    `read_at` is now the only definition. Without the backfill below, every
--    already-read in-app notification would reappear as unread on deploy.

-- ── 1. notification_events ───────────────────────────────────────────────────

ALTER TABLE "notification_events"
    ADD COLUMN IF NOT EXISTS "priority"        TEXT NOT NULL DEFAULT 'normal',
    ADD COLUMN IF NOT EXISTS "dedupe_key"      TEXT,
    ADD COLUMN IF NOT EXISTS "attempts"        INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "next_attempt_at" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "expires_at"      TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "skip_reason"     TEXT;

-- Idempotency. Keyed per CHANNEL, because one emission writes one row per
-- channel: a (user, key) index alone would make a three-channel notification
-- collide with itself on its own first send. The dispatcher's pre-check asks
-- "does ANY row carry this key", which is the question that stops a re-send.
--
-- Partial, so the overwhelming majority of rows (no dedupe key) cost nothing.
CREATE UNIQUE INDEX IF NOT EXISTS "notification_events_user_id_dedupe_key_channel_key"
    ON "notification_events" ("user_id", "dedupe_key", "channel")
    WHERE "dedupe_key" IS NOT NULL;

-- The retry worker: "failed rows that are due".
CREATE INDEX IF NOT EXISTS "notification_events_status_next_attempt_at_idx"
    ON "notification_events" ("status", "next_attempt_at");

-- The unread badge, which runs on every authenticated page render. Partial on
-- exactly the predicate the badge uses, so it stays small as the table grows.
CREATE INDEX IF NOT EXISTS "notification_events_unread_idx"
    ON "notification_events" ("user_id")
    WHERE "channel" = 'in_app' AND "read_at" IS NULL;

-- ── 2. push_devices ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "push_devices" (
    "device_id"       TEXT NOT NULL,
    "user_id"         TEXT NOT NULL,
    "endpoint"        TEXT NOT NULL,
    "p256dh"          TEXT NOT NULL,
    "auth"            TEXT NOT NULL,
    "user_agent"      TEXT,
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_success_at" TIMESTAMP(3),
    "failure_count"   INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "push_devices_pkey" PRIMARY KEY ("device_id")
);

-- Re-subscribing the same browser returns the SAME endpoint, so this is what
-- makes registration idempotent: a user who opens the app daily must not
-- accumulate a row per visit.
CREATE UNIQUE INDEX IF NOT EXISTS "push_devices_endpoint_key"
    ON "push_devices" ("endpoint");

CREATE INDEX IF NOT EXISTS "push_devices_user_id_idx"
    ON "push_devices" ("user_id");

ALTER TABLE "push_devices"
    DROP CONSTRAINT IF EXISTS "push_devices_user_id_fkey";
ALTER TABLE "push_devices"
    ADD CONSTRAINT "push_devices_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("user_id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 3. Read-model backfill ───────────────────────────────────────────────────
--
-- An in-app row whose status was flipped to 'sent' was marked read by the old
-- bell API (it wrote status + sent_at and never touched read_at). Those rows
-- ARE read, and must not resurface. `sent_at` is when the flip happened, so it
-- is the honest read timestamp; created_at is the fallback for any row that
-- somehow lacks one.
UPDATE "notification_events"
   SET "read_at" = COALESCE("sent_at", "created_at")
 WHERE "channel" = 'in_app'
   AND "status"  = 'sent'
   AND "read_at" IS NULL;

-- The inverse is NOT backfilled on purpose. An in-app row still sitting at
-- 'queued' is genuinely unread, and 'queued' is now simply its delivery state
-- (an in-app notification is delivered by existing), so it needs no rewrite.

-- Non-in-app rows never had read state and must never acquire one. The old
-- shell badge counted `read_at IS NULL` across ALL channels, so every email
-- ever sent showed up as an unread notification; the badge is now scoped to
-- in_app and these rows are simply out of its reach.

-- The dead `protection_score_history` table is dropped SEPARATELY, in
-- 20260809130000_drop_dead_protection_score_history. Destructive statements do
-- not belong in the same migration as an additive one: this file must be safe
-- to apply to production without a judgement call, and dropping a table is a
-- judgement call.
