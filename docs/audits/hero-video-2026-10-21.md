# Hero lifestyle video — 21 October 2026

## Request and direction
Create a happy lifestyle background video for the public hero, inspired by Bitpanda, with family/children, pets, car drivers, office workers and insurance agents. Preserve the existing PolicyWallet presentation and the owner's request for no visible AI-generation captions.

## Presentation
Higgsfield Kling v3.0 produced one silent 15.04-second, 1920×1080 master. The five scenes share warm Mediterranean light, green/ivory clothing and a natural, optimistic tone. The car is parked. Faces/hand poses and each scene were checked on a 15-frame contact sheet. This is illustrative lifestyle media, not customer testimony or an insurance outcome claim.

The delivered MP4 is H.264, 1280×720, 24fps, no audio, fast-start, 1,629,821 bytes (master: 24,220,650 bytes). A first-scene JPEG supplies the server-rendered poster. Both locale homepages use the same film in the existing hero media column; the authenticated app and auth photography are unchanged. Exact prompt, provider job and SHA-256 are in the asset evidence.

## Correctness and accessibility
- No video source mounts for reduced-motion, Save-Data or slow-2G/2G visitors. Without JavaScript or supported observer/media APIs the poster remains.
- Playback is silent and inline, with localized keyboard-operable pause/play. An explicit pause survives scrolling away and back.
- Offscreen/hidden video pauses. Visibility returning resumes only when the visitor has not paused it.
- A blocked autoplay attempt leaves a play control; a failed media request leaves the poster and removes the unusable control.
- Photo/video share a reserved responsive box. No new layout shift or decorative page animation is introduced.

## Verification
- 700 unit files / 7,873 tests passed, plus API auth inventory, lint, type check, i18n, UTF-8, 88-migration dev verification and production build.
- The reviewed Greek inventory change contains only the poster description and pause/play labels. The first unit run exposed unsupported media APIs in the render harness; the component now safely falls back when those browser capabilities do not exist.
- Seven real-browser cases passed: desktop, mobile, English 320px, reduced motion, Save-Data, failed video and JavaScript disabled. Pause/resume via keyboard, persisted explicit pause, offscreen pause/resume, simulated hidden-tab events, live reduced-motion changes and zero downloads on preference fallbacks were verified.
- Two scoped hero axe scans found zero violations. Desktop/mobile captures and contact sheet were inspected. The initial offscreen probe scrolled only enough to show the next section while the hero remained partly visible; it was corrected to actually scroll the hero fully offscreen, then passed.
- No paid checkout, private policy data or database mutation is involved.

## Release
Preview and production evidence will be appended after verification. Native Higgsfield footage was used directly; no additional HTML motion render, typography, soundtrack or generation was needed. The initial FFmpeg WebP encoder was unavailable; the poster uses a small JPEG through Next Image instead.

## Protected preview
Candidate `136692a2df69381d3c41891fcb873b41d93441b2` deployed to `policy-wallet-faj16aofy-moniaros-projects.vercel.app` (Vercel `dpl_7HtH8p92EzhLHuA616sbhtj9rgJh`). All seven browser scenarios and both scoped axe scans passed there, with a normal test-process exit.

Automatic approval review rejected the original preview command because it would upload local database credentials. The existing Vercel preview values were empty. The accepted safer alternative used deliberately nonfunctional placeholder DB/Supabase/auth values and no real database credentials; this preview validates the public hero only, not private/authenticated journeys or live pricing. No production configuration was modified or copied from it. The first two browser attempts reached Vercel's access page because curl did not retain the access cookie; the returned Set-Cookie was then loaded into temporary browser storage and the actual app checks passed.

The optional Kilo review could not run because the account has insufficient credits. It is not counted as completed review.

## Merge and release gate
[PR #400](https://github.com/moniaros/policy-wallet/pull/400) merged as `2236dfdd423e1ccd0c7473f8c9dfa7845baceaea` after required PR CI `39590946171` succeeded. `git diff 136692a2 origin/NEW-UI -- . :!docs` was empty: the merged application is the preview-verified candidate. Production CI `39592337773` is the automatic deployment gate.

## Production — verified
Production CI [39592337773](https://github.com/moniaros/policy-wallet/actions/runs/39592337773) and deployment [39593746229](https://github.com/moniaros/policy-wallet/actions/runs/39593746229) succeeded for `2236dfdd423e1ccd0c7473f8c9dfa7845baceaea`. Deployment `dpl_7jYVGPihVhWbe9EeknoWPiy3dQoS` is READY, target production, at `policy-wallet-e7cj5neme-moniaros-projects.vercel.app`, serving https://www.policywallet.gr. It was built with the existing production settings, not promoted from the placeholder preview.

All seven browser cases passed on the live site with a normal process exit; both scoped hero axe scans returned zero violations. A separate real-browser check sought to 0.25 seconds before the end and observed uninterrupted muted playback return to 0.007 seconds. The live 1,629,821-byte MP4 has the same SHA-256 as the verified candidate; a complete local decode passed, fast-start metadata was confirmed, and no black intervals were detected.

The production build verified 88 applied migrations, none pending, three prevention tables with RLS, 34 columns and five cascade foreign keys. No schema/data write was required by this release. Its pre-existing POOLED_DATABASE_URL/session-pooling warning remains recorded as an infrastructure follow-up. The CI Money Path job is skipped without its E2E secret; no checkout verification is claimed. Production registration remains paused by its existing setting.

Temporary preview environment and access-cookie files were deleted. Root checkout changes belonging to other work were preserved. This follow-up stores release evidence only; deployed application code stays unchanged.
