-- Feature flags become operable without a redeploy.
--
-- This product already has feature flags. They are environment variables —
-- FF_AI_FAILOVER_OPENAI, FF_AI_DEGRADED_COMPLETION, FF_AI_REMEDIATION_ALERTS,
-- FF_AI_REMEDIATION_CANARY_MODE, AI_ALLOW_FULL_FAILOVER,
-- ENFORCE_EMAIL_VERIFICATION, EXTRACTION_CITATIONS — read directly from
-- process.env at the call site. They work. What they cannot do is change: a
-- flip means editing the Vercel environment and redeploying, so the one control
-- you reach for while something is going wrong in production is the one that
-- costs a build.
--
-- These two tables put a database layer IN FRONT of those variables. Precedence
-- on read is: DB row -> environment variable -> the default declared in
-- lib/flags/registry.ts. That ordering is the whole safety argument:
--
--   * No row, or an unreadable database, means the product behaves exactly as
--     it shipped. The flag layer is optional by construction, the same contract
--     notification rule overrides already hold to.
--   * A row for a key that is not in the registry is inert. Flags are declared
--     in code and merely *tuned* here, so nobody can conjure a live switch that
--     no call site reads.
--   * `enabled` and `rollout` are NULLABLE on purpose. NULL is "no opinion,
--     fall through", which is a different statement from "off" and has to stay
--     distinguishable, or clearing an override would silently mean disabling.
--
-- `rollout` reuses the canary vocabulary already implemented in
-- lib/services/analysis/remediation-policy.ts (off | internal | 10 | 50 | 100)
-- rather than inventing a second rollout dialect for the same idea.
--
-- Everything here is additive: new tables only, no column added to or removed
-- from an existing one, so the currently deployed code — which reads neither —
-- is unaffected and this can be applied before the code that uses it.

CREATE TABLE "feature_flags" (
    "flag_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN,
    "rollout" TEXT,
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "changed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("flag_id")
);

CREATE UNIQUE INDEX "feature_flags_key_key" ON "feature_flags"("key");

CREATE TABLE "feature_flag_revisions" (
    "revision_id" TEXT NOT NULL,
    "flag_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changes" JSONB NOT NULL,
    "changed_by" TEXT NOT NULL,
    "changed_by_email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_flag_revisions_pkey" PRIMARY KEY ("revision_id")
);

CREATE INDEX "feature_flag_revisions_flag_id_created_at_idx" ON "feature_flag_revisions"("flag_id", "created_at");

ALTER TABLE "feature_flag_revisions"
    ADD CONSTRAINT "feature_flag_revisions_flag_id_fkey"
    FOREIGN KEY ("flag_id") REFERENCES "feature_flags"("flag_id")
    ON DELETE CASCADE ON UPDATE CASCADE;
