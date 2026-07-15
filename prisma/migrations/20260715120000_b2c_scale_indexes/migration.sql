-- B2C scale hardening: index the hot-path columns that every policyholder page
-- filters/sorts on. Without these, each authenticated page load ran sequential
-- scans of tables that grow per-user (subscriptions, customer_relationships,
-- credit_transactions, notification_events) or globally (activity_logs,
-- gap_definitions, gap_instances) — fine pre-GA, a full-table scan per request
-- at millions of users.
--
-- IF NOT EXISTS keeps this idempotent. NOTE for production at scale: build
-- these CONCURRENTLY (outside a transaction) on large tables to avoid locking
-- writes while the index builds — see the prod apply runbook.

-- Usage metering: count(admin_user_id, action_type, time window) on AI hot paths.
CREATE INDEX IF NOT EXISTS "activity_logs_admin_user_id_action_type_timestamp_idx"
    ON "activity_logs"("admin_user_id", "action_type", "timestamp");

-- Every B2C page resolves the agent relationship by policyholder; the existing
-- unique index leads with agent_user_id and cannot serve this.
CREATE INDEX IF NOT EXISTS "customer_relationships_policyholder_user_id_status_idx"
    ON "customer_relationships"("policyholder_user_id", "status");

-- resolveUserEntitlements: findFirst(user_id, status) order by created_at.
CREATE INDEX IF NOT EXISTS "subscriptions_user_id_status_idx"
    ON "subscriptions"("user_id", "status");

-- Credit balance: findFirst(user_id) order by created_at desc.
CREATE INDEX IF NOT EXISTS "credit_transactions_user_id_created_at_idx"
    ON "credit_transactions"("user_id", "created_at");

-- Notifications list: findMany(user_id) order by created_at desc.
CREATE INDEX IF NOT EXISTS "notification_events_user_id_created_at_idx"
    ON "notification_events"("user_id", "created_at");

-- Gap detection loads active definitions per line of business.
CREATE INDEX IF NOT EXISTS "gap_definitions_line_of_business_is_active_idx"
    ON "gap_definitions"("line_of_business", "is_active");

-- Profile-level gaps and the engine's OR query filter by (user_id, status).
CREATE INDEX IF NOT EXISTS "gap_instances_user_id_status_idx"
    ON "gap_instances"("user_id", "status");
