# Status

## Current phase
PW-CONTENT-02 (public site: say only what is true, say it once) built on `pw-customer`, PR #410 (draft) into `NEW-UI` — 22 October 2026, round 6. **NO-GO, not merged:** merging deploys to production. Last non-production preview (of `24e8fd43`, round 5): https://policy-wallet-qm2seq76t-moniaros-projects.vercel.app (SSO-gated; which Supabase project it reaches is unverified — treat as PRODUCTION). It predates round 6 (Terms §5, interim budgets); redeploy before the journey check.

## Done
- Public claims equal enforced code and the **production plan rows** (H-021 closed: the defaults equal them and they parse — `plan-defaults-match-production-rows`, `production-rows-parse-as-entitlements`). Agent caps published 5 / 50 / 150 / 400.
- Annual saving computed from prices; Family trial disclosed from the plan row on every selling surface and the Stripe hosted checkout; no token/credits copy; no unbounded-Q&A copy; cancel claims always carry "access continues to the end of the paid period" (one source); reminder offsets composed from the scheduler's constants. Each guard shown red first (`docs/series/PW-CONTENT-02/evidence/`).
- **Round 6:** interim token budgets in code and fixture — Family 5,700,000; agents 1.7M / 16.8M / 50M / 134M (sized for `AGENT_INDEPENDENT_VERIFICATION=1`); **Terms §5 applied** (agents cancel by email to info@policywallet.gr) with all five legal versions bumped to `GR-GA-2026.10.22`; Terms §12 EN/GR mismatch opened as GA blocker H-035 with a drafted fix.
- Reviews of every unreviewed delta ended `CRITICAL: 0` (history in `docs/series/PW-CONTENT-02/RESULT.md` §8–§12); commits after the last review changed docs/tests/comments only. 710 test files / ~7,960 tests, every CI guardrail green locally.

## In progress / Blocked (merge blockers, owner)
- **H-025**: confirm the public no-commission claims (C-37's commission sentence is held with it).
- **COPY.md**: re-approvals (re-approval table at the end of `COPY.md`).
- Owner manual items on `docs/series/PW-CONTENT-02/GO-CHECKLIST.md`: interim budgets saved in /admin/plans, `AGENT_INDEPENDENT_VERIFICATION`, `PREVENTION_PERSONALIZATION_ENABLED=0`, Stripe live portal + webhook + trial reminder, Brevo + renewal cron run history.

## Top risks ranked
1. **Broken / insecure (gates launch, GA):** BUDGET-MEASURE (token budgets are estimate-based; the scan/upload extraction and verification draw on the same row); H-035 Terms §12; `/api/v1/policies/share` skips the Family entitlement (PW-ENTITLE-01 item 2, security-reviewer); the live checkout grants the trial to every checkout (PW-ENTITLE-01 item 1); no subscription-start or trial-ending email (H-032); dead token top-up route still sells packs.
2. H-025 no-commission claims; the boat-liability rule vs ν. 4926/2022 still in the in-app domain model.
3. Previews reach the production database until a staging Supabase project is wired (blocks PW-ASSET-01).
**UI/UX (does not gate):** dead verdict components still importable; demo dates/k-M amounts hand-typed.

## Next 3 actions
1. Eli: the manual GO-CHECKLIST items; H-025; COPY re-approvals.
2. Redeploy the preview from the tip; Eli: view-only journey check; then GO per the checklist (merge → CI → production deploy).
3. Queue: BUDGET-MEASURE, H-035 legal commit, PW-ENTITLE-01 (trial once per customer; share-route entitlement), PW-CLAIMREG-01.
