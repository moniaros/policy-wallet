-- ============================================================================
-- ROLLBACK ARCHIVE — dev-only 'extraction_pipeline_schema' phantom migration
-- Archived 2026-08-21 before dropping from dev (supabase:lzqvtvjggylcujenlelh).
--
-- Origin: commit 0acc7de5, branches feat/pipeline-* / docs/project-brain.
-- Never merged to NEW-UI; applied to dev 2026-06-05, never applied to prod.
-- Removed under CLAUDE.md 'Standing decisions': prod is the schema reference,
-- and a phantom migration is resolved by deleting the row and the objects.
--
-- To restore: run the DDL section, then the DATA section.
-- ============================================================================

-- ============================== DDL ==========================================
-- Document Ingestion → Extraction Pipeline (Phase 0)
-- Adds the cost-optimized pipeline schema, reconciled with existing tables:
--   * policy_documents: triage + coverage-table-location columns (non-breaking; existing
--     extraction_cache JSON retained, retired in Phase 5).
--   * document_extractions: permanent, content-hash-keyed structured cache (promoted from
--     the deprecated 24h-TTL JSON). Linked to policy_documents by VALUE (content_hash ==
--     document_hash), not a FK, so the hash can be recorded at upload before extraction exists.
--   * coverage_taxonomy / insurer_templates / coverage_envelopes: reference data for
--     normalization, per-insurer templates, and the deterministic Gap Engine benchmark.
-- No existing tables are dropped or altered destructively.

-- AlterTable
ALTER TABLE "policy_documents" ADD COLUMN     "coverage_table_pages" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "document_source" TEXT,
ADD COLUMN     "page_count" INTEGER;

-- CreateTable
CREATE TABLE "document_extractions" (
    "extraction_id" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "path_taken" TEXT NOT NULL,
    "insurer_name" TEXT NOT NULL,
    "policy_number" TEXT,
    "premium_amount" DECIMAL(12,2),
    "premium_currency" TEXT NOT NULL DEFAULT 'EUR',
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "structured" JSONB NOT NULL,
    "overall_confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "requires_review" BOOLEAN NOT NULL DEFAULT false,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "total_tokens" INTEGER NOT NULL DEFAULT 0,
    "cost_eur" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "model" TEXT,
    "insurer_template_id" TEXT,
    "extracted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_extractions_pkey" PRIMARY KEY ("extraction_id")
);

-- CreateTable
CREATE TABLE "coverage_taxonomy" (
    "taxonomy_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "line_of_business" TEXT NOT NULL,
    "name_el" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "description_el" TEXT,
    "description_en" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'amount',
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coverage_taxonomy_pkey" PRIMARY KEY ("taxonomy_id")
);

-- CreateTable
CREATE TABLE "insurer_templates" (
    "insurer_template_id" TEXT NOT NULL,
    "insurer_id" TEXT,
    "canonical_name" TEXT NOT NULL,
    "line_of_business" TEXT,
    "name_aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "field_patterns" JSONB,
    "coverage_table_hints" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insurer_templates_pkey" PRIMARY KEY ("insurer_template_id")
);

-- CreateTable
CREATE TABLE "coverage_envelopes" (
    "envelope_id" TEXT NOT NULL,
    "line_of_business" TEXT NOT NULL,
    "profile_segment" TEXT NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "expectations" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coverage_envelopes_pkey" PRIMARY KEY ("envelope_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_extractions_content_hash_key" ON "document_extractions"("content_hash");

-- CreateIndex
CREATE INDEX "document_extractions_path_taken_idx" ON "document_extractions"("path_taken");

-- CreateIndex
CREATE INDEX "document_extractions_insurer_name_idx" ON "document_extractions"("insurer_name");

-- CreateIndex
CREATE INDEX "document_extractions_extracted_at_idx" ON "document_extractions"("extracted_at");

-- CreateIndex
CREATE UNIQUE INDEX "coverage_taxonomy_key_key" ON "coverage_taxonomy"("key");

-- CreateIndex
CREATE INDEX "coverage_taxonomy_line_of_business_is_active_idx" ON "coverage_taxonomy"("line_of_business", "is_active");

-- CreateIndex
CREATE INDEX "insurer_templates_insurer_id_is_active_idx" ON "insurer_templates"("insurer_id", "is_active");

-- CreateIndex
CREATE INDEX "insurer_templates_canonical_name_idx" ON "insurer_templates"("canonical_name");

-- CreateIndex
CREATE INDEX "coverage_envelopes_line_of_business_is_active_idx" ON "coverage_envelopes"("line_of_business", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "coverage_envelopes_line_of_business_profile_segment_version_key" ON "coverage_envelopes"("line_of_business", "profile_segment", "version");

-- AddForeignKey
ALTER TABLE "document_extractions" ADD CONSTRAINT "document_extractions_insurer_template_id_fkey" FOREIGN KEY ("insurer_template_id") REFERENCES "insurer_templates"("insurer_template_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurer_templates" ADD CONSTRAINT "insurer_templates_insurer_id_fkey" FOREIGN KEY ("insurer_id") REFERENCES "insurers"("insurer_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================== DATA =========================================
-- PolicyWallet table archive
-- source: supabase:lzqvtvjggylcujenlelh
-- tables: coverage_taxonomy, coverage_envelopes, document_extractions, insurer_templates

-- coverage_taxonomy: 32 rows
INSERT INTO coverage_taxonomy SELECT * FROM json_populate_record(NULL::coverage_taxonomy, '{"taxonomy_id":"cmq104x3x00171399v49l8g8d","key":"motor.own_damage","line_of_business":"motor","name_el":"Ίδιες Ζημίες","name_en":"Own damage","description_el":null,"description_en":null,"unit":"amount","aliases":["Ίδιες Ζημίες","Μικτή","Μικτή Ασφάλιση"],"sort_order":20,"is_active":true,"created_at":"2026-06-05T14:10:46.557","updated_at":"2026-06-05T20:26:33.874"}');
INSERT INTO coverage_taxonomy SELECT * FROM json_populate_record(NULL::coverage_taxonomy, '{"taxonomy_id":"cmq104xls00181399t39d29hs","key":"motor.fire","line_of_business":"motor","name_el":"Πυρκαγιά","name_en":"Fire","description_el":null,"description_en":null,"unit":"amount","aliases":["Πυρκαγιά","Πυρός"],"sort_order":30,"is_active":true,"created_at":"2026-06-05T14:10:47.2","updated_at":"2026-06-05T20:26:34.696"}');
INSERT INTO coverage_taxonomy SELECT * FROM json_populate_record(NULL::coverage_taxonomy, '{"taxonomy_id":"cmq104y3m00191399faq1iijd","key":"motor.theft","line_of_business":"motor","name_el":"Κλοπή","name_en":"Theft","description_el":null,"description_en":null,"unit":"amount","aliases":["Κλοπή","Ολική Κλοπή","Μερική Κλοπή"],"sort_order":40,"is_active":true,"created_at":"2026-06-05T14:10:47.842","updated_at":"2026-06-05T20:26:35.373"}');
INSERT INTO coverage_taxonomy SELECT * FROM json_populate_record(NULL::coverage_taxonomy, '{"taxonomy_id":"cmq104yp0001a139986tf5vpk","key":"motor.natural_disasters","line_of_business":"motor","name_el":"Φυσικά Φαινόμενα","name_en":"Natural disasters","description_el":null,"description_en":null,"unit":"amount","aliases":["Φυσικά Φαινόμενα","Καιρικά Φαινόμενα"],"sort_order":50,"is_active":true,"created_at":"2026-06-05T14:10:48.485","updated_at":"2026-06-05T20:26:36.037"}');
INSERT INTO coverage_taxonomy SELECT * FROM json_populate_record(NULL::coverage_taxonomy, '{"taxonomy_id":"cmq104z6v001b1399ynhf8dbk","key":"motor.broken_glass","line_of_business":"motor","name_el":"Θραύση Κρυστάλλων","name_en":"Broken glass","description_el":null,"description_en":null,"unit":"amount","aliases":["Θραύση Κρυστάλλων","Κρύσταλλα"],"sort_order":60,"is_active":true,"created_at":"2026-06-05T14:10:49.255","updated_at":"2026-06-05T20:26:36.691"}');
INSERT INTO coverage_taxonomy SELECT * FROM json_populate_record(NULL::coverage_taxonomy, '{"taxonomy_id":"cmq104zoo001c13993j8i2iw0","key":"motor.roadside_assistance","line_of_business":"motor","name_el":"Οδική Βοήθεια","name_en":"Roadside assistance","description_el":null,"description_en":null,"unit":"boolean","aliases":["Οδική Βοήθεια","Φροντίδα Ατυχήματος"],"sort_order":70,"is_active":true,"created_at":"2026-06-05T14:10:49.896","updated_at":"2026-06-05T20:26:37.332"}');
INSERT INTO coverage_taxonomy SELECT * FROM json_populate_record(NULL::coverage_taxonomy, '{"taxonomy_id":"cmq10506j001d1399422j10f8","key":"motor.legal_protection","line_of_business":"motor","name_el":"Νομική Προστασία","name_en":"Legal protection","description_el":null,"description_en":null,"unit":"amount","aliases":["Νομική Προστασία"],"sort_order":80,"is_active":true,"created_at":"2026-06-05T14:10:50.539","updated_at":"2026-06-05T20:26:37.994"}');
INSERT INTO coverage_taxonomy SELECT * FROM json_populate_record(NULL::coverage_taxonomy, '{"taxonomy_id":"cmq1050oc001e1399e0rdj4kh","key":"motor.driver_personal_accident","line_of_business":"motor","name_el":"Προσωπικό Ατύχημα Οδηγού","name_en":"Driver personal accident","description_el":null,"description_en":null,"unit":"amount","aliases":["Προσωπικό Ατύχημα Οδηγού","Ατύχημα Οδηγού"],"sort_order":90,"is_active":true,"created_at":"2026-06-05T14:10:51.18","updated_at":"2026-06-05T20:26:38.681"}');
INSERT INTO coverage_taxonomy SELECT * FROM json_populate_record(NULL::coverage_taxonomy, '{"taxonomy_id":"cmq105166001f1399ntqsfsg9","key":"health.hospitalization","line_of_business":"health","name_el":"Νοσοκομειακή Περίθαλψη","name_en":"Hospitalization","description_el":null,"description_en":null,"unit":"amount","aliases":["Νοσοκομειακή Περίθαλψη","Νοσηλεία"],"sort_order":10,"is_active":true,"created_at":"2026-06-05T14:10:51.823","updated_at":"2026-06-05T20:26:39.335"}');
INSERT INTO coverage_taxonomy SELECT * FROM json_populate_record(NULL::coverage_taxonomy, '{"taxonomy_id":"cmq1051nz001g1399r2i00uju","key":"health.outpatient","line_of_business":"health","name_el":"Εξωνοσοκομειακή Περίθαλψη","name_en":"Outpatient care","description_el":null,"description_en":null,"unit":"amount","aliases":["Εξωνοσοκομειακή Περίθαλψη","Διαγνωστικές Εξετάσεις","Διαγνωστικά"],"sort_order":20,"is_active":true,"created_at":"2026-06-05T14:10:52.463","updated_at":"2026-06-05T20:26:39.981"}');
INSERT INTO coverage_taxonomy SELECT * FROM json_populate_record(NULL::coverage_taxonomy, '{"taxonomy_id":"cmq10525w001h1399fn6ig3rj","key":"health.surgical","line_of_business":"health","name_el":"Χειρουργική Επέμβαση","name_en":"Surgical","description_el":null,"description_en":null,"unit":"amount","aliases":["Χειρουργικό Επίδομα","Χειρουργική Επέμβαση"],"sort_order":30,"is_active":true,"created_at":"2026-06-05T14:10:53.108","updated_at":"2026-06-05T20:26:40.688"}');
INSERT INTO coverage_taxonomy SELECT * FROM json_populate_record(NULL::coverage_taxonomy, '{"taxonomy_id":"cmq1052nr001i1399roglxapw","key":"health.maternity","line_of_business":"health","name_el":"Μητρότητα","name_en":"Maternity","description_el":null,"description_en":null,"unit":"amount","aliases":["Μητρότητα","Τοκετός"],"sort_order":40,"is_active":true,"created_at":"2026-06-05T14:10:53.752","updated_at":"2026-06-05T20:26:41.372"}');
INSERT INTO coverage_taxonomy SELECT * FROM json_populate_record(NULL::coverage_taxonomy, '{"taxonomy_id":"cmq10535l001j1399mhzsuo94","key":"health.daily_hospital_allowance","line_of_business":"health","name_el":"Ημερήσιο Νοσοκομειακό Επίδομα","name_en":"Daily hospital allowance","description_el":null,"description_en":null,"unit":"days","aliases":["Ημερήσιο Νοσήλιο","Νοσοκομειακό Επίδομα"],"sort_order":50,"is_active":true,"created_at":"2026-06-05T14:10:54.394","updated_at":"2026-06-05T20:26:42.015"}');
INSERT INTO coverage_taxonomy SELECT * FROM json_populate_record(NULL::coverage_taxonomy, '{"taxonomy_id":"cmq1053ne001k1399o44rdaq2","key":"home.fire","line_of_business":"home","name_el":"Πυρκαγιά","name_en":"Fire","description_el":null,"description_en":null,"unit":"amount","aliases":["Πυρκαγιά","Πυρός","Φωτιά"],"sort_order":10,"is_active":true,"created_at":"2026-06-05T14:10:55.034","updated_at":"2026-06-05T20:26:42.665"}');
INSERT INTO coverage_taxonomy SELECT * FROM json_populate_record(NULL::coverage_taxonomy, '{"taxonomy_id":"cmq105456001l13991lipkjpa","key":"home.earthquake","line_of_business":"home","name_el":"Σεισμός","name_en":"Earthquake","description_el":null,"description_en":null,"unit":"amount","aliases":["Σεισμός","Σεισμική Δραστηριότητα"],"sort_order":20,"is_active":true,"created_at":"2026-06-05T14:10:55.675","updated_at":"2026-06-05T20:26:43.385"}');
INSERT INTO coverage_taxonomy SELECT * FROM json_populate_record(NULL::coverage_taxonomy, '{"taxonomy_id":"cmq1054mz001m1399uvxsfia1","key":"home.flood","line_of_business":"home","name_el":"Πλημμύρα","name_en":"Flood","description_el":null,"description_en":null,"unit":"amount","aliases":["Πλημμύρα","Πλημμύρες"],"sort_order":30,"is_active":true,"created_at":"2026-06-05T14:10:56.316","updated_at":"2026-06-05T20:26:44.077"}');
INSERT INTO coverage_taxonomy SELECT * FROM json_populate_record(NULL::coverage_taxonomy, '{"taxonomy_id":"cmq10554s001n1399vf7q93ga","key":"home.theft","line_of_business":"home","name_el":"Κλοπή","name_en":"Theft","description_el":null,"description_en":null,"unit":"amount","aliases":["Κλοπή","Διάρρηξη"],"sort_order":40,"is_active":true,"created_at":"2026-06-05T14:10:56.957","updated_at":"2026-06-05T20:26:44.752"}');
INSERT INTO coverage_taxonomy SELECT * FROM json_populate_record(NULL::coverage_taxonomy, '{"taxonomy_id":"cmq1055mn001o1399ttkns24u","key":"home.water_damage","line_of_business":"home","name_el":"Ζημιές από Νερά","name_en":"Water damage","description_el":null,"description_en":null,"unit":"amount","aliases":["Ζημιές από Νερά","Διαρροή Σωληνώσεων"],"sort_order":50,"is_active":true,"created_at":"2026-06-05T14:10:57.599","updated_at":"2026-06-05T20:26:45.432"}');
INSERT INTO coverage_taxonomy SELECT * FROM json_populate_record(NULL::coverage_taxonomy, '{"taxonomy_id":"cmq10564g001p1399jtie5epj","key":"home.civil_liability","line_of_business":"home","name_el":"Αστική Ευθύνη προς Τρίτους","name_en":"Civil liability to third parties","description_el":null,"description_en":null,"unit":"amount","aliases":["Αστική Ευθύνη προς Τρίτους","Αστική Ευθύνη"],"sort_order":60,"is_active":true,"created_at":"2026-06-05T14:10:58.24","updated_at":"2026-06-05T20:26:46.118"}');
INSERT INTO coverage_taxonomy SELECT * FROM json_populate_record(NULL::coverage_taxonomy, '{"taxonomy_id":"cmq1056m9001q13996mjpvvkk","key":"home.glass_breakage","line_of_business":"home","name_el":"Θραύση Κρυστάλλων","name_en":"Glass breakage","description_el":null,"description_en":null,"unit":"amount","aliases":["Θραύση Κρυστάλλων"],"sort_order":70,"is_active":true,"created_at":"2026-06-05T14:10:58.881","updated_at":"2026-06-05T20:26:46.76"}');
INSERT INTO coverage_taxonomy SELECT * FROM json_populate_record(NULL::coverage_taxonomy, '{"taxonomy_id":"cmq105743001r13992st18kfz","key":"life.death_benefit","line_of_business":"life","name_el":"Κεφάλαιο Θανάτου","name_en":"Death benefit","description_el":null,"description_en":null,"unit":"amount","aliases":["Κεφάλαιο Θανάτου","Ασφάλιση Ζωής","Απώλεια Ζωής"],"sort_order":10,"is_active":true,"created_at":"2026-06-05T14:10:59.523","updated_at":"2026-06-05T20:26:47.43"}');
INSERT INTO coverage_taxonomy SELECT * FROM json_populate_record(NULL::coverage_taxonomy, '{"taxonomy_id":"cmq1057lw001s1399fqgq3mhh","key":"life.permanent_disability","line_of_business":"life","name_el":"Μόνιμη Ολική Ανικανότητα","name_en":"Permanent total disability","description_el":null,"description_en":null,"unit":"amount","aliases":["Μόνιμη Ολική Ανικανότητα","Μ.Ο.Α."],"sort_order":20,"is_active":true,"created_at":"2026-06-05T14:11:00.164","updated_at":"2026-06-05T20:26:48.083"}');
INSERT INTO coverage_taxonomy SELECT * FROM json_populate_record(NULL::coverage_taxonomy, '{"taxonomy_id":"cmq10583t001t1399hy4kgsrx","key":"life.critical_illness","line_of_business":"life","name_el":"Σοβαρές Ασθένειες","name_en":"Critical illness","description_el":null,"description_en":null,"unit":"amount","aliases":["Σοβαρές Ασθένειες","Κρίσιμες Ασθένειες"],"sort_order":30,"is_active":true,"created_at":"2026-06-05T14:11:00.809","updated_at":"2026-06-05T20:26:48.754"}');
INSERT INTO coverage_taxonomy SELECT * FROM json_populate_record(NULL::coverage_taxonomy, '{"taxonomy_id":"cmq1058lm001u1399m9f48eiq","key":"life.hospital_income","line_of_business":"life","name_el":"Νοσοκομειακό Επίδομα","name_en":"Hospital income","description_el":null,"description_en":null,"unit":"days","aliases":["Νοσοκομειακό Επίδομα"],"sort_order":40,"is_active":true,"created_at":"2026-06-05T14:11:01.451","updated_at":"2026-06-05T20:26:49.43"}');
INSERT INTO coverage_taxonomy SELECT * FROM json_populate_record(NULL::coverage_taxonomy, '{"taxonomy_id":"cmq10593e001v1399wiqyokf9","key":"travel.medical_expenses","line_of_business":"travel","name_el":"Ιατρικά Έξοδα Εξωτερικού","name_en":"Overseas medical expenses","description_el":null,"description_en":null,"unit":"amount","aliases":["Ιατρικά Έξοδα","Ιατροφαρμακευτικά Έξοδα Εξωτερικού"],"sort_order":10,"is_active":true,"created_at":"2026-06-05T14:11:02.09","updated_at":"2026-06-05T20:26:50.226"}');
INSERT INTO coverage_taxonomy SELECT * FROM json_populate_record(NULL::coverage_taxonomy, '{"taxonomy_id":"cmq1059l8001w13997pqyd635","key":"travel.trip_cancellation","line_of_business":"travel","name_el":"Ακύρωση Ταξιδιού","name_en":"Trip cancellation","description_el":null,"description_en":null,"unit":"amount","aliases":["Ακύρωση Ταξιδιού","Ματαίωση Ταξιδιού"],"sort_order":20,"is_active":true,"created_at":"2026-06-05T14:11:02.732","updated_at":"2026-06-05T20:26:50.878"}');
INSERT INTO coverage_taxonomy SELECT * FROM json_populate_record(NULL::coverage_taxonomy, '{"taxonomy_id":"cmq105a31001x1399n4s23phd","key":"travel.lost_luggage","line_of_business":"travel","name_el":"Απώλεια Αποσκευών","name_en":"Lost luggage","description_el":null,"description_en":null,"unit":"amount","aliases":["Απώλεια Αποσκευών","Αποσκευές"],"sort_order":30,"is_active":true,"created_at":"2026-06-05T14:11:03.373","updated_at":"2026-06-05T20:26:51.549"}');
INSERT INTO coverage_taxonomy SELECT * FROM json_populate_record(NULL::coverage_taxonomy, '{"taxonomy_id":"cmq105aod001y1399yi3v6y1g","key":"travel.repatriation","line_of_business":"travel","name_el":"Επαναπατρισμός","name_en":"Repatriation","description_el":null,"description_en":null,"unit":"amount","aliases":["Επαναπατρισμός","Υγειονομική Μεταφορά"],"sort_order":40,"is_active":true,"created_at":"2026-06-05T14:11:04.014","updated_at":"2026-06-05T20:26:52.217"}');
INSERT INTO coverage_taxonomy SELECT * FROM json_populate_record(NULL::coverage_taxonomy, '{"taxonomy_id":"cmq105b68001z1399chsjj555","key":"liability.professional","line_of_business":"liability","name_el":"Επαγγελματική Αστική Ευθύνη","name_en":"Professional liability","description_el":null,"description_en":null,"unit":"amount","aliases":["Επαγγελματική Αστική Ευθύνη","Επαγγελματική Ευθύνη"],"sort_order":10,"is_active":true,"created_at":"2026-06-05T14:11:04.785","updated_at":"2026-06-05T20:26:52.873"}');
INSERT INTO coverage_taxonomy SELECT * FROM json_populate_record(NULL::coverage_taxonomy, '{"taxonomy_id":"cmq104wlp00161399id4huvoh","key":"motor.civil_liability","line_of_business":"motor","name_el":"Αστική Ευθύνη","name_en":"Civil liability","description_el":null,"description_en":null,"unit":"amount","aliases":["Αστική Ευθύνη","Σωματικές Βλάβες","Υλικές Ζημίες","Αστική Ευθύνη προς Τρίτους"],"sort_order":10,"is_active":true,"created_at":"2026-06-05T14:10:45.901","updated_at":"2026-06-05T20:26:33.224"}');
INSERT INTO coverage_taxonomy SELECT * FROM json_populate_record(NULL::coverage_taxonomy, '{"taxonomy_id":"cmq105bo200201399gig9b5zc","key":"liability.general","line_of_business":"liability","name_el":"Γενική Αστική Ευθύνη","name_en":"General liability","description_el":null,"description_en":null,"unit":"amount","aliases":["Γενική Αστική Ευθύνη"],"sort_order":20,"is_active":true,"created_at":"2026-06-05T14:11:05.426","updated_at":"2026-06-05T20:26:53.531"}');
INSERT INTO coverage_taxonomy SELECT * FROM json_populate_record(NULL::coverage_taxonomy, '{"taxonomy_id":"cmq105c6300211399aidkya3y","key":"liability.employer","line_of_business":"liability","name_el":"Εργοδοτική Αστική Ευθύνη","name_en":"Employer''s liability","description_el":null,"description_en":null,"unit":"amount","aliases":["Εργοδοτική Αστική Ευθύνη"],"sort_order":30,"is_active":true,"created_at":"2026-06-05T14:11:06.075","updated_at":"2026-06-05T20:26:54.177"}');

-- coverage_envelopes: 7 rows
INSERT INTO coverage_envelopes SELECT * FROM json_populate_record(NULL::coverage_envelopes, '{"envelope_id":"cmq105d6b00221399s8o39gpi","line_of_business":"motor","profile_segment":"","version":1,"expectations":[{"minLimit": 1300000, "taxonomyKey": "motor.civil_liability", "severityIfMissing": "critical"}, {"taxonomyKey": "motor.fire", "severityIfMissing": "recommended"}, {"taxonomyKey": "motor.theft", "severityIfMissing": "recommended"}, {"taxonomyKey": "motor.broken_glass", "severityIfMissing": "info"}, {"taxonomyKey": "motor.roadside_assistance", "severityIfMissing": "info"}],"is_active":true,"created_at":"2026-06-05T14:11:07.379","updated_at":"2026-06-05T20:26:55.493"}');
INSERT INTO coverage_envelopes SELECT * FROM json_populate_record(NULL::coverage_envelopes, '{"envelope_id":"cmq105e60002313999zakfvvg","line_of_business":"health","profile_segment":"","version":1,"expectations":[{"minLimit": 300000, "taxonomyKey": "health.hospitalization", "severityIfMissing": "critical"}, {"taxonomyKey": "health.surgical", "severityIfMissing": "recommended"}, {"taxonomyKey": "health.outpatient", "severityIfMissing": "recommended"}, {"taxonomyKey": "health.daily_hospital_allowance", "severityIfMissing": "info"}],"is_active":true,"created_at":"2026-06-05T14:11:08.665","updated_at":"2026-06-05T20:26:56.852"}');
INSERT INTO coverage_envelopes SELECT * FROM json_populate_record(NULL::coverage_envelopes, '{"envelope_id":"cmq105f5r00241399wrbdfx3y","line_of_business":"home","profile_segment":"","version":1,"expectations":[{"taxonomyKey": "home.fire", "severityIfMissing": "critical"}, {"taxonomyKey": "home.earthquake", "severityIfMissing": "recommended"}, {"taxonomyKey": "home.civil_liability", "severityIfMissing": "recommended"}, {"taxonomyKey": "home.theft", "severityIfMissing": "info"}],"is_active":true,"created_at":"2026-06-05T14:11:09.951","updated_at":"2026-06-05T20:26:58.191"}');
INSERT INTO coverage_envelopes SELECT * FROM json_populate_record(NULL::coverage_envelopes, '{"envelope_id":"cmq105g5800251399u2rusu13","line_of_business":"home","profile_segment":"homeowner","version":1,"expectations":[{"taxonomyKey": "home.fire", "severityIfMissing": "critical"}, {"taxonomyKey": "home.earthquake", "severityIfMissing": "critical"}, {"taxonomyKey": "home.flood", "severityIfMissing": "recommended"}, {"taxonomyKey": "home.civil_liability", "severityIfMissing": "recommended"}, {"taxonomyKey": "home.theft", "severityIfMissing": "info"}],"is_active":true,"created_at":"2026-06-05T14:11:11.228","updated_at":"2026-06-05T20:26:59.53"}');
INSERT INTO coverage_envelopes SELECT * FROM json_populate_record(NULL::coverage_envelopes, '{"envelope_id":"cmq105h4x00261399gfbq0lcl","line_of_business":"life","profile_segment":"","version":1,"expectations":[{"taxonomyKey": "life.death_benefit", "severityIfMissing": "critical"}, {"taxonomyKey": "life.permanent_disability", "severityIfMissing": "recommended"}, {"taxonomyKey": "life.critical_illness", "severityIfMissing": "info"}],"is_active":true,"created_at":"2026-06-05T14:11:12.514","updated_at":"2026-06-05T20:27:00.856"}');
INSERT INTO coverage_envelopes SELECT * FROM json_populate_record(NULL::coverage_envelopes, '{"envelope_id":"cmq105i4k00271399q18rgko4","line_of_business":"travel","profile_segment":"","version":1,"expectations":[{"minLimit": 30000, "taxonomyKey": "travel.medical_expenses", "severityIfMissing": "critical"}, {"taxonomyKey": "travel.repatriation", "severityIfMissing": "recommended"}, {"taxonomyKey": "travel.trip_cancellation", "severityIfMissing": "info"}, {"taxonomyKey": "travel.lost_luggage", "severityIfMissing": "info"}],"is_active":true,"created_at":"2026-06-05T14:11:13.796","updated_at":"2026-06-05T20:27:02.185"}');
INSERT INTO coverage_envelopes SELECT * FROM json_populate_record(NULL::coverage_envelopes, '{"envelope_id":"cmq105j4300281399kmrebnt2","line_of_business":"liability","profile_segment":"","version":1,"expectations":[{"taxonomyKey": "liability.professional", "severityIfMissing": "recommended"}, {"taxonomyKey": "liability.general", "severityIfMissing": "info"}],"is_active":true,"created_at":"2026-06-05T14:11:15.075","updated_at":"2026-06-05T20:27:03.521"}');

-- document_extractions: 0 rows

-- insurer_templates: 0 rows
