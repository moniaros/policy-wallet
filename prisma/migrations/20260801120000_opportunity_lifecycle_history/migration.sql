-- Opportunity lifecycle: structured close outcomes + append-only stage history.
--
-- Motivation: `opportunities.status` was a single mutable column, so each stage
-- change overwrote the previous one. `open -> quoted -> lost` and `open -> lost`
-- were indistinguishable afterwards, which makes time-in-stage, funnel velocity
-- and forecast-vs-actual impossible to compute. None of it is backfillable, so
-- this starts the record going forward.
--
-- Idempotent (IF NOT EXISTS throughout) to match the house style for
-- hand-authored migrations applied across environments.

-- ── Opportunity: structured close outcome (mirrors policy_renewals) ──────────
-- `outcome_at` is the IMMUTABLE close date. Trend/cohort reporting buckets on
-- it; `updated_at` is unusable for that because any note edit or owner
-- reassignment bumps it, silently relocating historical revenue.
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "outcome" TEXT;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "outcome_notes" TEXT;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "outcome_at" TIMESTAMP(3);

-- Won/lost reporting filters by owner and buckets by close date.
CREATE INDEX IF NOT EXISTS "opportunities_owner_agent_user_id_outcome_at_idx"
    ON "opportunities" ("owner_agent_user_id", "outcome_at");

-- ── Proposal: persist the client's decline response ──────────────────────────
-- The response UI has always collected this taxonomy; with no column to hold it
-- the values were interpolated into a chat message and discarded.
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "decline_reason" TEXT;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "decline_comment" TEXT;
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "counter_offer_notes" TEXT;

-- ── Append-only stage-transition log ─────────────────────────────────────────
-- The first append-only table in this schema: ~5-15 rows per opportunity, so it
-- carries only the two indexes it actually serves.
CREATE TABLE IF NOT EXISTS "opportunity_stage_history" (
    "stage_history_id"  TEXT         NOT NULL,
    "opportunity_id"    TEXT         NOT NULL,
    -- NULL when the opportunity row was created (no prior stage).
    "from_status"       TEXT,
    "to_status"         TEXT         NOT NULL,
    -- NULL for system-driven transitions (cross-sell engine, cron).
    "changed_by_user_id" TEXT,
    -- Close reason; set only on transitions into a terminal stage.
    "outcome"           TEXT,
    "note"              TEXT,
    "changed_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "opportunity_stage_history_pkey" PRIMARY KEY ("stage_history_id")
);

-- Per-deal timeline reads walk one opportunity in order.
CREATE INDEX IF NOT EXISTS "opportunity_stage_history_opportunity_id_changed_at_idx"
    ON "opportunity_stage_history" ("opportunity_id", "changed_at");

-- Funnel/velocity aggregates scan transitions into a stage over a window.
CREATE INDEX IF NOT EXISTS "opportunity_stage_history_to_status_changed_at_idx"
    ON "opportunity_stage_history" ("to_status", "changed_at");

-- Deleting an opportunity discards its transition log with it.
DO $$
BEGIN
    ALTER TABLE "opportunity_stage_history"
        ADD CONSTRAINT "opportunity_stage_history_opportunity_id_fkey"
        FOREIGN KEY ("opportunity_id") REFERENCES "opportunities" ("opportunity_id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
