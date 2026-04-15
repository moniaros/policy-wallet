-- L3: GapInstance must belong to either a policy OR a user — never neither.
-- This enforces the invariant at the DB level so orphaned gap instances cannot accumulate.
ALTER TABLE "gap_instances"
    ADD CONSTRAINT "gap_instances_must_have_owner"
    CHECK ("policy_id" IS NOT NULL OR "user_id" IS NOT NULL);

-- L4: GapDefinition versioning — track who changed it and when for audit / rollback.
-- version is incremented on every admin update (see app/(protected)/admin/actions.ts updateGapDefinition).
ALTER TABLE "gap_definitions" ADD COLUMN "version"     INTEGER      NOT NULL DEFAULT 1;
ALTER TABLE "gap_definitions" ADD COLUMN "changed_at"  TIMESTAMP(3);
ALTER TABLE "gap_definitions" ADD COLUMN "changed_by"  TEXT;
