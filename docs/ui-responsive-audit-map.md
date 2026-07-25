# PolicyWallet — UI / UX / Responsiveness / Architecture Audit Map

**Date:** 2026-07-23 · **Scope:** full codebase (app shell, routing, design system, B2C, B2B/agent, admin, forms, modals, states, performance, trust UX, architecture) · **Type:** mapping & planning — no code changed in this pass.

---

## 0. Status reconciliation (added 2026-07-23, after implementation)

> This map was authored off `NEW-UI` **before** the UI-foundation batches landed on `claude/ui-foundation-audit-gtm05i`. Read this section first — a number of rows below are already fixed, and **two are factually wrong**. The findings text is left intact for traceability; this section is the current truth.

### Resolved

| Finding (row below) | Resolved by |
|---|---|
| `globals.css` stale `design-tokens.ts` pointer; `--secondary` mislabelled "Amber"; MASTER.md stale | `1f2a630` (also corrected MASTER's fabricated `--space-*` table and its shadow spec — `.pw-card` is flat/border-first, and `--pw-shadow-card` is referenced by nothing) |
| `Modal.tsx` dead backdrop classes + no mobile gutter | `211872b` — panel is `w-[calc(100%-2rem)]`; the `p-4` had sat on a **childless** backdrop, so every modal was edge-to-edge under 512px |
| `ProcessingHUD` no `aria-live`, English-only | `211872b` — `role="status"`/`aria-live`/`aria-busy` + `t.common.*` |
| No skip link, unlabelled nav landmarks | `d0377d6` — skip link + `id="main-content"`, both nav landmarks labelled |
| Admin double shell (two sidebars, nested `<main>`, 10-vs-14 item disagreement) | `d0377d6` — one translated nav (all 14), `AdminSidebar` deleted, `admin/layout.tsx` is now only the auth gate |
| `AgentMobileNav` dead code | `d0377d6` |
| `useIsMobile` initialised `false`; 768-vs-1024 disagreement | `d0377d6` (matchMedia + `useSyncExternalStore` at 1024) → last consumers migrated to CSS-first in `6fa6074`; the now-dead `hooks/useResponsive.ts` file (all 5 exports 0-importer) finally removed in `773cb34` |
| **Wallet JS fork loses features on mobile** (R1, the map's top finding) | `6fa6074` — see "corrections" below; the fix needed a second layer the map did not identify |
| `MobileAppShell` dead routes / placebo tabs | `6fa6074` — component deleted |
| `AppShell` dead language toggle + lying role switcher; badge that can never render; undefined `safe-area-inset-bottom`; drawer without focus trap | `399892e` |
| `roles[0]` navigation; `.includes('admin')` substring check | `399892e` — `parseRoles`/`getPrimaryRole`/`hasAnyRole` + `pw_active_role` cookie |
| `/home` vs `/dashboard` dual URL | `399892e` — 307 in `proxy.ts` |
| `proxy.ts` hand-maintained allowlist foot-gun | `399892e` — `tests/unit/public-route-allowlist.test.ts` (65 routes; verified it fails on an unlisted route) |
| Fake "Biometric / PIN" unlock on sign-in (Cluster I, rated **C** trust) | `6274954` — removed; it was gated on localStorage keys nothing writes, and the "Biometric" button only pre-filled the saved email |
| All 4 native `confirm()`s (Cluster F destructive half) | `6274954` — new shared `components/ui/ConfirmDialog.tsx` on top of `Modal`; zero `window.confirm` remain |
| Sign-in bilingual literals ("worst file in repo") | `6274954` — 30 strings → `t.auth.signInPage` (el+en); 0 ternaries left |
| Admin route states (Cluster G) | `915d82d` — see correction 3; scoped admin boundary + table-shaped skeleton |
| Locale drift + hydration-unsafe dates (`lib/i18n/format.ts`) | `1cf83ea` — see correction 5; new format module pinning locale AND Europe/Athens; 41 `en-US` sites normalized; 22 bare `toLocale*` calls migrated |
| Cluster F — modal focus traps | `5e604d9`, `f054024`, `609baed` — new `AdminDialog` (6 admin overlays), traps on the destructive + wallet dialogs, menu semantics on the dropdowns, Escape + announcement on the tour |
| Cluster H — polling | `448d349` — new `hooks/usePolling.ts` (backoff + hidden-tab pause); adopted by the wallet and upload pollers, AnalysisCard guarded in place |
| Cluster D — form kit | `20ccffe` — new `components/ui/form/` (Field + Input/Textarea/Select with automatic aria-invalid/describedby); AddPolicyClient's toast-only validation now inline |
| Cluster E — table keyboard access | `4838d62` — new `TableShell`; 6 tables adopted; BulkImportModal's clipped preview now scrolls |

### Corrections — rows that are wrong as written

1. **`MobileAppShell`'s dead routes and placebo tabs were unreachable, not live.** The map rates them **C** ("logout is broken", "fake 'no alerts' hides real renewal warnings — a direct trust hit"). In fact `MobileAppShell` mounted only from `PolicyWalletClient`, which mounts only at `/wallet`; its `activeTab` derived from `pathname` and it rendered **no tab bar**, so `activeTab` was *always* `'home'`. Only `MyPoliciesScreen` ever rendered — `MyProfileScreen` and the tasks/coverage/alerts tabs were dead code. Real severity: **L (dead code)**, not C.

2. **`components/wallet/EmptyState.tsx` is NOT dead.** The map lists it as "zero importers — delete". `components/wallet/PolicyWallet.tsx:8` imports it. It was **not** deleted. (`SwipeableCard`, `PullToRefresh`, `UserDashboard`, `AddPolicyForCustomerModal` were genuinely 0-importer and are gone.)

3. **Route states are NOT missing — they are inherited.** The map says the 20+ listed routes (incl. all 14 admin ones) "show blank screens / uncaught errors" and that an error "bubbles to the root and drops the shell". Both `app/(protected)/error.tsx` **and** `app/(protected)/loading.tsx` exist, so every protected route already has a localized `RouteError` boundary that keeps the shell, and a skeleton during navigation. The real — much smaller — issue is that those boundaries are not *scoped*: a failure on one screen replaces the whole protected content area. Severity: **L/M**, not H. Acted on where it pays: `/admin` now has its own `error.tsx` (recovery lands on `/admin/dashboard` rather than sending an admin through the `/dashboard` redirect chain) and a table-shaped `loading.tsx`. Blanketing the other ~25 routes with near-identical files was judged churn and deliberately skipped.

4. **`en-GB` is not drift — `en-US` is.** The map reads "`en-US` in 10+ files vs hardcoded `en-GB` on the home dashboard", implying en-GB is the outlier. `t.common.locale` in `translations/en.ts` **declares `en-GB`**, and 25 sites already used it across the wallet, agent and legal layers against 41 using `en-US`. For a euro-denominated, day-month-year market en-GB is also the correct answer, so the 41 were normalized to it — not the reverse.

5. **`PolicyTable`'s row menu already had menu semantics.** The map calls it "a hand-rolled overlay without `role="menu"`/keyboard support". It had `role="menu"`, `role="menuitem"`, `aria-expanded` and `aria-haspopup` already. What it genuinely lacked was Escape-to-close, which was added.

6. **The landing is 9 client / 4 server, not "11 of 13 client"** — and every one of the 9 has a real reason: hooks (`AgentWidgets`, `AudienceTabs`, `LandingHeader`, `PolicyWalletWidget`, `PublicMegaFooter`, `SolutionsDropdown`), the language context (`LoBPageShell`, `ProductCategoryExplorer`), or a deliberate analytics island (`LandingCtaLink`, whose own doc comment explains it exists so the hero and final-CTA sections can stay server-rendered). See "Not mechanical" below.

7. **The wallet fork had a second layer the map missed.** Removing `if (isMobile) return <MobileAppShell/>` mounts the five modals, but `PolicyCard` **accepted `onShare`/`onViewDocuments`/`onRunAnalysis`/`onDelete` and silently ignored all four** — it destructured only `{ policy, onView, id }`. Those actions existed solely in `PolicyTable`'s desktop-only context menu, so un-forking alone would have left the modals mounted with nothing able to open them. Both layers are fixed in `6fa6074`.

### Not mechanical — blocked on a decision, not on effort

- **Landing Server-Components refactor (Stage B).** The only genuinely blocked item. The remaining lever is the two components that call `useLanguage()`; making them server components means threading locale as a prop through ~32 marketing route files, which is the **`/en` duplicate-route-tree decision** in disguise. **Owner decision (23 Jul): leave it, write up the plan** → `docs/design/LANDING_RSC_PROPOSAL.md`, which also records that the measurement should come first (this Next build emits no First Load JS figures, so the stated ~448 KB benefit is currently unverifiable).
- ~~**`EmptyState`'s remaining hexes.**~~ **Done** (`ca961fe`). The earlier "would shift dark mode on 23 surfaces" call was wrong: it compared against the shadcn `--card` token, but this system's card surface is `--pw-surface-dark` (`#111111`) — exactly what EmptyState already hardcoded. Converted to `--pw-*` variables with byte-identical output, verified by a dark-mode screenshot before/after. Only the MASTER-sanctioned status pairs remain.
- ~~**Table card fallbacks.**~~ **Done, all six** (`ca961fe`, `+1`). `CustomerList` already had a card grid behind a desktop-only toggle. For the other five (renewals, opportunities, team, commissions, questionnaires) the "which columns survive" framing was itself the mistake: a **stacked** layout keeps every column, so no per-table decision is needed. New `.pw-stacked-table` utility turns each row into a card below `lg` and labels each cell from its own `data-label`, taken from the table's existing `<th>`. Nothing is dropped and nothing was invented.

### Decisions taken

- **Admin gets no mobile bottom nav.** The map asks for one (Dashboard/Users/Policies/Billing/More). Instead the empty `<nav>` and its `pb-24` gutter are simply not rendered when there are no items. Admin stays desktop-first; making 14 query-heavy admin tables genuinely phone-usable is not currently worth the cost.
- **Wallet presentation is CSS-first**, not a JS breakpoint: cards below `lg` always, `viewMode` decides desktop only, toggle hidden below `lg`. This deliberately keeps a hidden copy of the card grid in the DOM for desktop list users — the alternative reintroduces the hydration branch this work exists to remove.

### Still open

Every cluster now has its primitive built **and** its adopters migrated. What is left is genuinely narrow:

- **Form-kit adoption breadth (Cluster D remainder).** The kit exists (`components/ui/form/`), `AddPolicyClient` uses it, and the **74 orphaned labels** across the agent modals, admin pages and collaboration components are fixed — so those forms are no longer announcing unlabelled inputs. Still hand-rolled, though functional and labelled: `EditPolicyForm`, the auth pages, onboarding steps. These rely on native `required` validation rather than inline errors; converting them is polish, not a defect fix.
- ~~**Landing Server-Components refactor (Stage B).**~~ **Done** (`aa358a3`). Owner first deferred it, then chose the full version. Locale is now a prop threaded from each route instead of a React context, so the 15 product `PageClient`s and the two shared components are Server Components: **15 → 0 client PageClients**, landing components **9 → 7 client**. Verified by rendering all 15 products plus 7 other public pages in BOTH locales before and after and diffing the visible text — **44/44 byte-identical**. ⚠️ The **perf benefit is still unmeasured**: this build emits no per-route First Load JS table, so the ~448 KB claim has no before/after. `docs/design/LANDING_RSC_PROPOSAL.md` retains the measurement guidance.
- **Remaining hex literals**, almost all in `components/landing/*` and the public marketing pages. No longer entangled with Stage-B (now done), so this is a clean mechanical sweep whenever it is wanted. The shared components that mattered (EmptyState, TrustStrip) are done, and the sanctioned status pairs stay literal per MASTER.
- **shadcn `button.tsx` / `card.tsx`** — 2 importers each. Fold in or delete; a small, self-contained call.
- **The `/en` duplicate route tree** — out of scope by both audits. It no longer gates anything: threading locale as a prop turned out to be independent of whether the tree is ever folded into a `[locale]` segment.

---

**How this doc separates concerns (per CLAUDE.md):** every finding is tagged either **[BROKEN]** (functionally wrong / dead / misleading — gates launch-quality) or **[UX]** (quality/consistency debt — does not gate, but compounds). Security-correctness auditing was recently done elsewhere (`docs/audits/b2c-b2b-full-review-2026-07.md`); this doc only carries **security-adjacent UX** and the auth-pattern drift found incidentally.

---

## 1. Executive summary

### Main structural problems

1. **Responsiveness is implemented twice, with conflicting strategies.** The shell is CSS-responsive at `lg` (1024px); the pages that "went mobile" did it with a JS hook (`useIsMobile`, 768px) that renders a **completely different component tree** (`MobileAppShell`) after hydration. Result: a hydration flash (desktop UI paints first on phones), a tablet dead zone (768–1024px gets desktop page content inside a mobile shell), and a mobile wallet that **silently loses features** (compare, batch upload, delete dialog, AI-consent, upgrade modal are unreachable on phones — the mobile fork `return`s before they render).
2. **The mobile B2C surface contains dead ends.** `MobileAppShell`'s profile tab links to four routes that do not exist (`/account/edit`, `/account/payment`, `/account/settings`, `/auth/signout` — the last one is the **logout button**), and its "tasks"/"alerts" tabs are hardcoded placebo cards ("All caught up") disconnected from real data.
3. **The shell has silently-dead controls.** `AppShell` exposes a mobile language toggle and a role switcher whose callbacks (`onNavigate`, `onRoleSwitch`) are **never passed** by the protected layout — the toggle does nothing and the role switcher shows a "viewing as…" toast without switching anything. The mobile bottom-nav notification badge is keyed to a nav id (`notifications`) that no bottom-nav item has, so it can never render.
4. **Three parallel design-token layers and three-plus button/card systems.** `globals.css` defines `--brand-*`, `--pw-*`, and shadcn `--color-*` vars; `.pw-card` and `.arc-card` are duplicated recipes; CTAs exist as `.pw-primary-button` (pill), `.arc-btn` (rounded-xl), shadcn `button.tsx` (2 importers), and dozens of ad-hoc `<button className="rounded-full bg-primary …">`. ~90 files still use raw `slate/stone/gray` classes; ~1,100 arbitrary `text-[Npx]` sizes bypass any type ladder; hex literals appear inline in ~60 component files (worst: landing widgets, the shared `EmptyState`, the sign-in page).
5. **Admin is a fork of the app, not a section of it.** `/admin` renders **two sidebars** (AppShell's admin nav + `AdminSidebar`) whose item lists disagree (10 vs 14 entries), `AdminSidebar` is English-hardcoded and stone-palette, all 14 admin routes lack `loading.tsx`/`error.tsx`, and admin has **no mobile bottom nav** (`getBottomNavItems` returns `[]`).

### Main quality risks

- **Trust:** the sign-in page renders a "Biometric / PIN" quick-unlock block that is **not biometric auth** (the button pre-fills the stored email) and is gated on localStorage keys **nothing in the codebase ever writes** — dead, and misleading if ever reached. Account deletion and customer disconnection still use native `confirm()`. Trust microcopy ("AES-256 encryption") is asserted without a linked security page. For a fintech-grade bar these read as veneer.
- **Accessibility:** only 8 of ~29 overlay/dialog implementations use the `useDialog` focus-trap hook; the mobile nav drawer has no focus trap/`aria-expanded`; there is no skip-to-content link; `aria-live` appears in 3 files while every long-running flow (upload → analysis) is async; form validation is **toast-only** (no inline errors, no `aria-invalid`/`aria-describedby`).
- **Performance:** 266 of 433 TSX files are client components; 11 of 13 landing components are client (first-load ~448 KB gz per STATUS); framer-motion is imported in 29 files; the wallet polls `router.refresh()` every 2–10 s re-running the whole server tree; the protected layout does per-request DB work (notification count) on **every** navigation.
- **i18n/locale:** 61 hardcoded bilingual literals remain (34 in sign-in alone); `OfflineProvider` toasts are English-only; `AdminSidebar` is English-only; `NotificationHistory` is Greek-only; number/date locales are inconsistent (`en-US` in 10+ files vs hardcoded `en-GB` on the home dashboard).

### Why this matters before further feature work (incl. MEDIC)

Every new feature (a MEDIC line of business, a new B2B module) today must choose between four button systems, three token layers, two responsive strategies, and two empty-state/pill patterns — and will inherit toast-only validation and the ad-hoc modal pattern. Each page built on the current base adds one more file to every future sweep. Fixing the shared layers first converts ~90 per-page fixes into ~10 shared ones, and gives MEDIC a stable shell (navigation slot, page container, form kit, table kit) to land on.

---

## 2. Architecture diagnosis

### Root causes (fix once, in shared layers)

| # | Root cause | Evidence | Downstream files affected |
|---|-----------|----------|---------------------------|
| R1 | **JS-fork responsiveness** (`hooks/useResponsive.ts`, 768px, `useState(false)` initial) instead of CSS-first layout | `PolicyWalletClient` → `MobileAppShell` fork; `AgentClient`, `AccountClientPage` also import it | Wallet (whole B2C core), agent page, account |
| R2 | **Breakpoint disagreement**: shell switches at `lg` (1024), JS hook at 768 | `AppShell` (`lg:hidden` header/bottom-nav, `lg:pl-72`) vs `useIsMobile` | Every page between 768–1024px renders desktop content in a mobile chrome |
| R3 | **Token-layer triplication** + stale source-of-truth pointer | `globals.css` header comment cites deleted `components/ui/design-tokens.ts`; `--brand-*` / `--pw-*` / shadcn vars; `.pw-card` vs `.arc-card` duplicated byte-for-byte | All styled components; re-theming requires 3 edits |
| R4 | **No enforced CTA/typography ladder** | pill vs rounded-xl CTAs; 371× `text-[10px]`, 123× `text-[11px]`, 54× `text-[32px]`, 47× `text-[44px]`, 24× `text-[56px]` | ~200 files |
| R5 | **No page-scaffold primitive** | `PageHeader` used in 5 files; containers split max-w-7xl(29)/4xl(17)/3xl(14)/6xl(8)/5xl(8) with varying px paddings | Every routed page |
| R6 | **Dialog primitive exists but isn't the default** | good `components/ui/Modal.tsx` + `hooks/useDialog.ts`, yet ~21 of 29 `fixed inset-0` overlays bypass both | Admin modals, b2c dialogs, sign-in overlay, tour, menus |
| R7 | **Toast-only form feedback** | `AddPolicyClient`, `EditPolicyForm`, auth pages: `toast.error(...)` with zero inline field errors | All forms, both B2B and B2C |
| R8 | **Route-state files optional, not conventional** | admin 0/14 routes have `loading.tsx`; `account`, `home`, `coverage-insights`, `wallet/add`, `upgrade`, `benefits`, `branches`, `customers/[id]`, `agent` (b2c) missing loading and/or error | 20+ routes show blank screens / uncaught errors |
| R9 | **Role model drift**: raw `dbUser.roles.split(",")` + `roles[0]`-only navigation + `.includes('admin')` substring checks, despite `parseRoles()`/`getPrimaryRole()` existing | `app/(protected)/layout.tsx:44`, `app/(protected)/admin/layout.tsx:17` | Dual-role users get order-dependent nav; pattern invites the exact bug class CLAUDE.md bans |
| R10 | **Per-page data-refresh via polling + `router.refresh()`** | `PolicyWalletClient` (2–10 s), `AnalysisCard` (2.5 s), `NotificationWatcher` (10–25 s) — three separate pollers, no shared subscription layer | Battery/network cost; whole-tree re-renders; toast-dedup bugs already bitten twice (#84, #217) |

### Global vs local

- **Global/systemic:** R1–R10 above, plus the i18n residue *pattern* (bilingual ternaries), locale-format helpers (each file re-creates `Intl.NumberFormat`), the empty/dead-code accumulation, and the admin double-shell.
- **Local/page-specific:** individual dead links (`MobileAppShell`), the sign-in fake-biometric block, hardcoded `en-GB` on home, unprefixed `grid-cols-3+` in 10 files, specific hex-heavy files.

### Fix-once candidates

1. One **`<PageShell>`/`<PageContainer>`** primitive (container width, padding, `PageHeader`, breadcrumb slot) — kills R5.
2. One **breakpoint contract** (CSS-first; the only sanctioned JS check = `useMediaQuery('(min-width:1024px)')` matching the shell) — kills R1/R2.
3. **Token consolidation** in `globals.css` (retire `--brand-*`, alias `.arc-*` → `.pw-*`, then delete) — kills R3.
4. **Form kit** (`<Field>`, `<FieldError>`, shared `useZodForm` wiring, `aria-invalid`/`aria-describedby` built-in) — kills R7.
5. **`Modal`/`ConfirmDialog` adoption sweep** + delete ad-hoc overlays — kills R6 and the remaining `confirm()`s.
6. **`formatCurrency`/`formatDate` locale helpers** in `lib/i18n` — kills the `en-US`/`en-GB` drift.
7. **Route-state convention**: `loading.tsx` + `error.tsx` (via shared `RouteError`) required per route group; add a generator/checklist.

---

## 3. File-by-file remediation map

Legend — **Sev:** C=critical, H=high, M=medium, L=low · **Impact:** U=usability, A=accessibility, P=performance, T=trust, M8y=maintainability, R=responsiveness, K=consistency · **Where:** `here` = fix in this file; `shared` = fix belongs in a shared abstraction (file then consumes it) · **Conf:** confidence in diagnosis.

### 3.1 Shell & layout primitives

| File | Area | Issue | Why it matters | Action | Sev | Impact | Depends on | Where | Conf |
|---|---|---|---|---|---|---|---|---|---|
| `components/shell/AppShell.tsx` | shell | **[BROKEN]** (a) Mobile-footer language toggle calls `onNavigate?.('/?lang=el')` but the protected layout never passes `onNavigate` → **dead control**; even if wired, it navigates away to `/`. (b) `handleRoleSwitch` calls `onRoleSwitch?.()` (never passed) then shows a success toast → **role switcher lies**. (c) Bottom-nav badge renders only for `item.id === 'notifications'` — no bottom item has that id → unread badge never shows on mobile. (d) `safe-area-inset-bottom` class is **not defined in any CSS** → bottom nav sits under the iPhone home indicator. **[UX]** (e) drawer has no focus trap / `aria-modal` / Escape; hamburger lacks `aria-label`/`aria-expanded`; (f) custom `roleChangeToast` div duplicates sonner, no `aria-live`; (g) raw `black/60`,`white/70` palette instead of tokens; (h) no skip-to-content link; (i) admin gets an empty bottom nav. | The shell is the highest-traffic component; every defect here is on every screen for every role. | (a) Change toggle to call the real language mechanism (`useLanguage().setLanguage` + persist via `/api/user/language`) in place, no navigation. (b) Either wire `RoleSwitcher` to a server action that reorders/switches role context, or remove it from the shell (account page already navigates). (c) Add a notifications bottom-nav item or badge the "more/settings" item. (d) Define `.safe-area-inset-bottom { padding-bottom: env(safe-area-inset-bottom) }` in `globals.css`. (e) Wrap drawer in `useDialog` ref + `role="dialog" aria-modal`; add `aria-expanded`/`aria-controls` on the hamburger. (f) Replace custom toast with sonner. (g) Tokenize. (h) Add `<a href="#main" class="sr-only focus:not-sr-only">` + `id="main"` on `<main>`. (i) Give admin a bottom nav (Dashboard/Users/Policies/Billing/More). | **C** | U,A,R,K,T | none (Phase-1) | here (d,h partly `globals.css`) | High (a–d verified by grep: no `onNavigate=`/`onRoleSwitch=` pass, no CSS class, no matching id) |
| `app/(protected)/layout.tsx` | shell | **[BROKEN-adjacent]** `const roles = dbUser.roles?.split(",")` (raw, untrimmed — CLAUDE.md mandates `parseRoles()`), and nav is built from `roles[0]` only, so a `"policyholder,agent"` user gets policyholder nav and **no way to reach agent tools** from the shell (order-dependent). **[UX]** per-request `db.notificationEvent.count` + partner-offer read on every navigation of every protected page. | Dual-role users (the advisor-invite flow now *creates* them) get wrong navigation; layout latency taxes every page. | Use `parseRoles()` + `getPrimaryRole()`; build nav for the **active** role (cookie/session-selected, feeding RoleSwitcher fix above); merge extra roles as a secondary section. Cache/`unstable_cache` the unread count briefly or move badge fetch client-side into `NotificationWatcher`. | **C** | U,P,M8y | none | here | High |
| `components/layout/MobileAppShell.tsx` | shell/B2C | **[BROKEN]** Profile tab pushes `/account/edit`, `/account/payment`, `/account/settings` and logout pushes `/auth/signout` — **none of these routes exist** (verified against `app/`). "tasks" and "alerts" tabs are hardcoded "All caught up" cards regardless of real tasks/notifications — falsely reassuring. Tab detection duplicates bottom-nav logic with different ids. | On a phone, the profile screen's 4 primary actions 404 and **logout is broken**; fake "no alerts" hides real renewal warnings — a direct trust hit in an insurance product. | **Delete this component** (see PolicyWalletClient below). If retained temporarily: point links at `/account`, `/notifications`, call the real `signOut` action, and remove the placebo tabs. | **C** | U,T,R | decision in `PolicyWalletClient` | delete (superseded by responsive wallet) | High (routes verified absent) |
| `components/layout/AgentMobileNav.tsx` | shell | **[UX]** Dead code — zero importers. | Confuses future mobile-nav work; invites resurrection of a second nav system. | Delete. | L | M8y | none | delete | High |
| `app/(protected)/admin/layout.tsx` | shell/admin | **[BROKEN-adjacent]** (a) Renders `AdminSidebar` *inside* the protected layout that already renders AppShell's admin sidebar → **two sidebars on ≥lg desktop**, with different item sets. (b) `dbUser.roles.includes('admin')` substring check instead of `parseRoles()` (the exact pattern CLAUDE.md bans). | Double navigation is disorienting and wastes ~500px; the substring role check is the known-bug-class pattern. | Pick ONE nav owner: either drop `AdminSidebar` and complete AppShell's admin nav (add Policies/Submissions/Tokens/Activity), or opt the admin segment out of AppShell's sidebar. Replace the role check with `hasRole(parseRoles(dbUser.roles),'admin')`. | **C** | U,K,M8y | AppShell nav decision | here | High |
| `components/admin/AdminSidebar.tsx` | shell/admin | **[UX]** All 14 labels hardcoded English; stone palette (`border-stone-200 dark:bg-stone-900`); on mobile it renders as a horizontally-scrolling strip above content (no drawer); duplicates AppShell nav (see above). | Admin is the only English-forced, off-palette surface; bilingual admins exist. | If kept (per layout decision): move labels to `t.nav.*`, tokenize colors, and collapse into the standard drawer pattern on mobile. | H | K,U,R | admin layout decision | here | High |
| `app/globals.css` | tokens | **[UX]** (a) Header comment claims source of truth is `components/ui/design-tokens.ts` — deleted in `834957c`. (b) Three var families (`--brand-*` — grep shows near-zero component usage, `--pw-*`, shadcn). (c) `.arc-card` duplicates `.pw-card` byte-for-byte; `.arc-btn` (rounded-xl) competes with `.pw-*-button` (pill). (d) `.pw-page-shell` hardcodes gradient hexes. (e) `.dark --secondary: #173330` commented "Amber" (it's green). (f) No `safe-area` utilities, no focus-visible default for links, no reduced-motion guards for `.animate-blob`/card hover transforms. | This file IS the design system at runtime; every ambiguity here becomes a per-file decision downstream. | Delete `--brand-*` (after grep-confirming zero refs), alias then remove `.arc-card`→`.pw-card`; decide ONE button radius (pill, per MASTER) and re-map `.arc-btn*` onto `.pw-*` equivalents; fix comments; add `safe-area` utility + `@media (prefers-reduced-motion: reduce)` blocks; extract gradient colors to vars. Update MASTER.md pointer. | H | K,M8y,A | none (Phase-1) | here | High |
| `hooks/useResponsive.ts` | primitives | **[UX/BROKEN-adjacent]** `useIsMobile` initial state `false` → phones paint the desktop tree first (hydration flash + CLS); breakpoint 768 disagrees with the shell's 1024; four overlapping hooks encourage JS-fork layouts. | Root cause R1/R2 — the single biggest responsiveness architecture defect. | Reduce to one SSR-safe `useMediaQuery` (initialized via matchMedia in a lazy initializer, or `useSyncExternalStore`); export `useIsDesktopShell()` pinned to 1024 to match `lg`. Deprecate `useIsMobile`/`useBreakpoint`; migrate the 3 consumers to CSS-first layouts. | **C** | R,U,P | none | here + consumers | High |
| `app/layout.tsx` | shell | **[UX]** `Toaster position="top-right"`: on mobile, toasts cover the sticky header/actions; no `richColors` contrast audit for dark mode; `themeColor` single value (no dark variant). | Toasts are the app's only feedback channel (see R7) — placement matters more here than usual. | `position="top-center"` with `mobileOffset`, or bottom-center above the bottom nav; add `themeColor` media variants. | M | U,K | none | here | Med |
| `proxy.ts` | routing | **[UX-arch]** Public allowlist is a hand-maintained list; every new public page silently 307s to signin if forgotten (has already bitten: cron routes, per STATUS). | Recurring foot-gun class. | Add a unit test that walks `app/(public)` route folders and asserts each path is allowlisted (mirror of `audit:api-auth` for pages). | M | M8y,T | none | shared (new test) | High |

### 3.2 Routing structure

| File | Area | Issue | Action | Sev | Impact | Depends | Where | Conf |
|---|---|---|---|---|---|---|---|---|
| `app/(protected)/home/page.tsx` + `app/(protected)/dashboard/page.tsx` | routing/B2C | `/dashboard` (nav target) delegates to `/home`'s page component, but `/home` is **also directly routable** → same dashboard on two URLs (splits analytics, breaks `isActive` highlighting for `/home` visits). Also `formatCurrencyValue` hardcodes `Intl.NumberFormat("en-GB")` — Greek users get UK formatting on the money tiles. | Redirect `/home` → `/dashboard` (or vice-versa, one canonical URL); replace `en-GB` with the shared locale helper (Cluster F). | H | K,U | locale helper | here | High |
| `app/(protected)/agent/**` (b2c "my agent") vs `app/(protected)/dashboard/agent`, `/customers`, `/opportunities`… | routing | **[UX-arch]** B2B agent surface is scattered at top level (`/customers`, `/renewals`, `/commissions`, `/insights`, `/team`, `/tasks`, `/questionnaires`, `/opportunities`) while `/agent` is the *policyholder's* page about their advisor — naming collision confuses code navigation and route-guard reasoning; each B2B page re-asserts role guards individually. | Long-term: introduce a `(agent)` route group (URL-preserving is possible with group folders only if paths keep working — otherwise document the map). Short-term: add a `docs/` routing map + shared `requireAgentPage()` helper so guards aren't copy-pasted. | M | M8y,K | none | shared | Med |
| Route-state coverage (from route walk): missing `loading.tsx` and/or `error.tsx` on `account`, `home`(error), `dashboard`(error), `coverage-insights`, `wallet/add`, `upgrade`, `upgrade/success`, `benefits`, `branches`, `branches/[branch]`, `customers/[id]`, `customers/invite`, `agent`(b2c, loading), `agent/pricing`(loading), `agent/settings`(loading), `dashboard/agent`(loading), `consent/ai`, `coverage`, and **all 14 `admin/*` routes** | states | **[UX]** Slow server pages render nothing during navigation (admin pages are query-heavy); an uncaught error bubbles to the root and drops the shell. | Add `loading.tsx` (use `LoadingSkeleton` variants) and `error.tsx` (use shared `RouteError`) per route; consider one `error.tsx`+`loading.tsx` at the `admin/` segment level to cover all 14 cheaply. | H | U,T | `RouteError`/`LoadingSkeleton` exist already | here (thin files) | High |

### 3.3 B2C pages & components

| File | Area | Issue | Action | Sev | Impact | Depends | Where | Conf |
|---|---|---|---|---|---|---|---|---|
| `components/wallet/PolicyWalletClient.tsx` | B2C core | **[BROKEN]** `if (isMobile) return <MobileAppShell/>` — the mobile branch returns **before** `PolicyComparison`, `BatchUploadModal`, `DeletePolicyDialog`, `AiConsentModal`, `UpgradeModal`, and the analysis trigger are rendered → on phones the wallet cannot delete, compare, batch-upload, consent, or upgrade. Plus hydration flash (desktop first paint on mobile). **[UX]** file has UTF-8 BOM; polling effect re-runs on every `router.refresh` (guarded, but fragile — bit twice already); compare button is an ad-hoc styled button. | This is the product's core screen. Make `PolicyWallet`/`MyPoliciesScreen` one responsive tree: render policy list as cards below `lg` and grid/table above via CSS; keep ALL modals/actions in the single tree. Delete the `isMobile` fork and `MobileAppShell`. Strip BOM. | **C** | U,R,T,M8y | `useResponsive` fix, Modal cluster | here (+ delete MobileAppShell) | High |
| `components/wallet/MyProfileScreen.tsx` | B2C | **[BROKEN]** Only reachable via MobileAppShell; its action props point at the four nonexistent routes (see above). | Delete with MobileAppShell, or rewire into `/account` if any visual is worth keeping. | H | U | wallet fork fix | delete/merge | High |
| `components/wallet/EmptyState.tsx` | B2C | **[UX]** Dead code (zero importers; superseded by `components/ui/EmptyState`). | Delete. | L | M8y | none | delete | High |
| `components/dashboard/UserDashboard.tsx` | B2C | **[UX]** Dead code (328 lines, zero importers — STATUS already flags it); contains 9 hex literals and a dead `/activity` link that would mislead future readers. | Delete. | L | M8y | none | delete | High |
| `app/(protected)/home/page.tsx` (content) | B2C dashboard | See routing row (dual URL, `en-GB`). Additionally **[UX]**: page composes 8+ widget components each with own container paddings — verify against `PageShell` once it exists. | Adopt `PageShell`; locale helper. | H | K,U | Phase-2 primitives | shared | High |
| `app/(protected)/coverage-insights/*` | B2C | Recently reworked (verdict sync, 23 Jul) — content states are now sound. **[UX]** residual: no `loading.tsx`/`error.tsx`; hex/palette residue in `ProtectionScoreCard`/`RecommendationCards` per earlier sweeps was partially addressed — re-verify during Phase-5. | Add route-state files; palette re-verify. | M | U,K | Phase-1 | here | Med |
| `app/(protected)/wallet/[id]/AnalysisCard.tsx` | B2C | **[UX]** 2.5 s `setInterval` poll while analyzing (plus wallet's own poll on the list page → double polling when both mounted); 9 hex literals. | Consolidate on one polling hook with backoff shared with the wallet poller (Cluster H); tokenize. | M | P,K | Cluster H | shared | High |
| `app/(protected)/wallet/[id]/*` detail cards (`SummaryCard`, `ExclusionsCard`, `RenewalRemindersList`, `coverage-details/*` — Motor/Home/Life/CoverageTabView) | B2C | **[UX]** STATUS-tracked residual: ~10 cards duplicate a local `TONE_PILL` status-hex map that `components/ui/StatusPill` already centralizes; 7–11 hex literals per file. | Replace local tone maps with `StatusPill`/token classes; single pass over the detail folder. | M | K,M8y | StatusPill ready (it is) | shared | High |
| `components/wallet/PolicyTable.tsx` | B2C table | **[UX]** Context-menu positions via `window.innerWidth` math; menu is a hand-rolled overlay without `role="menu"`/keyboard support; table relies on horizontal scroll on mobile (also unreachable there today due to the fork). | After un-forking: give the table a `lg:` card fallback OR keep`overflow-x-auto` + sticky first column; rebuild menu on `useDialog`/menu semantics. | M | A,R,U | wallet un-fork | here | High |
| `components/wallet/AddPolicyClient.tsx`, `components/wallet/EditPolicyForm.tsx`, `app/(protected)/wallet/add` | forms | **[UX]** Validation errors surface **only as toasts** (`toast.error(formCopy.uploadDocumentRequired)`); no inline per-field errors, no `aria-invalid`/`aria-describedby`, no error summary/focus-move. Native `required` present on some inputs only. `wallet/add` lacks loading/error route files. | Adopt the shared form kit (Cluster D): inline `<FieldError>` + aria wiring; keep toasts for submit-level failures only. | H | A,U,T | form kit | shared | High |
| `components/onboarding/*` (`OnboardingFlow`, `FirstPolicyScreen`, `PreferencesScreen`, `WelcomeScreen`, `SuccessScreen`) | B2C flow | **[UX]** 5 stone/slate-raw files (per palette grep); step flow has no `aria-current`/progress semantics; FirstPolicyScreen upload error path relies on toasts (same R7). | Tokenize; add `role="progressbar"`/step list semantics; form-kit adoption for the upload step. | M | A,K | form kit | shared | Med |
| `components/onboarding/DashboardTour.tsx` | B2C | **[UX]** Positions tooltips via `window.innerWidth` px math with manual clamping and a resize listener; overlays without dialog semantics; no reduced-motion respect. | Rebuild positioning on CSS anchor/popover or a floating-ui util; add `useDialog` semantics + Escape; honor `prefers-reduced-motion`. | M | A,R | none | here | High |
| `app/auth/signin/page.tsx` | auth/trust | **[BROKEN]** "Biometric / PIN" block: gated on `localStorage.biometric_registered` and `pw_quick_pin_hash` — **no code ever writes either key** (repo-wide grep), so the block is unreachable dead UI; worse, the "Biometric" button merely pre-fills the stored email (`applyStoredIdentifier`) — it imitates an auth factor it isn't. **[UX]** 34 hardcoded bilingual ternaries (worst file in repo); ~17 hex literals; password-reset overlay is an ad-hoc modal without `useDialog`; language toggle duplicated locally. | Remove the Biometric/PIN block entirely (reintroduce only with real WebAuthn). Migrate strings to `t.auth.*`; tokenize; wrap reset overlay in `Modal`. | **C** (trust) / H (rest) | T,A,K | none | here | High |
| `app/auth/reset-password/page.tsx`, `app/auth/forgot-password/page.tsx`, `app/auth/signup/*` | auth | **[UX]** 11 + 1 hardcoded literals; same ad-hoc styling family as signin; signup pages share the pattern. | Same treatment as signin (strings → `t.auth.*`, tokens, form kit). | M | K,A | form kit | here | High |
| `app/auth/handover/page.tsx` | auth | **[UX]** Native `confirm()` for the app-handover fallback. | Replace with `Modal`-based confirm. | L | U,K | Modal cluster | shared | High |
| `components/account/Settings.tsx` | B2C/trust | **[BROKEN-adjacent]** **Account deletion** confirmed via native `confirm()` — no typed-confirmation, no consequence list, off-brand chrome in the single most destructive B2C action. | Replace with a `Modal`-based destructive-confirm (consequences list + type-DELETE or hold-to-confirm), consistent with `DeletePolicyDialog`. | H | T,U | Modal cluster | shared | High |
| `components/monetization/UpgradeModal.tsx`, `PricingComparison`, `/upgrade` | B2C checkout | Largely fixed in the 22 Jul pass. **[UX]** residual per STATUS: grid-vs-modal "recommended plan" contradiction (Starter vs Plus) — a product decision, and VAT labelling awaits Stripe Tax. `/upgrade` lacks loading/error files. | Decide one recommended plan; add route-state files. | M | T,K | product decision | here | High |
| `components/notifications/NotificationHistory.tsx` | B2C | **[UX]** Greek-hardcoded throughout (STATUS-tracked residual); polling watcher duplicates wallet poller logic. | Bilingual i18n pass; fold polling into Cluster H hook. | M | K,U | Cluster H | here | High |
| `components/compliance/CookieConsentBanner.tsx` | B2C/public | **[UX]** Known to intercept clicks (Playwright helper exists solely to dismiss it); on mobile it stacks with the bottom nav; verify focus order and that it isn't `z`-fighting the nav (bottom nav z-40). | Constrain height on mobile, ensure it sits **above** bottom nav visually but doesn't cover primary CTAs; make dismiss persist before any pointer-blocking overlay renders. | M | U,A | none | here | Med |
| `components/pwa/InstallPrompt.tsx` | B2C | Fixed for frequency (16 Jul). **[UX]** verify it never overlaps the bottom nav / cookie banner simultaneously (three stacked fixed-bottom elements are possible today). | Add a simple fixed-bottom coordinator (only one bottom sheet at a time). | L | U | none | shared | Med |

### 3.4 B2B (agent) pages & components

| File | Area | Issue | Action | Sev | Impact | Depends | Where | Conf |
|---|---|---|---|---|---|---|---|---|
| `app/(protected)/dashboard/agent/page.tsx` (573 lines) + `components/agent/DesktopDashboard.tsx` | B2B dashboard | **[UX]** Page assembles the whole book server-side into one client payload; component named **Desktop**Dashboard with no mobile-specific composition — dashboards degrade to stacked cards by accident, not design; KPI strip and RevenuePulse use unprefixed `grid-cols-3+` (squeezed at 360px). | Split page into streamed sections (Suspense per widget) to cut TTFB; add responsive grid prefixes; rename/merge Desktop naming once one tree exists. | H | R,P,U | Phase-2 | here | Med-High |
| `components/agent/RevenuePulse.tsx`, `PortfolioHealth.tsx` | B2B | **[UX]** Two unprefixed multi-col grids each (verified); 9 hexes in PortfolioHealth. | `grid-cols-1 sm:grid-cols-3` pattern; tokenize. | M | R,K | none | here | High |
| `components/agent/CustomerList.tsx` | B2B table | **[UX]** Table view relies purely on `overflow-x-auto` at all widths (no responsive column hiding or card fallback — grep shows no `md:` in the table region); grid view exists but the toggle default favors table. Filters row wraps but touch targets in the table are dense. | Below `lg`, default to the existing card grid; hide low-value columns `md:` down; ensure 44px row targets. | H | R,U | none | here | High |
| `app/(protected)/renewals/RenewalsClient.tsx`, `opportunities/OpportunitiesClient.tsx`, `questionnaires/QuestionnairesClient.tsx`, `team/TeamClient.tsx`, `commissions/CommissionsClient.tsx`, `tasks/TasksClient.tsx` | B2B tables | **[UX]** Same table pattern: `overflow-x-auto` desktop tables with no mobile presentation; ad-hoc modals in Renewals/Questionnaires (no `useDialog`); TasksClient has an unprefixed grid; `en-US` fallback locales throughout. | One shared `ResponsiveTable`/`DataList` wrapper (Cluster E): column-priority hiding + card fallback; migrate modals to `Modal`; locale helper. | H | R,U,A,K | Cluster E | shared | High |
| `app/(protected)/agent/AgentClient.tsx` (b2c-facing but agent-page) | B2C/B2B seam | **[UX]** Native `confirm()` on advisor disconnect; 9 hexes; imports `useResponsive`; local `PAGE_COPY` bilingual object pattern (allowed but drifts from `t.*`). | Branded confirm dialog; tokenize; CSS-first layout; migrate copy to translations. | M | U,K,R | Modal cluster | here | High |
| `app/(protected)/customers/[id]/CustomerProfileClient.tsx` | B2B | **[UX]** Native `confirm()` for **customer removal** (destructive, relationship-severing); ad-hoc modal. | Destructive-confirm dialog with consequence copy (what happens to shared policies). | H | T,U | Modal cluster | shared | High |
| `app/(protected)/insights/InsightsClient.tsx` | B2B | **[UX]** 21 hex literals (largest protected-app offender); heavy client computation of practice analytics in one component. | Tokenize; consider server-computing aggregates. | M | K,P | none | here | High |
| `components/agent/*Modal.tsx` (Invite, CreateTask, OpportunityUpdate, AddCustomer, UploadPolicy, BulkImport) | B2B modals | Now use `useDialog` (good). **[UX]** Still hand-rolled overlays each re-implementing backdrop/panel/scroll-lock — 6 slightly different chromes; BulkImportModal has an unprefixed grid + table. | Migrate onto `components/ui/Modal` (keep `useDialog` semantics) so chrome/radius/scroll-lock live once. | M | K,M8y | Modal cluster | shared | High |
| `components/agent/AddPolicyForCustomerModal.tsx` | B2B | **[UX]** Dead code (STATUS-flagged; zero importers). | Delete. | L | M8y | none | delete | High |
| `components/agent/QuestionnaireSender.tsx` | B2B | **[UX]** Ad-hoc overlay **without** `useDialog`; stone-heavy palette (design-shift file per 17 Jul sweep). | Migrate to `Modal`; palette verify. | M | A,K | Modal cluster | shared | High |
| `components/collaboration/*` (`CollaborationTimeline`, `DocumentRequestFlow`, `ProposalCard`, `AgentInbox`) | B2B | i18n completed (#138). **[UX]** Timeline/inbox render long lists unvirtualized; document-request flow uses toast-only validation. | Bounded pagination or virtualization on inbox/timeline; form-kit adoption. | M | P,U | form kit | shared | Med |

### 3.5 Admin pages

| File | Area | Issue | Action | Sev | Impact | Depends | Where | Conf |
|---|---|---|---|---|---|---|---|---|
| All `app/(protected)/admin/*/page.tsx` (14 routes) + `components/admin/*` (19 stone-palette files) | admin | **[UX]** (a) Zero `loading.tsx`/`error.tsx` (query-heavy pages hang blank). (b) stone-* palette repo-wide drift (canonical is slate/tokens — same inversion already fixed on agent files 17 Jul). (c) English-hardcoded labels widespread (AdminSidebar confirmed; `admin/tokens` flagged by the i18n scan). (d) Desktop-only tables (fine to keep desktop-first for admin, but must not break at tablet width — currently horizontal-scroll only). (e) Ad-hoc modals: `GrantTokensButton`, `BillingOpsPanel`, `CancelSubscriptionButton`, `UsersClient`, `PoliciesClient` — no `useDialog`. | Segment-level `loading.tsx`+`error.tsx` under `admin/`; one mechanical stone→token pass (same transform as the 17 Jul agent sweep); i18n pass or an explicit, documented "admin is EN-only" decision; migrate the 5 modal files to `Modal`. | H | U,A,K,M8y | Modal cluster; palette Phase-1 | here + shared | High |

### 3.6 Public / marketing

| File | Area | Issue | Action | Sev | Impact | Depends | Where | Conf |
|---|---|---|---|---|---|---|---|---|
| `components/landing/*` (13 files; 11 are `"use client"`; `AgentWidgets` 104 hexes, `AudienceTabs` 55, `PolicyWalletWidget` 46, `WorldClassLanding` 37, `PublicMegaFooter` 36, `ProductCategoryExplorer` 19, `TrustBadges` 12, `ServicesGrid` 9, `PartnerPerksSection` 10) | public/perf | **[UX]** The marketing surface ships ~448 KB gz first-load because nearly every section is a client component (STATUS Stage-B already names Server-Components refactor as "the real perf lever"); hex-literal density makes the palette un-governable; `AgentWidgets` runs a `setInterval` animation. | Stage-B: convert static sections to Server Components (keep interactivity islands only); tokenize hexes en route; gate the widget animation behind `prefers-reduced-motion`. | H | P,K,M8y | none | here | High |
| `components/public/PublicHeader.tsx` | public | **[UX]** 17 hexes; 2 bilingual ternaries; mobile menu is a `fixed inset-0` overlay — verify focus trap (not in the `useDialog` importer list). | Tokenize; strings → keys; wrap menu in `useDialog`. | M | A,K | none | here | High |
| `app/(public)/en/**` duplication | public/routing | **[UX-arch]** Every marketing page exists twice (`/x` + `/en/x`) as separate files; `HtmlLang` patches `<html lang>` client-side post-hydration (screen readers may start with Greek phonology on `/en/*` first paint). | Acceptable short-term; long-term fold into a `[locale]` segment with static params so `lang` is server-rendered. Document as MEDIC-relevant (new LOB pages currently must be authored twice). | M | M8y,A | none | shared | Med |

### 3.7 Shared components / design system

| File | Area | Issue | Action | Sev | Impact | Depends | Where | Conf |
|---|---|---|---|---|---|---|---|---|
| `components/ui/EmptyState.tsx` | shared | **[UX]** The flagship shared empty-state carries **29 hex literals** — every consumer inherits off-token colors; dark-mode values are hand-tuned per hex. | Re-express on tokens (`--primary`, `--color-primary-tint`, `--pw-*`); this single edit re-skins ~21 consumer files. | H | K,M8y | globals.css cleanup | here | High |
| `components/ui/Modal.tsx` | shared | Good a11y baseline. **[UX]** (a) Backdrop div carries `flex items-center justify-center p-4` but content is positioned separately — dead classes; panel uses `fixed left-1/2 top-1/2` translate centering that ignores small-viewport keyboards (no `p-4` gutter honored). (b) `document.body.style.overflow` toggling clobbers nested-open state. (c) No `prefers-reduced-motion` (spring scale always runs). (d) `rounded-[32px]` diverges from `--pw-radius-card` (16px). | Center via flex wrapper (use those classes), gutter-safe `max-h-[calc(100dvh-2rem)]`; ref-count scroll lock; wrap motion in reduced-motion check; radius token. Then drive adoption (Cluster C). | H | A,U,K | none | here | High |
| `components/ui/button.tsx`, `card.tsx` (shadcn) | shared | **[UX]** shadcn `button` has 2 importers; `card` similar — a third system nobody uses. | Either make these the canonical primitives (re-skinned to `.pw-*` recipes) or delete and standardize on `.pw-*` classes; do not keep both. Recommendation: keep CVA `button.tsx`, restyle variants to the pill recipe, migrate ad-hoc buttons opportunistically. | M | K,M8y | globals decision | here | High |
| `components/ui/LoadingSkeleton.tsx` + `skeleton.tsx` | shared | **[UX]** Two skeleton systems (244-line variant set + shadcn primitive). | Fold `skeleton.tsx` into `LoadingSkeleton` exports; one import path. | L | K | none | here | High |
| `components/ui/PullToRefresh.tsx`, `SwipeableCard.tsx` | shared | **[UX]** Dead code (0 importers each; 160+204 lines of touch-gesture logic rotting). | Delete (revive from git if a real mobile gesture pass lands). | L | M8y | none | delete | High |
| `components/ui/StatusPill.tsx` | shared | Exists and correct, but only 4 importers while ~10 wallet-detail cards duplicate its tone map (see 3.3). | Adoption sweep (tracked residual). | M | K | none | shared | High |
| `components/ui/TrustStrip.tsx` | shared/trust | **[UX]** A purpose-built trust component used **once** — while sensitive flows (upload, share-with-agent, checkout, account-deletion) hand-roll or omit trust microcopy; some claims ("AES-256") are unlinked assertions. | Define the canonical trust vocabulary (GDPR basis, storage location, retention link → `/privacy`) in TrustStrip variants; mount on upload, share, checkout, deletion surfaces; every claim links to the page substantiating it. | M | T | copy decision | shared | Med-High |
| `components/dashboard/GettingStartedChecklist.tsx` vs `components/agent/GettingStartedChecklist.tsx` | shared | **[UX]** Two same-named checklist components with parallel structures (b2c vs agent) — divergent styling for the same pattern. | Extract one `ChecklistCard` primitive; keep role-specific item lists as data. | L | K,M8y | none | shared | Med |
| `contexts/LanguageContext.tsx` + locale formatting | shared | **[UX]** No shared `formatCurrency`/`formatDate`; 12+ files build `Intl.NumberFormat(language==='el'?'el-GR':'en-US')` inline and `/home` hardcodes `en-GB`; the 8 Jul Sentry `-8` hydration bug (bare `toLocale*`) shows the class is dangerous. | Add `lib/i18n/format.ts` (`formatCurrency`, `formatDate`, `formatNumber` — locale from language, TZ pinned Europe/Athens) and migrate call sites. | H | K,U,T | none | shared (new) | High |
| BOM residue (15 tracked `.tsx` files incl. `PolicyWalletClient`, `MobileAppShell`) | shared | **[UX]** UTF-8 BOMs survive `lint:utf8`; harmless at runtime but churn diffs and betray the Windows-editing risk CLAUDE.md warns about. | One-shot BOM strip + extend `lint:utf8` to reject BOM. | L | M8y | none | shared (script) | High |

### 3.8 Accessibility cross-cuts (pattern rows — apply via clusters)

| Pattern | Where found | Action | Sev |
|---|---|---|---|
| Focus-trap-less overlays | ~21 of 29 `fixed inset-0` files (all except `Modal` + 6 agent modals + `AddPolicyForCustomerModal`(dead)): admin modal trio, `UsersClient`, `PoliciesClient`, `RenewalsClient`, `QuestionnairesClient`, `CustomerProfileClient`, `QuestionnaireSender`, signin reset, `PolicyTable` menu, `PolicyComparison`, `BatchUploadModal`, `DeletePolicy`, `DashboardTour`, `PublicHeader` menu, `FloatingActionButton`, `UserMenu`, `RoleSwitcher`, `AppShell` drawer, `ProcessingHUD` | Migrate to `Modal` or attach `useDialog` + dialog roles (menus get `role="menu"` + arrow-key nav instead) | H |
| `aria-live` scarcity | 3 files repo-wide vs. async flows everywhere (upload progress, analysis polling, checkout redirect) | Add polite live regions to `ProcessingHUD`, analysis status, upload dropzone, and the form-kit error summary | H |
| Toast-only validation | all forms (R7) | Form kit (Cluster D) | H |
| No skip link; single `<main>` landmark inconsistently labeled | `AppShell` | Skip link + `id="main"` | M |
| `text-[10px]`/`text-[9px]` (406 uses) for functional text | pills, kickers, bottom-nav labels, table meta | Keep for decorative kickers/pills only; floor functional text at 12px in the type ladder | M |
| Touch targets | bottom nav ok (min-h-44); dense B2B table rows + icon buttons in card corners unverified | Verify 44px in Phase-6 checklist | M |

---

## 4. Component/system clusters & fix order

**Cluster A — Design tokens & palette** *(fix 1st)*
`app/globals.css` → `components/ui/EmptyState.tsx` → landing hex-heavy files → admin stone sweep → wallet-detail TONE_PILL sweep → `MASTER.md` doc sync.
Order: consolidate vars → retire `.arc-*` → mechanical hex/raw-class transform (reuse the proven 17 Jul two-tier transform) → doc.

**Cluster B — Layout / container / breakpoint system** *(fix 1st, parallel with A)*
`hooks/useResponsive.ts` → new `PageShell`/`PageContainer` primitive → `PolicyWalletClient` un-fork (delete `MobileAppShell`, `AgentMobileNav`, `MyProfileScreen` rewire) → `AgentClient`, `AccountClientPage` de-JS-fork → unprefixed-grid fixes (10 files).

**Cluster C — Shell & navigation**
`AppShell` (dead controls, badge, safe-area, drawer a11y, skip link, admin bottom nav) → `app/(protected)/layout.tsx` (parseRoles, active-role nav, notification-count strategy) → admin nav decision (`admin/layout.tsx` + `AdminSidebar`) → `proxy.ts` allowlist test.

**Cluster D — Form system**
New `lib/i18n/format.ts` + `components/ui/form/*` (Field, FieldError, useZodForm glue) → `AddPolicyClient`/`EditPolicyForm` → auth pages (incl. signin i18n + fake-biometric removal) → agent modals' forms → onboarding steps.

**Cluster E — Data display (tables/lists/filters)**
`ResponsiveTable` wrapper (column priority + card fallback) → `CustomerList` → `RenewalsClient`/`OpportunitiesClient`/`QuestionnairesClient`/`TeamClient`/`CommissionsClient`/`TasksClient` → admin tables (desktop-first but tablet-safe) → `PolicyTable` menu semantics.

**Cluster F — Dialog/overlay system**
Harden `components/ui/Modal.tsx` → migrate 21 focus-trap-less overlays (start with destructive: `Settings` delete-account, `CustomerProfileClient` remove, `AgentClient` disconnect, then admin trio, then the rest) → kill all 4 native `confirm()`s → fixed-bottom coordinator (cookie banner / install prompt / bottom nav).

**Cluster G — Route states & error surfaces**
Segment-level admin `loading/error` → per-route files for the 15 B2C/B2B gaps → convention doc + (optional) CI check.

**Cluster H — Shared async/polling state**
One `usePollWithBackoff` (visibility-aware) consumed by wallet analyzing poll, `AnalysisCard`, `NotificationWatcher`, `NotificationHistory`; badge count moved out of the server layout.

**Cluster I — Trust & security-adjacent UX**
Remove fake biometric block → destructive-confirm pattern (F) → TrustStrip vocabulary on upload/share/checkout/delete → substantiate or remove "AES-256"-style claims → decide and label TEST-mode Stripe surfaces in admin billing ops.

**Cluster J — Dead code & duplication removal** *(cheap, do alongside A/B)*
`MobileAppShell`, `AgentMobileNav`, `PullToRefresh`, `SwipeableCard`, `wallet/EmptyState`, `UserDashboard`, `AddPolicyForCustomerModal`, signin biometric block, `skeleton.tsx` merge, BOM strip.

---

## 5. Priority plan (phased)

### Phase 1 — Blocking shared fixes (unblocks everything else)
- **Files:** `app/globals.css`, `hooks/useResponsive.ts`, `app/(protected)/layout.tsx` (parseRoles + nav), `components/shell/AppShell.tsx` (dead controls + safe-area + badge), delete-list from Cluster J.
- **Goal:** one token layer, one breakpoint contract, a shell that doesn't lie, no dead code muddying later sweeps.
- **Risks:** `.arc-*`→`.pw-*` retirement changes button radii on 4 agent files (visual review on preview); role-nav change affects dual-role accounts (test `"policyholder,agent"` fixtures).
- **Verify:** `npm run build` CSS diff review; Playwright smoke (`--project=chromium --project=agent-chromium`); manual: mobile language toggle actually switches; badge shows; iPhone safe-area.

### Phase 2 — Shared responsive system
- **Files:** new `components/ui/PageShell.tsx`, `PolicyWalletClient` un-fork + delete `MobileAppShell`/`MyProfileScreen` rewire, `AgentClient`, `AccountClientPage`, 10 unprefixed-grid files.
- **Goal:** single component tree per page, CSS-first; wallet feature-complete on mobile; tablet band (768–1024) coherent.
- **Risks:** wallet is the core screen — regression risk highest here; mitigate with `RUN_VISUAL=1` baselines before/after and the wallet E2E spec.
- **Verify:** wallet on 375/768/1024/1440: compare, batch upload, delete, consent, upgrade all reachable at every width; no hydration flash (throttled CPU); Playwright wallet spec green.

### Phase 3 — Shell / navigation completion
- **Files:** `admin/layout.tsx` + `AdminSidebar` (single-nav decision), AppShell drawer a11y + skip link + admin bottom nav, `RoleSwitcher` real switching, `/home`→`/dashboard` canonicalization, `proxy.ts` allowlist test.
- **Goal:** one navigation source of truth per role; admin usable on mobile; a11y-complete chrome.
- **Risks:** admin nav consolidation may orphan links — walk all 14 routes after.
- **Verify:** axe pass on shell; keyboard-only walk (drawer, menus, role switch); all admin routes reachable from the single nav.

### Phase 4 — Shared components (forms, dialogs, tables, states, formatting)
- **Files:** `Modal.tsx` hardening + 21-file overlay migration + 4 `confirm()` removals; form kit + `lib/i18n/format.ts`; `ResponsiveTable`; `EmptyState` tokenization; `StatusPill` adoption; Cluster G route-state files; Cluster H polling hook.
- **Goal:** every downstream page fix becomes an adoption, not an invention.
- **Risks:** widest blast radius — land as per-cluster PRs with unit tests (form kit, format helpers, poll hook are all unit-testable).
- **Verify:** unit suites for format/poll/form kit; axe on Modal stories; `RUN_UX_AUDIT=1` checklist suite.

### Phase 5 — B2C pages
- **Files:** wallet detail cards (TONE_PILL sweep), `AnalysisCard`, `PolicyTable`, add/edit forms, onboarding flow + `DashboardTour`, auth pages (signin i18n + biometric removal can land earlier under Cluster I), `home` locale + widgets on PageShell, coverage-insights route states, `NotificationHistory` i18n, cookie/install-prompt coordination, `Settings` delete-account dialog.
- **Goal:** B2C surface to fintech bar on all three form factors.
- **Risks:** signin is conversion-critical — copy changes reviewed bilingually.
- **Verify:** device pass (375, 390, 768, 1280) over: signup→onboard→upload→analyze→gap→upgrade; visual baselines.

### Phase 6 — B2B pages
- **Files:** agent dashboard split/streaming, `CustomerList` + the 6 table clients on `ResponsiveTable`, `InsightsClient` tokens, agent modals on `Modal`, `CustomerProfileClient`/`AgentClient` confirms, collaboration list bounds, admin: segment loading/error + stone→token sweep + i18n decision + 5 modal migrations.
- **Goal:** agents can genuinely run the book from a phone; admin coherent (desktop-first, tablet-safe).
- **Risks:** agent dashboard payload refactor touches revenue figures — keep `computeAgentBookRevenue` tests green.
- **Verify:** agent-chromium project + a 768px agent run; admin route walk at 1024.

### Phase 7 — Final polish & verification
- **Files:** landing Server-Components refactor (Stage-B) + hex sweep, `PublicHeader`, `/en` duplication decision, reduced-motion audit, type-ladder normalization of remaining `text-[Npx]`, MASTER.md rewritten to match reality (fixing the stale design-tokens.ts citation).
- **Goal:** marketing perf (< 200 KB gz first-load target), documented system future features (MEDIC) can follow.
- **Risks:** low — mostly mechanical.
- **Verify:** bundle-size measurement before/after; Lighthouse mobile ≥ 90 perf/a11y on landing, signin, wallet.

---

## 6. Verification checklist (per issue class)

- **Mobile (≤ 430px):** every P1-P6 page walked at 375×667 and 390×844; no horizontal body scroll; all actions reachable that desktop has (explicit wallet checklist: add, upload, batch, analyze, compare, share, delete, consent, upgrade); bottom nav never obscured by banners; safe-area respected (iOS simulator or real device).
- **Tablet (768–1024):** the former dead band — assert shell chrome and page content agree (no desktop-page-in-mobile-shell); tables show card fallback or intentional scroll with sticky header.
- **Desktop (≥ 1280):** container widths from `PageShell` only; sidebar + content no double-nav; 1440/1920 spot checks for max-width discipline.
- **Accessibility:** axe-core in the `RUN_UX_AUDIT=1` Playwright suite over shell + one page per cluster; manual keyboard-only journey per role (skip link → nav → primary action → dialog open/close → focus return); screen-reader smoke on signin + upload (NVDA or VoiceOver); every dialog = `useDialog`-or-`Modal` (enforce via a grep-based lint: `fixed inset-0` requires one of the two imports); forms announce errors (`aria-invalid` + live summary).
- **Consistency:** grep gates added to CI or a local script: no new raw `slate|stone|gray|zinc-*` classes outside `globals.css`; no new `#hex` in `.tsx` (allowlist for brand SVGs); no new `text-[Npx]` outside the ladder file; no new `window.confirm|alert`; `SCAN_ALL=1 check-i18n-hardcoded` count monotonically ↓ (baseline 61 → 0).
- **Performance:** first-load JS budgets recorded per route group (landing, wallet, agent dashboard) before Phase-2 and re-measured each phase; poller count per mounted page ≤ 1; layout does no uncached per-request queries; Lighthouse mobile on the 3 key pages each phase.
- **Trust/security UX:** no UI asserts a security property that code doesn't implement (checklist item on PR review); every destructive action has a branded confirm with consequences; sensitive flows (upload/share/checkout/delete) carry TrustStrip with linked substantiation; Stripe TEST-mode clearly labeled in admin until live keys.
- **Regression safety:** all six CI guardrails green per phase (`audit:api-auth`, `lint`, `lint:i18n-changed`, `lint:utf8`, `type-check`, unit + build); local `verify:migrations` (no schema changes expected in this program); Playwright standard trio (`chromium`, `agent-chromium`, `sentry`) before merge of Phases 2, 3, 5, 6; `RUN_VISUAL=1` baselines refreshed at Phase-2 start and diffed at each UI phase; deploy verification per repo habit (alias 200 / protected 307 smoke).

---

## Appendix — quick-win vs foundational split

**Quick wins (hours, no design decisions):** safe-area CSS class; badge id fix; `en-GB`→locale helper on home; delete 8 dead files; BOM strip; `parseRoles()` in the two layouts; admin segment `loading/error` pair; remove biometric block; 10 grid prefixes; stale globals.css comments.

**Foundational (own PRs, review on preview):** wallet un-fork; token/`.arc` consolidation; form kit; Modal adoption sweep; ResponsiveTable; admin single-nav; landing RSC refactor; role-aware nav for dual-role users.

**Counts for tracking:** ~120 distinct files carry at least one finding (90 raw-palette files, 60 hex-bearing files, 29 overlay files, 20+ route-state gaps — overlapping sets); 8 files are pure deletions; 10 shared-layer fixes retire the majority of per-file work.
