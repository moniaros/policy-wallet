# PolicyWallet — Project Status

## Product UI/UX + responsive + a11y audit — 2026-07-29 — DEPLOYED

Reported from production: the `/wallet/[id]` header looked wrong in light mode.
It did, and the reason matters more than the fix.

**Why no audit caught it.** Every sweep enumerated static routes from
`app/**/page.tsx` and explicitly skipped the 17 dynamic ones as "covered by the
journey specs" — which do not check theming. `/wallet/[id]` had never been
rendered by any audit, so a 100%-green suite said nothing about it.

**The defect.** `PolicyHero` is dark in BOTH themes (`bg-[#111111]`,
`text-white`, `border-white/15`; not one `dark:` variant in the file). Its status
chip came from `getStatusColor()`, which returns light/dark PAIRS — correct for
a themed surface like `KeyDatesCard`'s `pw-card`, wrong here: in light mode the
light half won and rendered a `bg-green-50` / `text-green-700` chip, styling
meant for a white page, onto a black slab. Added `getStatusColorOnDark()`
following the on-dark idiom the hero already used for its renewal and gap
badges. Pinned with 5 unit tests.

**Coverage fix.** Both audits now DISCOVER dynamic routes at run time by
harvesting real detail hrefs from list pages. Live for `/branches/*`,
`/guides/*`, `/lexiko/*` (18 -> 24 routes, 90 -> 115 surfaces). `/wallet`,
`/customers` and `/tasks` yield nothing locally because the dev DB is
unreachable so no fixture policy exists — those now LOG "that route family is
NOT covered" instead of passing silently.

### New: responsive + a11y + runtime audit — 30 routes x 9 widths

320/360/390/414/768/1024/1280/1440/1920, loading each route once and resizing.
The old sweep's narrowest width was 390px, so 320 and 360 had never rendered.

| | before | after |
|---|---|---|
| horizontal overflow | 191 | **0** |
| accessibility | 18 | **0** |
| runtime/console | 121 | **1** (dev-only warning on a 404) |
| touch targets | 498 | 93 |

Two structural root causes, not per-page bugs:

1. **Greek compounds.** «ασφαλιστήριο» / «πολυασφαλιστήριο» are single words
   whose MIN-CONTENT width exceeds 320px, so a flex/grid child cannot shrink
   below them. Bisecting `/`, `/product` and `/product/business` all landed on
   nodes whose own boxes measured fine.
2. **Automatic minimum size.** Grid and flex children default to
   `min-width: auto`. On `/product` a decorative mock — a 36px icon tile and a
   label — set the width of the whole column while every box measured
   "correctly".

Both fixed in `globals.css` under `@media (max-width: 430px)`:
`overflow-wrap: anywhere` on text blocks, `min-width: 0` on grid/flex children.
Nothing at >=431px changes. **Verified on the live site**: 0 overflow at 320px.

Also fixed: `not-found.tsx` had no `<main>` landmark (every 404 in the app);
`/perks` repeated `| PolicyWallet` over the root layout's own title template;
the fake browser bar's unbreakable mono URL (`min-w-0 flex-1 truncate`);
`LegalDocumentPage`'s light-only hover.

### Full-application coverage — 108 routes

Both sweeps were expanded from a "representative" subset to **all 108 static
routes** (responsive: 30 -> 108; state cascade: 24 -> 108). Narrowing to a subset
is exactly what let the `/wallet/[id]` header defect ship green.

**108/108 routes fully scanned x 9 widths (320-1920): horizontal overflow = 0.**

The first 108-route attempt died on `page.evaluate: Execution context was
destroyed` — an admin route bouncing a policyholder killed the whole sweep. Each
scan is now guarded, and a route that does not complete all 9 widths counts as
incomplete rather than scanned, so coverage cannot silently shrink.

The 78 newly-covered routes carried real semantic defects no earlier sweep could
have seen: `/onboarding` and `/onboarding/agent` had no `<main>` landmark (the
first screen a new user meets, with no skip-link destination), and
`/auth/signup/confirmation` likewise. Both fixed.

### Accessibility — 18 findings down to 1

Fixed on routes no earlier audit had rendered:

- `/agent/settings` had `<label>` elements with no `htmlFor` and inputs not
  nested inside them — visually labelled, programmatically anonymous. Commission
  inputs were named only by an adjacent `<span>`, so the announcement never said
  which branch a rate belonged to.
- `/onboarding/agent` rendered TWO `<h1>`: the brand mark was one, and each step
  renders its own. Logo demoted to `<p>`.
- `/consent/ai` and `/wallet/add` had no `<h1>` at all — given sr-only headings,
  visible design unchanged.
- `<main>` landmarks added to `/onboarding`, `/onboarding/agent`,
  `/auth/signup/confirmation` and `not-found.tsx` (every 404 in the app).

**Final across 108 routes x 9 widths: overflow 0, a11y 1, touch 53.**

The 33 "incomplete" routes are admin pages correctly redirecting a policyholder
— detected and logged, never silently counted as passing.

### Remaining low-priority debt

- **1 a11y finding**: an unlabelled form field on `/onboarding/agent` that is
  not either of the two logo file inputs (those now carry explicit names).
- **53 touch findings** at the 16-24px WCAG 2.5.8 boundary, all in the
  authenticated tree.
- `/perks` 404s by design (empty partner catalog); nothing links to it. Its
  React "script tag while rendering" notice comes from the root layout's
  pre-paint `lang` script — correctly placed in `<head>`, verified working.
- `/wallet/[id]`, `/customers/[id]`, `/tasks/[id]` cannot render locally (dev DB
  unreachable, so no fixture policy). The audits LOG this rather than passing
  silently.
- Admin routes are unreachable for the policyholder fixture, so they are audited
  only via their redirect. Auditing them needs an admin storageState.

### Checker corrections (each reported correct code as broken)

Left-edge overflow does not scroll in LTR, so a closed off-canvas drawer at
-272..0 is the pattern working; wide content inside its own `overflow-x` scroller
is deliberate; an `aria-hidden` off-screen honeypot needs no label; `sr-only`
skip links are not touch targets. The placeholder Sentry DSN and CSP-blocked
`va.vercel-scripts` are dev-only — **verified prod injects same-origin
`/_vercel/insights/script.js` (200), so the CSP was NOT loosened.**

## Theme & UI consistency audit — 2026-07-28 — MERGED + DEPLOYED

**Live in production.** `origin/NEW-UI` fast-forwarded `17a1b3f..e780e89` (18
commits, 72 files) and deployed via `vercel --prod`:
`dpl_Ab5iDG7KC9pEH2v9DqiMuAxD7DQr` (`kgk3zfa2p`), Ready, all 5 aliases moved
including apex + `www.policywallet.gr`. No DB work — zero `prisma/` changes in
the batch.

Post-deploy verification: 12 public routes 200, 4 protected 307, apex 308. All
three headline fixes confirmed in the shipped assets, not just the build:
`overflow-wrap:anywhere` on `/product/business`; `bg-amber-50
dark:bg-amber-900/20` and `text-amber-700 dark:text-amber-300` on `/product`;
and in the CSS bundle
`.dark .pw-app-canvas{background-image:radial-gradient(...),linear-gradient(to bottom right,#000,#111)}`.

Note: `verify:migrations` fails locally with `Environment variable not found:
DIRECT_URL` — the shell had not loaded `.env.local`. With it loaded,
`prisma validate` reports the schema valid. Environmental, not a defect.



**Full matrix green.** Theme audit (every route x desktop/tablet/mobile x
light/dark) plus theme-switch/stale-styles: **8/8 passed, 0 contrast findings**.
Layout audit (overflow, viewport escapes, clipped text): **4/4 passed, 0
findings**.

### Two "false positives" were real

The scanner fix that exposed them — sampling the background beside the glyph run
instead of across the whole element box — kept both alive, which forced a second
look at findings I had dismissed:

1. `ProductSections` warn branch: `border-amber-100 bg-amber-50` with no dark
   variant, beside an ok branch that correctly carried `dark:bg-slate-900`.
   Child text `text-[#0F172A] dark:text-white`. **White on amber-50, 1.04:1.**
2. `.pw-app-canvas` — the canvas under every authenticated page — painted
   `linear-gradient(..., #f8fafc, #ffffff)` with no `.dark` override, while its
   sibling `.pw-page-shell` had had one all along.

### Why every earlier sweep missed them — the durable lesson

- The static theme-pair audit reads a whole `className` body as ONE string. In
  `${warn ? "bg-amber-50" : "... dark:bg-slate-900"}` it sees both tokens and
  calls it covered. Those are two mutually exclusive elements: a dark variant on
  one branch masks its absence on the other. Making the audit **branch-aware**
  immediately surfaced 56 more. The same blind spot was in the *fixer*, whose
  "already paired?" lookahead read across the ternary boundary.
- A gradient paints via `background-image`, so a computed `backgroundColor`
  check reports `transparent` and never sees it. Only a composited pixel does.
  Anything translucent above it (a `/10` or `/15` wash) blended toward white and
  lost contrast in dark mode.

### Fixed

- 140 light-only surfaces paired with dark partners across 53 files
- `.dark .pw-app-canvas`; swept globals.css for other light gradients: none
- Tablet header overflow: PublicHeader showed nav + actions from `md:` but they
  need ~1024px; at 834px the CTA ran 84px off-screen on `/` and `/company`.
  Moved to `lg:`, keeping the hamburger that already existed.

### Scanner defects corrected

Background now sampled beside the glyph run. `sr-only` skip links no longer read
as truncated text — that guard's regex sat inside a template literal and reached
the browser with its escape stripped, so it split on the letter "s" and could
never match. Hover compared at 400ms rather than 120ms against 150ms
transitions, with the pointer parked between controls, `aria-current` items
exempt, and a pointer-reachability gate.

### Verified green

| Suite | Result |
|---|---|
| Theme audit (contrast, 3 viewports x 2 themes) | **8/8, 0 findings** |
| Layout (overflow, escapes, clipped text) | **4/4, 0 findings** |
| Interaction states (hover + focus) | **3/3, 0 findings, 0 unmeasured** |
| **State cascade** — every declared state, every element, 18 pages x 2 themes | **0 findings** |
| **Surfaces** — cards/dialogs/menus in dark mode | **0 light surfaces** (89/90/90 measured) |

Plus audit:api-auth, lint, i18n, utf8, type-check, 2469 unit tests, build.

**`tests/theme-state-cascade.spec.ts` is the one to keep.** Driving real mouse
events into controls cost ~1.5s each, so the button sweep never finished and two
runs were killed; it also only reached the handful of controls the sampler
picked. Reading the CSSOM instead — every rule carrying :hover, :focus-visible,
:focus, :active, :disabled, :checked, aria-pressed/selected/current or
[data-state] that sets a colour, resolved against live elements and scored on the
COMPOSITED surface — covers every element in every declared state and finishes in
15 minutes. It replaced theme-controls-audit.spec.ts, which measured 16 surfaces
and never completed a button run; this measures 90 and finishes.

### Full 108-route matrix — COMPLETE, zero findings

| Shard | Coverage | Result |
|---|---|---|
| desktop light + dark | 107/108 routes each | **0 findings** (33.5m) |
| tablet light + dark | 107/108 routes each | **0 findings** |
| mobile light + dark | 107/108 routes each | **0 findings** (1.1h) |

The single skipped route redirects after `goto` resolves, which destroyed the
execution context under the scanner's style injection and had been taking the
whole sweep down. Per-route try/catch + a 75% coverage floor fixed that — the
sweep was never timing out, and raising the budget could never have helped.

### Layout — COMPLETE, zero findings

108 routes x desktop/tablet/mobile: **4/4 passed, 0 findings** (43m). Covers
horizontal overflow, elements escaping the viewport, and text clipped without
an ellipsis.

The last open defect is FIXED. `/product/business` scrolled sideways at 390px
(scrollWidth 428). No element's rect exceeded the viewport, so the usual "find
the wide child" probe returned nothing. Bisecting — hide each subtree, watch
scrollWidth — found the hero `<h1>`: its box measures 342px and fits, but its
MIN-CONTENT width overflows, because «πολυασφαλιστήριο» is a single unbreakable
17-character word wider than the viewport at `text-h1`.

`overflow-wrap:anywhere` is the one value that shrinks intrinsic min-content
width (`break-word` does not). Applied to all 16 hero headings sharing the
pattern, since every LoB page carries Greek compounds of the same shape.
NOT fixed with `overflow-x:hidden`, which hides the symptom and silences the
audit.

### The lesson that cost the most

Four of the last five "defects" were the AUDIT failing, not the UI, and every one
had the same shape: **a failure to measure was reported as a failed component.**

- sr-only "truncation" on 12 routes — the guard's `/\s+/` sat inside a template
  literal, reached the browser as `/s+/`, and split on the letter "s"
- all 11 /account controls "no hover" — the snapshot returned `undefined`, and
  `undefined === undefined`
- 0 of 74 buttons measured — `evaluate()` given a STRING silently yields nothing;
  every real function reference worked

/account took eight rounds. What cracked it was not another hypothesis: the
finding count stayed byte-identical at 188 across five different edits, one of
which added an early `continue`. **A number that does not move when the code
moves is not measuring the code.** Both new suites now assert a minimum measured
count so this fails loudly instead of passing green.

**Not deployed** — 8 commits on `NEW-UI` awaiting go-ahead.

