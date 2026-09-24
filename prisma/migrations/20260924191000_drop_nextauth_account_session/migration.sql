-- NextAuth leftovers: NextAuth left the dependency tree long ago and no code
-- reads these tables (the only reference was erasure's deleteMany). Both are
-- EMPTY on dev and prod (verified 2026-09-24); the archive file records that
-- and the DDL to recreate them. verification_tokens is NOT dropped: the
-- email-verification flow uses it.
DROP TABLE IF EXISTS "accounts";
DROP TABLE IF EXISTS "sessions";
