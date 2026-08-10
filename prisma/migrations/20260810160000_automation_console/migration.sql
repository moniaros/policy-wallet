-- Automation administration console.
--
-- Three additive tables. Nothing existing is altered.
--
-- job_schedules / job_runs exist because a schedule you cannot observe is a
-- schedule you cannot trust. The platform owns WHEN a cron fires (vercel.json,
-- unchangeable from the app); what the app can own is whether the job does
-- anything when it does, and whether anyone can see that it ran. Without these
-- the console could only render vercel.json back at the operator — a list of
-- cron expressions with no evidence any of them executed, which is exactly how
-- two job routes came to exist that no cron had ever invoked.

CREATE TABLE IF NOT EXISTS "job_schedules" (
    "name"        TEXT NOT NULL,
    -- False = the job returns immediately and records a `paused` run. Recorded
    -- rather than silent: "this did not happen because you paused it" is what an
    -- operator needs when a customer asks why nothing arrived.
    "enabled"     BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "changed_by"  TEXT,
    "updated_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "job_schedules_pkey" PRIMARY KEY ("name")
);

CREATE TABLE IF NOT EXISTS "job_runs" (
    "run_id"      TEXT NOT NULL,
    "job_name"    TEXT NOT NULL,
    "started_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    -- running | succeeded | failed | paused
    "status"      TEXT NOT NULL DEFAULT 'running',
    -- The job's own summary. Jobs already report honestly what they could NOT
    -- finish; this is where that becomes visible to an operator.
    "summary"     JSONB,
    "error"       TEXT,
    "duration_ms" INTEGER,
    -- cron | manual. An operator-triggered run is not evidence the SCHEDULE works.
    "trigger"     TEXT NOT NULL DEFAULT 'cron',
    CONSTRAINT "job_runs_pkey" PRIMARY KEY ("run_id")
);

CREATE INDEX IF NOT EXISTS "job_runs_job_name_started_at_idx" ON "job_runs" ("job_name", "started_at");
CREATE INDEX IF NOT EXISTS "job_runs_status_started_at_idx"   ON "job_runs" ("status", "started_at");

ALTER TABLE "job_runs" DROP CONSTRAINT IF EXISTS "job_runs_job_name_fkey";
ALTER TABLE "job_runs"
    ADD CONSTRAINT "job_runs_job_name_fkey"
    FOREIGN KEY ("job_name") REFERENCES "job_schedules"("name")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Operator override on a BUSINESS event.
--
-- Distinct from notification_rule_overrides, which governs a NOTIFICATION.
-- This switches the fact off at source: with it disabled the event is still
-- RECORDED — the fact happened, and denying it would corrupt the log — but the
-- decision engine takes no actions from it. That is the difference between
-- "stop telling people" and "stop reacting at all".

CREATE TABLE IF NOT EXISTS "business_event_overrides" (
    "override_id" TEXT NOT NULL,
    "event_type"  TEXT NOT NULL,
    "enabled"     BOOLEAN NOT NULL DEFAULT true,
    "notes"       TEXT,
    "version"     INTEGER NOT NULL DEFAULT 1,
    "changed_by"  TEXT,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "business_event_overrides_pkey" PRIMARY KEY ("override_id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "business_event_overrides_event_type_key"
    ON "business_event_overrides" ("event_type");
