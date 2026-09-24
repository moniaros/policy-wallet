-- Spec v2 §10.3: a private note per viewer per policy.
CREATE TABLE "policy_notes" (
  "policy_note_id" TEXT PRIMARY KEY,
  "policy_id" TEXT NOT NULL REFERENCES "policies"("policy_id") ON DELETE CASCADE ON UPDATE CASCADE,
  "user_id" TEXT NOT NULL REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE,
  "body" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "policy_notes_policy_id_user_id_key" ON "policy_notes"("policy_id", "user_id");
CREATE INDEX "policy_notes_user_id_idx" ON "policy_notes"("user_id");
ALTER TABLE "policy_notes" ENABLE ROW LEVEL SECURITY;
