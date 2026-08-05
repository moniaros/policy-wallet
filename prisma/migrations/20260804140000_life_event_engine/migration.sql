-- Life Event Engine.
--
-- Specification: docs/architecture/life-event-model.md
--
-- Two additive tables. Nothing existing is altered, so every current surface
-- keeps working unchanged while the engine is wired in behind it.
--
-- life_event_instances is APPEND-ONLY. A correction is a new row that supersedes
-- the old one rather than an update, because a record that rewrites itself
-- cannot be trusted for the one job it has. `applied_patch` stores exactly what
-- was written so a retraction reverses cleanly instead of guessing at the prior
-- state.
--
-- risk_profile_versions is the history the product has never had. The current
-- protection_scores table is a single upserted row per user, so "your protection
-- improved after we added life cover" has been untellable. One row per
-- MATERIALLY different assessment: `context_hash` fingerprints the result, and a
-- recalculation producing an identical hash writes nothing — so the history
-- records changes rather than cron ticks.
--
-- definition_id is TEXT, not an enum, on purpose: the event registry is data, and
-- a database enum would make adding an event a migration.

CREATE TABLE IF NOT EXISTS "life_event_instances" (
    "life_event_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "definition_id" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "discovered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "magnitude" DECIMAL(65,30),
    "status" TEXT NOT NULL DEFAULT 'applied',
    "applied_patch" JSONB,
    "supersedes_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "life_event_instances_pkey" PRIMARY KEY ("life_event_id")
);

CREATE INDEX IF NOT EXISTS "life_event_instances_user_id_occurred_at_idx" ON "life_event_instances"("user_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "life_event_instances_user_id_definition_id_idx" ON "life_event_instances"("user_id", "definition_id");

CREATE TABLE IF NOT EXISTS "risk_profile_versions" (
    "risk_profile_version_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trigger" TEXT NOT NULL,
    "life_event_id" TEXT,
    "overall_score" INTEGER NOT NULL,
    "assessment_coverage" INTEGER,
    "indeterminate" BOOLEAN NOT NULL DEFAULT false,
    "risks" JSONB NOT NULL,
    "category_scores" JSONB NOT NULL,
    "open_finding_count" INTEGER NOT NULL,
    "context_hash" TEXT NOT NULL,

    CONSTRAINT "risk_profile_versions_pkey" PRIMARY KEY ("risk_profile_version_id")
);

CREATE INDEX IF NOT EXISTS "risk_profile_versions_user_id_computed_at_idx" ON "risk_profile_versions"("user_id", "computed_at");
CREATE UNIQUE INDEX IF NOT EXISTS "risk_profile_versions_user_id_version_key" ON "risk_profile_versions"("user_id", "version");

-- Cascade on user deletion. Both tables are personal data and must vanish with
-- the account — the GDPR erasure path relies on this rather than on remembering
-- to add a delete step. Guarded so a re-run is a no-op.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'life_event_instances_user_id_fkey') THEN
        ALTER TABLE "life_event_instances"
            ADD CONSTRAINT "life_event_instances_user_id_fkey"
            FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'risk_profile_versions_user_id_fkey') THEN
        ALTER TABLE "risk_profile_versions"
            ADD CONSTRAINT "risk_profile_versions_user_id_fkey"
            FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

