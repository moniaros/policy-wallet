-- Coverage recommendations: one active row per finding.
--
-- syncRecommendations built its "already exists" set once and never added the
-- rows it created inside the same loop, so every finding detected N times in a
-- run (two policies with the same gap, one policy with the same gap under two
-- AI slug spellings) was written N times — and every later run kept them all
-- alive. Collapse what accumulated, then let the database enforce it.

-- 1. Keep the newest active row per (user, rule); retire its copies.
WITH ranked AS (
    SELECT
        "recommendation_id",
        row_number() OVER (
            PARTITION BY "user_id", "rule_id"
            ORDER BY "created_at" DESC, "recommendation_id" DESC
        ) AS rn
    FROM "recommendation_instances"
    WHERE "status" = 'active' AND "rule_id" IS NOT NULL
)
UPDATE "recommendation_instances" AS r
SET "status" = 'dismissed',
    "dismiss_reason" = 'auto:duplicate',
    "updated_at" = now()
FROM ranked
WHERE r."recommendation_id" = ranked."recommendation_id"
  AND ranked.rn > 1;

-- 2. The guard. Partial, so dismissed/actioned history is untouched and a
--    finding can legitimately come back as active after the gap reopens.
CREATE UNIQUE INDEX IF NOT EXISTS "recommendation_instances_user_rule_active_unique"
    ON "recommendation_instances" ("user_id", "rule_id")
    WHERE "status" = 'active' AND "rule_id" IS NOT NULL;
