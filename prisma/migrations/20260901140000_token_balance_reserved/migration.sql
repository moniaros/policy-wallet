-- In-flight claims against the purchased token pool.
--
-- The purchased branch of reserveTokens could only read the balance and then
-- allow: the check and the spend were separated by a whole model call, so two
-- concurrent steps both saw the same balance and were both admitted. This is
-- the purchased-pool twin of monthly_token_usage.reserved_tokens, letting the
-- claim be a single conditional UPDATE that concurrent claimants serialise on.
ALTER TABLE "token_balances"
  ADD COLUMN IF NOT EXISTS "reserved_tokens" BIGINT NOT NULL DEFAULT 0;
