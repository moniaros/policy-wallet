# PW-PROVENANCE-01 W2-01 — production verification after PR #342 (NEW-UI `2d920c95`)

Every gap row the one writer writes now carries, per field its rule read, what the document was
evidence of — `policy_verified` (a value whose citation was found in the text, W1-02),
`policy_asserted` (a value with no citation, a refuted one, or one that could not be checked),
`policy_silent` (no value; an empty array counts) — plus the weakest of them, persisted additively
as `ruleInputs._evidence` by `writeRuleDecidedGaps`. `lib/gap-detection.ts` is byte-identical
(owner-frozen, D-P29). No reader consumes `_evidence` yet — W2-02 does — so no page, route or
public copy changes with this deploy, and no existing row is rewritten: the states appear on the
rows of the next analysis run. Production verification therefore proves the deploy carrying the
item is live and the public product unchanged. Script in this directory: `prod-smoke.sh`.

## Timeline (UTC, 2026-09-11)

| Step | Evidence |
|---|---|
| PR #342 (stacked on W1-02, `origin/NEW-UI` merged in before opening) | CI run 34654900423 **success** 22:50:17Z, 5/5 jobs |
| Squash merge to NEW-UI | `2d920c95` at 22:52Z, via the GitHub connector |
| CI on NEW-UI, run 34655826157 | **success** 23:02:53Z, first attempt (Security Scan, Lint & Type Check, Unit Tests, Money Path, Build) |
| Deploy, run 34656525974 (`workflow_run`, on NEW-UI's head `6caa1152`, the W1-02 docs commit over this merge) | **success** 23:06:39Z; Vercel deployment `dpl_3Wukph74boAr5xVXrWnU81EjbQnx`, `githubCommitSha` `2d920c95…`, READY 23:06:37Z, aliases `www.policywallet.gr`, `policywallet.gr`, `app.policywallet.gr` |
| Smoke window | 23:09:50Z – 23:10:26Z |

## Local gate on the PR tree

audit:api-auth · lint · lint:i18n-changed (SCAN_ALL) · lint:utf8 · lint:encoding · type-check ·
verify:migrations · `vitest --run tests/unit` (all files, all tests) · build — green before the PR
was opened; the same tree built green on the PR's CI and on NEW-UI's.

**The guard, red before green on the real tree:** the writer-level assertion in
`tests/unit/gap-instance-writer.test.ts` — the `_evidence` persistence dropped from
`withDocumentEvidence` → red; restored → green. `tests/unit/document-evidence.test.ts` pins the
three states and the empty-array rule with fixtures. The first cut placed the evidence inside
`lib/gap-detection.ts` and turned the frozen-pin guard red; that is the recorded reason it lives
in the writer.

## Anonymous production smoke

`BASE_URL=https://www.policywallet.gr npx playwright test --project=public-anon prod-smoke`
→ **2 passed (35.6s)**.

`prod-smoke.sh` (curl, no session), 23:10Z: `/`, `/pricing`, `/product/motor`, `/product/health`,
`/trust`, `/methodology`, `/status`, `/auth/signin` all **200**, `lang="el"`, no leaked internals;
`/dashboard`, `/wallet`, `/protection` **307** to signin.

## Sentry (org `policywallet`)

`firstSeen:-1h` at ~23:11Z: **no group first seen after this deploy**. Server traces are 10 %
sampled and the window is minutes long — weak evidence, recorded as such.

## Not run

- **An analysis run:** no upload was made to production, so no production `gap_instances` row
  carries `_evidence` yet; the writer is asserted on a double with fixtures.
- **Signed-in production pass:** no session in this machine's browser (BL-C2); nothing signed-in
  differs until W2-02 reads the states.
- **Database:** none — no migration, no row written, no row rewritten.
