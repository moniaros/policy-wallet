# PW-PROVENANCE-01 W3-01 — production verification after PR #346 (NEW-UI `e3eac9ee`)

The first needs-against-cover comparison: `lifeAndInvestment.deathBenefit` (the document's figure,
with W2-01's citation state and its cited page) against annual income × years-by-dependency (the
profile's figures, with each fact's provenance and the income's date). Published as «shortfall» or
«adequate» only when the need is `user_reported` or better on every factor and the cover is
`policy_verified`; otherwise a question that names the missing facts, the unconfirmed citation, or
the weaker side. Rendered on the area detail of the area the life line lists under, the years printed
as an assumption. It lives beside the protection layers, not in the owner-frozen engine (D-P38);
nothing is written, counted or sent. Script in this directory: `prod-smoke.sh`.

## Timeline (UTC, 2026-09-12)

| Step | Evidence |
|---|---|
| PR #346 (`origin/NEW-UI` merged in three times as W5-01, W5-02 and their docs landed; a stale `.next/types` from another branch's build failed `tsc` once — an artifact, not the code) | CI run 34660604745 **success**, 5/5 jobs |
| Squash merge to NEW-UI | `e3eac9ee` at 00:19:22Z, via the GitHub connector |
| CI on NEW-UI, run 34661240911 | **success** 00:31:48Z, first attempt |
| Deploy, run 34661939756 (`workflow_run`, on NEW-UI's head `e3eac9ee`) | **success** 00:34:42Z; Vercel deployment `dpl_ogw92H6qFMGaEipUxhJhVHYLvLTo`, `githubCommitSha` `e3eac9ee…`, READY 00:34:39Z, aliases `www.policywallet.gr`, `policywallet.gr`, `app.policywallet.gr` |
| Smoke window | 00:35:00Z – 00:35:37Z |

## Local gate on the PR tree

audit:api-auth · lint · lint:i18n-changed (SCAN_ALL) · lint:utf8 · lint:encoding · type-check ·
verify:migrations · `vitest --run tests/unit` (all files, all tests) · build — green. The first gate
turned `branch-family-sweep` red on a literal `lob === "life"` — routed through `branchFamilyId`.

**The guard, red before green on the real tree:** `needs-publishable-only-with-evidence` —
`PUBLISHABLE_NEED_FLOOR` lowered to `inferred` → 3 of 10 cases red (the matrix's pinned floor, the
coarse-income trace case, the probe); restored → 10 of 10 green. The floors are pinned inside the
matrix case so it cannot re-derive its expectation from a lowered constant.

## Anonymous production smoke

`BASE_URL=https://www.policywallet.gr npx playwright test --project=public-anon prod-smoke`
→ **2 passed (36.6s)**.

`prod-smoke.sh` (curl, no session), 00:35Z: `/`, `/pricing`, `/product/motor`, `/product/health`,
`/trust`, `/methodology`, `/status`, `/auth/signin` all **200**, `lang="el"`, no leaked internals;
`/dashboard`, `/wallet`, `/protection` **307** to signin.

## Sentry (org `policywallet`)

`firstSeen:-1h` at ~00:36Z: **no group first seen after this deploy**. Server traces are 10 %
sampled and the window is minutes long — weak evidence, recorded as such.

## Not run — and what the owner will see

- **The block itself is signed-in only** (BL-C2, no session on this machine). It is asserted through
  the real composition in `tests/unit/needs-check-render.test.tsx` (published only with evidence on
  both sides; a question otherwise; absent off the life line's area).
- **Every live comparison is a question today:** no production `extraction.sources` entry carries
  `verified` (W1-02 marks the next analysis), so the life area's detail will show «Need against
  cover» as a question naming the unconfirmed citation or the missing facts, never a shortfall, until
  a life policy is re-analysed AND the income, dependency and dependants are stated exactly.
- **Database:** none — no migration, no row written.
