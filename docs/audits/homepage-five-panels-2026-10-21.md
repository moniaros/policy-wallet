# Homepage: five visual extensions — 21 October 2026

## Scope and implementation
The owner approved all five homepage proposals and production deployment. Existing PolicyWallet forest/mint branding, the light video hero, four-step band, reviewed bilingual sample content, auth restrictions and checkout restrictions remain.

1. Policyholder and agent panels show actual existing application components with fictional fixtures, inert interaction and a permanent sample caption. The wallet excerpt omits its overview to keep the policy list visible on mobile. Preview code loads near the viewport; no-JS retains an accessible descriptive fallback.
2. The shared reading demonstration has an opt-in homepage layout: sample document → plain-language findings, 48px tabs, full copy, existing keyboard/replay/reduced-motion behavior. Other callers retain their default layout.
3. Four localized category links use new Higgsfield photography, compressed WebP with responsive lazy image loading. Generation IDs and source URLs are recorded in `public/images/presentation/categories.provenance.json`. No visible AI-photo captions or invented endorsements.
4. Guide and glossary cards link to the existing bilingual content.
5. Three trust explanations link to document handling, AI consent and privacy details. The existing independence comparison remains in its native disclosure. No new legal assurance, certification, price or security guarantee was added.

## Broken / insecure — launch gates
No new functional or security defect identified in this change. The initial localization guard misread a discriminant literal in an already-translated aria-label expression; selecting the localized label before rendering resolved the guard without an exemption. No DB, pricing catalogue, auth or payment changes.

## UI/UX — design choices
Scoped extension, not a replacement identity. Fixed forest/mint audience grounds, 16px corners, existing 18px public body role, photographic 4:3 categories and ruled trust columns. Detector produced only advisories: existing 18px body typography is documented; three draft paper colors were replaced with the incumbent palette. On mobile, the app excerpt presents policy cards rather than cropping the tall overview. DESIGN.md documents the built patterns.

## Local verification
- API auth inventory: 116/116 routes, no findings.
- Lint, i18n changed strings, UTF-8, strict type check, production webpack build: passed.
- Unit suite: 700 files, 7,874 tests passed.
- Dev migration verifier: 88 migrations, up to date; no writes.
- Seven viewport/language/theme cases: EL 1440/1024/768/390/320, EN 320, EN dark 1440. All five sections: no horizontal overflow or clipped visible copy; zero axe WCAG A/AA violations; images loaded; app fixtures inert; tabs and comparison disclosure operable with keyboard.
- No-JS fallback and all 22 localized destination pages/anchors passed.
- Reproducible browser harness: `scripts/verify-homepage-panels.cjs`; [local evidence](../evidence/homepage-five-panels/local-verification.json).

## Independent finish review — PASS
The reviewer inspected desktop Greek, mobile Greek, English 320px and dark 1440px screenshots. Its single material finding was section order; learning now follows categories and precedes trust. The reviewer rechecked desktop/mobile sequence screenshots and element boxes and marked the finding **RESOLVED**.

| Contract | Final verdict |
| --- | --- |
| THESIS | PASS — demonstrates policy reading and both audiences’ uses. |
| OWN-WORLD | PASS — established PolicyWallet identity retained. |
| STORY | PASS — category → learning → trust restored on desktop and mobile. |
| FIRST VIEWPORT | PASS, scoped — unchanged hero/four-step assessment; hero regression separately verified below. |
| FORM | PASS — all five approved compositions remain intact. |

No unresolved material review findings. Generous space in mobile application excerpts was a nonblocking preference; no further polishing cycle was opened.

## Release and production evidence
- Application PR [#408](https://github.com/moniaros/policy-wallet/pull/408), final candidate `ab19091ea13bd95dddfb448940c14444f4c8d5b8`; application merge `95c8670af8b4fd1eb1530d96cfa357fa41923f8d`. Candidate and merge trees were identical.
- Exact isolated [preview](https://policy-wallet-bx4iev4sq-moniaros-projects.vercel.app), Vercel `dpl_BqbDgD3q93u8ptM7F7nndpC4thnT`, Ready. Placeholder configuration; no real credentials uploaded and no preview auth/payment/database claims. Temporary access cookies and headers removed after verification.
- Candidate CI [39645417735](https://github.com/moniaros/policy-wallet/actions/runs/39645417735): success. Production CI [39647092968](https://github.com/moniaros/policy-wallet/actions/runs/39647092968): success.
- Production deploy [39648473964](https://github.com/moniaros/policy-wallet/actions/runs/39648473964): success. Vercel `dpl_HYmFCK1UwbyAR5cSd8vqvDMD6pi9`, Ready, [deployment](https://policy-wallet-eg4o9qcih-moniaros-projects.vercel.app), aliased to `www.policywallet.gr` and `policywallet.gr`.
- Production schema preflight queried and verified 88 applied migrations, none pending, three prevention tables with RLS, 34 expected columns and five cascading foreign keys. No database or catalogue changes in this release.
- **Each of the five sections** passed seven responsive/language/theme cases on both the exact preview and live production: 35 axe scans per environment, zero violations, no page overflow or clipped visible copy, all images loaded and no browser page errors.
- All three demo tabs produce distinct document excerpts with matching tab panels; real Tab/Enter replay, End/ArrowRight selection, reduced-motion mode, comparison disclosure and no-JS fallback passed. An initial browser assertion read the DOM before React entered the scan state; the harness now waits for that actual state and pins normal motion explicitly. No application behavior change was needed.
- All 22 category/guide/glossary/trust/privacy/agent destinations and anchors passed in Greek and English on preview and live.
- The existing four-step section passed its eight-case local regression. Light hero styling and email/role/language signup handoff passed at tablet/mobile widths locally, on preview and on production. Live background video played muted and looped successfully (15.041667 seconds).

Reproducible checks: `scripts/verify-homepage-panels.cjs`, `scripts/verify-homepage-steps.cjs`. Evidence: [preview](../evidence/homepage-five-panels/preview-verification.json), [production](../evidence/homepage-five-panels/production-verification.json), [sequence boxes](../evidence/homepage-five-panels/sequence-verification.json), [video loop](../evidence/homepage-five-panels/production-video-loop.json). Representative desktop/mobile screenshots are stored alongside those files.

## Decisions and remaining boundaries
- Reused actual application components on existing fictional fixtures rather than inventing a different product UI; only the homepage excerpt suppresses its overview. Protected application behavior remains unchanged.
- Used four new Higgsfield lifestyle photographs with recorded provenance and no visible AI-photo captions. Kept sample-data disclosures because these screens and policy examples are illustrative.
- Followed the independent reviewer’s category → learning → trust ordering correction. Existing public facts, auth restrictions and checkout restrictions remain authoritative.
- Optional Kilo review could not start because the account has insufficient credits; it returned no code findings. The independent visual review and repository CI completed successfully.
- The CI Money Path job reported success but explicitly **skipped** its payment journey because `E2E_DATABASE_URL` is absent. This release does not claim payment verification or enable checkout.
- Existing paid-checkout/withdrawal, provider/retention and production pool follow-ups remain separate. No unresolved blocker for this homepage release. The owner's separate dirty root checkout was not changed.
