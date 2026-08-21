-- Rollback for the 2026-08-21 purge of AI-minted gap_definitions from PRODUCTION.
--
-- 41 rows. Every one was created by the analysis pipeline at RUNTIME, one per
-- run, between 2026-07-13 and 2026-08-09:
--   * rule_id prefixed `ai_`
--   * detection_logic IDENTICAL across all 41: {"source": "ai_clarity_pipeline"}
--   * description IDENTICAL across all 41: 'Auto-created from AI clarity analysis'
--   * name/title are just the slug, title-cased
--
-- They carry no information beyond their slug, and several are naming-drift
-- duplicates of one another (cyber_risk_gap / cyber-risk-gap,
-- own_damage / own_vehicle_damage / own-damage-gap, glass_breakage /
-- no-glass-breakage / no-glass-coverage).
--
-- CLAUDE.md: "nothing may create a GapDefinition from model output."
-- hasEvaluableRule() rejects the {source:...} shape, so all 41 were inert even
-- before they were deactivated. Zero gap_instances referenced them (production
-- had zero gap_instances of any kind at the time of the purge).
--
-- They are NOT reference data and were in no seed. Restoring them re-creates
-- residue from a bug that has since been fixed.
--
-- scope='document', version='1', is_active=false, changed_at/changed_by and the
-- severity_validated_* columns were NULL on every row.
INSERT INTO public.gap_definitions
  (gap_definition_id, slug, name, title, description, line_of_business,
   severity, default_severity, rule_id, created_at,
   detection_logic, is_active, updated_at, scope, version)
SELECT v.id, v.slug, v.name, v.title, v.description, v.lob,
       v.severity, v.default_severity, v.rule_id, v.created_at::timestamp,
       '{"source": "ai_clarity_pipeline"}'::jsonb, false, v.created_at::timestamp, 'document', '1'
FROM (VALUES
  ('cmrnlm1zs001zqbzirknd5bvj','communicable_disease_gap','Communicable Disease Gap','Communicable Disease Gap','Auto-created from AI clarity analysis','liability','critical','critical','ai_communicable_disease_gap','2026-07-16 14:22:36.184'),
  ('cmrnlm1ef001qqbzi54v0c9k7','communicable_disease_liability','Communicable Disease Liability','Communicable Disease Liability','Auto-created from AI clarity analysis','liability','medium','medium','ai_communicable_disease_liability','2026-07-16 14:22:35.416'),
  ('cmrnlm107001kqbzi69sevryd','cyber_liability','Cyber Liability','Cyber Liability','Auto-created from AI clarity analysis','liability','medium','medium','ai_cyber_liability','2026-07-16 14:22:34.904'),
  ('cmrnlm1so001wqbzirdnzfdmk','cyber_risk_gap','Cyber Risk Gap','Cyber Risk Gap','Auto-created from AI clarity analysis','liability','critical','critical','ai_cyber_risk_gap','2026-07-16 14:22:35.929'),
  ('cmruhmg3i002d36iel4shu2h5','cyber-risk-gap','Cyber-Risk-Gap','Cyber-Risk-Gap','Auto-created from AI clarity analysis','liability','medium','medium','ai_cyber-risk-gap','2026-07-21 10:05:19.23'),
  ('cmrun1mh00021zprs24723ubj','elevator_maintenance_risk','Elevator Maintenance Risk','Elevator Maintenance Risk','Auto-created from AI clarity analysis','liability','medium','medium','ai_elevator_maintenance_risk','2026-07-21 12:37:05.412'),
  ('cmrun1m2o001vzprsm0tzm9gv','employer_liability_gap','Employer Liability Gap','Employer Liability Gap','Auto-created from AI clarity analysis','liability','medium','medium','ai_employer_liability_gap','2026-07-21 12:37:04.897'),
  ('cmrnlm17b001nqbzi6snkzquj','employers_liability','Employers Liability','Employers Liability','Auto-created from AI clarity analysis','liability','medium','medium','ai_employers_liability','2026-07-16 14:22:35.16'),
  ('cmrun1mo60024zprsrozjduwd','family_exclusion_gap','Family Exclusion Gap','Family Exclusion Gap','Auto-created from AI clarity analysis','liability','medium','medium','ai_family_exclusion_gap','2026-07-21 12:37:05.67'),
  ('cmrkj13a1001d14lkrzp2ivbp','fire','Fire','Fire','Auto-created from AI clarity analysis','motor','medium','medium','ai_fire','2026-07-14 10:47:00.313'),
  ('cmrun1lqs001szprsmocvefew','fire_explosion_liability_gap','Fire Explosion Liability Gap','Fire Explosion Liability Gap','Auto-created from AI clarity analysis','liability','medium','medium','ai_fire_explosion_liability_gap','2026-07-21 12:37:04.469'),
  ('cmrkj132v001a14lk8damu88g','glass_breakage','Glass Breakage','Glass Breakage','Auto-created from AI clarity analysis','motor','medium','medium','ai_glass_breakage','2026-07-14 10:47:00.055'),
  ('cmrj2l30h001311c3b1ujewri','high-deductible','High-Deductible','High-Deductible','Auto-created from AI clarity analysis','health','medium','medium','ai_high-deductible','2026-07-13 10:18:53.441'),
  ('cmrj2l5bt002011c3ovifxicv','limited_emergency_care','Limited Emergency Care','Limited Emergency Care','Auto-created from AI clarity analysis','health','low','low','ai_limited_emergency_care','2026-07-13 10:18:56.442'),
  ('cmrun1m9u001yzprshd7t5p9z','low_liability_limits','Low Liability Limits','Low Liability Limits','Auto-created from AI clarity analysis','liability','medium','medium','ai_low_liability_limits','2026-07-21 12:37:05.155'),
  ('cmrj2l3qn001c11c3w8i8pv28','low-outpatient-limit','Low-Outpatient-Limit','Low-Outpatient-Limit','Auto-created from AI clarity analysis','health','medium','medium','ai_low-outpatient-limit','2026-07-13 10:18:54.383'),
  ('cmrkj13h7001g14lkvf0ljus5','malicious_acts_terrorism','Malicious Acts Terrorism','Malicious Acts Terrorism','Auto-created from AI clarity analysis','motor','medium','medium','ai_malicious_acts_terrorism','2026-07-14 10:47:00.571'),
  ('cmsiu7rt20021xtrgx3rt6hm6','maternity-coverage','Maternity-Coverage','Maternity-Coverage','Auto-created from AI clarity analysis','health','medium','medium','ai_maternity-coverage','2026-08-07 11:04:17.798'),
  ('cmrj2l3jh001911c36mf1g0c9','maternity-exclusion','Maternity-Exclusion','Maternity-Exclusion','Auto-created from AI clarity analysis','health','medium','medium','ai_maternity-exclusion','2026-07-13 10:18:54.126'),
  ('cmrj2l54o001x11c3fh089zgs','medical_assistance_age_limit','Medical Assistance Age Limit','Medical Assistance Age Limit','Auto-created from AI clarity analysis','health','low','low','ai_medical_assistance_age_limit','2026-07-13 10:18:56.185'),
  ('cmrj2l4c3001l11c31rg81w13','mental_health_exclusion','Mental Health Exclusion','Mental Health Exclusion','Auto-created from AI clarity analysis','health','high','high','ai_mental_health_exclusion','2026-07-13 10:18:55.156'),
  ('cmrj2l3cc001611c3d2eo5gdx','mental-health-exclusion','Mental-Health-Exclusion','Mental-Health-Exclusion','Auto-created from AI clarity analysis','health','medium','medium','ai_mental-health-exclusion','2026-07-13 10:18:53.869'),
  ('cmrqvj14l00194oputzput5qh','missing-policy-details','Missing-Policy-Details','Missing-Policy-Details','Auto-created from AI clarity analysis','group_health','medium','medium','ai_missing-policy-details','2026-07-18 21:23:29.781'),
  ('cmslc4p12001fz8m6zydak5ji','no-collision-coverage','No-Collision-Coverage','No-Collision-Coverage','Auto-created from AI clarity analysis','motor','medium','medium','ai_no-collision-coverage','2026-08-09 05:01:19.67'),
  ('cms7j7yey002k101to3ewq1jx','no-glass-breakage','No-Glass-Breakage','No-Glass-Breakage','Auto-created from AI clarity analysis','motor','low','low','ai_no-glass-breakage','2026-07-30 13:11:02.564'),
  ('cmslc4pjz001gz8m6hvfsspgx','no-glass-coverage','No-Glass-Coverage','No-Glass-Coverage','Auto-created from AI clarity analysis','motor','low','low','ai_no-glass-coverage','2026-08-09 05:01:20.351'),
  ('cmrkj12jq001414lkkfe7w4d1','own_damage','Own Damage','Own Damage','Auto-created from AI clarity analysis','motor','medium','medium','ai_own_damage','2026-07-14 10:46:59.367'),
  ('cmrkj13od001j14lkkrx4ip1k','own_vehicle_damage','Own Vehicle Damage','Own Vehicle Damage','Auto-created from AI clarity analysis','motor','high','high','ai_own_vehicle_damage','2026-07-14 10:47:00.829'),
  ('cmrxca5fz001r11jygz1d17vn','own-damage-gap','Own-Damage-Gap','Own-Damage-Gap','Auto-created from AI clarity analysis','motor','medium','medium','ai_own-damage-gap','2026-07-23 09:59:05.999'),
  ('cmrj2l4xj001u11c3tkqe26qu','pregnancy_childbirth_exclusion','Pregnancy Childbirth Exclusion','Pregnancy Childbirth Exclusion','Auto-created from AI clarity analysis','health','medium','medium','ai_pregnancy_childbirth_exclusion','2026-07-13 10:18:55.928'),
  ('cms9pwxgh001k1kto9zf39qba','preventive-care-gap','Preventive-Care-Gap','Preventive-Care-Gap','Auto-created from AI clarity analysis','group_health','medium','medium','ai_preventive-care-gap','2026-08-01 01:53:57.857'),
  ('cmrnlm0t3001hqbzin99dkcyt','product_liability','Product Liability','Product Liability','Auto-created from AI clarity analysis','liability','medium','medium','ai_product_liability','2026-07-16 14:22:34.647'),
  ('cmrnlm0h8001eqbziv5jnvb3h','professional_liability','Professional Liability','Professional Liability','Auto-created from AI clarity analysis','liability','medium','medium','ai_professional_liability','2026-07-16 14:22:34.221'),
  ('cmrnlm1lk001tqbzi780m0gwl','professional_liability_gap','Professional Liability Gap','Professional Liability Gap','Auto-created from AI clarity analysis','liability','critical','critical','ai_professional_liability_gap','2026-07-16 14:22:35.672'),
  ('cmrj2l44x001i11c3is7ehss5','rehab-exclusion','Rehab-Exclusion','Rehab-Exclusion','Auto-created from AI clarity analysis','health','medium','medium','ai_rehab-exclusion','2026-07-13 10:18:54.897'),
  ('cmrj2l4j9001o11c3vd9oawmd','restrictive_hospital_definition','Restrictive Hospital Definition','Restrictive Hospital Definition','Auto-created from AI clarity analysis','health','medium','medium','ai_restrictive_hospital_definition','2026-07-13 10:18:55.413'),
  ('cmrkj12vn001714lk8h5rx3cx','theft','Theft','Theft','Auto-created from AI clarity analysis','motor','medium','medium','ai_theft','2026-07-14 10:46:59.796'),
  ('cmrj2l4qe001r11c3r37rwvi5','usa_hospitalization_cost','Usa Hospitalization Cost','Usa Hospitalization Cost','Auto-created from AI clarity analysis','health','critical','critical','ai_usa_hospitalization_cost','2026-07-13 10:18:55.671'),
  ('cmrj2l3xs001f11c3zfiuq2t3','usa-copayment','Usa-Copayment','Usa-Copayment','Auto-created from AI clarity analysis','health','medium','medium','ai_usa-copayment','2026-07-13 10:18:54.64'),
  ('cmrnlm26w0022qbziwfjsqiiv','vehicle_vessel_aircraft_liability_gap','Vehicle Vessel Aircraft Liability Gap','Vehicle Vessel Aircraft Liability Gap','Auto-created from AI clarity analysis','liability','critical','critical','ai_vehicle_vessel_aircraft_liability_gap','2026-07-16 14:22:36.44'),
  ('cmrqruiqa002hvsmanqjbscks','waiting-period-disability','Waiting-Period-Disability','Waiting-Period-Disability','Auto-created from AI clarity analysis','group_health','medium','medium','ai_waiting-period-disability','2026-07-18 19:40:27.346')
) AS v(id, slug, name, title, description, lob, severity, default_severity, rule_id, created_at);
