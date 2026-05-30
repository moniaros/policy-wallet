# IDOR Audit — Policy & Policyholder-Owned Data

**Date:** 2026-05-30
**Scope:** All Prisma queries (395 sites, 85 files) reading/writing `Policy`, `PolicyDocument`, and policyholder-owned models, focused on the HTTP-reachable surface (API routes, server actions, server-component pages).
**Method:** For each request-reachable query selecting an owned row by a caller-supplied ID, verified whether the `where` clause — or a preceding in-handler check — constrains to the caller's ownership (`ownerUserId`/`userId`), relationship membership (`CustomerRelationship`), `AccessGrant`, or admin role.

**Ownership keys:** Policy=`ownerUserId`/`createdByUserId` · PolicyDocument→`policyId`(+`uploadedByUserId`) · GapInstance=`userId`/`policyId` · ProtectionScore/RecommendationInstance=`userId` · PolicyAnalysisRun=`userId`/`policyId` (Step→`runId`) · Collaboration*→`relationshipId` (CustomerRelationship `agentUserId`↔`policyholderUserId`) · PolicyRenewal=`ownerUserId`/`agentUserId` · Data/DeletionRequest/TokenUsage/PolicyholderProfile=`userId`.

## Findings — flagged queries

| File | Query | Ownership scope | Risk | Suggested fix |
|---|---|---|---|---|
| app/(protected)/wallet/actions.ts:437 | `sharePolicy`: `accessGrant.create({ scope: policy:${policyId}, granteeUserId })` — `policyId` from caller, **never owner-checked** | **No** | **Critical** | Gate at top of `sharePolicy`: `const policy = await db.policy.findFirst({ where: { id: policyId, ownerUserId: authResult.dbUser.id } }); if (!policy) return { error: "Unauthorized" }`. Reuse `policy` for the notification/email lookups. |
| app/(protected)/wallet/actions.ts:485, 504 | `sharePolicy`: `policy.findUnique({ where: { id: policyId } })` selecting `insurerName`/`policyNumber`/`lineOfBusiness` for notification + email | **No** | **Critical** | Covered by the gate above — read once from the owner-scoped `findFirst` instead of re-querying by bare id. |
| app/(protected)/wallet/actions.ts:387 | `sharePolicy`: `invite.create({ scope: policy:${policyId}, token: Math.random().toString(36).substring(7) })` | **No** | **High** | Same ownership gate; replace `Math.random()` token with `crypto.randomUUID()` / `randomBytes` (guessable invite token). |
| app/api/v1/jobs/process-policy/route.ts:27 | `policyAnalysisRun.updateMany({ where: { status: "running", executionLeaseExpiresAt: { lt: now } } })` — global, reachable by any authenticated user (`requireApiUser()`, no roles) | **No** (cross-tenant write) | **Medium** | Restrict endpoint to cron/admin/webhook guard, or scope lease expiry to the caller's own policies. (Per-policy work below it *is* owner-checked at :52.) |
| app/(protected)/wallet/actions.ts:1025 | `notifyAgentAboutGap`: `opportunity.create({ gapInstanceId: gapId })` / thread `linkedGapInstanceId` — `gapId` from caller, not verified against `policyId` | **Partial** (policy checked, gap not) | **Medium** | Add `db.gapInstance.findFirst({ where: { id: gapId, policyId } })` before linking. |
| app/api/v1/policies/share/route.ts:146 | `policy.findMany({ where: { id: { in: policyIds } } })` — `policyIds` from caller's grants; returns full policy + owner PII without re-confirming granter owned each policy | **Partial** (trusts grant scope) | **Medium** | Defense-in-depth: join/verify `policy.ownerUserId === grant.granterUserId` at fetch time. Compounds with the `sharePolicy` leak (which can create malformed grants). |
| app/api/admin/tokens/usage/route.ts:9; analytics/route.ts:9 | Admin token reads gated by manual `roles.includes('admin')` (returns 401) instead of `requireApiUser({ roles:['admin'] })` | Yes (admin-only) | Low | Consistency: use `requireApiUser({ roles:['admin'] })` (returns 403). Not exploitable. |
| app/api/v1/gaps/[id]/acknowledge/route.ts:17→26; app/api/v1/me/data-export/[id]/route.ts:25→41 | Check-then-update across two queries (ownership `findFirst` then `update({ where:{ id } })`) | Yes (gate precedes) | Low | Minor TOCTOU; optionally fold ownership into the `update`'s `where`/`updateMany`. Not exploitable today. |

## Coverage — surfaces verified SAFE

| Surface (representative file) | Owned models | Ownership scope | Risk | Notes |
|---|---|---|---|---|
| app/api/v1/policies/[id]/route.ts | Policy | Yes | — | `ensureOwnership(db.policy, id, dbUser.id)` before findUnique/update/delete |
| app/api/v1/policies/route.ts | Policy | Yes | — | list/groupBy scoped to `ownerUserId`; create sets `ownerUserId` from auth |
| app/api/v1/policies/[id]/gaps/route.ts | GapInstance | Yes | — | `where: { policyId: id, policy: { ownerUserId } }` |
| app/api/v1/policies/[id]/documents(/[docId])/route.ts | PolicyDocument | Yes | — | owner-scoped `findFirst` (relation filter) before create/delete |
| app/api/v1/policies/[id]/analysis-runs/**, savings-report, review, compare | PolicyAnalysisRun/Step | Yes | — | policy owner/AccessGrant check first; runs constrained to verified `policyId` |
| app/api/policies/batch-create/route.ts | Policy | Yes | — | create sets `ownerUserId`/`createdByUserId` from auth |
| app/api/v1/collaboration/** (threads, messages, actions, proposals, document-requests, events) | Collaboration*, CustomerRelationship | Yes | — | centralized `assertThreadAccess` + `isAgent/isClient` verify relationship membership |
| app/api/v1/customers/protection-scores, bulk-import | ProtectionScore, CustomerRelationship | Yes | — | derived from caller's own relationships; agent-role gated |
| app/api/v1/me/** (subscription, data-export, deletion-request) | Data/DeletionRequest | Yes | — | scoped to caller `userId`; download requires matching token |
| app/api/v1/gaps/[id]/acknowledge, risk-profile, invites | GapInstance, PolicyholderProfile, Policy | Yes | — | owner/relation-filtered; `invites` validates `policy.count({ id:{in}, ownerUserId })` |
| app/(protected)/wallet/** (page.tsx, [id], edit, other actions) | Policy, PolicyDocument, GapInstance | Yes | — | owner-or-grant-or-relationship check before read/write; services re-check |
| app/(protected)/agent, renewals, insights, coverage-insights, activity, notifications, questionnaires actions | Policy, PolicyRenewal, GapInstance, CustomerRelationship | Yes | — | scoped to `agentUserId`/relationship; cross-sell & customer service enforce relationship |
| app/(protected)/customers/[id]/policy/[policyId]/page.tsx | Policy | Yes | — | relationship/grant check, then `findUnique({ id: policyId, ownerUserId: customerId })` |
| app/(protected)/admin/actions.ts | all | Yes (admin) | — | every action calls `verifyAdminRole()` first |
| app/(protected)/account, home, dashboard/agent pages; onboarding/actions.ts | Policy, GapInstance, PolicyholderProfile | Yes | — | scoped to `dbUser.id`; no caller-supplied IDs |

## Out of scope (not IDOR class)

Background/cron services in `lib/services/**` (renewal, weekly-digest, achievements, engagement-scoring/drip, churn-prevention, perk-reminder, collaboration-reminders, incident-dispatcher, dsr-evidence) iterate over all users by design and are not driven by caller-supplied IDs. They remain safe only while their triggers stay cron/admin/webhook-gated — `app/api/v1/jobs/**` and DSR endpoints are the ones to keep gated (see `process-policy` finding above).

---

# Server-Action Auth-Guard Audit

**Date:** 2026-05-30
**Scope:** All 19 server-action files (`'use server'`): every exported action checked for an auth guard (`getAuthenticatedUser` / `getAuthenticatedUserOrNull` / `supabase.auth.getUser` / `verifyAdminRole`) **before** any data access. These are NOT covered by `npm run audit:api-auth` (which only inspects `app/api/**/route.ts`), so they were verified manually. ~80 of ~95 exported actions are correctly guarded and ownership-scoped; the flagged exceptions are below.

| File | Query / action | Guard before data? / scope | Risk | Suggested fix |
|---|---|---|---|---|
| app/onboarding/agent/actions.ts:17 | `updateAgentProfile(userId, data)` → `agentProfile.update({ where:{ userId } })` — `userId` from caller; `createClient()` is called then `void supabase` (auth result discarded) | **No** — no auth, no ownership | **Critical** | Drop the `userId` param; derive from `getAuthenticatedUser()` and update `where:{ userId: dbUser.id }`. |
| app/onboarding/agent/actions.ts:35 | `completeOnboarding(userId)` → `agentProfile.update({ where:{ userId } })` sets `verificationStatus` | **No** | **High** | Derive `userId` from session; any user can mark any agent onboarded/pending-verified. |
| app/onboarding/agent/actions.ts:62 | `uploadAgentAsset(userId, formData)` → `agentProfile.find/update({ where:{ userId } })` (logo/license docs) | **No** | **High** | Derive `userId` from session; also validate file type/size. Any user can overwrite any agent's branding/license docs. |
| app/onboarding/agent/actions.ts:96 | `sendClientInvite(agentUserId, clientEmail)` → `invite.create({ inviterUserId: agentUserId })` + sends email | **No** | **High** | Derive `agentUserId` from session. Today any user can send invites impersonating any agent (spam/phishing in agent's name). |
| app/onboarding/agent/actions.ts:136 | `generateDemoProposal(file)` — returns static demo data, no DB access | No (but no data touched) | **Info** | Add a session guard for consistency; no data exposure. |
| app/auth/actions.ts:147 | `redeemInvite(token, userId)` → `invite.update`, `customerRelationship.updateMany`, `accessGrant.create({ granteeUserId: userId })` | Token-gated, but `userId` from caller not bound to session | **Med** | Derive `userId` from `getAuthenticatedUser()`; keep the token check. Prevents binding a grant/relationship to an arbitrary user id. |
| app/(protected)/tasks/taskActions.ts:18 | `createUserTask(data)` → `userTask.create({ userId: data.userId })` — recipient id from caller | Auth **Yes**; recipient **not** scoped | **Med** | Verify `data.userId` is the caller or a `CustomerRelationship` customer before creating; otherwise tasks can be injected onto arbitrary users. |
| app/(protected)/tasks/actions.ts:123 | `submitQuestionnaireResponse(instanceId, answers)` → `questionnaireInstance.update({ where:{ id: instanceId } })` + response create | Auth **Yes**; instance ownership **not** checked | **Med** | Verify the instance was sent to the caller (`relationship.policyholderUserId === dbUser.id`) before completing it. |
| app/(protected)/agent/actions.ts:543 | `getQuestionnaireTemplates()` → `questionnaireTemplate.findMany({ isActive })` | **No** auth | **Low** | Add `getAuthenticatedUserOrNull()` guard; shared catalog, low sensitivity but should be authed. |
| app/(protected)/wallet/actions.ts:344 | `getInsurers()` → `insurer.findMany` (reference data; `getInsuranceTypes()` at :351 is a static array) | **No** auth | **Low** | Add guard for consistency; public reference data, minimal exposure. |

## Verified SAFE (representative)
- **Properly guarded + scoped:** all of `wallet` (except the two reads above + the `sharePolicy` Critical already documented), `agent` (except `getQuestionnaireTemplates`), `renewals`, `insights`, `coverage-insights`, `notifications`, `activity`, `account`, `questionnaires`, `commissions`, `team`, `onboarding/actions.ts`, `tasks` `updateTaskStatus` — each calls a guard at the top and scopes by `dbUser.id` / relationship / grant.
- **`app/(protected)/admin/actions.ts`** — all 20 actions call `verifyAdminRole()` (which wraps `getAuthenticatedUserOrNull()` + admin-role check) before any data access. SAFE.
- **`app/(protected)/team/actions.ts`** — all actions call `getAuthenticatedUser()` and pass `dbUser.id` as the actor into `team.service`; authorization (manager checks, relationship membership) is enforced in the service layer. SAFE at the action layer (recommend a focused read of `team.service` to confirm `transferCustomer`/`removeMember` manager checks).
- **`app/auth/actions.ts` pre-auth flows** — `registerUser`, `signOut`, `resendVerificationEmail`, `resetPasswordForEmail`, `resetPasswordWithToken`, `updateUserPassword` are intentionally unauthenticated; `updateUserPassword` is session-scoped via `supabase.auth.updateUser` (acts only on the cookie session), and the email/reset flows are rate-limited and token-scoped. SAFE.
- **`app/auth/verify-email/actions.ts`** `verifyEmailToken(token, email)` — intentionally pre-auth; scoped by matching `verificationToken{ token, identifier: email }` and expiry. SAFE.

---

# Agent → Policyholder Connection-Join Audit

**Date:** 2026-05-30
**Question:** every place the `agent` role reads policyholder-owned data — does the query join through the agent↔policyholder connection?

**Connection model (`prisma/schema.prisma`):**
- `CustomerRelationship` (lines 397-415) — primary link: `agentUserId` ↔ `policyholderUserId`, `@@unique([agentUserId, policyholderUserId])`.
- `AccessGrant` (lines 417-430) — secondary, policy-scoped share: `granterUserId`→`granteeUserId`, `scope` (e.g. `policy:<id>` or `portfolio`), `permissions`, `status`.
- Team layer (`lib/services/team.service.ts`) — `getTeamMemberIds` / `isTeamManager`; managers see team members' customers via `ownerAgentUserId IN memberIds`.

**Result:** the connection is enforced consistently across the agent surface. One genuine gap, one over-strict inconsistency.

| File | Query | Joins through connection? (ownership scope) | Risk | Suggested fix |
|---|---|---|---|---|
| app/api/v1/policies/[id]/analysis-runs/[runId]/route.ts:36 | `accessGrant.findFirst({ where: { granterUserId: owner, granteeUserId: caller, status:"active" } })` — **omits `scope: policy:<id>`** | **Partial** — any active grant from the owner (e.g. a different `policy:AAA` share, or `portfolio`) authorizes reading run telemetry (`resultJson`, token counts, step/failure logs) of a *different* policy `BBB` from the same owner | **Med** | Add `scope: \`policy:${policyId}\`` to the `where` (matching `runPolicyAnalysis`/`ignoreGap`/`notifyAgentAboutGap` which all include it), or explicitly allow `portfolio`. |
| app/api/v1/policies/[id]/route.ts:32; [id]/gaps:16; [id]/documents(/[docId]); [id]/savings-report:48; [id]/analysis-runs/compare:56 | owner-only checks (`ensureOwnership` / `policy:{ ownerUserId: caller }`) — reject agents regardless of CustomerRelationship **or** AccessGrant | Yes, but **over-strict** (availability/consistency, not exposure) | **Low** | The agent policy-detail page authorizes via `relationship OR active grant`, but these poll/data endpoints it depends on are owner-only → 403/404 for relationship-only agents. Decide intended agent capability and align (scope-checked). |

**Verified SAFE (condensed):** all agent reads in `customer.service` (`{ agentUserId }` / nested-through-relationship), `cross-sell.service` & `gap-engine/agent-playbook.ts` (in-handler relationship check that throws), `team.service` (tenant memberIds, manager-gated in `getTeamPipeline`), `collaboration.service` (every path funnels through `assertThreadAccess` = relationship membership or participant), and the action/route layers for `customers`, `insights`, `activity`, `renewals`, `questionnaires`, `commissions`, `team`, and all `collaboration` API endpoints correctly constrain to `CustomerRelationship{agentUserId:caller}`, derived `customerIds` from such relationships, or `assertThreadAccess`. `customers/[id]/policy/[policyId]/page.tsx` gates on `relationship OR active AccessGrant` (granter pinned to the customer) before loading the policy.

---

# Compliance & AI Advice-Labeling Review

**Date:** 2026-05-30
**Scope:** `lib/services/compliance/`, `lib/services/gap-engine/`, and every surface where AI gap/recommendation output reaches a user. _(For compliance items the middle column reports **guardrail present (yes/no)** rather than ownership-scope, since these are not IDOR findings.)_

**Context:** Greek-market insurance is regulated. AI-generated "gaps"/"recommendations" shown to users should be labeled informational/educational, not personalized insurance advice, and should carry a disclaimer at the point of use. **Finding: no such disclaimer renders anywhere AI output reaches the user** — the only correct disclaimer text sits unused inside the Terms-of-Service page.

| Area / File | Issue | Guardrail present? | Risk | Suggested fix |
|---|---|---|---|---|
| UI: `components/coverage/RecommendationCards.tsx`, `components/gaps/GapCard.tsx` (renders "AI Insight" → "Recommendation"), `GapRecommendationCard.tsx`, `app/(protected)/coverage-insights/page.tsx` | AI gap/recommendation/protection-score output shown with **no "informational / not insurance advice" disclaimer** at the point of display. Grep for disclaimer terms across `components/coverage` & `components/gaps` → no matches. | **No** | **Critical** | Add a persistent disclaimer (EL+EN) to every component rendering gaps/recommendations/score, reusing the existing `legal-content.ts` `ai_disclaimer` strings; add a render-parity test. |
| AI prompts: `lib/services/ai/anthropic-ai.service.ts:625`, `openai-ai.service.ts:574`, `gemini-ai.service.ts:805` | Prompts instruct *"actionable, personalized insights (not generic advice)"*; output schema `.describe("Personalized risk insights")` — frames output as the *regulated* (personalized-advice) category. | **No** | **Critical** | Reword toward general/educational information; avoid prescriptive "you should buy X" phrasing, or gate behind a licensed-advisor flow. |
| Data layer: `lib/services/gap-engine/recommendation-generator.ts:120-135`, `lib/services/gap-analysis.service.ts:309-320`; Prisma `GapInstance`, `RecommendationInstance` | AI text persisted verbatim into `aiExplanation`/`aiSuggestion`/`title`/`description`/`personalReason`; **no `disclaimer`/`isInformational` classification field** → disclaimer can't be reliably surfaced from data. | **No** | **High** | Add a classification/disclaimer field at generation time, or enforce via a shared render wrapper so it can't be omitted. |
| Consent: `lib/compliance/consent.ts` | Consent types are only `cookie/terms/privacy`. **No consent for AI processing** of profile + special-category health data. | **Partial** (cookie/ToS only) | **High** | Add explicit, versioned, server-recorded consent for AI processing of health/financial data (GDPR Art. 9). |
| Health data: `lib/services/gap-engine/profile-gap-rules.ts:290` (`chronic_condition_no_health`); `gap-engine/index.ts` `runAiRiskAnalysis` | `chronicConditions`/`familyMedicalHistory` interpolated into user-facing advice text and transmitted to 3rd-party LLMs without visible legal basis/consent or data-minimization. | **No** | **High** | Gate health-driven rules + AI transmission behind explicit consent; minimize/anonymize fields sent to providers; document legal basis. |
| `lib/services/compliance/dsr-evidence.service.ts` | Only *monitors* DSR SLAs (`getDsrEvidenceSnapshot`); no code here performs export/erasure. Snapshot `samples` embed `userId` + `errorMessage` (potential PII). | **Partial** | **Med** | Confirm export/erasure executors exist elsewhere; pseudonymize `userId` in evidence; restrict access. |
| Audit: `gap-analysis.service.ts` `logActivity()` | Logs gap lifecycle (`POLICY_ANALYZED`/`GAP_RESOLVED`/`GAP_DISMISSED`) but **no audit that a disclaimer was shown or AI-consent accepted**. | **Partial** | **Med** | Log disclaimer impressions / AI-consent acceptance with policy version for regulator evidence. |
| `lib/legal/legal-content.ts:94-98 (EL)`, `250-254 (EN)` | Correct `ai_disclaimer` text exists in both languages (*"…δεν αποτελούν νομική ή ασφαλιστική συμβουλή" / "…not legal or insurance advice"*) but is **only on the Terms page**, never imported into the feature render path. | **No** (not at point of use) | **Med** | Import and surface the same strings inside the coverage/gap UI. |
