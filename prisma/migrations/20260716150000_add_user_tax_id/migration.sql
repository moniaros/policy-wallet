-- Customer-level tax id (ΑΦΜ) so the agent smart-upload flow can identify and
-- disambiguate customers by VAT when attaching a scanned policy. Stored as a
-- normalized, digits-only value (see lib/identity/tax-id.ts).
--
-- Deliberately NOT unique: the same ΑΦΜ can legitimately appear on a phantom
-- customer and a real account, and User.email is already the unique key — a
-- unique tax_id would make phantom-customer creation throw. The index supports
-- the resolution lookup (WHERE tax_id = ...) scoped by CustomerRelationship.
--
-- NOTE for production at scale: build the index CONCURRENTLY (outside a
-- transaction) on the large users table — see the prod apply runbook.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tax_id" TEXT;

CREATE INDEX IF NOT EXISTS "users_tax_id_idx"
    ON "users"("tax_id");
