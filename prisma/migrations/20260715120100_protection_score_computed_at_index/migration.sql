-- The protection-score refresh cron drives off the stalest scores first
-- (order by computed_at asc). Index it so selecting the next batch does not
-- sort the whole protection_scores table (one row per user).
CREATE INDEX IF NOT EXISTS "protection_scores_computed_at_idx"
    ON "protection_scores"("computed_at");
