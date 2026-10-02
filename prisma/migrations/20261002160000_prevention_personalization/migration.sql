-- AlterTable
ALTER TABLE "prevention_progress" ADD COLUMN     "knows_procedure" BOOLEAN,
ADD COLUMN     "period_key" TEXT,
ADD COLUMN     "planned_for" DATE;

-- CreateTable
CREATE TABLE "prevention_benefit_uses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "item_key" TEXT NOT NULL,
    "period_key" TEXT NOT NULL,
    "source_version" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "used_on" DATE,
    "consent_version" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prevention_benefit_uses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prevention_benefit_uses_policy_id_idx" ON "prevention_benefit_uses"("policy_id");

-- CreateIndex
CREATE UNIQUE INDEX "prevention_benefit_uses_user_id_item_key_period_key_key" ON "prevention_benefit_uses"("user_id", "item_key", "period_key");

-- AddForeignKey
ALTER TABLE "prevention_benefit_uses" ADD CONSTRAINT "prevention_benefit_uses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prevention_benefit_uses" ADD CONSTRAINT "prevention_benefit_uses_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("policy_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Private self-reported use; application actions enforce authenticated owner access.
ALTER TABLE "prevention_benefit_uses" ENABLE ROW LEVEL SECURITY;
