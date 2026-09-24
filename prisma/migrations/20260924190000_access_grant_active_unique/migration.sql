-- One ACTIVE grant per (granter, grantee, scope). sharePolicy already re-uses
-- or revives a grant (spec v2 Phase 0); this makes the database refuse a
-- duplicate too. Verified before creation: 0 duplicate active groups on dev
-- and prod (2026-09-24). Revoked/expired rows may repeat freely.
CREATE UNIQUE INDEX "access_grants_active_unique"
  ON "access_grants" ("granter_user_id", "grantee_user_id", "scope")
  WHERE "status" = 'active';
