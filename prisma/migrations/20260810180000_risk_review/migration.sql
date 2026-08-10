-- Risk review.
--
-- A review is a HUMAN CHECKPOINT, and that is what makes it different from a
-- recalculation. The engine already recomputes continuously and silently on
-- every material change; a review is the far rarer moment where we ask the
-- customer to look at the result and confirm or correct the life it was
-- computed from.
--
-- The distinction decides the design. If every coverage gap opened a review,
-- reviews would become the thing people dismiss without reading — the same
-- failure as a list where everything is urgent. Most triggers recalculate; only
-- a few are worth interrupting someone for. Which ones is declared in
-- lib/services/risk-review/policy.ts.

CREATE TABLE IF NOT EXISTS "risk_reviews" (
    "review_id"        TEXT NOT NULL,
    "user_id"          TEXT NOT NULL,
    -- Why this review exists. Kept because "your annual review" and "you told
    -- us a child was born" are different conversations, and a review that
    -- cannot say why it opened is one the customer distrusts.
    "trigger"          TEXT NOT NULL,
    -- open | completed | dismissed | expired | superseded
    "status"           TEXT NOT NULL DEFAULT 'open',
    -- A review with no deadline is a to-do nobody does.
    "due_at"           TIMESTAMP(3) NOT NULL,
    "opened_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at"     TIMESTAMP(3),
    -- The position when the review opened, so the customer can be shown what
    -- changed BY reviewing rather than only what is true now. "No change" is a
    -- legitimate answer and worth recording rather than hiding.
    "score_at_open"    INTEGER,
    "score_at_close"   INTEGER,
    "findings_at_open" INTEGER,
    -- The risk-profile version it was raised against, so a stale review can be
    -- recognised rather than shown as current.
    "version_at_open"  INTEGER,
    "outcome"          TEXT,
    "caused_by_event_id" TEXT,

    CONSTRAINT "risk_reviews_pkey" PRIMARY KEY ("review_id")
);

-- "Does this customer have an open review" — the dashboard card and the
-- cooldown check both ask this.
CREATE INDEX IF NOT EXISTS "risk_reviews_user_id_status_idx"
    ON "risk_reviews" ("user_id", "status");

-- The scan: reviews that are due, and reviews that have gone stale.
CREATE INDEX IF NOT EXISTS "risk_reviews_status_due_at_idx"
    ON "risk_reviews" ("status", "due_at");

ALTER TABLE "risk_reviews" DROP CONSTRAINT IF EXISTS "risk_reviews_user_id_fkey";
ALTER TABLE "risk_reviews"
    ADD CONSTRAINT "risk_reviews_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("user_id")
    ON DELETE CASCADE ON UPDATE CASCADE;
