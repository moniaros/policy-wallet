-- Server-side document validation stamp (lib/ingestion/document-gate.ts).
--
-- Until Sept 2026 a Policy row and its document were committed — and the whole
-- PDF sent to a model provider — before anything asked whether the file was
-- an insurance document. The gate now runs BEFORE persistence and BEFORE any
-- model call, and records its verdict on the document so the analysis
-- pipeline can refuse to spend on anything it did not stamp.
--
-- Nullable by design: rows predating the gate are validated lazily by the
-- orchestrator's prepareDocument on their next run and stamped then.
--
-- The content hash is NOT added here: policy_documents.document_hash already
-- holds the SHA-256 of the bytes (lib/services/analysis/extraction-cache.ts)
-- and is indexed; the gate writes that column at ingest so the duplicate
-- lookup and the extraction cache share one key.
ALTER TABLE "policy_documents" ADD COLUMN IF NOT EXISTS "validation_status" TEXT;
ALTER TABLE "policy_documents" ADD COLUMN IF NOT EXISTS "validation_json"   JSONB;
ALTER TABLE "policy_documents" ADD COLUMN IF NOT EXISTS "validated_at"      TIMESTAMP(3);
