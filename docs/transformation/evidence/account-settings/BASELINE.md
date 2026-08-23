# BASELINE — Ρυθμίσεις `/account` + 5 subpages — T-015, PW-MOBILE-TRANSFORM-01

**Date:** 2026-08-23 · **Branch:** NEW-UI · **Surface:** `/account`, `/account/{profile,security,privacy,plan,notifications}` (authenticated policyholder) · **Locale:** `el`
**Harness:** `tests/measure/metrics.ts` + `tests/measure/surface-harness.ts` +
`tests/measure/account-settings-baseline.spec.ts` (paid, 6 routes × 3 widths = 18 captures) +
`tests/measure/account-settings-free.spec.ts` (free, `/account/plan` only — the one subsection with
tier-gated content).
**Run:** `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npx playwright test --project=measure account-settings-baseline` / `--project=measure-free account-settings-free`

`docs/transformation/LEDGER.md`'s own note on this surface: *"§7.5: 'closest to correct in the app —
preserve it. Use it as the density reference.'"* Measured below, this holds structurally (2 sections,
15–32 containers depth 3–4 — well below `/coverage-insights`'s 192 containers) though not perfectly
(see findings).

**`/account` itself is the mobile NAV MENU, not the profile pane** — `AccountPage`'s own comment: on
`lg:hidden` (every width this run measures) it shows `SettingsNav variant="index"`; the profile
content only appears on `/account/profile`. Captured as `index-nav-paid`.

## 0a. Metric table — paid, 18 captures

| route | width | scrollHeight | screens | sections | containers/depth | sub-44 | 1.4.3 | 1.4.11 | truncation | leaks |
|---|---|---|---|---|---|---|---|---|---|---|
| index-nav | 320 | 896 | 1.2 | 2 | 15/3 | 0 | 0 | 2 | 1 | 0 |
| index-nav | 390 | 988 | 1.2 | 2 | 15/3 | 0 | 0 | 2 | 1 | 0 |
| index-nav | 430 | 1076 | 1.2 | 2 | 15/3 | 0 | 0 | 2 | 1 | 0 |
| profile | 320 | 1502 | 2.1 | 2 | 19/4 | 0 | 0 | 6 | 4 | 2 (fixture noise) |
| profile | 390 | 1502 | 1.8 | 2 | 19/4 | 0 | 0 | 5 | 4 | 2 |
| profile | 430 | 1482 | 1.6 | 2 | 19/4 | 0 | 0 | 5 | 4 | 2 |
| security | 320 | 1552 | 2.2 | 2 | 15/3 | 0 | 0 | 5 | 1 | 0 |
| security | 390 | 1434 | 1.7 | 2 | 15/3 | 0 | 0 | 5 | 1 | 0 |
| security | 430 | 1434 | 1.5 | 2 | 15/3 | 0 | 0 | 5 | 1 | 0 |
| privacy | 320 | 1968 | 2.7 | 2 | 17/3 | 0 | 0 | 5 | 1 | 0 |
| privacy | 390 | 1851 | 2.2 | 2 | 17/3 | 0 | 0 | 5 | 1 | 0 |
| privacy | 430 | 1793 | 1.9 | 2 | 17/3 | 0 | 0 | 5 | 1 | 0 |
| plan | 320 | 2509 | 3.5 | 2 | 18/3 | 0 | 0 | 6 | 1 | 0 |
| plan | 390 | 2225 | 2.6 | 2 | 18/3 | 0 | 0 | 6 | 1 | 0 |
| plan | 430 | 2192 | 2.4 | 2 | 18/3 | 0 | 0 | 6 | 1 | 0 |
| notifications | 320 | 2077 | 2.9 | 2 | 32/4 | 1 | 0 | 5 | 8 | 0 |
| notifications | 390 | 1804 | 2.1 | 2 | 32/4 | 1 | 0 | 5 | 8 | 0 |
| notifications | 430 | 1784 | 1.9 | 2 | 32/4 | 1 | 0 | 5 | 8 | 0 |

**Correction on my own earlier claim (`notifications/BASELINE.md`'s N4):** I initially wrote that
`/account/*` has zero `<h1>`, based on grepping only the section components. Wrong — `SettingsShell.tsx`
(the shared layout) supplies it, confirmed by `headingCounts.h1 = 2` on every one of these 18 captures.

## 0b. Confirmed findings

### Two `<h1>` elements exist in the DOM simultaneously — a probe limitation, not a confirmed a11y bug
`headingCounts.h1 = 2` everywhere. Read at source: `SettingsShell.tsx:51` (mobile header, `lg:hidden`)
and `:62` (desktop header, `hidden lg:block`) are BOTH always in the DOM; Tailwind's `hidden` is
`display:none`, which removes an element from the accessibility tree — so a screen reader at any one
viewport sees exactly one. **`headingCounts` (added mid-run, `surface-harness.ts`) does not filter by
visibility the way `sectionCount`/`smallTapTargets`/etc. do — this is a probe gap, not a confirmed
double-heading defect**, recorded so nobody "fixes" a violation that visibility already prevents.

### Notification-preference rows overflow their row by a consistent, small margin
Every one of the 5 preference rows on `/account/notifications` (`div.flex.min-h-11`) measures
`scrollWidth 260 / clientWidth 254` — a steady 6px overflow at 320px, present at every width tested.
Small, but 100% reproducible across all 5 rows and all 3 widths.

### The «Ξεκλείδ» sub-44px offender
1 sub-44 target on `/account/notifications` at every width — not yet isolated to a specific element
in this pass (raw JSON has the record; not traced to source in this document).

## FREE tier — `/account/plan` only

The other four subsections (profile/security/privacy/notifications) are account-identity screens
with no tier-gated content — capturing them again on the free account would duplicate, not add,
coverage. `/account/plan` is the one subsection where tier changes what renders (current plan,
upgrade CTA, usage limits).

| tier | width | scrollHeight | sections | containers/depth | sub-44 | 1.4.11 | truncation | leaks |
|---|---|---|---|---|---|---|---|---|
| free | 320 | 2105 | 2 | 15/3 | 0 | 7 | 1 | 0 |
| free | 390 | 2041 | 2 | 15/3 | 0 | 5 | 1 | 0 |
| free | 430 | 1927 | 2 | 15/3 | 0 | 5 | 1 | 0 |

Free (2105px, 15 containers) is slightly shorter than paid (2509px, 18 containers) at 320px —
consistent with a paid-tier plan card carrying more content (usage detail, cancel/manage options)
than the free tier's upgrade-focused view. Not decomposed further in this pass.

## Cross-reference: known gaps this baseline did not re-verify but which apply here
- `docs/transformation/evidence/CANDIDATE-VERIFICATION.md` §4.4.6: the notification-preferences
  toggle on `/account/notifications` governs `channel: "email"` ONLY while `push` is an implemented
  channel — a customer who turns a group off believes both channels are off. Not re-confirmed by this
  measurement pass (it is a behavioural/data claim, not a DOM-visible one), cited for completeness.
- No user-configurable monthly ceiling or global notification off-switch exists on this surface
  (LEDGER rows R-09/R-10) — confirmed absent by reading the captured `fullText`, no matching control
  found on `/account/notifications`.
