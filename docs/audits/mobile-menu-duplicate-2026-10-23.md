# Mobile public-menu duplicate — 23 October 2026

## Observed UI defect (not a security or launch gate)
The expanded Products group and the desktop navigation list both exposed the
agent destination inside the mobile dialog. The owner reported both entries
on `/solutions/agents` at 600 × 695.

## Change
Skip the desktop-only duplicate when mapping the mobile navigation. Keep the
existing localized link inside Products, its navigation/close handler, and the
desktop direct link. One component changes; no copy, API, schema, catalogue or
permissions change. Created an isolated branch from production because the
primary checkout contains unpublished PW-CONTENT-02 work.

## Verification
Node 24. API inventory 116/116, lint, changed-string i18n, UTF-8, type-check,
dev migration verification (88 applied, none pending), and 700 unit files /
7,874 tests passed. Ten local browser cases passed in Greek and English at
320/390/430/600/1280px: one agent destination in each navigation, all five mobile
navigation destinations retained, Escape restores focus, selecting the agent
link closes the menu, no horizontal overflow or page JavaScript errors.
The initial temporary probe clicked before hydration and queried a hidden dialog
through an accessibility-only locator; the probe was corrected, not product code.
The local production build passed. Protected preview
`dpl_8r8VvVpou5oNBucrwvNREZ8DaxaF` at
https://policy-wallet-1zsctfeka-moniaros-projects.vercel.app used development-only
database overrides and passed the same ten journeys. Temporary platform access
cookies were deleted after testing; deployment protection stayed enabled.

[PR #411](https://github.com/moniaros/policy-wallet/pull/411) merged as
`915790188185ea32908f6b7efa744b57cfc98aec`. Its tree is identical to preview commit
`81bec3f043c7990539f235b11994fd94a3ce3aaf` (empty git diff).
Merged CI [39981645626](https://github.com/moniaros/policy-wallet/actions/runs/39981645626)
succeeded. Kilo's external review was unavailable because the account lacks credits;
that is not counted as a completed review. The payment journey's CI label is not
claimed as evidence of a payment transaction. Production deployment
[39983054320](https://github.com/moniaros/policy-wallet/actions/runs/39983054320)
succeeded. `dpl_HKWEuSk7XJyDE33p7sRUF3fxqsQU` is READY and serves
https://www.policywallet.gr. Its schema preflight confirmed 88 applied migrations,
none pending, three prevention tables with RLS, 34 columns and five cascade foreign
keys; this release required no database mutation.

The same ten public-menu journeys passed on production. The user's existing embedded
browser tab was reloaded and left with the corrected menu open: one agent link under
Products. Browser outcome records and a live screenshot are in
`docs/evidence/mobile-menu-2026-10-23/`. There is no remaining blocker for this fix.

## Decisions
Retain the agent entry under Products on mobile, where both audiences already
appear together. Retain desktop's direct audience entry. Unrelated draft content,
pricing and legal changes remain outside this release.
