# Hero background correction — 21 October 2026

## Presentation preference
The owner clarified that the existing lifestyle film belongs behind the entire hero, as in the supplied Bitpanda desktop/mobile screenshots, with the former light background retained. Replaced the split forest-copy/video columns with a full-bleed media layer, light ivory scrim and dark forest heading/body. The signup action is forest on white. Desktop leaves the right side open to the film; mobile uses a vertical scrim and space above the copy. Existing film, text, header and lower sections are retained. No new generation or credits, and no visible AI caption.

## Correctness / security
No new correctness or security defect found. No database, authentication, pricing, consent or authorization changes. Existing muted looping playback, pause/play, offscreen/hidden pausing and reduced-motion, data-saving, failed-media and no-JavaScript fallbacks remain. The control sits above the scrim and outside the signup form's box.

## Local verification
- API auth inventory: 116 routes, no findings. Lint, type check, changed-string i18n, UTF-8, production build and 88-migration dev verification passed.
- 700 unit files / 7,873 tests passed.
- All seven real-browser video scenarios passed; two hero axe scans returned no violations. Measured media and hero boxes are identical at every tested width/mode, dark forest text and ivory background confirmed, no horizontal overflow, controls at least 44px and outside the form.
- Desktop 1440px and mobile 390px screenshots inspected together. English 320px, reduced motion, Save-Data, failed video and no JavaScript passed. Separate 768px Greek and 390px English dark-theme checks confirmed light hero treatment and preserved email/role handoff to signup (no account created).
- Impeccable layout scan: no findings. A test-script lint finding for the browser global was fixed using window.getComputedStyle; lint then passed. No UI repair was needed after the screenshot review.

## Release
[PR #402](https://github.com/moniaros/policy-wallet/pull/402), candidate `ed2d0830584090c18df642f98617dd36295ffeda`. All seven cases and two clean hero axe scans passed on protected preview `policy-wallet-kx8c4pd7m-moniaros-projects.vercel.app`, deployment `dpl_BsKRDXiwz6mYQWArkSsr3a92pA7T`. Preview uses the established nonfunctional placeholder configuration for this public-only check; no local database credentials were uploaded and that artifact is not promoted to production. Production release verification is recorded below.

The CI security job passed with advisory npm-audit/outdated-dependency annotations; no dependencies changed in this patch. The Money Path job skips its browser journey without the E2E database secret, so this release does not claim paid-checkout verification.

## Merge gate
PR CI [39596354597](https://github.com/moniaros/policy-wallet/actions/runs/39596354597) passed. PR #402 merged as `b9d611ab1bd863e6dd24331cae6cadcba4b280e2`; the application diff from the verified preview candidate is empty. Production CI 39597941664 passed as the deployment gate. Temporary preview access-cookie files were removed after verification.

## Production — verified
Production CI [39597941664](https://github.com/moniaros/policy-wallet/actions/runs/39597941664) and deployment [39599461265](https://github.com/moniaros/policy-wallet/actions/runs/39599461265) succeeded for `b9d611ab1bd863e6dd24331cae6cadcba4b280e2`. Vercel `dpl_5MBjtrQUYvxj7eDqTvE37HT3f95R` is READY, target production, at `policy-wallet-a7ypop7xa-moniaros-projects.vercel.app`, serving https://www.policywallet.gr.

All seven real-browser cases passed on production with a normal process exit. The measured media box equals the full hero box on desktop, mobile and English 320px, including static fallback modes. Both hero axe scans were clear; desktop/mobile production captures were inspected together and match the approved light composition. Pause/resume, offscreen/hidden playback, explicit pause persistence, reduced-motion changes, no-video-download preferences and failed-media fallback all passed.

Production's schema gate measured 88 applied migrations, none pending, three prevention tables with RLS, 34 columns and five cascade foreign keys. No database write was needed. The existing POOLED_DATABASE_URL/session-pool warning and registration pause remain separate operational follow-ups. Root-checkout work was preserved. The final follow-up contains documentation/evidence only and does not alter the verified application.
