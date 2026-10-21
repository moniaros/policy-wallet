# Status

## Current phase
Hero lifestyle video shipped — 21 October 2026. [PR #400](https://github.com/moniaros/policy-wallet/pull/400), production application `2236dfdd`.

## Done
- Five-scene Higgsfield film: family with children, pets, parked-car driver, office colleagues, insurance agents/client.
- Silent 15.04s / 720p MP4, 1.63 MB; first-scene poster; EL/EN pause/play. No visible generation caption.
- Reduced-motion/data-saving and media-error fallbacks; offscreen/hidden pause; explicit user pause persists.
- 7,873 unit tests, required guardrails and builds passed. Seven cases passed locally, on protected preview and live; two hero axe scans clear per environment.
- Production CI 39592337773 and deploy 39593746229 succeeded. Live asset hash matches; end-to-start looping verified. Production schema gate: 88 migrations, none pending.

## In progress
- Remaining protected policyholder/agent/agency presentation improvements are a subsequent tranche.

## Blocked
- No video-release blocker. Existing production registration pause retained. Optional Kilo review unavailable (credits).

## Top risks ranked
1. Existing production session-pool fallback without POOLED_DATABASE_URL needs an infrastructure review.
2. Paid checkout and hardware passkeys remain outside this presentation verification.

## Next 3 actions
1. Continue the presentation direction across protected agent/agency pages.
2. Refine protected policyholder pages while preserving their identity.
3. Resolve the pool warning and verify payment/passkey journeys independently.

Evidence: [hero video audit](audits/hero-video-2026-10-21.md).
