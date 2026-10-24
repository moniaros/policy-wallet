# Status

## Current phase
PW-CONTENT-02 (public site: say only what is true, say it once) built on `pw-customer`, PR #410 (draft) into `NEW-UI` — 24 October 2026, owner decisions applied. **NO-GO, not merged:** merging deploys to production. Last non-production preview (of `24e8fd43`, round 5): https://policy-wallet-qm2seq76t-moniaros-projects.vercel.app (SSO-gated; which Supabase project it reaches is unverified — treat as PRODUCTION). Round-7 preview (of `d8fa8f58`, journey-checked read-only 2026-10-24): https://policy-wallet-4u22f4abk-moniaros-projects.vercel.app

## Done
- Merged NEW-UI (#411 mobile public menu `91579018`, #412 its release record) into `pw-customer` on 2026-10-24; production already runs it. NEW-UI's own status section (menu release, withdrawal-flow risk: paid checkout stays withheld until statutory online withdrawal is built) is in git history at `origin/NEW-UI:docs/STATUS.md`.
- Public claims equal enforced code and the **production plan rows** (H-021 closed: the defaults equal them and they parse — `plan-defaults-match-production-rows`, `production-rows-parse-as-entitlements`). Agent caps published 5 / 50 / 150 / 400.
- Annual saving computed from prices; Family trial disclosed from the plan row on every selling surface and the Stripe hosted checkout; no token/credits copy; no unbounded-Q&A copy; cancel claims always carry "access continues to the end of the paid period" (one source); reminder offsets composed from the scheduler's constants. Each guard shown red first (`docs/series/PW-CONTENT-02/evidence/`).
- **Round 7:** FINAL interim token budgets in code, fixture and guard — Family 8,700,000; agents 2.0M / 19.6M / 58.7M / 156.3M (cache-miss path, verification on); all seven raw production blobs parse (flag R). Budget sizing is closed: BUDGET-MEASURE replaces every interim value before GA.
- **Round 6:** **Terms §5 applied** (agents cancel by email to info@policywallet.gr) with all five legal versions bumped to `GR-GA-2026.10.22`; Terms §12 EN/GR mismatch opened as GA blocker H-035 with a drafted fix.
- Reviews of every unreviewed delta ended `CRITICAL: 0` (history in `docs/series/PW-CONTENT-02/RESULT.md` §8–§13); the commit after the round-7 review changed docs/tests/comments only. 710 test files / ~7,960 tests, every CI guardrail green locally.

## In progress / Blocked (merge blockers, owner)
- **Done 2026-10-24:** budgets written to production and re-read (D30); `PREVENTION_PERSONALIZATION_ENABLED` = 0 (MCP); H-025 closed and COPY approved in full (owner-attested); checklist items 1–4 ticked.
- **Owner:** approve the journey check (`evidence/journey/RESULT.md`; no 320/390px screenshots possible), tick Brevo (item 8; SPF lists only Zoho) and the renewal cron (item 9; `automation.paused` unread); decide the review's open points (snapshot shape of five `plan_revisions` rows, settings guardrails, dev not rehearsed). Then mark PR #410 ready; NEW-UI (#411, #412) must be merged into the branch first.
- The Stripe live portal/webhook/trial reminder are in «Before switching production to live Stripe keys» (GA blocker, not a merge blocker; D28).

## Top risks ranked
1. **Broken / insecure (gates launch, GA):** BUDGET-MEASURE (token budgets are estimate-based; the scan/upload extraction and verification draw on the same row); H-035 Terms §12; `/api/v1/policies/share` skips the Family entitlement (PW-ENTITLE-01 item 2, security-reviewer); the live checkout grants the trial to every checkout (PW-ENTITLE-01 item 1); no subscription-start or trial-ending email (H-032); dead token top-up route still sells packs.
2. The boat-liability rule vs ν. 4926/2022 still in the in-app domain model.
3. Previews reach the production database until a staging Supabase project is wired (blocks PW-ASSET-01).
**UI/UX (does not gate):** dead verdict components still importable; demo dates/k-M amounts hand-typed.

## Next 3 actions
1. Eli: approve the journey check; tick items 8, 9, 11; answer the review's open points.
2. Merge NEW-UI into `pw-customer`, re-run the gates, mark PR #410 ready (Eli merges); then post-deploy check when deploy.yml has finished.
3. Queue: BUDGET-MEASURE, H-035 legal commit, PW-ENTITLE-01, PW-CLAIMREG-01.
