-- Duplicate recommendations: the engine's read-then-write sync had no
-- transaction and the table had no uniqueness, so concurrent runs (a profile
-- save + a home render + a finished analysis) each inserted the full set —
-- three identical active rows for the same rule, all counted in
-- «18 προτάσεις». Collapse the duplicates, then make them impossible.

-- 1. Keep one row per (user_id, rule_id): prefer an active row, then the newest.
DELETE FROM "recommendation_instances" ri
USING (
    SELECT recommendation_id,
           ROW_NUMBER() OVER (
               PARTITION BY user_id, rule_id
               ORDER BY (status = 'active') DESC, created_at DESC
           ) AS rn
    FROM "recommendation_instances"
    WHERE rule_id IS NOT NULL
) ranked
WHERE ri.recommendation_id = ranked.recommendation_id
  AND ranked.rn > 1;

-- 2. One recommendation per rule, per user, forever.
CREATE UNIQUE INDEX "recommendation_instances_user_id_rule_id_key"
    ON "recommendation_instances"("user_id", "rule_id");
