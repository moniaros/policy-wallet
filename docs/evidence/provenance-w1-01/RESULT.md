# PW-PROVENANCE-01 W1-01 — production verification after PR #340 (NEW-UI `b2449342`)

The citation fields cover every `acordData` path the rules read (34 derived from the 50 active
authored rules), keyed `acordData.<path>` in the prompt, the response schema and the sanitizer.
The item changes what the extraction model is ASKED to cite when `EXTRACTION_CITATIONS` is on;
no route, page or stored shape changes. Production verification therefore proves the deploy
carrying the item is live and the public product unchanged; what the next extraction cites is
visible in `acordData.extraction.sources` of the next analysed policy. Script in this directory:
`prod-smoke.sh`.

## Timeline (UTC, 2026-09-11)

| Step | Evidence |
|---|---|
| PR #340 head `b8a4b7f6`, then `origin/NEW-UI` merged in → `4087e795`, then a rows fix `29f53078` | CI run 34651754322 **success** 22:05:46Z, 5/5 jobs |
| Squash merge to NEW-UI | `b2449342` at 22:09Z, via the GitHub connector |
| CI on NEW-UI, run 34652698007 | attempt 1 **failed** at Build — `Next.js build worker exited with code: null and signal: SIGSEGV` during static page generation, a runner crash (Unit Tests passed; the PR built the same tree green minutes earlier); the deploy run 34652722540 was **skipped**. Failed job re-run 22:22:18Z → **success** 22:24:48Z |
| Deploy, run 34653889271 (`workflow_run`, on NEW-UI's head `575f2646`, which carries this merge) | **success** 22:28:32Z; Vercel deployment `dpl_DwMiMZrhkTsF5JETPJbAABE8QC8E`, `githubCommitSha` `b2449342…`, READY 22:28:28Z, aliases `www.policywallet.gr`, `policywallet.gr`, `app.policywallet.gr` |
| Smoke window | 22:31:48Z – 22:33Z |

## Local gate on the PR tree (`b8a4b7f6`)

audit:api-auth · lint · lint:i18n-changed (SCAN_ALL) · lint:utf8 (3197 files) · lint:encoding ·
type-check · verify:migrations · `vitest --run tests/unit` **638/638 files, 7416/7416 tests** ·
build — green. The first gate run turned the read-site guard red on a PHANTOM read — the
citations prompt nests a template literal inside an interpolation and the guard's blanker
copied interpolation text verbatim — fixed in the guard (recursive blanking, probe added).

**The guard, red before green on the real tree:** `vehicle.hasRoadsideAssistance` filtered out
of the list → `no_roadside_assistance` and `moto_no_roadside_assistance` named; restored, green.

## Anonymous production smoke

`BASE_URL=https://www.policywallet.gr npx playwright test --project=public-anon prod-smoke`
→ **2 passed (35.4s)**.

`prod-smoke.sh` (curl, no session), 22:32Z: `/`, `/pricing`, `/product/motor`,
`/product/health`, `/trust`, `/methodology`, `/status`, `/auth/signin` all **200**, `lang="el"`,
no leaked internals; `/dashboard`, `/wallet`, `/protection` **307** to signin.

## Sentry (org `policywallet`)

`firstSeen:-6h` at ~22:33Z: **no group first seen after any of today's deploys**. Server traces
are 10 % sampled and the window is minutes long — weak evidence, recorded as such.

## The flag, and what production already shows

`EXTRACTION_CITATIONS` stays env-only and the agent cannot read the production environment;
production carries `extraction.sources` on 5 of 8 rows (SELECT 2026-09-11), so the flag appears
to be on there. With this deploy the next extraction is asked to cite the 34 coverage paths too.

## Not run

- **A live extraction:** no provider is called in tests and no upload was made to production;
  the prompt and schema text are asserted, the mock fixture is unchanged.
- **Signed-in production pass:** no session in this machine's browser (BL-C2); nothing
  signed-in differs until a policy is re-analysed.
- **Database:** none — no migration, no row written.
