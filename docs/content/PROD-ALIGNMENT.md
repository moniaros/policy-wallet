# PW-CONTENT-01 — production catalogue alignment (prepared, NOT executed)

**Status: waiting for the owner's explicit go (BLOCKED.md BL-C1, HANDOFF.md C-H1).** Nothing below has been run against production. Dev has been aligned and verified twice in this series (40 → 50 active; final fingerprint `d6f515a1d400f9d5`).

## Why it must accompany the rules PR

`planAttemptedRules` and `decideGapsForPolicy` read the ACTIVE rows of `gap_definitions` from the database; `currentCatalogueVersion()` fingerprints the repository catalogue. If the rules PR deploys while production still holds the 29-rule set, every new production run plans from 29 rules under the old fingerprint, the composition marks it stale against the repository's 50-rule fingerprint, and no re-analysis can clear it. The alignment and the deploy land in the same window, alignment first.

## What the alignment does

`npm run align:gap-catalogue -- --apply` upserts by slug: 21 rows created (renters ×8, home contents ×3, personal accident ×2, roadside ×2, pension ×3, income protection ×1, group life ×2), 29 rows updated in place (ids survive, so `gap_instances` survive), 0 rows deactivated (production carries nothing unauthored). No deletes.

## Procedure (DEV first is done; this is the PROD half)

1. **Archive** the current production rows (rollback), read-only, and commit the file:
   ```sql
   SELECT string_agg(format(
     'INSERT INTO gap_definitions (gap_definition_id, slug, name, title, description, line_of_business, severity, default_severity, rule_id, detection_logic, is_active, created_at, updated_at, scope, version) VALUES (%L,%L,%L,%L,%L,%L,%L,%L,%L,%L::jsonb,%L,%L,%L,%L,%L) ON CONFLICT (gap_definition_id) DO UPDATE SET slug=EXCLUDED.slug, name=EXCLUDED.name, title=EXCLUDED.title, description=EXCLUDED.description, line_of_business=EXCLUDED.line_of_business, severity=EXCLUDED.severity, default_severity=EXCLUDED.default_severity, rule_id=EXCLUDED.rule_id, detection_logic=EXCLUDED.detection_logic, is_active=EXCLUDED.is_active, updated_at=EXCLUDED.updated_at, scope=EXCLUDED.scope, version=EXCLUDED.version;',
     gap_definition_id, slug, name, title, description, line_of_business, severity, default_severity, rule_id, detection_logic::text, is_active, created_at, updated_at, scope, version), E'\n' ORDER BY slug)
   FROM gap_definitions;
   ```
   Save the output as `docs/archive/<UTC timestamp>_prod_gap_definitions_before_content_01.sql` and commit it. (Production held 29 rows, all active, on 2026-09-06 — the same 29 slugs as the repository before Goal 5.)
2. **Apply** against production: `DIRECT_URL=<prod session pooler> npm run align:gap-catalogue -- --apply` (or the Supabase MCP equivalent of the upserts the script prints). Expected summary: `to create 21 · to update in place 29 · deactivated 0 · After: 50 rows, 50 active`.
3. **Verify** against production: `DIRECT_URL=<prod> npm run verify:gap-catalogue` must print `database (active): 50 definitions fingerprint d6f515a1d400f9d5` and `No drift`.
4. **Merge** the rules PR and let CI → deploy run. Smoke: a production policy page renders the composition without the stale line for a fresh run, and a renters upload is accepted as its own line.

## Rollback

Run the archived file (it restores the 29 rows as they were, and the alignment's 21 new rows stay inactive-but-present only if you also `UPDATE gap_definitions SET is_active=false WHERE slug IN (...the 21...)`); then redeploy the previous NEW-UI commit. `gap_instances` are never touched by either direction.
