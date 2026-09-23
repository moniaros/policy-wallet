-- Spec v2 §9: the health check-up / preventive tracker and the optional
-- self-assessment. Both are the person's own Art. 9 data: consent-based,
-- deleted on erasure, returned on export, read by no admin surface.
CREATE TABLE "health_benefit_usages" (
  "health_benefit_usage_id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE,
  "policy_key" TEXT NOT NULL DEFAULT '',
  "benefit" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'available' CHECK ("status" IN ('available', 'scheduled', 'completed', 'archived')),
  "note" TEXT,
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "health_benefit_usages_user_id_policy_key_benefit_year_key" ON "health_benefit_usages"("user_id", "policy_key", "benefit", "year");
CREATE INDEX "health_benefit_usages_user_id_year_idx" ON "health_benefit_usages"("user_id", "year");
ALTER TABLE "health_benefit_usages" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "health_risk_assessments" (
  "health_risk_assessment_id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE,
  "consent_version" TEXT NOT NULL,
  "answers" JSONB NOT NULL,
  "scores" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "health_risk_assessments_user_id_created_at_idx" ON "health_risk_assessments"("user_id", "created_at");
ALTER TABLE "health_risk_assessments" ENABLE ROW LEVEL SECURITY;
