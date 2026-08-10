-- Notification administration.
--
-- Specification: docs/architecture/notification-automation.md
--
-- Four additive tables. Nothing existing is altered, so every current surface
-- keeps working unchanged whether or not a single override row is ever written.
--
-- The registry in lib/notifications/registry.ts remains the source of truth for
-- an event's SHAPE and its safety-critical properties. These tables override
-- only its OPERATIONAL parameters — thresholds, channels, retries, copy — so an
-- operator can retune the system without a deploy.
--
-- Every column on notification_rule_overrides is nullable, and null means
-- INHERIT. An override row is a set of deltas, not a copy: a registry default
-- that improves in a later release still reaches events an operator once
-- touched for one unrelated field.
--
-- Deliberately NOT overridable: `transactional`, `category`, `recipients`.
-- Making `transactional` editable would let an administrator silence a
-- password-change or payment-failure alert for a customer who never agreed to
-- that. A rule the operator can bend must never be the rule protecting the
-- customer FROM the operator.

CREATE TABLE IF NOT EXISTS "notification_rule_overrides" (
    "override_id"                   TEXT NOT NULL,
    "event_type"                    TEXT NOT NULL,
    "enabled"                       BOOLEAN,
    "priority"                      TEXT,
    "channels"                      JSONB,
    "retry_attempts"                INTEGER,
    "retry_backoff"                 TEXT,
    "retry_base_delay_minutes"      INTEGER,
    "escalation_after_failures"     INTEGER,
    "escalation_after_unread_hours" INTEGER,
    "expires_after_hours"           INTEGER,
    "notes"                         TEXT,
    "version"                       INTEGER NOT NULL DEFAULT 1,
    "changed_by"                    TEXT,
    "created_at"                    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"                    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_rule_overrides_pkey" PRIMARY KEY ("override_id")
);

-- One override per event: the loader merges a single row over the registry
-- default, and two rows for one event would be two answers.
CREATE UNIQUE INDEX IF NOT EXISTS "notification_rule_overrides_event_type_key"
    ON "notification_rule_overrides" ("event_type");

CREATE TABLE IF NOT EXISTS "notification_rule_revisions" (
    "revision_id"      TEXT NOT NULL,
    "override_id"      TEXT NOT NULL,
    "version"          INTEGER NOT NULL,
    "snapshot"         JSONB NOT NULL,
    "changes"          JSONB NOT NULL,
    "changed_by"       TEXT NOT NULL,
    "changed_by_email" TEXT NOT NULL,
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_rule_revisions_pkey" PRIMARY KEY ("revision_id")
);

CREATE INDEX IF NOT EXISTS "notification_rule_revisions_override_id_created_at_idx"
    ON "notification_rule_revisions" ("override_id", "created_at");

ALTER TABLE "notification_rule_revisions"
    DROP CONSTRAINT IF EXISTS "notification_rule_revisions_override_id_fkey";
ALTER TABLE "notification_rule_revisions"
    ADD CONSTRAINT "notification_rule_revisions_override_id_fkey"
    FOREIGN KEY ("override_id") REFERENCES "notification_rule_overrides"("override_id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Templates ────────────────────────────────────────────────────────────────
--
-- Absent = the caller's own copy is used, which is what every notification did
-- before this existed. A template is additive: it lets an operator take over
-- the wording of an event without any code path depending on one being present.

CREATE TABLE IF NOT EXISTS "notification_templates" (
    "template_id" TEXT NOT NULL,
    "event_type"  TEXT NOT NULL,
    "channel"     TEXT NOT NULL,
    "locale"      TEXT NOT NULL,
    "subject"     TEXT,
    "title"       TEXT NOT NULL,
    "body"        TEXT NOT NULL,
    "is_active"   BOOLEAN NOT NULL DEFAULT true,
    "version"     INTEGER NOT NULL DEFAULT 1,
    "changed_by"  TEXT,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("template_id")
);

-- One template per event per channel per language. Greek and English are both
-- first-class here — a template that existed in only one language would send
-- half the customers copy in a language they did not choose.
CREATE UNIQUE INDEX IF NOT EXISTS "notification_templates_event_type_channel_locale_key"
    ON "notification_templates" ("event_type", "channel", "locale");

CREATE INDEX IF NOT EXISTS "notification_templates_event_type_is_active_idx"
    ON "notification_templates" ("event_type", "is_active");

CREATE TABLE IF NOT EXISTS "notification_template_revisions" (
    "revision_id"      TEXT NOT NULL,
    "template_id"      TEXT NOT NULL,
    "version"          INTEGER NOT NULL,
    "snapshot"         JSONB NOT NULL,
    "changes"          JSONB NOT NULL,
    "changed_by"       TEXT NOT NULL,
    "changed_by_email" TEXT NOT NULL,
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_template_revisions_pkey" PRIMARY KEY ("revision_id")
);

CREATE INDEX IF NOT EXISTS "notification_template_revisions_template_id_created_at_idx"
    ON "notification_template_revisions" ("template_id", "created_at");

ALTER TABLE "notification_template_revisions"
    DROP CONSTRAINT IF EXISTS "notification_template_revisions_template_id_fkey";
ALTER TABLE "notification_template_revisions"
    ADD CONSTRAINT "notification_template_revisions_template_id_fkey"
    FOREIGN KEY ("template_id") REFERENCES "notification_templates"("template_id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Global settings ──────────────────────────────────────────────────────────
--
-- Key/value rather than a column per setting, because the alternative is a
-- migration every time an operator needs a new dial — precisely the deploy this
-- layer exists to avoid. Keys and their types are declared in
-- lib/notifications/settings.ts, so values are still validated and the admin UI
-- is generated from the declaration rather than hand-maintained.

CREATE TABLE IF NOT EXISTS "notification_settings" (
    "key"        TEXT NOT NULL,
    "value"      JSONB NOT NULL,
    "changed_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("key")
);
