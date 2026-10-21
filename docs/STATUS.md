# Status

## Current phase
PW-CONTENT-02 (public site: say only what is true, say it once) built on `pw-customer`, uncommitted-to-NEW-UI — 22 October 2026. Not merged, not deployed.

## Done
- Public claims equal enforced code: 12 false entitlement claims removed (Free/Plus «Πλήρης ανάλυση AI», Agent Pro «200», Free reminders, …), tagged with `planClaim` and guarded. In-app «πρώτη πλήρης ανάλυση είναι δωρεάν» removed (no grant built; PW-ENTITLE-01 stub queued).
- One positioning line, one free-limit statement, no published analysis limit, prices numeric until render, JSON-LD numeric. Rendered positioning variants 19 → 0; cross-page duplicate blocks 289 → 0.
- Six new/extended guards, each shown red first. Adversarial review round: 4 CRITICAL + 11 IMPORTANT, fixed or recorded. 701 test files / 7,895 tests, lint, i18n, utf8, types, migrations, build pass. Lighthouse 100/100 unchanged.

## In progress
- Awaiting Eli: 14 COPY rows; H-021 production plan rows (MERGE BLOCKER); H-025 no-commission confirmation. Support is email only; no DPO sign-off is required.

## Blocked
- Production `plans.entitlements` not read (no credential): H-021 residue. Paid checkout still restricted.

## Top risks ranked
1. **Broken / insecure (gates launch):** in-app claims outside this series still say «Απεριόριστες αναλύσεις» / monthly cap (`/account`, agent pricing); the Free upsell slot in `AnalysisCard` is unreachable; ~20 pages quote prices from code defaults, not the live catalogue.
2. H-021 (production entitlements unread) is a MERGE BLOCKER; H-025 (no-commission claims) awaits confirmation.
3. Online withdrawal still needed before paid consumer checkout.
**UI/UX (does not gate):** dead verdict components still importable; demo dates/k-M amounts hand-typed.

## Next 3 actions
1. Eli: paste production plan rows (H-021); confirm no-commission claims (H-025); sign off the 14 COPY rows.
2. Preview-journey check, then merge `pw-customer` → NEW-UI (CI auto-deploys).
3. Open PW-ENTITLE-01 with acceptance criteria; clean the in-app «unlimited» strings.

Evidence: `docs/series/PW-CONTENT-02/RESULT.md`.
