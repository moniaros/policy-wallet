-- AlterTable
ALTER TABLE "users" ADD COLUMN "trial_analysis_used_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "invites" ADD COLUMN "relationship_type" TEXT;
