-- AlterTable
ALTER TABLE "gap_instances" ADD COLUMN     "ai_explanation_el" TEXT,
ADD COLUMN     "ai_suggestion_el" TEXT;

-- AlterTable
ALTER TABLE "policies" ADD COLUMN     "acord_data" JSONB,
ADD COLUMN     "last_analyzed_at" TIMESTAMP(3);
