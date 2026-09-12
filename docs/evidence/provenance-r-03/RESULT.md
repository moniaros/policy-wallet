# PW-PROVENANCE-01 R-03 — production verification after PR #349 (NEW-UI `d6afd586`)

The personal-data breach runbook (`docs/operations/RUNBOOK_PERSONAL_DATA_BREACH.md`: trigger →
immediate → containment → assessment → ΑΠΔΠΧ within 72 h → Art. 34 → recovery → evidence), the
Art. 33(5) register (`docs/compliance/evidence/breach-register.md`, drills are rows), a first TABLETOP
drill executed with real tools and timestamps and simulated rotation/notification
(`docs/operations/PERSONAL_DATA_BREACH_DRILL_EVIDENCE_2026-09.md`), the review pack §13.4/§14.7
annotated (downgraded, not closed — D-P44), and a guard that fails CI when the runbook cites a file or
route that does not exist. Documentation plus a test; no runtime surface changes. Script in this
directory: `prod-smoke.sh`.

## Timeline (UTC, 2026-09-12)

| Step | Evidence |
|---|---|
| PR #349 (stacked on R-01 and R-02, which it cites; `origin/NEW-UI` merged in three times as they landed) | CI run 34663165436 **success** 01:06:24Z, 5/5 jobs |
| Squash merge to NEW-UI | `d6afd586` at 01:09:38Z, via the GitHub connector |
| CI on NEW-UI, run 34663975546 | **success** 01:20:25Z, first attempt |
| Deploy, run 34664531255 (`workflow_run`, on NEW-UI's head `d6afd586`) | **success** 01:24:10Z; Vercel deployment `dpl_99UyuY1aG76M7jaNqG9sDxBaeeAu`, `githubCommitSha` `d6afd586…`, READY 01:24:06Z, aliases `www.policywallet.gr`, `policywallet.gr`, `app.policywallet.gr` |
| Smoke window | 01:24:23Z – 01:25:01Z |

## Local gate on the PR tree

audit:api-auth · lint · lint:i18n-changed (SCAN_ALL) · lint:utf8 · lint:encoding · type-check ·
verify:migrations · `vitest --run tests/unit` (all files, all tests) · build — green.

**The guard, red before green on the real tree:** `breach-runbook-references` — one line citing
`lib/security/breach-helper.ts` appended to the runbook → the resolution case red naming it; removed
→ 4 of 4 green. Before that, the guard caught two real dangling references in the first draft
(`lib/auth/step-up.ts`, which existed only on the R-01 branch, and the drill record not yet written),
which is why R-03 stacks on R-01 and R-02.

## Anonymous production smoke

`BASE_URL=https://www.policywallet.gr npx playwright test --project=public-anon prod-smoke`
→ **2 passed (36.8s)**.

`prod-smoke.sh` (curl, no session), 01:25Z: the eight public routes **200** in Greek, the three
authenticated routes **307** to signin; `/privacy` still renders the published commitment («σύμφωνα με
τα άρθρα 33 και 34») — **1 match**.

## Sentry (org `policywallet`)

`firstSeen:-2h` at ~01:25Z: **no group first seen after this deploy, nor after the three before it**.
Server traces are 10 % sampled and the window is minutes long — weak evidence, recorded as such.

## Not run — and what the owner does next

- **The drill's simulated half:** credential rotation, session revocation, the ΑΠΔΠΧ submission and
  the subject e-mails were verified to exist as tools and NOT performed (D-P44). The owner runs the
  rotation half once with a disposable key on a preview environment and appends an `Execution
  Record` to the evidence document.
- **Signed-in production pass:** none (BL-C2); nothing signed-in changes.
- **Database:** none.
