-- CreateIndex
CREATE INDEX "access_grants_grantee_user_id_status_scope_idx" ON "access_grants"("grantee_user_id", "status", "scope");

-- CreateIndex
CREATE INDEX "access_grants_granter_user_id_idx" ON "access_grants"("granter_user_id");
