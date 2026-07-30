-- Enrich insurers with the Greek-market reference dataset
-- (prisma/greek-insurers.json — 29 research records, 27 imported; the two
-- status='merged' historic entities are deliberately skipped). Adds bilingual
-- names, the registered legal entity, market status, group parent, contact
-- channels (call centre / claims / roadside, all free text because Greek short
-- codes like "18189" and dual-number strings are not phone-shaped), HQ address,
-- the roadside-assistance partner, a 22-value lines-of-business vocabulary
-- (lib/insurers/constants.ts — NOT the product taxonomy), and a per-field
-- verification-confidence map surfaced as badges in /admin/insurers.
--
-- slug is the permanent dataset join key; NULL means the row was created by an
-- admin rather than the import. Data itself is applied separately via
-- scripts/gen-insurer-seed-sql.ts (idempotent upserts keyed on slug) — this
-- migration is DDL only, all additive and nullable/defaulted so the running
-- deployment is unaffected.

ALTER TABLE "insurers" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "insurers" ADD COLUMN IF NOT EXISTS "name_en" TEXT;
ALTER TABLE "insurers" ADD COLUMN IF NOT EXISTS "legal_name_el" TEXT;
ALTER TABLE "insurers" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "insurers" ADD COLUMN IF NOT EXISTS "group_parent" TEXT;
ALTER TABLE "insurers" ADD COLUMN IF NOT EXISTS "website" TEXT;
ALTER TABLE "insurers" ADD COLUMN IF NOT EXISTS "call_center" TEXT;
ALTER TABLE "insurers" ADD COLUMN IF NOT EXISTS "claims_phone" TEXT;
ALTER TABLE "insurers" ADD COLUMN IF NOT EXISTS "roadside_phone" TEXT;
ALTER TABLE "insurers" ADD COLUMN IF NOT EXISTS "payment_gateway_url" TEXT;
ALTER TABLE "insurers" ADD COLUMN IF NOT EXISTS "contact_email" TEXT;
ALTER TABLE "insurers" ADD COLUMN IF NOT EXISTS "hq_address" JSONB;
ALTER TABLE "insurers" ADD COLUMN IF NOT EXISTS "roadside_assistance_provider" TEXT;
ALTER TABLE "insurers" ADD COLUMN IF NOT EXISTS "lines_of_business" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "insurers" ADD COLUMN IF NOT EXISTS "field_confidence" JSONB;
ALTER TABLE "insurers" ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- Prisma's default unique-index name for @unique slug. Plain (not CONCURRENTLY):
-- the table holds a few dozen rows and DDL runs through the pooler.
CREATE UNIQUE INDEX IF NOT EXISTS "insurers_slug_key" ON "insurers"("slug");
