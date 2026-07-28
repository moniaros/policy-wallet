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

Theme audit 8/8 (0 contrast findings) · Layout 4/4 (0) · Interaction states 3/3
(0 findings, 0 unmeasured) · audit:api-auth, lint, i18n, utf8, type-check,
2469 unit tests, build.

### NOT finished — pick up here

1. **108-route sweep** (`tests/theme-contrast-audit.spec.ts`). PAGES was widened
   from 22 to all 108 static routes. The run found **0 contrast, 0 layout and 0
   interaction findings** in everything it reached, but 9 of 13 tests hit the
   12-minute per-test budget. Budget is now 45min and the per-route settle is
   450ms — **has not been re-run since**.
2. **Button-state sweep** (`tests/theme-controls-audit.spec.ts`, new). Drives
   DEFAULT/HOVER/FOCUSED/PRESSED/DISABLED/SELECTED and measures contrast on the
   COMPOSITED surface. Never completed a run — two attempts were killed by the
   environment before flushing output. Scoped to 4 representative pages to make
   it finish; that scoping is untested. Card surfaces DO measure (16 distinct
   per viewport); its only finding was mint #89D9B2 on a `<button>`, correct by
   design, now excluded from the surface scan.

   Run both with:
   `RUN_UX_AUDIT=1 npx playwright test tests/theme-contrast-audit.spec.ts tests/theme-controls-audit.spec.ts --project=chromium --workers=1`

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

