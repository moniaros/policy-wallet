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
