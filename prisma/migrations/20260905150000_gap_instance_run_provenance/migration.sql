-- B0 — one writer, run provenance, honest re-run semantics
-- (PW-TRANSPARENCY-02 amendment 01, Goal B0.1 / B0.2).
--
-- Every gap row records the analysis run that produced it, the branch it was
-- evaluated for and the catalogue version it was evaluated against; a run
-- records which rules it attempted. Rows are never deleted by a later run:
-- they are superseded, so a finding that fires, resolves and fires again is
-- two rows, and a failed re-run leaves the previous rows visibly dated.

ALTER TABLE "gap_instances"
    ADD COLUMN "analysis_run_id" TEXT,
    ADD COLUMN "line_of_business" TEXT,
    ADD COLUMN "catalogue_version" TEXT,
    ADD COLUMN "superseded_at" TIMESTAMP(3),
    ADD COLUMN "superseded_by_run_id" TEXT,
    ADD COLUMN "prior_status" TEXT;

ALTER TABLE "policy_analysis_runs"
    ADD COLUMN "attempted_rules" JSONB;

-- Backfill: attribute every existing row to the latest completed run of its
-- policy. Verified before applying (dev 2026-09-05: 10 rows, 3 policies, all
-- attributable; prod checked the same way before its own apply).
UPDATE "gap_instances" gi
SET "analysis_run_id" = (
    SELECT r."analysis_run_id"
    FROM "policy_analysis_runs" r
    WHERE r."policy_id" = gi."policy_id"
      AND r."status" IN ('completed', 'completed_with_warnings')
    ORDER BY r."finished_at" DESC NULLS LAST, r."created_at" DESC
    LIMIT 1
)
WHERE gi."analysis_run_id" IS NULL
  AND gi."policy_id" IS NOT NULL;

UPDATE "gap_instances" gi
SET "line_of_business" = p."line_of_business"
FROM "policies" p
WHERE p."policy_id" = gi."policy_id"
  AND gi."line_of_business" IS NULL;

-- A row no completed run can account for has no provenance and no producer
-- left in the code (the legacy writer is unreachable after this change). Such
-- rows are exported to docs/archive before this runs on production; on both
-- databases the count was verified first.
DELETE FROM "gap_instances" WHERE "analysis_run_id" IS NULL;

ALTER TABLE "gap_instances" ALTER COLUMN "analysis_run_id" SET NOT NULL;
ALTER TABLE "gap_instances" ALTER COLUMN "line_of_business" SET NOT NULL;

ALTER TABLE "gap_instances"
    ADD CONSTRAINT "gap_instances_analysis_run_id_fkey"
    FOREIGN KEY ("analysis_run_id") REFERENCES "policy_analysis_runs"("analysis_run_id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "gap_instances_analysis_run_id_idx" ON "gap_instances"("analysis_run_id");
CREATE INDEX "gap_instances_policy_id_superseded_at_idx" ON "gap_instances"("policy_id", "superseded_at");

-- One CURRENT row per (policy, definition). The previous index
-- (20260414120000_risk_remediations) allowed one row per pair for all time,
-- which is what forced the delete-and-recreate and the reactivate semantics.
DROP INDEX IF EXISTS "gap_instances_policy_definition_unique";
CREATE UNIQUE INDEX "gap_instances_policy_definition_current_unique"
    ON "gap_instances"("policy_id", "gap_definition_id")
    WHERE "policy_id" IS NOT NULL AND "superseded_at" IS NULL;
