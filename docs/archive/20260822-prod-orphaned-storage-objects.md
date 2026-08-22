# Prod orphaned storage objects — pending deletion

Verified 2026-08-22 by query against production (`cquudefwfwrmvpftuhyl`).

Nine objects in the `policies` bucket have **no `policy_documents` row**. An
object with no row is personal data that appears in no GDPR export and that no
erasure request can reach — the compliance half of the cleanup, not the tidiness
half.

| object key | size | created |
|---|---|---|
| `1783912115315-p0adktza6sg.pdf` | 1058 kB | 2026-07-13 |
| `1783915641283-duqx7raglgh.pdf` | 1058 kB | 2026-07-13 |
| `1783956235541-tr1f488ejhn.pdf` | 1156 kB | 2026-07-13 |
| `1784560613824-________________.pdf` | 295 kB | 2026-07-20 |
| `1784560728468-________________.pdf` | 295 kB | 2026-07-20 |
| `1784561020784-2e3tegmzv63.pdf` | 295 kB | 2026-07-20 |
| `1784561037185-qjy43nisju.pdf` | 295 kB | 2026-07-20 |
| `1784561047598-jeexhgz6fo.pdf` | 295 kB | 2026-07-21 |
| `a835b141-db79-4ee7-8071-1ffcadfb53af.pdf` | 295 kB | 2026-07-21 |

Note the two `________________.pdf` keys: those underscores are a **sanitized
original filename**, from before storage keys became opaque UUIDs. They are
themselves a residue of the filename leak.

## Why they are still here

`scripts/cleanup-sentinel-policies.ts` handles exactly this and is dry-run by
default. It was verified working end-to-end against dev on 2026-08-22 (0
sentinels, 1 object, 0 orphans — dev's original 34 are gone).

It needs `SUPABASE_SERVICE_ROLE_KEY` for the target project, because deleting
through the Storage API is the only correct path: **removing the
`storage.objects` row via SQL leaves the actual blob in S3** and desynchronises
storage metadata. Only a DEV service key exists locally
(`.env.local`, project `lzqvtvjggylcujenlelh`). There is no prod service key on
this machine, and the Supabase MCP deliberately exposes publishable keys only.

## To run it (owner)

```bash
# .prod-db-env does not exist on this machine — the script's own docstring
# references it, so either create it or export inline:
export NEXT_PUBLIC_SUPABASE_URL="https://cquudefwfwrmvpftuhyl.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<prod service_role key>"
export DATABASE_URL="<prod pooled URL>"
export DIRECT_URL="<prod session URL>"

npx tsx scripts/cleanup-sentinel-policies.ts                    # report only
npx tsx scripts/cleanup-sentinel-policies.ts --apply --orphans-only
```

The script refuses to run when the storage project and the database project
disagree, so a mismatched pair cannot delete live objects by calling them
orphans.

Two invocation notes found while verifying:
- The documented `npx tsx scripts/…` loads `.env`, which holds no Supabase keys;
  the keys are in `.env.local`. Use `DOTENV_CONFIG_PATH=.env.local npx tsx -r
  dotenv/config …` locally, or export the variables as above.
- An orphan younger than `--min-age-hours` (default 24) is deliberately left
  alone, so an upload in flight is never destroyed.
