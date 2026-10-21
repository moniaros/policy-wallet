# Homepage illustrated steps — 21 October 2026

## Presentation request
The owner supplied Bitpanda's four-card “How it works” section and requested a closer adaptation for the homepage's “Τέσσερα απλά βήματα”. The implementation uses a full-width fixed forest band, centered outline label/headline, four white cards with operation diagrams, and numbered explanatory captions below. The cards show a PDF upload, document fields, interpretation/check/discussion, and expiry/reminders. These are diagrams, not fabricated app screenshots or customer outcomes. Greek uses the existing brand face and sentence case for legibility. Four columns at 1200px+, two at 600–1199px, one below 600px. The light background film hero remains unchanged.

## Correctness / security
No new backend, database, pricing, consent, auth or legal behavior. Reviewed step descriptions and HowTo structured data remain on their existing shared source. The Plus limitation stays explicit. Diagrams contain no customer names, scores, insurance-company endorsements, sample financial values or unverified timing promises. Every arrow keeps its real destination, with accessible action labels and 44px targets; diagrams are decorative and contain no focusable controls.

## Design decisions
The owner-supplied reference explicitly earns equal illustrated cards, sequential numbers and a small outline section label. Reuse the public header's forest color and existing white/mint palette in both themes. No generated assets or media credits needed. Card radius 16px and existing 24px/56px type steps; 2px/4px geometry describes document artwork, not new component radii. The request's other homepage possibilities are recommendations, not authorization to discard the established light hero or rework every section.

## Verification / release
Local: API auth inventory 116 routes, lint, changed i18n, UTF-8, type check, dev migration verification (88, none pending), 700 unit files / 7,874 tests and production build passed. Eight browser cases (320–1440px, Greek/English, light/dark) passed with no horizontal overflow or axe violations; real anchor navigation and keyboard focus passed. Independent finish review: PASS, no material findings. Final preview/production release evidence follows.

## Further presentation proposals
- Replace the text-only audience columns with two large visual panels: personal wallet and adviser workspace, using existing real app components with visibly identified sample data.
- Give the reading demonstration a larger document-to-explanation composition with fewer small framing elements, keeping every uncertainty and the sample disclaimer.
- Add a concise visual category entry section for car, home, health and business, linking to existing explanatory pages; do not imply that the platform sells policies.
- Introduce two editorial cards for guides and the glossary, corresponding to Bitpanda's Academy/Blog pattern, using existing content.
- Strengthen the trust section with three short, verifiable explanations and direct links to the trust/privacy pages; do not substitute certification logos, testimonials or user counts without evidence.

Reference inspected: https://www.bitpanda.com/en, 21 October 2026. Its public page includes four onboarding cards, asset categories, education cards and trust/support blocks. These proposals adapt the composition, not its financial claims.

## Exact-candidate release evidence
- Candidate: `8a1601a3246fa9f2437bcf01ae74438150fadd74`; PR #406.
- Protected preview: `policy-wallet-cnostdi7n-moniaros-projects.vercel.app`, `dpl_2uvX6QcJNyRdBCbWd8So6FM4EAWc`. All eight browser cases passed; zero axe violations. Preview uses nonfunctional placeholders and is not the artifact promoted to production.
- Independent finish review: PASS. The initial English cookie-banner screenshot obstruction was fixed in the harness by using the actual case-insensitive Necessary Only label; clean English/mobile and dark/desktop captures were then independently passed. No visual defect remained.
- PR CI `39614748233` succeeded. External Kilo review could not run because the account was out of credits; it supplied no code findings. Existing nonblocking dependency-audit/outdated-package annotations were unchanged; no dependency changes in this release. Money Path reports success but skips the actual browser journey without E2E database configuration; this public layout release does not claim payment or signup verification.
- Merged application: `760ced15c63e9ef6a10fc4c2aaacd44600c0c462`; zero diff from verified candidate. Production CI `39617247813`.
- The focused browser harness checks four/two/one columns, page overflow, complete text, eight axe scans, keyboard focus, minimum 44px action targets and actual reading/approach anchor navigation. Fixed navigation is hidden only for clean section captures; cookie refusal is performed through the visible button.
- Temporary preview cookie/header/state artifacts were removed after verification.

## Production — verified
Production CI [39617247813](https://github.com/moniaros/policy-wallet/actions/runs/39617247813) and deploy [39618890969](https://github.com/moniaros/policy-wallet/actions/runs/39618890969) succeeded for `760ced15c63e9ef6a10fc4c2aaacd44600c0c462`. Vercel `dpl_2CKLbumZsqBp6JHMsaRfiARKS5kH` is Ready, target production, at `policy-wallet-1v654bslu-moniaros-projects.vercel.app`, aliased to https://www.policywallet.gr (also root/app).

All eight live browser cases passed: Greek desktop 1440/1280, tablet 1024/768, mobile 390/320, English 320 and dark English 1440. Eight axe scans returned no violations; measured forest background, 4/2/1 layout, overflow, focus and link destinations matched the preview. Live desktop/mobile captures were inspected and match the approved section. A separate local and production keyboard journey used actual Tab presses across the four links and Enter to reach both on-page destinations; both passed. The committed focus checks alone are not claimed as this physical-key sequence.

Production's build gate queried 88 applied migrations, none pending, three prevention tables with RLS, 34 columns and five cascade foreign keys. No database or catalogue write was needed. The light hero and existing signup/checkout restrictions remain unchanged. Root-checkout changes were preserved. This follow-up updates documentation/evidence only and leaves the verified application untouched.
