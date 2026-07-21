# Intent Verification & Sustainability Audit — July 2026

**Scope:** full-codebase production-readiness audit (intent verification, authorization boundaries, resilience, performance) for a fintech/insurance application in production at policywallet.gr.
**Method:** five parallel domain audits (server actions, API routes/webhooks, cross-tenant scoping, resilience/silent failures, performance) + read-only SQL verification of prod storage RLS; every Critical/High claim re-verified against current source. ~45 raw findings, deduplicated to the tables below.
**Status:** read-only analysis — no code changed by this audit. Remediation batches proposed at the end.

**Overall verdict:** the codebase is materially stronger than typical for its stage. Prior audit waves closed the classic holes: webhooks verify signatures before side effects, `PATCH /me` cannot escalate roles, `getPolicyAccess` is a genuine central authorization rule, hot-path id-lookups are owner-scoped. What remains clusters in four themes:

1. The identity-consent rule enforced on `/customers` is **bypassed on 5+ other agent surfaces**.
2. Background-job lifecycle can **strand user-visible state with no self-heal**.
3. Failure signals are **swallowed on business flows** (emails, metering).
4. The most-visited pages ship megabytes of `acordData` and serial queries over a `connection_limit=1` pool.

---

## Part 1 — Security / correctness findings (gates launch)

| File / location | Issue | Role(s) affected | Severity | Suggested fix |
|---|---|---|---|---|
| `app/api/v1/jobs/execute-analysis/route.ts:9` + `lib/services/analysis/policy-analysis-orchestrator.service.ts:74` | **C1 — dead analysis run strands `Policy.status='analyzing'` forever.** `maxDuration = 300` s but the execution lease TTL is 8 min; when the function is killed, QStash's retry lands inside the still-valid lease, no-ops, and returns **200** — QStash marks it delivered and never retries. The only lease reaper is inside user-triggered `process-policy` (not a cron) and resets only the run, never `Policy.status` / `PolicyDocument.processingStatus`. User sees a perpetual spinner; review and re-analysis are blocked. | policyholder, agent (money path) | **critical** | Lease TTL → 4 min (below maxDuration); return **503** when the lease is held so QStash retries; add a cron reaper that fails expired runs AND resets policy + documents. See Fix C1. |
| `lib/stripe.ts:14` | **H1 — Stripe client silently falls back to Stripe's PUBLIC documentation test key** (`sk_test_4eC39HqLyjWDarjtT1zdp7dc`) when `STRIPE_SECRET_KEY` is missing/malformed. A dropped env var in prod silently routes billing to a shared public test account. No `timeout`/`maxNetworkRetries` either (80 s SDK default). | all (billing) | high | Hard-throw in production when the key is absent/malformed; add `timeout: 20_000, maxNetworkRetries: 2`. See Fix H1. |
| Prod `storage.objects` policy `"Allow authenticated reads"` (bucket `policies`) | **H2 — any authenticated user can read any policy PDF.** Verified in prod `pg_policy`: `SELECT USING (bucket_id = 'policies')` with no owner scoping. Every insurance PDF (name, ΑΦΜ, address, plates) is readable by any logged-in account that obtains an object name; the only protection is unguessable filenames (pre-#197 names were `Date.now()+base36` — materially weaker). The app already serves reads server-side via service role + `getPolicyAccess`. | policyholder (data exposure) | high | Drop the broad read policy; reads go exclusively through the app server. See Fix H2. |
| `lib/email/email-service.ts` + callers, e.g. `app/(protected)/agent/actions.ts:361` | **H3 — invite/consent/share emails fail silently while the action reports success.** `sendEmail` returns `{success:false}` (never throws), so caller try/catch never fires; the invitee never gets the link, the agent believes it was sent, nothing retries. (Sentry capture exists inside the email service — ops-visible, user-invisible.) | agent, policyholder | high | Check the `EmailResult` at each caller; return `emailDelivered` + a copyable fallback link. See Fix H3. |
| `lib/services/analysis/policy-analysis-orchestrator.service.ts:~1973` (`executeStepWithRetry`) | **H4 — token reservations leak for the rest of the billing month.** The `failureClass === "token"` throw and the `RUN_LEASE_LOST` throw execute before `releaseTokenReservation`; a killed function skips it too. `reserved_tokens` has no reaper and counts against `reserveTokens` budgets — a paying user's monthly allowance silently shrinks until month rollover. | paying users (billing) | high | try/finally around every reservation; fold `reserved_tokens` cleanup into the C1 reaper. See Fix H4. |
| `app/(protected)/dashboard/agent/page.tsx:314` | **H5 — agent dashboard serves whole-portfolio protection scores + gap counts for unconsented customers** (incl. `pending` relationships agents create unilaterally by typing an email) — bypassing the visible-policy privacy rule that `agent-portal.service.ts:221` and `/api/v1/customers/protection-scores` explicitly enforce. | policyholder (privacy) | high | Filter score/gap serialization by the agent's visible-policy owners. See Fix H5. |
| `app/(protected)/activity/actions.ts:57` | **H6 — `/activity` feed is an email→real-name enumeration oracle.** Emits `rel.customer.name` for every relationship with no `agentMaySeeCustomerIdentity` gate; adding any real user's email as a "customer" reveals their real name. `include: { customer: true }` also drags the full User row (taxId, phone) server-side. | policyholder (privacy) | high | Select only needed columns; gate the display label through `agentMaySeeCustomerIdentity`. See Fix H6. |
| `lib/services/ai/shared-utils.ts` (`withTimeoutAndRetry`) + gemini/anthropic/openai service call sites | **H7 — AI timeouts never abort the provider call, and retries multiply.** The wrapper creates an `AbortController` but every call site ignores the signal — after the 180 s timeout the provider call keeps running **and billing** while the orchestrator records failure and retries. Layers stack: SDK `maxRetries:2` × wrapper retry × `MAX_STEP_ATTEMPTS:3` × model-fallback × provider-failover → a persistent 5xx fans out to dozens of billed calls per step. `isTransientError` matches substrings (`'500'`, `'aborted'`) anywhere in the message. | all (cost, latency) | high | Propagate `abortSignal`, set `maxRetries: 0` on SDK calls, classify transience on `error.status` / `APICallError.isRetryable`. See Fix H7. |
| `app/api/stripe/webhook/route.ts:153` | **H8 — legacy checkout webhook can revoke entitlement and grant nothing.** Demotes ALL active subscriptions to `past_due` **before** creating the replacement; an early-return or throw (e.g. P2002 on redelivery) leaves the user paying-but-unentitled. Non-transactional; `payment_status` never checked; falls back to `planId \|\| 'ph-plus'`. | paying users (billing) | high | Delegate to the canonical `handleSubscriptionSuccess` (as `/api/v1/billing/webhook` does), or verify `payment_status === 'paid'`, create-then-demote inside one transaction. See Fix H8. |
| `dashboard/agent/page.tsx:66,364`, `opportunities/page.tsx:50`, `customer.service.ts:366`, `protection-scores/route.ts:83`, `collaboration.service.ts:81,163` | **M1 — identity-consent gate bypassed on 5 more agent surfaces.** Names/avatars of unconsented accounts rendered wherever relationships are serialized outside `/customers`; collaboration threads can be opened on relationships that were never accepted. | policyholder (privacy) | med | One `presentCustomerIdentity()` helper in `lib/agent-consent.ts`, applied at every serialization point; require `status === 'active'` for thread creation. |
| `app/(protected)/questionnaires/actions.ts:224` | **M2 — questionnaire analysis reads the customer's ENTIRE portfolio LOB set** without `getAgentPolicyVisibilityWhere` — the complement lets an agent infer holdings the customer never shared ("has motor+home+health, only shared motor with me"). | policyholder (privacy) | med | Scope the LOB query with the agent visibility `where`. |
| `app/(protected)/agent/actions.ts:1124` | **M3 — `requestAiConsent` honors relationships of ANY status** — terminated/pending agents can still fire consent emails at policyholders. | policyholder | med | Require `status === 'active'` on the relationship lookup. |
| `app/(protected)/wallet/actions.ts:1388` | **M4 — `notifyAgentAboutGap` trusts the client-supplied `gapId`** without verifying it belongs to the authorized policy — a policyholder can mint an Opportunity cross-linked to another policy's gap. | policyholder → agent data integrity | med | Verify `gap.policyId === policyId` (or query the gap through the policy relation) before creating the Opportunity. |
| `lib/services/gap-analysis.service.ts:474,545` | **M5 — `resolveGap`/`dismissGap` accept an AccessGrant of ANY scope** (read-only grants can mutate gap state). Latent — no live caller passes a non-owner today. | grantees | med | Require `canWrite` from `computePolicyAccess` in both methods. |
| `lib/services/team.service.ts:386` | **M6 — team overview leaks per-member pipeline/won revenue to plain members** while the pipeline view gates the same numbers to managers. | agent (member) | med | Apply the same manager-role gate before serializing per-member revenue. |
| `lib/webhook-idempotency.ts:4` + `lib/billing.ts:398-473` | **M7 — check-then-mark idempotency race** (two live webhook endpoints share the keyspace; concurrent redeliveries both pass the check); `handleSubscriptionSuccess` expires priors before creating the replacement, non-transactionally. | billing | med | Atomic claim: `create` the idempotency row first and treat P2002 as already-processed; wrap expire+create in `db.$transaction`. |
| `app/api/v1/tokens/purchase/route.ts:17` + `app/api/stripe/webhook/route.ts:259` | **M8 — token purchase has no rate limit and no Zod validation**; the dormant PaymentIntent path can double-credit (quantity ignored on redelivery). | billing | med | Add a user-keyed rate-limit bucket + Zod schema; make crediting idempotent on the PI id. |
| `lib/rate-limit.ts:86`, `process-policy:21`, `invites:23`, `device-token:21` | **M9 — rate limiting fails open to per-instance memory** when Upstash is unconfigured (silent; useless across serverless instances); several buckets key on bare IP, sharing the proxy's global bucket. | all | med | Log loudly (Sentry) when falling back; key buckets per-user where authenticated. |
| `proposals/[id]:56`, `document-requests/[id]:16`, `billing/checkout:63`, `batch-create:124,158`, `policies/[id] GET:60`, `share GET:161`, `api/doc:4`, `share POST:49` | **M10 — route hygiene cluster:** unvalidated JSON bodies (raw `status` string persisted verbatim); internal error text echoed to clients; full-row spreads in responses; public OpenAPI spec; share flow pre-provisions User rows for arbitrary emails (enumeration/spam vector). | mixed | med | Zod on every body; `createApiError` with generic messages; explicit `select` projections; auth-gate `/api/doc`; defer User creation until invite acceptance. |
| `lib/token-tracking.ts:194` | **M11 — metering failures swallowed with `console.error` only** — provider-billed spend goes uncounted with no Sentry event and no retry. | billing | med | `Sentry.captureException` + structured log; consider a retry queue for metering writes. |
| `app/(protected)/wallet/actions.ts:99`, `lib/services/ai/batch-translator.ts:105`, `lib/email/brevo.ts:24,52` | **M12 — non-transactional policy+documents create** (a crash between the two writes leaves a zero-document policy stuck 'analyzing'); external fetches (Brevo, translator) have no AbortSignal timeout. | all | med | Wrap create in `db.$transaction`; add `AbortSignal.timeout(15_000)` to external fetches. |
| `lib/admin-guard.ts:28`, `wallet/actions.ts:905,1114`, `admin/actions.ts:340`, `wallet/actions.ts:643` | **M13 — substring `.includes()` role checks on the admin gate and AI gates** (a hypothetical role containing `admin` as a substring passes); `changeUserRole` persists an unvalidated roles string; `getInsurers` is unauthenticated (low impact). | all | med | Use `parseRoles()`/`hasAnyRole` everywhere; validate the roles string against the known-role enum before writing. |

### Corrective snippets (every Critical & High)

#### Fix C1 — stuck-'analyzing' chain

```ts
// lib/services/analysis/policy-analysis-orchestrator.service.ts
const RUN_EXECUTION_LEASE_TTL_MS = 4 * 60 * 1000 // BELOW execute-analysis maxDuration(300s): a killed
// function's lease expires before QStash's next redelivery, which can then re-acquire and resume.
```

```ts
// app/api/v1/jobs/execute-analysis/route.ts — when the lease is HELD, retryable status (not 200):
if (result.skipped === "lease_held") {
    return new Response("run locked, retry later", { status: 503 })
}
```

New cron reaper — `app/api/v1/jobs/reap-stale-analyses/route.ts` (every 15 min; `CRON_SECRET`; `export const GET = POST` and allowlist under `/api/v1/jobs/` per the cron-proxy rules):

```ts
const stale = await db.policyAnalysisRun.findMany({
    where: { status: "running", executionLeaseExpiresAt: { lt: new Date() } },
    select: { id: true, policyId: true },
})
for (const run of stale) {
    await db.$transaction([
        db.policyAnalysisRun.update({ where: { id: run.id }, data: { status: "failed", failureCode: "LEASE_EXPIRED" } }),
        db.policy.update({ where: { id: run.policyId }, data: { status: "action_needed" } }),
        db.policyDocument.updateMany({ where: { policyId: run.policyId, processingStatus: "processing" }, data: { processingStatus: "failed" } }),
    ])
}
```

#### Fix H1 — Stripe key fallback

```ts
const key = env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY
if (!key || !key.startsWith("sk_")) {
    if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
        throw new Error("STRIPE_SECRET_KEY missing or malformed — refusing to run billing against a fallback key")
    }
}
stripeInstance = new Stripe(key || "sk_test_placeholder_build_only", {
    apiVersion: "2024-12-18.acacia" as any, typescript: true,
    timeout: 20_000, maxNetworkRetries: 2,
})
```

#### Fix H2 — storage RLS (SQL, prod)

```sql
DROP POLICY "Allow authenticated reads" ON storage.objects;
-- Reads go exclusively through the app server (service role + policy-access check).
-- If a client-direct read path is ever needed, re-add scoped by an owner prefix:
-- CREATE POLICY "owner reads" ON storage.objects FOR SELECT
--   USING (bucket_id = 'policies' AND (storage.foldername(name))[1] = auth.uid()::text);
```

Precondition: confirm no client code still reads storage directly (post-#81 the b2c preview path is server-mediated).

#### Fix H3 — email delivery honesty (pattern per caller)

```ts
const emailResult = await sendPolicyInviteEmail({ to: email, token: invite.token, ... })
revalidatePath("/customers")
return {
    success: true,
    inviteId: invite.id,
    emailDelivered: emailResult.success,           // UI: show "email failed — share this link instead"
    inviteLink: emailResult.success ? undefined : buildInviteLink(invite.token),
}
```

#### Fix H4 — token reservation leak

```ts
const reservation = await reserveTokens(...)
try {
    /* attempt the step */
} finally {
    if (reservation.reserved) await releaseTokenReservation(reservation).catch(() => {})
}
```

Plus: the C1 reaper zeroes `reserved_tokens` for users with no `running` run.

#### Fix H5 — dashboard score privacy

```ts
const visibleOwners = new Set((await db.policy.findMany({
    where: { ownerUserId: { in: clientIds }, ...(await getAgentPolicyVisibilityWhere(agentId)) },
    select: { ownerUserId: true }, distinct: ["ownerUserId"],
})).map(p => p.ownerUserId))
// ClientCard serialization:
protectionScore: visibleOwners.has(rel.policyholderUserId) ? scoresByUserId.get(...)?.overallScore ?? null : null,
gapCount:        visibleOwners.has(rel.policyholderUserId) ? scoresByUserId.get(...)?.gapCount ?? 0 : null,
```

#### Fix H6 — activity feed identity gate

```ts
include: { customer: { select: { id: true, name: true, email: true, password: true, emailVerified: true, lastActiveAt: true } } }
// ...
const label = agentMaySeeCustomerIdentity(rel, rel.customer, visiblePolicyCounts.get(rel.policyholderUserId) ?? 0)
    ? rel.customer.name
    : rel.customer.email          // the agent already knows the email they typed
```

#### Fix H7 — AI-call abort + retry discipline (pattern per call site)

```ts
withTimeoutAndRetry((signal) => generateObject({ ..., abortSignal: signal, maxRetries: 0 }), 'Gemini extraction')
// shared-utils isTransientError: classify on error.status / APICallError.isRetryable, not message substrings.
```

#### Fix H8 — legacy checkout webhook

Delegate to the canonical `handleSubscriptionSuccess` (as `/api/v1/billing/webhook` does). At minimum:

```ts
if (session.payment_status !== "paid") return createApiResponse({ received: true })
await db.$transaction(async (tx) => {
    await tx.subscription.create({ data: replacementRow })       // create replacement FIRST
    await tx.subscription.updateMany({                            // then demote priors
        where: { userId, status: "active", id: { not: replacementRow.id } },
        data: { status: "past_due" },
    })
})
```

---

## Part 2 — Quality / performance observations (does NOT gate launch)

| File / location | Issue | Severity |
|---|---|---|
| `app/(protected)/home/page.tsx:63+` | ~9 strictly serial queries + full `acordData` rows on the hottest customer page (~250-450 ms pure serialization on the `connection_limit=1` pool). | high |
| `lib/auth-helpers.ts:10` | Auth helpers not `cache()`-memoized — 2-4 Supabase HTTP round-trips + user queries per request tree. | high |
| `app/(protected)/coverage-insights/page.tsx:38` | Full `acordData` serialized once per gap row into RSC props (multi-MB payloads); policies/gaps/profile fetched twice per render. | high |
| `app/(protected)/wallet/page.tsx:132` | Full `acordData` per policy into the wallet-list client props + 5 serial queries. | high |
| `app/(protected)/dashboard/agent/page.tsx:60` | Whole-book `acordData: true` select solely for lifecycle dates — the denormalized `coverageEndDate` column exists for exactly this; + 5-query serial tail. | high |
| `lib/services/renewal.service.ts:77`, `lib/services/weekly-digest.service.ts:43` | Cron N+1: ~6 queries per policy and ~10 per user, serial — timeout risk as the book grows. | med |
| `lib/subscription-entitlements.ts:154` | Entitlements re-resolved 2-3× per request — `cache()` it or thread the resolved object. | med |
| `components/wallet/PolicyWalletClient.tsx:110`, `components/notifications/NotificationWatcher.tsx:88` | Pollers with no terminal stop / no idle backoff — a stuck 'analyzing' policy = full SSR re-render every 10 s per open tab. | med |

---

## Remediation batches (proposed order)

1. **Batch A — stuck-state + billing resilience** (C1, H1, H4, H8, M7, M11): lease TTL + 503 + cron reaper (incl. `reserved_tokens` cleanup); Stripe key hard-fail + client timeouts; try/finally reservation release; legacy webhook delegation; atomic idempotency claim; Sentry on metering failures.
2. **Batch B — agent privacy sweep** (H5, H6, M1, M2, M3): shared `presentCustomerIdentity()` applied at every serialization point; dashboard score visibility filter; questionnaire scoping; relationship-status checks.
3. **Batch C — email honesty + storage RLS** (H3, H2).
4. **Batch D — AI-call hygiene** (H7, M12 timeouts).
5. **Batch E — route hardening** (M4, M5, M6, M8, M9, M10, M13).
6. **Batch F — performance** (P-table: `cache()` on auth/entitlements, `Promise.all` batching, strip `acordData` from list DTOs).

---

## Criticals first — priority order

1. **C1** — stuck-'analyzing' analysis chain (lease TTL > maxDuration, 200-on-held-lease, no cron reaper) — the money path can strand user-visible state with no self-heal. **The single launch-gating item.**
2. **H1** — Stripe public-test-key fallback (silent misconfiguration of the billing system).
3. **H2** — storage RLS: cross-tenant read of every policy PDF for any authenticated user.
4. **H8 / M7** — checkout webhook revoke-before-grant + idempotency race (paying-but-unentitled states).
5. **H4** — token-reservation leak (paying users' budgets silently shrink).
6. **H5 / H6 / M1 / M2** — the agent-side privacy sweep (consent rule bypassed off the `/customers` page).
7. **H3** — silent email failure on the core agent acquisition flow.
8. **H7** — unaborted AI calls + multiplicative retries (cost amplification under provider incidents).
