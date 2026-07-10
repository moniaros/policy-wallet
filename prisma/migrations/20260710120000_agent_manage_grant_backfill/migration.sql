-- Agent-managed policies: backfill management grants for policies an agent
-- created for a customer before grants were minted at creation time.
-- Idempotent: skips policies that already carry an active grant for the
-- creating agent. Data-only; no schema changes.

INSERT INTO "access_grants" (grant_id, granter_user_id, grantee_user_id, scope, permissions, status, granted_at)
SELECT
    gen_random_uuid()::text,
    p.owner_user_id,
    p.created_by_user_id,
    'policy:' || p.policy_id,
    'manage',
    'active',
    now()
FROM "policies" p
WHERE p.created_by_user_id <> p.owner_user_id
  AND p.status <> 'deleted'
  AND EXISTS (
      SELECT 1 FROM "customer_relationships" cr
      WHERE cr.agent_user_id = p.created_by_user_id
        AND cr.policyholder_user_id = p.owner_user_id
        AND cr.status <> 'inactive'
  )
  AND NOT EXISTS (
      SELECT 1 FROM "access_grants" g
      WHERE g.grantee_user_id = p.created_by_user_id
        AND g.scope = 'policy:' || p.policy_id
        AND g.status = 'active'
  );
