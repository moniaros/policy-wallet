-- ─────────────────────────────────────────────────────────────────────────
-- Storage bucket + RLS policy for the `policies` bucket.
--
-- WHY THIS FILE EXISTS
-- Bucket configuration and storage RLS were provisioned out of band, by hand,
-- against each environment. Two consequences showed up in production:
--   1. Audit finding H2 stayed open because the fix was a SQL snippet living in
--      a markdown document that nobody had run.
--   2. A prod outage was traced to bucket/RLS drift between environments
--      (docs/status-archive-2026-07.md), and the `uploads` bucket turned out to
--      exist in neither environment.
-- Configuration that is not in version control is configuration nobody can
-- verify. This file is the source of truth; the synthetic launch check probes
-- the live state against it.
--
-- HOW TO APPLY (owner action — this file is not run automatically)
--   Supabase SQL editor, or psql against the project, per environment.
--   Idempotent: safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────

-- 1. The bucket is private and bounded. Public buckets serve objects to anyone
--    holding the URL; these are insurance documents carrying names, ΑΦΜ,
--    addresses and plate numbers.
UPDATE storage.buckets
SET
  public = false,
  file_size_limit = 15728640,  -- 15 MB, matching MAX_UPLOAD_SIZE_BYTES
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic'
  ]
WHERE id = 'policies';

-- 2. H2: remove the broad authenticated-read policy.
--
--    It was `SELECT USING (bucket_id = 'policies')` with NO owner scoping, so
--    ANY logged-in account could read ANY policy PDF given an object name. The
--    only thing standing in the way was that names are unguessable UUIDs —
--    which is obscurity, not access control, and was materially weaker before
--    keys moved to crypto.randomUUID().
DROP POLICY IF EXISTS "Allow authenticated reads" ON storage.objects;

-- 3. Reads go exclusively through the application server.
--
--    The app never hands out raw storage URLs: retrieval runs through
--    GET /api/v1/policies/[id]/documents/[docId], which re-authorizes per
--    request via getPolicyAccess().canRead and then 302s to a short-lived
--    signed URL. The service-role client used for that (and for the analysis
--    pipeline) bypasses RLS by design, so removing the anon/authenticated read
--    grant costs the product nothing and closes the direct-access door.
--
--    No replacement SELECT policy for `authenticated` is created on purpose.

-- 4. Writes stay possible for the browser upload path, scoped to the caller's
--    own prefix so one user cannot write into another's namespace. Objects are
--    still validated server-side after upload (lib/security/verify-stored-upload.ts)
--    before they can become a persisted document.
DROP POLICY IF EXISTS "policyholder writes own prefix" ON storage.objects;
CREATE POLICY "policyholder writes own prefix"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'policies'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 5. Verification — expected result after applying:
--    a) the bucket is private with a size limit and a MIME allowlist;
--    b) no SELECT policy grants `authenticated` blanket reads on `policies`.
--
-- SELECT id, public, file_size_limit, allowed_mime_types
--   FROM storage.buckets WHERE id = 'policies';
--
-- SELECT polname, polcmd, pg_get_expr(polqual, polrelid) AS using_expr
--   FROM pg_policy
--   WHERE polrelid = 'storage.objects'::regclass;
