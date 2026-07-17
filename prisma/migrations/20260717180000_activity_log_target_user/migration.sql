-- AlterTable
ALTER TABLE "activity_logs" ADD COLUMN     "target_user_id" TEXT;

-- CreateIndex
CREATE INDEX "activity_logs_target_user_id_timestamp_idx" ON "activity_logs"("target_user_id", "timestamp");
