-- Multi-agent team support: enhance Tenant + TenantMembership models

-- Tenant: add agency profile fields
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "logo_url" TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "brand_color" TEXT DEFAULT '#10b981';
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "website" TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "tax_id" TEXT;

-- Update default type from 'personal' to 'agency'
ALTER TABLE "tenants" ALTER COLUMN "type" SET DEFAULT 'agency';

-- TenantMembership: add status, invite tracking, user relation FK
ALTER TABLE "tenant_memberships" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "tenant_memberships" ADD COLUMN IF NOT EXISTS "invited_by" TEXT;
ALTER TABLE "tenant_memberships" ADD COLUMN IF NOT EXISTS "invited_at" TIMESTAMPTZ;
ALTER TABLE "tenant_memberships" ADD COLUMN IF NOT EXISTS "joined_at" TIMESTAMPTZ;

-- Add user FK (was missing)
ALTER TABLE "tenant_memberships"
  ADD CONSTRAINT "tenant_memberships_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Index for user lookups
CREATE INDEX IF NOT EXISTS "tenant_memberships_user_id_idx" ON "tenant_memberships"("user_id");
