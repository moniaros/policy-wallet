-- Business events.
--
-- Specification: docs/architecture/business-events.md
--
-- Two additive tables. Nothing existing is altered, so every current surface
-- keeps working whether or not a single event is ever published.
--
-- This is an OUTBOX, not an in-process emitter. The event row is written in the
-- same transaction as the fact it describes, so the two cannot disagree: either
-- both happened or neither did. An in-process emitter has the exact failure mode
-- the audit found on the upload path — a floating promise a serverless function
-- may terminate before it runs.
--
-- It is NOT event sourcing. Prisma models remain the system of record; this is
-- an append-only record of facts used to drive reactions and to replay them.

CREATE TABLE IF NOT EXISTS "business_events" (
    "event_id"        TEXT NOT NULL,
    "name"            TEXT NOT NULL,
    "version"         INTEGER NOT NULL DEFAULT 1,

    -- occurred_at is when the FACT happened; recorded_at is when we learned it.
    -- In insurance the two differ constantly: a marriage declared at renewal, a
    -- policy uploaded three years into its term, a claim registered weeks after
    -- the incident. Date-dependent business rules read the first; operational
    -- rules (retry, expiry, SLA) read the second.
    "occurred_at"     TIMESTAMP(3) NOT NULL,
    "recorded_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    "aggregate_type"  TEXT NOT NULL,
    "aggregate_id"    TEXT NOT NULL,
    -- Monotonic per aggregate. The ONLY ordering guarantee: global ordering is
    -- deliberately not offered, because it forces every event through one queue
    -- and caps throughput for a benefit almost nothing needs.
    "sequence"        INTEGER NOT NULL,

    -- WHOSE data this is — the GDPR anchor. Erasure and subject-access walk
    -- this, never actor_id. An advisor uploading for a customer is
    -- actor=advisor, subject=customer; collapsing the two misattributes the
    -- record, misroutes the notification and loses the access log.
    "subject_user_id" TEXT,
    "actor_type"      TEXT NOT NULL,
    "actor_id"        TEXT,

    "correlation_id"  TEXT NOT NULL,
    "causation_id"    TEXT,

    "payload"         JSONB NOT NULL,
    "metadata"        JSONB,

    "idempotency_key" TEXT,
    -- True when re-delivered from the log rather than happening for the first
    -- time. Customer-facing actions refuse to run on a replay: backfilling a
    -- subscriber must never email two years of notifications.
    "is_replay"       BOOLEAN NOT NULL DEFAULT false,

    "dispatch_state"  TEXT NOT NULL DEFAULT 'pending',
    "dispatched_at"   TIMESTAMP(3),

    CONSTRAINT "business_events_pkey" PRIMARY KEY ("event_id")
);

-- Natural key of the fact, built from the thing and never from the clock. A
-- webhook redelivery or a cron re-run records one fact once.
CREATE UNIQUE INDEX IF NOT EXISTS "business_events_idempotency_key_key"
    ON "business_events" ("idempotency_key")
    WHERE "idempotency_key" IS NOT NULL;

-- The outbox drain: pending rows, oldest first.
CREATE INDEX IF NOT EXISTS "business_events_dispatch_state_recorded_at_idx"
    ON "business_events" ("dispatch_state", "recorded_at");

-- "What happened to this customer" — the timeline and the DSR export.
CREATE INDEX IF NOT EXISTS "business_events_subject_user_id_occurred_at_idx"
    ON "business_events" ("subject_user_id", "occurred_at");

-- Per-aggregate replay, in order.
CREATE INDEX IF NOT EXISTS "business_events_aggregate_sequence_idx"
    ON "business_events" ("aggregate_type", "aggregate_id", "sequence");

-- "Everything in this causal chain".
CREATE INDEX IF NOT EXISTS "business_events_correlation_id_idx"
    ON "business_events" ("correlation_id");

CREATE INDEX IF NOT EXISTS "business_events_name_occurred_at_idx"
    ON "business_events" ("name", "occurred_at");

-- Erasure cascades from the subject, which is why subject_user_id is the anchor
-- and actor_id is not a foreign key: an advisor's account ending must not delete
-- the record of what happened to their customers.
ALTER TABLE "business_events"
    DROP CONSTRAINT IF EXISTS "business_events_subject_user_id_fkey";
ALTER TABLE "business_events"
    ADD CONSTRAINT "business_events_subject_user_id_fkey"
    FOREIGN KEY ("subject_user_id") REFERENCES "users"("user_id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Deliveries ───────────────────────────────────────────────────────────────
--
-- One row per (event, subscriber), so a subscriber that fails is retried on its
-- own rather than re-running the whole fan-out, and one slow consumer cannot
-- hold up the others.

CREATE TABLE IF NOT EXISTS "business_event_deliveries" (
    "delivery_id"     TEXT NOT NULL,
    "event_id"        TEXT NOT NULL,
    "subscriber"      TEXT NOT NULL,
    "status"          TEXT NOT NULL DEFAULT 'pending',
    "attempts"        INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMP(3),
    -- Why a subscriber declined to act. A skip is not a failure and must not
    -- read as one.
    "skip_reason"     TEXT,
    "last_error"      TEXT,
    "started_at"      TIMESTAMP(3),
    "completed_at"    TIMESTAMP(3),
    -- What the decision engine decided, what ran, and what was skipped. This is
    -- the workflow audit trail an operator reads when a customer asks why
    -- nothing happened.
    "actions"         JSONB,

    CONSTRAINT "business_event_deliveries_pkey" PRIMARY KEY ("delivery_id")
);

-- The claim that makes processing exactly-once, mirroring ProcessedWebhookEvent
-- for Stripe.
CREATE UNIQUE INDEX IF NOT EXISTS "business_event_deliveries_event_id_subscriber_key"
    ON "business_event_deliveries" ("event_id", "subscriber");

-- The delivery worker: due work, oldest first.
CREATE INDEX IF NOT EXISTS "business_event_deliveries_status_next_attempt_at_idx"
    ON "business_event_deliveries" ("status", "next_attempt_at");

CREATE INDEX IF NOT EXISTS "business_event_deliveries_subscriber_status_idx"
    ON "business_event_deliveries" ("subscriber", "status");

ALTER TABLE "business_event_deliveries"
    DROP CONSTRAINT IF EXISTS "business_event_deliveries_event_id_fkey";
ALTER TABLE "business_event_deliveries"
    ADD CONSTRAINT "business_event_deliveries_event_id_fkey"
    FOREIGN KEY ("event_id") REFERENCES "business_events"("event_id")
    ON DELETE CASCADE ON UPDATE CASCADE;
