-- Rollback export taken 2026-09-05 10:25Z from PRODUCTION (cquudefwfwrmvpftuhyl) immediately
-- before applying migration 20260905150000_gap_instance_run_provenance, whose
-- `DELETE FROM gap_instances WHERE analysis_run_id IS NULL` is destructive by shape.
-- Pre-check on prod: gap_rows=1, user_level_rows=0, orphan_rows=0 → the DELETE affects 0 rows;
-- the single row is attributable to a completed run of policy cmtnmck13000385ohunkc6rbi (the
-- document-gate smoke policy in the owner's wallet). Restore, if ever needed, into the PRE-migration
-- shape (no analysis_run_id / line_of_business columns).
INSERT INTO gap_instances (gap_instance_id, policy_id, gap_definition_id, severity, status, ai_explanation, ai_suggestion, detected_at, resolved_at, ai_explanation_el, ai_suggestion_el, user_id, validation_state, rule_id, rule_inputs, engine_version) VALUES (
  'cmtnmd31k001d85ohb1d1m0s3', 'cmtnmck13000385ohunkc6rbi', '41b016a8-c213-4ad3-ad0a-532c1df7161d', 'low', 'open',
  'No phone number for reporting an accident (Accident Care) was found in the policy data.',
  'Look up the Accident Care service number for Example Insurance Company Ltd and add it to your car documents so you have it handy in case of an emergency.',
  '2026-09-05T00:03:01.873', NULL,
  'Δεν βρέθηκε καταγεγραμμένος αριθμός τηλεφώνου για τη δήλωση ατυχήματος (Φροντίδα Ατυχήματος) στα στοιχεία του συμβολαίου.',
  'Αναζητήστε το τηλέφωνο της υπηρεσίας Φροντίδας Ατυχήματος της Example Insurance Company Ltd και προσθέστε το στα έγγραφα του αυτοκινήτου σας, ώστε να το έχετε πρόχειρο σε περίπτωση ανάγκης.',
  NULL, 'probable', 'acord_deterministic', '{"vehicle.accidentDeclarationPhone": null}'::jsonb, 'rules-1'
);
