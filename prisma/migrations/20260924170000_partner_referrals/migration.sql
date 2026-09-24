-- Owner decision 2026-09-24: record that a person used a partner offer.
CREATE TABLE "partner_referrals" (
  "partner_referral_id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE,
  "offer_id" TEXT NOT NULL REFERENCES "partner_offers"("offer_id") ON DELETE CASCADE ON UPDATE CASCADE,
  "vendor_id" TEXT NOT NULL,
  "method" TEXT NOT NULL CHECK ("method" IN ('link', 'code', 'phone')),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "partner_referrals_user_id_offer_id_idx" ON "partner_referrals"("user_id", "offer_id");
CREATE INDEX "partner_referrals_vendor_id_created_at_idx" ON "partner_referrals"("vendor_id", "created_at");
ALTER TABLE "partner_referrals" ENABLE ROW LEVEL SECURITY;
