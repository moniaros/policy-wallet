# AI-Advice Compliance — Findings & Changes

**Date:** 2026-05-31
**Scope:** Close STATUS Critical #3 — AI gap analysis, recommendations, and protection scores reach users in the regulated Greek insurance market without a "not insurance advice" disclaimer; AI prompts framed output as personalized advice; no consent exists for AI processing of policy documents (which carry special-category health data).
**This pass:** Parts 1 (disclaimer) and 2 (prompt framing) implemented. Part 3 (consent) is a documented proposal only — it requires a Prisma migration and is a separate reviewed change.

---

## Part 1 — Disclaimer surfacing

### Canonical i18n key (added)
There was **no** "not insurance advice" i18n key before — only `t.wallet.aiFootnote` (an *accuracy* note) and the unused legal text in `lib/legal/legal-content.ts`. Added one canonical key reusing the lawyer-approved wording:

`common.aiAdviceDisclaimer` — [lib/i18n/translations/en.ts](../../lib/i18n/translations/en.ts), [el.ts](../../lib/i18n/translations/el.ts)
- **EN:** "AI outputs are informational support and are not legal or insurance advice. You should verify critical decisions with a licensed professional."
- **EL:** "Οι αναλύσεις AI παρέχουν υποστηρικτική πληροφόρηση και δεν αποτελούν νομική ή ασφαλιστική συμβουλή. Συνιστάται επιβεβαίωση κρίσιμων αποφάσεων με εξουσιοδοτημένο επαγγελματία."

### Shared component
[components/ui/AiDisclaimer.tsx](../../components/ui/AiDisclaimer.tsx) — renders `common.aiAdviceDisclaimer` (EL/EN) via `useLanguage()`, with an optional `language` prop for surfaces that pass one. No hardcoded strings at any call site.

### Surfaces covered
| Surface | File | Type | How |
|---|---|---|---|
| Coverage recommendations | `components/coverage/RecommendationCards.tsx` | policyholder + agent (reusable) | footer `<AiDisclaimer language=…>` |
| Protection score card | `components/coverage/ProtectionScoreCard.tsx` | policyholder + agent (reusable) | footer |
| Gap list | `components/gaps/GapList.tsx` | reusable (covers every `GapCard`) | footer |
| Coverage-insights gaps (lite path) | `components/coverage/CoverageInsightsClient.tsx` | policyholder | before "Next steps" |
| Wallet policy AI analysis | `app/(protected)/wallet/[id]/AnalysisCard.tsx` | policyholder + agent (also used by the agent customer-policy view) | foot of gaps list |
| Policy Q&A | `components/wallet/PolicyQA.tsx` | policyholder | alongside existing `aiFootnote` |
| Agent onboarding demo | `components/onboarding/agent/DemoAnalysisStep.tsx` | agent | under demo gaps |
| Savings report (HTML/PDF export) | `lib/services/reports/savings-report.ts` | export | localized footer via `getTranslations(language)` (was hardcoded English); `language` threaded from `savings-report/route.ts` using `dbUser.preferredLanguage` |

**Agent coverage:** the agent customer-policy view (`app/(protected)/customers/[id]/policy/[policyId]/page.tsx`) renders gaps via `<AnalysisCard>` → covered. The agent dashboard (`app/(protected)/dashboard/agent/page.tsx`) shows only a numeric `overallScore` per customer — treated as a **portfolio metric, not an advice surface**, so intentionally not decorated (the substantive score card, gaps, and recommendations all carry the disclaimer). Flag if a disclaimer is wanted there too.

---

## Part 2 — Prompt framing (before → after)

Applied identically across all three providers — [gemini-ai.service.ts](../../lib/services/ai/gemini-ai.service.ts), [anthropic-ai.service.ts](../../lib/services/ai/anthropic-ai.service.ts), [openai-ai.service.ts](../../lib/services/ai/openai-ai.service.ts) — in `analyzeRiskProfile`, plus the [ai-service.interface.ts](../../lib/services/ai/ai-service.interface.ts) docstring.

| # | Before | After |
|---|---|---|
| Persona | `You are an expert Greek insurance advisor. Analyze this person's risk profile and current insurance portfolio.` | `You are an informational insurance-analysis assistant for the Greek market. Analyze this person's risk profile and current insurance portfolio for educational purposes.` |
| Instruction #3 | `Provide actionable, personalized insights (not generic advice)` | `Provide factual, informational observations about coverage gaps and overlaps; do not give personalized financial or insurance advice or tell the user what they "should" buy. Phrase findings as observations (e.g. "this profile appears to lack ...", "this policy may not cover ...").` |
| Zod `insights` desc | `Personalized risk insights (max 5)` | `Informational coverage observations (max 5)` |
| Zod `prioritizedGaps` desc | `Missing insurance lines ranked by urgency (max 5)` | `Insurance lines not currently detected in the portfolio (max 5)` |
| Interface docstring | `to generate personalized insurance insights and prioritized gap recommendations.` | `to surface informational observations about coverage gaps and overlaps.` |

**Reviewed and left as-is:** `extractPolicyData` (neutral parser prompt), `analyzeGaps` (neutral; outputs a `suggestion` field), `askQuestion` (informational). Output language behavior (Greek output, bilingual fields) is unchanged — only instruction/description framing changed. A grep of `lib/services/ai` for `you should` / `we recommend` / `advice` confirms no remaining advice-framing prompt strings after these edits.

---

## Part 3 — Consent gate (IMPLEMENTED 2026-07-03)

> **Status update (2026-07-03):** implemented as designed below, with three corrections discovered during implementation:
> 1. `/api/v1/jobs/process-policy` needs **no** gate — it runs deterministic gap detection only and never reaches an LLM.
> 2. The policy **Q&A path** (`askPolicyQuestion` → `aiService.askQuestion`) *does* send extracted policy content (acordData) to an LLM and is now gated too.
> 3. Consent is checked against the policy **owner** (the data subject), not the run initiator — an agent with a grant/relationship cannot analyze a customer's documents until the customer has consented.
>
> **What shipped:** `ai_processing` in `ConsentType` + `User.aiProcessingConsentVersion` (migration `20260703000000_ai_processing_consent`, authored offline — apply with `prisma migrate deploy`/`dev` on the next DB-connected run); `POST /api/v1/consents` accepts `ai_processing` (authenticated only — anonymous is 401); gate in `PolicyAnalysisOrchestratorService.createRun()` returns a `blocked` run with `failureCode: "AI_CONSENT_REQUIRED"` *before* any policy/document status mutation; same check in `GapAnalysisService.analyzePolicy()` and `askPolicyQuestion`; capture UI via `components/ui/AiConsentModal.tsx` at the wallet upload form, onboarding step-2 upload, and both re-run buttons; `AI_CONSENT_REQUIRED` mapped in `lib/i18n/wallet-error.ts`. Tests: `tests/unit/ai-processing-consent-gate.test.ts`, `tests/unit/ai-processing-consent-capture.test.ts`.

### Original proposal (for reference)

**Verdict: no AI-processing consent exists today.** `ConsentType` = `cookie | terms | privacy` only ([lib/compliance/consent.ts](../../lib/compliance/consent.ts), `prisma/schema.prisma`); `User` has `termsVersionAccepted` / `privacyVersionAccepted` / `cookieConsentVersion` / `consentUpdatedAt`; `ConsentAudit` records events. Policy documents (and `PolicyholderProfile.chronicConditions` / `familyMedicalHistory` — GDPR Art. 9 special-category data) are sent to third-party LLMs with no explicit AI-processing consent.

### Minimal design (matches the existing consent pattern)
1. **Store:** add `ai_processing` to the `ConsentType` enum; add `User.aiProcessingConsentVersion String? @map("ai_processing_consent_version")` (reuse `consentUpdatedAt`). Record events in `ConsentAudit` as today. → Prisma migration.
2. **Capture:** extend the `POST /api/v1/consents` zod enum to accept `ai_processing`; add a consent checkbox at (a) the onboarding analysis step (`app/onboarding/` upload→analyze) and (b) the wallet upload/analyze action — both natural first-AI-touch points.
3. **Gate (single chokepoint):** in `PolicyAnalysisOrchestratorService.createRun()` ([lib/services/analysis/policy-analysis-orchestrator.service.ts](../../lib/services/analysis/policy-analysis-orchestrator.service.ts)), before the token-budget step, read the user's `aiProcessingConsentVersion`; if absent, throw `AI_PROCESSING_CONSENT_REQUIRED` (403) before any document bytes reach a provider. Also guard the legacy `gap-analysis.service.ts analyzePolicy()` path and the `/api/v1/jobs/process-policy` route.

### Effort / risk
One migration + ~3 touch points + UI checkbox. Low complexity, but DB-touching → land as a separate reviewed PR with the migration run via `npx prisma migrate dev` and `verify:migrations`.

---

## Verification (this pass)
- `npm run lint:i18n-changed` — every disclaimer uses the i18n key; no hardcoded UI strings introduced.
- `npm run lint`, `npm run type-check`, `npm run lint:utf8` — clean (Greek text valid UTF-8).
- Manual: `/coverage-insights`, a wallet `AnalysisCard`, the agent customer-policy view, and a generated savings report — disclaimer renders once per surface in the active language (EL/EN).
