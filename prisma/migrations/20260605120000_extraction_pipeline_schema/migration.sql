-- Document Ingestion → Extraction Pipeline (Phase 0)
-- Adds the cost-optimized pipeline schema, reconciled with existing tables:
--   * policy_documents: triage + coverage-table-location columns (non-breaking; existing
--     extraction_cache JSON retained, retired in Phase 5).
--   * document_extractions: permanent, content-hash-keyed structured cache (promoted from
--     the deprecated 24h-TTL JSON). Linked to policy_documents by VALUE (content_hash ==
--     document_hash), not a FK, so the hash can be recorded at upload before extraction exists.
--   * coverage_taxonomy / insurer_templates / coverage_envelopes: reference data for
--     normalization, per-insurer templates, and the deterministic Gap Engine benchmark.
-- No existing tables are dropped or altered destructively.

-- AlterTable
ALTER TABLE "policy_documents" ADD COLUMN     "coverage_table_pages" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "document_source" TEXT,
ADD COLUMN     "page_count" INTEGER;

-- CreateTable
CREATE TABLE "document_extractions" (
    "extraction_id" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "path_taken" TEXT NOT NULL,
    "insurer_name" TEXT NOT NULL,
    "policy_number" TEXT,
    "premium_amount" DECIMAL(12,2),
    "premium_currency" TEXT NOT NULL DEFAULT 'EUR',
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "structured" JSONB NOT NULL,
    "overall_confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "requires_review" BOOLEAN NOT NULL DEFAULT false,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "total_tokens" INTEGER NOT NULL DEFAULT 0,
    "cost_eur" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "model" TEXT,
    "insurer_template_id" TEXT,
    "extracted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_extractions_pkey" PRIMARY KEY ("extraction_id")
);

-- CreateTable
CREATE TABLE "coverage_taxonomy" (
    "taxonomy_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "line_of_business" TEXT NOT NULL,
    "name_el" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "description_el" TEXT,
    "description_en" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'amount',
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coverage_taxonomy_pkey" PRIMARY KEY ("taxonomy_id")
);

-- CreateTable
CREATE TABLE "insurer_templates" (
    "insurer_template_id" TEXT NOT NULL,
    "insurer_id" TEXT,
    "canonical_name" TEXT NOT NULL,
    "line_of_business" TEXT,
    "name_aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "field_patterns" JSONB,
    "coverage_table_hints" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insurer_templates_pkey" PRIMARY KEY ("insurer_template_id")
);

-- CreateTable
CREATE TABLE "coverage_envelopes" (
    "envelope_id" TEXT NOT NULL,
    "line_of_business" TEXT NOT NULL,
    "profile_segment" TEXT NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "expectations" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coverage_envelopes_pkey" PRIMARY KEY ("envelope_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_extractions_content_hash_key" ON "document_extractions"("content_hash");

-- CreateIndex
CREATE INDEX "document_extractions_path_taken_idx" ON "document_extractions"("path_taken");

-- CreateIndex
CREATE INDEX "document_extractions_insurer_name_idx" ON "document_extractions"("insurer_name");

-- CreateIndex
CREATE INDEX "document_extractions_extracted_at_idx" ON "document_extractions"("extracted_at");

-- CreateIndex
CREATE UNIQUE INDEX "coverage_taxonomy_key_key" ON "coverage_taxonomy"("key");

-- CreateIndex
CREATE INDEX "coverage_taxonomy_line_of_business_is_active_idx" ON "coverage_taxonomy"("line_of_business", "is_active");

-- CreateIndex
CREATE INDEX "insurer_templates_insurer_id_is_active_idx" ON "insurer_templates"("insurer_id", "is_active");

-- CreateIndex
CREATE INDEX "insurer_templates_canonical_name_idx" ON "insurer_templates"("canonical_name");

-- CreateIndex
CREATE INDEX "coverage_envelopes_line_of_business_is_active_idx" ON "coverage_envelopes"("line_of_business", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "coverage_envelopes_line_of_business_profile_segment_version_key" ON "coverage_envelopes"("line_of_business", "profile_segment", "version");

-- AddForeignKey
ALTER TABLE "document_extractions" ADD CONSTRAINT "document_extractions_insurer_template_id_fkey" FOREIGN KEY ("insurer_template_id") REFERENCES "insurer_templates"("insurer_template_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurer_templates" ADD CONSTRAINT "insurer_templates_insurer_id_fkey" FOREIGN KEY ("insurer_id") REFERENCES "insurers"("insurer_id") ON DELETE SET NULL ON UPDATE CASCADE;
