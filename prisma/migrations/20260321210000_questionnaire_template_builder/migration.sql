-- Questionnaire template builder: allow agents to create custom templates

ALTER TABLE "questionnaire_templates" ADD COLUMN IF NOT EXISTS "is_system" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "questionnaire_templates" ADD COLUMN IF NOT EXISTS "created_by_user_id" TEXT;

-- Mark existing seeded templates as system templates
UPDATE "questionnaire_templates" SET "is_system" = true WHERE "created_by_user_id" IS NULL;

-- Index for agent-created templates lookup
CREATE INDEX IF NOT EXISTS "questionnaire_templates_created_by_user_id_idx" ON "questionnaire_templates"("created_by_user_id");
