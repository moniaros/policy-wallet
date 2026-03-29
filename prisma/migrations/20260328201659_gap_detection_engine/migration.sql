-- Gap Detection Engine migration
-- Scoped to: risk profile fields, gap engine tables, gap_instances changes

-- AlterTable: enhance policyholder profile with risk fields
ALTER TABLE "policyholder_profiles" ADD COLUMN     "annual_income" DECIMAL(65,30),
ADD COLUMN     "date_of_birth" TIMESTAMP(3),
ADD COLUMN     "dependents_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "employment_status" TEXT,
ADD COLUMN     "has_loans" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "has_pets" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "life_events" JSONB,
ADD COLUMN     "loan_amount" DECIMAL(65,30),
ADD COLUMN     "marital_status" TEXT,
ADD COLUMN     "mortgage_amount" DECIMAL(65,30),
ADD COLUMN     "occupation" TEXT,
ADD COLUMN     "owns_home" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "risk_tolerance" TEXT,
ADD COLUMN     "smoking_status" TEXT,
ADD COLUMN     "travels_frequently" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "vehicles_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: gap_instances support profile-level gaps (no policy required)
ALTER TABLE "gap_instances" ADD COLUMN     "user_id" TEXT,
ALTER COLUMN "policy_id" DROP NOT NULL;

-- AlterTable: gap_definitions scope
ALTER TABLE "gap_definitions" ADD COLUMN     "scope" TEXT NOT NULL DEFAULT 'document';

-- CreateTable: protection_scores
CREATE TABLE "protection_scores" (
    "protection_score_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "overall_score" INTEGER NOT NULL,
    "category_scores" JSONB NOT NULL,
    "gap_count" INTEGER NOT NULL,
    "expected_lines" JSONB NOT NULL,
    "actual_lines" JSONB NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "protection_scores_pkey" PRIMARY KEY ("protection_score_id")
);

-- CreateTable: recommendation_instances
CREATE TABLE "recommendation_instances" (
    "recommendation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "gap_instance_id" TEXT,
    "line_of_business" TEXT NOT NULL,
    "rule_id" TEXT,
    "title" JSONB NOT NULL,
    "description" JSONB NOT NULL,
    "urgency" TEXT NOT NULL,
    "estimated_cost_eur" DECIMAL(10,2),
    "personal_reason" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "dismiss_reason" TEXT,
    "actioned_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recommendation_instances_pkey" PRIMARY KEY ("recommendation_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "protection_scores_user_id_key" ON "protection_scores"("user_id");

-- CreateIndex
CREATE INDEX "recommendation_instances_user_id_status_idx" ON "recommendation_instances"("user_id", "status");

-- CreateIndex
CREATE INDEX "recommendation_instances_urgency_idx" ON "recommendation_instances"("urgency");

-- AddForeignKey
ALTER TABLE "gap_instances" ADD CONSTRAINT "gap_instances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protection_scores" ADD CONSTRAINT "protection_scores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_instances" ADD CONSTRAINT "recommendation_instances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_instances" ADD CONSTRAINT "recommendation_instances_gap_instance_id_fkey" FOREIGN KEY ("gap_instance_id") REFERENCES "gap_instances"("gap_instance_id") ON DELETE SET NULL ON UPDATE CASCADE;
