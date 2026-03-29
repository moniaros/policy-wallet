-- Agent branding fields and collaboration enhancements

-- AlterTable
ALTER TABLE "agent_profiles" ADD COLUMN     "brandColor" TEXT DEFAULT '#10b981',
ADD COLUMN     "documents" JSONB,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "website" TEXT;

-- AlterTable
ALTER TABLE "collaboration_messages" ADD COLUMN     "is_private" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "collaboration_threads" ADD COLUMN     "thread_type" TEXT NOT NULL DEFAULT 'message';

-- AlterTable
ALTER TABLE "notification_events" ADD COLUMN     "read_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'stripe';

-- CreateTable
CREATE TABLE "user_tasks" (
    "task_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "creator_user_id" TEXT,
    "type" TEXT NOT NULL DEFAULT 'general',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "due_date" TIMESTAMP(3),
    "action_url" TEXT,
    "action_label" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "user_tasks_pkey" PRIMARY KEY ("task_id")
);

-- CreateIndex
CREATE INDEX "user_tasks_user_id_idx" ON "user_tasks"("user_id");

-- CreateIndex
CREATE INDEX "user_tasks_status_idx" ON "user_tasks"("status");

-- AddForeignKey
ALTER TABLE "user_tasks" ADD CONSTRAINT "user_tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tasks" ADD CONSTRAINT "user_tasks_creator_user_id_fkey" FOREIGN KEY ("creator_user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
