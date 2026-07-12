-- Professional system questionnaires (v2)
-- Replaces the thin v1 question sets with Greek-market-grade intake
-- instruments and adds two new system templates (travel, annual review).
-- Data-only migration: no schema changes. Question types are restricted to
-- boolean/text/number/select — the only types QuestionnaireForm renders.

-- ── Motor Insurance Intake (v2, 14 questions) ─────────────────────────────
INSERT INTO "questionnaire_templates"
    ("template_id", "name", "line_of_business", "version", "questions", "is_active", "is_system", "created_at", "updated_at")
VALUES (
    'tpl-motor-intake',
    'Motor Insurance Intake',
    'motor',
    2,
    '[
        {"id":"q1","type":"text","label":"Vehicle make and model","labelEl":"Μάρκα και μοντέλο οχήματος","required":true},
        {"id":"q2","type":"text","label":"License plate number","labelEl":"Αριθμός πινακίδας","required":true},
        {"id":"q3","type":"number","label":"Year of first registration","labelEl":"Έτος πρώτης κυκλοφορίας","required":true},
        {"id":"q4","type":"select","label":"Current coverage type","labelEl":"Τρέχον είδος κάλυψης","required":true,"options":[{"label":"Third party only","labelEl":"Μόνο αστική ευθύνη","value":"third_party"},{"label":"Third party + fire and theft","labelEl":"Αστική ευθύνη + πυρός/κλοπή","value":"tpft"},{"label":"Comprehensive","labelEl":"Μικτή (πλήρης)","value":"comprehensive"},{"label":"No current coverage","labelEl":"Χωρίς τρέχουσα κάλυψη","value":"none"}]},
        {"id":"q5","type":"text","label":"Current insurer","labelEl":"Τρέχουσα ασφαλιστική εταιρεία","required":false},
        {"id":"q6","type":"number","label":"Current annual premium (EUR)","labelEl":"Τρέχοντα ετήσια ασφάλιστρα (ευρώ)","required":false},
        {"id":"q7","type":"select","label":"Renewal month","labelEl":"Μήνας ανανέωσης","required":false,"options":[{"label":"January - March","labelEl":"Ιανουάριος - Μάρτιος","value":"q1"},{"label":"April - June","labelEl":"Απρίλιος - Ιούνιος","value":"q2"},{"label":"July - September","labelEl":"Ιούλιος - Σεπτέμβριος","value":"q3"},{"label":"October - December","labelEl":"Οκτώβριος - Δεκέμβριος","value":"q4"},{"label":"Not sure","labelEl":"Δεν είμαι σίγουρος/η","value":"unknown"}]},
        {"id":"q8","type":"select","label":"Annual mileage","labelEl":"Ετήσια χιλιόμετρα","required":true,"options":[{"label":"Under 5,000 km","labelEl":"Έως 5.000 χλμ.","value":"lt5k"},{"label":"5,000 - 10,000 km","labelEl":"5.000 - 10.000 χλμ.","value":"5to10k"},{"label":"10,000 - 20,000 km","labelEl":"10.000 - 20.000 χλμ.","value":"10to20k"},{"label":"Over 20,000 km","labelEl":"Άνω των 20.000 χλμ.","value":"gt20k"}]},
        {"id":"q9","type":"select","label":"Where is the vehicle usually parked overnight?","labelEl":"Πού σταθμεύει συνήθως το όχημα τη νύχτα;","required":true,"options":[{"label":"Closed garage","labelEl":"Κλειστό γκαράζ","value":"garage"},{"label":"Private yard or pilotis","labelEl":"Ιδιωτική αυλή ή πυλωτή","value":"yard"},{"label":"On the street","labelEl":"Στον δρόμο","value":"street"}]},
        {"id":"q10","type":"number","label":"Age of the main driver","labelEl":"Ηλικία κύριου οδηγού","required":true},
        {"id":"q11","type":"number","label":"Years holding a driving license","labelEl":"Έτη κατοχής διπλώματος οδήγησης","required":true},
        {"id":"q12","type":"boolean","label":"Will any driver under 25 use the vehicle?","labelEl":"Θα οδηγεί το όχημα οδηγός κάτω των 25 ετών;","required":true},
        {"id":"q13","type":"select","label":"At-fault claims in the last 5 years","labelEl":"Ζημιές με υπαιτιότητά σας την τελευταία 5ετία","required":true,"options":[{"label":"None","labelEl":"Καμία","value":"0"},{"label":"One","labelEl":"Μία","value":"1"},{"label":"Two or more","labelEl":"Δύο ή περισσότερες","value":"2plus"}]},
        {"id":"q14","type":"select","label":"Which extra cover matters most to you?","labelEl":"Ποια πρόσθετη κάλυψη σας ενδιαφέρει περισσότερο;","required":false,"options":[{"label":"Roadside assistance","labelEl":"Οδική βοήθεια","value":"roadside"},{"label":"Legal protection","labelEl":"Νομική προστασία","value":"legal"},{"label":"Replacement vehicle","labelEl":"Όχημα αντικατάστασης","value":"replacement"},{"label":"Green card (driving abroad)","labelEl":"Πράσινη κάρτα (οδήγηση στο εξωτερικό)","value":"green_card"},{"label":"None of these","labelEl":"Καμία από αυτές","value":"none"}]}
    ]'::jsonb,
    true, true, NOW(), NOW()
)
ON CONFLICT ("template_id") DO UPDATE SET
    "questions" = EXCLUDED."questions",
    "name" = EXCLUDED."name",
    "version" = EXCLUDED."version",
    "is_system" = true,
    "is_active" = true,
    "updated_at" = NOW();

-- ── Home Insurance Assessment (v2, 14 questions) ──────────────────────────
INSERT INTO "questionnaire_templates"
    ("template_id", "name", "line_of_business", "version", "questions", "is_active", "is_system", "created_at", "updated_at")
VALUES (
    'tpl-home-assessment',
    'Home Insurance Assessment',
    'home',
    2,
    '[
        {"id":"q1","type":"select","label":"Do you own or rent the property?","labelEl":"Είστε ιδιοκτήτης ή ενοικιαστής του ακινήτου;","required":true,"options":[{"label":"Owner","labelEl":"Ιδιοκτήτης","value":"owner"},{"label":"Renter","labelEl":"Ενοικιαστής","value":"renter"}]},
        {"id":"q2","type":"select","label":"Property type","labelEl":"Τύπος ακινήτου","required":true,"options":[{"label":"Apartment","labelEl":"Διαμέρισμα","value":"apartment"},{"label":"Detached house","labelEl":"Μονοκατοικία","value":"detached"},{"label":"Maisonette","labelEl":"Μεζονέτα","value":"maisonette"}]},
        {"id":"q3","type":"select","label":"Construction period","labelEl":"Περίοδος κατασκευής","required":true,"options":[{"label":"Before 1985 (pre seismic code)","labelEl":"Πριν το 1985 (πριν τον αντισεισμικό κανονισμό)","value":"pre1985"},{"label":"1985 - 2000","labelEl":"1985 - 2000","value":"1985to2000"},{"label":"After 2000","labelEl":"Μετά το 2000","value":"post2000"}]},
        {"id":"q4","type":"number","label":"Size in square meters","labelEl":"Εμβαδόν σε τετραγωνικά μέτρα","required":true},
        {"id":"q5","type":"select","label":"Floor (for apartments)","labelEl":"Όροφος (για διαμερίσματα)","required":false,"options":[{"label":"Basement or ground floor","labelEl":"Υπόγειο ή ισόγειο","value":"ground"},{"label":"1st - 3rd floor","labelEl":"1ος - 3ος όροφος","value":"low"},{"label":"4th floor or higher","labelEl":"4ος όροφος ή ψηλότερα","value":"high"},{"label":"Not an apartment","labelEl":"Δεν είναι διαμέρισμα","value":"na"}]},
        {"id":"q6","type":"boolean","label":"Is there a mortgage on the property?","labelEl":"Υπάρχει στεγαστικό δάνειο στο ακίνητο;","required":true},
        {"id":"q7","type":"number","label":"Estimated rebuild value (EUR)","labelEl":"Εκτιμώμενη αξία ανακατασκευής (ευρώ)","required":false},
        {"id":"q8","type":"number","label":"Estimated contents value (EUR)","labelEl":"Εκτιμώμενη αξία περιεχομένου (ευρώ)","required":false},
        {"id":"q9","type":"select","label":"Security measures in place","labelEl":"Μέτρα ασφαλείας που διαθέτετε","required":true,"options":[{"label":"Security door only","labelEl":"Μόνο πόρτα ασφαλείας","value":"door"},{"label":"Alarm system","labelEl":"Σύστημα συναγερμού","value":"alarm"},{"label":"Alarm + monitoring or cameras","labelEl":"Συναγερμός + κέντρο λήψης ή κάμερες","value":"monitored"},{"label":"None of these","labelEl":"Κανένα από αυτά","value":"none"}]},
        {"id":"q10","type":"boolean","label":"Does your current policy include earthquake cover?","labelEl":"Περιλαμβάνει το τρέχον συμβόλαιό σας κάλυψη σεισμού;","required":true},
        {"id":"q11","type":"boolean","label":"Is the property in a flood-prone area?","labelEl":"Βρίσκεται το ακίνητο σε περιοχή με ιστορικό πλημμυρών;","required":true},
        {"id":"q12","type":"boolean","label":"Is the property rented out short-term (e.g. Airbnb)?","labelEl":"Διατίθεται το ακίνητο για βραχυχρόνια μίσθωση (π.χ. Airbnb);","required":true},
        {"id":"q13","type":"select","label":"How is the property used?","labelEl":"Πώς χρησιμοποιείται το ακίνητο;","required":true,"options":[{"label":"Permanent residence","labelEl":"Μόνιμη κατοικία","value":"permanent"},{"label":"Holiday home","labelEl":"Εξοχική κατοικία","value":"holiday"},{"label":"Rented to tenants","labelEl":"Εκμισθωμένο σε ενοικιαστές","value":"rented"}]},
        {"id":"q14","type":"text","label":"Current insurer and annual premium, if insured","labelEl":"Τρέχουσα ασφαλιστική και ετήσια ασφάλιστρα, εάν είναι ασφαλισμένο","required":false}
    ]'::jsonb,
    true, true, NOW(), NOW()
)
ON CONFLICT ("template_id") DO UPDATE SET
    "questions" = EXCLUDED."questions",
    "name" = EXCLUDED."name",
    "version" = EXCLUDED."version",
    "is_system" = true,
    "is_active" = true,
    "updated_at" = NOW();

-- ── Health Insurance Needs Analysis (v2, 13 questions) ────────────────────
INSERT INTO "questionnaire_templates"
    ("template_id", "name", "line_of_business", "version", "questions", "is_active", "is_system", "created_at", "updated_at")
VALUES (
    'tpl-health-needs',
    'Health Insurance Needs Analysis',
    'health',
    2,
    '[
        {"id":"q1","type":"number","label":"Your age","labelEl":"Η ηλικία σας","required":true},
        {"id":"q2","type":"select","label":"Who should the plan cover?","labelEl":"Ποιους θα καλύπτει το πρόγραμμα;","required":true,"options":[{"label":"Just me","labelEl":"Μόνο εμένα","value":"self"},{"label":"Me and my partner","labelEl":"Εμένα και τον/τη σύντροφό μου","value":"couple"},{"label":"The whole family","labelEl":"Όλη την οικογένεια","value":"family"}]},
        {"id":"q3","type":"boolean","label":"Are you insured with a public fund (e.g. EOPYY)?","labelEl":"Είστε ασφαλισμένος/η σε δημόσιο φορέα (π.χ. ΕΟΠΥΥ);","required":true},
        {"id":"q4","type":"boolean","label":"Do you have a group health policy through your employer?","labelEl":"Έχετε ομαδικό πρόγραμμα υγείας από τον εργοδότη σας;","required":true},
        {"id":"q5","type":"boolean","label":"Any pre-existing medical conditions?","labelEl":"Υπάρχουν προϋπάρχουσες παθήσεις;","required":true},
        {"id":"q6","type":"text","label":"If yes, briefly describe them","labelEl":"Εάν ναι, περιγράψτε τις σύντομα","required":false},
        {"id":"q7","type":"boolean","label":"Do you take medication regularly?","labelEl":"Λαμβάνετε φαρμακευτική αγωγή σε μόνιμη βάση;","required":true},
        {"id":"q8","type":"select","label":"Smoking status","labelEl":"Κάπνισμα","required":true,"options":[{"label":"Never smoked","labelEl":"Δεν κάπνισα ποτέ","value":"never"},{"label":"Former smoker","labelEl":"Πρώην καπνιστής/στρια","value":"former"},{"label":"Current smoker","labelEl":"Καπνιστής/στρια","value":"current"}]},
        {"id":"q9","type":"select","label":"Preferred hospital type","labelEl":"Προτίμηση νοσηλευτηρίου","required":true,"options":[{"label":"Top private hospitals","labelEl":"Κορυφαία ιδιωτικά θεραπευτήρια","value":"private_a"},{"label":"Any private hospital","labelEl":"Οποιοδήποτε ιδιωτικό","value":"private"},{"label":"Public with private option","labelEl":"Δημόσιο με δυνατότητα ιδιωτικού","value":"mixed"}]},
        {"id":"q10","type":"select","label":"Preferred room class for hospitalization","labelEl":"Προτιμώμενη θέση νοσηλείας","required":true,"options":[{"label":"Single room (A class)","labelEl":"Μονόκλινο (Α θέση)","value":"a_class"},{"label":"Double room (B class)","labelEl":"Δίκλινο (Β θέση)","value":"b_class"},{"label":"No preference","labelEl":"Χωρίς προτίμηση","value":"any"}]},
        {"id":"q11","type":"boolean","label":"Interested in outpatient and diagnostic cover?","labelEl":"Σας ενδιαφέρουν εξωνοσοκομειακές καλύψεις και διαγνωστικές εξετάσεις;","required":true},
        {"id":"q12","type":"select","label":"Annual budget for health premiums","labelEl":"Ετήσιος προϋπολογισμός για ασφάλιστρα υγείας","required":true,"options":[{"label":"Up to 500 EUR","labelEl":"Έως 500 ευρώ","value":"lt500"},{"label":"500 - 1,000 EUR","labelEl":"500 - 1.000 ευρώ","value":"500to1000"},{"label":"1,000 - 2,000 EUR","labelEl":"1.000 - 2.000 ευρώ","value":"1000to2000"},{"label":"Over 2,000 EUR","labelEl":"Άνω των 2.000 ευρώ","value":"gt2000"}]},
        {"id":"q13","type":"boolean","label":"Do you already have a private health policy?","labelEl":"Έχετε ήδη ιδιωτικό πρόγραμμα υγείας;","required":true}
    ]'::jsonb,
    true, true, NOW(), NOW()
)
ON CONFLICT ("template_id") DO UPDATE SET
    "questions" = EXCLUDED."questions",
    "name" = EXCLUDED."name",
    "version" = EXCLUDED."version",
    "is_system" = true,
    "is_active" = true,
    "updated_at" = NOW();

-- ── Life Insurance Review (v2, 12 questions) ──────────────────────────────
INSERT INTO "questionnaire_templates"
    ("template_id", "name", "line_of_business", "version", "questions", "is_active", "is_system", "created_at", "updated_at")
VALUES (
    'tpl-life-review',
    'Life Insurance Review',
    'life',
    2,
    '[
        {"id":"q1","type":"number","label":"Your age","labelEl":"Η ηλικία σας","required":true},
        {"id":"q2","type":"text","label":"Occupation","labelEl":"Επάγγελμα","required":true},
        {"id":"q3","type":"select","label":"Smoking status","labelEl":"Κάπνισμα","required":true,"options":[{"label":"Never smoked","labelEl":"Δεν κάπνισα ποτέ","value":"never"},{"label":"Former smoker","labelEl":"Πρώην καπνιστής/στρια","value":"former"},{"label":"Current smoker","labelEl":"Καπνιστής/στρια","value":"current"}]},
        {"id":"q4","type":"number","label":"Number of dependents (children or others)","labelEl":"Αριθμός εξαρτώμενων μελών (παιδιά ή άλλοι)","required":true},
        {"id":"q5","type":"boolean","label":"Does your partner have their own income?","labelEl":"Έχει ο/η σύντροφός σας δικό του/της εισόδημα;","required":false},
        {"id":"q6","type":"number","label":"Outstanding mortgage or loans (EUR)","labelEl":"Υπόλοιπο στεγαστικού ή άλλων δανείων (ευρώ)","required":true},
        {"id":"q7","type":"select","label":"Annual household income","labelEl":"Ετήσιο οικογενειακό εισόδημα","required":true,"options":[{"label":"Up to 15,000 EUR","labelEl":"Έως 15.000 ευρώ","value":"lt15k"},{"label":"15,000 - 30,000 EUR","labelEl":"15.000 - 30.000 ευρώ","value":"15to30k"},{"label":"30,000 - 60,000 EUR","labelEl":"30.000 - 60.000 ευρώ","value":"30to60k"},{"label":"Over 60,000 EUR","labelEl":"Άνω των 60.000 ευρώ","value":"gt60k"}]},
        {"id":"q8","type":"number","label":"Existing life cover amount, if any (EUR)","labelEl":"Υφιστάμενο κεφάλαιο ασφάλισης ζωής, εάν υπάρχει (ευρώ)","required":false},
        {"id":"q9","type":"select","label":"Desired cover amount","labelEl":"Επιθυμητό κεφάλαιο κάλυψης","required":true,"options":[{"label":"Up to 50,000 EUR","labelEl":"Έως 50.000 ευρώ","value":"lt50k"},{"label":"50,000 - 100,000 EUR","labelEl":"50.000 - 100.000 ευρώ","value":"50to100k"},{"label":"100,000 - 250,000 EUR","labelEl":"100.000 - 250.000 ευρώ","value":"100to250k"},{"label":"Over 250,000 EUR","labelEl":"Άνω των 250.000 ευρώ","value":"gt250k"},{"label":"I need guidance","labelEl":"Χρειάζομαι καθοδήγηση","value":"guidance"}]},
        {"id":"q10","type":"select","label":"For how long do you need the cover?","labelEl":"Για πόσο διάστημα χρειάζεστε την κάλυψη;","required":true,"options":[{"label":"10 years","labelEl":"10 έτη","value":"10y"},{"label":"20 years","labelEl":"20 έτη","value":"20y"},{"label":"Until retirement","labelEl":"Μέχρι τη συνταξιοδότηση","value":"retirement"},{"label":"Whole life","labelEl":"Ισόβια","value":"whole"}]},
        {"id":"q11","type":"boolean","label":"Interested in a savings or investment component?","labelEl":"Σας ενδιαφέρει αποταμιευτικό ή επενδυτικό σκέλος;","required":true},
        {"id":"q12","type":"boolean","label":"Any serious health history (heart disease, cancer, diabetes)?","labelEl":"Υπάρχει σοβαρό ιατρικό ιστορικό (καρδιοπάθεια, καρκίνος, διαβήτης);","required":true}
    ]'::jsonb,
    true, true, NOW(), NOW()
)
ON CONFLICT ("template_id") DO UPDATE SET
    "questions" = EXCLUDED."questions",
    "name" = EXCLUDED."name",
    "version" = EXCLUDED."version",
    "is_system" = true,
    "is_active" = true,
    "updated_at" = NOW();

-- ── Pet Insurance Questionnaire (v2, 10 questions) ────────────────────────
INSERT INTO "questionnaire_templates"
    ("template_id", "name", "line_of_business", "version", "questions", "is_active", "is_system", "created_at", "updated_at")
VALUES (
    'tpl-pet-coverage',
    'Pet Insurance Questionnaire',
    'pet',
    2,
    '[
        {"id":"q1","type":"select","label":"Type of pet","labelEl":"Είδος κατοικιδίου","required":true,"options":[{"label":"Dog","labelEl":"Σκύλος","value":"dog"},{"label":"Cat","labelEl":"Γάτα","value":"cat"},{"label":"Other","labelEl":"Άλλο","value":"other"}]},
        {"id":"q2","type":"text","label":"Breed","labelEl":"Ράτσα","required":true},
        {"id":"q3","type":"number","label":"Age of pet (years)","labelEl":"Ηλικία κατοικιδίου (έτη)","required":true},
        {"id":"q4","type":"boolean","label":"Is the pet microchipped?","labelEl":"Έχει ηλεκτρονική σήμανση (τσιπ);","required":true},
        {"id":"q5","type":"boolean","label":"Are vaccinations up to date?","labelEl":"Είναι ενημερωμένα τα εμβόλια;","required":true},
        {"id":"q6","type":"boolean","label":"Any known health conditions?","labelEl":"Υπάρχουν γνωστά προβλήματα υγείας;","required":true},
        {"id":"q7","type":"text","label":"If yes, briefly describe them","labelEl":"Εάν ναι, περιγράψτε τα σύντομα","required":false},
        {"id":"q8","type":"boolean","label":"Is the pet neutered/spayed?","labelEl":"Είναι στειρωμένο;","required":false},
        {"id":"q9","type":"select","label":"Typical annual vet spend","labelEl":"Συνήθη ετήσια έξοδα κτηνιάτρου","required":true,"options":[{"label":"Up to 150 EUR","labelEl":"Έως 150 ευρώ","value":"lt150"},{"label":"150 - 400 EUR","labelEl":"150 - 400 ευρώ","value":"150to400"},{"label":"Over 400 EUR","labelEl":"Άνω των 400 ευρώ","value":"gt400"}]},
        {"id":"q10","type":"select","label":"What level of cover are you looking for?","labelEl":"Τι επίπεδο κάλυψης αναζητάτε;","required":true,"options":[{"label":"Accidents only","labelEl":"Μόνο ατυχήματα","value":"accident"},{"label":"Accidents and illness","labelEl":"Ατυχήματα και ασθένειες","value":"accident_illness"},{"label":"Full including prevention and liability","labelEl":"Πλήρης με πρόληψη και αστική ευθύνη","value":"full"}]}
    ]'::jsonb,
    true, true, NOW(), NOW()
)
ON CONFLICT ("template_id") DO UPDATE SET
    "questions" = EXCLUDED."questions",
    "name" = EXCLUDED."name",
    "version" = EXCLUDED."version",
    "is_system" = true,
    "is_active" = true,
    "updated_at" = NOW();

-- ── Travel Insurance Intake (new, 10 questions) ───────────────────────────
INSERT INTO "questionnaire_templates"
    ("template_id", "name", "line_of_business", "version", "questions", "is_active", "is_system", "created_at", "updated_at")
VALUES (
    'tpl-travel-intake',
    'Travel Insurance Intake',
    'travel',
    1,
    '[
        {"id":"q1","type":"select","label":"Destination region","labelEl":"Περιοχή προορισμού","required":true,"options":[{"label":"Greece or EU","labelEl":"Ελλάδα ή Ε.Ε.","value":"eu"},{"label":"Europe outside the EU","labelEl":"Ευρώπη εκτός Ε.Ε.","value":"europe_non_eu"},{"label":"USA or Canada","labelEl":"ΗΠΑ ή Καναδάς","value":"us_canada"},{"label":"Worldwide","labelEl":"Παγκόσμια","value":"worldwide"}]},
        {"id":"q2","type":"select","label":"Trip type","labelEl":"Τύπος ταξιδιού","required":true,"options":[{"label":"Single trip","labelEl":"Μεμονωμένο ταξίδι","value":"single"},{"label":"Annual multi-trip","labelEl":"Ετήσια κάλυψη πολλαπλών ταξιδιών","value":"annual"}]},
        {"id":"q3","type":"number","label":"Trip duration (days)","labelEl":"Διάρκεια ταξιδιού (ημέρες)","required":true},
        {"id":"q4","type":"number","label":"Number of travelers","labelEl":"Αριθμός ταξιδιωτών","required":true},
        {"id":"q5","type":"boolean","label":"Is any traveler over 65?","labelEl":"Υπάρχει ταξιδιώτης άνω των 65 ετών;","required":true},
        {"id":"q6","type":"boolean","label":"Winter sports or high-risk activities planned?","labelEl":"Προγραμματίζετε χειμερινά σπορ ή δραστηριότητες υψηλού κινδύνου;","required":true},
        {"id":"q7","type":"boolean","label":"Any pre-existing medical conditions among travelers?","labelEl":"Υπάρχουν προϋπάρχουσες παθήσεις στους ταξιδιώτες;","required":true},
        {"id":"q8","type":"number","label":"Total trip cost to protect against cancellation (EUR)","labelEl":"Συνολικό κόστος ταξιδιού για κάλυψη ακύρωσης (ευρώ)","required":false},
        {"id":"q9","type":"boolean","label":"Traveling with valuable equipment (laptop, camera, sports gear)?","labelEl":"Ταξιδεύετε με πολύτιμο εξοπλισμό (λάπτοπ, κάμερα, αθλητικό εξοπλισμό);","required":true},
        {"id":"q10","type":"select","label":"Existing travel cover you may already have","labelEl":"Υφιστάμενη ταξιδιωτική κάλυψη που ίσως έχετε ήδη","required":true,"options":[{"label":"Credit card travel cover","labelEl":"Κάλυψη μέσω πιστωτικής κάρτας","value":"card"},{"label":"European Health Insurance Card (EHIC)","labelEl":"Ευρωπαϊκή Κάρτα Ασφάλισης Ασθένειας (ΕΚΑΑ)","value":"ehic"},{"label":"Both","labelEl":"Και τα δύο","value":"both"},{"label":"None","labelEl":"Καμία","value":"none"}]}
    ]'::jsonb,
    true, true, NOW(), NOW()
)
ON CONFLICT ("template_id") DO UPDATE SET
    "questions" = EXCLUDED."questions",
    "name" = EXCLUDED."name",
    "version" = EXCLUDED."version",
    "is_system" = true,
    "is_active" = true,
    "updated_at" = NOW();

-- ── Annual Insurance Needs Review (new, 14 questions) ─────────────────────
-- Household risk profile; fields deliberately mirror the gap-engine
-- ProfileFields so answers can later feed the policyholder profile.
INSERT INTO "questionnaire_templates"
    ("template_id", "name", "line_of_business", "version", "questions", "is_active", "is_system", "created_at", "updated_at")
VALUES (
    'tpl-annual-review',
    'Annual Insurance Needs Review',
    'other',
    1,
    '[
        {"id":"q1","type":"select","label":"Marital status","labelEl":"Οικογενειακή κατάσταση","required":true,"options":[{"label":"Single","labelEl":"Άγαμος/η","value":"single"},{"label":"Married or in partnership","labelEl":"Έγγαμος/η ή σε συμβίωση","value":"married"},{"label":"Divorced","labelEl":"Διαζευγμένος/η","value":"divorced"},{"label":"Widowed","labelEl":"Χήρος/α","value":"widowed"}]},
        {"id":"q2","type":"number","label":"Number of dependents","labelEl":"Αριθμός εξαρτώμενων μελών","required":true},
        {"id":"q3","type":"select","label":"Employment status","labelEl":"Εργασιακή κατάσταση","required":true,"options":[{"label":"Employee","labelEl":"Μισθωτός/ή","value":"employee"},{"label":"Self-employed or freelancer","labelEl":"Ελεύθερος επαγγελματίας","value":"self_employed"},{"label":"Business owner","labelEl":"Επιχειρηματίας","value":"business_owner"},{"label":"Retired","labelEl":"Συνταξιούχος","value":"retired"},{"label":"Not currently working","labelEl":"Εκτός εργασίας","value":"unemployed"}]},
        {"id":"q4","type":"select","label":"Housing situation","labelEl":"Στέγαση","required":true,"options":[{"label":"I own my home","labelEl":"Ιδιόκτητη κατοικία","value":"own"},{"label":"I rent","labelEl":"Ενοικιαζόμενη κατοικία","value":"rent"},{"label":"Living with family","labelEl":"Φιλοξενία από οικογένεια","value":"family"}]},
        {"id":"q5","type":"boolean","label":"Do you have a mortgage?","labelEl":"Έχετε στεγαστικό δάνειο;","required":true},
        {"id":"q6","type":"number","label":"How many vehicles does your household own?","labelEl":"Πόσα οχήματα διαθέτει το νοικοκυριό σας;","required":true},
        {"id":"q7","type":"boolean","label":"Do you have pets?","labelEl":"Έχετε κατοικίδια;","required":true},
        {"id":"q8","type":"select","label":"If your income stopped, how long would your savings last?","labelEl":"Εάν σταματούσε το εισόδημά σας, για πόσο θα αρκούσαν οι αποταμιεύσεις σας;","required":true,"options":[{"label":"Less than 3 months","labelEl":"Λιγότερο από 3 μήνες","value":"lt3m"},{"label":"3 - 6 months","labelEl":"3 - 6 μήνες","value":"3to6m"},{"label":"6 - 12 months","labelEl":"6 - 12 μήνες","value":"6to12m"},{"label":"Over a year","labelEl":"Πάνω από έναν χρόνο","value":"gt12m"}]},
        {"id":"q9","type":"boolean","label":"Do you have life insurance?","labelEl":"Έχετε ασφάλεια ζωής;","required":true},
        {"id":"q10","type":"boolean","label":"Do you have private health insurance?","labelEl":"Έχετε ιδιωτική ασφάλεια υγείας;","required":true},
        {"id":"q11","type":"boolean","label":"Is your home insured?","labelEl":"Είναι ασφαλισμένη η κατοικία σας;","required":true},
        {"id":"q12","type":"boolean","label":"Do you practice dangerous sports or hobbies (motorcycling, diving, climbing)?","labelEl":"Ασχολείστε με επικίνδυνα σπορ ή χόμπι (μηχανή, καταδύσεις, αναρρίχηση);","required":true},
        {"id":"q13","type":"select","label":"Any big life changes coming in the next 1-2 years?","labelEl":"Έρχονται σημαντικές αλλαγές στα επόμενα 1-2 χρόνια;","required":true,"options":[{"label":"New child","labelEl":"Νέο παιδί","value":"child"},{"label":"Buying a home","labelEl":"Αγορά κατοικίας","value":"home_purchase"},{"label":"Retirement","labelEl":"Συνταξιοδότηση","value":"retirement"},{"label":"Career or business change","labelEl":"Αλλαγή καριέρας ή επιχείρησης","value":"career"},{"label":"None planned","labelEl":"Καμία προγραμματισμένη","value":"none"}]},
        {"id":"q14","type":"text","label":"Anything else your advisor should know?","labelEl":"Υπάρχει κάτι άλλο που πρέπει να γνωρίζει ο σύμβουλός σας;","required":false}
    ]'::jsonb,
    true, true, NOW(), NOW()
)
ON CONFLICT ("template_id") DO UPDATE SET
    "questions" = EXCLUDED."questions",
    "name" = EXCLUDED."name",
    "version" = EXCLUDED."version",
    "is_system" = true,
    "is_active" = true,
    "updated_at" = NOW();

-- ── Retire the English-only placeholder templates seeded by prisma/seed.ts ─
-- Soft-deactivate (not delete) so any existing instances keep their FK.
UPDATE "questionnaire_templates"
SET "is_active" = false, "updated_at" = NOW()
WHERE "template_id" IN ('motor-risk-v1', 'health-lifestyle-v1');
