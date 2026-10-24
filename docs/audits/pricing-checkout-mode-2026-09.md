# Pricing: why «can this deployment take money» is keyed on Stripe MODE

Moved verbatim from CLAUDE.md «CATALOG COUPLING» on 2026-10-11. The live rule and the pointer to `publicCheckoutAvailability()` remain in CLAUDE.md.

Standing task — DONE 2026-09-11, and its wording was wrong. It asked for a refusal keyed
on `stripe_price_id` resolving in LIVE mode; that field charges nothing. `lib/billing.ts`
builds checkout line items from inline `price_data` off the plan ROW, and
`Plan.stripePriceId` is only ever written back FROM Stripe by the webhook — so a plan with
an empty one charges fine and a plan with a good one may charge nothing.

What actually makes an advertised price unchargeable is the MODE, and production was
serving that defect: `/pricing` offered the paid tiers with a working buy button while
`STRIPE_SECRET_KEY` was a test key, so a visitor could reach a sandbox checkout, type a
card and land on a success screen having paid nothing. `publicCheckoutAvailability()`
([lib/pricing/stripe-mode.ts](lib/pricing/stripe-mode.ts)) is now the one answer to «can
this deployment take money». A blocked paid plan keeps its PRICE — the price is true — and
loses its BUTTON; free and contact plans are untouched because neither promises a payment.
The same rule guards `createCheckoutSession`, because /account reaches checkout without
passing the pricing card. It is deliberately NOT «test mode is bad»: sandbox checkout is
correct in dev and preview and false only on a production deployment. Guard:
`tests/unit/pricing-refuses-unchargeable-plans.test.tsx` with a probe.
