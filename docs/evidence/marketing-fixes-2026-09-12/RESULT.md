# Verification result — 2026-09-12

Baseline `b9255578`, uncommitted working changes. Node 20.20.2.

| Check | Result |
|---|---|
| Full unit suite after changes | 652 files, 7,546 tests passed |
| Private-material synthetic probes | 5/5 passed |
| Private-material index/worktree audit | Passed before production build |
| API auth inventory | 106 routes / 106 entries; zero findings |
| ESLint / i18n / UTF-8 / encoding / TypeScript | Passed |
| Production build | Passed with explicit local dummy auth, Supabase and Redis values; no deployment configuration validated |
| Migration verification | BLOCKED: P1012, `DIRECT_URL` missing; neither database verified |
| Public browser sweep | 11 routes × 2 widths, 22/22 HTTP 200, one h1 and no horizontal overflow |
| Final homepage check | Greek/English × 320/390/430/1280, 8/8; no hero email during pause, one h1, no horizontal overflow |
| Actual navigation | Clicked English “Explore your needs”; `/en/needs` rendered “6 short steps. Then you know what to check.” |

The public sweep covers `/`, `/en`, `/product`, `/en/product`, `/pricing`, `/en/pricing`, `/solutions/agents`, `/en/solutions/agents`, `/trust`, `/methodology`, `/contact`. Data are in `public-pages.json`. Final homepage data are in `homepage.json`; screenshots are paired by language/width. Headless installed Chrome via Playwright; browser plugin had no connected browser. Screenshots inspected visually, including the cookie overlay; no cookie consent or contact form submitted.

Greek homepage at 390 px: 16,992 px in the first full-page capture → 14,825 px after composition/spacing changes (2,167 px shorter, approximately 13%). This measures scroll length, not usability or conversion uplift. The four screenshots show the final first viewport with the cookie notice visible.

Browser configuration: `ALLOW_REGISTRATIONS=NO`, local-only dummy auth and Supabase values. Open/paused states are independently render-tested in both languages. No database configured: pricing/partner fallbacks are what this review sees. Build required dummy Redis configuration in addition; initial attempts correctly refused missing environment values. Compilation and static generation success does not certify runtime access to external services.

The complete final unit run includes the updated Greek string inventory, the two reduced color-debt registers, synthetic fixture equivalence cases, and translation fallback tests. The first fixture edit broke punctuation-equivalence cases; the synthetic number and all punctuation variants were aligned before the final green run. A cache-test background write could cross the test boundary; the harness now drains it before resetting the fake database.

No real provider call, outbound message, database mutation, production deployment, credential use or history rewrite occurred. Firebase revocation remains open. These results support the local changes, not a claim that every historical programme item or launch gate is closed.

## Re-verification before deploy — 2026-09-20

Rebased onto NEW-UI `924887b4` (PW-VOICE-01 rounds 1–3, #350–#361). Node 20.20.2.

| Check | Result |
|---|---|
| Full unit suite on the merged tree | 653 files, 7,560 tests passed (after fixing two seams with the voice series, below) |
| `audit:api-auth`, `lint`, `lint:i18n-changed`, `lint:utf8`, `lint:encoding`, `type-check` | Passed |
| Private-material guard on the staged index + 5 probes | Passed / 5 of 5; `--revision HEAD` still finds the key in `924887b4` |
| Migrations (`verify:migrations` cannot run: no local `DIRECT_URL`) | Verified via Supabase SQL instead: prod `_prisma_migrations` 76 rows = 76 files, 0 unfinished, latest `20260910000000`; dev 79 rows, one rolled-back duplicate of `20260903120000_protection_profile` and two rows with no file (`20260830200000_grafi_app_tier`, `20260901140000_token_balance_reserved`, both from `origin/feat/grafi-b2c`), left untouched |

Two seams the merge exposed, both fixed here: the new closing line said «συμβόλαιό σας» under the #350 term lock (now «ασφαλιστήριό σας»), and the three new Greek strings were unreviewed under the voice guard (registered in `docs/content/corpus-additions.json`).

Two defects in the 2026-09-12 guard wiring itself, found by re-running the guard in the state CI and Vercel would see: (1) the `prebuild` hook fails closed (exit 2) without a git index, and the Vercel build runs on an uploaded tree with no `.git`, so it would have failed every production build — the hook is removed, CI keeps the check and the production deploy fires only on CI-green commits; (2) the guard flagged its own source once tracked, because its regex literals contain the PGP envelope — the patterns are now assembled from a split dash run. The 2026-09-12 «passed» result was measured with the guard still untracked.
