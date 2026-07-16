-- B2B scale hardening, round 2: composite indexes for the agent aggregate
-- pages (dashboard / insights / commissions / portal) whose hot filters weren't
-- fully covered by the round-1 pass.
--
-- IF NOT EXISTS keeps this idempotent. NOTE for production at scale: build
-- these CONCURRENTLY (outside a transaction) on large tables to avoid locking
-- writes while the index builds — see the prod apply runbook.

-- Agent renewal metrics run several (agent_user_id, status) filters per page load.
CREATE INDEX IF NOT EXISTS "policy_renewals_agent_user_id_status_idx"
    ON "policy_renewals"("agent_user_id", "status");

-- Agent gap views filter by a policy set + status (dashboard, insights, portal).
CREATE INDEX IF NOT EXISTS "gap_instances_policy_id_status_idx"
    ON "gap_instances"("policy_id", "status");
