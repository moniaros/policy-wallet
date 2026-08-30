-- Grafí application tier (B2C rebuild, 2026-08-30): the four stores the
-- personal protection system needs — findings with a source pointer and
-- dismissal memory, household people, an append-only adviser-share audit, and
-- per-document Article 9 consent. Generated with `prisma migrate diff` against
-- the previous schema so the DDL is exactly what the Prisma client expects.
--
-- Additive only. Every table is a new store; nothing existing changes shape.
-- Idempotent on the tables/indexes (IF NOT EXISTS) so a partial apply can be
-- re-run; the FK constraints are added once by `migrate deploy`.
-- CreateTable
CREATE TABLE IF NOT EXISTS "findings" (
    "finding_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "policy_id" TEXT,
    "hash" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "object_json" JSONB NOT NULL,
    "source_json" JSONB NOT NULL,
    "sentence_json" JSONB NOT NULL,
    "why_you_json" JSONB,
    "rule_id" TEXT NOT NULL,
    "engine_version" TEXT,
    "days_until_expiry" INTEGER,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dismissed_reason" TEXT,
    "dismissed_at" TIMESTAMP(3),
    "reopened_at" TIMESTAMP(3),

    CONSTRAINT "findings_pkey" PRIMARY KEY ("finding_id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "household_people" (
    "household_person_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "date_of_birth" TIMESTAMP(3),
    "is_dependant" BOOLEAN NOT NULL DEFAULT false,
    "confirmed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "household_people_pkey" PRIMARY KEY ("household_person_id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "adviser_share_audits" (
    "share_audit_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "adviser_user_id" TEXT NOT NULL,
    "grant_id" TEXT,
    "action" TEXT NOT NULL,
    "payload_json" JSONB NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adviser_share_audits_pkey" PRIMARY KEY ("share_audit_id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "document_ai_consents" (
    "document_ai_consent_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "text_key" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "document_ai_consents_pkey" PRIMARY KEY ("document_ai_consent_id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "findings_user_id_tier_idx" ON "findings"("user_id", "tier");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "findings_policy_id_idx" ON "findings"("policy_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "findings_user_id_hash_key" ON "findings"("user_id", "hash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "household_people_user_id_idx" ON "household_people"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "adviser_share_audits_user_id_at_idx" ON "adviser_share_audits"("user_id", "at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "adviser_share_audits_adviser_user_id_idx" ON "adviser_share_audits"("adviser_user_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "document_ai_consents_document_id_key" ON "document_ai_consents"("document_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "document_ai_consents_user_id_idx" ON "document_ai_consents"("user_id");

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("policy_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_people" ADD CONSTRAINT "household_people_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adviser_share_audits" ADD CONSTRAINT "adviser_share_audits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adviser_share_audits" ADD CONSTRAINT "adviser_share_audits_adviser_user_id_fkey" FOREIGN KEY ("adviser_user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adviser_share_audits" ADD CONSTRAINT "adviser_share_audits_grant_id_fkey" FOREIGN KEY ("grant_id") REFERENCES "access_grants"("grant_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_ai_consents" ADD CONSTRAINT "document_ai_consents_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "policy_documents"("document_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_ai_consents" ADD CONSTRAINT "document_ai_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

