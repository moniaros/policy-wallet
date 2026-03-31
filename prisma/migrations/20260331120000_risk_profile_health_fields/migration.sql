-- Health & Lifestyle Risk Fields for PolicyholderProfile
-- Adds: gender, height/weight (BMI), chronic conditions, family medical history,
-- driving record, activity level — for more accurate insurance gap detection.

ALTER TABLE "policyholder_profiles" ADD COLUMN "gender" TEXT;
ALTER TABLE "policyholder_profiles" ADD COLUMN "height_cm" INTEGER;
ALTER TABLE "policyholder_profiles" ADD COLUMN "weight_kg" INTEGER;
ALTER TABLE "policyholder_profiles" ADD COLUMN "chronic_conditions" JSONB;
ALTER TABLE "policyholder_profiles" ADD COLUMN "family_medical_history" JSONB;
ALTER TABLE "policyholder_profiles" ADD COLUMN "driving_record" TEXT;
ALTER TABLE "policyholder_profiles" ADD COLUMN "activity_level" TEXT;
