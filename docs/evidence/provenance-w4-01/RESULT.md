# PW-PROVENANCE-01 W4-01 — production verification after PR #320 (NEW-UI `568fee72`)

The Art. 30 record generated from the schema: 57 `/// @ropa` model tags, `scripts/generate-ropa.ts`
(`--check`), guard `ropa-tags-complete`, `docs/compliance/ROPA.md`. The item has **no runtime
surface** — the tags are schema comments, the generator and the guard run at test time — so
production verification proves two things: the deploy that carries it is live, and the public
product is unchanged by it. Script in this directory: `prod-smoke.sh` (anonymous, re-runnable).

## Timeline (UTC, 2026-09-11)

| Step | Evidence |
|---|---|
| PR #320 head `04510196` (`6855dd0d` = PR + `origin/NEW-UI` merged; `04510196` = a parallel session's docs row, D-P6) | CI run 34624836149 **success** 17:07:55Z — Lint & Type Check, Security Scan, Unit Tests, Build, Money Path all green. The earlier run 34623782676 on `6855dd0d` was cancelled by `cancel-in-progress` when `04510196` was pushed; its Unit Tests had already passed |
| Squash merge to NEW-UI | `568fee72` at 17:08:35Z, via the GitHub connector (the PR had to be taken out of draft first — GitHub returns 405 on a draft) |
| CI on NEW-UI, run 34626016187 | attempt 1 **failed** at Unit Tests on `tests/unit/area-detail-questions.test.tsx` («after one answer and a skip, something was said») — 632/633 files; the deploy run 34626860232 was **skipped** (the red-gate-withholds-production trap, `docs/STATUS.md`). Failed jobs re-run 17:18:54Z → **success** 17:28:09Z, 5/5 jobs |
| Deploy, run 34627851127 (`workflow_run`) | **success** 17:31:48Z; Vercel deployment `dpl_EFfouiQowngaK8mBoZ4A63eJN79m`, `githubCommitSha` `568fee72…`, READY 17:31:46Z, aliases `www.policywallet.gr`, `policywallet.gr`, `app.policywallet.gr` |
| Smoke window | 17:32:26Z – 17:34Z |

## Local gate on the merged head (`6855dd0d`, this session)

audit:api-auth · lint · lint:i18n-changed (SCAN_ALL) · lint:utf8 (3185 files) · lint:encoding ·
type-check · verify:migrations («Database schema is up to date») · build — all green.
`vitest --run tests/unit`: **632/633 files, 7353/7354 tests** — the one red is
`area-detail-questions.test.tsx` («inputs and both buttons are disabled while an answer is
saving»), a file this PR does not touch; run alone three times: 46/46, 46/46, 46/46. The parallel
session's gate on the same head reported 633/7354 green (commit `04510196`). CI's Unit Tests then
flaked on a *different* case of the same file on NEW-UI. **Three flakes of one file in four days
(#331, #320 twice) — this file is now a deploy-blocking hazard, not a curiosity.**

On the merged tree `568fee72`: `npx tsx scripts/generate-ropa.ts --check` → «docs/compliance/ROPA.md
is up to date (57 tagged stores)»; `ropa-tags-complete` 11/11.

## Anonymous production smoke

`BASE_URL=https://www.policywallet.gr npx playwright test --project=public-anon prod-smoke`
→ **2 passed (35.5s)**: every public route renders in Greek with no leaked internals; the
authenticated surfaces redirect rather than error.

`prod-smoke.sh` (curl, no session), 17:33Z:

| Path | HTTP | `<html lang>` | title | leaked internals |
|---|---|---|---|---|
| / | 200 | el | Μάθετε τι πραγματικά καλύπτουν τα συμβόλαιά σας | none |
| /pricing | 200 | el | Τιμές: Δωρεάν, Plus €39, Family €79/χρόνο | none |
| /product/motor | 200 | el | Ασφάλεια αυτοκινήτου: ανάλυση καλύψεων με AI | none |
| /product/health | 200 | el | Ασφάλεια υγείας: τι καλύπτει το συμβόλαιό σας | none |
| /trust | 200 | el | Εμπιστοσύνη και προστασία δεδομένων | none |
| /methodology | 200 | el | Μεθοδολογία — πώς αποφασίζεται ένα εύρημα | none |
| /status | 200 | el | Κατάσταση υπηρεσίας | none |
| /auth/signin | 200 | el | PolicyWallet — Δείτε αν είστε καλυμμένοι | none |
| /dashboard, /wallet, /protection | 307 → `/auth/signin?callbackUrl=…` | | | |
| /docs/compliance/ROPA.md | 307 → signin (proxy.ts sends unknown paths to signin; the record is a repository document, not a route) | | | |

Identical output before the deploy (17:0xZ, production `560a0681`) and after — the public
product is unchanged, which is the expected result for a comments-and-tooling item.

## Sentry (org `policywallet`)

`firstSeen:-2h` at ~17:34Z: **no group first seen after the deploy**. Newest unresolved group
overall is POLICYWALLET-1Y (first seen 3 days ago, `/admin/submissions`). Server traces are 10 %
sampled and the window is minutes long — weak evidence, recorded as such.

## Not run

- **Signed-in production pass:** no policyholder or agent session exists in this machine's browser
  profile and the agent does not enter credentials (`docs/content/BLOCKED.md` BL-C2). The item
  changes no authenticated surface, so nothing signed-in could differ.
- **Database verification:** none applicable — the item ships no migration and writes no row
  (`verify:migrations` green on both the PR and the merged tree; the `@ropa` lines are Prisma
  doc comments and reach no DDL).
- **Lighthouse:** not run — no UI or content change.
