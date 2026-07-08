# Billing catalog setup (Stripe + RevenueCat)

## Stripe

Run the idempotent catalog script on a machine with `STRIPE_SECRET_KEY` (test mode first, then live):

```bash
npx ts-node -P prisma/tsconfig.seed.json scripts/setup-billing-catalog.ts          # dry run — prints the plan
npx ts-node -P prisma/tsconfig.seed.json scripts/setup-billing-catalog.ts --apply  # creates products/prices
```

- Idempotency: prices are matched by `lookup_key` (`ph-plus_monthly`, `tokens_medium`, …); products by `metadata.pw_key`. Re-running never duplicates.
- Output: `lib/billing-catalog.json` (lookup_key → Stripe price ID) — commit the test-mode file per environment convention; live IDs belong in env/config, not git, if they differ.
- Pro trial: 14 days — apply via `subscription_data.trial_period_days` at Checkout-session creation (`lib/billing.ts`), not on the price.
- Token packs are one-time prices under the single `PolicyWallet AI Tokens` product; the app's package definitions live in `lib/billing/token-packages.ts` (single source of truth — the script imports it).

## RevenueCat (mobile)

RevenueCat is server-side only in this app (webhook + sync service). Dashboard configuration:

| RC product ID | Store product | Entitlement | Offering |
|---|---|---|---|
| `ph_plus_monthly` / `ph_plus_annual` | matching App Store/Play SKUs | `plus` | `policyholder` |
| `ph_pro_monthly` / `ph_pro_annual` | matching SKUs | `pro` | `policyholder` (default: `ph_plus_monthly`) |
| `agent_starter_monthly` … `agent_agency_annual` | matching SKUs | `agent_starter` / `agent_pro` / `agency` | `agents` |

- Entitlement identifiers must match the tier strings in `lib/subscription-entitlements.ts` (`plus`, `pro`, `agent_starter`, `agent_pro`, `agency`) — `lib/services/revenuecat.service.ts` maps entitlements → `Subscription` rows on webhook/sync.
- Webhook: point RC to `/api/v1/billing/revenuecat-webhook` with the `REVENUECAT_WEBHOOK_AUTH_VALUE` header value from env.
- Token packs are **not** sold on mobile (web-only Stripe PaymentIntents) — avoids app-store commission on consumables.
