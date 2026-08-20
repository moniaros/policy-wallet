-- Gate 3b: record WHO agreed a severity is right, per definition.
--
-- Detection is a question of fact and is authored in code. Severity is an
-- underwriting judgement and is not. Until Phase 7 the only way to express
-- "an underwriter has agreed" was a single global boolean in TypeScript
-- (SEVERITY_UNDERWRITER_VALIDATED), which could say nothing about WHICH rules
-- had been reviewed, by WHOM, or on what grounds — so sign-off was all-or-
-- nothing, and therefore never happened.
--
-- NULL severity_validated_at means not validated. That is the default, and it
-- is the honest state for every row today.

ALTER TABLE "gap_definitions"
  ADD COLUMN IF NOT EXISTS "severity_validated_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "severity_validated_by" TEXT,
  ADD COLUMN IF NOT EXISTS "severity_rationale" TEXT;

-- The review packet and the caveat both ask "which active definitions are still
-- unvalidated?" on every render.
CREATE INDEX IF NOT EXISTS "gap_definitions_severity_validated_at_idx"
  ON "gap_definitions" ("severity_validated_at");
