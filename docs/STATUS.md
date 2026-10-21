# Status

## Current phase
Light hero with full-width background video shipped — 21 October 2026. [PR #402](https://github.com/moniaros/policy-wallet/pull/402), production application `b9d611ab`.

## Done
- Existing five-scene lifestyle film fills the hero behind heading/signup on desktop and mobile.
- Light ivory background, dark forest text and forest signup action restored; header and other sections preserved.
- Playback controls, poster and motion/data/error fallbacks retained; no visible AI caption or new generation.
- 7,873 unit tests, guardrails, production build and 88-migration dev verification passed. Seven cases and two clear hero axe scans locally, on preview and live; dark-theme signup handoff verified locally.
- Production CI 39597941664 and deploy 39599461265 succeeded. Live full-hero media geometry and light styling verified. Production schema gate: 88 migrations, none pending.

## In progress
- Remaining protected policyholder/agent/agency presentation is a subsequent tranche.

## Blocked
- No hero-release blocker. Existing production registration pause retained.

## Top risks ranked
1. Existing production session-pool fallback without POOLED_DATABASE_URL needs infrastructure review.
2. Paid checkout and hardware passkeys remain outside presentation verification.

## Next 3 actions
1. Continue protected agent/agency presentation.
2. Refine policyholder pages while preserving their identity.
3. Review pool configuration and payment/passkey journeys independently.

Evidence: [background correction audit](audits/hero-background-2026-10-21.md).
