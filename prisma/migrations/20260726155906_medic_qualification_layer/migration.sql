-- CreateEnum
CREATE TYPE "gap_validation_state" AS ENUM ('probable', 'confirmed', 'validated');

-- AlterTable
ALTER TABLE "gap_instances" ADD COLUMN     "validation_state" "gap_validation_state" NOT NULL DEFAULT 'probable';

-- AlterTable
ALTER TABLE "opportunities" ADD COLUMN     "medic" JSONB,
ADD COLUMN     "medic_score" INTEGER,
ADD COLUMN     "medic_updated_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "opportunities_owner_agent_user_id_medic_score_idx" ON "opportunities"("owner_agent_user_id", "medic_score");

