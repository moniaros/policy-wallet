# User personas, actions, and upgrade triggers

**Status:** reflects the July 2026 product revision (AI paywall + trial, consent-request flow, signup split, tier-gated teams). Role model: global roles `policyholder | agent | admin` (`lib/api-auth.ts`); tenant-scoped roles `owner | manager | member` on `TenantMembership` — "agent group admin" = tenant owner/manager, unlocked by plan tier (see Persona 6). Admin is provisioned out-of-band only.

## Persona 1 — Public page visitor (anonymous)
Pages: `/`, `/en`, `/pricing`, `/product` + 7 LoB pages, `/solutions`, `/company`, `/contact`, `/terms`, `/privacy`.
Actions: browse (EL/EN) · cookie consent (banner → `POST /api/v1/consents`) · contact form · waitlist (→ HubSpot) · magic link / password reset / email verify · land on `/invite/[token]` → signup with token preserved · pricing CTA → sign-in-gated checkout.

## Persona 2 — Visitor after submitting a signup form
Two dedicated forms: **`/auth/signup/policyholder`** and **`/auth/signup/agent`** (bare `/auth/signup` redirects by `?role=`, default policyholder). Agent form minimum: **name + valid Greek mobile + email** (license/agency collected later in agent onboarding; verification badge is non-blocking — no admin approval needed to start).
After registration → `/auth/signup/confirmation?role=…` checkpoint → **Continue** routes by role: policyholder → `/onboarding`, agent → `/onboarding/agent`. Invite tokens auto-redeem at registration (relationship/grant created, typed via `Invite.relationshipType`).
⚠️ Auto-sign-in + "skip verification" is frozen for removal (GitHub issue, next version): email verification becomes a hard gate.

## Persona 3 — First-time policyholder (onboarding, 5 steps)
1. **Goal** (6 options): Control my policies · Review an existing policy · Save money · Health & family · My car · Investments & reminders.
2. **Upload first policy** (AI-consent modal precedes upload) or skip.
3. **Trial analysis** — the one complimentary AI analysis (health score + gaps); labeled as trial with Plus/Pro note. *The aha + upgrade moment.*
4. **Smart reminders** — renewal reminders auto-enabled from extracted dates (free, always).
5. **Connect advisor** — redeem invite code → `/home` + tour.

Post-onboarding actions: wallet CRUD, share policy with agent (typed invites), revoke shares, collaboration threads (messages, doc uploads, respond to proposals — client-only), questionnaires/tasks, notifications, account (language/sessions/profile/GDPR export + deletion), referral link. **AI actions (analysis, Q&A, gap analysis, notify-agent-about-gap) require a paid plan** — free users get `UPGRADE_REQUIRED` → upgrade prompt.

## Persona 4 — Multi-policy holder choosing to upgrade
Same as Persona 3 plus the upgrade journey; hits limits fastest (3-policy cap, no AI after trial). Paths: `/upgrade` (in-app, all prompts route here), `/pricing` (public), `/account` (portal/cancel), token top-ups (paid tiers). Stripe Checkout (`upgradeSubscription`), Pro = 14-day trial; RevenueCat syncs mobile purchases.

## Persona 5 — Agent (tenant member or solo)
Signup without approval (name+mobile+email); onboarding: profile → branding → license upload → demo analysis → first client invite → `/dashboard/agent`.
Actions: dashboard, customers (invite/add/bulk-import — plan-capped), add policy for customer, parse PDF, pipeline (opportunities/renewals/commissions/insights/playbooks), questionnaires, collaboration (doc requests + proposals are agent-only creators), agency branding.
**AI on customer policies:** metered by agent-plan budgets (`canAgentRunAnalysis` + tokens). If the customer hasn't granted AI-processing consent, the agent is **never dead-ended**: the "Request client consent" action sends an in-app notification + approval email (account holders, approval at `/consent/ai`) or a signup invite with consent captured during onboarding (no-account customers). Server-side GDPR gate unchanged.

## Persona 6 — Agent group admin (tenant owner/manager)
**A plan upgrade:** creating an agency/team requires a tier whose `teamMembers` entitlement exceeds 1 (agent_pro: 3 seats, agency: unlimited); invites enforce the owner's seat limit — exceeding either returns `UPGRADE_REQUIRED` → `/agent/pricing`.
Adds to Persona 5: create agency (tenant), invite/remove members (invitees must hold the agent role), change roles (owner-only), transfer customers, team-wide pipeline view. Owner cannot leave without transferring ownership.
**Agency tier roadmap:** AI agents (lead finding, automated renewal notifications, cross-site deal search feeding Opportunities) — GitHub epic.

## Persona 7 — Admin (platform)
All actions `verifyAdminRole()` + IP-audited: metrics, activity log, user directory (role change, delete), agent verification approve/reject, DSR queue (exports, deletion anonymization), billing reconciliation, launch readiness, insurers/types/gap-definitions CRUD, ops jobs, token analytics.

## Upgrade-trigger catalog (target state)

| # | Page / component | Trigger context | Suggested action |
|---|---|---|---|
| 1 | Any AI entry point — analysis, Q&A, gap analysis, notify-agent (`wallet/actions.ts`) | Free tier, trial used → `UPGRADE_REQUIRED` | `UpgradePrompt`/modal → **`/upgrade`** |
| 2 | Onboarding step 3 trial results (`app/onboarding/flow.tsx`) | Trial completes | Trial note + Plus/Pro mention (soft) |
| 3 | Add policy (`/wallet/add`, onboarding) | Policy count ≥ 3 (free) / 10 (plus) | `policy_limit` message |
| 4 | Analysis card (`AnalysisCard.tsx`) | Daily gap cap (paid) → `gap_limit` · token budget out → **`token_limit`** (correctly labeled) | `LimitReachedModal` → `/upgrade` |
| 5 | Policy Q&A (`PolicyQA.tsx`) | Daily cap → `daily_limit` · free → `feature_locked` | modal → `/upgrade` |
| 6 | Coverage health score / detail sheet | Free views plus/pro sections | `PlanGate` blur → `/upgrade` |
| 7 | PDF preview (`DocumentPreview.tsx`) | Free clicks preview | locked tooltip (⚠ still no link — candidate fix) |
| 8 | Savings report / comparison / portfolio APIs | Free/plus requests pro/plus feature | 403 with upgrade text |
| 9 | Token purchase (`TokenUsageCard.tsx`) | Free tries to buy tokens | "Upgrade to purchase" · packages repriced (€1.99/500K, €3.99/1M ⭐, €16.99/5M, €29.99/10M) |
| 10 | Free-tier banner (`PolicyDetailsClientView.tsx`) | Free views policy details | Crown card → **`/upgrade`** (was `/account`) |
| 11 | AI usage widget | Always (paid) | usage bar → `/upgrade?reason=ai_analysis_limit` |
| 12 | Agent: run analysis | Monthly analyses ≥ 5/50/200 | inline "Upgrade your plan" |
| 13 | Agent: add customer / bulk import | ≥ 10/100/500 customers | `customer_limit` |
| 14 | Agent dashboard / financials tab | Tier below starter/pro | `AgentPlanGate` blur → `/agent/pricing` |
| 15 | **Team creation / member invite** (`team.service.ts`) | `teamMembers` entitlement ≤ 1 or seats full → `UPGRADE_REQUIRED` | → `/agent/pricing` |

Economics behind quotas and prices: `docs/planning/TOKEN_ECONOMICS_2026-07.md`.
