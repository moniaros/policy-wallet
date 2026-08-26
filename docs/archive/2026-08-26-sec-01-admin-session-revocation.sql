-- SEC-01 — revocation of admin sessions after session objects reached the Vercel runtime logs.
-- Executed against PRODUCTION (cquudefwfwrmvpftuhyl) 2026-08-26.
--
-- DEVIATION FROM THE ARCHIVE RULE, STATED DELIBERATELY.
-- The standing rule is to export affected rows before a destructive prod change, so the
-- export is the rollback. Here the affected rows ARE the credentials being killed:
-- auth.refresh_tokens.token is a live bearer secret. Committing it would reproduce, in
-- git, the exact harm this task exists to close — and a "rollback" that restores a
-- deliberately revoked credential is not a rollback anyone would ever want to run.
--
-- Exported below: identifiers and metadata only. The token column is EXCLUDED by design.
-- There is no restore path for this change, and that is the intended property.

-- ---------------------------------------------------------------------------
-- STATE BEFORE (SELECT, 2026-08-26)
-- ---------------------------------------------------------------------------
-- auth.sessions for 047af740-029d-448a-8b02-4885c77f249f (moniaros@gmail.com, role admin):
--
--   session_id  96ee5b42-5724-47ff-b40a-03083dbefb37
--   user_id     047af740-029d-448a-8b02-4885c77f249f
--   created_at  2026-08-26 01:21:01.670324+00
--   updated_at  2026-08-26 01:21:01.670324+00
--   not_after   NULL
--   aal         aal1
--   ip          186.247.46.50/32
--   user_agent  Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ... Chrome/151.0.0.0
--   refresh_tokens_attached  1
--
-- This session was created 68 seconds before the 01:22:09 TypeError that serialised a
-- session object into the runtime logs, so it is the probable subject of that entry.
--
-- The two refresh tokens visible in the leaked log lines ('t3lrjaccdywa', 'u3jpnrskf5kt')
-- were already ABSENT from auth.refresh_tokens at the time of this change — GoTrue rotates
-- on use — and both leaked access-token JWTs had expired ~68 hours earlier. Revocation here
-- is therefore about cutting any rotation chain descending from the leaked tokens, not about
-- the leaked tokens themselves.

-- ---------------------------------------------------------------------------
-- STATEMENT EXECUTED
-- ---------------------------------------------------------------------------
-- Rehearsed on dev (lzqvtvjggylcujenlelh) against e2e-admin@policywallet.test first:
-- 15 sessions deleted, 0 remaining, user row intact. auth.refresh_tokens cascades on
-- session delete, so the DELETE alone both drops the session and destroys its tokens;
-- a preceding UPDATE ... SET revoked = true is redundant.

DELETE FROM auth.sessions
WHERE user_id = '047af740-029d-448a-8b02-4885c77f249f'::uuid;

-- ---------------------------------------------------------------------------
-- NOT CLOSED BY THIS CHANGE
-- ---------------------------------------------------------------------------
-- Access tokens are signed JWTs and cannot be revoked without rotating the project's
-- signing key. Any access token minted before this ran stays valid until its own 1-hour
-- expiry. Both KNOWN leaked ones expired long before this change, so no key rotation was
-- performed; a leak discovered inside the 1-hour window would require one.
