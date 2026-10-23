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
The local production build passed. Exact protected-preview and live evidence are appended after completion.

## Decisions
Retain the agent entry under Products on mobile, where both audiences already
appear together. Retain desktop's direct audience entry. Unrelated draft content,
pricing and legal changes remain outside this release.
