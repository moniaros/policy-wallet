-- Life Context Risk Assessment Engine.
--
-- Source of truth: docs/audits/risk-engine-context-awareness-2026-08.md.
--
-- Two changes, both purely additive and idempotent.
--
-- 1. policyholder_profiles gains the contextual factors the risk catalog
--    conditions on (children, residence type, tenants, business ownership and
--    employees, savings, valuables, activities, cyber exposure, retirement
--    planning), plus two columns that are load-bearing for correctness rather
--    than for content:
--
--    * cover_held_elsewhere — the engine previously read "not in the wallet" as
--      "does not exist". Greek mortgage lending routinely REQUIRES fire cover on
--      the security and commonly bundles assigned borrower's life cover, so the
--      profile state that most strongly triggered the old mortgage and home
--      rules was also the state in which the customer already held both.
--
--    * answered_fields — the risk columns are NOT NULL with defaults (false / 0),
--      so a profile nobody ever filled in was byte-identical to one whose owner
--      answered "no" to everything. Rules therefore under-fired for every user
--      who never found the wizard, while the AI prompt asserted, as fact, that
--      the person owned no home and had no vehicles. This records what was
--      actually asked. Nothing is backfilled: `isColumnKnown` also treats any
--      non-default stored value as an answer, so every profile written before
--      this migration keeps exactly the knownness its data implies.
--
--    New booleans/counters default to the same "absent" values as their
--    predecessors, which is safe precisely BECAUSE answered_fields now exists to
--    distinguish that default from a declaration.
--
-- 2. recommendation_instances gains the assessment payload. Each recommendation
--    must state the risk, why it applies, the expected impact, the priority, the
--    suggested solution and a confidence level; title/description/personal_reason
--    already carry the first three, so only the remainder are added here rather
--    than duplicating a parallel set of columns.
--
-- risk_status is nullable and left NULL on existing rows on purpose: those rows
-- were written by the old engine and we do not know which of the six states they
-- belong to. The reader treats NULL as "legacy" and renders the card without a
-- status chip rather than guessing one.

-- ── 1. Contextual factors ───────────────────────────────────────────────────
ALTER TABLE "policyholder_profiles"
    ADD COLUMN IF NOT EXISTS "children_count"       INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "residence_type"       TEXT,
    ADD COLUMN IF NOT EXISTS "properties_owned"     INTEGER,
    ADD COLUMN IF NOT EXISTS "rents_out_property"   BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "owns_boat"            BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "owns_business"        BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "business_employees"   INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "savings_amount"       DECIMAL(65,30),
    ADD COLUMN IF NOT EXISTS "valuables_value"      DECIMAL(65,30),
    ADD COLUMN IF NOT EXISTS "activities"           JSONB,
    ADD COLUMN IF NOT EXISTS "cyber_exposure"       TEXT,
    ADD COLUMN IF NOT EXISTS "retirement_planning"  BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "cover_held_elsewhere" JSONB,
    ADD COLUMN IF NOT EXISTS "answered_fields"      JSONB,
    ADD COLUMN IF NOT EXISTS "pets_count"           INTEGER;

-- ── 1b. The score has to be able to say "not enough information" ────────────
-- Without this the dashboard reads the cached number and renders a confident
-- verdict for someone we have never asked a question. StatTiles already knows
-- how to show an unavailable score; it just needed to be told.
ALTER TABLE "protection_scores"
    ADD COLUMN IF NOT EXISTS "assessment_coverage" INTEGER;

-- ── 2. Assessment payload on recommendations ────────────────────────────────
ALTER TABLE "recommendation_instances"
    ADD COLUMN IF NOT EXISTS "risk_status"        TEXT,
    ADD COLUMN IF NOT EXISTS "confidence"         TEXT,
    ADD COLUMN IF NOT EXISTS "risk_id"            TEXT,
    ADD COLUMN IF NOT EXISTS "expected_impact"    JSONB,
    ADD COLUMN IF NOT EXISTS "suggested_solution" JSONB,
    ADD COLUMN IF NOT EXISTS "eligibility_note"   JSONB,
    ADD COLUMN IF NOT EXISTS "mitigations"        JSONB;

-- The recommendations list is read filtered by status and rendered grouped by
-- risk status; without this the grouped read is a scan of every row the user has.
CREATE INDEX IF NOT EXISTS "recommendation_instances_user_id_risk_status_idx"
    ON "recommendation_instances" ("user_id", "risk_status");
