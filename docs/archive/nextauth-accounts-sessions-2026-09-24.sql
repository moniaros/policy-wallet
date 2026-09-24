-- Archive before dropping the NextAuth `accounts` and `sessions` tables
-- (migration 20260924191000_drop_nextauth_account_session), per CLAUDE.md:
-- «export the affected rows to docs/archive before a destructive prod change».
--
-- Row counts at the time of the drop, 2026-09-24:
--   production (cquudefwfwrmvpftuhyl): accounts = 0, sessions = 0
--   development (lzqvtvjggylcujenlelh): accounts = 0, sessions = 0
-- There are therefore no rows to export. Rollback = recreate the tables:

CREATE TABLE "accounts" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE,
  "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "provider_account_id" TEXT NOT NULL,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" INTEGER,
  "token_type" TEXT,
  "scope" TEXT,
  "id_token" TEXT,
  "session_state" TEXT
);
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

CREATE TABLE "sessions" (
  "id" TEXT PRIMARY KEY,
  "session_token" TEXT NOT NULL,
  "user_id" TEXT NOT NULL REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE,
  "expires" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");
