# PW-PROVENANCE-01 W5-01 — production verification after PR #344 (NEW-UI `43d1f62b`)

The extraction model is no longer asked for a third party's name or licence number on an
additional driver. Both driver item schemas gain `ageBand`, `yearsLicensed`,
`relationshipToPolicyholder`; `vehicle.namedDriverCount` and `namedDriverRestriction` record what
cover turns on. `name` and `licenseNumber` STAY declared, described `DEPRECATED` (LOOP.md §4:
a stored shape is never narrowed) and are dropped from the JSON-mode prompt block by
`stripDeprecated` — so nothing new is collected and a legacy row keeps its type. The motor card
renders relationship and band. No row on either database carried the array (SELECT 2026-09-11),
no rule reads it. Deleting the two keys is the owner's call (HANDOFF P-H4). Script in this
directory: `prod-smoke.sh`.

## Timeline (UTC, 2026-09-11)

| Step | Evidence |
|---|---|
| PR #344 — first cut removed the keys; reworked additive the same night (D-P33); `origin/NEW-UI` merged in twice as W2-02 and W1-02/W2-01 docs landed | CI run 34657485060 **success**, 5/5 jobs |
| Squash merge to NEW-UI | `43d1f62b` at 23:31:22Z, via the GitHub connector |
| CI on NEW-UI, run 34658378064 | **success** 23:41:47Z, first attempt |
| Deploy, run 34659023427 (`workflow_run`, on NEW-UI's head `5fc80b6d`, the W2-02 docs commit over this merge) | **success** 23:45:28Z; Vercel deployment `dpl_JBtAfLtgi93tfm5eqYG6j4KgRJfo`, `githubCommitSha` `43d1f62b…`, READY 23:45:26Z, aliases `www.policywallet.gr`, `policywallet.gr`, `app.policywallet.gr` |
| Smoke window | 23:46:26Z – 23:47:02Z |

## Local gate on the PR tree

audit:api-auth · lint · lint:i18n-changed (SCAN_ALL) · lint:utf8 · lint:encoding · type-check ·
verify:migrations · `vitest --run tests/unit` **641/641 files, 7446/7446 tests** (first cut), then
the additive rework green again · build — green. The first gate turned two fixture tests red that
the read-site guard could not see (the card reads through the domain type): moved to relationship
and band.

**The guard, red before green on the real tree:** `named-drivers-minimised` — `name` re-added
un-deprecated on the canonical item → 3 of 5 cases red (first cut), then 2 of 6 red after the
additive rework (asked keys, prompt block); restored → green.

## Anonymous production smoke

`BASE_URL=https://www.policywallet.gr npx playwright test --project=public-anon prod-smoke`
→ **2 passed (35.5s)**.

`prod-smoke.sh` (curl, no session), 23:47Z: `/`, `/pricing`, `/product/motor`, `/product/health`,
`/trust`, `/methodology`, `/status`, `/auth/signin` all **200**, `lang="el"`, no leaked internals;
`/dashboard`, `/wallet`, `/protection` **307** to signin.

## Sentry (org `policywallet`)

`firstSeen:-1h` at ~23:47Z: **no group first seen after this deploy**. Server traces are 10 %
sampled and the window is minutes long — weak evidence, recorded as such.

## Not run

- **A live extraction:** no provider is called in tests and no upload was made to production; the
  prompt block is asserted from `buildExtractionSchema()` as the model receives it.
- **Signed-in production pass:** no session in this machine's browser (BL-C2); the motor card's
  new rendering has no row to render on (0 rows carry the array).
- **Database:** none — no migration, no row written, no row rewritten.
