-- Policy Renewal Tracking
-- Tracks renewal milestones, reminders, and outcomes for policies approaching expiry

CREATE TABLE IF NOT EXISTS "policy_renewals" (
    "renewal_id"          TEXT NOT NULL,
    "policy_id"           TEXT NOT NULL,
    "owner_user_id"       TEXT NOT NULL,
    "agent_user_id"       TEXT,
    "policy_end_date"     TIMESTAMP(3) NOT NULL,
    "days_before_expiry"  INTEGER NOT NULL,
    "status"              TEXT NOT NULL DEFAULT 'pending',
    "outcome"             TEXT,
    "outcome_notes"       TEXT,
    "outcome_at"          TIMESTAMP(3),
    "reminders_sent"      JSONB NOT NULL DEFAULT '[]',
    "last_reminder_at"    TIMESTAMP(3),
    "task_id"             TEXT,
    "opportunity_id"      TEXT,
    "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"          TIMESTAMP(3) NOT NULL,

    CONSTRAINT "policy_renewals_pkey" PRIMARY KEY ("renewal_id")
);

-- Unique: one renewal record per policy per end-date
CREATE UNIQUE INDEX IF NOT EXISTS "policy_renewals_policy_id_policy_end_date_key"
    ON "policy_renewals" ("policy_id", "policy_end_date");

CREATE INDEX IF NOT EXISTS "policy_renewals_owner_user_id_idx"
    ON "policy_renewals" ("owner_user_id");

CREATE INDEX IF NOT EXISTS "policy_renewals_agent_user_id_idx"
    ON "policy_renewals" ("agent_user_id");

CREATE INDEX IF NOT EXISTS "policy_renewals_status_idx"
    ON "policy_renewals" ("status");

CREATE INDEX IF NOT EXISTS "policy_renewals_policy_end_date_idx"
    ON "policy_renewals" ("policy_end_date");

-- Index on policies.end_date for efficient renewal scans
CREATE INDEX IF NOT EXISTS "policies_end_date_idx"
    ON "policies" ("end_date");

-- Foreign keys
ALTER TABLE "policy_renewals"
    ADD CONSTRAINT "policy_renewals_policy_id_fkey"
    FOREIGN KEY ("policy_id") REFERENCES "policies"("policy_id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "policy_renewals"
    ADD CONSTRAINT "policy_renewals_owner_user_id_fkey"
    FOREIGN KEY ("owner_user_id") REFERENCES "users"("user_id")
    ON DELETE CASCADE ON UPDATE CASCADE;
