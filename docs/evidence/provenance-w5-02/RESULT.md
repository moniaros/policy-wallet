# PW-PROVENANCE-01 W5-02 — production verification after PR #345 (NEW-UI `bf71ef69`)

The extraction model is no longer asked for a list of beneficiary names: `lifeAndInvestment.beneficiaries`
stays declared, described `DEPRECATED`, and is dropped from the prompt block (W5-01's strip);
`beneficiaryCount` and `beneficiaryRelationships` are asked for instead. No rule changed (D-P36) —
`no_beneficiaries_recorded` and its siblings still read the live top-level `beneficiaries[]`, so the
catalogue fingerprint did not move. The top-level `beneficiaries[].name` (rendered «as written» on the
life card) is a product promise handed to the owner (P-H5). No row on either database carried the path.
Script in this directory: `prod-smoke.sh`.

## Timeline (UTC, 2026-09-11/12)

| Step | Evidence |
|---|---|
| PR #345 (stacked on W5-01; `origin/NEW-UI` merged in after W5-01 landed — two code files restored to the branch's superset after the ledger resolver touched them) | CI run 34658669782 **success** 23:46:10Z, 5/5 jobs |
| Squash merge to NEW-UI | `bf71ef69` at 23:48:18Z, via the GitHub connector |
| CI on NEW-UI, run 34659423363 | **success** 23:58:31Z, first attempt |
| Deploy, run 34660011441 (`workflow_run`, on NEW-UI's head `3e665642`, the W5-01 docs commit over this merge) | **success** 00:01:31Z; Vercel deployment `dpl_7zTRR5MoeKdZLYAA7HcSBNR2DDvo`, `githubCommitSha` `bf71ef69…`, READY 00:01:28Z, aliases `www.policywallet.gr`, `policywallet.gr`, `app.policywallet.gr` |
| Smoke window | 00:01:56Z – 00:02:34Z |

## Local gate on the PR tree

audit:api-auth · lint · lint:i18n-changed (SCAN_ALL) · lint:utf8 · lint:encoding · type-check ·
verify:migrations · `vitest --run tests/unit` (all files, all tests) · build — green.

**The guard, red before green on the real tree:** `deprecated-fields-never-asked` — the `DEPRECATED`
prefix removed from `lifeAndInvestment.beneficiaries` → 2 of 4 cases red (the enumerated set, the
prompt block); restored → 4 of 4 green.

## Anonymous production smoke

`BASE_URL=https://www.policywallet.gr npx playwright test --project=public-anon prod-smoke`
→ **2 passed (36.3s)**.

`prod-smoke.sh` (curl, no session), 00:02Z: `/`, `/pricing`, `/product/motor`, `/product/health`,
`/trust`, `/methodology`, `/status`, `/auth/signin` all **200**, `lang="el"`, no leaked internals;
`/dashboard`, `/wallet`, `/protection` **307** to signin.

## Sentry (org `policywallet`)

`firstSeen:-1h` at ~00:03Z: **no group first seen after this deploy**. Server traces are 10 %
sampled and the window is minutes long — weak evidence, recorded as such.

## Not run

- **A live extraction:** no provider is called in tests and no upload was made to production; the
  prompt block is asserted from `buildExtractionSchema()` as the model receives it.
- **Signed-in production pass:** no session in this machine's browser (BL-C2); nothing signed-in
  changes (the life card reads the top-level array, untouched).
- **Database:** none — no migration, no row written, no row rewritten; catalogue untouched.
