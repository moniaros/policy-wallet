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
