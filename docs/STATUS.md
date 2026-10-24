# Status

## Current phase
PW-CONTENT-02 (public site: say only what is true, say it once) built on `pw-customer`, PR #410 (ready for review, DO NOT MERGE until Eli does) into `NEW-UI` — 24 October 2026, owner decisions applied. **NO-GO, not merged:** merging deploys to production. Last non-production preview (of `24e8fd43`, round 5): https://policy-wallet-qm2seq76t-moniaros-projects.vercel.app (SSO-gated; which Supabase project it reaches is unverified — treat as PRODUCTION). Round-7 preview (of `d8fa8f58`, journey-checked read-only 2026-10-24): https://policy-wallet-4u22f4abk-moniaros-projects.vercel.app

**PW-ASSET-01 (branch `pw-asset`, 2026-10-24): Step 0 APPROVED by Eli with H-012..H-018 decisions. Build NOT started; it waits for PW-STAGING-01.** Production profiled read-only (STEP0 §2.9: 12 policies, 0 duplicate or ambiguous asset cases, design unchanged); migration approved for staging only, production after the build review; DECISIONS PW-A01-*. Open: H-036 (does "staging" include dev?).

## Done
- Merged NEW-UI (#411 mobile public menu `91579018`, #412 its release record) into `pw-customer` on 2026-10-24; production already runs it. NEW-UI's own status section (menu release, withdrawal-flow risk: paid checkout stays withheld until statutory online withdrawal is built) is in git history at `origin/NEW-UI:docs/STATUS.md`.
- Public claims equal enforced code and the **production plan rows** (H-021 closed: the defaults equal them and they parse — `plan-defaults-match-production-rows`, `production-rows-parse-as-entitlements`). Agent caps published 5 / 50 / 150 / 400.
- Annual saving computed from prices; Family trial disclosed from the plan row on every selling surface and the Stripe hosted checkout; no token/credits copy; no unbounded-Q&A copy; cancel claims always carry "access continues to the end of the paid period" (one source); reminder offsets composed from the scheduler's constants. Each guard shown red first (`docs/series/PW-CONTENT-02/evidence/`).
- **Round 7:** FINAL interim token budgets in code, fixture and guard — Family 8,700,000; agents 2.0M / 19.6M / 58.7M / 156.3M (cache-miss path, verification on); all seven raw production blobs parse (flag R). Budget sizing is closed: BUDGET-MEASURE replaces every interim value before GA.
- **Round 6:** **Terms §5 applied** (agents cancel by email to info@policywallet.gr) with all five legal versions bumped to `GR-GA-2026.10.22`; Terms §12 EN/GR mismatch opened as GA blocker H-035 with a drafted fix.
- Reviews of every unreviewed delta ended `CRITICAL: 0` (history in `docs/series/PW-CONTENT-02/RESULT.md` §8–§13); the commit after the round-7 review changed docs/tests/comments only. 710 test files / ~7,960 tests, every CI guardrail green locally.

## In progress / Blocked (merge blockers, owner)
- **Done 2026-10-24:** budgets written to production and re-read (D30); `PREVENTION_PERSONALIZATION_ENABLED` = 0 (MCP); H-025 closed and COPY approved in full (owner-attested); checklist items 1–4 ticked.
- **Done 2026-10-24:** journey check approved (item 11); renewal cron confirmed enabled (item 9, owner-attested + MCP-verified); Brevo (item 8) ticked owner-attested, SPF fix queued (BREVO-SPF); snapshot, dev and guardrail points done (D31); NEW-UI (#411, #412) already merged into the branch (`c95c2e8f`).
- **Done 2026-10-24:** final review of the tip (item 10) → `CRITICAL: 0 / IMPORTANT: 6 / MINOR: 9` (RESULT.md §14); CI on PR #410 green after re-running one timing-flaky test (`voice-guards` length-budget); H-011 closed (verified in code); SEC-01 check inconclusive (drains endpoint 404), stays open.
- **Open before the merge button (Eli):** read RESULT.md §14, especially I-1 (production plan rows were written ahead of the code: Agent Free's write is inert until the merge, Family's `8.7M` is visible in the deployed token card until the merge); then the deploy steps in GO-CHECKLIST.
- The Stripe live portal/webhook/trial reminder are in «Before switching production to live Stripe keys» (GA blocker, not a merge blocker; D28).

- **Production SQL needs the owner's approval per call** (`execute_sql` is `ask`; migration, edge-function, branch, project and `npx prisma` tools are denied in `.claude/settings.json`).

## Top risks ranked
1. **Broken / insecure (gates launch, GA):** BUDGET-MEASURE (token budgets are estimate-based; the scan/upload extraction and verification draw on the same row); H-035 Terms §12; `/api/v1/policies/share` skips the Family entitlement (PW-ENTITLE-01 item 2, security-reviewer); the live checkout grants the trial to every checkout (PW-ENTITLE-01 item 1); no subscription-start or trial-ending email (H-032); dead token top-up route still sells packs.
2. **Paid consumer checkout must not open until the statutory online withdrawal function exists** (declaration, confirmation, durable receipt; `docs/audits/public-language-legal-2026-10-21.md`; carried from NEW-UI's STATUS, restored here after the review found it dropped; not yet in the live-Stripe gate G1–G4).
3. The boat-liability rule vs ν. 4926/2022 still in the in-app domain model.
4. Previews reach the production database until a staging Supabase project is wired (PW-STAGING-01; blocks the PW-ASSET-01 build, whose migration is approved for staging only).
**UI/UX (does not gate):** dead verdict components still importable; demo dates/k-M amounts hand-typed.

## Next 3 actions
1. Item 10 review result and a green CI run on PR #410; Eli answers the review's open points.
2. Eli merges PR #410; then the view-only post-deploy check when deploy.yml has finished.
3. Queue: BUDGET-MEASURE, H-035 legal commit, PW-ENTITLE-01, PW-CLAIMREG-01. PW-STAGING-01, then the PW-ASSET-01 build (Eli answers H-036 before the first migration apply).
