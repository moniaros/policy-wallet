# PW-PROVENANCE-01 W0-03 — production verification after PR #338 (NEW-UI `1c8d98c2`)

Text-first extraction behind `EXTRACTION_TEXT_FIRST`, **off by default**. With the variable
unset every provider request is byte-identical to before (payload tests, flag off), so this
deploy changes production behaviour only when the owner sets the variable — Gemini-first,
the way `EXTRACTION_CITATIONS` rolled out. Production verification therefore proves the
deploy carrying the item is live and the public product unchanged; the request shape under
the flag rests on the tests named below. Script in this directory: `prod-smoke.sh`.

## Timeline (UTC, 2026-09-11)

| Step | Evidence |
|---|---|
| PR #338 head `17cbc5f9`, then `origin/NEW-UI` merged in → `338c4c69` (two ledger conflicts resolved by keeping both sides' rows) | CI run 34641851144 **success** 20:13:14Z, 5/5 jobs, first attempt on that head (the run on `17cbc5f9`, 34641688800, was cancelled by the merge push — `cancel-in-progress`) |
| Squash merge to NEW-UI | `1c8d98c2` at 21:20:14Z, via the GitHub connector |
| CI on NEW-UI, run 34648868831 | **success** 21:32:33Z, first attempt (queued ~10 min on GitHub's side) |
| Deploy, run 34649883589 (`workflow_run`) | **success** 21:36:51Z; Vercel deployment `dpl_7zcyyrPj9ZKeTP2Q7EiunAu2ReNs`, `githubCommitSha` `1c8d98c2…`, READY 21:36:49Z, aliases `www.policywallet.gr`, `policywallet.gr`, `app.policywallet.gr` |
| Smoke window | 21:37:24Z – 21:39Z |

## Local gate on the PR tree (`17cbc5f9`)

audit:api-auth · lint · lint:i18n-changed (SCAN_ALL) · lint:utf8 (3193 files) · lint:encoding ·
type-check · verify:migrations · `vitest --run tests/unit` **637/637 files, 7408/7408 tests** ·
build — green. One red on the first gate run, fixed inside the item: the file-name guard caught
a bare `filename:` type annotation in the new module (the type is now derived from the one
builder that calls `providerDocumentFileName`).

**The guard, red before green on the real tree:** «every provider decides text-or-file through
`extractionContentParts`» reported all three providers before they were wired, then green.

**The request shape, asserted with the SDK mocked** (`gemini-ai-message-payload.test.ts`,
`openai-ai-message-payload.test.ts`): flag on + local text → no file part, page-marked text
inside `<document_text>`, and Gemini's gap call still attaches the file; flag on + a scan →
the file with the constant name; flag off → unchanged. `extraction-input.test.ts`: every
branch of the decision, the page-boundary cut, the forged-fence case.

## Anonymous production smoke

`BASE_URL=https://www.policywallet.gr npx playwright test --project=public-anon prod-smoke`
→ **2 passed (35.2s)**.

`prod-smoke.sh` (curl, no session), 21:38:25Z: `/`, `/pricing`, `/product/motor`,
`/product/health`, `/trust`, `/methodology`, `/status`, `/auth/signin` all **200**, `lang="el"`,
no leaked internals; `/dashboard`, `/wallet`, `/protection` **307** to signin. The same shape as
every smoke today.

## Sentry (org `policywallet`)

`firstSeen:-5h` at ~21:39Z: **no group first seen after any of today's six deploys**. Server
traces are 10 % sampled and the window is minutes long — weak evidence, recorded as such.

## The flag's production state

`npx vercel env ls production` listed no `EXTRACTION_*` name. That is consistent with the
variable being unset — the shipped default — and also with the CLI not being able to read
the environment (`docs/STATUS.md` records that `vercel env pull` redacts values). Either way
the agent did not set it and cannot read it: **the owner turns text-first on**, Gemini-first,
and the provider log line `extraction input` (`kind`, `pagesSent`, `truncated`, or `reason`)
is how to see it working.

## Not run

- **Any live model call:** no provider key is used in tests and the flag is off in
  production as far as the agent can see. Extraction quality with text input on real Greek
  schedules is **unmeasured** — that is why the flag ships off (D-P16).
- **Signed-in production pass:** no session in this machine's browser (BL-C2); with the
  flag off nothing signed-in differs.
- **Database:** none — no migration, no row written.
