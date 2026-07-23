# B2B responsive — visual proof

The authenticated agent screens cannot be rendered end-to-end without the
dev-Supabase pooler credentials (the Playwright agent session provisions its
user against dev Supabase). To verify the mobile behaviour of the two changes
that a unit test can only assert indirectly — the client-detail tab row and the
`.pw-stacked-table` collapse — the shipped Tailwind classes were rendered in a
standalone harness against the **real compiled CSS** (`.next/static/chunks/*.css`
from a production build), at 375px and 1440px.

This proves the layout behaviour (the classes are the ones that ship); it does
not exercise the live data, auth, or the surrounding page chrome.

## What the shots show

`b2b-tabs-stacked-table-375.png` (phone):
- The four-tab row scrolls horizontally — the fourth tab is clipped at the right
  edge as a scroll hint — instead of overflowing the page. Measured body
  overflow: **0px**.
- The renewals table collapses to a labelled card: each cell becomes a
  `ΛΑΒΕΛ / value` line via `data-label`, and `thead` is `sr-only`
  (`position: absolute`, offsetHeight ≤ 1). Nothing is dropped.

`b2b-tabs-stacked-table-1440.png` (desktop):
- All four tabs sit on one row; no scroll needed.
- The table is a normal dense column grid with visible headers.

## Reproducing

Serve nothing — it is a `file://` harness. Point Playwright (system Chrome) at
`harness.html` with `app.css` copied from the build's CSS chunk, set the
viewport, and screenshot. The measurement asserted `bodyOverflow === 0` at both
widths, `tablist.scrollWidth > clientWidth` only at 375, and `thead` hidden only
at 375.

Still owed: a full authenticated render of the actual routes at these widths,
which needs the pooler credentials and the `agent-viewport-overflow.spec.ts`
already committed for that purpose.
