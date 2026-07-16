-- B2B scale hardening: index the agent-side hot paths. The B2C index pass
-- (20260715120000) covered the policyholder side; the agent dashboard,
-- customer list, priorities queue and opportunity scoring all filter/sort on
-- columns that had only single-column or agent-equality-only coverage, so each
-- agent page load scan-and-filtered tables that grow with the agent's book.
--
-- IF NOT EXISTS keeps this idempotent. NOTE for production at scale: build
-- these CONCURRENTLY (outside a transaction) on large tables to avoid locking
-- writes while the index builds — see the prod apply runbook.

-- Agent customer list orders by last_interaction_at within an agent; the unique
-- index (agent_user_id, policyholder_user_id) can't serve the sort.
CREATE INDEX IF NOT EXISTS "customer_relationships_agent_user_id_last_interaction_at_idx"
    ON "customer_relationships"("agent_user_id", "last_interaction_at");

-- Dashboard summary groupBy and follow-up queries filter by (agent, status).
CREATE INDEX IF NOT EXISTS "customer_relationships_agent_user_id_status_idx"
    ON "customer_relationships"("agent_user_id", "status");

-- "My invites" lists and the profile timeline filter by inviter (+ email).
-- Previously only the unique token column was indexed.
CREATE INDEX IF NOT EXISTS "invites_inviter_user_id_invitee_email_idx"
    ON "invites"("inviter_user_id", "invitee_email");

-- Opportunity dashboard/priorities/scoring filter by (owner, status).
CREATE INDEX IF NOT EXISTS "opportunities_owner_agent_user_id_status_idx"
    ON "opportunities"("owner_agent_user_id", "status");
