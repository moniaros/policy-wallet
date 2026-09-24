-- Prevention brief: intent + a user-chosen reminder on the benefit tracker,
-- a daily-nudge push opt-in, and consented health sharing with one advisor.
ALTER TABLE "health_benefit_usages" ADD COLUMN "intent" TEXT;
ALTER TABLE "health_benefit_usages" ADD COLUMN "intent_at" TIMESTAMP(3);
ALTER TABLE "health_benefit_usages" ADD COLUMN "remind_at" DATE;
ALTER TABLE "health_benefit_usages" ADD COLUMN "reminded_at" TIMESTAMP(3);
ALTER TABLE "health_benefit_usages" ADD CONSTRAINT "health_benefit_usages_intent_check" CHECK ("intent" IS NULL OR "intent" IN ('considering', 'later', 'not_relevant'));

ALTER TABLE "user_notification_settings" ADD COLUMN "daily_nudge_opt_in" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "health_shares" (
  "health_share_id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE,
  "agent_user_id" TEXT NOT NULL REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE,
  "relationship_id" TEXT NOT NULL REFERENCES "customer_relationships"("relationship_id") ON DELETE CASCADE ON UPDATE CASCADE,
  "scope" TEXT NOT NULL CHECK ("scope" IN ('assessment', 'profile', 'both')),
  "consent_version" TEXT NOT NULL,
  "snapshot" JSONB,
  "status" TEXT NOT NULL DEFAULT 'active' CHECK ("status" IN ('active', 'revoked')),
  "last_viewed_at" TIMESTAMP(3),
  "revoked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "health_shares_user_id_agent_user_id_key" ON "health_shares"("user_id", "agent_user_id");
CREATE INDEX "health_shares_agent_user_id_status_idx" ON "health_shares"("agent_user_id", "status");
ALTER TABLE "health_shares" ENABLE ROW LEVEL SECURITY;
