# Brand Elevation — July 2026 (Stage A)

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
- [ ] Still open (stage C candidates): `font-medium` display headings → 600 on product/agents,
      LoB PageClients + guides/company/contact type-ladder pass (68px heroes, `rounded-[4px]`
      CTAs → pw pair), category-pastel decision (§2)
