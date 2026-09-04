-- Personal Protection Profile — Layer 1 (NEEDS) of the needs → coverage → gap model.
--
-- The first-stage onboarding now asks about LIFE before it asks for a policy:
-- who depends on the person, where they live, where their income comes from,
-- what would hurt most, how confident they feel, what changed. The ownership
-- FACTS from those answers go to the typed policyholder_profiles columns the
-- risk engine already reads (children_count, residence_type, employment_status,
-- vehicles_count, has_loans …) through the same non-overwriting patch the
-- /protection quick start uses. What has NO column — and must not be confused
-- with a fact — is the person's own STATEMENTS: why they came, what they say
-- would hurt most, how sure they feel, what is coming. That is this table.
--
-- WHY A TABLE RATHER THAN THE preferences JSON BLOB:
--   * Typed and queryable — the product needs "how many arrived unsure" and
--     "which concern is most common", which a blind JSON merge cannot answer.
--   * Covered automatically by the schema-derived erasure guard
--     (tests/unit/erasure-covers-personal-data.test.ts) and exported under
--     Art. 15 by name, instead of vanishing inside a blob that is wiped whole.
--   * Keeps Layer 1 in its own store so a stated priority can never reach the
--     gap engine as if it were a fact. Nothing here is a verdict; the derived
--     "areas to check" are computed on read and never persisted as a score.
--
-- One row per user (unique user_id), cascaded with the user. Additive and
-- idempotent; existing rows are unaffected.
CREATE TABLE IF NOT EXISTS "protection_profiles" (
    "protection_profile_id" TEXT NOT NULL,
    "user_id"               TEXT NOT NULL,
    "intent"                TEXT,
    "risk_concerns"         JSONB,
    "commitments"           JSONB,
    "confidence_level"      TEXT,
    "uncertainty_reasons"   JSONB,
    "recent_changes"        JSONB,
    "future_considerations" JSONB,
    "guidance_preference"   TEXT,
    "priority_areas"        JSONB,
    "answers"               JSONB,
    "answered_steps"        JSONB,
    "unsure_steps"          JSONB,
    "upload_choice"         TEXT,
    "version"               INTEGER NOT NULL DEFAULT 1,
    "started_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at"          TIMESTAMP(3),
    "skipped_at"            TIMESTAMP(3),
    "summary_viewed_at"     TIMESTAMP(3),
    "created_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"            TIMESTAMP(3) NOT NULL,

    CONSTRAINT "protection_profiles_pkey" PRIMARY KEY ("protection_profile_id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "protection_profiles_user_id_key" ON "protection_profiles"("user_id");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'protection_profiles_user_id_fkey'
    ) THEN
        ALTER TABLE "protection_profiles"
            ADD CONSTRAINT "protection_profiles_user_id_fkey"
            FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
