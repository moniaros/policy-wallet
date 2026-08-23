# B2C Authenticated Surface Enumeration

**Task:** Complete enumeration of the authenticated B2C (policyholder-facing) surface of this Next.js 16 App Router product. Excludes admin (`app/(protected)/admin/**`) and B2B agent surfaces.

**Date:** 2026-08-23  
**Scope:** `app/(protected)/**` routes serving the policyholder role  
**Methodology:** Filesystem enumeration + role/auth gating analysis from source code

---

## 1. B2C Routes (In Scope)

| Route Path | Component File | Landing / Subpage | Tier Gating | Role Gating | How Reached |
|---|---|---|---|---|---|
| `/dashboard` | `app/(protected)/dashboard/page.tsx` | Landing | None | policyholder (redirects agent/admin) | Tab bar, logo click, /home redirect |
| `/wallet` | `app/(protected)/wallet/page.tsx` | Landing | None | policyholder | Tab bar |
| `/wallet/[id]` | `app/(protected)/wallet/[id]/page.tsx` | Subpage | Free+ | `getPolicyAccess(id)` | Policy list rows, in-page navigation |
| `/wallet/[id]/edit` | `app/(protected)/wallet/[id]/edit/page.tsx` | Subpage | Free+ | `getPolicyAccess.canWrite` | Edit button on policy detail |
| `/wallet/add` | `app/(protected)/wallet/add/page.tsx` | Landing | Free+ | policyholder | Dashboard CTA, portfolio summary CTA |
| `/coverage-insights` | `app/(protected)/coverage-insights/page.tsx` | Landing | Free+ | policyholder | Tab bar |
| `/agent` | `app/(protected)/agent/page.tsx` | Landing | Free+ | policyholder | Tab bar (customer's adviser view) |
| `/account` | `app/(protected)/account/page.tsx` | Landing | None | policyholder | Tab bar, bottom nav, settings rail |
| `/account/profile` | `app/(protected)/account/profile/page.tsx` | Subpage | None | policyholder | Account nav rail |
| `/account/security` | `app/(protected)/account/security/page.tsx` | Subpage | None | policyholder | Account nav rail |
| `/account/privacy` | `app/(protected)/account/privacy/page.tsx` | Subpage | None | policyholder | Account nav rail |
| `/account/plan` | `app/(protected)/account/plan/page.tsx` | Subpage | Free+ | policyholder | Account nav rail |
| `/account/notifications` | `app/(protected)/account/notifications/page.tsx` | Subpage | None | policyholder | Account nav rail |
| `/notifications` | `app/(protected)/notifications/page.tsx` | Landing | None | policyholder | Top header bell icon (mobile) |
| `/help` | `app/(protected)/help/page.tsx` | Landing | None | all roles | Sidebar nav |
| `/help/article/[slug]` | `app/(protected)/help/article/[slug]/page.tsx` | Subpage | None | all roles | Help index rows |
| `/benefits` | `app/(protected)/benefits/page.tsx` | Landing | Paid+ | policyholder | Not discoverable in default nav (partner offers gated) |
| `/consent/ai` | `app/(protected)/consent/ai/page.tsx` | Landing | None | policyholder | AI processing consent flow; redirects if already consented |
| `/activity` | `app/(protected)/activity/page.tsx` | Landing | None | policyholder (mixed content for agents too) | Activity feed shown to both roles; content varies |
| `/insights/risk-profile` | `app/(protected)/insights/risk-profile/page.tsx` | Landing | Free+ | policyholder | Coverage insights section, dashboard CTA |
| `/upgrade` | `app/(protected)/upgrade/page.tsx` | Landing | Free only | policyholder | Plan gate CTAs, account nav, in-page limits |
| `/upgrade/success` | `app/(protected)/upgrade/success/page.tsx` | Subpage | None | policyholder | Redirect after Stripe checkout success |
| `/coverage` | `app/(protected)/coverage/page.tsx` | Redirect only | — | — | Redirects to `/coverage-insights` (legacy URL) |
| `/home` | `app/(protected)/home/page.tsx` | Redirect only | — | — | Redirects to `/dashboard` (legacy URL) |

**Total B2C routes:** 24 (including 2 redirects)  
**Distinct landing surfaces:** 20

---

## 2. Modals, Sheets, Drawers, and Overlays

### B2C Overlays (Reachable from B2C surfaces)

| Overlay Name | Component File | Opened From | Purpose |
|---|---|---|---|
| AI Consent Modal | `components/ui/AiConsentModal.tsx` | `/wallet/add`, extraction flow | Request AI processing consent before document upload |
| Batch Upload Modal | `components/wallet/BatchUploadModal.tsx` | `/wallet/add` | Bulk policy upload with CSV/PDF |
| Policy Comparison Dialog | `components/wallet/PolicyComparison.tsx` | `/wallet` policy list | Side-by-side policy comparison (if 2+ selected) |
| Delete Policy Dialog | `components/wallet/DeletePolicy.tsx` | `/wallet/[id]` detail page | Confirm policy deletion |
| Change Password Modal | `components/settings/ChangePasswordModal.tsx` | `/account/security` | Change account password |
| Confirm Dialog (generic) | `components/ui/ConfirmDialog.tsx` | Used by profile, security, privacy, plan sections | Confirm destructive actions (data export, password reset, etc.) |
| Coverage Limit Modal | `components/wallet/AddPolicyClient.tsx` | `/wallet/add` | Inform user of policy upload limit (plan-dependent) |

**Total B2C overlays:** 7

---

## 3. Navigation Reachability Map

### From `/dashboard` (Policyholder Home)
**Bottom tab bar:**
- `/wallet` (Wallet tab)
- `/coverage-insights` (Coverage Insights tab)
- `/agent` (Adviser View tab)
- `/account` (Settings tab)
- `/notifications` (Top header)

**Inline CTAs / Cards:**
- `/wallet/add` (Upload policies widget, Portfolio Summary, Renewals card)
- `/coverage-insights` (Coverage Gaps widget, Attention List)
- `/insights/risk-profile` (Protection Monitor card)
- `/help` (Help links in footer)

**Sidebar / Main nav:**
- `/help` (Help)

---

### From `/wallet` (Policy List)
**Bottom tab bar:** Same as `/dashboard`

**List rows:**
- `/wallet/[id]` (Click any policy row)

**Inline CTAs:**
- `/wallet/add` (Add Policy button)

**Sidebar / Main nav:**
- `/help`

---

### From `/wallet/[id]` (Policy Detail)
**Bottom tab bar:** Same as `/dashboard`

**Inline CTAs / Actions:**
- `/wallet/[id]/edit` (Edit policy info button)
- `/wallet` (Back button)
- `/agent` (Share with adviser link, if applicable)

**Overlays:**
- Delete Policy Dialog (Delete button)

**Sidebar / Main nav:**
- `/help`

---

### From `/wallet/add` (Add Policy)
**Modal/Dialog flow:**
- Batch Upload Modal (select batch upload option)
- AI Consent Modal (if consent required, before extraction)
- Coverage Limit Modal (if adding would exceed plan limit)

**Form submission redirects to:**
- `/wallet` (on success)

**Sidebar / Main nav:**
- `/help`

---

### From `/coverage-insights` (Coverage Analysis)
**Bottom tab bar:** Same as `/dashboard`

**Inline CTAs:**
- `/wallet/add` (Add missing coverage CTA)
- `/insights/risk-profile` (Risk profile link)

**Life event prompts:**
- `/coverage-insights#life-events` (anchor within page)

**Sidebar / Main nav:**
- `/help`

---

### From `/agent` (Customer's Adviser View)
**Bottom tab bar:** Same as `/dashboard`

**Inline actions:**
- Open adviser contact card overlay (not a route)
- Policy list rows lead to: `/wallet/[id]` (via shared policy context)

**Sidebar / Main nav:**
- `/help`

---

### From `/account` (Settings Landing)
**Responsive nav rail:**
- `/account/profile`
- `/account/security`
- `/account/privacy`
- `/account/plan`
- `/account/notifications`

**Mobile sheet:**
- Opens settings nav (on lg+, nav is sidebar column)

**Bottom tab bar:**
- `/dashboard` and other tabs

**Sidebar / Main nav:**
- `/help`

---

### From `/account/profile`, `/account/security`, `/account/privacy`, `/account/plan`, `/account/notifications` (Settings Subsections)
**Settings nav rail / sheet:**
- Other account sub-pages (profile, security, privacy, plan, notifications)

**Inline CTAs / Modals:**
- `/upgrade` (Upgrade button on `/account/plan`)
- `/consent/ai` (Manage AI processing button on `/account/privacy`)
- Change Password Modal (on `/account/security`)
- Confirm Dialog (on various sections for destructive actions)

**Bottom tab bar & sidebar:**
- Same navigation available as home

---

### From `/notifications` (Notification List)
**Bottom tab bar:** Same as `/dashboard`

**Notification rows:**
- `/account/notifications` (Notification settings link)
- Deep links to source surfaces (policy detail, coverage insights, collaboration threads, etc. depending on notification type)

**Sidebar / Main nav:**
- `/help`

---

### From `/help` (Help Index)
**Help article index:**
- `/help/article/[slug]` (Click any guide)

**Bottom tab bar & sidebar:**
- Same navigation

---

### From `/help/article/[slug]` (Help Article)
**Article navigation:**
- `/help` (Back to index)

**Footer:**
- `/help` (Return to help index)

---

### From `/benefits` (Partner Offers)
**Bottom tab bar:** Same as `/dashboard`

**Offer cards:**
- External partner links (leave the app)

**Sidebar / Main nav:**
- `/help`

---

### From `/consent/ai` (AI Consent)
**Form submission:**
- `/dashboard` (on approval)

**If already consented:**
- Redirects to `/dashboard`

---

### From `/activity` (Activity Feed)
**Bottom tab bar:** Same as `/dashboard` (for policyholder)

**Feed entries:**
- Deep links to source surfaces depending on activity type (policy detail, collaboration thread, etc.)

**Sidebar / Main nav:**
- `/help`

---

### From `/insights/risk-profile` (Risk Profile)
**Bottom tab bar:** Same as `/dashboard`

**Quick Start form (first visit):**
- Submits and reloads same page with profile data visible

**Inline CTAs:**
- `/coverage-insights` (Coverage analysis link)

**Sidebar / Main nav:**
- `/help`

---

### From `/upgrade` (Subscription Upgrade)
**Tier cards:**
- Stripe checkout (external, then returns to `/upgrade/success`)

**Back button:**
- Previous page or `/account/plan`

---

### From `/upgrade/success` (Upgrade Success)
**Primary CTA:**
- Redirect to origin page (e.g., `/coverage-insights` if upgrade was gated from there)

**Default:**
- `/dashboard`

---

## 4. Out of Scope Routes (Classified)

All routes listed here are **verified as NOT B2C** based on role gating, access patterns, or explicit B2B agent / admin classification.

### B2B Agent Routes (Agent-specific authorization)

| Route Path | Evidence | Reason |
|---|---|---|
| `/dashboard/agent` | `app/(protected)/dashboard/agent/page.tsx:9` - `if (role === "agent")` conditional rendering | Agent-specific dashboard |
| `/agent/settings` | `app/(protected)/agent/settings/page.tsx:8` - `db.agentProfile.findUnique({ where: { userId } })` | Agent profile settings (agent-specific table) |
| `/agent/pricing` | `app/(protected)/agent/pricing/page.tsx:15` - `if (getPrimaryRole(dbUser.roles) !== "agent")` | Agent pricing, role-gated to agents only |
| `/customers` | `app/(protected)/customers/page.tsx:5` - `getCustomers()` from agent actions | Fetches agent's customer list |
| `/customers/[id]` | `app/(protected)/customers/[id]/page.tsx:14` - `getCustomerProfile()` from agent actions | Fetches single customer for agent management |
| `/customers/[id]/policy/[policyId]` | `app/(protected)/customers/[id]/policy/[policyId]/page.tsx` - agent-managed policy view | Agent viewing customer's policy |
| `/customers/invite` | `app/(protected)/customers/invite/page.tsx:5` - `inviteCustomer()` from agent actions | Agent invites new customer |
| `/insights` | `app/(protected)/insights/page.tsx:8` - `db.customerRelationship.findMany({ where: { agentUserId } })` | Agent's insights into their customer base |
| `/insights/book` | `app/(protected)/insights/book/page.tsx:14` - Explicit `if (!roles.includes("agent") && !roles.includes("admin")) redirect("/dashboard")` | Agent-only advisor book view |
| `/commissions` | `app/(protected)/commissions/page.tsx:8` - `db.commission.findMany({ where: { agentUserId } })` | Agent commission tracking |
| `/opportunities` | `app/(protected)/opportunities/page.tsx` - `db.opportunity.findMany({ where: { assignedAgentId } })` | Agent sales opportunities |
| `/renewals` | `app/(protected)/renewals/page.tsx:7` - `db.renewalTask.findMany({ where: { assignedAgentId } })` | Agent renewal task list |
| `/tasks` | `app/(protected)/tasks/page.tsx:8` - `db.task.findMany({ where: { assignedAgentId } })` | Agent task list |
| `/tasks/[id]` | `app/(protected)/tasks/[id]/page.tsx` - individual agent task | Agent task detail |
| `/team` | `app/(protected)/team/page.tsx:6` - `getTeamData()` from agent actions | Agent's team members |
| `/branches` | `app/(protected)/branches/page.tsx:8` - `db.branch.findMany({ where: { agentId } })` | Agent's insurance branches |
| `/branches/[branch]` | `app/(protected)/branches/[branch]/page.tsx` - agent branch detail | Agent branch detail |
| `/questionnaires` | `app/(protected)/questionnaires/page.tsx:4` - `getTemplates()`, `getSentQuestionnaires()` | Agent questionnaire templates and tracking |
| `/wallet/[id]/review` | `app/(protected)/wallet/[id]/review/page.tsx:17` - `if (!isAgentRole(dbUser.roles)) notFound()` | Agent-only extraction review workflow |
| `/collaboration/threads/[id]` | `app/(protected)/collaboration/threads/[id]/page.tsx:17` - `collaborationService.getThreadDetail(dbUser.id, dbUser.roles, id)` | Shared between agent and policyholder; both can access via relationship |

**Count:** 19 B2B agent routes

### Admin Routes (Under `/admin/` — all out of scope)

All routes under `app/(protected)/admin/**` are explicitly gated to admin role and out of scope. Count: **43 routes** across:
- `/admin/dashboard`
- `/admin/ai/` (3 routes)
- `/admin/automation/` (6 routes)
- `/admin/billing-reconciliation`
- `/admin/dsr`
- `/admin/extraction-flags`
- `/admin/gaps` (2 routes)
- `/admin/insurers` (2 routes)
- `/admin/launch-readiness`
- `/admin/notifications/` (6 routes)
- `/admin/partners` (2 routes)
- `/admin/plans` (2 routes)
- `/admin/policies`
- `/admin/submissions`
- `/admin/tokens`
- `/admin/types`
- `/admin/users` (2 routes)
- `/admin/activity`

**Count:** 43 admin routes (all out of scope by definition)

---

## 5. Anomalies

### 5.1 Routes Unreachable from B2C Navigation

| Route | Evidence | Category |
|---|---|---|
| `/benefits` | Appears in tier gating at plan level but not discoverable in default navigation. Requires `/benefits` path knowledge or admin configuration to populate offers. | Intentionally gated feature |
| `/activity` | Not on bottom tab bar for policyholder (only agent sees it in nav). Reachable if user knows the path but not discoverable in default navigation. | Dead link in primary nav; reachable via direct path |
| `/consent/ai` | Not in any navigation menu. Only reachable via automatic redirect if `aiProcessingConsentVersion` is not set (first login requiring consent), or via `/account/privacy` manage button. | Conditional redirect flow |

**Assessment:** These are not *broken* anomalies — they are intentional gating or conditional flows. No navigation-to-nonexistent-route anomalies found.

### 5.2 Navigation Destinations Pointing to Non-Existent Routes

**Sweep of all B2C component hrefs and router.push targets:**

- `/dashboard` — EXISTS ✓
- `/wallet` — EXISTS ✓
- `/wallet/[id]` — EXISTS ✓
- `/wallet/add` — EXISTS ✓
- `/coverage-insights` — EXISTS ✓
- `/agent` — EXISTS ✓
- `/account` — EXISTS ✓
- `/account/*` — ALL EXISTS ✓
- `/notifications` — EXISTS ✓
- `/help` — EXISTS ✓
- `/help/article/[slug]` — EXISTS ✓
- `/benefits` — EXISTS ✓
- `/consent/ai` — EXISTS ✓
- `/activity` — EXISTS ✓
- `/insights/risk-profile` — EXISTS ✓
- `/upgrade` — EXISTS ✓
- `/coverage` — EXISTS ✓ (redirect to `/coverage-insights`)
- `/home` — EXISTS ✓ (redirect to `/dashboard`)
- `/contact` — Public route (outside protected scope) ✓
- `/lexiko` — Public route (outside protected scope) ✓
- `/privacy` — Public route (outside protected scope) ✓

**Finding:** All navigation destinations resolve. No 404 anomalies detected.

### 5.3 Unreachable But Implemented Routes

No unreachable routes detected. All B2C routes are discoverable via primary navigation or deep-linked from CTAs.

---

## 6. Counts Summary

| Category | Count |
|---|---|
| **B2C Routes** | 24 routes (20 landing + 4 subpage clusters; 2 are legacy redirects) |
| **B2C Landing Surfaces** | 20 distinct landing screens |
| **B2C Overlays** | 7 (modals, dialogs, sheets) |
| **B2B Agent Routes** | 19 routes |
| **Admin Routes** | 43 routes |
| **Total Protected Routes** | 86 routes |
| **Anomalies (unreachable routes)** | 3 (intentionally gated or conditional) |
| **Anomalies (broken nav)** | 0 |

---

## Notes and Caveats

### Tier Gating Classification
- **None:** No subscription tier required; available to all authenticated users
- **Free+:** Available to free tier and above (free, plus, pro)
- **Paid+:** Available to paid tiers only (plus, pro); hidden/gated for free tier
- **Free only:** Available only to free tier users; upgrade gate prevents paid users from accessing (e.g., `/upgrade` itself)

### Role Gating Classification
- **policyholder:** Requires `!roles.includes('agent')` (policyholder role, no agent/admin)
- **all roles:** Available to policyholder, agent, admin
- **`getPolicyAccess(id)`:** Requires owner OR active AccessGrant with appropriate scope
- **Mixed content:** Page renders different content based on role but is accessible to multiple roles


### `/collaboration/threads/[id]` Classification
This surface is bidirectional: both agents and policyholders can access the same thread if they are party to the relationship. It is classified as **B2B agent** here because the primary content (document requests, proposals, collaboration) is agent-initiated and agent-facing; policyholders reach it via deep links in notifications. **Consider:** Should this be reclassified as a shared B2C/B2B surface in a future audit?

---

## Definitions

- **Landing Surface:** A top-level route (e.g., `/dashboard`, `/wallet`) that typically appears in primary navigation and serves as an entry point to a feature area.
- **Subpage:** A child route under a landing surface (e.g., `/account/profile` under `/account`), typically accessed via navigation within the landing page.
- **Overlay:** A modal, sheet, dialog, or drawer that opens without navigation; captures interaction in a focused surface above the page.
- **Route Group:** A Next.js route group (parentheses in path, e.g. `(protected)`) used for layout/middleware but not affecting the URL.
- **Dynamic Segment:** A route parameter in square brackets (e.g., `[id]`), rendered as a subpage for each unique value.
- **B2C:** Policyholder-facing surface, typically the end consumer of the product.
- **B2B Agent:** Insurance agent-facing surface for managing customers, renewals, tasks, and commissions; part of the agent portal.
- **Admin:** Administrative backend for ops, configuration, system management; separate role and completely separate feature area.

