-- Admin-managed plan catalog: prices, annual prices, trial days, entitlement
-- limits, and visibility become DB-managed (edited via /admin/plans) with a
-- fail-closed code fallback (lib/pricing/plan-defaults.ts). Adds the catalog
-- columns + the plan_revisions audit table and backfills the canonical rows
-- from the previously hardcoded TS constants.
--
-- All statements are idempotent and value-guarded so re-runs (and manual prod
-- applies) never clobber later admin edits.
--
-- NOTE: entitlements JSON is deliberately NOT backfilled here. Existing rows
-- keep their legacy informational shape; the resolvers Zod-validate at read
-- time and fall back to the code defaults until the row is first saved from
-- /admin/plans (which writes the canonical shape). This keeps the migration
-- risk-free: behavior is byte-identical to the hardcoded model until an admin
-- actually edits something.

ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "tier_key" TEXT;
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "annual_price" DECIMAL(65,30);
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "trial_days" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "is_public" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "sort_order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS "plan_revisions" (
    "revision_id"      TEXT NOT NULL,
    "plan_id"          TEXT NOT NULL,
    "version"          INTEGER NOT NULL,
    "snapshot"         JSONB NOT NULL,
    "changes"          JSONB NOT NULL,
    "changed_by"       TEXT NOT NULL,
    "changed_by_email" TEXT NOT NULL,
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_revisions_pkey" PRIMARY KEY ("revision_id")
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'plan_revisions_plan_id_fkey'
    ) THEN
        ALTER TABLE "plan_revisions"
            ADD CONSTRAINT "plan_revisions_plan_id_fkey"
            FOREIGN KEY ("plan_id") REFERENCES "plans"("plan_id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "plan_revisions_plan_id_created_at_idx"
    ON "plan_revisions"("plan_id", "created_at");

CREATE INDEX IF NOT EXISTS "plans_plan_type_is_active_sort_order_idx"
    ON "plans"("plan_type", "is_active", "sort_order");

-- ── Backfills (null/zero-guarded: admin edits are never overwritten) ──

-- Explicit tier identity for the canonical seeded rows.
UPDATE "plans" SET "tier_key" = CASE "plan_id"
    WHEN 'ph-free'       THEN 'free'
    WHEN 'ph-plus'       THEN 'plus'
    WHEN 'ph-pro'        THEN 'pro'
    WHEN 'agent-free'    THEN 'agent_free'
    WHEN 'agent-starter' THEN 'agent_starter'
    WHEN 'agent-pro'     THEN 'agent_pro'
    WHEN 'agent-agency'  THEN 'agency'
END
WHERE "tier_key" IS NULL
  AND "plan_id" IN ('ph-free','ph-plus','ph-pro','agent-free','agent-starter','agent-pro','agent-agency');

-- Grandfathered legacy "Premium" rows resolve to pro (mirrors normalizeTier —
-- treating them as free would strip a paying subscriber's access).
UPDATE "plans" SET "tier_key" = 'pro'
WHERE "tier_key" IS NULL
  AND "plan_type" <> 'agent'
  AND lower("name") LIKE '%premium%';

-- Advertised annual prices (previously ANNUAL_PRICE_BY_PLAN in lib/billing.ts).
UPDATE "plans" SET "annual_price" = 29  WHERE "plan_id" = 'ph-plus'       AND "annual_price" IS NULL;
UPDATE "plans" SET "annual_price" = 79  WHERE "plan_id" = 'ph-pro'        AND "annual_price" IS NULL;
UPDATE "plans" SET "annual_price" = 199 WHERE "plan_id" = 'agent-starter' AND "annual_price" IS NULL;
UPDATE "plans" SET "annual_price" = 499 WHERE "plan_id" = 'agent-pro'     AND "annual_price" IS NULL;
UPDATE "plans" SET "annual_price" = 999 WHERE "plan_id" = 'agent-agency'  AND "annual_price" IS NULL;

-- Trial days (previously TRIAL_DAYS_BY_PLAN in lib/billing/trial-plans.ts).
UPDATE "plans" SET "trial_days" = 14 WHERE "plan_id" = 'ph-pro' AND "trial_days" = 0;

-- Display ordering within each plan type.
UPDATE "plans" SET "sort_order" = CASE "plan_id"
    WHEN 'ph-free'       THEN 0
    WHEN 'ph-plus'       THEN 1
    WHEN 'ph-pro'        THEN 2
    WHEN 'agent-free'    THEN 0
    WHEN 'agent-starter' THEN 1
    WHEN 'agent-pro'     THEN 2
    WHEN 'agent-agency'  THEN 3
END
WHERE "sort_order" = 0
  AND "plan_id" IN ('ph-free','ph-plus','ph-pro','agent-free','agent-starter','agent-pro','agent-agency');

-- Legacy/orphan plans (old ag-* ids, ph-premium, …): keep them resolvable for
-- grandfathered subscriptions but invisible and unpurchasable.
UPDATE "plans" SET "is_public" = false, "is_active" = false
WHERE "plan_id" NOT IN ('ph-free','ph-plus','ph-pro','agent-free','agent-starter','agent-pro','agent-agency');
