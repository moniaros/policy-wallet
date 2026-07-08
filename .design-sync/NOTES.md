# design-sync notes — PolicyWallet DS

Repo-specific gotchas for future syncs. Shape: `package` (no Storybook).

## Build
- **This is a Next.js app, not a standalone package.** The DS surface is `components/ui/**`. There is no `dist/` — the converter bundles from source via `.design-sync/ds-entry.ts` (a named-export barrel; passed as `--entry`). `--node-modules ./node_modules`.
- **CSS comes from the production build.** Tailwind v4 has no standalone CLI here; the compiled utility+token stylesheet is the largest `.next/static/chunks/*.css`. `cfg.buildCmd` runs `npm run build` then copies it to `.design-sync/.cache/compiled-tailwind.css` (= `cfg.cssEntry`). A stale/missing chunk → re-run the build. The build needs `AUTH_SECRET` + Supabase placeholders (see CI env) or page-data collection fails.
- **Next.js runtime shims** (via `.design-sync/tsconfig.sync.json` paths): `next/link` → plain anchor, `next/navigation` → inert hooks. Without them the bundle carries `process.env.__NEXT_*` refs that throw `process is not defined` in the browser, and `useRouter` crashes previews. Also maps `@/lib/i18n` → `lib/i18n/index.ts` (esbuild otherwise resolves the bare dir).
- **`@/*` path alias** = repo root (`baseUrl: ".."` in the sync tsconfig).

## Render check
- No chromium in the playwright cache; the render check runs against **system Chrome** via `DS_CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`. Pass that env to `package-validate.mjs` and `package-capture.mjs`.

## Tailwind v4 + portals (load-bearing)
- **Tailwind v4 centers with the standalone `translate` CSS property, NOT `transform`.** To neutralize `-translate-x-1/2`/`-translate-y-1/2` in a preview you must set `translate: none !important` (setting `transform: none` alone does nothing). This bit the Modal card.
- **Portaled `position: fixed` chrome** (Modal via `createPortal` + framer-motion) clips in preview cards: the card page is transformed, so fixed-centering resolves against an overflowing box. Fix in the preview `.tsx`: flex-center the `body`, make the backdrop `position: absolute`, make the panel `position: relative` with `translate/transform: none`. See `.design-sync/previews/Modal.tsx`. `cfg.overrides.Modal` = `{cardMode: single, viewport: 600x560}`.

## Fonts
- `[FONT_REMOTE]` for IBM Plex Sans / Inter / JetBrains Mono / GT America — loaded via the Google Fonts `@import` at the top of the compiled CSS. They resolve at runtime; no `@font-face` to ship. Not a failure.

## Known render warns
- (none recorded yet)

## Re-sync risks
- **Compiled CSS is a build artifact**, not committed — a fresh clone must run `cfg.buildCmd` before the converter or `cssEntry` is missing. `.design-sync/.cache/` is gitignored.
- **The ds-entry barrel is hand-maintained.** New `components/ui/**` exports won't appear until added to `.design-sync/ds-entry.ts` AND `cfg.componentSrcMap`.
- Next shims assume Next's `next/link` + `next/navigation` API surface; a Next major bump could add exports the shims don't cover.

## Authoring learnings (folded from wave subagents)

### Non-portaled fixed overlays (ProcessingHUD, FloatingActionButton)
The Modal recipe (re-homing `body > div.fixed*`) only works for **portaled** chrome under `<body>`. Capture renders one story into `body > div#r0.ds-single`, and **`.ds-single` carries `transform: translateZ(0)`** — making it the containing block for `position: fixed` descendants. For components that mount inside `#r0` (not portaled): cancel the container transform with `.ds-single { transform: none !important; }`, give `body` real height + `position: relative`, and demote the component's own `fixed` → `absolute`. See `.design-sync/previews/{ProcessingHUD,FloatingActionButton}.tsx`.
- AiConsentModal DOES portal (via shared Modal) → standard Modal recipe verbatim.
- FAB speed-dial actions are internal `useState` (render on click) → static shot is the resting corner FAB, graded on that basis.

### framer-motion `initial={{opacity:0}}` blanks static captures
PageHeader (and Modal) animate in from opacity 0; a static capture snapshots them invisible. Fix in the story with a `<style>` forcing the motion div to its resting state (opacity 1, `translate:none`, `transform:none`). Same Tailwind-v4 `translate` gotcha applies.

### Component-shape notes
- **BrandCard** ships no internal padding — previews add `padding: 24`.
- **BrandActionButton** has no built-in `disabled:` styling — previews simulate with `opacity/cursor`. (Upstream improvement candidate.)
- **SwipeableCard** action-rail labels are `hidden sm:inline` — its card viewport must be ≥640px wide or the reveal peek looks bare. Override viewport is 680x420.
- **ProcessingHUD** label "PLEASE WAIT" is hardcoded English in the component (message body is Greek) — upstream i18n candidate, not a preview bug.

### Overlay card overrides applied (cfg.overrides)
Modal 600x560 · AiConsentModal 600x560 · ProcessingHUD 600x560 · FloatingActionButton 480x520 · PullToRefresh 440x600 · SwipeableCard 680x420 · DashboardSkeleton {cardMode:column, 1000x1000}. All `cardMode:single` except DashboardSkeleton.
