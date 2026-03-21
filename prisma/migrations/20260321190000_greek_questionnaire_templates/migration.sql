-- Pre-built Greek-market questionnaire templates
-- 5 templates covering the most common insurance lines in Greece

INSERT INTO "questionnaire_templates" ("template_id", "name", "line_of_business", "version", "questions", "is_active", "created_at", "updated_at")
VALUES
(
    'tpl-motor-intake',
    'Motor Insurance Intake',
    'motor',
    1,
    '[
        {"id":"q1","type":"text","label":"Vehicle make & model","labelEl":"Μάρκα & μοντέλο οχήματος","required":true},
        {"id":"q2","type":"text","label":"License plate number","labelEl":"Αριθμός πινακίδας","required":true},
        {"id":"q3","type":"number","label":"Year of manufacture","labelEl":"Έτος κατασκευής","required":true},
        {"id":"q4","type":"select","label":"Current coverage type","labelEl":"Τρέχον είδος κάλυψης","required":true,"options":[{"label":"Third party only","labelEl":"Μόνο αστική ευθύνη","value":"third_party"},{"label":"Third party + fire/theft","labelEl":"Αστική ευθύνη + πυρκαγιά/κλοπή","value":"tpft"},{"label":"Comprehensive","labelEl":"Μικτή/Πλήρης","value":"comprehensive"},{"label":"No current coverage","labelEl":"Χωρίς τρέχουσα κάλυψη","value":"none"}]},
        {"id":"q5","type":"number","label":"Annual mileage (km)","labelEl":"Ετήσια χιλιόμετρα","required":false},
        {"id":"q6","type":"select","label":"Parking type","labelEl":"Τύπος στάθμευσης","required":false,"options":[{"label":"Private garage","labelEl":"Ιδιωτικό γκαράζ","value":"garage"},{"label":"Street parking","labelEl":"Στάθμευση στο δρόμο","value":"street"},{"label":"Gated lot","labelEl":"Κλειστός χώρος","value":"gated"}]},
        {"id":"q7","type":"boolean","label":"Any claims in the last 3 years?","labelEl":"Ζημιές τα τελευταία 3 χρόνια;","required":true},
        {"id":"q8","type":"text","label":"Additional drivers (names, ages)","labelEl":"Πρόσθετοι οδηγοί (ονόματα, ηλικίες)","required":false}
    ]'::jsonb,
    true,
    NOW(),
    NOW()
),
(
    'tpl-home-assessment',
    'Home Insurance Assessment',
    'home',
    1,
    '[
        {"id":"q1","type":"select","label":"Property type","labelEl":"Τύπος ακινήτου","required":true,"options":[{"label":"Apartment","labelEl":"Διαμέρισμα","value":"apartment"},{"label":"Detached house","labelEl":"Μονοκατοικία","value":"detached"},{"label":"Semi-detached","labelEl":"Μεζονέτα","value":"semi"},{"label":"Holiday home","labelEl":"Εξοχικό","value":"holiday"}]},
        {"id":"q2","type":"number","label":"Property size (m²)","labelEl":"Εμβαδόν (τ.μ.)","required":true},
        {"id":"q3","type":"number","label":"Year built","labelEl":"Έτος κατασκευής","required":true},
        {"id":"q4","type":"number","label":"Estimated rebuild value (€)","labelEl":"Εκτιμώμενη αξία ανοικοδόμησης (€)","required":false},
        {"id":"q5","type":"number","label":"Contents value (€)","labelEl":"Αξία περιεχομένων (€)","required":false},
        {"id":"q6","type":"boolean","label":"Earthquake coverage needed?","labelEl":"Χρειάζεστε κάλυψη σεισμού;","required":true},
        {"id":"q7","type":"boolean","label":"Is the property in a flood-risk zone?","labelEl":"Βρίσκεται σε ζώνη κινδύνου πλημμύρας;","required":true},
        {"id":"q8","type":"boolean","label":"Security alarm installed?","labelEl":"Έχει εγκατασταθεί σύστημα συναγερμού;","required":false},
        {"id":"q9","type":"select","label":"Occupancy","labelEl":"Κατοίκηση","required":true,"options":[{"label":"Primary residence","labelEl":"Κύρια κατοικία","value":"primary"},{"label":"Rented out","labelEl":"Ενοικιαζόμενο","value":"rented"},{"label":"Vacant / holiday use","labelEl":"Κενό / εξοχική χρήση","value":"vacant"}]}
    ]'::jsonb,
    true,
    NOW(),
    NOW()
),
(
    'tpl-health-needs',
    'Health Insurance Needs Analysis',
    'health',
    1,
    '[
        {"id":"q1","type":"number","label":"Your age","labelEl":"Ηλικία σας","required":true},
        {"id":"q2","type":"number","label":"Number of family members to cover","labelEl":"Αριθμός μελών οικογένειας προς κάλυψη","required":true},
        {"id":"q3","type":"boolean","label":"Any pre-existing conditions?","labelEl":"Υπάρχουν προϋπάρχουσες παθήσεις;","required":true},
        {"id":"q4","type":"select","label":"Desired hospital room type","labelEl":"Επιθυμητός τύπος δωματίου","required":false,"options":[{"label":"Shared ward","labelEl":"Κοινός θάλαμος","value":"shared"},{"label":"Semi-private","labelEl":"Ημι-ιδιωτικό","value":"semi"},{"label":"Private","labelEl":"Ιδιωτικό","value":"private"}]},
        {"id":"q5","type":"boolean","label":"Need dental coverage?","labelEl":"Χρειάζεστε οδοντιατρική κάλυψη;","required":false},
        {"id":"q6","type":"boolean","label":"Need maternity coverage?","labelEl":"Χρειάζεστε κάλυψη μητρότητας;","required":false},
        {"id":"q7","type":"select","label":"Preferred budget range","labelEl":"Προτιμώμενο εύρος προϋπολογισμού","required":false,"options":[{"label":"€30-60/month","labelEl":"€30-60/μήνα","value":"low"},{"label":"€60-120/month","labelEl":"€60-120/μήνα","value":"mid"},{"label":"€120+/month","labelEl":"€120+/μήνα","value":"high"}]},
        {"id":"q8","type":"boolean","label":"Interested in outpatient coverage?","labelEl":"Ενδιαφέρεστε για εξωνοσοκομειακή κάλυψη;","required":false}
    ]'::jsonb,
    true,
    NOW(),
    NOW()
),
(
    'tpl-life-review',
    'Life Insurance Review',
    'life',
    1,
    '[
        {"id":"q1","type":"number","label":"Your age","labelEl":"Ηλικία σας","required":true},
        {"id":"q2","type":"select","label":"Marital status","labelEl":"Οικογενειακή κατάσταση","required":true,"options":[{"label":"Single","labelEl":"Ελεύθερος/η","value":"single"},{"label":"Married","labelEl":"Παντρεμένος/η","value":"married"},{"label":"Divorced","labelEl":"Διαζευγμένος/η","value":"divorced"},{"label":"Widowed","labelEl":"Χήρος/α","value":"widowed"}]},
        {"id":"q3","type":"number","label":"Number of dependents","labelEl":"Αριθμός εξαρτώμενων","required":true},
        {"id":"q4","type":"number","label":"Annual household income (€)","labelEl":"Ετήσιο οικογενειακό εισόδημα (€)","required":false},
        {"id":"q5","type":"number","label":"Outstanding mortgage/loans (€)","labelEl":"Εκκρεμή στεγαστικά/δάνεια (€)","required":false},
        {"id":"q6","type":"boolean","label":"Do you have existing life coverage?","labelEl":"Έχετε υπάρχουσα ασφάλιση ζωής;","required":true},
        {"id":"q7","type":"select","label":"Primary goal","labelEl":"Κύριος στόχος","required":true,"options":[{"label":"Family protection","labelEl":"Οικογενειακή προστασία","value":"family"},{"label":"Mortgage protection","labelEl":"Στεγαστική προστασία","value":"mortgage"},{"label":"Savings / investment","labelEl":"Αποταμίευση / επένδυση","value":"savings"},{"label":"Retirement planning","labelEl":"Σχεδιασμός σύνταξης","value":"retirement"}]},
        {"id":"q8","type":"boolean","label":"Interested in critical illness cover?","labelEl":"Ενδιαφέρεστε για κάλυψη σοβαρών ασθενειών;","required":false}
    ]'::jsonb,
    true,
    NOW(),
    NOW()
),
(
    'tpl-pet-coverage',
    'Pet Insurance Questionnaire',
    'pet',
    1,
    '[
        {"id":"q1","type":"select","label":"Type of pet","labelEl":"Είδος κατοικιδίου","required":true,"options":[{"label":"Dog","labelEl":"Σκύλος","value":"dog"},{"label":"Cat","labelEl":"Γάτα","value":"cat"},{"label":"Other","labelEl":"Άλλο","value":"other"}]},
        {"id":"q2","type":"text","label":"Breed","labelEl":"Ράτσα","required":true},
        {"id":"q3","type":"number","label":"Age of pet (years)","labelEl":"Ηλικία κατοικιδίου (έτη)","required":true},
        {"id":"q4","type":"boolean","label":"Is the pet neutered/spayed?","labelEl":"Είναι στειρωμένο;","required":false},
        {"id":"q5","type":"boolean","label":"Any known health conditions?","labelEl":"Γνωστά προβλήματα υγείας;","required":true},
        {"id":"q6","type":"boolean","label":"Is the pet microchipped?","labelEl":"Έχει τσιπάκι;","required":false},
        {"id":"q7","type":"select","label":"Coverage priority","labelEl":"Προτεραιότητα κάλυψης","required":true,"options":[{"label":"Vet bills only","labelEl":"Μόνο κτηνιατρικά","value":"vet"},{"label":"Vet + liability","labelEl":"Κτηνιατρικά + αστική ευθύνη","value":"vet_liability"},{"label":"Comprehensive","labelEl":"Πλήρης","value":"comprehensive"}]}
    ]'::jsonb,
    true,
    NOW(),
    NOW()
)
ON CONFLICT ("template_id") DO UPDATE SET
    "questions" = EXCLUDED."questions",
    "name" = EXCLUDED."name",
    "updated_at" = NOW();
