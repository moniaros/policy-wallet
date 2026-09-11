# PW-PROVENANCE-01 W1-02 — production verification after PR #341 (NEW-UI `691f8f24`)

Every citation an extraction returns is now checked against the document's own text when the
extraction had the probe's local per-page copy (text-native PDFs): `verifyExtractionSources`
marks each stored `extraction.sources` entry `verified: true|false` with `verifiedPage`, refuting
only within the pages actually read (D-P25), by a folded then letters-only comparison (D-P26).
The item changes what the pipeline STORES beside each citation; no route, page or public copy
changes, and no existing row is rewritten. Production verification therefore proves the deploy
carrying the item is live and the public product unchanged; the marks appear on
`acordData.extraction.sources` of the next analysed text-native policy. Script in this directory:
`prod-smoke.sh`.

## Timeline (UTC, 2026-09-11)

| Step | Evidence |
|---|---|
| PR #341 (stacked on W1-01, `origin/NEW-UI` merged in before opening) | PR CI green, 5/5 jobs |
| Squash merge to NEW-UI | `691f8f24` at 22:33:44Z, via the GitHub connector |
| CI on NEW-UI, run 34654545606 | **success** 22:43:30Z, first attempt (Security Scan, Lint & Type Check, Unit Tests, Build, Money Path) |
| Deploy, run 34655235612 (`workflow_run`, on NEW-UI's head `d0e729f6`, the W1-01 docs commit over this merge) | **success** 22:46:59Z; Vercel deployment `dpl_Fb7VgitU2g7q1YTLhgtfmkyCyC4u`, `githubCommitSha` `691f8f24…`, READY 22:46:57Z, aliases `www.policywallet.gr`, `policywallet.gr`, `app.policywallet.gr` |
| Smoke window | 22:50:24Z – 22:51:02Z |

## Local gate on the PR tree

audit:api-auth · lint · lint:i18n-changed (SCAN_ALL) · lint:utf8 · lint:encoding · type-check ·
verify:migrations · `vitest --run tests/unit` (all files, all tests) · build — green before the PR
was opened; the same tree built green on the PR's CI and on NEW-UI's.

**The guards, red before green on the real tree:** the widened provider block — the
`enrichExtractionPayload(` call in one provider without `localText` → that provider named;
restored, green. `extraction-citations-verified` — its probe (a snippet present only on a page
outside the sampled set is NOT refuted) demonstrated with the `reviewState` demo after the
multi-line-chain parser fix.

## Anonymous production smoke

`BASE_URL=https://www.policywallet.gr npx playwright test --project=public-anon prod-smoke`
→ **2 passed (37.9s)**.

`prod-smoke.sh` (curl, no session), 22:51Z: `/`, `/pricing`, `/product/motor`, `/product/health`,
`/trust`, `/methodology`, `/status`, `/auth/signin` all **200**, `lang="el"`, no leaked internals;
`/dashboard`, `/wallet`, `/protection` **307** to signin.

## Sentry (org `policywallet`)

`firstSeen:-3h` at ~22:51Z: **no group first seen after this deploy** (nor after any of the day's
earlier ones). Server traces are 10 % sampled and the window is minutes long — weak evidence,
recorded as such.

## Not run

- **A live extraction:** no provider is called in tests and no upload was made to production, so
  no production row carries `verified` yet. The verifier is asserted on fixtures (present on the
  cited page → `true`; absent from a fully-read document → `false`; outside the read pages → no
  verdict).
- **Signed-in production pass:** no session in this machine's browser (BL-C2); nothing signed-in
  differs until a policy is re-analysed, and no surface renders the mark yet (W2 consumes it).
- **Database:** none — no migration, no row written, no row rewritten.
- **The production flag:** `EXTRACTION_CITATIONS` is env-only and unreadable to the agent; the
  5-of-8 rows carrying `extraction.sources` (SELECT 2026-09-11) suggest it is on.
