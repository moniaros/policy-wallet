-- One-off €3 gap-report unlock: fast-path flag on the policy + purchase
-- audit table (idempotent-fulfillment anchor, mirrors token_purchases).

-- AlterTable
ALTER TABLE "policies" ADD COLUMN "report_unlocked_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "report_unlock_purchases" (
    "purchase_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "amount_eur" DECIMAL(10,2) NOT NULL,
    "stripe_session_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_unlock_purchases_pkey" PRIMARY KEY ("purchase_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "report_unlock_purchases_stripe_session_id_key" ON "report_unlock_purchases"("stripe_session_id");

-- CreateIndex
CREATE INDEX "report_unlock_purchases_user_id_idx" ON "report_unlock_purchases"("user_id");

-- CreateIndex
CREATE INDEX "report_unlock_purchases_policy_id_idx" ON "report_unlock_purchases"("policy_id");

-- AddForeignKey
ALTER TABLE "report_unlock_purchases" ADD CONSTRAINT "report_unlock_purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_unlock_purchases" ADD CONSTRAINT "report_unlock_purchases_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("policy_id") ON DELETE CASCADE ON UPDATE CASCADE;
