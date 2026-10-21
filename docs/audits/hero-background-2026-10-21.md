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
Pending protected preview and production verification. Preview uses the established nonfunctional placeholder configuration for this public-only check; no local database credentials are uploaded and that artifact is not promoted to production.
