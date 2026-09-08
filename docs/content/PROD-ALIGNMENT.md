# PW-CONTENT-01 — production catalogue alignment (prepared, NOT executed)

**Status: EXECUTED 2026-09-08 on the owner's go.** Dev and production are both on the 50-rule set, fingerprint **`15fa2758cebeaecc`**.

> **The fingerprint in the earlier draft of this file (`d6f515a1d400f9d5`) was wrong** and never matched anything. Measured on the day: the 29-rule set fingerprints to `2df9d0fd4b581caa` (the value CLAUDE.md records for both databases in August) and this branch's 50-rule set to `15fa2758cebeaecc`. The repository's own function is the authority — `scripts/verify-gap-catalogue.ts` prints both the authored and the database value, and they matched on dev before production was touched.

## Why it must accompany the rules PR

`planAttemptedRules` and `decideGapsForPolicy` read the ACTIVE rows of `gap_definitions` from the database; `currentCatalogueVersion()` fingerprints the repository catalogue. If the rules PR deploys while production still holds the 29-rule set, every new production run plans from 29 rules under the old fingerprint, the composition marks it stale against the repository's 50-rule fingerprint, and no re-analysis can clear it. The alignment and the deploy land in the same window, alignment first.

## What the alignment does

`npm run align:gap-catalogue -- --apply` upserts by slug: 21 rows created (renters ×8, home contents ×3, personal accident ×2, roadside ×2, pension ×3, income protection ×1, group life ×2), 29 rows updated in place (ids survive, so `gap_instances` survive), 0 rows deactivated (production carries nothing unauthored). No deletes.

## What was actually run (2026-09-08)

Production is not reachable by connection string from this machine (`vercel env pull` returns empty for sensitive vars, and the one prod password in git history is compromised and may not be used), so the write travelled as SQL through the Supabase MCP rather than through Prisma.

1. **Dev** — `npm run align:gap-catalogue -- --apply` from the rules branch: 53 rows, 29 active → 50 active, 0 unauthored deactivated. `npm run verify:gap-catalogue`: authored and database both `15fa2758cebeaecc`, no drift.
2. **Archive** — production's 29 rows exported to [`docs/archive/2026-09-08T1600Z_prod_gap_definitions_before_content_01.sql`](../archive/2026-09-08T1600Z_prod_gap_definitions_before_content_01.sql). **Verified byte-faithful:** the md5 of the file's 29 statements is `60dc1550889125794da79be70070a6e8`, which is the md5 Postgres computed over the same `string_agg` at export time.
3. **Narrowed the write.** The 29 rules production already held are byte-identical between NEW-UI and this branch (compared entry by entry; 21 added, 0 changed, 0 removed), and production's stored text matched the repository too (per-slug md5 of `name|title|description` equal for all 29). So production needed only the **21 new rows** — the 29 were left untouched, which is also why their `version` and timestamps are unchanged.
4. **Rehearsed on dev.** The exact 21 generated statements were executed against dev first (they took the `ON CONFLICT` path there); dev still verified at 50 active / `15fa2758cebeaecc`.
5. **Applied to production** in one transaction via `execute_sql`. After: **50 rows, 50 active, 0 inactive, 14 branches.**
6. **Verified.** Postgres-side digest over the active set — `md5(string_agg(slug|line_of_business|severity|default_severity|rule_id|detection_logic::text))` — is `8045aa4e46935b149e2864f9a20c502a` on **both** dev and production. Dev verifies against the repository with the repo's own function, so production matches the repository transitively, without either database's rows leaving it.

`scripts/print-gap-catalogue-sql.ts` prints the alignment as SQL for exactly this case; `scripts/fingerprint-gap-rows.ts` fingerprints rows handed over as JSON, for an environment this machine cannot connect to.

## Procedure as originally prepared (kept for the record)

1. **Archive** the current production rows (rollback), read-only, and commit the file:
   ```sql
   SELECT string_agg(format(
     'INSERT INTO gap_definitions (gap_definition_id, slug, name, title, description, line_of_business, severity, default_severity, rule_id, detection_logic, is_active, created_at, updated_at, scope, version) VALUES (%L,%L,%L,%L,%L,%L,%L,%L,%L,%L::jsonb,%L,%L,%L,%L,%L) ON CONFLICT (gap_definition_id) DO UPDATE SET slug=EXCLUDED.slug, name=EXCLUDED.name, title=EXCLUDED.title, description=EXCLUDED.description, line_of_business=EXCLUDED.line_of_business, severity=EXCLUDED.severity, default_severity=EXCLUDED.default_severity, rule_id=EXCLUDED.rule_id, detection_logic=EXCLUDED.detection_logic, is_active=EXCLUDED.is_active, updated_at=EXCLUDED.updated_at, scope=EXCLUDED.scope, version=EXCLUDED.version;',
     gap_definition_id, slug, name, title, description, line_of_business, severity, default_severity, rule_id, detection_logic::text, is_active, created_at, updated_at, scope, version), E'\n' ORDER BY slug)
   FROM gap_definitions;
   ```
   Save the output as `docs/archive/<UTC timestamp>_prod_gap_definitions_before_content_01.sql` and commit it. (Production held 29 rows, all active, on 2026-09-06 — the same 29 slugs as the repository before Goal 5.)
2. **Apply** against production: `DIRECT_URL=<prod session pooler> npm run align:gap-catalogue -- --apply` (or the Supabase MCP equivalent of the upserts the script prints). Expected summary: `to create 21 · to update in place 29 · deactivated 0 · After: 50 rows, 50 active`.
3. **Verify** against production: `DIRECT_URL=<prod> npm run verify:gap-catalogue` must print `database (active): 50 definitions fingerprint 15fa2758cebeaecc` and `No drift`.
4. **Merge** the rules PR and let CI → deploy run. Smoke: a production policy page renders the composition without the stale line for a fresh run, and a renters upload is accepted as its own line.

## Rollback

Run the archived file (it restores the 29 rows as they were, and the alignment's 21 new rows stay inactive-but-present only if you also `UPDATE gap_definitions SET is_active=false WHERE slug IN (...the 21...)`); then redeploy the previous NEW-UI commit. `gap_instances` are never touched by either direction.
