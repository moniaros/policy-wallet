-- Additive private workspace; independent of customer recommendation tables.
CREATE TABLE "agent_review_revisions" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE,
  "policy_id" TEXT NOT NULL REFERENCES "policies"("policy_id") ON DELETE CASCADE ON UPDATE CASCADE,
  "previous_id" TEXT UNIQUE,
  "source_digest" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "language" TEXT NOT NULL CHECK ("language" IN ('el', 'en')),
  "recipient_user_id" TEXT NOT NULL,
  "channel" TEXT NOT NULL DEFAULT 'collaboration' CHECK ("channel" = 'collaboration'),
  "status" TEXT NOT NULL DEFAULT 'draft' CHECK ("status" IN ('draft', 'approved', 'delivered', 'superseded')),
  "approval_digest" TEXT,
  "approved_at" TIMESTAMP(3),
  "delivered_at" TIMESTAMP(3),
  "message_id" TEXT UNIQUE,
  "feedback" TEXT CHECK ("feedback" IN ('accept', 'edit', 'reject', 'defer')),
  "feedback_note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "agent_review_revisions_user_id_policy_id_created_at_idx" ON "agent_review_revisions"("user_id", "policy_id", "created_at");
ALTER TABLE "agent_review_revisions" ENABLE ROW LEVEL SECURITY;
