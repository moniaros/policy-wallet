-- Rollback for the 2026-08-21 file-name residue migration.
--
-- These rows held the customer's ORIGINAL document file names in two sinks the
-- 2026-08-21 anonymization pass did not cover: activity_logs.description and
-- policy_analysis_steps.log_json. Both writers are fixed; this archives the
-- values before they are overwritten, per the export-before-destroying rule.
--
-- NOTE: the archived values ARE the personal data in question. This file is the
-- rollback of last resort, not a reference — delete it once the migration is
-- known good, or it becomes the leak it documents.
--
-- PROD (cquudefwfwrmvpftuhyl)
UPDATE public.activity_logs SET description = 'Uploaded document ΣΥΜΒΟΛΑΙΟ 91410928.pdf for policy 91410928' WHERE log_id = 'cmsol6y3d000lnpc9qn3ivmj3';
UPDATE public.activity_logs SET description = 'Uploaded document CASH IN SAFE.pdf for policy 73856718'       WHERE log_id = 'cmsol72qt000onpc9by9lzj0x';
UPDATE public.activity_logs SET description = 'Uploaded document cyber policy.pdf for policy 73283368'        WHERE log_id = 'cmsol774c000rnpc9rqnz1xij';

UPDATE public.policy_analysis_steps SET log_json = '{"fileName": "motor.pdf", "mimeType": "application/pdf", "remediation": {"model": "none", "provider": "gemini", "remediationType": "initial"}}'::jsonb       WHERE analysis_step_id = 'cmt2ekhdn000afk38m1q4n82k';
UPDATE public.policy_analysis_steps SET log_json = '{"fileName": "LIFE_POLICY.pdf", "mimeType": "application/pdf", "remediation": {"model": "none", "provider": "gemini", "remediationType": "initial"}}'::jsonb WHERE analysis_step_id = 'cmt2elwuu002hfk387icdwbxf';

-- DEV (lzqvtvjggylcujenlelh): 6 policy_analysis_steps rows carrying "motor.pdf"
-- in log_json, plus policies.acord_data.renewalHistory[].sourceDocumentName
-- ("ananeosi_2025.pdf" / "ananeosi_2026.pdf") on cmrfk79o2000511e7lbj9qnsx.
-- Dev values are E2E fixture names, not customer data; recorded for symmetry.
