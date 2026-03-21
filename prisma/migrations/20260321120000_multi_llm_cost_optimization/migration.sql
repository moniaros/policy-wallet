-- Multi-LLM Cost Optimization & Monetization
-- Covers: extraction cache, translation cache, priority queue, schema enrichments

-- 1. PolicyDocument: extraction cache fields
ALTER TABLE "policy_documents" ADD COLUMN IF NOT EXISTS "document_hash" TEXT;
ALTER TABLE "policy_documents" ADD COLUMN IF NOT EXISTS "extraction_cache" JSONB;
ALTER TABLE "policy_documents" ADD COLUMN IF NOT EXISTS "extracted_at" TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS "policy_documents_document_hash_idx"
    ON "policy_documents" ("document_hash");

-- 2. TranslationCache: batch translation cache (Greek → English)
CREATE TABLE IF NOT EXISTS "translation_cache" (
    "id" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "source_lang" TEXT NOT NULL DEFAULT 'el',
    "target_lang" TEXT NOT NULL DEFAULT 'en',
    "source_text" TEXT NOT NULL,
    "translated_text" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "translation_cache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "translation_cache_content_hash_key"
    ON "translation_cache" ("content_hash");

-- 3. PolicyAnalysisRun: priority queue for tier-based ordering
ALTER TABLE "policy_analysis_runs" ADD COLUMN IF NOT EXISTS "priority" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "policy_analysis_runs_status_priority_created_at_idx"
    ON "policy_analysis_runs" ("status", "priority", "created_at");
