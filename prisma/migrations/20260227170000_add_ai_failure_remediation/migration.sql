-- AI analysis failure remediation metadata and status support

ALTER TYPE "AnalysisRunStatus"
ADD VALUE IF NOT EXISTS 'completed_with_warnings';

ALTER TABLE "policy_analysis_runs"
ADD COLUMN IF NOT EXISTS "remediation_summary" JSONB;

ALTER TABLE "policy_analysis_steps"
ADD COLUMN IF NOT EXISTS "provider" TEXT,
ADD COLUMN IF NOT EXISTS "remediation_type" TEXT;
