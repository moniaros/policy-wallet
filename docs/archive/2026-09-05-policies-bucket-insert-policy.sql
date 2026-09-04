-- Rollback record for the storage.objects policies removed by the document
-- validation gate (docs/audits/document-validation-gate-2026-09.md).
--
-- Before Sept 2026 the B2C "add a policy" page uploaded bytes straight from
-- the browser into the private `policies` bucket under the user's Supabase
-- session, and only THEN told the server about them. That is the hole the
-- gate closes: every policy document now passes through a server action that
-- validates it BEFORE storage. The browser-side INSERT grant is therefore
-- removed. Reads were never granted in prod (documents are served through
-- signed URLs by the service role); dev carried a SELECT policy too.
--
-- Captured from pg_policies on 2026-09-05 before dropping. To restore:
--
-- dev  (lzqvtvjggylcujenlelh) had:
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'policies'::text);
CREATE POLICY "Allow authenticated reads" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'policies'::text);
--
-- prod (cquudefwfwrmvpftuhyl) had:
-- CREATE POLICY "Allow authenticated uploads" ON storage.objects
--   FOR INSERT TO authenticated WITH CHECK (bucket_id = 'policies'::text);
--
-- Dropped: the INSERT policy on dev on 2026-09-05 (before the gate code ran
-- locally) and on prod immediately after the gate deployed. The dev SELECT
-- policy is left in place (out of scope; the service role reads for prod).
