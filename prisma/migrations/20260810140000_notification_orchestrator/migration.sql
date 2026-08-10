-- Notification orchestrator: scheduling, quiet hours and rate limiting.
--
-- Specification: docs/architecture/notification-automation.md §Orchestrator
--
-- Additive. With no row in user_notification_settings every user gets the
-- role-derived defaults, which is the behaviour the code ships with.

-- ── Scheduling ───────────────────────────────────────────────────────────────
--
-- When a notification may FIRST be attempted. Null = immediately.
--
-- Set when a notification is DEFERRED rather than dropped — most often by quiet
-- hours. Deferring is the honest response to "not now": the customer still gets
-- told, at an hour when being told is welcome. Dropping would lose the
-- notification to a policy that was only ever about timing, and a customer
-- would never learn their cover lapsed because it lapsed at 23:40.

ALTER TABLE "notification_events"
    ADD COLUMN IF NOT EXISTS "scheduled_for" TIMESTAMP(3);

-- The scheduled-send worker: deferred rows whose hour has come.
CREATE INDEX IF NOT EXISTS "notification_events_status_scheduled_for_idx"
    ON "notification_events" ("status", "scheduled_for");

-- ── Per-user delivery settings ───────────────────────────────────────────────
--
-- One table for customers AND advisors. The two want different DEFAULTS — a
-- customer wants nothing at 03:00, an advisor is being handed work and wants it
-- inside working hours — but they want the same SETTINGS, and a second table
-- would be the same logic twice, differing only in who it applies to. Defaults
-- are derived from the user's role at read time; this row is the override.
--
-- Quiet hours default ON, 22:00–08:00 local. A push at 03:00 is a reason to
-- uninstall, and a customer should not have to discover the setting only after
-- being woken by it.

CREATE TABLE IF NOT EXISTS "user_notification_settings" (
    "user_id"             TEXT NOT NULL,
    -- IANA zone. Quiet hours are meaningless without one, and the product is
    -- Greek-market: Europe/Athens is the honest default, not UTC. Resolved
    -- through Intl at read time so daylight saving is handled — a fixed +2
    -- would put the window an hour wrong for half the year, in exactly the
    -- season where being woken matters.
    "timezone"            TEXT NOT NULL DEFAULT 'Europe/Athens',
    "quiet_hours_enabled" BOOLEAN NOT NULL DEFAULT true,
    -- Local hours, 0–23. start > end means the window crosses midnight, which
    -- is the normal case.
    "quiet_hours_start"   INTEGER NOT NULL DEFAULT 22,
    "quiet_hours_end"     INTEGER NOT NULL DEFAULT 8,
    -- Hard cap per rolling day. NULL = the role default, so raising a default
    -- reaches everyone who never overrode it. A runaway cron reaching a
    -- customer forty times is worse than the cron.
    "max_per_day"         INTEGER,
    -- immediate | daily. Reserved for digest batching.
    "digest_mode"         TEXT NOT NULL DEFAULT 'immediate',
    "updated_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_notification_settings_pkey" PRIMARY KEY ("user_id")
);

ALTER TABLE "user_notification_settings"
    DROP CONSTRAINT IF EXISTS "user_notification_settings_user_id_fkey";
ALTER TABLE "user_notification_settings"
    ADD CONSTRAINT "user_notification_settings_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("user_id")
    ON DELETE CASCADE ON UPDATE CASCADE;
