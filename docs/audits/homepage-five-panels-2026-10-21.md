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

## Release
Exact preview, independent review and production deployment verification are pending. Existing paid-checkout/withdrawal, provider/retention and production pool follow-ups remain separate from this visual release.
