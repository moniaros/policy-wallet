-- H1: Add reserved_tokens to monthly_token_usage for atomic TOCTOU-safe budget reservation
ALTER TABLE "monthly_token_usage" ADD COLUMN "reserved_tokens" BIGINT NOT NULL DEFAULT 0;

-- H5: Partial unique indexes on gap_instances to prevent duplicates
-- Policy-level gaps: one gap definition per policy
CREATE UNIQUE INDEX "gap_instances_policy_definition_unique"
    ON "gap_instances" ("policy_id", "gap_definition_id")
    WHERE "policy_id" IS NOT NULL;

-- Profile-level gaps: one gap definition per user (no policy)
CREATE UNIQUE INDEX "gap_instances_user_definition_unique"
    ON "gap_instances" ("user_id", "gap_definition_id")
    WHERE "policy_id" IS NULL AND "user_id" IS NOT NULL;
