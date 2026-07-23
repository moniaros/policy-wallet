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

## Authenticated run (23 Jul)

The dev-Supabase pooler password was in `.env.local` all along (the `db.*`
direct host is IPv6-only and unreachable from this machine, but the same
password works through the IPv4 pooler). So `agent-viewport-overflow.spec.ts`
WAS run against the live authenticated agent session:

- 36/38 passed first time; the two failures were **real bugs the harness could
  not have caught**: `/customers` overflowed horizontally at 375px and 390px,
  because its three header actions (Import / Add client / Upload policy) sat in a
  non-wrapping `flex` row. Fixed (stack on mobile, inline from sm); both cases
  now pass, and a direct measurement of the authenticated page reports 0px
  overflow.
- `customers-375-authenticated.png` is that real render — live data, real chrome,
  the actual route — not a harness.

Run it yourself:
```bash
PW=$(grep -E '^DATABASE_URL=' .env.local | sed -E 's/.*postgres:([^@]+)@.*/\1/')
export DATABASE_URL="postgresql://postgres.lzqvtvjggylcujenlelh:${PW}@aws-1-eu-west-3.pooler.supabase.com:5432/postgres?connection_limit=2&pool_timeout=60"
export DIRECT_URL="$DATABASE_URL"
export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
npx playwright test --project=agent-chromium agent-viewport-overflow --workers=3
```
