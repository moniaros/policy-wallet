# B2C + B2B Full Review — 2026-07-22

Scope: b2c (wallet, home, upgrade, onboarding, account) and b2b (agent section) — server actions, API routes, auth primitives, plus all unresolved production Sentry issues. Method: parallel read-only reviewers (wallet / b2c-rest / agent / API routes / auth-roles) + a hand Sentry-evidence sweep; every Critical/High/Med verified by hand against the full call chain before fixing.

**Status: FIXED — all confirmed security/correctness findings remediated on branch `fix/b2b-b2b-audit-2026-07`. Guardrails + 1188 unit + prod build green.**

Reviewer note: two of the five code reviewers (wallet, agent) and the Sentry sweep completed; the b2c-rest / API-routes / auth-primitives reviewers were interrupted mid-run (Fable credit exhaustion) — those areas were then reviewed directly by hand (wallet mutations traced in full; the whole b2c wallet surface confirmed ownership-scoped; the roles vocabulary enumerated repo-wide).

## A. Security / correctness findings (gate launch) — ALL FIXED

| # | file/location | issue | role(s) | severity | fix | status |
|---|---------------|-------|---------|----------|-----|--------|
| A1 | `app/api/v1/collaboration/proposals/route.ts` | Handler destructures `body`, but `withApiGuard` only populates `body` when a `validation.body` schema is declared (`lib/api-guard.ts:141`). None was → `body` always `undefined` → `const { relationshipId } = undefined` threw on **every** call. Proposal creation was hard-broken in prod (Sentry POLICYWALLET-C, 6 events). | agent | **high** (feature outage) | Added `createProposalSchema` (Zod) + `validation: { body }`. | ✅ FIXED |
| A2 | `app/api/v1/collaboration/document-requests/route.ts` | Identical defect — `body` never populated; every document-request creation 500'd. | agent | **high** (feature outage) | Added `createDocumentRequestSchema` + `validation: { body }`. | ✅ FIXED |
| A3 | `app/(protected)/agent/actions.ts` `commitScannedPolicy` → `backfillCustomerTaxId` | In the attach branch the ΑΦΜ (tax id) was written via `db.user.update({ where:{ id: customerId }})` **before** `addPolicyForCustomer`'s relationship gate ran. A malicious agent could pass an arbitrary `decision.customerId` and set the tax id of any account whose `taxId` is null (cross-tenant PII write). | agent | **med** (IDOR / PII write) | Moved the backfill to run only after `addPolicyForCustomer` returns `success` (its relationship gate is the authority). | ✅ FIXED |
| A4 | `lib/services/collaboration.service.ts` `createThread` | `assignedToUserId` (caller-supplied) was used as the notification+email recipient with no check it's a party to the relationship → an agent could send a platform-authored email with an attacker-chosen subject to any registered address. | agent, policyholder | **med** (spam/phishing vector) | Clamp `assignedToUserId` to the relationship's agent/policyholder; otherwise fall back to the counterparty. | ✅ FIXED |
| A5 | `lib/services/collaboration.service.ts` `addAction` | `assigneeUserId` (caller-supplied, required) was emailed/notified with no check it belongs to the thread. Same arbitrary-recipient vector, attacker-controlled `title`. | agent, policyholder | **med** (spam/phishing vector) | Reject `assigneeUserId` unless it's a thread participant (relationship parties + participants); route maps it to a 400. | ✅ FIXED |
| A6 | `app/(protected)/agent/actions.ts` `sendQuestionnaire` | Missing the `status === "active"` acceptance gate its sibling flows enforce → an agent could email a pending/never-accepted "customer". Also no rate limit (unlike `createAgentInvite`/`requestAiConsent`). | agent | **med** (spam / consent bypass) | Added `status === "active"` gate + per-agent 20/hr rate limit (`agent-questionnaire:` bucket). | ✅ FIXED |
| A7 | `lib/wallet/gap-report.ts` (GAP_CONTENT_MAP) | Liability/business/disability gap vocabulary unmapped — 28 Sentry warnings in 7d (POLICYWALLET-7, 40 total): `employer(s)-liability(-gap)`, `professional-liability(-gap)`, `product-liability`, `cyber-liability`/`cyber-risk-gap`, `communicable-disease-*`, `fire-explosion-liability-gap`, `vehicle-vessel-aircraft-liability-gap`, `elevator-maintenance-risk`, `low-liability-limits`, `family-exclusion-gap`, `waiting-period-disability`, `missing-policy-details`. Cards fell back to the AI sentence; alias pairs didn't dedupe. | policyholder, agent | med | Added a 16-entry vocabulary block with concept keys collapsing the alias pairs. | ✅ FIXED |
| A8 | `app/api/v1/agent/playbooks/route.ts:27` | Naive `auth.dbUser.roles?.includes("agent")` substring check instead of the canonical path (convention deviation; not exploitable — no role name is a substring of another). | agent | low (hardening) | Switched to declarative `auth: { roles: ["agent"] }` (guard uses `requireApiUser`→`hasAnyRole`); dropped the manual check. | ✅ FIXED |

### Verified SOUND (checked, no change needed)
- **Whole b2c wallet surface** (`app/(protected)/wallet/actions.ts`): every mutation — `createPolicy` (POLICYWALLET-E, fixed #211), `confirmPolicyReview`, `flagPolicyExtraction`, `updatePolicy`, `sharePolicy`, `revokeShare`, `getPolicyShares`, `analyzeGaps`, `deletePolicy`, `askPolicyQuestion`, `ignoreGap`, `notifyAgentAboutGap`, `retryPolicyAnalysis`, `requestRenewalQuote`, `decideMergeRequest` — is ownership-scoped via `getPolicyAccess`/`ownerUserId`/access-grant checks. No b2c IDOR. The #95/#100/#111 hardening holds.
- **Agent portfolio visibility**: every portfolio-derived read composes `getAgentPolicyVisibilityWhere` (insights, dashboard gaps, agent-portal, protection-scores, customer list/profile, cross-sell, renewals, playbook, branded-report, questionnaire analysis). The pre-#100/#111 relationship-only leak has not regressed. All 17 agent server actions carry `isAgentRole`.
- **Entitlement gates** are server-side (dashboard revenue/cross-sell zeroed before serialization; `/commissions` returns a locked component without fetching). The pre-#144 "full data behind a client blur" pattern was not found.
- `roles.includes("admin")` inside `collaboration.service.ts` (lines 176/252/etc.) operates on a `parseRoles()` **array** — exact element match, not the substring anti-pattern.

## B. UI/UX observations (do NOT gate launch)

- **i18n backlog**: full-tree scan (`SCAN_ALL=1`) reports **94 hardcoded bilingual literals** (down from 250) — `app/auth/signin` (34), help pages (28), `reset-password` (11), `GapRecommendationCard` (6), admin (6). Display-correct in both languages; debt, not breakage.
- `commissions/actions.ts` monthly-trend labels hardcode `en-US`; `dashboard/agent/page.tsx:260` formats expiry as `el-GR` unconditionally — both ignore the agent's `preferredLanguage`.
- `getCustomers` hardcodes `limit: 100` ("mimic all") — silently truncates books over 100 customers.
- `getInsightsData` has only an `isAgentRole` gate while adjacent commissions/branded-report/cross-sell surfaces are Pro-gated — confirm the intended tier.
- Activity feed fetches four sections each `take: limit` then slices post-merge, so "most recent N" skews toward the densest section.
- **Roles `.includes()` hardening** (repo-wide, ~30 sites incl. admin gates): non-exploitable given the fixed 3-role vocabulary (`policyholder`, `admin`, `agent` — none a substring of another), so left as-is rather than risk a mass change across security gates. Worth a dedicated, individually-tested sweep to `hasAnyRole`/`parseRoles` later.

## C. Production Sentry triage (all unresolved, 30d)

| issue | culprit | verdict |
|-------|---------|---------|
| POLICYWALLET-7 (40 ev, ongoing) | GET /wallet/[id] | REAL — A7, fixed |
| POLICYWALLET-C (6 ev) | POST /api/v1/collaboration/proposals | REAL — A1, fixed |
| POLICYWALLET-9 / -B / -A / -6 (6 ev, 16 Jul) | GET /dashboard/agent | `users.tax_id does not exist` on a **vercel-preview** deploy before the 16 Jul migration — obsolete; resolve as stale. |
| POLICYWALLET-2 / -4 / -5 (14 ev) | /dashboard, /api/v1/collaboration/threads | Prisma init/connection blips — transient infra, no code defect. |
| POLICYWALLET-8 (8 ev) | /admin/dsr hydration | Admin section — out of this review's scope; noted for admin backlog. |
| POLICYWALLET-D (2 ev) | POST /auth/signin | Stale server-action reference across a deploy — expected deploy-transition noise. |
| POLICYWALLET-F (1 ev, 21 Jul) | /customers | Single client-side "unexpected response" during the deploy window; watch. |
| POLICYWALLET-3 (1 ev) | Brevo 401 unauthorised IP | **OPS ACTION (not code): Brevo has an IP allowlist enabled; Vercel egress IPs rotate → intermittent email-send failures. Disable the Brevo authorised-IPs restriction.** |

## D. Criticals (ranked)

No Critical severity found. Top items were the two hard-broken b2b collaboration features (A1, A2 — both prod outages, both fixed), then the cross-tenant PII write (A3) and the three arbitrary-recipient/consent-bypass messaging vectors (A4–A6). All remediated.
