# Marketing production release — 2026-09-20

The owner requested GitHub push and Vercel production deployment after the local marketing work was completed.

## Code and deployment

- Branch: `NEW-UI` (the repository's configured production line).
- Code commit: `c92a3db1c13b3af9905b53c74a35849dbfbac89f`.
- Preserved and integrated upstream `d0feaf34` before committing; no overwritten content work or force push.
- [GitHub CI: success](https://github.com/moniaros/policy-wallet/actions/runs/35534629341).
- [Production deploy: success](https://github.com/moniaros/policy-wallet/actions/runs/35535242220), completed 2026-09-20 20:23:56 UTC.
- Vercel deployment: `dpl_eH9BmapERqGEqLhwpn3v39QoDSdo`, target production, status **Ready**.
- Deployment URL: https://policy-wallet-dsuimrg1k-moniaros-projects.vercel.app
- Verified aliases include `www.policywallet.gr`, `policywallet.gr`, and `app.policywallet.gr`.

## Verification

Local Node 20.20.2: 7,563 unit tests across 654 files passed; production build, API auth audit (106 routes), ESLint, changed-file i18n, UTF-8, type-check and staged private-material audit passed. All five private-material probe tests passed. Migration verification reported 76 migrations aligned; no database mutations or migrations were introduced.

Full-suite release fixes: update trust/ENFIA text expectations to reviewed copy, refresh Greek string inventory, register 28 reviewed additions and 13 documented plain-language length exceptions, and wait for the translation-cache test's own asynchronous write before the next test. Runtime translation behavior and content guard logic remain unchanged. The pointer enhancement gracefully skips unsupported browser motion APIs.

GitHub's lint/type/catalogue, unit-test and build jobs passed. The security job succeeded under its existing nonblocking dependency-audit configuration; this is not a claim of zero dependency advisories. The paid-conversion E2E job skipped its journey because its credential gate was not met.

Production browser checks on `/`, `/en`, `/guides`, `/en/guides`, `/product`, `/en/product`, `/pricing`, `/en/pricing`: all rendered correct locale, one H1 and no horizontal overflow at the browser's 672px viewport. Greek and English preview/walkthrough selections changed their pressed state; guide search returned two ENFIA matches in both languages, zero for a nonmatching query, and reset cleared the input. The optimized editorial image loaded successfully from the deployed Next image endpoint. Pricing switched audiences and annual billing in both languages. Paid checkout retained its existing paused message. The homepage preserved the upstream paused-registration message and needs-check CTA. No account, message or payment was submitted.

Earlier full responsive/content verification remains in [interactive UI audit](interactive-marketing-2026-09-20.md) and [plain-language audit](plain-language-2026-09-20.md).

## Launch blockers versus UX follow-up

No blocker to this deployment was found. Existing registration and paid-checkout pauses are operational settings preserved by this release, not enabled by it. No payment completion claim is made.

UX follow-up: comprehension testing and conversion measurement remain useful; neither was represented as a launch gate. No claims of measured conversion improvement or formal age-level readability validation.

## Decisions taken

Used the existing CI-gated deployment workflow, preserving the exact tested SHA. Kept upstream registration/security changes and all earlier content work. This subsequent evidence-only documentation update does not change deployed application code.
