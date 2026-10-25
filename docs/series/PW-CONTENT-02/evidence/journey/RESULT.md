# Journey check (view-only) — preview of d8fa8f58, 2026-10-24

Preview: https://policy-wallet-4u22f4abk-moniaros-projects.vercel.app (SSO-gated; reaches the PRODUCTION database; no sign-up, no checkout, GET only).
Method: authenticated GETs through the Vercel MCP (`web_fetch_vercel_url`) for every route, then the rendered `/pricing` page in Claude in Chrome (annual toggle clicked, text read in the page).

| Route | Status | Checked |
|---|---|---|
| `/` | 200 | title «Τα ασφαλιστήριά σας, με απλά λόγια» |
| `/pricing` monthly | 200 | Family «Δωρεάν δοκιμή 14 ημερών. Μετά χρεώνεται 8,99 € τον μήνα, εκτός αν ακυρώσετε πριν λήξει.»; Agent Free 5 / Starter 50 / Pro 150 αναλύσεις τον μήνα; no «απεριόριστ…» string; no token/credit words |
| `/pricing` annual (toggle clicked) | rendered | Plus «39 € /έτος · Εξοικονομείτε περίπου 21 € τον χρόνο»; Family «79 € /έτος · Εξοικονομείτε περίπου 29 € τον χρόνο · Δωρεάν δοκιμή 14 ημερών. Μετά χρεώνεται 79 € τον χρόνο, εκτός αν ακυρώσετε πριν λήξει»; no horizontal scroll at the browser width |
| `/product` | 200 | loads |
| `/product/travel` | 200 | loads |
| `/contact` | 200 | info@policywallet.gr present |
| `/trust` | 200 | loads |
| `/compare` | 200 | loads |
| `/terms` | 200 | «Έκδοση: GR-GA-2026.10.22», «Τελευταία ενημέρωση: 22 Οκτωβρίου 2026»; §5 has both paragraphs (policyholders cancel in-app; agents by email to info@policywallet.gr; effect at end of the paid period) |

Not as asked, and why:
- **Route**: the checklist said `/legal/terms`; the route is `/terms` (`/legal/terms` returns the app's 404). Checklist corrected.
- **320px / 390px screenshots were NOT taken.** `resize_window` reports success but the page stays at `innerWidth` 1352 (outerWidth 1352), so no narrow viewport exists to capture, and the pages send `X-Frame-Options: DENY` so they cannot be framed at a narrow width either. The only layout fact checked is no horizontal overflow at 1352.
- **H-035 is not in this build** (as designed): Terms §12 still has the English/Greek mismatch; GA blocker.
