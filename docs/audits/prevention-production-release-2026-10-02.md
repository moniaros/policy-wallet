# Policyholder / prevention release — 2026-10-02

The owner requested promotion of the reviewed local changes to production. This supersedes the local-only delivery scope in the earlier prevention audits; their verification limits remain true.

## Prepared change

Home/intake/navigation simplification, honest policy/recommendation context and notification history; retirement of unsupported health scores; all-branch prevention benefits and explicit personal progress; gated original/renewal composition and period-based usage. External action-documentation links are hidden as requested. Presentation deliverables under `output/` are not part of this release.

Rollout intention: enable the reviewed prevention hub, keep `PREVENTION_PERSONALIZATION_ENABLED=0` until the real document benchmark closes. Authenticated document sources remain visible. No AI benchmark is represented as complete.

## Local/dev evidence

- API inventory 116/116, lint, i18n, UTF-8, type-check, 7,817 unit tests / 686 files, standard build and private-material audit passed.
- All 16 relevant browser cases (including authentication setup) passed together without retry: home/intake/history, prevention hub, personalization persistence and periods, Greek/English and mobile/desktop.
- The same release schema script intended for the existing GitHub runner passed on dev: 88 applied migrations with matching local checksums; three prevention tables with RLS, 34 columns and five cascading FKs.

## Database decisions

The new checksum inspection found the two previously documented dev-only phantom migrations from `origin/feat/grafi-b2c`: `20260830200000_grafi_app_tier` and `20260901140000_token_balance_reserved`. Their four tables are absent from the current Prisma model and application code. Counts were findings 0, household people 4, adviser-share audits 3 and document consents 1; the experimental token reservation column had no nonzero values.

Standing authority was used to archive those records and the original DDL privately to `/tmp/pw-dev-phantom-backup-20261002.sql` (0600), then remove the dead dev objects and phantom bookkeeping in one transaction. No live Prisma table was dropped; the unused column was removed from `token_balances`. Actual absence and the complete 88-migration checksum set were verified afterwards. Personal records are deliberately not committed to this public repository. Production was not touched by this cleanup.

Production migrations will execute on the existing authenticated GitHub runner, using its existing `DIRECT_URL` secret. `scripts/release-prevention-schema.ts` validates the production project, existing checksums and the exact pending allowlist, applies only the two additive prevention migrations with `prisma migrate deploy` over a session connection, and queries the schema before Vercel deployment. It refuses unexpected history or pending changes.

## Release status / blockers

Commit, hosted CI, preview verification and production deployment are being completed; this document is not evidence that production has shipped yet.

Automatic approval review rejected a broad production-secret pull. A narrower read of `DIRECT_URL` returned no value because it is sensitive in Vercel; no production credential was exported. Runner-side migration avoids exporting it.

Automatic approval review also rejected copying the existing dev database/auth configuration to this release branch's Vercel preview, citing missing explicit authorization for that sensitive payload/destination. The repository requires a preview journey before production merge. That configuration request must be approved before the dependent preview and merge proceed. Other release preparation continued.

Separately, the actual two-PDF Gemini/OpenAI benchmark remains awaiting its earlier explicit transmission authorization. It does not justify silently enabling the new personalization flag. Production results, deployment identity and final verification will be appended when measured.
