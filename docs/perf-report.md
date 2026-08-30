# Performance report — production build, 2026-08-30

Method: `npm run build` + `next start` on :3001, Lighthouse 12 via headless
Chrome. Mobile = Lighthouse default throttling (Moto G-class, 1.6Mbps/150ms);
desktop = `--preset=desktop`. Raw JSON in the session scratchpad; re-run with
the commands below.

## Scores

| Route | Preset | Perf | A11y | BP | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|---|
| `/` | mobile | **82** | **100** | 96 | **100** | 4.8s | **0** | 80ms |
| `/` | desktop | **99** | — | — | — | **0.9s** | **0** | — |
| `/en` | mobile | — | 97† | 96 | 100 | — | — | — |
| `/product/health` | mobile | — | **100** | 96 | **100** | — | — | — |
| `/pricing` | mobile | — | **100** | 96 | **100** | — | — | — |
| `/lexiko/kalypsi` | mobile | — | **100** | 96 | **100** | — | — | — |

† measured before the cn() contrast fix (96ad87f6); the same button is the
same component on /en — re-measure expected 100.

## Against the §4.10 budgets

| Budget | Target | Measured | Verdict |
|---|---|---|---|
| CLS | < 0.05 | **0** | ✅ everywhere measured |
| INP proxy (TBT) | < 200ms | 80ms | ✅ |
| LCP (throttled 4G) | < 2.0s | **4.8s** | ❌ — see below |
| JS on marketing route | < 90KB gz | **~602KB transfer** | ❌ — see below |
| Lighthouse ≥95 ×4 | all | desktop yes; mobile perf 82 | ❌ mobile perf only |
| Fonts | < 120KB, no swap-shift | 2 preloaded variable files, CLS 0 | ✅ after consolidation |

## The one real problem: marketing routes ship the app's bundle

The homepage transfers ~602KB of script across 30 files. Named, from the
Lighthouse treemap:

- **Sentry browser SDK — 172KB** (44% unused on this page)
- **Supabase client — 46KB** (95% unused; dragged in by shared providers)
- a 73KB chunk that is 99.8% unused on `/`
- the rest: framework + the page's own client components

Desktop absorbs this (LCP 0.9s); throttled mobile does not — the H1's LCP is
render-delayed ~4.2s by bandwidth contention. FCP is 1.4s: the page *appears*
fast; the metric records the webfont repaint of the H1 after the pipe clears.

**Fix path (deliberate follow-up, not attempted today):** split the marketing
route group from the app providers so public pages ship no Supabase and a
lazy-loaded Sentry; that alone removes ~220KB and most of the render delay.
Fixes attempted today that DID land: font consolidation (three Inter
instances → one preloaded variable font, 96ad87f6) and the `/_vercel`
proxy allowlist (analytics scripts were 307ing to signin).

## Re-measure

```bash
npm run build && npx next start -p 3001 &
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
npx lighthouse http://localhost:3001/ --chrome-flags="--headless=new" --output=json
```

---

# B2C application tier — G14 perf notes (2026-08-30)

**Fonts:** one Inter + Commissioner (600–800) = **116.7 KB** — inside the
120 KB budget (§5.5), measured at G2.

**Route JS.** All app routes are dynamic (`ƒ`) server-rendered pages; this
Next 16 build log does not emit per-route first-load columns. Indicative
dev-server measurement on `/`: 39 scripts. The dominant, KNOWN weight is the
same one the marketing pass named (perf-report §4.10): the Sentry client
(~172 KB) and the Supabase client (~46 KB) ride the shared shell. The named
fix — splitting them off routes that do not need them — is unchanged and
remains the single biggest lever; it is a shell-level change, deliberately
out of this branch's scope (docs/handover.md).

**What the tier itself adds:** server components everywhere except the
interactive screens; the screens ship no charting/date libraries (Intl +
tokens only); the ring is CSS; images: none. Skeletons mirror final layouts
(no CLS from loading swaps); the fold test pins the verdict + first action
inside 393×852.

**Owed measurements (with the device pass):** Lighthouse on `/`, `/see`,
`/policies/[id]` over throttled 4G against a production build — the dev
server numbers above are not comparable and are recorded only as an
inventory.
