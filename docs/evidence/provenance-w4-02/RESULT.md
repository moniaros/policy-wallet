# PW-PROVENANCE-01 W4-02 — production verification after PR #334 (NEW-UI `7f570f51`)

The DPIA input pack generated from the schema, the published subprocessor list and the AI
provider services (`docs/compliance/DPIA-INPUTS.md`), the rendering moved into
`lib/compliance/ropa-report.ts`, and guard `generated-compliance-docs-current` — the first
thing in CI to fail when either generated compliance document goes stale. The item has
**no runtime surface** (a repository document, a library module the app never imports, a
script and a test), so production verification proves two things: the deploy that carries
it is live, and the public product is unchanged by it. Script in this directory:
`prod-smoke.sh` (anonymous, re-runnable).

## Timeline (UTC, 2026-09-11)

| Step | Evidence |
|---|---|
| PR #334 head `44fb69e6` | CI run 34629987705 **success** 18:02:37Z — Lint & Type Check, Security Scan, Unit Tests, Build, Money Path all green, first attempt |
| Squash merge to NEW-UI | `7f570f51` at 18:03:00Z, via the GitHub connector (draft taken to ready first) |
| CI on NEW-UI, run 34631100771 | **success** 18:12:29Z, 5/5 jobs, first attempt — no flake this time |
| Deploy, run 34631981624 (`workflow_run`) | **success** 18:15:44Z; Vercel deployment `dpl_6kpUFipHcXbjJz58r3C7ELWgAdZ6`, `githubCommitSha` `7f570f51…`, READY 18:15:42Z, aliases `www.policywallet.gr`, `policywallet.gr`, `app.policywallet.gr` |
| Smoke window | 18:16:04Z – 18:17Z |

## Local gate on the PR tree (`44fb69e6`)

audit:api-auth · lint · lint:i18n-changed (SCAN_ALL) · lint:utf8 (3186 files) · lint:encoding ·
type-check · verify:migrations («Database schema is up to date») · `vitest --run tests/unit`
**634/634 files, 7364/7364 tests** · build — all green on the final tree.

Two gate reds on the first pass, both caused by this item and fixed inside it, neither an
exemption: `count-copy-agreement` could not render a pluralised count cell in the report
module (reworded to «7 (stores: 1)»); the Greek copy inventory froze the Greek strings that
moved from `scripts/generate-ropa.ts` into `lib/` (regenerated with `-u` as its header
prescribes, in the same commit).

**The guard, red before green on the real tree:** run before regeneration, 3 of 10 cases
failed (the record's header had changed, the pack did not exist, the probe schema rendered
differently); after `npx tsx scripts/generate-ropa.ts`, 10/10 and `ropa-tags-complete` 11/11.

## Anonymous production smoke

`BASE_URL=https://www.policywallet.gr npx playwright test --project=public-anon prod-smoke`
→ **2 passed (36.0s)**: every public route renders in Greek with no leaked internals; the
authenticated surfaces redirect rather than error.

`prod-smoke.sh` (curl, no session), 18:16:43Z:

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
| /docs/compliance/ROPA.md, /docs/compliance/DPIA-INPUTS.md | 307 → signin (repository documents, not routes) | | | |

Byte-for-byte the same shape as the W4-01 smoke on `568fee72` an hour earlier: the public
product is unchanged, the expected result for an item with no runtime surface.

## Sentry (org `policywallet`)

`firstSeen:-2h` at 18:17Z: **no group first seen after either of today's deploys**
(`568fee72` 17:31Z, `7f570f51` 18:15Z). Server traces are 10 % sampled and the window is
minutes long — weak evidence, recorded as such.

## Not run

- **Signed-in production pass:** no policyholder or agent session exists in this machine's
  browser profile and the agent does not enter credentials (`docs/content/BLOCKED.md`
  BL-C2). The item changes no authenticated surface, so nothing signed-in could differ.
- **Local journey on `npm start` (LOOP.md §5.2):** not applicable — there is no page, route
  or component to exercise; the item's outcome is the generated document and the guard,
  both verified by running them.
- **Database verification:** none applicable — no migration, no row written
  (`verify:migrations` green; the schema file is untouched by this item).
- **Lighthouse:** not run — no UI or content change.
