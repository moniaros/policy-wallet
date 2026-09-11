# PW-PROVENANCE-01 W0-02 — production verification after PR #337 (NEW-UI `cb583bce`)

The probe's per-page text carried beside the verdict into `ValidatedAIDocument`. The item
changes the upload pipeline **in memory only**: no route, page or stored shape changes, and no
provider reads the new field yet (that is W0-03). Production verification therefore proves
the deploy carrying the item is live and the public product unchanged; the pipeline outcome
rests on the unit tests named below. Script in this directory: `prod-smoke.sh`.

## Timeline (UTC, 2026-09-11)

| Step | Evidence |
|---|---|
| PR #337 head `84e69c59` | CI run 34638788124 **success** 19:37:29Z, 5/5 jobs, first attempt |
| Squash merge to NEW-UI | `cb583bce` at 19:38:19Z, via the GitHub connector |
| CI on NEW-UI, run 34639911691 | **success** 19:50:36Z, first attempt |
| Deploy, run 34641015833 (`workflow_run`) | **success** 19:54:26Z; Vercel deployment `dpl_4dZfvcsyeuRuh1Kyu5vbwPENnfi2`, `githubCommitSha` `cb583bce…`, READY 19:54:23Z, aliases `www.policywallet.gr`, `policywallet.gr`, `app.policywallet.gr` |
| Smoke window | 19:54:46Z – 19:56Z |

Between W0-01 and this item the flake fix #336 landed on NEW-UI as `b77e44a4` (CI 34638760022
success, deploy run 34639825834 success 19:37:23Z) — test-only, same application code.

## Local gate on the PR tree (`84e69c59`)

audit:api-auth · lint · lint:i18n-changed (SCAN_ALL) · lint:utf8 (3193 files) · lint:encoding ·
type-check · verify:migrations · `vitest --run tests/unit` **636/636 files, 7390/7390 tests** ·
build — green.

**The outcome, asserted where it lives:**

- `tests/unit/ingestion/pdf-probe.test.ts` — a three-page PDF with different pages yields
  `pages[0..2]` with each page's own raw text (case kept), and `text` is still the folded join.
- `tests/unit/ingestion/document-gate.test.ts` — a validated text PDF hands its pages out;
  the verdict carries **no page text and no new key** (12 keys pinned; a page sentence absent
  from the verdict JSON and the activity metadata); a scan, a photo and a refused document
  carry nothing; `readLocalText` re-reads validated bytes for the lazy arm.
- `tests/unit/document-gate-before-model.test.ts` — no provider spreads or serialises the
  document whole. **Red on the real tree** with a `...document` injected into
  `openai-ai.service.ts`, restored, green.

## Anonymous production smoke

`BASE_URL=https://www.policywallet.gr npx playwright test --project=public-anon prod-smoke`
→ **2 passed (34.6s)**.

`prod-smoke.sh` (curl, no session), 19:55Z: `/`, `/pricing`, `/product/motor`,
`/product/health`, `/trust`, `/methodology`, `/status`, `/auth/signin` all **200**, `lang="el"`,
no leaked internals; `/dashboard`, `/wallet`, `/protection` **307** to signin. The same shape as
every smoke today (`568fee72`, `7f570f51`, `d98bf51f`).

## Sentry (org `policywallet`)

`firstSeen:-3h` at ~19:56Z: **no group first seen after any of today's deploys** (five so
far: 17:31Z, 18:15Z, 19:10Z, 19:37Z, 19:54Z). Server traces are 10 % sampled and the window is
minutes long — weak evidence, recorded as such.

## Not run

- **An upload through production:** the item's effect is invisible from outside — the
  local text is held in memory for one request and no provider reads it yet. Uploading a
  policy to production to prove nothing changed would create data to prove a negative; the
  gate-level tests prove the same thing without a row.
- **Signed-in pass:** no session in this machine's browser (BL-C2); nothing signed-in differs.
- **Database:** none — no migration, no row written, `validation_json` shape pinned unchanged.
