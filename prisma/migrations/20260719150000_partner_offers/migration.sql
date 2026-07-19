-- Partner-offers program (Revolut-style third-party benefits bundled into
-- paid tiers): vendor + offer catalog tables, admin-managed via
-- /admin/partners. NO seed rows on purpose — is_active defaults false and
-- the catalog starts empty, so nothing renders anywhere until an admin
-- activates a real, signed partner (repo honesty rule: never market what
-- isn't live). Idempotent by construction.

CREATE TABLE IF NOT EXISTS "partner_vendors" (
    "vendor_id"   TEXT NOT NULL,
    "slug"        TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "description" JSONB NOT NULL,
    "logo_url"    TEXT,
    "website_url" TEXT,
    "category"    TEXT NOT NULL DEFAULT 'lifestyle',
    "is_active"   BOOLEAN NOT NULL DEFAULT false,
    "sort_order"  INTEGER NOT NULL DEFAULT 0,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_vendors_pkey" PRIMARY KEY ("vendor_id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "partner_vendors_slug_key" ON "partner_vendors"("slug");
CREATE INDEX IF NOT EXISTS "partner_vendors_is_active_sort_order_idx" ON "partner_vendors"("is_active", "sort_order");

CREATE TABLE IF NOT EXISTS "partner_offers" (
    "offer_id"          TEXT NOT NULL,
    "vendor_id"         TEXT NOT NULL,
    "slug"              TEXT NOT NULL,
    "title"             JSONB NOT NULL,
    "description"       JSONB NOT NULL,
    "offer_type"        TEXT NOT NULL,
    "redemption_method" TEXT NOT NULL,
    "redemption_url"    TEXT,
    "redemption_code"   TEXT,
    "redemption_phone"  TEXT,
    "included_in_tiers" TEXT[],
    "profile_tags"      TEXT[],
    "lines_of_business" TEXT[],
    "valid_from"        TIMESTAMP(3),
    "valid_until"       TIMESTAMP(3),
    "terms_url"         TEXT,
    "is_active"         BOOLEAN NOT NULL DEFAULT false,
    "sort_order"        INTEGER NOT NULL DEFAULT 0,
    "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"        TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_offers_pkey" PRIMARY KEY ("offer_id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "partner_offers_slug_key" ON "partner_offers"("slug");
CREATE INDEX IF NOT EXISTS "partner_offers_is_active_sort_order_idx" ON "partner_offers"("is_active", "sort_order");
CREATE INDEX IF NOT EXISTS "partner_offers_vendor_id_idx" ON "partner_offers"("vendor_id");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'partner_offers_vendor_id_fkey'
    ) THEN
        ALTER TABLE "partner_offers"
            ADD CONSTRAINT "partner_offers_vendor_id_fkey"
            FOREIGN KEY ("vendor_id") REFERENCES "partner_vendors"("vendor_id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
