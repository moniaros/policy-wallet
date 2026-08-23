# CHROME-AUDIT — the global B2C app shell

**Scope:** `components/shell/AppShell.tsx` and everything it mounts directly (`MainNav`,
`UserMenu`, `RoleSwitcher`, `ThemeToggle`, `LocaleToggle`, `InstallPrompt`), plus
`app/(protected)/layout.tsx` and the shell-relevant tokens in `app/globals.css`. Method:
code reading only, reasoned at 320/390/430px. No product code touched; nothing under
`tests/measure/` read or written.

**Why this is one document, not seven:** every authenticated B2C page mounts through
`app/(protected)/layout.tsx` → `AppShell`. A defect in this file (or in something it
unconditionally renders) reproduces on every page underneath it — that is a property of
the render tree, not a coincidence across pages.

---

## 0. Headline verdicts

- **Bottom-nav occlusion: NOT occurring.** The content reservation and the bar's own
  footprint are driven by the *same* CSS variable, both scaled by
  `env(safe-area-inset-bottom)`. See §2.
- **The reported "floating «Ν» avatar clipped at the left edge": REFUTED as a shell
  defect.** No avatar exists in the render tree at 320–430px at all — the only initials
  avatar in the shell is `display:none` below `lg`. See §3.
- Two **new, previously-uncatalogued** fixed-position defects were found in the course of
  this audit (not in the original brief): `InstallPrompt`'s missing safe-area
  compensation, and a stacking-order gap that leaves the bottom tab bar undimmed while
  the mobile nav drawer is open. See §2.4–2.5.
- The "AI Insights in English in the tab bar" claim is **REFUTED** — confirmed stale.
  See §5.

---

## 1. Every element the shell renders, and its position

| Element | File:line | Position | z-index | Renders when |
|---|---|---|---|---|
| Skip link | `AppShell.tsx:199-204` | `fixed` only on `:focus` (else `sr-only`, out of flow) | `z-[60]` on focus | always mounted |
| Mobile top header | `AppShell.tsx:207` | `sticky top-0` | `z-40` | `lg:hidden` — <1024px only |
| — hamburger button | `AppShell.tsx:208-219` | in-flow | — | inside header |
| — logo link | `AppShell.tsx:221-227` | in-flow | — | inside header |
| — notification bell | `AppShell.tsx:234-248` | in-flow | — | inside header |
| Sidebar / drawer `<aside>` | `AppShell.tsx:258-269` | `fixed top-0 left-0`, full height | `z-50` | always mounted; `-translate-x-full` below `lg` unless `sidebarOpen`, `lg:translate-x-0` always at `lg`+ |
| — `UserMenu` (avatar) | `AppShell.tsx:347-353` → `UserMenu.tsx:99-101` | in-flow, inside the fixed aside | — | **`hidden lg:block` — never mounted below 1024px** |
| — mobile footer (lang/theme/logout) | `AppShell.tsx:317-344` | in-flow | — | `lg:hidden` |
| — `RoleSwitcher` | `AppShell.tsx:293-301` | trigger in-flow; its own dropdown is `absolute` | `z-20` (dropdown) | only if `hasMultipleRoles` |
| Mobile sidebar overlay/scrim | `AppShell.tsx:358-363` | `fixed inset-0` | `z-40` | `lg:hidden`, only while `sidebarOpen` |
| `<main>` content | `AppShell.tsx:369` | static, in normal flow | — | always |
| Bottom tab bar `<nav>` | `AppShell.tsx:378-444` | `fixed bottom-0 left-0 right-0` | `z-40` | `lg:hidden`, only when `hasBottomNav` (policyholder/agent; **not admin**) |
| `InstallPrompt` (PWA banner) | `components/pwa/InstallPrompt.tsx:128` | `fixed bottom-24 left-3 right-3` (`sm:` repositions to bottom-right) | `z-40` | mounted by `AppShell.tsx:446` as a **sibling after** the shell's wrapping `<div>`; conditional on route + JS install-prompt state |
| Root `Toaster` (sonner) | `app/layout.tsx:141` | library-managed, `position="top-right"` | library default (very high) | root layout, not `AppShell` — noted for completeness, not further audited |

**Stacking context check:** none of `header`, `aside`, the overlay, `<main>`, the bottom
nav, or the wrapping `<div className="min-h-screen pw-app-canvas …">` (`AppShell.tsx:195`)
apply `transform`, `filter`, `opacity<1`, or `will-change` at the container level — only
`backdrop-blur-*`, which creates a stacking context for an element's *own* children, not
for how that element competes with its *siblings*. `TranslationsProvider` and
`PlanFactsProvider` render no wrapping DOM (context providers only — confirmed by
reading both files). **Consequence: every `fixed` element above shares one stacking
context (the viewport), so z-index ties are broken purely by DOM/paint order.** That is
what makes §2.4 and §2.5 below *provable from source*, not just plausible.

---

## 2. Occlusion

### 2.1 Bottom tab bar vs. content — CONFIRMED, not occluding

- The bar: `min-h-[76px]` (`AppShell.tsx:384`) plus its own `safe-area-inset-bottom`
  class (`AppShell.tsx:381`), which resolves to `padding-bottom: env(safe-area-inset-bottom)`
  (`globals.css:346-348`).
- The content reservation: `<main>` gets `pw-bottom-nav-reserve` whenever `hasBottomNav`
  (`AppShell.tsx:369`), which is `padding-bottom: calc(var(--pw-bottom-nav-h) + env(safe-area-inset-bottom, 0px))`
  (`globals.css:493-495`), where `--pw-bottom-nav-h: 5rem` (80px) (`globals.css:490`).
- Both sides add the *identical* `env(safe-area-inset-bottom)` term, and the reservation's
  base (80px) exceeds the bar's own base (76px) by 4px. They cannot drift apart from each
  other by construction — one variable, two consumers, per the comment at
  `globals.css:474-488`.
- **On a full-page screenshot tool that does not disable `position: fixed` before
  stitching, a bar like this WILL appear to paint at its literal viewport offset in every
  captured tile** — that is a capture-tool artifact, not evidence of occlusion. The
  occlusion question is answered by the CSS above, not by what a stitched screenshot
  shows. **Verdict: content is not hidden behind the bar.** This matches
  `docs/evidence/dashboard-mobile/BASELINE.md:106-111`, which records the safe-area fix
  as already applied on the measured tree and flags production as carrying the old
  occlusion only until that commit deploys.

### 2.2 Mobile header vs. content — CONFIRMED, not occluding

The header is `sticky top-0` (`AppShell.tsx:207`), not `fixed` — it participates in
document flow and reserves its own 64px (`h-16`) ahead of the content that follows it.
Nothing needs to compensate for a sticky element the way it must for a `fixed` one.

### 2.3 Consent banner interaction — CONFIRMED, already handled

`globals.css:889-949` documents a real, previously-measured occlusion (the cookie-consent
banner made the wallet's add-policy button and the entire bottom nav unreachable) and its
fix: `.pw-above-consent` (`AppShell.tsx:381`) and a shared `--pw-bottom-obstruction`
variable the banner publishes into. Out of this audit's direct scope (the banner is not
part of `AppShell`) but relevant because it sits in the same stacking neighborhood as the
bottom nav; the fix is real and already applied to the nav's class list.

### 2.4 NEW — `InstallPrompt` overlaps the bottom nav on notched devices (CONFIRMED)

`InstallPrompt.tsx:128`: `fixed bottom-24 left-3 right-3 z-40` — a **static** 96px offset
(`bottom-24` = 6rem) with **no `env(safe-area-inset-bottom)` term**, unlike every other
bottom-anchored shell element.

- Bar's real footprint on a device with the standard 34px iOS home-indicator inset:
  76px (content) + 34px (safe area) = **110px** from the viewport's bottom edge.
- `InstallPrompt`'s bottom edge sits at a fixed **96px**.
- 110 − 96 = **14px of unconditional geometric overlap** into the top of the bar's
  footprint on any device with a non-zero safe-area inset — which is every iPhone since
  the X, i.e. the majority of the installed base this PWA prompt targets.
- Both `InstallPrompt` (mounted as a *later* sibling, `AppShell.tsx:446`) and the bottom
  nav (`AppShell.tsx:381`) share `z-40` in one stacking context (§1). DOM/paint order
  ties are broken by document order, and `InstallPrompt` is later — **it paints on top of
  the bottom nav** wherever they intersect.
- The prompt is reachable on `/dashboard`, `/notifications`, `/account`, and `/agent` —
  it is excluded only on `/wallet`, `/coverage-insights`, `/auth*`, `/onboarding*`, and
  `/wallet/add` (`InstallPrompt.tsx:14-23`). That is exactly the route set the original
  brief names ("dashboard, notifications, settings and adviser screens").
- **Its own dismiss control is a second, independent finding** — see §4.

**NEEDS CAPTURE:** the exact pixel intersection with the bar's *visible glyphs* (icons +
labels) versus its inert bottom padding — the 14px figure is a lower bound computed from
class values; real font-metric rendering could push it slightly either way.

### 2.5 NEW — the mobile drawer's scrim does not out-rank the bottom nav (CONFIRMED)

The drawer overlay/scrim is `fixed inset-0 z-40` (`AppShell.tsx:360`) and is meant to
convey "everything under here is inert" for a `role="dialog" aria-modal="true"` surface
(`AppShell.tsx:262`). But it shares `z-40` with **both** the header (`AppShell.tsx:207`)
**and** the bottom nav (`AppShell.tsx:381`), and DOM order decides:

- Header (`207`) comes **before** the scrim (`360`) → scrim paints on top → **the header
  is correctly dimmed** while the drawer is open.
- Bottom nav (`381`) comes **after** the scrim (`360`) → bottom nav paints on top → **the
  bottom nav stays fully lit and visually undimmed** while the drawer is open, and
  nothing (`pointer-events-none`, `inert`, `aria-hidden`) prevents a mouse/touch user from
  tapping it.
- `useDialog` (`hooks/useDialog.ts:37-86`) traps **keyboard** focus correctly inside the
  drawer (Tab/Shift+Tab cycle, Escape, focus return) — this is a pointer/visual-only gap,
  not a keyboard-accessibility one.

Net effect: opening the drawer dims the header but leaves a fully bright, fully
interactive strip of navigation floating on top of the dimmed page — an inconsistent
"half-modal" that reads as unintentional. Tapping a tab does still work correctly (it
navigates and the drawer state is discarded with the page), so the functional harm is
low, but the visual/semantic inconsistency is real and code-provable.

**NEEDS CAPTURE:** how objectionable this reads to a real user — the ordering is provable
from source; its perceptibility is not.

---

## 3. The floating avatar — REFUTED as a shell defect

**Claim under test:** "a floating «Ν» avatar clipped at the left edge and overlapping
content on the dashboard, notifications, settings and adviser screens."

**Finding: no such element can exist in the DOM at 320–430px.**

The only initials avatar the shell renders anywhere is `UserMenu`'s desktop trigger
(`UserMenu.tsx:99-101`: a `w-10 h-10 rounded-full bg-primary … {initials}` div, where
`initials` is computed at `UserMenu.tsx:66-71` — a single-word name like «Νίκος» yields
exactly one Greek capital letter, «Ν», matching the brief's description letter-for-letter).
That component is mounted **once**, at `AppShell.tsx:347-353`, wrapped in
`<div className="hidden lg:block …">`. `hidden` is Tailwind's `display: none` — not an
opacity, transform, or off-canvas translate. Below the `lg` breakpoint (1024px) this
subtree is not merely invisible, it is **not in the render tree at all**: it has no box,
so it cannot be "clipped" or "overlapping" anything. The mobile drawer's own footer
(`AppShell.tsx:317-344`, `lg:hidden`) renders language/theme/logout controls instead —
no avatar. The mobile top header (`AppShell.tsx:207-249`) renders hamburger, logo, and
bell — no avatar either. **There is no code path that puts an initials avatar on screen
below 1024px, open drawer or closed.**

Two independent pieces of prior evidence explain where the sighting likely came from,
and this audit's job is to surface both rather than pick one:

1. **`docs/evidence/dashboard-mobile/BASELINE.md:106-111`** already investigated this
   exact claim for the dashboard specifically and recorded: *"DOES NOT REPRODUCE. No
   absolutely-positioned element exists anywhere in `components/dashboard/home/*`… The
   observed overlap is the app shell's own fixed header/avatar painting over content in
   a full-page screenshot — the same capture artifact catalogued as policy-detail B4."*
   That is: a **full-page screenshot tool that does not neutralize `position: fixed`/
   `sticky` before stitching** will paint a sticky/fixed element at its literal viewport
   offset on every captured segment — visually indistinguishable from a genuinely
   misplaced element unless you already know the capture method.
2. **Commit `fbe845ed` ("fix(shell): scale the sidebar, give the mobile header a real
   action, un-clip actions")** — the commit that most recently rewrote this exact header
   — explicitly records: *"Also checked and deliberately NOT 'fixed': the dark circle
   overlapping the bottom nav in dev screenshots is Next.js's own dev-tools badge
   (NEXTJS-PORTAL), not app chrome."* Next.js's dev-mode indicator renders a circular
   badge (its "N" logomark) fixed near a screen corner in every `next dev` session,
   independent of route — which would explain the claim appearing identically on
   dashboard, notifications, settings, *and* adviser screens (it is not a page-specific
   render; it is a browser-level dev overlay). It does not exist in a production build.

**NEEDS CAPTURE:** which of these two (or some third capture-tool artifact) actually
produced the original screenshot cannot be settled from source alone — only a real
capture of the environment that produced the original claim would confirm it. What
*is* settled from source: it is not a shell-rendered avatar, because no such avatar
exists in the tree at that viewport width.

---

## 4. Tap targets in the shell

| Control | File:line | Computed size | Verdict |
|---|---|---|---|
| Hamburger (menu toggle) | `AppShell.tsx:208-219` (`h-11 w-11`) | 44×44 | **PASS** |
| Notification bell | `AppShell.tsx:234-248` (`h-11 w-11`) | 44×44 | **PASS** |
| Mobile top-header logo link | `AppShell.tsx:221-227` (`h-11` wrapper around a `h-10` logo) | 44 tall | **PASS** |
| 5× bottom-nav tabs | `AppShell.tsx:383-385,413` — `min-h-[44px]` in a 5-col grid, `px-2 py-2`, `gap-1.5` | at 320px: (320−16−24)/5 = **56px** wide × ≥44 tall (row stretches to ~60px) | **PASS**, even at the narrowest width |
| Skip link | `AppShell.tsx:199-204` | keyboard-only; not evaluated as a pointer target | N/A |
| **Drawer close (X)** | `AppShell.tsx:278-282` — `p-2` + `w-5 h-5` icon | 8+20+8 = **36×36** | **FAIL** — under 44px floor |
| **Drawer/sidebar logo link** | `AppShell.tsx:275-277` (no size wrapper) → `Logo.tsx:25` (`md` = `h-10`) | **40 tall** | **FAIL** — contrast with the top-header logo link, which explicitly compensates to 44 |
| **Mobile-footer logout button** | `AppShell.tsx:335-343` — `py-2.5` + `text-sm`/`w-5 h-5` content | ≈**40 tall** (full width) | **FAIL** |
| **Mobile-footer `LocaleToggle` ("group")** | `LocaleToggle.tsx:96-110` — `px-2.5 py-1.5 text-xs`, no `min-h` | ≈**30×40** | **FAIL** — the sibling `"plain"` variant (`LocaleToggle.tsx:114-133`) was explicitly given `min-h-11` with a comment explaining why; `"group"` (the one the shell actually uses) never got the same fix |
| **Mobile-footer `ThemeToggle`** | `ThemeToggle.tsx:22-26` — `p-2` + `w-5 h-5` icon | 8+20+8 = **36×36** | **FAIL** |
| **`InstallPrompt` dismiss (×)** | `InstallPrompt.tsx:138-144` — no padding/size classes at all | **16×16** (bare icon) | **FAIL**, by a wide margin |

7 of 12 audited controls are under the 44px floor. All seven live in the mobile drawer
footer or the globally-mounted `InstallPrompt` — i.e., controls that only appear once a
user has already taken an action (opened the drawer, or not yet dismissed the install
banner) rather than the always-visible top-level chrome (header, bottom-nav tabs), which
is uniformly compliant.

---

## 5. Labels

Traced every user-visible string the shell renders to its source key and `el` value:

| Rendered by | Key | `el.ts` / `role-copy.ts` value |
|---|---|---|
| Skip link | `t.nav.skipToContent` | «Μετάβαση στο περιεχόμενο» (`el.ts:128`) |
| Hamburger `aria-label`, aside `aria-label`, `MainNav` landmark | `t.nav.primaryNavigation` | «Κύρια πλοήγηση» (`el.ts:129`) |
| Bell `aria-label` | `t.nav.notifications` | «Ειδοποιήσεις» (`el.ts:101`) |
| Drawer close `aria-label` | `roleCopy.shell.closeMenu` | «Κλείσιμο μενού» (`role-copy.ts:222`) |
| Bottom-nav landmark | `t.nav.bottomNavigation` | «Γρήγορη πλοήγηση» (`el.ts:130`) |
| Bottom-nav (policyholder) "home" | `t.nav.home` | «Αρχική» (`el.ts:90`) |
| Bottom-nav (policyholder) "wallet" | `t.nav.wallet` | «Πορτοφόλι» (`el.ts:91`) |
| Bottom-nav (policyholder) "coverage-insights" | **`t.nav.insightsShort`** | **«Αναλύσεις»** (`el.ts:99`) |
| Bottom-nav (policyholder) "/agent" | `t.nav.agentShort` | «Σύμβουλος» (`el.ts:93`) |
| Bottom-nav (policyholder) "/account" | `t.userMenu.settings` | «Ρυθμίσεις» (`el.ts:1579`) |
| Bottom-nav (agent) "dashboard" | `t.nav.dashboard` | «Πίνακας ελέγχου» (`el.ts:103`) |
| Bottom-nav (agent) "customers" | `t.nav.customers` | «Πελάτες» (`el.ts:104`) |
| Bottom-nav (agent) "opportunities" | `t.nav.opportunities` | «Ευκαιρίες» (`el.ts:106`) |
| Bottom-nav (agent) "insights" | `t.nav.insights` | «Πληροφορίες» (`el.ts:111`) |
| Bottom-nav (agent) "more"/drawer trigger | `t.common.actions` | «Ενέργειες» (`el.ts:27`) |
| Mobile-footer language `aria-label` | `t.userMenu.language` | «Γλώσσα» (`el.ts:1580`) |
| Mobile-footer logout | `t.userMenu.logout` | «Αποσύνδεση» (`el.ts:1584`) |
| Help link | `t.common.needHelp` | «Χρειάζεστε βοήθεια;» (`el.ts:36`) |
| Role-switch failure toast | `t.errors.somethingWentWrong` | «Κάτι πήγε στραβά» (`el.ts:1801`) |
| Role-switch success toast | `roleCopy.shell.roleViewingAs(label)` | `` `Προβολή ως ${roleLabel}` `` (`role-copy.ts:224`) |

**Every string traced resolves to the `el` bundle. Zero hardcoded shell strings found**
except the two items below, neither of which is a mistranslation:

### REFUTED — "AI Insights in English in the tab bar"

`t.nav.insightsShort` = «Αναλύσεις» (`el.ts:99`) — Greek, confirmed. `t.nav.agentShort` =
«Σύμβουλος» (`el.ts:93`) — also Greek. **The entire bottom tab bar, for both roles that
have one, is Greek-only.** No English string appears anywhere in it. This claim is stale.

### CONFIRMED — stale code comment (not a live bug)

`AppShell.tsx:59-61` documents the mobile locale toggle: *"'GR'/'EN' are locale codes
shown verbatim…"* — but `LocaleToggle.tsx:28` (`LOCALE_OPTIONS`) has rendered «ΕΛ»/"EN"
since a separate, already-shipped fix; that file's own comment
(`LocaleToggle.tsx:23-24`) explains *why* "GR" was wrong ("that is the country code for
Greece"). The **rendered UI is correct**; only the comment describing it in `AppShell.tsx`
is stale documentation, worth correcting so a future reader isn't misled.

### CONFIRMED — `ThemeToggle` bypasses the shared bundle

`ThemeToggle.tsx:10,25` builds its own `aria-label` from an inline
`t = (el, en) => language === 'el' ? el : en` helper with literal strings
(`"Εναλλαγή θέματος"` / `"Toggle theme"`), instead of `useLanguage().t`. Both strings are
correct, so this is not a mistranslation — but it duplicates the translation mechanism
this codebase otherwise centralizes in `el.ts`/`en.ts`, which is exactly the pattern
CLAUDE.md's i18n rule calls out ("`el ? '…' : '…'` ternaries" belong in translation keys).

### Dead code, found in passing

`NotificationBell` is imported by `UserMenu.tsx:7` and only rendered inside `UserMenu`'s
`compact` branch (`UserMenu.tsx:73-86`). The shell's one call site,
`AppShell.tsx:348-352`, never passes `compact` — that branch, and the `NotificationBell`
inside it, never executes. The header's inline `<Bell>` icon (`AppShell.tsx:242`) is the
only notification bell that ever renders in the shell.

---

## 6. Navigation model — CONFIRMED, exactly one system per breakpoint

A single breakpoint token (`lg`, 1024px) governs all three surfaces, consistently:

- Mobile header: `lg:hidden` (`AppShell.tsx:207`)
- Bottom tab bar: `lg:hidden` (`AppShell.tsx:379`)
- Sidebar mode: off-canvas (`-translate-x-full`) below `lg`, static (`lg:translate-x-0`)
  at `lg`+ (`AppShell.tsx:267-268`)

No other breakpoint (`md`, `xl` as a *gate*, etc.) is used to control which nav renders —
`xl` only widens the already-static desktop sidebar (`xl:w-72`), it never toggles
visibility. There is no window where both a bottom bar and a static sidebar are visible,
and none (for policyholder/agent) where neither is. The one intentional exception is
**admin**, which has zero bottom-nav items by design (`getBottomNavItems` returns `[]`
for any role other than `policyholder`/`agent`) — `hasBottomNav` then gates the `<nav>`
out entirely (`AppShell.tsx:378`) rather than rendering an empty landmark, per the
comment at `AppShell.tsx:375-377`.

---

## 7. Contrast — computed from `app/globals.css` tokens, not measured

All ratios below are calculated from the hex/opacity values in the stylesheet using the
standard WCAG relative-luminance formula. They are **not** browser-measured; treat them
as a first pass that should be spot-checked with a real renderer where marked.

| Pair | Where used | Computed ratio | SC | Verdict |
|---|---|---|---|---|
| `text-black/60` on white | Hamburger, bell icons (`AppShell.tsx:215,240`) | ≈5.74:1 | 1.4.3 | **PASS** |
| `dark:text-white/70` on near-black | Same, dark mode | ≈10:1 | 1.4.3 | **PASS** |
| `--muted-foreground` `#5b6a7a` on white | Inactive bottom-nav labels | ≈5.54:1 | 1.4.3 | **PASS** (matches the file's own documented figure at `globals.css:180-183` exactly) |
| `text-primary` `#29685B` on white/`bg-primary/15` | Active bottom-nav tab | ≈6.5:1 | 1.4.3 | **PASS** |
| `dark:text-white/65` on near-black | Sidebar nav item text (`MainNav.tsx:39`) | ≈8.6:1 | 1.4.3 | **PASS** |
| `text-black/55` on white | Help link (`MainNav.tsx:143`) | ≈**4.74:1** | 1.4.3 | **PASS, but marginal** — 0.24 above the 4.5:1 floor; worth a real measurement, not just token arithmetic |
| `border-black/10` / `dark:border-white/10` | Header bottom border, sidebar edge, bottom-nav top border (`AppShell.tsx:207,265,381`) | ≈1.2–1.25:1 | 1.4.11 | **Likely exempt, not counted as a fail** — these are decorative structural dividers, not the boundary of an interactive component. The codebase already distinguishes this case explicitly: `--pw-border-control` (`rgba(0,0,0,.45)`, ≈3.35:1, `globals.css:135-146`) exists specifically for boundaries that DO need 3:1, and the shell's own chrome dividers are not built from it — consistent with treating them as non-components under 1.4.11's scope. |

**NEEDS CAPTURE:** the marginal Help-link figure (4.74:1) and any subpixel/anti-aliasing
effects a real renderer would introduce — token arithmetic is a lower-fidelity substitute
for a measured contrast check.

---

## 8. Summary

**CONFIRMED findings: 18** (each cites the code that causes or disproves it):

1. Bottom-nav content reservation matches the bar's real footprint, including safe-area — not occluding.
2. Mobile header is `sticky`, not `fixed` — no compensation needed, none missing.
3. Consent-banner/bottom-nav interaction already has a dedicated, shared-variable fix.
4. **`InstallPrompt` (`InstallPrompt.tsx:128`) has no safe-area compensation and geometrically overlaps the bottom nav on notched devices** — new finding.
5. **The mobile drawer's scrim does not out-rank the bottom nav in stacking order, so the bar stays undimmed/clickable while a modal drawer is open** — new finding.
6. The reported floating avatar cannot exist in the DOM below 1024px (`display:none`, not an offset).
7. Prior evidence (`BASELINE.md:106-111`) already found this exact dashboard claim "DOES NOT REPRODUCE" and attributed it to a screenshot-capture artifact.
8. Prior commit `fbe845ed` identified a Next.js DevTools badge as a plausible, dev-only source of a similarly-shaped claim.
9–15. Seven tap targets under 44px, all cited with file/line (§4).
16. The tab-bar-English claim is refuted — both short labels are Greek.
17. A stale code comment ("GR"/"EN") describes locale-toggle behavior the UI no longer has.
18. `ThemeToggle` bypasses the shared translation bundle with an inline literal-pair helper (not a mistranslation, an architectural inconsistency); `NotificationBell` is dead code in the shell.

**NEEDS CAPTURE: 4** — none of these can be settled by reading source:

1. Which artifact (DevTools badge vs. screenshot-stitching) actually produced the original avatar sighting.
2. The exact pixel intersection of `InstallPrompt` with the bottom nav's visible glyphs vs. its inert padding.
3. How perceptible/objectionable the drawer-scrim stacking gap is to a real user.
4. Real-rendered confirmation of the marginal 4.74:1 Help-link contrast figure.

**Bottom-inset verdict: content is NOT genuinely occluded by the bottom bar.** Decided by
`globals.css:474-495` (`--pw-bottom-nav-h: 5rem` + `env(safe-area-inset-bottom)`, one
variable feeding both the bar's own padding and `<main>`'s reservation) together with
`AppShell.tsx:369,381,384`. A full-page screenshot of this tree will still show the bar
painted at a fixed viewport offset in every stitched segment — that is the capture
mechanism, not evidence against this verdict.

**Refuted:** the tab-bar-English claim (§5), and the floating-avatar claim as a *shell*
defect (§3) — though its likely real-world source (Next.js DevTools badge, or a
screenshot-capture artifact of a sticky/fixed element) is named, not eliminated.
