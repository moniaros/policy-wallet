# Status

## Current phase
PW-CONTENT-02 (public site: say only what is true, say it once) built on `pw-customer`, PR #410 (draft) into `NEW-UI` — 22 October 2026. **NO-GO, not merged:** merging deploys to production. Non-production preview of `24e8fd43`: https://policy-wallet-qm2seq76t-moniaros-projects.vercel.app (SSO-gated; which Supabase project it reaches is unverified — treat as PRODUCTION).

## Done
- Public claims equal enforced code and now equal the **production plan rows** (H-021 closed: `plan-defaults-match-production-rows.test.ts`, 9/9). Agent caps published 5 / 50 / 150 / 400.
- Annual saving computed from prices (no typed months, percentages or «Έκπτωση» chips); Family trial disclosed with length and price from the plan row on every selling surface and on the Stripe hosted checkout; token meter and token/credits copy gone from customer surfaces. Each guard shown red first (`docs/series/PW-CONTENT-02/evidence/`).
- Reviews: passes 1–9 on the whole branch; round 3 on the unreviewed deltas: CRITICAL 1 (Agent Free «5», owner-gated H-027) → fixed everything else → CRITICAL 1 (typed savings fallback, fixed) → CRITICAL 0 on `362337d7`. The last commit `7ee1478c` (two sentences neutralised, guard probes) had no review. 705 test files / 7,936 tests, lint, i18n, utf8, types, migrations pass.

## In progress / Blocked (merge blockers, owner)
- Round 5 (2026-10-22): agent budgets set to the published-count rule; Terms §5 for agents DRAFTED not applied (`docs/series/PW-CONTENT-02/TERMS-5-DRAFT.md`); re-approval table at the end of `COPY.md`; GO checklist has the manual Stripe/Brevo/cron/flag/budget items.
- **H-027**: Agent Free's 150,000-token budget cannot honour the published «5»; run `docs/series/PW-CONTENT-02/evidence/h027-token-per-analysis-prod.sql` on production and resize budgets.
- **H-025**: confirm the public no-commission claims. **COPY.md**: 28 `eli` rows. Stripe trial-ending reminder email; live-mode cancel path (portal config). Checklist: `docs/series/PW-CONTENT-02/GO-CHECKLIST.md`.

## Top risks ranked
1. **Broken / insecure (gates launch):** H-027; `/api/v1/policies/share` skips the Family entitlement (PW-ENTITLE-01 item 2, security-reviewer); the live checkout grants the trial to every checkout (PW-ENTITLE-01 item 1); no subscription-start or trial-ending email (H-032); dead token top-up route still sells packs (QUEUE).
2. H-025 no-commission claims; boat-liability rule vs ν. 4926/2022 still in the in-app domain model (QUEUE).
3. Previews reach the production database until a staging Supabase project is wired (QUEUE: blocks PW-ASSET-01).
**UI/UX (does not gate):** dead verdict components still importable; demo dates/k-M amounts hand-typed.

## Next 3 actions
1. Eli: H-027 query + budgets; H-025; COPY rows; Stripe reminder email and live portal.
2. Eli: view-only journey check on the preview; then GO per the checklist (merge → CI → production deploy).
3. Queue: PW-ENTITLE-01 (trial once per customer; share-route entitlement), PW-CLAIMREG-01, staging Supabase for previews.
