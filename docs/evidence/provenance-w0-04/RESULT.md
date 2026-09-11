# PW-PROVENANCE-01 W0-04 — production verification after PR #339 (NEW-UI `ef731076`)

The stored `acordData` schema declares the envelope beside the extraction schema, the
read-site guard checks beneath it, and one never-stored read in the clarity rehydration is
made explicit. The item changes no route, page or stored column, and the one runtime change
(two reads that were always `undefined` now say so) has no visible effect. Production
verification therefore proves the deploy carrying the item is live and the public product
unchanged; the schema's claims rest on the guards. Script in this directory: `prod-smoke.sh`.

## Timeline (UTC, 2026-09-11)

| Step | Evidence |
|---|---|
| PR #339 head `3e344b21`, then `origin/NEW-UI` merged in → `48888c47`, then a docs fix `278d6772` | The PR showed **CONFLICTING** at first and had **no Actions run at all** — the ship-workflow trap: a conflicting PR gets no CI. After the merge push CI ran: 34650537719 (cancelled by the docs push), then 34650605193 **success** 21:54:09Z, 5/5 jobs |
| Squash merge to NEW-UI | `ef731076` at 21:54:41Z, via the GitHub connector |
| CI on NEW-UI, run 34651619764 | **success** 22:06:28Z, first attempt |
| Deploy, run 34652505736 (`workflow_run`) | **success** 22:10:16Z; Vercel deployment `dpl_GdyPSwPANpFYBpUFwim4zMJYMCUZ`, `githubCommitSha` `ef731076…`, READY 22:10:13Z, aliases `www.policywallet.gr`, `policywallet.gr`, `app.policywallet.gr` |
| Smoke window | 22:11:46Z – 22:13Z |

## Local gate on the PR tree (`3e344b21`)

audit:api-auth · lint · lint:i18n-changed (SCAN_ALL) · lint:utf8 (3194 files) · lint:encoding ·
type-check · verify:migrations · `vitest --run tests/unit` **637/637 files, 7406/7406 tests** ·
build — green.

**The guards, red before green on the real tree:** with `reviewState` removed from the new
schema the widened read-site guard flagged its six direct reads; restored, green. A first
attempt with `summaryLanguage` stayed green because its reader continues the chain on the next
line after a cast — the parser now follows that shape (probe added).

**What the data said** (read-only `jsonb_object_keys` on both databases, 2026-09-11): production
holds 11 keys under `extraction`, 7 under `analysis.pipeline`, 6 under `analysis.clarity`, 4 under
`processingError`, and the two parties on 7 of 8 rows; dev additionally `confirmedBy`,
`confirmedByUserId` and a legacy `renewalHistory` entry (`endDate`, `source`). Every one is
declared; fixtures in those exact shapes parse.

## Anonymous production smoke

`BASE_URL=https://www.policywallet.gr npx playwright test --project=public-anon prod-smoke`
→ **2 passed (36.0s)**.

`prod-smoke.sh` (curl, no session), 22:12Z: `/`, `/pricing`, `/product/motor`,
`/product/health`, `/trust`, `/methodology`, `/status`, `/auth/signin` all **200**, `lang="el"`,
no leaked internals; `/dashboard`, `/wallet`, `/protection` **307** to signin.

## Sentry (org `policywallet`)

`firstSeen:-6h` at ~22:13Z: **no group first seen after any of today's seven deploys**. Server
traces are 10 % sampled and the window is minutes long — weak evidence, recorded as such.

## Not run

- **Signed-in production pass:** no session in this machine's browser (BL-C2); nothing
  signed-in differs — the one runtime change yields the values the reads already yielded.
- **Database writes:** none; both databases were READ to derive the key sets (the SELECTs
  are quoted in the PR).
