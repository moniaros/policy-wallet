-- The agent and the policyholder may both upload the same policy (same owner,
-- insurer and policy number). That is allowed — but merging their two records
-- is not a decision either side gets to make alone.
CREATE TABLE "policy_merge_requests" (
    "merge_request_id" TEXT NOT NULL,
    "existing_policy_id" TEXT NOT NULL,
    "incoming_policy_id" TEXT NOT NULL,
    "requested_by_user_id" TEXT NOT NULL,
    "approver_user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_merge_requests_pkey" PRIMARY KEY ("merge_request_id")
);

CREATE UNIQUE INDEX "policy_merge_requests_existing_policy_id_incoming_policy_id_key"
    ON "policy_merge_requests"("existing_policy_id", "incoming_policy_id");
CREATE INDEX "policy_merge_requests_approver_user_id_status_idx"
    ON "policy_merge_requests"("approver_user_id", "status");

ALTER TABLE "policy_merge_requests" ADD CONSTRAINT "policy_merge_requests_existing_policy_id_fkey"
    FOREIGN KEY ("existing_policy_id") REFERENCES "policies"("policy_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "policy_merge_requests" ADD CONSTRAINT "policy_merge_requests_incoming_policy_id_fkey"
    FOREIGN KEY ("incoming_policy_id") REFERENCES "policies"("policy_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "policy_merge_requests" ADD CONSTRAINT "policy_merge_requests_requested_by_user_id_fkey"
    FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "policy_merge_requests" ADD CONSTRAINT "policy_merge_requests_approver_user_id_fkey"
    FOREIGN KEY ("approver_user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
