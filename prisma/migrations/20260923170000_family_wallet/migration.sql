-- Spec v2 §13: family sharing. A membership is the owner's accepted invite; a
-- policy can be kept out of the family wallet with private_to_owner.
CREATE TABLE "wallet_memberships" (
  "wallet_membership_id" TEXT PRIMARY KEY,
  "wallet_owner_user_id" TEXT NOT NULL REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE,
  "member_user_id" TEXT NOT NULL REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE,
  "status" TEXT NOT NULL DEFAULT 'active' CHECK ("status" IN ('active', 'ended')),
  "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ended_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "wallet_memberships_wallet_owner_user_id_member_user_id_key" ON "wallet_memberships"("wallet_owner_user_id", "member_user_id");
CREATE INDEX "wallet_memberships_member_user_id_status_idx" ON "wallet_memberships"("member_user_id", "status");
ALTER TABLE "wallet_memberships" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "policies" ADD COLUMN "private_to_owner" BOOLEAN NOT NULL DEFAULT false;
