-- Policy analysis orchestration telemetry (run + step)

CREATE TYPE "AnalysisRunStatus" AS ENUM ('queued', 'running', 'completed', 'failed', 'blocked');
CREATE TYPE "AnalysisStepStatus" AS ENUM ('pending', 'running', 'completed', 'failed', 'retrying', 'skipped');

CREATE TABLE "policy_analysis_runs" (
    "analysis_run_id" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" "AnalysisRunStatus" NOT NULL DEFAULT 'queued',
    "run_attempt" INTEGER NOT NULL DEFAULT 1,
    "overall_success_pct" INTEGER,
    "estimated_tokens" INTEGER,
    "actual_input_tokens" INTEGER,
    "actual_output_tokens" INTEGER,
    "actual_total_tokens" INTEGER,
    "blocked_reason" TEXT,
    "failure_code" TEXT,
    "failure_message" TEXT,
    "result_json" JSONB,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "policy_analysis_runs_pkey" PRIMARY KEY ("analysis_run_id")
);

CREATE TABLE "policy_analysis_steps" (
    "analysis_step_id" TEXT NOT NULL,
    "analysis_run_id" TEXT NOT NULL,
    "step_key" TEXT NOT NULL,
    "step_order" INTEGER NOT NULL,
    "status" "AnalysisStepStatus" NOT NULL DEFAULT 'pending',
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "success_pct" INTEGER,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "total_tokens" INTEGER,
    "log_message" TEXT,
    "log_json" JSONB,
    "error_code" TEXT,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_analysis_steps_pkey" PRIMARY KEY ("analysis_step_id")
);

CREATE INDEX "policy_analysis_runs_policy_id_created_at_idx"
ON "policy_analysis_runs"("policy_id", "created_at");

CREATE INDEX "policy_analysis_runs_user_id_created_at_idx"
ON "policy_analysis_runs"("user_id", "created_at");

CREATE INDEX "policy_analysis_steps_analysis_run_id_step_order_attempt_idx"
ON "policy_analysis_steps"("analysis_run_id", "step_order", "attempt");

ALTER TABLE "policy_analysis_runs"
ADD CONSTRAINT "policy_analysis_runs_policy_id_fkey"
FOREIGN KEY ("policy_id") REFERENCES "policies"("policy_id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "policy_analysis_runs"
ADD CONSTRAINT "policy_analysis_runs_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("user_id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "policy_analysis_steps"
ADD CONSTRAINT "policy_analysis_steps_analysis_run_id_fkey"
FOREIGN KEY ("analysis_run_id") REFERENCES "policy_analysis_runs"("analysis_run_id")
ON DELETE CASCADE ON UPDATE CASCADE;

