# UI Foundation Audit — shared components & app shell (July 2026)

**Scope:** the **app** surfaces (B2C, agent B2B, admin) and the **shared component layer**. The marketing surface was already disciplined by Brand Elevation A–D (one type ladder, one palette, one CTA pair); the app surfaces never got that pass and a prior review graded mobile-first UX **C+**.

**Method:** two full codebase sweeps (shared primitives; app shell/layouts/nav), with every load-bearing claim verified first-hand against the file. Findings are split per the house rule: **broken / defective** (gates) vs **inconsistent / maintainability** (does not gate — separate backlog).

**Branch:** `claude/ui-foundation-audit-gtm05i`. Batches 0–2 are shipped; 3–5 are the active backlog.

---

## A. BROKEN / a11y-defective — these gate

| # | Finding | Status |
|---|---------|--------|
| **B1** | `components/ui/Modal.tsx` — every shared modal was **edge-to-edge below 512px**. The `p-4` gutter sat on a **childless** backdrop while the panel was `fixed`-centred `w-full max-w-lg`, so it never constrained anything. Affects AiConsentModal, UpgradeModal, DocumentPreview, CollaborationPanel. | ✅ Batch 1 |
| **B2** | `components/ui/AiConsentModal.tsx` — the **GDPR Art. 9 consent dialog had no accessible name** (neither `ariaLabel` nor `ariaLabelledBy`), announcing as an unnamed dialog. Its save-failure message was also rendered silently. | ✅ Batch 1 |
| **B3** | `components/ui/ProcessingHUD.tsx` — full-screen **blocking** overlay with no `role`/`aria-live`/`aria-busy` (nothing announced while it covered the page), hardcoded English ("Please Wait" / "Processing action...") shown to Greek users, banned `font-black`, no mobile gutter. | ✅ Batch 1 |
| **B4** | `components/agent/AddCustomerModal.tsx` — `aria-labelledby="add-customer-title"` pointed at an id present in **1 of 4 views**; the other three announced with a dangling reference and no name. Success view was hardcoded English **even though the el/en keys already existed**. | ✅ Batch 1 |
| **B5** | **Admin double shell** — `(protected)/layout.tsx` renders a translated 10-item AppShell sidebar (w-72); `(protected)/admin/layout.tsx` then nested `AdminSidebar` (14 **hardcoded-English**, off-brand `stone-*`) **plus a second `<main>` inside AppShell's `<main>`**. Invalid landmark nesting, ~512px of nav chrome on desktop, and the two lists **disagreed** — AppShell lacked Policies / Submissions / AI Tokens / Activity, so four admin sections were unreachable from the sidebar an admin actually sees. | ✅ Batch 2 |
| **B6** | `components/shell/AppShell.tsx` — admins got an **empty fixed 76px bottom bar** on mobile (`getBottomNavItems` returns `[]` but the `<nav>` rendered unconditionally) plus a `pb-24` gutter reserving space for it. | ✅ Batch 2 |
| **B7** | `hooks/useResponsive.ts` + `components/wallet/PolicyWalletClient.tsx` — `useIsMobile` initialised `false` and set the real value in an effect, so **a phone painted the desktop wallet then swapped** to `MobileAppShell` after mount. Its breakpoint was **768px** while the shell switches chrome at **1024px**, so 768–1023px got mobile chrome around a desktop layout. | ✅ Batch 2 |
| **B8** | `components/layout/MobileAppShell.tsx` — profile actions navigated to `/account/edit`, `/account/payment`, `/account/settings`, `/auth/signout`. **None exist**; every action on that screen 404'd. | ✅ Batch 2 |
| **B9** | **No skip link and no `<main>` landmark target anywhere in the authenticated app**; nav landmarks unlabelled (2–3 unnamed per screen); `MainNav` + bottom bar were `<button>`+`router.push` (no middle-click, no open-in-new-tab, "button" not "link" to a screen reader); desktop MainNav had no `aria-current`. | ✅ Batch 2 |
| **B10** | `components/ui/SwipeableCard.tsx` — un-revealed action buttons were hidden by **opacity alone**, so they stayed tabbable and announced: an invisible tab stop firing destructive actions ahead of the card. Actions remain **touch-only** (no mouse/keyboard path). | ⚠️ Tab-trap fixed Batch 1; **desktop affordance still open → Batch 4** |
| **B11** | `components/ui/FloatingActionButton.tsx` — expanded menu had **no Escape**, a bare-div backdrop, and no `aria-expanded`/`aria-haspopup`: no keyboard way out. | ✅ Batch 1 |
| **B12** | **~25 hand-rolled `fixed inset-0` overlays bypass `Modal`.** Worst: `admin/users/UsersClient.tsx` ×4 (no role/aria/Escape/focus-trap/scroll-lock). The 8 agent modals at least reuse `useDialog`. | ❌ Open → Batch 4 |

---

## B. INCONSISTENT / maintainability — does not gate

- **No container primitive.** 8+ page widths in use (`max-w-7xl` dominant at 32×; plus 4xl/6xl/5xl/3xl/`[1200px]`/`[1400px]`/`[1240px]`) against 3+ padding idioms. `pw-page-shell` carries no width; admin pages use a flat non-responsive `px-4`. → `PageContainer` shipped in Batch 2; **page adoption is Batch 5**.
- **No shared form primitives.** No `Input`/`Select`/`Textarea`/`Label`/`FieldError` — **111 raw `<input>` across 33 files**, with one agent recipe copy-pasted **17×**. → Batch 3.
- **No shared Table.** 24 hand-rolled tables. The `overflow-x-auto` strategy is at least uniform — except `BulkImportModal`, which lacks even that. → Batch 3.
- **6 button families**: `.pw-*`, `.arc-btn-*`, shadcn `Button` (~dead: 2 imports), `BrandActionButton` (`rounded-xl`, violates the pill rule), `EmptyState.ctaClasses`, raw. → Batch 4.
- **6 card patterns**: `.pw-card` (53 files), verbatim alias `.arc-card` (15), shadcn `Card`, `BrandCard`, ad-hoc `rounded-2xl` (37 files). → Batch 4.
- **2 Skeletons** (`LoadingSkeleton` on off-brand `stone`), plus 22 files hand-rolling `animate-pulse`. → Batch 4.
- **614 raw hexes across 115 files**, including shared `EmptyState`, `TrustStrip` (no `dark:` variants at all), `ConfidenceBadge`, `ConsentStatusBadge`. Four overlapping token systems coexist in `globals.css` (shadcn vars, `--pw-*`, `--brand-*`, the neutral ramp). → Batch 4.
- **Hardcoded English in shared components**: `Modal`'s `closeLabel="Close"` default; `FloatingActionButton`'s `'Add'`; (fixed in Batch 1: ProcessingHUD, AddCustomerModal success, FAB labels; AdminSidebar deleted in Batch 2).
- **Dead code** (deleted in Batch 2): `components/layout/AgentMobileNav.tsx`, `components/admin/AdminSidebar.tsx`. Still dead: `MobileAppShell`'s non-home tabs (it only ever mounts on `/wallet`), `.design-sync/previews/ProcessingHUD.tsx`, `AccountClientPage`'s unused `isMobile`, and `useResponsive`'s unused `useBreakpoint`/`useMediaQuery` (both still carry the post-mount-update pattern `useIsMobile` was moved off — port before adopting).
- **Duplicated `/en` public route tree** (~30 pages, double maintenance). Noted; out of scope for this audit.
- **`MASTER.md` was materially stale** — fixed in Batch 0. Its canonical-value contract named `components/ui/design-tokens.ts`, **deleted in `834957c`**, as the tie-breaker; the `--space-*` table described variables that do not exist; the shadow table described `--pw-shadow-card`, which **nothing references** (`.pw-card` is flat/border-first); the card, input and modal specs contradicted the shipped code.

---

## C. Remediation plan

### ✅ Batch 0 — Truth (`1f2a630`)
`MASTER.md` repointed to `app/globals.css` as canonical, with the spacing/shadow/card/input/modal specs corrected to what actually ships and `font-black` + hand-rolled overlays + `design-tokens.ts` imports added as anti-patterns. `globals.css` header comment and a mislabelled `/* Secondary - Amber */` (it is dark brand green) fixed.

### ✅ Batch 1 — Shared overlay/feedback primitives (`211872b`)
B1, B2, B3, B4, B11, and B10's tab-trap. New `t.common.pleaseWait` / `processingAction` (el+en); new `Modal.ariaDescribedBy`.

### ✅ Batch 2 — Shell & container (`d0377d6`)
B5, B6, B7, B8, B9. `AdminSidebar` + `AgentMobileNav` deleted; `PageContainer` added and adopted by `PageHeader`; new `t.nav.submissions`/`aiTokens`/`skipToContent`/`primaryNavigation`/`bottomNavigation`.

### ✅ Wallet un-fork + shell completion (`6fa6074`, `399892e`)

A second audit — `docs/ui-responsive-audit-map.md`, produced independently and merged onto this branch — caught a **critical defect this audit missed**, and verifying it exposed a regression introduced by Batch 2.

**The mobile wallet silently lost five features.** `PolicyWalletClient` did `if (isMobile) return <MobileAppShell/>`, an early return sitting before `DeletePolicyDialog`, `BatchUploadModal`, `AiConsentModal`, `PolicyComparison` and `UpgradeModal`. On a phone the core screen could not delete, batch-upload, consent, compare or upgrade. **Batch 2's breakpoint change (768 → 1024) widened this from phones to tablets** — correct for the shell, wrong here.

The fix needed two layers; only the first is obvious:
1. Delete the fork. `PolicyWallet.tsx` already rendered both a table and a responsive card grid behind a user `viewMode`, so presentation just became CSS-first (cards always below `lg`; the toggle is `lg:`-only since below it, it was a no-op).
2. **`PolicyCard` accepted `onShare`/`onViewDocuments`/`onRunAnalysis`/`onDelete` and ignored all four** — those actions lived only in the desktop table's context menu. Un-forking alone would have mounted the modals with nothing able to open them. The card now carries the actions.

Also: the wallet's `UpgradeTriggerCard` existed **only** in the mobile tree, so `/wallet` on desktop had no upgrade trigger at all — it now renders at every width.

Shell completion (`399892e`): the mobile language toggle and the role switcher both called props the layout never passed (the switcher showed a "Viewing as X" toast for a switch that never happened); the mobile unread badge was keyed to an id no nav item has; `safe-area-inset-bottom` was applied but defined in no stylesheet; the drawer had no focus trap. Navigation was built from `roles[0]`, stranding dual-role users — now `parseRoles`/`getPrimaryRole` plus a validated `pw_active_role` cookie. `/home` and `/dashboard` were the same screen on two URLs; `/home` now 307s. New guardrail: `tests/unit/public-route-allowlist.test.ts` (65 routes, proven to fail on an unlisted one).

### ⬜ Batch 3 — Form + table primitives
Shared `Input`/`Textarea`/`Select`/`Label`/`Field` (token-driven, per the corrected MASTER spec) + `TableShell` (`overflow-x-auto` + consistent header styling). First adopters: the 17× agent-modal recipe, `BulkImportModal`'s unwrapped table, admin `UsersClient`.

### ⬜ Batch 4 — Consolidation
Retire `.arc-card` + `.arc-btn-*` (map to `.pw-*`); fold in and delete shadcn `Button`/`Card` (2 imports); `BrandActionButton` → pill; merge `LoadingSkeleton` onto the token palette; tokenize shared-component hexes (`EmptyState`, `TrustStrip` + `dark:`, `ConfidenceBadge`, `ConsentStatusBadge`); migrate the 4 `UsersClient` modals then the remaining ~20 overlays onto `Modal` (**B12**); give `SwipeableCard` a real mouse/keyboard affordance (**B10** remainder).

### ⬜ Batch 5 — Page adoption + guardrail
`PageContainer` adoption per section (admin → agent → B2C); add Mobile Chrome/Safari Playwright projects to the routine local pre-merge run; consider a hex-lint analogous to `check-i18n-hardcoded`.

---

## D. Verification

Every batch ran the CI-blocking set green: `type-check`, `lint`, `lint:i18n-changed`, `lint:utf8`, `lint:encoding`, `audit:api-auth`, `vitest --run tests/unit` (1227), and the production `build`. No API routes changed, so the route-policy inventory is untouched. New i18n keys were added to **both** `lib/i18n/translations/{el,en}.ts`.

**Playwright — run via the IPv4 pooler.** The dev Supabase direct host (`db.lzqvtvjggylcujenlelh.supabase.co`) is **IPv6-only**, and this machine currently has no global IPv6 address, so `global-setup` first died with a misleading "Can't reach database server". The project is not paused — it resolves fine on AAAA. The working fallback is the IPv4 session pooler:

```bash
export DATABASE_URL="postgresql://postgres.lzqvtvjggylcujenlelh:<pw>@aws-1-eu-west-3.pooler.supabase.com:5432/postgres?connection_limit=2&pool_timeout=60"
export DIRECT_URL="$DATABASE_URL"
export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

The pooler caps at 15 clients, so pass `--workers=3`.

Through the pooler, `global-setup` provisioned both users and **both auth setups signed in successfully** (`/dashboard` and `/dashboard/agent` reached) — so the app boots, auth works and both shells render under these changes. The test run itself then **stalled** with idle workers, and a follow-up single-spec run failed in `page.goto` with `net::ERR_ABORTED` — both traced to the leftover wedged dev server from the killed run holding port 3000, plus the system-Chrome executable this machine has to use. That is test-harness flakiness, not a product failure, but **the suite has still not been run to completion — do that before merging**:

```bash
npx playwright test --project=chromium --project=agent-chromium --workers=3
RUN_UX_AUDIT=1 npx playwright test --project=chromium --workers=3
```

Priority checks, given what changed: the admin section renders with a single sidebar and no empty bottom bar; nav links still navigate and close the mobile drawer; `/wallet` on a phone does not flash the desktop layout; the mobile profile screen's actions land on `/account` and sign-out works.

### Verified directly against a running dev server

Using the session cookies the auth setups produced, both shells were fetched and their markup asserted:

| Check | `/dashboard` (policyholder) | `/dashboard/agent` |
|---|---|---|
| HTTP | 200 | 200 |
| Skip link `href="#main-content"` | 1 | 1 |
| `id="main-content"` target | 1 | 1 |
| `<main>` elements (was 2 under admin) | 1 | 1 |
| Labelled nav landmarks | «Κύρια πλοήγηση» + «Γρήγορη πλοήγηση» | same |
| Sidebar rows as real `<a href>` / `<button>` | 8 / **0** | 13 / **0** |
| `aria-current="page"` | 1 | 1 |
| Bottom-nav rows as real `<a href>` | 5 | — |
| `AdminSidebar` markup present | no | no |

Skip-link copy rendered in Greek («Μετάβαση στο περιεχόμενο»), confirming the new keys resolve.

**B1 confirmed at the CSS layer:** `calc(100%-2rem)` is invalid CSS if emitted verbatim, so the gutter fix depended on Tailwind normalising it. The built stylesheet contains `.w-\[calc\(100\%-2rem\)\]{width:calc(100% - 2rem)}` — it does.

**Not directly renderable here:** the admin surface. `/admin/*` needs both the DB role and the Supabase JWT `user_metadata.role` claim (`proxy.ts`), and granting that meant mutating a user, which was declined. The admin fix is nonetheless structurally certain: `admin/layout.tsx` now returns only `<>{children}</>`, `AdminSidebar.tsx` is deleted with zero importers, and the surrounding AppShell provably renders exactly one `<main>` (above). **Still worth an eyeball on the preview deploy.**
