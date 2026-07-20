# Brand Elevation — July 2026 (Stages A–C)

Goal: the marketing site should read deliberate, not generated. Bar: Stripe/Notion — one type
scale, one palette, one CTA pair, one rhythm, verifiable claims only. Grounded in
`app/globals.css` tokens + `design-system/policywallet/MASTER.md` + the live components.
Scope of the Stage-A sweep: landing (`WorldClassLanding` + sections + `PublicMegaFooter`),
`/pricing`, `LoBPageShell`, `/product` index, `/solutions/agents`. Guides/company/contact/LoB
PageClients follow in Stage B.

## 1. Typography discipline

Found before sweep: **8× `font-black`** (PricingPageClient ×5, PricingCard ×2,
FeatureComparison ×1), **204 arbitrary `text-[Npx]`** on the five sweep surfaces (542 across
all marketing files), of which **60 were off any coherent ladder** (15/17/19/22/23/28/34/36/
42/46/48/52/58/60/62/68/78px — eleven display sizes for one site).

**Allowed scale (px):** micro `10–13` (widget/mockup chrome + kickers only, kickers = 12) ·
body `14 / 16 / 18` · heading `20 / 24` · display `32 / 40 / 44 / 56`. Nothing else.
**Weights:** body 400–500, headings/buttons 600 (`font-semibold`), emphasis 700. `font-black`
is banned. Rule of thumb: if you reach for `text-[Npx]`, N must be on the scale.
Stage B: `font-medium` display headings (product/agents pages) move to 600; LoB PageClients
(one 68px hero each) get the same ladder.

**Stage C — done, the 15 LoB PageClients.** 101 off-ladder `text-[Npx]` normalized:
68→56 and 46→44 (hero, now byte-identical to the swept `/product` index), 48→44 and 36→32
(section + final-CTA h2), 28→24, 19→20, 17→18, 15→14; the 15 hero leads dropped their
off-ladder `lg:text-[22px]` step. 84 `font-medium` headings → `font-semibold` (body and
mockup-chrome `font-medium` deliberately left — it is not a heading weight). The only
`text-[Npx]` values left in these files are 11/12/13/14/16/18/20/24/32/44/56 — all on ladder.

**Stage D — done, the last marketing surfaces** (guides index + article, company, contact,
solutions/agents). 24 off-ladder sizes normalized (72→56, 48→44, 36/34→32, 26→24, 22→20,
17→18, 15→14) and 3 `text-[24px] … md:text-[28px]` pairs collapsed to a flat 24 — 28 is off
ladder and 24 is the heading cap, so the responsive step goes rather than the base shrinking.
26 `font-medium` headings → `font-semibold`, which closes the "product/agents" item Stage C
left open. Every `text-[Npx]` on these five files is now 12/13/14/16/18/20/24/32/40/44/56.

## 2. Color discipline

**Green family (only these):** `#29685B` primary · `#1C4E44` hover/deep · `#143B33` ink-green
(dark surfaces) · `#89D9B2` mint (dark-mode primary / dark-surface accent) · `#A7F3D0` mint
border · `#DCEBDA` soft · `#F0FDF4` tint · `#ECFDF5` pale · `#166534` success text ·
`#1A2420` ink. **Neutrals:** slate scale `#0F172A → #F8FAFC` + `#E2E8F0` as the one hairline.
**Status stays semantic** (amber = warning only, red = critical, `#EFF6FF/#1E40AF` = info).
**Exempt:** insurer brand hexes in `TrustBadges.tsx`, macOS window dots in mockups.

Off-palette found on sweep surfaces (all fixed in Stage A):
- `#206756` selection/hover — WorldClassLanding.tsx:60, LoBPageShell.tsx:48,90
- `#337D6F`/`#2C6E61` mobile-menu CTAs — WorldClassLanding.tsx:209, LoBPageShell.tsx:177
- `#4ADE80` kicker, `#065F46` badge — WorldClassLanding.tsx:479,227
- `#EBE5D9`/`#D9D0C1` beige highlight card — PricingCard.tsx:38; beige/blue step borders
  `#EBE5D9`/`#D7E4ED`, `#EDF2F7`, `#D0D7DE`, `#EAF6F1`, `#1E3A8A`, amber ★ `#F59E0B` —
  AgentsSolutionPageClient.tsx:48,57,74,91,108,144,154,169,189,207
- `#1A4A1A`, `#E5E7EB`, `#F0F0F0` — ProductPageClient.tsx:154,30,236-237,325,434,436,490
- `#CFE3DA`/`#EAF6F1`/`#BBD6CA` — PublicMegaFooter.tsx:126,142 · `#64748B` selection —
  PricingPageClient.tsx:187
- Stage B decision: the 6-hue pastel category coding in `lib/product/catalog.tsx`
  (blue/beige/lilac/rose/olive card surfaces) — either bless as the one sanctioned
  category system or collapse to green/neutral. Untouched in Stage A.

**Stage C — decided: collapsed.** The rainbow was the last place the marketing site used a
palette the brand does not own. `lib/product/catalog.tsx` now carries a **two-tier** system,
both tiers inside the family above: 10 household lines read **green**
(`#DCEBDA` surface / `#A7F3D0` border / `#F0FDF4`+`#166534` tag) and 5 commercial lines
(cyber, business, group health/life/pension) read **neutral** (white surface / `#E2E8F0`
hairline / slate-100 tag). Two values still do the scanning work six hues did.
The same pastels lived on the LoB pages as hero eyebrows (15) and 44px icon chips (16) —
all now the one green soft tint, the eyebrow matching the `/product` index exactly. Same
pass retired the off-palette neutrals those pages had inherited: 70 `text-[#1A1A1A]` → slate
ink `#0F172A`, 15 dark CTA panels `#1A1C1D` → ink-green `#1A2420`, 11 `border-[#E5E5E5]` →
the one hairline `#E2E8F0`.

**Stage D — the collapse reaches the last holdouts.** company's three "values" panels were
still on the old blue/green/beige pastel triplet — now one green tint (`#F0FDF4` on
`#DCEBDA`), matching the definitional panel above them. Plus 3 `border-[#E5E7EB]` → the one
hairline `#E2E8F0`, 2 `bg-[#F4F9F3]` → the sanctioned green tint `#F0FDF4`, and company's
dark band `#1A1C1D` → ink-green `#1A2420`. **Card radii were left alone on purpose** —
`rounded-2xl` survives on company/contact/agents cards; §4 bans `rounded-xl` *buttons*, not
cards, and unifying card radius is a visible design call, not discipline cleanup.

## 3. Spacing rhythm (one, not four)

Found: landing `py-20 lg:py-28`, pricing `pt-20/py-20` flat, product index `py-24`/`py-28`
mix, LoBPageShell offset `pt-32 lg:pt-40`. **The rhythm:** hero offset `pt-28 lg:pt-36` ·
section `py-20 lg:py-28` · compact band (stats, LoB pricing strip) `py-16` · trust strip
`py-10`. Applied to landing, pricing, LoBPageShell, product index, solutions/agents.

## 4. One CTA pair

`.pw-primary-button` / `.pw-secondary-button` (globals.css) are the only two CTA styles, with
`.pw-btn-sm` (nav/footer) and `.pw-btn-lg` (hero/final) size modifiers and
`.pw-primary-button-inverse` / `.pw-secondary-button-inverse` for dark/brand panels — added in
this batch. Pill radius always; weight 600; no `border-2`, no `rounded-[4px]`, no `rounded-xl`
buttons, no ghost-green outline variant. Non-conforming CTAs found & converted (24): landing
nav/hero/mobile/final (7), AudienceTabs (2), footer band (2), pricing nav + PricingCard button
(2), LoBPageShell nav/mobile/ghost pricing CTA (4), product index (4 incl. square
`rounded-[4px]` pairs), solutions/agents (3).

**Stage C — 33 more converted, and `rounded-[4px]` is now extinct in the tree.** The 15 LoB
pages: 15 hero primaries + 1 hero secondary → `pw-primary/secondary-button pw-btn-lg`, 15
dark final-panel CTAs + 1 dark secondary → the `-inverse` pair. The 15 square hero eyebrows
became pills at the kicker size, as did the one square status chip. `/product`'s own bespoke
mint pill folded in too, so the whole product family — index and all 15 line-of-business
pages — is one CTA system.

**Owner decision (2026-07-20): mint-on-dark is restored.** Stage C had folded the product
family's dark-panel primaries into the white `-inverse` primary on a literal reading of this
rule; the mint fill is deliberate brand signature, so it returns as a **named third variant**,
`.pw-primary-button-mint` (mint `#89D9B2` on `#0F172A` text, same shape/size/weight, pairs
with `.pw-secondary-button-inverse`) — not as ad-hoc per-page classes. The discipline wins
stand: pill radius, one size scale, no `rounded-[4px]`, `#1A1A1A` still retired. Scope is the
product family only (16 CTAs: index + 15 LoB); **the landing final CTA was always white and
stays `-inverse`**. So the rule is now: one CTA pair, plus one sanctioned dark-panel fill
variant — any further variant needs the same explicit justification.

**Stage D — the last 3 CTAs, and `rounded-[4px]` stays extinct.** guides article aside (the
final `rounded-[4px]` in the tree) → `.pw-primary-button-mint`; company careers CTA
(`rounded-2xl` + `font-bold`, white on dark) → `pw-primary-button-inverse pw-btn-lg`; contact
submit (already pill/green/600, just spelled by hand) → `pw-primary-button`, keeping its
`disabled:` classes. **Note this extends the mint variant's scope by one CTA beyond the
"product family only" line above** — the guides aside is a dark panel whose CTA was already
mint, so naming it preserved the existing look rather than changing it. Flip that one class
to `-inverse` if mint should stay strictly product-family.

## 5. Microcopy & tone (rules now, rewrites in Stage B)

Greek first, natural spoken Greek — not translated-from-English marketing. Verifiable facts
only. **Banned phrases (occurrences found):** "AI-powered" ×4 (AgentsSolutionPageClient EL+EN
hero, public-pricing-content.ts:85) · floating "AI Powered" badge (ProductPageClient:319) ·
unverifiable multipliers "10x" (AgentsSolutionPageClient:29) and "3x faster" testimonial ·
"AI insights" ×2. AI is the mechanism, never the promise; name the outcome instead.

Before → after voice:
1. «Διαχειρίσου 10x περισσότερους πελάτες με το ίδιο χρόνο.» → «Όλο το χαρτοφυλάκιο πελατών
   σας, οργανωμένο σε έναν πίνακα.»
2. "AI-powered client portfolio management για ασφαλιστικούς συμβούλους…" → «Ανεβάζετε τα
   συμβόλαια των πελατών σας· βλέπετε κενά, λήξεις και ευκαιρίες — πριν σας τα ζητήσουν.»
3. "Maximize your insurance benefits with intelligent insights…" → "See what every policy
   covers, what it doesn't, and what to do about it."

## 6. Motion restraint

Inventory: framer-motion appeared on marketing only in **dead components** (ValueSection,
AISection, Footer, ScrollToTop — zero importers, indigo/purple palette) — deleted in Stage A;
the live landing bundle never shipped it (verified against built chunks). Rules: CSS
transitions ≤300ms only; one `animate-pulse` per page max; respect `prefers-reduced-motion`.
Stage B: drop the JS count-up stat animation in ProductPageClient (decorative, 30ms interval).

## 7. Trust presentation

Until real, consented testimonials exist: **verifiable-fact tiles only** (20 branches, <30s
analysis, GDPR/AES-256, €0 entry — all checkable claims), insurer row labeled "Αναγνωρίζει
συμβόλαια από" (compatibility, not partnership). The invented-looking quotes ("Γιώργος
Παπαδόπουλος", "Μαρία Π.") are an EU consumer-law risk per the July audit — replace with a
named, consented customer or remove (Stage B, with the copy pass).

## Landing first-load JS (measured, `npm run build`, script chunks of `/`)

- Before sweep: **1,456,443 B raw / 448,293 B gzip** (18 chunks)
- After sweep: **1,455,291 B raw / 448,176 B gzip** (−1.1 KB — class-level changes only;
  framer-motion was verified absent from this bundle before the sweep, so deleting the dead
  components changes hygiene, not weight. The real reduction is the Stage-B Server-Components
  refactor of `WorldClassLanding`, tracked in the perf batch)
- After Stage-B Server-Components split: **1,408,960 B raw / 433,918 B gzip** (17 chunks) —
  **−46.3 KB raw / −13.9 KB gzip** vs post-sweep. `WorldClassLanding` is now a server
  component (hero, trust bar, services, stats, how-it-works, final CTA all server-rendered);
  the only client islands are `LandingHeader` (nav/mobile-menu state + analytics),
  `LandingCtaLink` (tracked signup CTAs), `PolicyWalletWidget`, `AudienceTabs` and
  `PublicMegaFooter` (newsletter form). `TrustBadges`/`ServicesGrid` lost their needless
  `"use client"`. The remaining ~434 KB gzip is framework + shared chunks — the honest next
  lever is shared-chunk dieting, not this page's markup. `ProductPageClient` was NOT split:
  its EL/EN toggle is client context state (`useLanguage`), so server-rendering its copy
  would freeze the language switch — its decorative JS count-up was dropped instead (§6).
  **Stage C revisited and reversed this** — see the next section.

## /product first-load JS (Stage C, same method: script chunks of the prerendered HTML)

- Before split: **1,420,503 B raw / 436,180 B gzip** (17 chunks)
- After split: **1,403,103 B raw / 431,294 B gzip** (17 chunks) — **−17,400 B raw /
  −4,886 B gzip**. `/en/product` measures identically; `/` is unchanged at 1,415,146 B raw /
  433,935 B gzip, which confirms the delta is this page's own and not a shared-chunk shift.

The Stage-B blocker ("its EL/EN toggle is client context state") stopped being true when #168
gave `/product` and `/en/product` separate routes: the toggle no longer has to mutate state,
it can navigate. So the toggle was converted first — `/product` now wraps itself in
`StaticLanguageProvider language="el" counterpartPath="/en/product"`, the mirror of what
`/en/product` already did, so EL/EN pushes the counterpart route and each route serves honest
locale-correct HTML to crawlers. With the language fixed per route it travels as a prop, and
`ProductPageClient.tsx` (445 lines, `"use client"`) became `ProductSections.tsx`, a server
component. Server-rendered: hero, wallet feature + dashboard mockup, stats, all 15 category
cards, how-it-works, FAQ headings, final CTA. Four client islands remain, each doing only the
one thing that needs a browser: `LoBPageShell` (nav/mobile-menu state, unchanged),
`ProductScrollButton` ×2, `ProductFaqList` (accordion), `ProductPageView` (analytics). The
FAQ island receives pre-translated strings so `marketing-content.ts` never reaches the
client, and the scroll buttons address their headings by DOM id instead of a React ref —
which is precisely what lets those headings stay on the server.

Verified against the production build (`npm start` + a scripted browser pass): both routes
render their own locale, the 15 category cards, the accordion and both scroll buttons work,
the how-it-works heading takes focus and lands at y≈302 (the `tests/product-friction.spec.ts`
expectation is <400), and EL→EN→EL navigates `/product` ↔ `/en/product` instead of toggling
in place.

## Checklist

- [x] `font-black` → 600/700 everywhere on marketing (8 fixed)
- [x] Off-ladder sizes normalized on the five sweep surfaces (60 fixed)
- [x] Off-palette hexes replaced with family/neutral tokens (sweep surfaces)
- [x] 24 CTAs → the pw pair (+ sm/lg/inverse utilities in globals.css)
- [x] One spacing rhythm on landing/pricing/LoB shell/product/agents
- [x] Dead framer-motion components deleted
- [x] Stage B: copy/tone rewrite — all banned-phrase occurrences above are gone (grep-clean),
      invented testimonials removed from product + agents pages (§7), generic "Learn more" /
      "Ξεκινήστε τώρα" CTAs replaced with specific verb phrases, cloned hero/heading skeletons
      de-cloned across the LoB PageClients
- [x] Stage B: Server-Components refactor of `WorldClassLanding` (numbers above); product-page
      count-up animation dropped (§6)
- [x] **Stage C: LoB type-ladder pass** — 101 off-ladder sizes normalized and 84
      `font-medium` headings → 600 across all 15 `app/(public)/product/*/PageClient.tsx` (§1)
- [x] **Stage C: CTA pass** — 33 CTAs → the pw pair/inverse pair; `rounded-[4px]` no longer
      appears anywhere in the tree; `/product`'s bespoke mint pill folded in too (§4)
- [x] **Post-C: mint-on-dark restored** as `.pw-primary-button-mint` across the 16
      product-family dark CTAs, per owner decision — landing stays white (§4)
- [x] **Stage C: category-pastel decision settled** — 6 hues collapsed to a green/neutral
      two-tier system in `lib/product/catalog.tsx`, plus 96 off-palette neutrals retired on
      the LoB pages (§2)
- [x] **Stage C: `/product` Server-Components split** — EL/EN toggle is now route navigation;
      static sections server-rendered, four client islands left; −17.4 KB raw / −4.9 KB gzip
      first-load JS (numbers above)

- [x] **Stage D: guides/company/contact/agents type-ladder + CTA pass** — 24 off-ladder sizes
      + 3 collapsed `md:` steps, 26 `font-medium` headings → 600, the last 3 non-pw CTAs
      converted, company's pastel triplet folded into the green tint (§1, §2, §4)

With Stage D the type ladder, the colour family and the CTA system hold across **every**
marketing surface: landing, pricing, product index + 15 LoB pages, guides index + articles,
company, contact, solutions/agents. `rounded-[4px]`, `font-black` and off-ladder `text-[Npx]`
are all grep-clean tree-wide.

## Shared-chunk dieting (done — measured, same method: script chunks of the prerendered HTML)

Baseline at `307f04f`. "Shared" = the chunk set common to `/`, `/pricing`, `/product`,
`/en/product` and `/solutions/agents`.

| Surface | Before | After | Delta |
| --- | --- | --- | --- |
| `/` | 1,415,146 B raw / 433,939 gzip | 1,291,850 B raw / 395,263 gzip | **−123,296 / −38,676** |
| `/product` (= `/en/product`) | 1,403,103 B raw / 431,298 gzip | 1,279,807 B raw / 392,622 gzip | **−123,296 / −38,676** |
| `/pricing` | 1,630,953 B raw / 492,691 gzip (18 chunks) | 1,305,528 B raw / 399,460 gzip (17) | **−325,425 / −93,231** |
| `/solutions/agents` | 1,427,525 B raw / 436,298 gzip | 1,304,229 B raw / 397,622 gzip | −123,296 / −38,676 |
| shared by all marketing | 1,381,040 B raw / 423,784 gzip (16 chunks) | 1,257,744 B raw / 385,108 gzip (16) | **−123,296 / −38,676** |

**What was actually in the shared chunk.** Turbopack emits no source maps for vendor chunks
and the Sentry plugin deletes the rest, so attribution was done by content fingerprinting plus
differential builds rather than a bundle analyzer. The three offenders, with evidence:

1. **Sentry Session Replay — 125,367 B raw / 39,494 B gzip**, inside the 560,351 B / 173,187
   gzip framework chunk. Measured by a differential build with `replayIntegration()` removed.
   It was statically listed in `instrumentation-client.ts`, so *every* route paid it.
2. **EL+EN translation dictionaries — 194,016 B raw / 60,053 B gzip** (`018af4ct-iid8.js`),
   fingerprinted by content (40,093 Greek characters + the English strings). Pulled in by the
   root layout's `LanguageProvider` → `lib/i18n` → both `translations/el.ts` (147 KB) and
   `en.ts` (100 KB). **Fixed** in `perf/i18n-dictionary-split` — see "Still open".
3. **supabase-js — 178,362 B raw / 46,814 B gzip** (`GoTrueClient` + `RealtimeClient` +
   Postgrest), on `/pricing` only.

**The two changes.**

- `instrumentation-client.ts`: Session Replay is no longer bundled. It is attached after
  `requestIdleCallback` via `Sentry.lazyLoadIntegration("replayIntegration")`, which fetches
  it from `browser.sentry-cdn.com` — already allowed by the `script-src` CSP in
  `next.config.ts`. Replay still records at the same sample rates; it just starts a beat after
  load, so the `replaysOnErrorSampleRate` buffer misses anything thrown before it attaches.
  That is the one deliberate behaviour trade-off in this batch, and it is a one-line revert.
- `PricingPageClient.tsx`: `createClient()` moved out of the module's static import graph and
  into a dynamic `import()` inside the session effect. **The session-aware CTA is unchanged** —
  `session` already started as `null`, so the server always rendered the anonymous CTA and only
  swapped it after `getSession()` resolved; deferring the import changes the timing, not the
  logic. Verified in the built HTML: `/pricing` still ships the anonymous "Ξεκινήστε" CTA ×5
  and never leaks the signed-in "Διαχείριση λογαριασμού" label.

All three routes still render their full content server-side after the change (`/` 5,395,
`/pricing` 3,988, `/product` 7,472 characters of visible text in the prerendered HTML).

**Tried and rejected.** Bypassing the `withSentryConfig` build wrapper: **0 B** (the SDK comes
from app code, not the plugin) — reverted. `productionBrowserSourceMaps` for attribution:
Turbopack emits no maps for the vendor chunks, so it bought nothing — reverted.
framer-motion: confirmed still absent from every marketing route (zero importers under
`app/(public)` and `components/landing`) — no lever, as §6 already recorded. lucide-react is
already imported per-icon, not through the barrel — no lever.

Still open:

- [x] **The 60 KB gzip i18n dictionary** — **done** in `perf/i18n-dictionary-split`. Marketing
      now drops **57,873 B gzip (-14.5%)** on every route: `/` 399,476 → 341,603, `/pricing`
      403,689 → 345,816, `/product` 396,842 → 338,969, `/en` 399,476 → 341,603. `/auth/signin`
      goes *up* 1,459 B, which is correct — it reads `t` and must still get the dictionary.

      The consumer map (`docs/design/I18N_CONSUMER_MAP.md`) confirmed this section's claim by
      import-graph reachability rather than by directory: 136 consumer files, 74 binding `t`,
      and walking from `app/layout.tsx` plus all 57 `app/(public)` pages reached exactly **one**
      `t` reader — `CookieConsentBanner`. It also turned up a second, undocumented leak:
      `StaticLanguageProvider` called `getTranslations` on 30 `/en` marketing pages for zero `t`
      consumers.

      `LanguageContext.tsx` keeps language state and imports `@/lib/i18n` type-only;
      `contexts/TranslationsProvider.tsx` is now the sole client-side importer of
      `getTranslations`, mounted by `(protected)`, `onboarding`, and a new pass-through
      `app/auth/layout.tsx`. `useLanguage()` is unchanged for all 136 consumers — `t` became a
      lazy getter that throws a named error rather than degrading silently.

      The cookie banner got its own co-located bilingual copy module. Falling back to
      `DEFAULT_COOKIE_COPY` would have been a regression, not a fix — it is English-only and its
      wording differs from both dictionaries — so that constant was removed outright. Rendered
      banner text (EL + EN, collapsed and expanded) and the visible text of `/`, `/pricing`,
      `/product`, `/cookies`, `/en/cookies` and `/auth/signin` are byte-identical to mainline,
      and dictionary-exclusive Greek strings appear in zero marketing chunks.

      Caveat: `/dashboard` could not be driven end-to-end locally — the dev Supabase host no
      longer resolves in DNS, so `getAuthenticatedUser` fails before any i18n code runs. The
      protected tree is verified indirectly: `/auth/signin` renders full Greek dictionary copy
      through the same new provider, and the dashboard's client-reference manifest still pulls
      the dictionary chunk.
- [ ] Card radius is not unified (`rounded-2xl` vs `rounded-[20px]`) — deliberately left as a
      design decision rather than folded into a discipline pass.
