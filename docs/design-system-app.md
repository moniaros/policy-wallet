# Grafi - the application tier

2026-08-30, G14. What the app tier adds to the marketing design system
(docs/design-system.md). Pipeline unchanged: tokens/*.json -> npm run tokens
-> app/grafi.css + docs/contrast-matrix.md (build fails a contrast-floor
miss); no token changed after G6, so the committed matrix is current.

## Tokens added for the app (G2)
- Roles: fg-faint, fg-disabled, border-hair (alpha hairline), surface-overlay/surface-blur (+solid fallback), action-danger(-hover), action-secondary-bg; every fg/state role appears in at least one contrast check.
- Purpose radii: rounded-g-control 12 / rounded-g-card 16 / rounded-g-sheet 20 / rounded-g-hero 26 (marketing size-named steps untouched).
- Shadows: shadow-g-raised, shadow-g-overlay (flat = none).
- Motion: duration-g-*, ease-g-out, ease-g-spring; choreographies in app/grafi-app.css (g-screen-enter, g-ring-arc, g-row-press, g-sheet-present, g-tier-reveal); hover only under (hover:hover); reduced motion renders final states.
- Type: text-g-app-{body,body-sm,caption,label}; display text-g-title-lg/title/heading/row; body 17px to 16px at 768 as a token switch, never text-[17px].
- Rhythm: --space-app-section 26 to 32px at 768; breakpoints tablet: 768, desk: 1100; rails 76/248, tab bar 64.
- Fonts: one Inter + Commissioner 600-800 (--font-display) - 116.7 KB, under the 120 KB budget.

## Shells (G3, src/design-system/shell/)
Shell / LargeTitleNav (large title collapsing; back replaces the brand on sub-screens; translucent with solid fallback) / TabBar (5 tabs, safe-area) / SideRail (768-1099) / Sidebar (>=1100) / Fab / CountBadge. One component tree at every width; policyholders only - agent/admin keep the legacy AppShell.

## App components (G4/G5)
Layout: AppSection (section[id] landmarks are what tests/measure counts - ceilings: home <=7, see <=5, policies <=4, detail <=8, adviser <=4, me <=4, updates <=2) / GroupHeader (sentence case - the app renders no uppercase Greek, gate-asserted) / GroupedList/Row (whole-row >=44px targets, hairlines) / Grid.
Product: VerdictCard (counts, never a percentage; quiet variant; text alternative) / ActionRow, TierHeader, KindChip / FindingCard (props ARE RenderableFinding - unconstructable without object+source; three-reason dismiss sheet) / MoneyTriad (container-queried, tabular numerals, honest notes) / CoverageMap (the 16 marketing lines via lib/app/lines.ts; cells wrap, never truncate) / HouseholdStrip / LifeEventChips / CoverageChecklist (every line cites or says the not-stated/not-found words) / QuestionList / ConsentSheet (chips of exactly what is sent, one switch) / Ledger (lines only for what happened) / PlatformNote (the disclosure component; the import-graph guard recognises it) / ExpiryRail.

## Rules the guards enforce
1. Three states only on B2C surfaces; severity never reaches a component.
2. A finding without object + source pointer does not render (toRenderableFinding + Finding.sourceJson NOT NULL).
3. No raw hex/rgb in the app tree (probe-proven); token debt only shrinks; cn() learns new utility families first.
4. All copy in app.* (EL/EN parity, frozen inventory, ICU plurals via formatPlural); advice stems linted across the catalogues AND the notification registry; the proposal word only in app.adviser.*/proposal events.
5. No percent sign beside person-words in any catalogue; no uppercase Greek in sections; 44px targets - all asserted by the rendered gate (tests/grafi-app-screens.spec.ts, five widths x two themes).
6. Skeletons mirror final layouts (loading.tsx per route, same primitives).

## Extending
New screen = a lib/app/*-model.ts loader over loadFindingsContext (never a second composition) + a client screen on the primitives + section[id] landmarks inside a declared ceiling + rows in SURFACES/LEDGER + an entry in the rendered gate ROUTES + copy in app.* + registered data-fact keys. The guards do the remembering.
