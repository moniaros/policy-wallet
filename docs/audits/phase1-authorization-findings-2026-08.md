# Phase 1 — Security / Authorization: findings, implementation, verification
**Investigated 2026-08-14 · re-applied and committed 2026-08-19 as `0ddb7605`**

> **Evidence rule (standing).** Every assertion carries `(file:line)` or a named production
> query. Claims inherited from prior sessions were **re-verified, not trusted** — several
> were corrected, including one from a subagent in the same session.
>
> **Why this document was rewritten.** The original findings report, the guard test, the
> CLAUDE.md invariants and every code change were **destroyed on 2026-08-19** when the
> shared working tree was reverted by a parallel session. The untracked files had never
> been staged, so git could not recover them. The work was re-applied from scratch against
> the moved-on baseline and **committed immediately** (`0ddb7605`). That is the lesson:
> in this repo, uncommitted security work is not work.

---

## 1. Corrections to the mission's operating premises

| Premise as given | Verified state | Consequence |
|---|---|---|
| "Zero registered users… no data to preserve" | **False.** Prod (`cquudefwfwrmvpftuhyl`): 5 auth users, 12 `public.users`, 2 policies, 2 documents, **11 objects in the `policies` bucket**, 5 grants. `pkaragian@outlook.com` is an **external person** who owns a policy | Destructive work stays cheap but is not consequence-free. "Destructive is free" was relied on **only** where a row count was verified 0 |
| "Re-derivation of GapInstance is acceptable" | **Verified free** — `gap_instances` = **0 rows** in prod | Phase 3 truncate-and-regenerate costs nothing |
| GO #1: seeded `ph1@`/`agent1@`/`mixed@example.com` "live in prod DB now" | **Stale.** None exists in prod `auth.users` or `public.users`; they live in the **dev** project | The real finding was different — §6 |
| STATUS: feature-flags migration "NOT applied to any environment" | **Stale.** `20260813210000_feature_flags` **is** applied in prod | — |

## 2. Enumeration and classification

**22 API route files** touch policyholder-owned records (mechanical grep), yielding **28 HTTP
methods**. The mission estimated ~15. **Only 4 route files used `getPolicyAccess`**, while the
looser `lib/agent-visibility.ts` was imported by **15 files**.

| Class | Count |
|---|---|
| GPA (`getPolicyAccess`) | 6 methods |
| AGENT-VIS | 2 |
| INLINE-OWNER | 13 |
| INLINE-GRANT | 2 |
| AUTH-ONLY (self-scoped, no target id) | 4 |
| ROLE-ONLY | 1 |

**No IDOR in the API surface**: every method taking a record id from path, body or query
constrained the query by owner/grant.

## 3. The three parallel implementations, diffed against the reference

Reference (`lib/policy-access.ts:108-160`): owner, OR an `AccessGrant` with `status==="active"`
AND `scope` exactly `policy:<id>` (`portfolio`/`upload_only` confer nothing, `:23-24`), OR
`isManagingAgent = hasAgentRelationship && createdByUserId === viewer.id` (`:140-141`), where
`hasAgentRelationship` excludes `inactive`/`terminated` (`:124-126`). No `expiresAt` exists on
`AccessGrant`; revocation is the only expiry.

### 🔴 LOOSER — the live IDOR

`lib/agent-visibility.ts:42-49` and `:78-84` granted visibility on `createdByUserId` with **no
relationship-status check**. Termination (`agent/relationship-actions.ts:47-63`) flips status
and revokes grants but **never touches `Policy.createdByUserId`**, which is immutable history.
A dismissed agent therefore kept visibility **for ever** — across agent dashboard,
opportunities, insights, questionnaires, activity, protection-scores, cross-sell, renewal,
customer, customer-resolution, agent-playbook, agent-portal, and
`agent/policies/[id]/branded-report/route.ts:69-72`, which serves **the analysis content
itself**. `relationship-actions.ts:10` promises the opposite in words.

**Live exposure in production: ZERO, verified** — 1 terminated relationship exists; a join of
its former customer against `policies` returns 0 rows. No data remediation was required.

*Already safe by accident:* `renewal.service.ts:140-141` pre-filters the relationship to
`["active","pending_activation"]` before consulting the helper.

### 🟠 LOOSER — latent

`policy-analysis-orchestrator.service.ts` `loadAuthorizedPolicy`: the no-grant fallback
accepted a **bare active relationship with no `createdByUserId` condition**, which would let
any agent trigger AI analysis — reading document bytes, spending tokens — on **any** policy of
that owner. Unreachable today (all callers pre-check `getPolicyAccess`), which is exactly why
it needed closing.

### 🟠 LOOSER — confirmed, low severity

- `agent/actions.ts` `requestAiConsent`: `hasGrant` had **no scope filter** — a `portfolio`
  grant, or a grant on a *different* policy of the same owner, authorised acting on the named
  `policyId`. Its relationship fallback *does* correctly require `status: "active"`.
- `tasks/taskActions.ts:27-31` `createUserTask`: relationship lookup had **no status filter**
  while the comment two lines above claimed *"an active relationship"*. **Code/comment
  mismatch on a security control.**

### 🟡 STRICTER — functional inconsistency

`policies/[id]/gaps`, `gaps/[id]/acknowledge`, `review`, `savings-report`,
`analysis-runs/compare`, `documents/[docId]` DELETE and `analysis-runs/[runId]` denied
legitimate grant-holders. An agent with a `manage` grant could edit a policy but not list its
gaps or download the report of an analysis they paid for.

`policy.service.ts` held a **fourth copy** (scope-unfiltered, dead — no callers).

## 3b. Server actions — every export of a `"use server"` file is an endpoint

### 🔴 CRITICAL — `redeemInvite` was an unauthenticated write endpoint

`app/auth/actions.ts:1` is `"use server"`; `redeemInvite(token, userId)` was **exported** at
`:145` with **no authentication of any kind** and a **caller-supplied `userId`**, writing
`CustomerRelationship` activations and `AccessGrant` rows.

*Verified personally — an earlier agent reported this flow SAFE because it examined only the
page-level caller and never inspected the export.*

Impact (all requiring a valid token — the only secret in front of these writes):
1. **Unauthenticated invite consumption (DoS)** — `invite.update({consumedAt})` runs before the
   `signup` branch, so a stranger can burn a token and the real recipient's redemption no-ops.
2. **Unconsented relationship activation** — the `signup` branch flips a pending relationship
   to `active` with no consent click and no email binding.
3. Share/`client_agent` branches *are* email-bound, but the binding validates the **supplied
   `userId`'s** email, never that the *caller* is that user.

The comment at `:158-162` claimed the signup branch was "already email-bound". It was not.

### 🟠 Other

| Action | Finding |
|---|---|
| `getCustomerProfile` (`customer.service.ts:137`) | excludes `terminated` but permits `inactive`/`pending_activation`; payload separately gated by visibility + `agentMaySeeCustomerIdentity` |

**Correctly status-filtered already:** `addPolicyForCustomer`, `sendQuestionnaire`,
`getCustomerScoreTrend`, `getCustomerCrossSell`, `requestRenewalQuote`. `wallet/actions.ts` is
the best-consolidated file in the repo — 8 actions already route through `getPolicyAccess`.

## 5. Storage — resolved against production, not the repo

`lib/storage.ts` performs **zero authorization** (a pure I/O primitive); the service-role
client bypasses bucket RLS by design (`:109-112`). **All 17 server-side call sites across 9
files run an app-layer check first** — verdict SAFE at every one.

Direct production query settles what the repo could not:

| Fact | Value |
|---|---|
| `policies` / `policy-documents` / `uploads` | **all `public = false`** |
| `policies` limits | 15 MB, `{pdf,jpeg,png,webp,heic}` — **the July audit's recommended SQL, already applied** |
| `storage.objects` policies | **exactly one**: INSERT, role `authenticated`, `with_check (bucket_id = 'policies')` |
| SELECT policy | **none exists** |

**The feared IDOR does not exist.** Private buckets + no SELECT policy ⇒ the permanent
`getPublicUrl()` string in `PolicyDocument.fileUrl` is inert to every client. The July audit's
worst case is disproven in production.

**Residual (accepted, low):** the INSERT policy is bucket-wide with no prefix scoping —
unavoidable, since keys are flat UUIDs at the bucket root. Any authenticated user can write a
mime-allowed ≤15 MB object. They cannot read others' objects (no SELECT), cannot overwrite (no
UPDATE), and cannot link it to another user's policy. **Storage pollution, not disclosure.**

## 6. Seeded / shared-credential accounts

- GO #1's named trio is **absent from production**.
- The real finding: **`e2e-money@policywallet.test`** existed in prod with a password.
  **Purged 2026-08-14** (auth identity + DB row + 2 local subscriptions with
  `stripe_subscription_id NULL`, so nothing to cancel at Stripe). **This survived the tree
  revert** — it was a database change.
- Dev holds 24 test accounts, correct per `tests/global-setup.ts` (which refuses to run
  against prod).
- Side observation (not Phase 1): `raw_app_meta_data->>'role'` is **null for every prod user**,
  including the admin account, while admin gating expects both JWT metadata and DB roles.

## 7. Inherited claims re-verified — corrections

| Claim | Source | Verdict |
|---|---|---|
| "Erasure fails outright on an FK violation when an Opportunity references a deleted policy/gap" | a subagent, this session | **FALSE.** Real prod constraints: `opportunities.policy_id → SET NULL`, `gap_instance_id → SET NULL`. Prisma defaults optional relations to `SetNull`, not `NO ACTION` |
| "Deterministic gap engine is live in production" | two prior sessions | **FALSE** — Phase 3's problem, unchanged |
| "`protection_score_history` RLS is unexplained drift" | my own earlier note | **Explained**: `20260809130000_drop_dead_protection_score_history` is the **one unapplied migration** in prod (65 of 66). The dead table still holds **3 rows** of per-user scores and, per the migration's own note, sits **outside the DSR export path** |
| Orphaned-after-erasure models | subagent | **CONFIRMED** — erasure anonymizes `User` in place, so no user-keyed cascade fires |

### The erasure-guard blindspot

The guard detected personal data by **five literal field names**. **11 models hold a genuine
`@relation` FK to `User` under a name it never looked for** (`PolicyDocument.uploadedByUserId`,
`Invite.inviterUserId`, `Opportunity.ownerAgentUserId`, `QuestionnaireInstance.sentByUserId`/
`sentToUserId`, `Referral.*`, `PolicyMergeRequest.*`, `CollaborationThread.createdByUserId`/
`assignedToUserId`, `CollaborationMessage.senderUserId`, `CollaborationAction.assigneeUserId`,
`DocumentRequest.requestedByUserId`, `Proposal.createdByUserId`) — plus
`OpportunityStageHistory.changedByUserId`, a raw string with no FK. Four existing exemptions
were **dead entries** for models that were never detectable.

---

# Implementation (committed `0ddb7605`)

| # | Change |
|---|---|
| 1 | `redeemInvite` no longer takes a caller-supplied subject; raw form module-private, exported action reads the session |
| 2 | IDOR fixed — both arms require a living relationship. The `where` fragment gained a nested `owner.customerRelationshipsAsCustomer.some(...)`, staying pure so all 12 fragment call sites were fixed with no signature churn; `isPolicyVisibleToAgent` gained **required** params so the compiler found the rest |
| 3 | `createUserTask` status filter; `requestAiConsent` scope filter |
| 4 | Orchestrator landmine closed — relationship fallback now also requires `createdByUserId` |
| 5 | Seven routes consolidated onto `getPolicyAccess` |
| 6 | 441 lines of dead duplicate authorization deleted |
| 7 | Erasure guard derives User FKs from `@relation` shape; 2 models newly erased, 6 exempt with verified reasons, `CollaborationParticipant`'s false reason replaced |
| 8 | Both new erasures added to the Art. 15 export |

**A bug introduced and caught in verification:** the eraser's transaction results are
destructured **positionally**, so inserting two operations silently re-attributed every later
count (`purgedDataExports` reported 2 instead of 1). Fixed, with a comment naming the hazard.
Without the existing test this would have shipped a quietly wrong erasure audit record.

# Verification

| Criterion | Result |
|---|---|
| Zero policy-touching routes bypass `getPolicyAccess`; guard **fails** when one is added | ✅ **red-green proven** — a probe route makes it fail by name; removing it restores green |
| Guard cannot be fooled | ✅ **Hardened during verification.** The first probe **passed** because its comment contained the string `getPolicyAccess` and the check was `source.includes(...)`. Now requires a call; re-probed with the same file → correctly fails |
| Every service-role storage path has a named check | ✅ 17 sites, 9 files |
| Cross-tenant reads return 403/404 | ⚠️ **PARTIAL, honestly stated.** Proven at the **decision layer** by unit tests (dismissed-agent regression, orchestrator refusal, anonymous-redeem). **Not** demonstrated as live two-session HTTP calls against all 22 routes — not claimed |
| Seeded accounts gone from prod, verified by query | ✅ 0 test accounts in either table; 6→5 auth, 13→12 DB |

**Gate:** `tsc` clean · ESLint 0 · `audit:api-auth` 0/0/0/0 · `lint:utf8` 1814 ·
`lint:i18n-changed` pass · **unit 4538/4538 (431 files)**.

**GATE PASSED.**

## Carried into later phases

- `20260809130000_drop_dead_protection_score_history` unapplied in prod (Phase 2/4 — DSR/retention).
- Null JWT `role` metadata on every prod user.
- `customers/bulk-import` lets any agent create a relationship against any email.
- `verify:migrations` cannot run locally (the direct URL is the transaction pooler);
  Phase 1 made **no schema changes**.
