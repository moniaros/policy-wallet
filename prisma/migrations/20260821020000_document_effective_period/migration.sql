-- A renewal's coverage window, on the document that states it.
--
-- The chain was previously ordered by `uploaded_at` — i.e. by when someone got
-- round to uploading — which is wrong precisely when a customer back-fills an
-- older renewal after a newer one.
--
-- Nullable by design: rows predating this column have no period, and neither do
-- documents that state none (a terms booklet, an invoice).
ALTER TABLE "policy_documents" ADD COLUMN IF NOT EXISTS "effective_from" TIMESTAMP(3);
ALTER TABLE "policy_documents" ADD COLUMN IF NOT EXISTS "effective_to" TIMESTAMP(3);

-- Ordering a policy's chain is the hot path for the merged view and the
-- differential; both walk one policy's documents newest-effective first.
CREATE INDEX IF NOT EXISTS "policy_documents_policy_id_effective_from_idx"
    ON "policy_documents" ("policy_id", "effective_from" DESC);
