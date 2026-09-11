# PW-PROVENANCE-01 W0-01 — production verification after PR #335 (NEW-UI `d98bf51f`)

The `acordData` read-site guard (`tests/unit/acord-data-read-sites.test.ts`) and the five
reader fixes it forced. The guard runs at test time; the reader fixes change what a
**signed-in** policy page and analysis tab render (the insurer tile, the premium currency),
which an anonymous smoke cannot see — so production verification proves the deploy carrying
the item is live and the public product unchanged, and the rendered outcome rests on the
render check named below. Script in this directory: `prod-smoke.sh` (anonymous, re-runnable).

## Timeline (UTC, 2026-09-11)

| Step | Evidence |
|---|---|
| PR #335 head `fe3c0773` | CI run 34634252840: attempt 1 **failed** at Unit Tests on `area-detail-questions.test.tsx` («after one answer and a skip…»), 635/636 files — the known flake, a file this PR does not touch; failed jobs re-run 18:47:09Z → **success** 18:53:50Z, 5/5 |
| Squash merge to NEW-UI | `d98bf51f` at 18:54:39Z, via the GitHub connector |
| CI on NEW-UI, run 34635935272 | **success**, first attempt (Unit Tests green) |
| Deploy, run 34637008142 (`workflow_run`) | **success** 19:10:06Z; Vercel deployment `dpl_9j5taQBoTGjstXmzemiTxa37FMx1`, `githubCommitSha` `d98bf51f…`, READY 19:10:03Z, aliases `www.policywallet.gr`, `policywallet.gr`, `app.policywallet.gr` |
| Smoke window | 19:10:41Z – 19:12Z |

## Local gate on the PR tree (`fe3c0773`)

audit:api-auth · lint · lint:i18n-changed (SCAN_ALL) · lint:utf8 (3190 files) · lint:encoding ·
type-check · verify:migrations · `vitest --run tests/unit` **636/636 files, 7381/7381 tests** ·
build — green. One lint red on the way (an `as {}` cast in the guard's site builder), fixed.

**The guard, red before green on the real tree:** the first correct scan reported 16
findings (10 distinct after dedupe) across 5 files; after 5 reader fixes and 2 envelope
roots, 16/16 cases green with the tree unchanged otherwise. Enumeration: 1230 files scanned,
66 read `acordData`, 424 sites, 76 distinct paths; schema universe 188 paths.

**The rendered outcome:** `tests/unit/policy-analysis-tabs-reads-schema-paths.test.tsx`
renders the analysis tab with a fixture shaped as `AcordDataSchema` declares and asserts the
insights tab shows the insurer («Interamerican») and the premium with its currency («420 EUR»).
Before the fix the tile read `policy.insurer` — a key the pipeline never wrote — and rendered
empty for every production policy.

## What the data said (read-only SELECT on both databases, 2026-09-11 ~18:35Z)

| Key read by the app | production rows (of 8 with extraction data) | dev rows (of 14) | done |
|---|---|---|---|
| `policy.insurer` | 0 | 1 | reader fixed to `policy.insurerName` (7 prod rows carry it), through `displayInsurerName` |
| `policy.premium.currency` | 0 | 11 | three readers fixed to `policy.currency` (2 prod rows carry it; the column fallback covers the rest) |
| `policy.coverageType`, `policy.planType`, `coverageType`, `coverageSummary` | 0 | 0 | four dead fallback reads deleted |
| `policyholder`, `insured` | **7** | 1 | envelope roots naming their writer (`extraction-enrichment.ts`); queue item W0-04 |

## Anonymous production smoke

`BASE_URL=https://www.policywallet.gr npx playwright test --project=public-anon prod-smoke`
→ **2 passed (35.0s)**.

`prod-smoke.sh` (curl, no session), 19:11Z: `/`, `/pricing`, `/product/motor`,
`/product/health`, `/trust`, `/methodology`, `/status`, `/auth/signin` all **200**, `lang="el"`,
no leaked internals; `/dashboard`, `/wallet`, `/protection` **307** to signin. Byte-for-byte the
same shape as the two earlier smokes today (`568fee72`, `7f570f51`).

## Sentry (org `policywallet`)

`firstSeen:-3h` at ~19:12Z: **no group first seen after any of today's three deploys**.
Server traces are 10 % sampled and the window is minutes long — weak evidence, recorded as such.

## Not run

- **Signed-in production pass of the fixed tiles:** no policyholder session exists in this
  machine's browser profile and the agent does not enter credentials (`docs/content/BLOCKED.md`
  BL-C2). The outcome is asserted by the render check above; on production the change is
  visible on any analysed policy's «Ανάλυση» tab — the insurer tile is no longer empty.
- **Database writes:** none — the item reads both databases (the counts above) and writes
  nothing; no migration; `AcordDataSchema` untouched.
- **Lighthouse:** not run — no public UI change.
