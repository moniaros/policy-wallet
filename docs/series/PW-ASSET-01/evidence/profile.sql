-- PW-ASSET-01 · STEP0 §2.9 profile — READ-ONLY. One statement, one jsonb row.
--
-- Rewritten 2026-10-24 for H-012: the Step 0 session ran the §2.9 profile from a
-- scratch script that was never committed. This is the same profile rebuilt from
-- the schema, plus the counts H-012 actually asks about (rows the backfill could
-- NOT place deterministically). It selects no identifier values: plate shapes
-- only (letters → L, digits → 9), counts everywhere else.
--
-- Family mapping mirrors STEP0 §3.4 (branch family of the policy); aliases are
-- matched case-insensitively. Subject keys:
--   exact   = upper(plate) with whitespace stripped  (policyAssetSubjectKey's form)
--   sep     = exact with '-', '·', '.' also stripped  → plate_separator_variant prompt
--   glyph   = sep with Greek look-alikes folded to Latin → homoglyph_near_miss prompt
-- A looser group that is not also a stricter group is a PROMPT case, not a link.
WITH p AS (
  SELECT
    policy_id, owner_user_id, status, line_of_business AS lob,
    premium_amount, coverage_end_date, nickname, insurer_name, policy_number,
    acord_data AS a,
    CASE
      WHEN lower(line_of_business) IN ('motor','motorbike','truck','auto','car','vehicle') THEN 'vehicle'
      WHEN lower(line_of_business) IN ('home','renters','property') THEN 'property'
      WHEN lower(line_of_business) = 'pet' THEN 'pet'
      WHEN lower(line_of_business) LIKE 'boat%' OR lower(line_of_business) LIKE 'marine%' THEN 'vessel'
      ELSE 'none'
    END AS fam,
    nullif(btrim(acord_data->'vehicle'->>'plateNumber'), '')         AS plate,
    nullif(btrim(acord_data->'vehicle'->>'vin'), '')                 AS vin,
    nullif(btrim(acord_data->'property'->>'address'), '')            AS addr,
    nullif(btrim(acord_data->'pet'->>'name'), '')                    AS pet_name,
    nullif(btrim(acord_data->'pet'->>'microchipNumber'), '')         AS pet_chip,
    nullif(btrim(acord_data->'policyholder'->>'taxId'), '')          AS holder_afm,
    nullif(btrim(acord_data->'insured'->>'name'), '')                AS insured_name,
    nullif(btrim(acord_data->'marineVessel'->>'registryNumber'), '') AS vessel
  FROM policies
  WHERE status <> 'deleted'
),
k AS (
  SELECT p.*,
    coalesce(plate ~* '(X{3,}|\?{2,}|^N/?A$)', false)                   AS plate_masked,
    upper(regexp_replace(plate, '\s', '', 'g'))                         AS plate_exact,
    upper(regexp_replace(plate, '[\s\-·.]', '', 'g'))                   AS plate_sep,
    translate(upper(regexp_replace(plate, '[\s\-·.]', '', 'g')),
              'ΑΒΕΖΗΙΚΜΝΟΡΤΥΧ', 'ABEZHIKMNOPTYX')                        AS plate_glyph,
    upper(regexp_replace(vin, '\s', '', 'g'))                           AS vin_key,
    lower(regexp_replace(addr, '\s+', ' ', 'g'))                        AS addr_key,
    lower(btrim(split_part(addr, ',', 1)))                              AS addr_street
  FROM p
),
veh AS (SELECT * FROM k WHERE fam = 'vehicle' AND plate IS NOT NULL AND NOT plate_masked),
g_exact  AS (SELECT owner_user_id, plate_exact FROM veh GROUP BY 1,2 HAVING count(*) > 1),
g_sep    AS (SELECT owner_user_id, plate_sep   FROM veh GROUP BY 1,2 HAVING count(DISTINCT plate_exact) > 1),
g_glyph  AS (SELECT owner_user_id, plate_glyph FROM veh GROUP BY 1,2 HAVING count(DISTINCT plate_sep) > 1),
g_vin    AS (SELECT owner_user_id, vin_key FROM k WHERE fam = 'vehicle' AND vin IS NOT NULL
             GROUP BY 1,2 HAVING count(*) > 1 AND count(DISTINCT coalesce(plate_exact, '')) > 1),
g_addr   AS (SELECT owner_user_id, addr_key FROM k WHERE fam = 'property' AND addr IS NOT NULL
             GROUP BY 1,2 HAVING count(*) > 1),
g_street AS (SELECT owner_user_id, addr_street FROM k WHERE fam = 'property' AND addr IS NOT NULL
             GROUP BY 1,2 HAVING count(DISTINCT addr_key) > 1),
g_pet    AS (SELECT owner_user_id, lower(pet_name) FROM k WHERE fam = 'pet' AND pet_name IS NOT NULL
             GROUP BY 1,2 HAVING count(*) > 1 AND count(DISTINCT coalesce(pet_chip, '')) > 1)
SELECT jsonb_build_object(
  'policies_by_status', (SELECT jsonb_object_agg(status, n) FROM (SELECT status, count(*) n FROM p GROUP BY 1) s),
  'policies_by_line',   (SELECT jsonb_object_agg(lob, n)    FROM (SELECT lob, count(*) n FROM p GROUP BY 1) s),
  'policies_by_family', (SELECT jsonb_object_agg(fam, n)    FROM (SELECT fam, count(*) n FROM p GROUP BY 1) s),
  'owners',             (SELECT count(DISTINCT owner_user_id) FROM p),
  'policies',           (SELECT count(*) FROM p),
  'policies_per_owner', (SELECT jsonb_agg(n ORDER BY n DESC) FROM (SELECT count(*) n FROM p GROUP BY owner_user_id) s),
  'has_acord',          (SELECT count(*) FROM p WHERE a IS NOT NULL AND a <> 'null'::jsonb),
  'plate',              (SELECT count(*) FROM k WHERE plate IS NOT NULL),
  'plate_masked',       (SELECT count(*) FROM k WHERE plate_masked),
  'vin',                (SELECT count(*) FROM k WHERE vin IS NOT NULL),
  'property_address',   (SELECT count(*) FROM k WHERE addr IS NOT NULL),
  'pet_name',           (SELECT count(*) FROM k WHERE pet_name IS NOT NULL),
  'pet_chip',           (SELECT count(*) FROM k WHERE pet_chip IS NOT NULL),
  'holder_afm',         (SELECT count(*) FROM k WHERE holder_afm IS NOT NULL),
  'insured_name',       (SELECT count(*) FROM k WHERE insured_name IS NOT NULL),
  'vessel_registry',    (SELECT count(*) FROM k WHERE vessel IS NOT NULL),
  'premium_amount_null',    (SELECT count(*) FROM p WHERE premium_amount IS NULL),
  'coverage_end_date_null', (SELECT count(*) FROM p WHERE coverage_end_date IS NULL),
  'nickname',               (SELECT count(*) FROM p WHERE nickname IS NOT NULL),
  'placeholder_identity',   (SELECT count(*) FROM p
                             WHERE insurer_name IN ('__PENDING_EXTRACTION__','AI Analyzing...','Unknown Insurer','Άγνωστος ασφαλιστής')
                                OR policy_number LIKE 'PENDING-%'),
  'summary_en',             (SELECT count(*) FROM p WHERE a->'extraction'->>'summaryLanguage' = 'en'),
  'field_confidence_rows',  (SELECT count(*) FROM p WHERE jsonb_typeof(a->'extraction'->'confidence'->'fields') = 'object'
                                                     AND a->'extraction'->'confidence'->'fields' <> '{}'::jsonb),
  'field_confidence_keys',  (SELECT jsonb_object_agg(key, n) FROM (
                               SELECT key, count(*) n FROM p,
                                 jsonb_object_keys(CASE WHEN jsonb_typeof(a->'extraction'->'confidence'->'fields') = 'object'
                                                        THEN a->'extraction'->'confidence'->'fields' ELSE '{}'::jsonb END) key
                               GROUP BY 1) s),
  'plate_shapes',           (SELECT jsonb_object_agg(shape, n) FROM (
                               SELECT regexp_replace(regexp_replace(plate, '[0-9]', '9', 'g'), '[^0-9\s\-·.]', 'L', 'g') shape, count(*) n
                               FROM k WHERE plate IS NOT NULL GROUP BY 1) s),
  'plate_on_non_vehicle',   (SELECT jsonb_object_agg(lob, n) FROM (
                               SELECT lob, count(*) n FROM k WHERE plate IS NOT NULL AND fam <> 'vehicle' GROUP BY 1) s),
  -- deterministic links the backfill WOULD make (same owner, same exact key)
  'dup_plate_groups_exact',   (SELECT count(*) FROM g_exact),
  'dup_address_groups_exact', (SELECT count(*) FROM g_addr),
  -- prompt cases the backfill leaves UNLINKED (owner decision H-012)
  'ambiguous_plate_separator_variant', (SELECT count(*) FROM g_sep),
  'ambiguous_homoglyph_near_miss',     (SELECT count(*) FROM g_glyph),
  'ambiguous_vin_only',                (SELECT count(*) FROM g_vin),
  'ambiguous_address_street_only',     (SELECT count(*) FROM g_street),
  'ambiguous_pet_name_only',           (SELECT count(*) FROM g_pet),
  'live_gaps',          (SELECT count(*) FROM gap_instances WHERE superseded_at IS NULL),
  'merge_requests',     (SELECT count(*) FROM policy_merge_requests),
  'wallet_memberships', (SELECT count(*) FROM wallet_memberships),
  'renewals',           (SELECT count(*) FROM policy_renewals),
  'documents',          (SELECT count(*) FROM policy_documents),
  'runs',               (SELECT count(*) FROM policy_analysis_runs),
  'rls_tables',         (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                         WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity),
  'rls_forced',         (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                         WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relforcerowsecurity),
  'pg_policies_public', (SELECT count(*) FROM pg_policies WHERE schemaname = 'public'),
  'asset_tables_exist', (SELECT count(*) FROM pg_tables WHERE schemaname = 'public'
                         AND tablename IN ('insured_assets','policy_insured_assets','asset_match_suggestions'))
) AS profile;
