-- Add run execution lease fields for analysis idempotency and heartbeat

ALTER TABLE "policy_analysis_runs"
ADD COLUMN IF NOT EXISTS "execution_lease_id" TEXT,
ADD COLUMN IF NOT EXISTS "execution_lease_expires_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "lease_heartbeat_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "policy_analysis_runs_status_execution_lease_expires_at_idx"
ON "policy_analysis_runs"("status", "execution_lease_expires_at");
