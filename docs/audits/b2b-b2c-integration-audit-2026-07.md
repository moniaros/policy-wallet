# B2B ↔ B2C Integration Audit & Redesign — PolicyWallet (July 2026)

The agent (B2B) and policyholder (B2C) sides as **one two-sided product**. Grounded in three file-verified sweeps (connection/consent model · questionnaire & intake lifecycle · cross-side renewals/notifications/claims/household). Tiers: **[NOW]** must-fix integration break · **[NEAR]** before-scale · **[STRATEGIC]** growth.

---

## 1. Executive diagnosis

The seam between the two sides is **technically secure but experientially disconnected.** The isolation model is genuinely sound — a `CustomerRelationship` is *not* a read grant (`lib/agent-visibility.ts`), private agent notes are filtered server-side (B1), renewal notifications are visibility-gated (A1), and PII is masked for unconsented relationships (`lib/agent-consent.ts`). Those are real, hard-won guarantees. **But the product built on top of them behaves like two apps that email each other, not one shared workspace.** Three systemic failures:

1. **Silent handoffs.** The core collaborative actions fire **no notification to the other side**: an agent creating a document request or a proposal, an agent-run analysis completing, an agent setting a renewal outcome, and a customer uploading a requested document all happen silently. The "My Agent" surface only *lights up if the customer happens to open it* — so a two-sided workflow degrades into "hope they check the tab." (`document-requests/route.ts:42-80`, `proposals/route.ts:54-93`, `policy.service.ts:615` via `agent/actions.ts:710`, `renewals/actions.ts:86-124`).

2. **Dead-end data.** The flagship intake — questionnaires (7 professional Greek-market templates, genuinely good) — goes **nowhere**. Answers land in a `QuestionnaireResponse` JSON blob read only on two agent screens; they never update the customer's profile, protection score, or gap engine, and the customer sees only **"Thank you"** with no result (`QuestionnaireForm.tsx:59`). Worse, the **same household data is collected 2–3× across isolated silos**: the customer's self-entered `ProfileFields` (Risk Profile Wizard → feeds the gap engine) are never shown to the agent; the agent's questionnaire answers are never shown to the customer; and the Annual-Review template *deliberately mirrors* `ProfileFields` but nothing merges them (`migration.sql:200-202` admits "can later feed the profile" — never implemented).

3. **Consent theater.** The relationship carries **two inconsistent status fields** (`status` + `activationStatus`, `schema:426-427`) written differently by five paths. Consent is **implicit far more often than explicit** — an agent can create an **`active` relationship for a real, live user unilaterally** (no invite, no acceptance, no notification; `customer.service.ts:302-307`), and the promised *"revoke access anytime from My Agent"* (`agent/actions.ts:660`, `AgentClient.tsx:80`) **has no revoke UI there at all** — real revocation lives per-policy in `CollaborationPanel` and is **paywalled off for free/Starter customers** (`PolicyDetailsClientView.tsx:143-144`).

**The through-line:** PolicyWallet has already built the *hard* part (a correct, isolated, consent-aware data model) and the *surfaces* (My Agent, collaboration threads, proposals, doc requests, questionnaires, renewals). What's missing is the **connective tissue** — reliable cross-side signals, a single reusable profile, an explicit and visible consent ledger, and closed value loops. That is a far cheaper gap to close than to build, and it is where all the retention/trust/upsell value is trapped.

---

## 2. End-to-end B2B ↔ B2C journey map

```
                    B2C (policyholder)                         B2B (agent)
  ┌─────────────────────────────────────────┐   ┌─────────────────────────────────────────┐
  CONNECT   self-signup ──┐                       ┌── agent adds customer (createCustomer)
            share policy ─┼─ AccessGrant ─────────┤     • phantom  → pending_activation
            redeem code ──┘   (policy:<id>)        │     • REAL user → status:active  ⚠ unilateral, silent
                              redeemInvite ✓ email-bound        invite (createAgentInvite) → email
                              redeemInviteCode ⚠ no email-bind
  ─────────────────────────────────────────────────────────────────────────────────────────
  INTAKE    Risk Profile Wizard → ProfileFields → gap engine   ⟂ agent sends questionnaire → QuestionnaireResponse (dead end)
            onboarding prefs (JSON, unused)                       ⟂ NEITHER profile is shown to the other side
  ─────────────────────────────────────────────────────────────────────────────────────────
  ANALYSIS  sees gaps in-wallet (passive)  ◄──────  agent uploads+analyzes  →  policy_analyzed → AGENT ONLY ⚠
                                                     (customer never notified)
  ─────────────────────────────────────────────────────────────────────────────────────────
  COLLAB    My Agent → Messages/Docs/Proposals       agent → doc request  ⚠ silent
            (poll-driven, lights up only if opened)  agent → proposal     ⚠ silent
            customer uploads doc ⚠ silent → agent    agent ↔ message ✓ (both notified)
            customer accepts proposal ✓ → agent      (decline/ask/counter unreachable in UI)
  ─────────────────────────────────────────────────────────────────────────────────────────
  RENEWAL   sees renewal rows (read-only, no worklist)  agent /renewals worklist (manage outcome)
            gets milestone reminder ✓                   gets milestone + task ✓ (visibility-gated)
                                                         agent marks outcome ⚠ silent → customer
  ─────────────────────────────────────────────────────────────────────────────────────────
  CLAIMS / HOUSEHOLD  ✗ not built (educational content + paywalled gate stubs only)
```

The **handoff points** are all present as data (`CustomerRelationship`, `AccessGrant`, threads, `PolicyRenewal`, `QuestionnaireInstance`) but under-served as *experience*: most transitions are silent, and the two profiles never meet.

---

## 3. Touchpoint inventory (key touchpoints, audit format)

### T1 — Advisor/client linking (`createCustomer` for a real user)
- **Trigger:** agent types a real, active user's email in "Add customer." **Actors:** agent (initiator), customer (unaware). **Intent:** agent wants a CRM record; customer wants control over who advises them.
- **Current workflow:** `customer.service.ts:302-307` sets `status:"active"` immediately; the customer now sees this agent in "My Agent" with no invite/acceptance/notification.
- **Pain / UX / trust:** the customer discovers an advisor "assigned" to them without consent. The active link grants no policy read by itself (good), but it is a trust breach and an enumeration signal (email always shown to the agent, `customer.service.ts:100`).
- **Privacy/consent risk:** **HIGH** — an active advisory relationship created without the data subject's action.
- **Redesign [NOW]:** a `createCustomer` against a **real active account** must create a `pending_invite` relationship + send an invite, never `active`. Only `redeemInvite`/`redeemInviteCode`/`sharePolicy` (customer actions) may set `active`.

### T2 — "Revoke access anytime" (promise vs. reality)
- **Trigger:** copy on the connect screen + the policy-added notification. **Actors:** customer.
- **Current workflow:** no revoke control in `AgentClient.tsx` (tabs = Overview/Messages/Docs/Proposals); real revoke is the per-policy Trash2 in `CollaborationPanel.tsx:386`, itself rendered only when `agentCollaboration !== false` — **false for free/Starter** (`subscription-entitlements.ts:25,43`).
- **Trust risk:** **HIGH** — an explicit promise ("revoke anytime," `AgentClient.tsx:80`) the UI does not keep, and control is paywalled.
- **Redesign [NOW]:** a **shared-access ledger** in "My Agent" listing every policy/data the agent can currently see, each with a one-tap **Revoke** (calls the existing owner-only `DELETE /api/v1/access-grants/[id]`, which is *not* tier-gated) + a **"Remove advisor"** that sets the relationship `inactive`. Never paywall revocation.

### T3 — Agent sends a questionnaire → customer completes
- **Trigger:** agent picks a template + sends. **Actors:** agent (author), customer (completer).
- **Current workflow:** `sendQuestionnaire` (`agent/actions.ts:943`) → `QuestionnaireInstance` + a `questionnaire` thread; customer sees it in `/tasks` (title **English-only**, `tasks/actions.ts:77`), fills `QuestionnaireForm` (submit blocked <50%, "Save for later" **discards** progress, `:183,:191`), submit writes `QuestionnaireResponse`.
- **Pain:** the customer answers 10–14 professional questions and receives **only "Thank you"** — no protection-score movement, no gap update, no report back. Answers feed nothing (`submitQuestionnaireResponse` writes no `ProfileFields`).
- **Data gap:** the answer JSON is a dead end; the Annual-Review template's fields duplicate `ProfileFields` but are never merged.
- **Redesign [NOW+NEAR]:** on submit, **map recognized answers into `PolicyholderProfile.ProfileFields`** (the same store the Risk Wizard writes), call `refreshProtectionScore`, and show the customer their **updated protection score + any new gap cards** as the completion state ("You just raised your protection score to 78"). Notify the agent. Prefill known policy facts (insurer/premium) so the customer never re-types them.

### T4 — Agent-run analysis completes
- **Trigger:** agent uploads+analyzes a client policy. **Actors:** agent, customer.
- **Current workflow:** `runBackgroundAnalysis(policy.id, agentId)` (`agent/actions.ts:710`) writes `policy_analyzed` to **`userId = agentId`** (`policy.service.ts:615`). Gaps/recommendations land on the customer-owned policy, so the customer *can* see them in-wallet — but is **never notified**.
- **Trust/value gap:** the "aha" moment (your advisor found 3 coverage gaps) never reaches the customer.
- **Redesign [NOW]:** emit a **second** `policy_analyzed` to the **owner** (customer) when initiator ≠ owner, with agent-attribution copy ("Your advisor {name} analyzed {policy} and found N items"). Add it to `TOASTABLE_EVENT_TYPES` for the customer watcher.

### T5 — Document request / proposal (silent handoffs)
- **Trigger:** agent creates. **Current:** thread + system message only — **no `NotificationEvent`, no email** (`document-requests/route.ts:42-80`, `proposals/route.ts:54-93`); copy even claims "{agent} will be notified" on upload while no notification fires (`DocumentRequestFlow.tsx:204`).
- **Redesign [NOW]:** wire both create paths through `sendNotification` (in-app + email) to the customer; wire the customer's upload through `sendNotification` to the agent (symmetry with the proposal-accept path). Fix the "will be notified" copy to be true.

### T6 — Renewal, split surfaces
- **Current:** one `PolicyRenewal` row (owner + agent); agent has a managed worklist (`/renewals`), customer sees **read-only rows** on policy detail (no worklist); agent's outcome change is **silent** to the customer (`renewals/actions.ts:86-124`).
- **Redesign [NEAR]:** a customer-facing renewal card ("{agent} is handling your renewal — status: quoting") reading the same `PolicyRenewal`; notify the customer on outcome changes; a "message my advisor about this renewal" CTA.

### T7 — Proposal response (half-built)
- **Current:** only **Accept** is reachable in the customer UI (`AgentClient.tsx:368`); decline/ask/counter exist in the API + `ProposalView` but aren't wired; the API decline path writes a **non-existent `metadata` column** → Prisma crash (`proposals/[id]/route.ts:92` vs `schema:1272-1297`); accepting captures **no** resulting policy/opportunity.
- **Redesign [NOW]:** wire decline/ask-a-question/counter into `ProposalsTab`; drop/relocate the `metadata` write; on accept, create an `Opportunity` (status `won`) or a follow-up task so the conversion is captured.

*(Full inventory of all 17 scoped touchpoints continues in the appendix; the above are the load-bearing ones.)*

---

## 4. Questionnaire & intake-flow audit

**The intake system is well-built and completely under-leveraged.** Seven real, professional, bilingual system templates exist (motor/home/health/life/pet/travel/annual-review; `20260713100000_*` migration) — but the loop from *collect → profile → value* is severed at every join.

| Surface | Initiator | Completer | Downstream | Duplicates | Reusable | Visible value |
|---|---|---|---|---|---|---|
| **System/custom questionnaire** | Agent | Customer | `QuestionnaireResponse` JSON (agent-only read) | Annual-Review ≡ `ProfileFields`; motor/home re-ask policy facts | **No** | **No** — "Thank you" only |
| **Risk Profile Wizard** | Customer | Customer | writes `ProfileFields` + `refreshProtectionScore` | ≡ Annual-Review questionnaire | **Yes** (gap engine) | **Yes** (score+gaps) |
| **B2C onboarding** | Customer | Customer | `preferences` JSON (unused by gap engine) | goals overlap nothing structured | **No** | partial |
| **Document request** | Agent | Customer | `DocumentRequest`; file not linked to policy | — | **No** | partial |
| **Proposal** | Agent | Customer | `Proposal`; accept captures no record | insurer/premium re-typed, not pulled from policy | **No** | Yes (card) |

**Must-fix questionnaire findings:**
- **[NOW] Answers must feed the profile.** `submitQuestionnaireResponse` (`tasks/actions.ts:123`) must map recognized fields into `PolicyholderProfile`/`ProfileFields`, then `refreshProtectionScore`. This single change turns the dead-end blob into the customer's protection-score engine *and* eliminates the 2–3× duplication.
- **[NOW] Close the value loop.** Replace "Thank you" with the customer's updated protection score + new/closed gaps + "share result with {agent}."
- **[NOW] Localize the customer-facing task copy** (`tasks/actions.ts:77,81` are English-only for Greek customers; `QuestionnaireSender.tsx:172` hardcodes a Greek WhatsApp message regardless of language).
- **[NOW] Autosave partials.** "Save for later" (`QuestionnaireForm.tsx:183`) discards everything — persist a draft `QuestionnaireResponse`.
- **[NOW] Prefill from policy.** Motor/home/health templates re-ask insurer/premium/coverage already on the uploaded `Policy` — prefill them.
- **[NEAR] One profile, two lenses.** Show the customer's `ProfileFields` to the agent (a read-only "client profile" tab) and the agent's questionnaire-derived facts to the customer — end the isolated silos.
- **[NOW] Delete the broken REST path** (`api/v1/questionnaires/[id]/route.ts` double-encodes + `JSON.parse`s a parsed field — dead/broken legacy).

---

## 5. Data-sharing & permissions model (target)

**Principle:** the relationship is *social* (who advises whom); the **`AccessGrant` is the capability** (what they can see); consent is **explicit, scoped, visible, and revocable.**

| Data | Agent sees | Customer sees | Editable by | Rule |
|---|---|---|---|---|
| Customer identity (name/phone/image) | only if **explicitly consented** OR phantom | own | customer | tighten `agentMaySeeCustomerIdentity` — drop the implicit "≥1 visible policy ⇒ identity" leg once explicit consent exists |
| Policy + gaps + recommendations | only `createdByUserId===agent` OR active `policy:<id>` grant | own (all) | owner | keep `isPolicyVisibleToAgent` (sound) |
| `ProfileFields` (needs profile) | **new: shared read** when consented | own (editable) | customer | one profile, agent-visible |
| Private agent notes | agent + admin | never | agent | keep B1 server filter |
| Renewal state/outcome | agent (manage) | **new: read + notify** | agent | shared `PolicyRenewal` |
| Branding | — | agent's (tier-gated) | agent | keep `brandedPortal` gate |

**Consent state machine — collapse to one field.** Retire the dual `status`/`activationStatus` ambiguity. A single `relationshipState`: `invited → active → inactive`, where **only a customer action** (`redeemInvite`, `redeemInviteCode`, `sharePolicy`) transitions to `active`; agent creation yields `invited` (phantom) or `pending_invite` (real user). Every `active` transition records an explicit `consentGrantedAt`.

**The shared-access ledger (new).** A single customer-facing view: "{agent} can currently see: [policy A ✓ revoke] [policy B ✓ revoke] [your needs profile ✓ revoke]" + "Remove advisor." Symmetric agent view: "You can see N of M of this client's policies." This is the missing *shared-state UX* — both sides understanding what the other can see.

---

## 6. UX / IA redesign recommendations

- **[NOW] "My Agent" becomes a real workspace, not a poll-driven inbox.** Add the shared-access ledger (§5), fix the **stubbed Messages→thread nav** (`AgentClient.tsx:347` still `alert()`s), and drive every tab from real notifications (§7) so it stops depending on the customer opening it.
- **[NOW] One consistent connect flow.** Unify `redeemInvite` and `redeemInviteCode` — same email-binding, same `active`+`consentGrantedAt` transition. Today the two paths yield different consent states for identical intent.
- **[NEAR] Cross-surface consistency.** Proposals, doc requests, questionnaires, and renewals should render with one shared card language on both sides (agent-authored, customer-facing) — today each is a bespoke component.
- **[NEAR] Advisor productivity vs. customer simplicity.** Give the agent a single "client cockpit" (profile + policies + open threads + renewals + cross-sell in one view — the tabs exist but are disconnected); give the customer a simple, notification-driven "what my advisor needs from me" list.

---

## 7. Notification & lifecycle orchestration plan

**The rule:** every state change that the *other* party must act on gets a `sendNotification` (in-app + email + push), and every completed action closes its loop.

| Event | Today | Target |
|---|---|---|
| Agent creates doc request | ❌ silent | → customer (in-app+email) |
| Agent creates proposal | ❌ silent | → customer (in-app+email) |
| Customer uploads requested doc | ❌ silent | → agent |
| Agent-run analysis complete | ❌ agent only | → **customer** too (owner), + toastable |
| Agent sets renewal outcome | ❌ silent | → customer |
| Proposal accept/decline/counter | ✅ / (decline broken) | keep; fix decline |
| Renewal milestone | ✅ both (visibility-gated) | keep |

**Lifecycle:** the customer-only crons (churn/drip/digest/perks) should gain an **agent-aware variant** — e.g. a stale collaboration thread already notifies the other side (`collaboration-reminders`, the one good cross-side cron); extend that pattern: nudge the *agent* when their client has an unaddressed gap, and nudge the *customer* when their advisor is waiting on a document. Keep the A1 visibility gate on everything agent-facing.

---

## 8. Privacy / consent hardening

- **[NOW] No unilateral active links for real users** (T1). Agent creation of a relationship against a live account = `pending_invite` + invite, never `active`.
- **[NOW] Email-bind `redeemInviteCode`** (`onboarding/actions.ts:213-264`) as `redeemInvite` already does — today anyone holding the code string can bind themselves as the agent's customer.
- **[NOW] Real, unpaywalled revocation** surfaced in "My Agent" (T2), plus relationship-level "remove advisor."
- **[NEAR] Audit the list view.** `getCustomers` exposes identity for many customers with **no `AGENT_VIEWED_CUSTOMER` log** — only single-profile opens are audited (`customer.service.ts:186`). Log bulk PII exposure too, and record *which* fields, for a real GDPR right-of-access report.
- **[NEAR] Explicit over implicit consent.** Once the connect flows reliably set `consentGrantedAt`, retire the implicit "≥1 visible policy ⇒ show identity" leg of `agentMaySeeCustomerIdentity` — consent should be a decision, not a side effect of the agent having uploaded a policy.

---

## 9. Monetization & retention opportunities created by better integration

- **Activation → retention:** closing the questionnaire loop (T3) makes the customer's protection score *move* when they engage with their advisor — the single strongest retention lever, currently wasted on a "Thank you."
- **Conversion capture:** wiring proposal-accept to create an `Opportunity`/policy (T7) turns the advisor relationship into measurable **book growth** and unlocks honest commission/pipeline analytics (already built) with real inputs.
- **Cross-sell surfaced both ways:** the cross-sell engine + the new dashboard widget exist; feeding questionnaire answers into it (T3) sharpens recommendations, and notifying the customer of an advisor-found gap (T4) drives advisor-attributed upsell.
- **Tier logic that respects trust:** move revocation *out* of the paywall (T2) and consider making **shared-access transparency** a universal trust feature, while keeping branded portal/branded reports/pipeline analytics as the paid advisor value. Trust is not a premium feature; advisor productivity is.
- **[STRATEGIC] The unbuilt SKUs:** `family_portfolio` and `claims_preparation_assistant` are sold as gate stubs with zero implementation — either build the household/claims workflows (real two-sided value: an agent guiding a family's coverage or a claim) or de-list them (same honesty fix as the branded-report/apiAccess pass).

---

## 10. Priority roadmap

**[NOW — must-fix integration breaks & trust]**
1. Kill the silent handoffs (T4, T5, T6-outcome) — wire `sendNotification` on both sides.
2. No unilateral `active` links for real users; email-bind `redeemInviteCode` (§8).
3. Real, unpaywalled revocation + shared-access ledger in "My Agent" (T2); fix the stubbed Messages nav.
4. Close the questionnaire loop: answers → `ProfileFields` → protection score → visible result; localize the customer copy; autosave partials (T3, §4).
5. Fix the proposal UI (decline/ask/counter) + the `metadata` crash; capture accept as a conversion (T7).

**[NEAR — before scale]**
6. Customer renewal card + outcome notifications (T6).
7. One profile, two lenses — show `ProfileFields` to the agent, agent facts to the customer; prefill intake from policy (§4).
8. Collapse the dual relationship-status fields to one state machine with `consentGrantedAt` (§5).
9. Audit bulk PII exposure (`getCustomers`) for GDPR (§8).

**[STRATEGIC — growth]**
10. Build or de-list `family_portfolio` (household workflows) and `claims_preparation_assistant` (agent-assisted claim handoff) — the two genuinely two-sided product bets currently sold as vapor.
11. Provider/insurer touchpoints (renewal quotes, direct submission) — the "direct insurer connection" marketing claim has no implementation today; scope it deliberately.

---

## 11. Target-state operating model

**One shared workspace, two lenses, explicit consent, reliable signals.**

- **Connect** is always customer-consented and recorded (`consentGrantedAt`); an agent can *request* but never *assume* a relationship with a real account.
- **A shared-access ledger** lets each side see exactly what the other can see, and lets the customer revoke any grant or the whole advisor link in one tap, free of charge.
- **One customer profile** feeds both the gap engine and the agent's view; a questionnaire the agent sends *raises the customer's protection score* and returns a visible result — collect-once, reuse-everywhere.
- **Every cross-side action is a signal:** doc requests, proposals, analyses, and renewal outcomes notify the other side reliably, so the collaboration works whether or not anyone is watching a tab.
- **Renewals, proposals, and cross-sell** are shared records with a customer-facing status and an advisor-facing worklist — one pipeline, two views — turning the relationship into measurable retention and book growth.
- **Trust is universal; advisor power is paid.** Transparency, consent, and revocation are free for everyone; branded portal, branded reports, pipeline analytics, and (future) household/claims workflows are the advisor's paid leverage.

The platform has already earned the hard guarantee — isolation and consent-awareness are real. The work now is to make the two sides *feel* like one trusted product: close the loops, surface the state, and never let a handoff happen in silence.
