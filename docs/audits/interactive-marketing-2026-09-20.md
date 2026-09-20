# Interactive marketing UI — 2026-09-20

## Prioritisation

Read GA4 property policywallet.gr's **Landing page** report (all users, 23 August–19 September 2026): 259 sessions in total. Home `/` 100 + `/en` 22; guides index `/guides` 5; product `/product` 3 + `/en/product` 2; pricing `/pricing` 3. These are sessions, not the Search Console clicks in the previous audit. Excluded authentication, application routes and `(not set)` from the marketing ranking. Samples are small and internal traffic exclusion/key events remain unverified.

Eight routes implemented: home, guides index, product overview, pricing, each in Greek and English. Brand evolution and product exploration were the owner's selected directions. Existing content changes preserved; no deployment or database mutation.

## Implementation

- Homepage: dimensional real app preview, labeled sample document, explicit overview/policies/coverage buttons. Manual selection replaces autoplay for this instance. Existing fixture screens retained; their entrance choreography is disabled here so the product is immediately visible.
- Shared depth primitive: bounded ±5° pointer rotation, CSS perspective and shallow layers; animation-frame coalescing, pointer exit reset, offscreen/hidden-page suspension and cleanup. Fine mouse only. Reduced-motion and coarse-pointer modes remove spatial transforms.
- Product: moved the existing how-it-works section immediately after the hero and made the three existing steps selectable. The preview uses the existing authored health-policy sample, progressively showing source clauses, explanations and findings. This is an illustrative sample, not a live analysis; all original step descriptions and plan qualifications remain. Mobile shows the selected step's description to keep the result close to the controls.
- Guides: labeled accent-insensitive title/summary search, reset, result count and empty state. Default newest-first ordering, article metadata, links and JSON-LD preserved. Questions remain on the page below the guide list. The growth-hook panel is static here to keep reading quiet.
- Pricing: responsive audience/billing selectors with animated selected surfaces; removed the highlighted card's scale so prices and purchase controls remain aligned. No changes to pricing inputs, permissions, entitlements or checkout guards.
- Reusable DeviceFrame gains optional controlled selection, autoplay and control visibility, with original defaults. Hidden screens are inert; default controls use ordinary pressed buttons rather than incomplete tab semantics.
- New analytics use the existing consent-aware Google helper directly: route, locale, control and result_count only. No query text, mouse position, email or policy data is recorded. Search event fires on explicit form submission; filtering itself is immediate.

## Media

Higgsfield generated one editorial still life: a house, car and blank document on sage. Job `64528077-be44-4e68-b610-789d2c20fc27`, model `gpt_image_2_5`. Optimized local WebP: **18,272 bytes**, 960×723. Served through Next Image with responsive sizes, eager loading for the above-the-fold image, decorative empty alt text and an error fallback that removes the image. No private source media was uploaded, and no generated UI or claim is presented.

## Verification

- Node 20.20.2. **352 tests passed across 9 files**, including new behavioral tests for manual preview stability/inert screens, Greek accent-insensitive search/reset/privacy and step selection with plan qualifications. Existing SEO, content, voice, mock honesty, pricing availability, clamped text, severity and Athens-date guards pass.
- API auth audit: 106/106 routes, zero findings. ESLint, changed-string i18n, UTF-8, TypeScript and diff whitespace checks pass.
- Browser first inspection: **32 observations** (eight routes × 320/390/768/1440), all one H1, correct locale, zero document-level horizontal overflow. Screenshots inspected for desktop home/guides and mobile product. Correction batch removed preview entrance delays and shortened the mobile controls-to-result distance. Final hero screenshot confirms populated real screen.
- Browser journeys: guide no-results/reset, product findings selection, agent pricing and annual selection, keyboard Enter selection. Reduced-motion computed transform `none`; touch emulation computed transform `none` and selection worked. Fine mouse produced rotations 0.956° / 3.762°; leaving returned both to 0°. Browser overrides reset afterward.
- Client-reference manifest chunk sizes were compared by summing gzip sizes of each route's distinct declared JS chunks. This is a bundle regression measure, not a network waterfall or field performance score. Deltas per localized route: home **+1,999 B**, guides **+7,127 B**, product **+18,377 B**, pricing **−10 B**. All below the +25 KB target. Raw manifests saved in evidence.
- Final production build passed (exit 0), including TypeScript and page generation; build log saved in evidence.

## Boundaries / remaining measurement

No complete axe scan, field Core Web Vitals or reliable before/after browser timing comparison was obtained. The browser's read-only DOM evaluator does not expose Performance timing; no speed improvement is claimed from the bundle figures. Authentication/payment completion was not performed. Pricing availability is covered by its 12 passing tests. No schema changed and verify:migrations was not run.

Local preview is this checkout at port 3001. Port 3000 is another checkout and was not used as evidence. Production remains unchanged. Impeccable design-sidecar drift reported in the earlier audit was not repaired as a side effect.

### Broken / insecure

No new security finding. Existing local logs show Upstash rate-limit permission failure falling back to memory; unrelated to these UI changes and not represented as fixed.

### UI/UX / measurement, not launch gates

Full automated accessibility and repeatable performance timing remain additional validation work. Small GA counts do not support an uplift or conversion claim. No further visual polishing loop is planned.

## Release integration — 2026-09-20

The owner subsequently requested GitHub push and production deployment. Upstream `d0feaf34` was fast-forwarded before applying these changes; its registration controls, synthetic fixture and private-material guard are preserved. The full suite exposed stale text expectations in the trust and ENFIA tests; assertions now check the reviewed wording and conditional tax reduction. The Greek inventory was refreshed, with 28 reviewed additions and 13 individually documented length exceptions for plain-language explanations (the baseline and guard remain intact). Pointer enhancement now degrades gracefully when browser motion APIs are unavailable. Migration verification passed with all 76 migrations aligned; no database changes are part of this release.

Release guardrails passed: API auth (106 routes), lint, changed-file i18n, UTF-8, type-check, production build, private-material audit and all five private-material probe tests. An upstream translation-cache test had an unfinished asynchronous write; the case now waits for its own write before clearing the fixture for the next test. No runtime translation behavior changed.
