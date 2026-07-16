-- Denormalized coverage end date so active-policy counts can filter/count in
-- SQL instead of deserializing acordData per row (the durable fix behind the
-- agent dashboard / insights / customer-list scale work).
--
-- The column is populated at write time (analysis persist, policy create/edit,
-- merge, renewal) and by scripts/backfill-coverage-end-date.mjs for existing
-- rows. NULL means "unknown duration" and counts as coverage.
--
-- NOTE for production at scale: build the index CONCURRENTLY (outside a
-- transaction) on the large policies table — see the prod apply runbook.

ALTER TABLE "policies" ADD COLUMN IF NOT EXISTS "coverage_end_date" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "policies_coverage_end_date_idx"
    ON "policies"("coverage_end_date");
