# PolicyWallet — Project Status

## Theme & UI consistency audit — 2026-07-28

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

### One open UI defect

`/product/business` scrolls horizontally at 390px: `documentElement.scrollWidth`
is 428 against a 390px viewport. Reproduced directly. Note that **no element's
bounding rect exceeds the viewport** — the extra 38px comes from a pseudo-element
or similar, so the usual "find the wide child" approach returns nothing. Only
surfaced once the sweep went from 22 to 108 routes.

Deliberately NOT fixed with `overflow-x: hidden`: that hides the symptom and
would make the layout audit go quiet about a real defect.

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

