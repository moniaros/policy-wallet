# Motor Demo Path — Broker-Demo Readiness Map

**Date:** 2026-06-01 · **Branch:** `NEW-UI` (uncommitted UI redesign in flight)
**Storyline traced:** customer uploads a competitor's **MOTOR** policy (Greek PDF) → AI extracts it → gap/coverage analysis surfaces findings → the **connected agent** sees the client and the opportunity.
**Method:** end-to-end code trace (5 parallel explore agents + synthesis), then every disputed claim re-verified against source.

> ## Bottom line
> The demo runs end-to-end **only if** you (1) set a real AI API key and (2) pre-establish the agent↔customer link. The first three steps (upload → extract → gap analysis → **customer's own view**) work for a clean digital PDF. The **"agent watches the opportunity appear on their dashboard"** beat **does not work as scripted** — a customer-self-uploaded policy is invisible to the agent dashboard's headline numbers, and no euro "opportunity" is ever auto-created from gaps.

---

## Myth-busting — agent claims I checked and corrected

Three scary findings from the automated trace were **wrong**; don't act on them:

1. **"`sharePolicy` IDOR is a live security hole."** **False in the working tree.** The owner gate + `crypto.randomUUID()` token that `docs/STATUS.md` lists as a *pending* "Next action" is **already present** at [app/(protected)/wallet/actions.ts:382-389](../../app/(protected)/wallet/actions.ts#L380). STATUS.md is **stale** (this is uncommitted `NEW-UI` work). Not a demo risk. *(Worth committing + updating STATUS separately — out of scope for this doc.)*
2. **"There's no customer upload screen."** False — two exist and work: onboarding [app/onboarding/flow.tsx](../../app/onboarding/flow.tsx) (PDF-only drop zone) and the wallet [components/wallet/AddPolicyClient.tsx](../../components/wallet/AddPolicyClient.tsx) "Add Policy" flow.
3. **"AnalysisCard is a half-built placeholder."** Unsubstantiated — it's a complete, large, complex component. The real caveat is only that it's **uncommitted `NEW-UI`** with heavy client state, so spot-check it live rather than assuming it's broken.

The one finding I **confirmed and sharpened** is the crux of Step 4 (dashboard `createdByUserId` mismatch) — detailed below.

---

## Readiness table

Legend: ✅ works · ⚠️ partial / conditional · ❌ doesn't work as scripted.

### Step 0 — Demo environment (do this BEFORE you start)

| Field | Assessment |
|---|---|
| **Works?** | ⚠️ Conditional — three prerequisites must be met |
| **Backend risk** | **Mock fallback is silent.** With no `GEMINI_API_KEY` / `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `AI_SERVICE_TYPE` set, the factory quietly uses the **Mock** provider — only a log warning, no user-facing signal ([ai-service.factory.ts:84-107](../../lib/services/ai/ai-service.factory.ts#L84)). Mock returns `insurerName: "Mock Insurance Co."`, `policyNumber: "MOCK-<timestamp>"`, `premium: 500`, and detects "every 3rd gap" with explanation text **"Εικονική εξήγηση"** (literally "dummy explanation") — *regardless of the PDF you upload* ([mock-ai.service.ts:91-169](../../lib/services/ai/mock-ai.service.ts#L90)). Separately, the seed creates **no** agent↔customer relationship (grep-confirmed in `prisma/seed.ts`). |
| **UI risk** | No "demo mode / mock data" banner anywhere — the mock output is styled identically to real output. |
| **Broker embarrassment** | **The #1 demo-killer.** You upload `motor_ethniki_1.pdf` and the screen confidently shows **"Mock Insurance Co."** with gap cards reading **"Εικονική εξήγηση"** in Greek. Reads as a broken prototype. |
| **Good news** | Real Greek motor PDFs are in the repo to upload: `docs/policies/motor_ethniki_1.pdf` (+ `_2`, `_3`, and `_terms` variants). |

### Step 1 — Customer uploads competitor MOTOR PDF

| Field | Assessment |
|---|---|
| **Works?** | ✅ Mechanically yes, via both onboarding ([flow.tsx](../../app/onboarding/flow.tsx)) and wallet ([AddPolicyClient.tsx](../../components/wallet/AddPolicyClient.tsx)). |
| **Backend risk** | 15 MB cap enforced **server-side only** ([api/v1/upload/route.ts:7-82](../../app/api/v1/upload/route.ts#L7)); the wallet path uploads client-side to Supabase with **no size pre-check**. A network cut mid-upload leaves **orphaned files** with no cleanup. Wallet analysis is triggered **fire-and-forget** in `after()` ([wallet/actions.ts:143-149](../../app/(protected)/wallet/actions.ts#L143)) — if it throws, it's only logged, so the policy can sit in `analyzing` **forever**. |
| **UI risk** | No real upload progress bar. The "Extracting… / Analyzing…" step labels are **fabricated from elapsed time**, not real server state ([AddPolicyClient.tsx:50-56](../../components/wallet/AddPolicyClient.tsx#L50)). Greek filenames are sanitized to `____` for display. A >15 MB file fails as a generic "Upload failed" toast with no reason. |
| **Broker embarrassment** | Drag in a legitimate 20 MB scan → silent "Upload failed" with no explanation. Or, on a real scanned PDF, the spinner cycles **fake** progress steps for minutes while you narrate and then never resolves. |

### Step 2 — AI extracts policy data

| Field | Assessment |
|---|---|
| **Works?** | ⚠️ Partial — reliable for a **clean digital** PDF with a real API key; fragile otherwise. |
| **Backend risk** | **No PDF-text-extraction / OCR layer** — raw document bytes go straight to the multimodal model (orchestrator `prepareDocument`, ~lines 1936-2023). A scanned or low-quality Greek PDF → blank or **hallucinated** fields, which are then null-filled to `"Unknown Insurer"` / `PENDING-…`. Confidence scores are **self-reported by the model**, never ground-truth validated. Extraction is **cached** ([extraction-cache.ts](../../lib/services/analysis/extraction-cache.ts)) → a bad first extraction **persists on re-upload**. The token-budget gate can hard-**block** analysis with no degraded fallback. |
| **UI risk** | Confidence is never surfaced; the progress bar is a weighted average of per-step success scores, not a true %; no "which step / why stuck" detail. |
| **Broker embarrassment** | Confidently displays the **wrong premium or insurer**; you re-upload to "fix" it and get the **same cached wrong result**; or a token block pops "analysis blocked" with no obvious next step. |

### Step 3 — Gap / coverage analysis (is it motor-specific?)

| Field | Assessment |
|---|---|
| **Works?** | ⚠️ Partial — the gap engine is **generic, not motor-aware**. |
| **Backend risk** | Only **2 seeded motor gap definitions** (theft, legal). **No Greek motor coverage taxonomy** is modeled — ίδιες ζημιές (own-damage), φυσικές καταστροφές, οδική βοήθεια, θραύση κρυστάλλων, προσωπικό ατύχημα are all absent. Policy-level gaps are **LLM-generated** from vague prompts ("does it cover theft?") with **no structured ACORD→gap mapping** — so it can miss the third-party-vs-comprehensive distinction entirely or hallucinate (e.g. flag "missing motorcycle insurance" on a car). The protection score **lumps motor into a "Property" category** with home ([protection-score.ts:30-85](../../lib/services/gap-engine/protection-score.ts#L30)), masking motor-specific gaps. The one solid, deterministic rule: "owns a vehicle but has no motor policy → critical" ([profile-gap-rules.ts:120-132](../../lib/services/gap-engine/profile-gap-rules.ts#L120)). |
| **UI risk** | Cards render cleanly and bilingually, but show raw LLM text with no confidence flag. The score reads "Property 50%" rather than surfacing "Motor: critical gap." |
| **Broker embarrassment** | A broker knows Greek motor coverage tiers cold and will **instantly** spot generic or wrong gaps. "Property 50%" reads as the product not understanding motor at all. In mock mode, every detected gap says **"Εικονική εξήγηση."** |

### Step 4 — Connected agent sees the client & the opportunity

| Field | Assessment |
|---|---|
| **Works?** | ⚠️ Partial — and the **"opportunity appears" beat is ❌.** |
| **Backend risk** | **(a) A self-uploaded policy is invisible to the agent dashboard.** The dashboard filters policies by `createdByUserId: agentId` ([dashboard/agent/page.tsx:36-39](../../app/(protected)/dashboard/agent/page.tsx#L36)), but customer self-upload sets `createdByUserId = customer` ([wallet/actions.ts:91-92](../../app/(protected)/wallet/actions.ts#L89)). So the headline **policy count, premium, and `coverageGapPercent` all ignore it**, and the client card computes **policyCount = 0 → "No policies linked yet."** **(b) No gap→Opportunity automation** — `Opportunity` rows are only created by an **explicit** cross-sell run ([agent/actions.ts:666-675]); the dashboard pipeline value reads from the empty `Opportunity` table → **€0** ([dashboard/agent/page.tsx:46-49](../../app/(protected)/dashboard/agent/page.tsx#L46)). **(c)** The per-client protection score / gap badge come from the **`protectionScore` cache**, which may be stale → card shows null / 0. **(d)** No relationship is seeded, so it must be created live or by seed. |
| **UI risk** | On a single screen, the **Gaps Summary lists that client's critical gaps while the client's own card says "No policies linked yet"** — a visible self-contradiction. No real-time refresh (manual reload). No euro "opportunity" card at all. |
| **Broker embarrassment** | You say "watch the opportunity appear on the agent's dashboard," and the card says **"No policies linked yet"** with **no € figure** — you'd have to manually click "Run cross-sell." The seamless-automation narrative collapses. |
| **Works fine** | The agent **can** open the customer's policy detail page (`/customers/[id]/policy/[policyId]`) and see the gaps + AnalysisCard — correctly gated by relationship or access grant. The `sharePolicy` connection flow works and is safe (see myth #1). |

### Step 5 — Cross-cutting credibility (won't crash, but a sharp broker will probe)

| Field | Assessment |
|---|---|
| **Works?** | The flow proceeds without error. |
| **Backend risk** | **No AI-processing consent gate.** Policy PDFs — including Art. 9 special-category health data on other lines — are sent to the LLM with **no consent record**; `orchestrator.createRun()` has no check (design documented but not built: `docs/audits/ai-advice-compliance.md`). This does **not** break the demo. |
| **UI risk** | The AI-advice disclaimer (recently added) **does** render on gap / score surfaces — good. `NEW-UI` is uncommitted; spot-check the analysis card live. |
| **Broker embarrassment** | A compliance-minded broker asks, "do you obtain consent before sending my client's policy to an AI?" — the honest answer today is **"not yet."** |

---

## Verdict & pre-demo readiness checklist

**Can it run end-to-end today?** Yes — *conditionally*. The `upload → extract → gap analysis → customer's policy detail view` path is solid on a clean digital PDF with a real key. The `upload → agent dashboard lights up with the opportunity` path is **not** there yet.

Before the demo (these are readiness checks, **not** fixes):

- **Set a real AI API key** (`GEMINI_API_KEY` / `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` or `AI_SERVICE_TYPE`). Otherwise you get "Mock Insurance Co." + "Εικονική εξήγηση." Highest-value single check.
- **Pre-establish the agent↔customer link** (customer shares the policy with `agent1@example.com`, or seed a `CustomerRelationship`). It is not seeded.
- **Choose your path** — a decision, not a default:
  - *Customer self-upload* (faithful to the story) → accept the dashboard disconnect ("No policies linked yet" + no opportunity).
  - *Agent adds the policy for the customer* (`createdByUserId = agent`) → the dashboard headline populates; the smoother live path.
- **Use a clean digital Ethniki PDF**, not a scan, to avoid the OCR failure mode.
- **If you want a euro opportunity figure on screen**, pre-run cross-sell or pre-seed an `Opportunity` row.

---

## How to confirm this map yourself

1. **Mock vs real:** inspect `.env` for the AI keys above. Unset → expect "Mock Insurance Co." + "Εικονική εξήγηση." (Single highest-value check.)
2. **Run the path:** `npm run dev`, sign in as a seeded policyholder, upload `docs/policies/motor_ethniki_1.pdf` via the wallet "Add Policy" flow, and watch the analysis card — note insurer/premium accuracy and time-to-finish.
3. **Agent view:** establish the relationship, log in as `agent1@example.com`, open `/dashboard/agent`. Confirm the **client card shows "No policies linked yet" while the Gaps Summary shows that client's gaps** (the core Step-4 finding). Then open the customer's policy detail page and confirm the gaps render there.
4. *(Optional)* Drive the same path with Playwright for screenshots.

---

*No source files were changed to produce this map. The `sharePolicy` / STATUS.md staleness noted in myth #1 is worth correcting in a separate change.*
