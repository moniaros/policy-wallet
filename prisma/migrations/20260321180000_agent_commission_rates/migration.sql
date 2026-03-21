-- Agent commission rate configuration
-- Stores per-LoB commission percentages as JSON: { "motor": 15, "health": 20, ... }

ALTER TABLE "agent_profiles" ADD COLUMN IF NOT EXISTS "commission_rates" JSONB;
