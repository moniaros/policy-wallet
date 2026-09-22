ALTER TABLE "agent_review_revisions" ADD COLUMN "private_advice" JSONB, ADD COLUMN "reuse_approved" BOOLEAN NOT NULL DEFAULT false;
