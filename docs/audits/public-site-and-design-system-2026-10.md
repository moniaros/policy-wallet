# Public website & design system — review (2026-10-08)

Read-only review. Code at NEW-UI `680aafb5`; production `www.policywallet.gr`.
**(live)** = confirmed against production by HTTP request or a real browser.
Everything else is from reading code (file:line given); counts are regex-based (±5%).
Earlier, narrower audit: `docs/audits/marketing-website-audit-2026-08.md`.

---

## Part 1 — Public website

### Baseline (what works)
- 83 `page.tsx` under `app/(public)`; 41 Greek routes have an `/en` twin (16 product pages included).
  Greek-only: `invite`, `landing`, `offline`, `perks`, `solutions/partners`, `solutions/synergates`, `styleguide`.
- Sitemap: 144 URLs, **all 200 (live)**, each with el / en / x-default `hreflang` (432 alternates).
  Correctly excludes redirect stubs, noindex and utility pages.
- Header (`lib/nav/public-nav.ts:23-37`) and footer (`components/landing/PublicMegaFooter.tsx:36-65`) link only to real pages.
- `proxy.ts:245-353` allowlist covers every public page.
- `/landing` → `/` and `/for-agents` → `/solutions/agents` return real 307s **(live)**.
- Metadata: 72/83 pages use `buildMarketingMetadata` / `buildLegalPageMetadata` / `buildLandingMetadata`
  (title, description, canonical, hreflang, OG, Twitter consistent).

### A. Broken / misleading (launch-grade defects)

| # | Defect | Evidence |
|---|---|---|
| A1 | `/en/*` pages are served with `<html lang="el">` in the server HTML **(live)**. An inline script flips it to `en` before paint; non-JS crawlers see English content tagged Greek. | `app/layout.tsx:79`, script `:109-113`, known-issue comment `:95-98` |
| A2 | A returning visitor with `localStorage.language = "en"` gets `lang="en"` on **Greek** pages: `/`, `/trust`, `/product/health` rendered Greek h1s under `lang="en"` **(live, Playwright)**. Screen readers read Greek with an English voice. `/pricing` is fine (wrapped in `StaticLanguageProvider`). | `contexts/LanguageContext.tsx:113-118`, `:142-146` |
| A3 | Header EN switch always builds `/en${path}` with no mirror check. `/solutions/synergates` links to `/en/solutions/synergates` → **404 (live)**; same for `/perks`. (`localizeHref` does check; the toggle doesn't.) | `components/public/PublicHeader.tsx:51`, `LoBPageShell.tsx:63` |
| A4 | `/solutions/partners` serves **English** copy at a Greek-tree URL with `lang="el"` **(live)**; its EN switch → `/en/solutions/partners` 404. The Greek twin `/solutions/synergates` is linked from nowhere. Both are noindex. | `app/(public)/solutions/partners/page.tsx:17` |
| A5 | `/en/pricing` never shows promotions: doesn't pass `stripeMode`, falls back to `"unconfigured"`. Latent while Stripe is in test mode; a defect once live keys land. | `en/pricing/page.tsx:27` vs `pricing/page.tsx:37`, `PricingPageClient.tsx:33` |
| A6 | `/invite/` is disallowed in robots.txt **and** noindex on the page; a blocked crawler never reads the noindex, so externally linked invite URLs can be indexed contentless. Low severity. | `app/robots.ts:26`, `invite/[token]/page.tsx:11-12` |

Root cause of A1–A4 is one thing: language is decided client-side and per page, not by the route.

**Resolution (2026-10-08, branch `fix/public-language-labelling`):**
- A2 fixed at the source: the unseeded root `LanguageProvider` no longer reads `localStorage.language` (the URL decides). Verified on a local prod build with `language=en` stored: `/`, `/trust`, `/product/health`, `/solutions/synergates` → `lang="el"`; `/en/*` → `en`.
- A3 fixed: the toggle uses `englishCounterpart()` / `greekCounterpart()` (`lib/seo/locale-links.ts`) — real mirrors only, else `/en`. Guard: `tests/unit/language-toggle-targets-exist.test.ts` (enumerates `app/(public)`, probe = the old blind rule).
- A4 fixed: English page moved to `/en/solutions/partners`, paired with `/solutions/synergates`; old URL 308s.
- A5 fixed: `/en/pricing` passes `stripeMode`.
- A1 **partial**: `/en` and `/en/*` now send `Content-Language: en`; the server `<html lang>` is still `el`. The full fix is per-locale root layouts — every top-level segment (`(public)`, `(protected)`, `auth`, `onboarding`, `api-docs`, new `(en)`) becomes its own root layout, navigation between them becomes a full reload, and the 404 needs experimental `global-not-found`. Deferred as a separate decision.

### B. Structure / UX debt (does not gate launch)
- **No `app/(public)/layout.tsx`.** ~30 client components mount header/footer themselves via four shells
  (`LoBPageShell`, `LegalDocumentPage`, `PublicHeader`, `LandingHeader`).
- **Inconsistent EN wiring.** Wrapped in `StaticLanguageProvider`: product, pricing, legal, lexiko, guides.
  Not wrapped: needs, platform, trust, status, methodology, changelog, compare, home. Only 7 Greek pages wrap.
- **Orphans.** `/methodology`, `/status` only in the sitemap; `/changelog` only linked from
  `MethodologySections.tsx:40` and `lib/trust/status-content.ts:53`. `/perks` 404s **(live)** (no partners,
  `perks/page.tsx:28`), linked from nowhere, still allowlisted (`proxy.ts:322`).
- **`/styleguide`** 404s in prod **(live)** but is allowlisted (`proxy.ts:325`); file must stay (a token test reads it).
- **Leftover stubs** `/landing`, `/for-agents`, `/en/for-agents` still allowlisted (`proxy.ts:320,323`).
- **`/platform` vs `/product`** overlap; `/platform` reachable only from the footer (`PublicMegaFooter.tsx:61`).
- **Partner naming:** `partners` = English, `synergates` = Greek. Convention would be `/solutions/synergates` + `/en/solutions/partners`.
- **Legal pages have two English renderings:** `?lang=en` on the Greek route (`terms/page.tsx:9-12`) and `/en/terms` (canonical → Greek, intentional: `marketing-pages.ts:531-545`).
- **Locale tags disagree:** OG `en_US` (`marketing-pages.ts:87`) vs `data-locale="en-GB"` (`app/layout.tsx:111`).
- **App providers on marketing pages:** `OfflineProvider`, `MotionProvider`, `NextTopLoader`, `Toaster`,
  `LanguageProvider` load everywhere (`app/layout.tsx:116-144`). Consistent with the earlier measurement
  of ~2.1 MB JS on public routes.
- Dead prop `showPerksLink` (`LandingHeader.tsx:16`, passed at `WorldClassLanding.tsx:71`).

---

## Part 2 — Design system

### Shape today
Two parallel systems sharing one `.dark` class:
- **Legacy / product system** — `app/globals.css`: `:root` / `.dark` values (135–451) → `@theme` (14–133),
  `.pw-*` utilities in `@layer utilities` (from 522), type scale `text-h1…micro` (84–107, registered in
  `cn()` at `lib/utils.ts:25-45`). ~1,800 type-scale uses; this is what the product runs on.
- **Grafí** — `app/grafi.css`, GENERATED from `tokens/*.json` by `scripts/build-tokens.mjs`:
  `--g-*` primitives → semantic roles → `@theme inline`; own spacing (`p-g-*`), radii, type (`text-g-*`, 134 uses),
  own green-black dark theme. Imported only at `globals.css:3`; used by landing `grafi/*`, auth pages, `/styleguide`.
- **Four documents that disagree:** `design-system/policywallet/MASTER.md`, `DESIGN.md`,
  `docs/design-system.md` (Grafí), and 8 page docs in `design-system/policywallet/pages/`.
- Fonts OK: Inter with `latin` + `greek` subsets (`app/layout.tsx:6-10`).

### A. Broken / incorrect

| # | Defect | Evidence |
|---|---|---|
| DA1 | `--surface-sunken` defined twice; `globals.css:287` (`#EDF1F5`, slate) overrides Grafí `#E7F1EC` (green) in light mode because Grafí is imported first (verified in source). ~13 Grafí call sites get the wrong colour; Grafí's contrast matrix measures a colour that never renders. Dark uses Grafí `#071512`. | `grafi.css:28,61`; `globals.css:287`; e.g. `app/auth/signin/page.tsx:340,419`, `components/landing/grafi/ComparisonBand.tsx:60` |
| DA2 | `BrandActionButton` primary = white on `--brand-accent-cta`, which is mint `#89D9B2` in dark → **1.66:1** (computed; needs 4.5:1). 10 uses in the advisor proposal / document-request flows (app, not public site). Also `rounded-xl` against the pill rule. | `components/ui/brand/BrandActionButton.tsx:21-23`; `globals.css:381`; `components/collaboration/ProposalCard.tsx`, `DocumentRequestFlow.tsx` |
| DA3 | MASTER says page overrides live in `design-system/pages/` (`MASTER.md:3`); they are in `design-system/policywallet/pages/`. All 8 page docs (line 7) point at a non-existent `design-system/MASTER.md`. | |
| DA4 | MASTER cites an exported `MOBILE_BREAKPOINT_PX` that does not exist anywhere. | `MASTER.md:127` |
| DA5 | MASTER gives dark `border-border` as `rgba(255,255,255,0.14)`; runtime is `#1e293b` (that rgba is `--pw-border`). | `MASTER.md:154`; `globals.css:422,431` |
| DA6 | MASTER sanctions `border-none outline-none focus:ring-4 ring-primary/10` for inputs — the recipe the CSS removed because it painted no focus indicator. | `MASTER.md:241,251`; `globals.css:761-773` |
| DA7 | MASTER contradicts itself on card shadows (`--pw-shadow-card` "used" at `:336`, "unused" at `:141`; it has 0 refs). | |
| DA8 | Page docs are Feb-2026 generator output: widths 1200/800px vs real containers 680/900/1240/1400 (`globals.css:68-71`); `branding.md:30` says "Navy/Grey" on a green brand; `agent-rise.md` has no route. | |
| DA9 | `globals.css:799` comment cites token `status-critical-fg`, which exists only as a name in `DESIGN.md`. | |

### B. System debt
- **Docs vs runtime values:** muted text MASTER `#64748B` vs runtime `#5b6a7a` (`globals.css:346`);
  warning text `#B45309` vs `#92400E` (`:236`); success bg `#DCEBDA` vs `#ECFDF5` (`:229`);
  secondary button spec (`MASTER.md:180-184`) vs runtime (`:834-840`); "@layer components" vs actual `@layer utilities`;
  card padding `p-5/p-6` vs the `.pw-pad*` utilities (`:954-964`). MASTER never mentions Grafí.
- **Overlapping roles across the two systems:** `--primary` / `--action-primary-bg`, `--muted-foreground` / `--fg-secondary`,
  `--border` / `--border-subtle`; two dark themes (slate-black vs green-black).
- **Colour literals:** 1,301 in `.tsx` (102 files; 1,232 are arbitrary classes like `bg-[#…]`), 182 in `.ts`,
  17 in `components/landing/product-stage.css`, 46 inside `globals.css` recipes.
  Top values: `#0F172A` ×235, `#29685B` ×227, `#A7F3D0` ×199, `#475569` ×142.
  Top files: `AgentsSolutionPageClient.tsx` 64, `lib/product/catalog.tsx` 42, `ProductSections.tsx` 36,
  `GuideArticleClient.tsx` 32, `product/motor/PageClient.tsx` 31.
  `dark:text-[#A7F3D0]` ×150 although `text-brand-accent` exists (15 uses).
- **Tokens that don't flip in dark:** `--color-primary-soft`, `--color-primary-tint`, `--color-cta-dark` are fixed hex
  (`globals.css:20-23`) → 140/146 `bg-primary-soft` lines carry a hand-written `dark:` twin.
- **Unused tokens:** 4 `--dur-*`, `--pw-bg-dark`, `--pw-surface-light`, `--pw-shadow-card(-hover)`, `--brand-accent-trust`,
  `--brand-bg-canvas`, `--brand-bg-soft`, `--brand-border-strong`, `--color-popover(-foreground)`.
- **Buttons — five systems:** `.pw-primary-button` (136 uses / 109 files, de facto standard), `.pw-soft-button` (181 / 76),
  inverse/mint variants (`globals.css:868-913`), cva `<Button>` (1 importer: `components/pwa/InstallPrompt.tsx`; uses the
  `outline-none`+ring pattern `globals.css:806-813` says paints nothing), `BrandActionButton`; plus 594 raw `<button>`.
- **Cards:** `.pw-card` (192 / 114) vs shadcn `<Card>` (`card.tsx:12`, `shadow-sm` against the flat-card rule, 1 importer) vs `BrandCard`.
  **Skeletons:** `skeleton.tsx` (14) vs `LoadingSkeleton.tsx` (29). **Modals:** `<Modal>` (8) + `<ConfirmDialog>` (9) vs 28 hand-rolled `fixed inset-0`.
- **Unused / single-use:** never imported `PlanGate`, `ProcessingHUD`, `ScoreRing` (test only), `TrustStrip`;
  `.pw-control-boundary` 0 uses; `.pw-kicker` 5 uses although MASTER mandates it; `.pw-pill` 3.
- **Typography:** raw `text-sm` ×1,111, `text-xs` ×670, `text-2xl` 65, `text-lg` 64, `text-3xl` 55 alongside the scale;
  recipes hard-code `text-[10px]` (`globals.css:663,944,1119`); `--font-mono` names JetBrains Mono, never loaded.
- **Styleguide** shows only Grafí roles (no `primary`, `status-*`, `.pw-*`, `text-h1…`) and its `surface-sunken` swatch shows the overridden slate.
- Dead keyframes `.animate-blob`, `.animation-delay-*` (`globals.css:1177-1206`).

---

## Next steps (in order)

### 1. Language labelling — fixes A1–A5 (one PR)
- Add `app/(public)/layout.tsx` (shared header/footer) — the natural place for the fix and removes the four shells.
- Server-side `lang`: the root layout cannot know the route, so give the `/en` tree its own root layout
  (route-group root layouts, e.g. `(public-el)` / `(public-en)`) that renders `<html lang="en">`; keep the inline script only as a fallback.
  Check Next 16's multiple-root-layouts rules in `node_modules/next/dist/docs/` first (full page reload between root layouts).
- Greek public tree must ignore a stored `language=en`: pin the Greek tree to `el` once (as `/pricing` does via `StaticLanguageProvider`), not per page.
- EN switch: link only to existing twins — reuse `localizeHref`'s mirror check in `PublicHeader.tsx:51`; hide the switch when no twin exists.
- Partners: move English copy to `/en/solutions/partners`, keep Greek at `/solutions/synergates`, 308 the old `/solutions/partners`.
- Pass `stripeMode` in `en/pricing/page.tsx` (A5).
- **Verify:** re-run the checks below; add a guard test that enumerates every `app/(public)/en/**/page.tsx` and asserts server
  `lang="en"`, and every Greek page asserts `lang="el"` with `localStorage.language=en` set — with a committed probe fixture
  (CLAUDE.md: "Guards must enumerate, not assume").

### 2. Decide the design-system direction — OWNER DECISION
Pick one:
- **(a) Grafí wins** — re-point `.pw-*` utilities at Grafí semantic roles, retire the legacy `:root` values, one dark theme.
- **(b) Legacy wins** — fold Grafí's useful parts (generated tokens, contrast matrix, spacing scale) into `globals.css`, delete `grafi.css`.

Either way: ONE document. Delete the other three rather than updating them; regenerate or delete the 8 page docs.
Update the CLAUDE.md / AGENTS.md "Styling" pointer to match.

### 3. Mechanical, low-risk (can run before the decision)
- DA1: remove the duplicate `--surface-sunken` (decide which value is correct — Grafí's contrast matrix was computed for `#E7F1EC`).
- DA2: `BrandActionButton` primary → dark-mode-safe text token (or replace with `.pw-primary-button`; only 2 importers).
- Make `primary-soft` / `primary-tint` / `cta-dark` flip in dark, then delete the ~140 hand-written `dark:` twins.
- Replace `dark:text-[#A7F3D0]` (×150) with `text-brand-accent`.
- Delete unused tokens, never-imported components, dead keyframes, `showPerksLink`; drop `/landing`, `/for-agents`, `/perks`
  from the proxy allowlist if those pages go.
- Fix MASTER DA3–DA9 only if MASTER survives step 2.

### 4. Later (debt)
- Collapse buttons to `.pw-primary-button` / `.pw-soft-button`; cards to `.pw-card`; modals to `<Modal>`.
- Burn down colour literals starting with the top 5 files; add a lint rule against `[#…]` arbitrary colours in `.tsx`
  (with an ignore comment, like the i18n check).
- Decide nav placement for `/methodology`, `/status`, `/changelog`; merge or differentiate `/platform` vs `/product`.
- Move app-only providers out of the public tree (measure bundle before/after with a source-map build).

---

## How to re-verify

```bash
# sitemap: every URL 200
curl -s https://www.policywallet.gr/sitemap.xml | grep -o "<loc>[^<]*</loc>" | sed 's/<[^>]*>//g' \
  | xargs -P 12 -I{} curl -s -o /dev/null -w "%{http_code} {}\n" {} | awk '{print $1}' | sort | uniq -c

# server lang on an EN page (A1) — expect lang="en" after the fix
curl -s https://www.policywallet.gr/en/pricing | grep -o '<html[^>]*lang="[^"]*"'

# EN switch targets (A3/A4) — after the fix, no page should link to these
for u in /en/solutions/synergates /en/solutions/partners /en/perks; do
  curl -s -o /dev/null -w "%{http_code} $u\n" "https://www.policywallet.gr$u"; done
```

A2 needs a browser: a Playwright context with `addInitScript(() => localStorage.setItem("language","en"))`, load `/`, `/trust`,
`/product/health`, read `document.documentElement.lang` — expect `el` after the fix.

Not verified: rendered contrast beyond DA2's computed ratio; cva focus-ring rendering; per-call-site dark twins beyond `bg-primary-soft`.
