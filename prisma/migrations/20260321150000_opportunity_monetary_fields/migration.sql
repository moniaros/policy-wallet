-- Opportunity: add monetary fields for revenue pipeline tracking
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "estimated_premium" DECIMAL;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "estimated_commission" DECIMAL;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "quoted_premium" DECIMAL;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "won_premium" DECIMAL;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'EUR';
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "line_of_business" TEXT;

-- Index on status for pipeline queries
CREATE INDEX IF NOT EXISTS "opportunities_status_idx"
    ON "opportunities" ("status");
