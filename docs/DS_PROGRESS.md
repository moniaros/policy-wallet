# DS_PROGRESS — Grafí build ledger

Run started 2026-08-30. One row per goal; updated at start and end of each.

| id | goal | status | artefacts | assumptions |
|---|---|---|---|---|
| G0 | Audit :3000 + repo | **DONE** | docs/audit.md — 5 of 11 §1 findings corrected (2,4,6 wrong; 9,11 partial); routes=81; claim registries mapped to their guards | A-01, A-02 |
| G1 | Single sources of truth | **DONE** | Verified: entitlements=`plan-defaults`+parity test · FAQ=`landingContent.faq` feeding render AND JSON-LD (seo.ts:74) · lines=`taxonomy` with NEW `product-catalog-joins-taxonomy.test.ts` (found+fixed the property/home alias seam on first run) · legal=`legal-content` | A-05: SEO titles legitimately restate line names — the bar is no parallel *registry*, guarded, not zero duplicate strings |
| G2 | Token layer | **DONE** | `tokens/{primitives,semantic}.json` → `npm run tokens` → `app/grafi.css` + `docs/contrast-matrix.md` (24 pairs measured, build FAILS on a floor miss — caught the brief's own sand-700 at 4.17:1 on run one); guards: drift/byte-diff, no-hex-in-semantic, planted-violation probes ×3; consumer = `/styleguide` (dev-only, both themes verified live) | A-02, A-06 (sand corrected `#8D621E`), A-07 (dark mapping mine) |
| G3 | Brand assets | **DONE** | logo-mark v2 (v1 failed its own 16px sheet — slot collapsed, bead outside; redrawn), lockups h+stacked, og-template.svg, app/icon.svg replaces the letter-P placeholder, apple-icon 180, maskable 192/512, favicon.ico 32+16 — rasters scripted via `scripts/brand-assets.mjs`, mark recolours per theme via currentColor (proven on dark tile) | A-08: lockup SVGs carry the font stack, not outlined paths — header renders the wordmark in HTML |
| G4 | Primitives + layout | pending | | |
| G5 | Content + product-expressive | pending | | |
| G6 | Homepage EL+EN | pending | | |
| G7 | Wedge pages + ENFIA | pending | | |
| G8 | Broker + institution pages | pending | | |
| G9 | Remaining pages | pending | | |
| G10 | Guides + glossary | pending | | |
| G11 | SEO/GEO/AEO sweep | pending | | |
| G12 | Hostile review + handover | pending | | |
