-- Rollback for the 2026-08-21 dev gap_definitions alignment (dev <- prod).
--
-- These 5 rows existed ONLY in dev. They are the pre-Phase-3 `ai_check`
-- generation: their detection_logic is `{ "check": "<a question for a model>" }`,
-- which hasEvaluableRule() rejects by design, so despite is_active = true they
-- could never produce a gap. lib/gaps/authored-catalogue.ts states the policy
-- outright: "anything shaped { check: "does the policy...?" } ... are prompts,
-- not rules ... a catalogue entry that can never fire is a capability claimed
-- and not delivered."
--
-- prisma/seed.ts already carries all five with isActive: false, and
-- tests/unit/gap-rule-catalogue-trace.test.ts fails if any ai_check definition
-- is marked active there. Dev's rows predate that fix (written 2026-04-15, last
-- touched 2026-07-12) and were never refreshed. Production never had them.
--
-- Restoring these re-creates 5 inert definitions that dev alone carries.
INSERT INTO public.gap_definitions (gap_definition_id, slug, name, title, description, line_of_business, severity, default_severity, rule_id, detection_logic, is_active, created_at, updated_at, scope, version, changed_at, changed_by, severity_validated_at, severity_validated_by, severity_rationale) VALUES ('cmnzqpg8z000znuu5q2nvoyfk','health-outpatient','Outpatient Care','Limited Outpatient Coverage','This policy might focus only on hospitalization, leaving you exposed for doctor visits and tests.','health','medium','medium','ai_check','{"check": "Does this policy cover outpatient visits, diagnostic tests, or doctor consultations outside of a hospital?"}'::jsonb,'t','2026-04-15 07:39:37.475','2026-07-12 22:39:39.163','document','1',NULL,NULL,NULL,NULL,NULL);
INSERT INTO public.gap_definitions (gap_definition_id, slug, name, title, description, line_of_business, severity, default_severity, rule_id, detection_logic, is_active, created_at, updated_at, scope, version, changed_at, changed_by, severity_validated_at, severity_validated_by, severity_rationale) VALUES ('cmnzqpgfb0010nuu5pxqtzmw0','home-earthquake','Earthquake Coverage','Earthquake Vulnerability','Standard home policies often exclude earthquake damage unless explicitly added.','home','critical','critical','ai_check','{"check": "Does the policy explicitly cover ''Earthquake'' damage?"}'::jsonb,'t','2026-04-15 07:39:37.703','2026-07-12 22:39:39.296','document','1',NULL,NULL,NULL,NULL,NULL);
INSERT INTO public.gap_definitions (gap_definition_id, slug, name, title, description, line_of_business, severity, default_severity, rule_id, detection_logic, is_active, created_at, updated_at, scope, version, changed_at, changed_by, severity_validated_at, severity_validated_by, severity_rationale) VALUES ('cmnzqphb20015nuu5iqsu2axr','low_deductible_premium_waste','Low Deductible Waste','Potential Premium Savings','Your deductible is at the minimum level, which means you may be paying higher premiums than necessary. Consider raising the deductible to reduce costs.','all','low','low','ai_check','{"check": "Is the policy deductible/excess at the minimum available level for this type of coverage? If so, suggest raising it to reduce premium costs."}'::jsonb,'t','2026-04-15 07:39:38.847','2026-07-12 22:39:40.024','document','1',NULL,NULL,NULL,NULL,NULL);
INSERT INTO public.gap_definitions (gap_definition_id, slug, name, title, description, line_of_business, severity, default_severity, rule_id, detection_logic, is_active, created_at, updated_at, scope, version, changed_at, changed_by, severity_validated_at, severity_validated_by, severity_rationale) VALUES ('cmnzqpg2m000ynuu5fxkbf1yl','motor-legal','Legal Protection','No Legal Protection','Legal expenses can be high. Consider adding legal protection.','motor','medium','medium','ai_check','{"check": "Does the policy include ''Legal Protection'' or ''Legal Assistance''?"}'::jsonb,'t','2026-04-15 07:39:37.246','2026-07-12 22:39:39.003','document','1',NULL,NULL,NULL,NULL,NULL);
INSERT INTO public.gap_definitions (gap_definition_id, slug, name, title, description, line_of_business, severity, default_severity, rule_id, detection_logic, is_active, created_at, updated_at, scope, version, changed_at, changed_by, severity_validated_at, severity_validated_by, severity_rationale) VALUES ('cmnzqpfw5000xnuu55l7ggy55','motor-theft','Theft Coverage','Missing Theft Protection','Your policy does not appear to cover theft, which is a significant risk in urban areas.','motor','high','high','ai_check','{"check": "Does the policy explicitly cover theft, burglary, or stolen vehicle?"}'::jsonb,'t','2026-04-15 07:39:37.014','2026-07-12 22:39:38.739','document','1',NULL,NULL,NULL,NULL,NULL);

-- The 4 gap_instances that referenced motor-legal / motor-theft (dev only).
-- The FK is ON DELETE RESTRICT, so these had to go first.
--
-- Every one has rule_id = NULL and engine_version = NULL: they were NOT produced
-- by decideGapsForPolicy, which stamps provenance on everything it writes. They
-- are pre-engine AI findings from a rule that can no longer fire, and they were
-- still status='open', i.e. rendering in dev's wallet as live findings. One
-- motor-theft instance carries severity 'medium' while its definition says
-- 'high' — the severity-as-a-literal-at-the-write-site bug the current engine
-- exists to prevent.
--
-- Restore only alongside the definitions above; the FK requires them.
INSERT INTO public.gap_instances (gap_instance_id, gap_definition_id, policy_id, status, severity, detected_at) VALUES
  ('cmryp83qc0007s3i51alx5l7b','cmnzqpg2m000ynuu5fxkbf1yl','cmrynz3ls0003dacacfbnz4iu','open','medium','2026-07-24 08:49:11.652'),
  ('cmsteishr002yf566fnjzaxae','cmnzqpg2m000ynuu5fxkbf1yl','cmstecqg5001of5663zv1vfhc','open','medium','2026-08-14 20:30:22.982'),
  ('cmryp83hd0005s3i5kupo3gyk','cmnzqpfw5000xnuu55l7ggy55','cmrynz3ls0003dacacfbnz4iu','open','high',  '2026-07-24 08:49:11.328'),
  ('cmsteishr002xf566lazbc8t2','cmnzqpfw5000xnuu55l7ggy55','cmstecqg5001of5663zv1vfhc','open','medium','2026-08-14 20:30:22.982');
