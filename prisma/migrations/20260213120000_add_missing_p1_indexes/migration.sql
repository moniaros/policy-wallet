-- Add missing high-priority indexes for API query paths
CREATE INDEX IF NOT EXISTS "opportunities_owner_agent_user_id_idx"
ON "opportunities" ("owner_agent_user_id");

CREATE INDEX IF NOT EXISTS "notification_events_event_type_idx"
ON "notification_events" ("event_type");
