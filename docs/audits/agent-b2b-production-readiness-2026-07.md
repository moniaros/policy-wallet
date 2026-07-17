# PolicyWallet — Agent / B2B Production-Readiness Audit (v2, July 2026)

_Second full multi-lens audit of the agent/B2B product, run against the **live mainline `NEW-UI`** (post-#100–#125), not the stale base the first pass ([`agent-b2b-audit-2026-07.md`](agent-b2b-audit-2026-07.md)) used. Grounded in three parallel code sweeps (UX/prod-readiness, monetization/fencing, security/hygiene/tests) plus direct verification. Repo convention: **[GATES]** launch-blocking · **[SCALE]** before-scale · **[GROWTH]** optimization. Severity is orthogonal (critical/high/medium/low)._

> **Status note:** the four P0 privacy items in §5.A (A1/A2/B1/A3) and the seed guard (B10) were **fixed and shipped to prod while writing this audit** (PR #125). They are documented here for the record and marked ✅ FIXED. Everything else remains open.

---

## 1. Executive diagnosis

The agent product **cleared its launch-blockers** between the first audit and now. The severe cross-tenant breach the first pass found is gone: `lib/agent-visibility.ts` enforces that an agent sees a policy only if they uploaded it or hold a policy-scoped grant (a relationship is explicitly *not* consent), `isAgentRole` gates every agent action, the fabricated dashboard metrics are fixed (`computeAgentBookRevenue`), the `acordData` N+1 is denormalized (`coverageEndDate`), storage routes to the private bucket, and the retention crons run. This is a materially more mature product than six weeks ago.

What remains is **not** a broken core — it is three tails:

1. **A privacy tail behind the visibility model (now fixed).** The visibility model covered *policy reads* but three paths slipped past it: the renewal cron notified agents about policies they can't see (activated by reviving the cron), customer *identity* PII (name/phone/image) was returned for any unilaterally-created relationship, and private collaboration notes were filtered only client-side. All fixed in PR #125; documented in §5.

2. **An ~80%-unfenced tier matrix (the biggest open item).** `canAgentUseFeature()` — the one generic entitlement gate — has **zero call sites**. Six numeric caps + the token budget are honestly enforced; ~13 sold boolean features are unfenced (given to `agent_free`), sold-but-not-built (branded reports, API access), or dead flags. Agents upgrading to Pro/Agency today buy mostly caps. This is a monetization-integrity and honesty problem, not a security one. §9.

3. **A production-readiness / accessibility / consistency backlog.** Zero per-route error boundaries, seven agent modals with no dialog semantics or focus management (keyboard/SR users locked out), a notification dropdown wired to nothing, an inert rate limiter, an unindexed hot table, a two-palette design-system split, and a changed-files-only i18n guard hiding 106 literals. §3–§7.

**Verdict:** the product is closer to paid-agent readiness than the first audit implied, but three things gate it: finish the privacy tail (done), make the tier matrix honest (fence or stop selling), and clear the a11y/resilience backlog before you put keyboard/screen-reader agents or enterprise buyers in front of it.

---

## 2. Current-state journey map

| Stage | Current experience | The gap that matters |
|---|---|---|
| **Marketing / entry** | `/for-agents`, `/solutions/agents` | `/for-agents:64-83` still shows **wrong pricing** (Free 5 / Pro "unlimited" / €19 / €49, no Agency); `solutions/agents` sells a **"branded report PDF"** that doesn't exist. [GATES-honesty] |
| **Sign-up / qualification** | `/auth/signup/agent` → 4-step onboarding (welcome → branding → license → first invite) | Self-service; `verificationStatus` (pending/approved/rejected) exists with an admin workflow but **never gates any capability** — an unverified agent has full CRM/AI access. No trial or demo-request/sales-assist funnel (only Agency → /contact). |
| **Dashboard** | KPI strip, action queue, revenue pulse (real, deduped), portfolio health | Solid post-#121. `AgentPlanGate` blur on RevenuePulse leaves the value in the DOM. |
| **Client portfolio / CRM** | `/customers` list + `/customers/[id]` 360 | Policies correctly visibility-filtered; **identity PII was leaking** for unconsented relationships (✅ fixed §5.A2). |
| **Ingestion** | Smart upload (ΑΦΜ identify), private `policies` bucket | Agent onboarding docs + `/api/v1/upload` still target the nonexistent `uploads` bucket (broken). Documents API POST is a **mock** returning a stub signed URL. |
| **AI / gaps** | Per-policy analysis, gap detection, opportunity scoring, playbooks | Agent analyses always queue at priority 0 (`priorityQueue` computed from the B2C tier, not the agent tier). Playbook read PII on bare relationship (✅ fixed §5.A3). |
| **Renewals** | Full pipeline + the revived cron | **Cron leaked non-visible policy data to agents** (✅ fixed §5.A1). `renewalAutomation` (sold Pro+) is unfenced and there is no auto-sequence. |
| **Collaboration** | Per-customer inbox, threads, proposals, doc-requests | **Private notes leaked** to the policyholder (✅ fixed §5.B1). No `/collaboration` inbox index (404); thread "back" goes to `/notifications`, not the customer. |
| **Reports / branded output** | Onboarding collects logo/brand | **No agent branded report/PDF exists** — the marquee feature is sold, unbuilt. |
| **Billing / packaging** | 4 tiers, Stripe checkout/portal/cancel wired | Numeric caps enforced; **~13 sold flags unfenced** (§9). Agent token top-ups priced but unpurchasable. Agency billing flat, not per-seat. |
| **Notifications / support** | Bell + `/notifications` page | **Bell dropdown never fetches** its list and hides the "view all" link when empty → dead-end. No agent-specific support surface. |

---

## 3. Screen-by-screen UX/UI gap audit (loading / error / empty)

Two app-wide fallbacks: `(protected)/loading.tsx` (generic skeleton) and `(protected)/error.tsx` (localized, scoped, `reset()`+Sentry). **No agent route has its own `error.tsx`** — every failure hits the one shared boundary. Empty-state coverage is actually strong (`EmptyState` used across list pages). The gaps:

| Route | Own loading | Own error | Empty | Issue |
|---|---|---|---|---|
| `/dashboard/agent` | inherits | shared | — | raw `<div>Access Denied…</div>` fallback (`page.tsx:31`) |
| `/customers` (+`[id]`) | yes | shared | yes | identity mask (✅ fixed) |
| `/opportunities` | yes | shared | yes | — |
| `/renewals` | inherits | shared | yes | — |
| `/commissions` | yes | shared | yes | **ungated** (§9) |
| `/questionnaires` | inherits | shared | yes | table `overflow-hidden` clips on mobile (`:531`) |
| `/tasks` (+`[id]`) | yes | shared | yes | — |
| `/insights` | yes | shared | yes | raw `<div>Access Denied</div>` (`page.tsx:9`) |
| `/team`, `/activity` | inherits | shared | yes | — |
| `/notifications` | inherits | shared | client | raw English `Error loading notifications data.` (`page.tsx:15`) |
| `/agent/settings`, `/agent/pricing` | inherits | shared | n/a | pricing not in nav |
| `/collaboration/threads/[id]` | inherits | shared | notFound | English header; back → `/notifications` |
| `/collaboration` (index) | — | — | — | **does not exist → 404** |

**High-impact UX defects:**
- **NotificationBell is a dead-end.** `NotificationBell.tsx:22` only consumes `initialNotifications` (default `[]`) and never fetches; its only caller passes just the count (`UserMenu.tsx:62-63`). The "view all notifications" footer renders only when `notifications.length > 0` (`:214`), so an empty list has **no link to `/notifications`**. Badge shows N unread, dropdown always says "No notifications yet." Also fully English + no `role`/`aria`.
- **Mobile "more" tab is a mislabeled deep-link.** `AppShell.tsx:77` — the bottom-nav "more" (MoreHorizontal) routes straight to `/account`; renewals/commissions/questionnaires/tasks/team are reachable on mobile only via the hamburger drawer. Also a dead notification-badge branch (`:307`, no nav item has id `notifications`).
- **Two raw unstyled English "Access Denied" fallbacks** bypass the shell (insights, dashboard/agent) — no layout, no localization, no recovery.

---

## 4. Production-readiness checklist (pass / fail)

| Check | Status | Evidence |
|---|---|---|
| Route-level error boundaries | ❌ FAIL | only the shared `(protected)/error.tsx` |
| Loading states | ✅ PASS | 10 `loading.tsx` + generic fallback |
| Empty states | ✅ PASS | `EmptyState` across list pages |
| Modal accessibility | ❌ FAIL | 7 modals + shared `Modal.tsx`: no `role="dialog"`/`aria-modal`/focus-trap/return; only `CreateTaskModal` has Escape |
| Keyboard operability | ❌ FAIL | 6/7 modals not Escape-dismissable; no focus management |
| Localization | ⚠️ PARTIAL | 106 bilingual-ternary literals unguarded; NotificationBell + 2 fallbacks English-only |
| Rate limiting | ❌ FAIL | `rate-limit.ts:17-22` fixed 10/60s ignores per-route limits; `bulk-import` unthrottled |
| Tenant isolation (policies) | ✅ PASS | `agent-visibility` applied on all verified read paths |
| Tenant isolation (identity/notes) | ✅ FIXED | §5 (PR #125) |
| Entitlement enforcement | ❌ FAIL | `canAgentUseFeature` 0 call sites; ~13 flags unfenced |
| Audit trail (agent PII reads) | ❌ FAIL | no read-access log; `ActivityLog` admin-shaped, misused |
| DB indexing (hot path) | ❌ FAIL | `AccessGrant` has no `@@index` |
| Document confidentiality | ⚠️ PARTIAL | private bucket only; no per-viewer signed URL; mock POST route |
| Seed safety | ✅ FIXED | prod guard (PR #125) |
| Test coverage (agent isolation) | ❌ FAIL | helper unit-tested; no test proves services apply it; renewal/collab/fencing untested |

---

## 5. Security / privacy / compliance audit

### A. Tenant isolation & PII (visibility model + the tail)
`agent-visibility` is correctly applied on getCustomers/getCustomerProfile (policies), agent-portal.service, cross-sell.service, customer-resolution, insights, dashboard gaps, protection-scores route. The tail:
- **A1 ✅ FIXED [GATES, high]** — `renewal.service.runRenewalCheck` notified *any* linked agent about *every* expiring policy an owner has, incl. self-uploaded ones. Newly live once the cron was revived. Now gated on `isPolicyVisibleToAgent`.
- **A2 ✅ FIXED [GATES, high]** — `getCustomers`/`getCustomerProfile` returned name/phone/image for any relationship (created unilaterally on any email) → GDPR identity disclosure + email-enumeration oracle. Now gated via `lib/agent-consent.ts` (consent / phantom / ≥1 visible policy).
- **A3 ✅ FIXED [med]** — `agent-playbook.generatePlaybook` read `policyholderProfile` PII on bare relationship; now consent/visibility-gated.

### B. Other security/privacy
- **B1 ✅ FIXED [GATES, high]** — collaboration `isPrivate` agent notes filtered client-side only; `getThreadDetail` now filters server-side for non-agent viewers.
- **B2 [SCALE, med]** — `rate-limit.ts:17-22` builds one fixed `slidingWindow(10,"60s")`; per-route `limit`/`window` are ignored in prod. The global `/api` limit is really 10/60s; declared route limits are silently wrong.
- **B3 [SCALE, med]** — `bulk-import` (`route.ts:18`) has no per-user rate limit (entitlement caps bound batch size, not frequency).
- **B4 [SCALE, med]** — documents POST (`route.ts:55,85`) stores a **mock** `storage.googleapis.com` URL and returns a stub signed URL; no per-viewer signed-URL issuance anywhere; confidentiality relies entirely on the `policies` bucket staying private.
- **B5 [GATES, med, functional]** — `uploads`-bucket callers still broken (agent onboarding docs `onboarding/agent/actions.ts:78`, `/api/v1/upload` for collaboration/documents/profile).
- **B6 [POLISH, low]** — `proxy.ts:153,174` route on client-writable `user_metadata.role`. Not exploitable for data (all server paths authorize on DB `isAgentRole` + `getPolicyAccess`); cosmetic/routing only. Switch to `app_metadata` for defense-in-depth.
- **B7 [SCALE, med, GDPR]** — no read-access audit when an agent views a client's portfolio/PII.
- **B8 [SCALE, med]** — `ActivityLog` is admin-shaped (`adminUserId/isBreakGlass`) but written with agent/user ids; pollutes break-glass audit. Add an `actorUserId` log or separate streams.
- **B9 [SCALE, low-med, compliance]** — `AiDisclaimer` present only on B2C surfaces; agent gap/recommendation/protection-score views render AI-derived data with no disclaimer.
- **B10 ✅ FIXED [high-if-run]** — `prisma/seed.ts` prod guard added.
- **B11 [med]** — consent gate covers agent-initiated *AI analysis* but not rule-based cross-sell derivations (lower severity; policies are already visibility-filtered).

---

## 6. Code / data cleanup plan

- **Orphans (delete):** `components/agent-rise/{Policymodules,ProfileSharing,PublicShareView,types}.tsx` (zero refs); `components/collaboration/SharedPolicyRoom.tsx` (only its interface is used).
- **Dead:** `requirePayingUser` (`lib/auth-helpers.ts:71`, no callers); `lib/billing-catalog.json` (no code refs). (`getIsPayingUser` is NOT dead — `layout.tsx:27`.)
- **Stale seed:** legacy `prisma/seed.js` defines a contradictory agent catalog (`ag-*` €0/€49/€199) that would mis-seed — remove.
- **No invite chokepoint:** invites are minted in ≥5 places; consolidate to one `createInvite`.
- **`ActivityLog` schema/usage mismatch** (§5.B8).
- **Dead UI branches:** `AppShell.tsx:307` notification badge (no nav item has the id); stubbed `console.log('📊 Track')` telemetry (`OnboardingFlow.tsx:196`); orphan `/customers/invite` route (zero inbound links).

## 7. Design-system correction plan

- **Two palettes:** agent pages use `slate-*`; the rest of the app (tokens, B2C, and the agent *modals*) use `stone-*` — so a slate page opens a stone modal. Normalize agent pages to `stone-*`/tokens.
- **`arc-*` legacy duplicated + drifts:** `globals.css:312-364` copies the `pw-card` recipe into `.arc-card`/`.arc-btn`, but dark variants differ (border/ring). Alias `arc-*` to the `pw-card` recipe (single source) or migrate agent pages to `pw-card`.
- **Table consistency:** questionnaires table `overflow-hidden` → `overflow-x-auto` (every other agent table already scrolls).
- **Modal system:** route all agent modals through a hardened shared `components/ui/Modal.tsx` (dialog semantics + focus management) instead of seven hand-rolled `fixed inset-0` divs.
- **Form labels:** associate `<label htmlFor>`/`id` in AddCustomer/CreateTask/AddPolicy/Invite modals (OpportunityUpdate/BulkImport already do).

## 8. 30 / 60 / 90-day roadmap

**30d — integrity/privacy (mostly done):** the four privacy fixes + seed guard ✅ (PR #125); fence `/commissions` + proposals/doc-requests/rooms/cross-sell; fix `/for-agents` pricing + the `solutions/agents` branded-report claim; verify agent Stripe price IDs in prod.
**60d — production readiness:** modal a11y + shared Modal; NotificationBell data path; per-route error boundaries + localized Access-Denied; rate-limit config + bulk-import throttle; `AccessGrant` index; storage mock retire + `uploads`-bucket callers; read-access audit + `ActivityLog` split + `AiDisclaimer` parity; design-system unification; `/collaboration` inbox; i18n full-tree guard; the missing tests.
**90d — growth:** build the agent branded-PDF report; agent trial/demo-request + sales-assist; agency per-seat/consolidated billing + book-import SKU; make `verificationStatus` gate capability (IDD); agent token top-up checkout; `coverageEndDate` backfill.

## 9. Pricing / packaging implications — the fencing matrix

`canAgentUseFeature()` (`subscription-entitlements.ts:308`) has **zero call sites**. Enforced honestly: `maxCustomers`, `maxPoliciesPerCustomer`, `aiAnalysesPerMonth`, `monthlyTokenBudget`, `bulkImportLimit`, `teamMembers`. Everything else:

| Sold feature | Sold at | Enforced? | Action |
|---|---|---|---|
| commissionTracking (`/commissions`) | Pro+ | ❌ role-gated only | gate on `commissionTracking` |
| proposalFlow / documentRequestFlow / sharedPolicyRoom | Starter+ | ❌ given to `agent_free` | fence at Starter (the wedge) |
| crossSellIntelligence | Pro+ | ❌ open to all | fence agent entry points |
| renewalAutomation | Pro+ | ❌ + no automation | fence batch/auto; keep manual on Starter |
| priorityQueue | Pro+ | ❌ computed from B2C tier (agents=0) | honor `resolveAgentEntitlements` in `orchestrator.service.ts:429` |
| questionnaireTemplates (free=0) | Starter+ | ❌ no count check | enforce before create |
| pipelineAnalytics | Starter+ | ⚠️ UI-blur only | server-withhold |
| brandedPortal / brandedReports | Starter+ | ❌ **not built** | build or stop selling |
| apiAccess | Pro+ | ❌ **not built** | stop selling until built |
| portfolioGapView / analysisComparison / savingsReportExport / privateNotes (agent keys) | — | ❌ dead flags | wire or remove |

**Packaging gaps:** agent token top-ups priced but unpurchasable (`tokens/purchase` uses the B2C path and blocks non-paid B2C tiers); agency billing flat (not per-seat/consolidated); public-pricing Agency still purchasable vs protected→/contact; `AgentPlanGate` is a client-side blur (data in the DOM). **Verify** agent Stripe price IDs are provisioned in prod (`scripts/setup-billing-catalog.ts`) — the migration ships placeholders.

## 10. KPI framework

| Class | Metric | Instrument |
|---|---|---|
| Activation | onboarding-completed, first client invited, first analysis run, time-to-first-value | journey events |
| Time-to-value | minutes signup→first gap surfaced | timestamps |
| Renewal save rate | renewals `renewed_*` / total at-risk (now that the cron + A1 gate are live) | PolicyRenewal pipeline |
| Agent productivity | clients/agent, analyses/agent/week, renewals processed/agent-hour | usage |
| Retention | agent WAU, book-under-management, invited-client activation | usage |
| Expansion | cap-hit→upgrade, Starter→Pro (once fenced), seats added | funnel |
| Trust | read-access audit completeness, consent-acceptance, NPS | audit + survey |

## 11. Target-state vision

A **verified, consent-based, audit-trailed, accessible** agent workspace where: policy *and* identity visibility both follow the same consent model (done); the renewal ladder fires and only surfaces policies the agent may see (done); what's sold is what's enforced, so a Starter→Pro upgrade buys visible capability; branded reports and a cross-client inbox make the agent look good to clients; every screen is keyboard- and screen-reader-operable and degrades gracefully; and every imported client is a zero-CAC network node. The product has cleared its launch-blockers — the work now is honesty (fence the matrix), polish (a11y/resilience), and the two marquee builds (branded reports, agency billing) that turn a working tool into a product agencies pay to expand on.

---

_Audit basis: three parallel Explore sweeps over `NEW-UI` (post-#125) + direct verification. P0 privacy remediation shipped in PR #125. P1a (fencing) and P1b (prod-readiness) tracked as follow-on branches off `NEW-UI`._
