-- Give a stored document an authoritative locator, instead of parsing one back
-- out of a URL.
--
-- Today the only pointer to the bytes is `file_url`, a public-STYLE URL
-- (getPublicUrl) into a bucket that is actually PRIVATE. Nothing can fetch it
-- directly; every read re-derives bucket + object path with a regex over the
-- URL (lib/supabase/storage-download.ts `resolveSupabaseStorageObject`) and then
-- signs it. That works, and it is brittle in a specific way: the day the
-- Supabase project host changes, or a row is written with a `/sign/` or
-- `/authenticated/` variant, or an object key ever contains a slash, the regex
-- is the single point of failure between a customer and their insurance
-- contract — with nothing else on the row to recover from.
--
-- `storage_bucket` + `storage_key` are that something else. Readers prefer them
-- and fall back to the URL parse, so legacy rows keep working unchanged.
--
-- Everything here is additive and nullable (or defaulted), so the currently
-- deployed code — which selects none of these columns — is unaffected.

ALTER TABLE "policy_documents"
    ADD COLUMN "storage_bucket"   TEXT,
    ADD COLUMN "storage_key"      TEXT,
    ADD COLUMN "storage_provider" TEXT DEFAULT 'supabase',
    ADD COLUMN "mime_type"        TEXT,
    ADD COLUMN "document_kind"    TEXT,
    ADD COLUMN "version"          INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN "superseded_by_id" TEXT;

-- Self-referencing version chain. SET NULL rather than CASCADE: deleting a
-- superseding document must not delete the history it superseded.
ALTER TABLE "policy_documents"
    ADD CONSTRAINT "policy_documents_superseded_by_id_fkey"
    FOREIGN KEY ("superseded_by_id") REFERENCES "policy_documents"("document_id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "policy_documents_superseded_by_id_key"
    ON "policy_documents"("superseded_by_id");

CREATE INDEX "policy_documents_storage_bucket_storage_key_idx"
    ON "policy_documents"("storage_bucket", "storage_key");

-- ── Backfill ───────────────────────────────────────────────────────────────
--
-- Derives bucket and key from the existing URL using the same shape the
-- application regex matches:
--   https://<host>/storage/v1/object/[public|sign|authenticated]/<bucket>/<key>
--
-- Rows whose URL does not match are left NULL on purpose. They then take the
-- existing URL-parsing path exactly as before — a partial backfill degrades to
-- current behaviour rather than to a broken link. Local-dev rows (app-relative
-- paths like /uploads/policies/x.pdf) are among those, and are meant to be.
UPDATE "policy_documents"
SET
    "storage_bucket" = substring("file_url" from '/storage/v1/object/(?:public/|sign/|authenticated/)?([^/?]+)/'),
    "storage_key"    = substring("file_url" from '/storage/v1/object/(?:public/|sign/|authenticated/)?[^/?]+/([^?]+)')
WHERE "file_url" LIKE 'http%'
  AND "file_url" LIKE '%/storage/v1/object/%'
  AND "storage_key" IS NULL;

-- MIME type from the stored object's extension. The upload path records the
-- CONTENT-verified type going forward; for existing rows the extension is the
-- best evidence available, and it is only ever used to choose a preview mode.
UPDATE "policy_documents"
SET "mime_type" = CASE lower(substring("storage_key" from '\.([a-z0-9]+)$'))
        WHEN 'pdf'  THEN 'application/pdf'
        WHEN 'jpg'  THEN 'image/jpeg'
        WHEN 'jpeg' THEN 'image/jpeg'
        WHEN 'png'  THEN 'image/png'
        WHEN 'webp' THEN 'image/webp'
        WHEN 'heic' THEN 'image/heic'
        ELSE NULL
    END
WHERE "storage_key" IS NOT NULL
  AND "mime_type" IS NULL;

-- Provider is only meaningful where we actually resolved a bucket.
UPDATE "policy_documents"
SET "storage_provider" = NULL
WHERE "storage_bucket" IS NULL;
