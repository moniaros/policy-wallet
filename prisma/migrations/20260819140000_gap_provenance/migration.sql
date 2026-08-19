-- Provenance for coverage gaps.
--
-- Detection and severity are now rule decisions (lib/gap-detection.ts), not
-- model output. These columns record WHICH rule fired, WHAT it read, and under
-- which engine version — so a finding can be re-derived, audited, and argued
-- with. Before this, a gap was an assertion: the row said "critical" and
-- nothing recorded why, or that the value had come from a model choosing an
-- enum with no rubric behind it.
--
-- Nullable by design: rows written before the rewire have no rule to name, and
-- pretending otherwise would be the same dishonesty in a new column.
ALTER TABLE "gap_instances" ADD COLUMN IF NOT EXISTS "rule_id" TEXT;
ALTER TABLE "gap_instances" ADD COLUMN IF NOT EXISTS "rule_inputs" JSONB;
ALTER TABLE "gap_instances" ADD COLUMN IF NOT EXISTS "engine_version" TEXT;
