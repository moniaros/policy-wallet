-- Add the `ai_processing` value to the ConsentType enum (GDPR Art. 9 consent for
-- sending policy documents — incl. special-category health data — to AI providers).
ALTER TYPE "ConsentType" ADD VALUE IF NOT EXISTS 'ai_processing';

-- Track the AI-processing consent version a user has accepted (mirrors the existing
-- terms/privacy/cookie version columns). NULL = no consent on record yet.
ALTER TABLE "users" ADD COLUMN "ai_processing_consent_version" TEXT;
