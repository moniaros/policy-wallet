-- Protection score trend (audit finding F-08).
--
-- `protection_scores` is keyed UNIQUE on user_id, so it holds only the latest
-- value and every earlier reading was overwritten. The trend was therefore
-- unrecoverable, which made the core advisory story untellable: "your
-- protection improved after we added life cover" is the sentence the product
-- exists to support, and nothing in the database could back it.
--
-- Append-only, and written only when the score actually moves — the refresh
-- cron recomputes every user daily, so recording unchanged values would add
-- ~365 rows per user per year of noise. A flat stretch is implied by the gap
-- between two entries.

CREATE TABLE "protection_score_history" (
    "history_id"      TEXT NOT NULL,
    "user_id"         TEXT NOT NULL,
    "overall_score"   INTEGER NOT NULL,
    "category_scores" JSONB NOT NULL,
    "gap_count"       INTEGER NOT NULL,
    "previous_score"  INTEGER,
    "computed_at"     TIMESTAMP(3) NOT NULL,
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "protection_score_history_pkey" PRIMARY KEY ("history_id")
);

-- Timeline reads are always "this user, newest first".
CREATE INDEX "protection_score_history_user_id_computed_at_idx"
    ON "protection_score_history"("user_id", "computed_at");

ALTER TABLE "protection_score_history"
    ADD CONSTRAINT "protection_score_history_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("user_id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed the trend with each user's current score, so the first advisor-visible
-- data point is today rather than "whenever this user's score next changes".
-- previous_score is NULL: there is genuinely no earlier reading on record.
INSERT INTO "protection_score_history"
    ("history_id", "user_id", "overall_score", "category_scores", "gap_count", "previous_score", "computed_at", "created_at")
SELECT
    gen_random_uuid()::text,
    "user_id",
    "overall_score",
    "category_scores",
    "gap_count",
    NULL,
    "computed_at",
    CURRENT_TIMESTAMP
FROM "protection_scores";
