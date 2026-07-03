-- AlterEnum
ALTER TYPE "ConsentType" ADD VALUE 'ai_processing';

-- AlterTable
ALTER TABLE "users" ADD COLUMN "ai_processing_consent_version" TEXT;
