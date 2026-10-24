-- B3 snapshot correction (owner decision 2026-10-24): plan_revisions is APPEND-ONLY, so the five revisions written by
-- b3-budgets-write.sql (database-column-name snapshot) are NOT rewritten. This adds ONE new revision per plan whose
-- snapshot has updatePlan's shape: Prisma field names, Decimal as string (decimal.js toJSON), dates as ISO-8601 with Z
-- (actions.ts:70 JSON.parse(JSON.stringify(updated))). Same version as the plan row (2): it restates the state of that
-- version in the canonical shape; created_at is later, so it is the latest revision of the plan.
-- `changes` uses the {from,to} entry shape the admin history renders (app/(protected)/admin/plans/[planId]/page.tsx:200).
-- Ids are fixed so the rollback is exact. Writes nothing else.
WITH src AS (
    SELECT * FROM plans WHERE plan_id IN ('ph-pro','agent-free','agent-starter','agent-pro','agent-agency') AND version = 2
)
INSERT INTO plan_revisions (revision_id, plan_id, version, snapshot, changes, changed_by, changed_by_email, created_at)
SELECT 'snapshot-shape-correction-' || s.plan_id || '-v' || s.version, s.plan_id, s.version,
       jsonb_build_object(
         'id', s.plan_id, 'planType', s.plan_type, 'name', s.name, 'displayName', s.display_name,
         'price', trim_scale(s.price)::text, 'currency', s.currency, 'billingPeriod', s.billing_period,
         'entitlements', s.entitlements, 'stripePriceId', s.stripe_price_id, 'tierKey', s.tier_key,
         'annualPrice', CASE WHEN s.annual_price IS NULL THEN NULL ELSE trim_scale(s.annual_price)::text END,
         'trialDays', s.trial_days, 'isActive', s.is_active, 'isPublic', s.is_public, 'sortOrder', s.sort_order,
         'version', s.version,
         'updatedAt', to_char(s.updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
         'createdAt', to_char(s.created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
       jsonb_build_object('snapshot.shape', jsonb_build_object('from', 'database column names', 'to', 'Prisma field names (updatePlan shape)')),
       'session-maintenance', 'claude-code-session', (now() AT TIME ZONE 'UTC')
  FROM src s
RETURNING revision_id, plan_id, version;
