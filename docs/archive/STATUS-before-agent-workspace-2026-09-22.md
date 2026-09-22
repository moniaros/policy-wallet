# STATUS

## Current phase

**Marketing release deployed — 2026-09-20.** Production code `c92a3db1` on `NEW-UI`, live at https://www.policywallet.gr. Prior history: [archive](archive/STATUS-before-analytics-content-2026-09-20.md).

## Done

- Shipped GA-informed bilingual content, simpler Greek copy, interactive home/product previews, guide search + Higgsfield image, and pricing controls on eight EL/EN routes. [Release evidence](audits/marketing-release-2026-09-20.md).
- Preserved upstream registration controls and security fixes. Local 7,563 tests / 654 files pass; build, API auth, lint, i18n, UTF-8, types, private-material audit/probes and migration verification pass.
- GitHub CI and Vercel deployment succeeded for the exact code commit. Vercel deployment `dpl_eH9BmapERqGEqLhwpn3v39QoDSdo` is Ready with production aliases. Live smoke checks passed on all eight routes, including preview selections, guide filtering/reset/empty states, both pricing audiences and annual billing.
- Earlier UI verification: 32 responsive observations, no overflow; additional compressed route JS below 25 KB, editorial image 18 KB. Plain-language review covered 144 public sitemap routes at 320px.

## In progress

Release complete. No database or billing changes.

## Blocked

No deployment blocker. Existing production settings keep new registrations and paid checkout paused. CI's paid-conversion journey was skipped by its credential gate; no payment was attempted.

## Top risks ranked

1. **Operational:** registration/paid-checkout availability remains controlled by existing settings; publishing this UI does not enable purchases.
2. **Accuracy:** dated tax guidance needs periodic review; binding legal quotations retain necessary complexity.
3. **UX/measurement, not launch gates:** readability is not reader-tested; small traffic samples do not establish conversion improvements. Analytics filters/conversion setup remain unverified.

## Next 3 actions

1. Review the existing registration and payment configuration when ready to accept customers.
2. Test comprehension with readers unfamiliar with insurance.
3. Verify analytics conversion events/internal-traffic filters and compare a matching reporting window.

Before future commit/push: `audit:private-material`, `audit:api-auth`, `lint`, `type-check`, `verify:migrations`, `lint:i18n-changed`, `lint:utf8`, tests/build.
