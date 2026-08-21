-- ============================================================================
-- ROLLBACK ARCHIVE — protection_score_history (PRODUCTION + dev)
-- Archived 2026-08-21 before 20260809130000_drop_dead_protection_score_history.
--
-- The table was superseded by risk_profile_versions; its Prisma model was
-- removed but the table was not, so it sat holding two users' protection
-- scores, written by nothing and read by nothing. Because the DSR export
-- enumerates Prisma models, a user-keyed table with no model is personal data
-- outside the subject-access path — dropping it IS the erasure.
--
-- Both databases held exactly 2 rows / 2 distinct users. Prod's are below.
-- To restore: run the DDL section, then the DATA section.
-- ============================================================================

-- ============================== DDL ==========================================
CREATE TABLE "protection_score_history" (
    "history_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "overall_score" INTEGER NOT NULL,
    "category_scores" JSONB NOT NULL,
    "gap_count" INTEGER NOT NULL,
    "previous_score" INTEGER,
    "computed_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "protection_score_history_pkey" PRIMARY KEY ("history_id")
);

-- ============================== DATA (prod, 2 rows) ==========================
INSERT INTO protection_score_history SELECT * FROM json_populate_record(NULL::protection_score_history, '{"history_id":"5ead8675-08a5-40f2-8ce7-bd86e0705458","user_id":"cms8z0pds000090e3vuz8yz60","overall_score":44,"category_scores":{"life": -1, "other": -1, "health": 0, "income": -1, "property": 100, "liability": -1},"gap_count":1,"previous_score":null,"computed_at":"2026-08-04T07:51:23.311","created_at":"2026-08-04T08:40:38.937"}');
INSERT INTO protection_score_history SELECT * FROM json_populate_record(NULL::protection_score_history, '{"history_id":"09df6b92-3253-4b6f-ab58-cc4664f093bd","user_id":"cmren9d8a00007dlhnds6ouci","overall_score":12,"category_scores":{"life": 0, "other": -1, "health": 0, "income": 0, "property": 30, "liability": 50},"gap_count":14,"previous_score":null,"computed_at":"2026-08-04T07:51:24.525","created_at":"2026-08-04T08:40:38.937"}');
