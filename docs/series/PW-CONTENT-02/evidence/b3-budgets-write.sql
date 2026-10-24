-- B3 forward: round-7 budgets, owner decision 2026-10-24
-- One statement = one transaction. Touches ONLY entitlements.monthlyTokenBudget on the listed rows, guarded by the
-- value read on 2026-10-24 (a row that no longer holds that value is skipped and shows in the final count).
-- Reproduces /admin/plans updatePlan (app/(protected)/admin/plans/actions.ts): plans.version+1, plans.updated_at,
-- one plan_revisions row per plan (snapshot + {"entitlements.monthlyTokenBudget":{from,to}}), one activity_logs
-- UPDATE_PLAN row per plan. Cache: none to invalidate for the token gate (it reads plans directly); the public
-- pricing catalog cache (tag plan-catalog) shows no budget and refreshes within 300 s.
WITH targets(plan_id, expected_old, new_budget) AS (VALUES
    ('ph-pro', 1500000, 8700000),
    ('agent-free', 150000, 2000000),
    ('agent-starter', 1600000, 19600000),
    ('agent-pro', 4500000, 58700000),
    ('agent-agency', 12000000, 156300000)
),
upd AS (
    UPDATE plans p
       SET entitlements = jsonb_set(p.entitlements, '{monthlyTokenBudget}', to_jsonb(t.new_budget), false),
           version      = p.version + 1,
           updated_at   = (now() AT TIME ZONE 'UTC')
      FROM targets t
     WHERE p.plan_id = t.plan_id
       AND (p.entitlements->>'monthlyTokenBudget')::bigint = t.expected_old
    RETURNING p.*, t.expected_old, t.new_budget
),
rev AS (
    INSERT INTO plan_revisions (revision_id, plan_id, version, snapshot, changes, changed_by, changed_by_email, created_at)
    SELECT gen_random_uuid()::text, u.plan_id, u.version, to_jsonb(u) - 'expected_old' - 'new_budget',
           jsonb_build_object('entitlements.monthlyTokenBudget', jsonb_build_object('from', u.expected_old, 'to', u.new_budget)),
           'session-maintenance', 'claude-code-session', (now() AT TIME ZONE 'UTC')
      FROM upd u
    RETURNING plan_id
),
audit AS (
    INSERT INTO activity_logs (log_id, admin_user_id, admin_email, action_type, description, metadata, target_user_id, "timestamp")
    SELECT gen_random_uuid()::text, 'session-maintenance', 'claude-code-session', 'UPDATE_PLAN',
           'Updated plan ' || u.plan_id || ' (v' || u.version || '): entitlements.monthlyTokenBudget',
           jsonb_build_object('planId', u.plan_id, 'version', u.version,
                              'changes', jsonb_build_object('entitlements.monthlyTokenBudget', jsonb_build_object('from', u.expected_old, 'to', u.new_budget)),
                              '_audit', jsonb_build_object('requestorId', 'session-maintenance', 'ip', 'supabase-mcp', 'at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))),
           NULL, (now() AT TIME ZONE 'UTC')
      FROM upd u
    RETURNING 1
)
SELECT (SELECT count(*) FROM upd) AS plans_updated, (SELECT count(*) FROM rev) AS revisions_written, (SELECT count(*) FROM audit) AS audit_rows_written;
