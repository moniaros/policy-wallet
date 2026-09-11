# PW-PROVENANCE-01 W2-02 — production verification after PR #343 (NEW-UI `b791fce8`)

A rule now declares the evidence it needs — derived from its operator class (a `missing` /
`all_missing` rule fires on silence → `policy_silent`; every other rule asks the document →
`policy_verified`), overridable per definition with a reason — and a stored finding's verdict
(`gap` / `review` / `not_recorded`) follows from that floor and the evidence its run recorded
(W2-01). Rows written before W2-01 count as asserted (P-H3: no grandfathering). The ONE accessor
tags every live row; a `classified` read keeps only `gap` rows; a finding below its floor takes
the disclosed under-review treatment on /protection («Ευρήματα χωρίς επιβεβαίωση από το
έγγραφο»), is counted nowhere and sent nowhere; the agent card folds it into the under-review
figure. **This is the item with the visible product consequence:** on this deploy every live
production finding demotes from `gap` to the disclosed group until its policy is re-analysed with
confirmed citations. Script: `prod-smoke.sh` in this directory.

## Timeline (UTC, 2026-09-11)

| Step | Evidence |
|---|---|
| PR #343 (stacked on W2-01, `origin/NEW-UI` merged in before opening) | CI run 34656237440 **success**, 5/5 jobs |
| Squash merge to NEW-UI | `b791fce8` at 23:12:39Z, via the GitHub connector |
| CI on NEW-UI, run 34657171454 | **success** 23:24:11Z, first attempt (Security Scan, Lint & Type Check, Unit Tests, Money Path, Build) |
| Deploy, run 34657928624 (`workflow_run`, on NEW-UI's head `1bba1f11`, the W2-01 docs commit over this merge) | **success** 23:27:52Z; Vercel deployment `dpl_6effKuZHKoVgtF1NBWUn5EzRQBSe`, `githubCommitSha` `b791fce8…`, READY 23:27:48Z, aliases `www.policywallet.gr`, `policywallet.gr`, `app.policywallet.gr` |
| Smoke window | 23:29:10Z – 23:29:46Z |

## Local gate on the PR tree

audit:api-auth · lint · lint:i18n-changed (SCAN_ALL) · lint:utf8 · lint:encoding · type-check ·
verify:migrations · `vitest --run tests/unit` (all files, all tests) · build — green before the PR
was opened; the same tree built green on the PR's CI and on NEW-UI's.

**The guard, red before green on the real tree:** `evidence-floor-declared` — the accessor's
`isPublishableVerdict` filter removed from the `classified` scope → red (a `review`-verdict row
reached the classified list); restored → green. The catalogue arm prints all 50 floors and
refuses a silence rule worded as absence of cover.

## Anonymous production smoke

`BASE_URL=https://www.policywallet.gr npx playwright test --project=public-anon prod-smoke`
→ **2 passed (35.3s)**.

`prod-smoke.sh` (curl, no session), 23:29Z: `/`, `/pricing`, `/product/motor`, `/product/health`,
`/trust`, `/methodology`, `/status`, `/auth/signin` all **200**, `lang="el"`, no leaked internals;
`/dashboard`, `/wallet`, `/protection` **307** to signin.

## Sentry (org `policywallet`)

`firstSeen:-1h` at ~23:30Z: **no group first seen after this deploy**. Server traces are 10 %
sampled and the window is minutes long — weak evidence, recorded as such.

## Not run — and what the owner will see

- **The signed-in outcome — the demotion itself — was NOT observed on production.** No session in
  this machine's browser (BL-C2). The accessor's behaviour is asserted by
  `tests/unit/evidence-floor-declared.test.ts` on fixtures and by the `gap-rows` tests; the
  /protection group renders in `tests/unit/protection-surface-ledger.test.tsx`. On the owner's
  wallet every live finding should now sit under «Ευρήματα χωρίς επιβεβαίωση από το έγγραφο»
  with the disclosure, and the dashboard's headline gap count should read 0 until a policy is
  re-analysed (P-H3, D-P32). **If it does not, that is the first thing to look at.**
- **Database:** none — no migration, no row written, no row rewritten. The verdict is computed
  on read.
