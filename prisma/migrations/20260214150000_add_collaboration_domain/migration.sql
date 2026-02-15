-- Collaboration domain for policyholder-agent shared timeline

CREATE TABLE "collaboration_threads" (
    "thread_id" TEXT NOT NULL,
    "relationship_id" TEXT NOT NULL,
    "policy_id" TEXT,
    "subject" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "created_by_user_id" TEXT NOT NULL,
    "assigned_to_user_id" TEXT,
    "linked_opportunity_id" TEXT,
    "linked_questionnaire_instance_id" TEXT,
    "linked_gap_instance_id" TEXT,
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collaboration_threads_pkey" PRIMARY KEY ("thread_id")
);

CREATE TABLE "collaboration_messages" (
    "message_id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "sender_user_id" TEXT NOT NULL,
    "message_type" TEXT NOT NULL DEFAULT 'comment',
    "body" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collaboration_messages_pkey" PRIMARY KEY ("message_id")
);

CREATE TABLE "collaboration_actions" (
    "action_id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignee_user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "due_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collaboration_actions_pkey" PRIMARY KEY ("action_id")
);

CREATE TABLE "collaboration_participants" (
    "participant_id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'participant',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collaboration_participants_pkey" PRIMARY KEY ("participant_id")
);

CREATE UNIQUE INDEX "collaboration_participants_thread_id_user_id_key" ON "collaboration_participants"("thread_id", "user_id");
CREATE INDEX "collaboration_threads_relationship_id_idx" ON "collaboration_threads"("relationship_id");
CREATE INDEX "collaboration_threads_policy_id_idx" ON "collaboration_threads"("policy_id");
CREATE INDEX "collaboration_threads_status_idx" ON "collaboration_threads"("status");
CREATE INDEX "collaboration_threads_last_activity_at_idx" ON "collaboration_threads"("last_activity_at");
CREATE INDEX "collaboration_messages_thread_id_created_at_idx" ON "collaboration_messages"("thread_id", "created_at");
CREATE INDEX "collaboration_actions_assignee_user_id_status_due_date_idx" ON "collaboration_actions"("assignee_user_id", "status", "due_date");
CREATE INDEX "collaboration_participants_user_id_idx" ON "collaboration_participants"("user_id");

ALTER TABLE "collaboration_threads" ADD CONSTRAINT "collaboration_threads_relationship_id_fkey"
FOREIGN KEY ("relationship_id") REFERENCES "customer_relationships"("relationship_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "collaboration_threads" ADD CONSTRAINT "collaboration_threads_policy_id_fkey"
FOREIGN KEY ("policy_id") REFERENCES "policies"("policy_id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "collaboration_threads" ADD CONSTRAINT "collaboration_threads_created_by_user_id_fkey"
FOREIGN KEY ("created_by_user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "collaboration_threads" ADD CONSTRAINT "collaboration_threads_assigned_to_user_id_fkey"
FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "collaboration_threads" ADD CONSTRAINT "collaboration_threads_linked_opportunity_id_fkey"
FOREIGN KEY ("linked_opportunity_id") REFERENCES "opportunities"("opportunity_id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "collaboration_threads" ADD CONSTRAINT "collaboration_threads_linked_questionnaire_instance_id_fkey"
FOREIGN KEY ("linked_questionnaire_instance_id") REFERENCES "questionnaire_instances"("instance_id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "collaboration_threads" ADD CONSTRAINT "collaboration_threads_linked_gap_instance_id_fkey"
FOREIGN KEY ("linked_gap_instance_id") REFERENCES "gap_instances"("gap_instance_id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "collaboration_messages" ADD CONSTRAINT "collaboration_messages_thread_id_fkey"
FOREIGN KEY ("thread_id") REFERENCES "collaboration_threads"("thread_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "collaboration_messages" ADD CONSTRAINT "collaboration_messages_sender_user_id_fkey"
FOREIGN KEY ("sender_user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "collaboration_actions" ADD CONSTRAINT "collaboration_actions_thread_id_fkey"
FOREIGN KEY ("thread_id") REFERENCES "collaboration_threads"("thread_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "collaboration_actions" ADD CONSTRAINT "collaboration_actions_assignee_user_id_fkey"
FOREIGN KEY ("assignee_user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "collaboration_participants" ADD CONSTRAINT "collaboration_participants_thread_id_fkey"
FOREIGN KEY ("thread_id") REFERENCES "collaboration_threads"("thread_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "collaboration_participants" ADD CONSTRAINT "collaboration_participants_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
