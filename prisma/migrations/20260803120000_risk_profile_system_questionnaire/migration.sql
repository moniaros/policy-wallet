-- Household Risk Profile — the questionnaire that actually moves the score.
--
-- Audit finding F-01. Every other system template asks line-specific intake
-- questions that no code consumes: the answers are stored for the advisor to
-- read and reach nothing. The Protection Score is computed from
-- PolicyholderProfile, which until now was writable only from the two B2C
-- paths, so a client who never completed B2C onboarding scored against an
-- all-defaults profile — Life, Income, Liability and Lifestyle never became
-- applicable and no advisor action could change that.
--
-- These question ids are the canonical `risk.*` ids in
-- lib/services/questionnaire/profile-mapping.ts; `profileField` is carried
-- explicitly too so the mapping survives an id rename. Question types are
-- restricted to boolean/text/number/select — the only types QuestionnaireForm
-- renders. Data-only migration: no schema changes.
--
-- Deliberately NOT asked here: health conditions, family medical history,
-- height/weight, smoking status. Those are GDPR Art. 9 special-category data
-- and need an explicitly consented surface, not a general advisor form — the
-- mapping module refuses to write them for the same reason.

INSERT INTO "questionnaire_templates"
    ("template_id", "name", "line_of_business", "version", "questions", "is_active", "is_system", "created_at", "updated_at")
VALUES (
    'tpl-risk-profile',
    'Household Risk Profile',
    'other',
    1,
    '[
        {"id":"risk.dependentsCount","profileField":"dependentsCount","type":"number","label":"How many people depend on your income?","labelEl":"Πόσα άτομα εξαρτώνται από το εισόδημά σας;","required":true},
        {"id":"risk.employmentStatus","profileField":"employmentStatus","type":"select","label":"Employment status","labelEl":"Εργασιακή κατάσταση","required":true,"options":[{"label":"Employed","labelEl":"Μισθωτός/ή","value":"employed"},{"label":"Self-employed","labelEl":"Ελεύθερος/η επαγγελματίας","value":"self_employed"},{"label":"Retired","labelEl":"Συνταξιούχος","value":"retired"},{"label":"Not working","labelEl":"Χωρίς εργασία","value":"unemployed"},{"label":"Student","labelEl":"Φοιτητής/τρια","value":"student"}]},
        {"id":"risk.ownsHome","profileField":"ownsHome","type":"boolean","label":"Do you own the home you live in?","labelEl":"Είναι δική σας η κατοικία στην οποία μένετε;","required":true},
        {"id":"risk.mortgageAmount","profileField":"mortgageAmount","type":"number","label":"Outstanding mortgage balance in euro (leave blank if none)","labelEl":"Υπόλοιπο στεγαστικού δανείου σε ευρώ (κενό αν δεν υπάρχει)","required":false},
        {"id":"risk.vehiclesCount","profileField":"vehiclesCount","type":"number","label":"How many vehicles does your household own?","labelEl":"Πόσα οχήματα έχει το νοικοκυριό σας;","required":true},
        {"id":"risk.hasLoans","profileField":"hasLoans","type":"boolean","label":"Do you have any loans other than a mortgage?","labelEl":"Έχετε άλλα δάνεια εκτός από στεγαστικό;","required":true},
        {"id":"risk.loanAmount","profileField":"loanAmount","type":"number","label":"Total balance of those loans in euro","labelEl":"Συνολικό υπόλοιπο αυτών των δανείων σε ευρώ","required":false},
        {"id":"risk.maritalStatus","profileField":"maritalStatus","type":"select","label":"Marital status","labelEl":"Οικογενειακή κατάσταση","required":false,"options":[{"label":"Single","labelEl":"Άγαμος/η","value":"single"},{"label":"Married","labelEl":"Έγγαμος/η","value":"married"},{"label":"Partnered","labelEl":"Σε συμβίωση","value":"partnered"},{"label":"Divorced","labelEl":"Διαζευγμένος/η","value":"divorced"},{"label":"Widowed","labelEl":"Χήρος/α","value":"widowed"}]},
        {"id":"risk.travelsFrequently","profileField":"travelsFrequently","type":"boolean","label":"Do you travel abroad more than twice a year?","labelEl":"Ταξιδεύετε στο εξωτερικό πάνω από δύο φορές τον χρόνο;","required":false},
        {"id":"risk.hasPets","profileField":"hasPets","type":"boolean","label":"Do you have pets?","labelEl":"Έχετε κατοικίδια;","required":false},
        {"id":"risk.occupation","profileField":"occupation","type":"text","label":"What is your occupation?","labelEl":"Ποιο είναι το επάγγελμά σας;","required":false},
        {"id":"risk.drivingRecord","profileField":"drivingRecord","type":"select","label":"Your driving record over the last 5 years","labelEl":"Το ιστορικό οδήγησής σας την τελευταία 5ετία","required":false,"options":[{"label":"No claims","labelEl":"Καμία ζημιά","value":"clean"},{"label":"Minor violations","labelEl":"Μικροπαραβάσεις","value":"minor_violations"},{"label":"Serious violations","labelEl":"Σοβαρές παραβάσεις","value":"major_violations"},{"label":"One or more accidents","labelEl":"Ένα ή περισσότερα ατυχήματα","value":"accidents"}]}
    ]'::jsonb,
    true, true, NOW(), NOW()
)
ON CONFLICT ("template_id") DO UPDATE SET
    "questions" = EXCLUDED."questions",
    "name" = EXCLUDED."name",
    "line_of_business" = EXCLUDED."line_of_business",
    "version" = EXCLUDED."version",
    "is_system" = true,
    "is_active" = true,
    "updated_at" = NOW();
