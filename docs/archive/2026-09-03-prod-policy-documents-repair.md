# 2026-09-03 — production repair: three document-less placeholder policies

**Why.** From `1057ab7d` (2026-08-21) `PolicyService.uploadAndParse` passed the generated Greek
label as the document `name`; `create()`'s extension allowlist rejected it, so the policy row was
committed with no `policy_documents` row and the uploaded object stayed in the `policies` bucket
referenced by nothing. Fixed in `502f597f`; guard `tests/unit/upload-keeps-its-document.test.ts`.

**What was repaired (prod `cquudefwfwrmvpftuhyl`, unrehearsed — prod-only rows).** Three
`policy_documents` rows were INSERTED, pairing each dead row with the bucket object created within
60 ms of it:

| document_id | policy_id | storage_key | bytes |
|---|---|---|---|
| `repair_eb3bb4154c7247428cfb821d81372357` | `cmthwo63j0002vkietwcqs236` | `9a58fe27-9668-4e81-a7bd-8631ceb1b72a.pdf` | 2702061 |
| `repair_d2ee4cb64b344b3aa2c46bc7fceba2ee` | `cmtlkrnz60004jjk3azy9hi01` | `3e4b9cb0-78d7-4e55-9991-40e1674863ea.pdf` | 1297957 |
| `repair_4800439a697f4c54ad6728af791cd02d` | `cmtlm9chr0004thsymriync3e` | `1a5cfe50-184f-4d52-bc4c-665eed637f9a.pdf` | 2702061 |

Columns: `file_name` = «Έγγραφο σε επεξεργασία» (the generated label), `source` = `policyholder`,
`processing_status` = `processing`, `uploaded_by_user_id` = the policy owner, `uploaded_at` = the
object's `created_at`, `storage_bucket` = `policies`, `storage_provider` = `supabase`.

**Verification after.** `policies` created in the last 45 days with no document: 0 (was 3).
Bucket objects since 2026-08-20 with no `policy_documents.storage_key`: 1 — `4d92d6d9-…pdf`
(2026-08-28), which IS referenced by `file_url` on a row that predates the `storage_key` column
being populated; not an orphan.

**Rollback.** `delete from policy_documents where document_id like 'repair_%'` — the objects and
the policy rows are untouched by this repair.

**Still open.** The three policies remain `analyzing` / `action_needed` until someone re-runs the
analysis from the wallet; nothing re-runs it automatically.
