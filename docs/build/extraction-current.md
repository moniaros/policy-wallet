# Policy Extraction Pipeline — Current State

_Last traced: 2026-06-01 (branch `NEW-UI`). Source-of-truth snapshot; no code changed._

## TL;DR

- Upload is **client-direct to Supabase Storage**, then a `Policy` + `PolicyDocument` row is created; AI analysis runs in the **background**.
- The PDF reaches the model as **raw base64 bytes** via the Vercel `ai` SDK `generateObject({ messages: [{ content: [{ type: "file", data, mediaType: "application/pdf" }] }] })`.
- **There is NO OCR and NO text-layer extraction.** No `pdf-parse`/`pdfjs`/`tesseract`/`mammoth`/etc. anywhere in the repo or `package.json`. The model ingests the document natively.
- Extracted fields land in **`Policy.acordData` (Json)**, the per-document **`PolicyDocument.extractionCache` (Json)**, and the run artifact **`PolicyAnalysisRun.resultJson` (Json)**. Detected gaps normalize into **`GapInstance`** rows.
- There are **two extraction code paths** (both byte-to-model): the primary **orchestrated pipeline** and a secondary **quick-extract route**.

## Two extraction paths

| | Path A — Orchestrated pipeline (primary) | Path B — Quick extract (modal/batch) |
|---|---|---|
| Entry | `createPolicy` / `uploadAndParse` → `runBackgroundAnalysis` | `POST /api/policies/extract` |
| AI SDK | Vercel `ai` SDK provider abstraction (`gemini`/`anthropic`/`openai`/`mock`) | Raw `@google/generative-ai` SDK directly (Gemini only) |
| Steps | 8-step orchestrator, retries + provider failover + caching | Single `generateContent` call |
| Persists? | Yes — `acordData`, `PolicyAnalysisRun`, `GapInstance` | No — returns preview JSON; `POST /api/policies/batch-create` persists later |
| Bytes to model | `{ type: "file", data: base64, mediaType }` | `{ inlineData: { data: base64, mimeType } }` |

Both convert the file to base64 and hand it straight to the model. Neither parses text first.

## Path A — Stage-by-stage trace

### 1. Upload UI
`components/wallet/AddPolicyClient.tsx` — drag-drop / file picker (`handleFileChange`, `handleDrop`); accepts `.pdf,.png,.jpg,.jpeg`. On submit it uploads each file **directly to Supabase Storage** (`supabase.storage.from('policies').upload(...)`, lines ~132–147) and passes the resulting public URLs to the `createPolicy` server action.

### 2. (Optional) Server upload helper
`app/api/v1/upload/route.ts` — `withApiGuard({ auth: 'user', rateLimit: 20/min })`. Validates extension + size (≤15 MB) + **magic bytes** (PDF `%PDF`, JPEG, PNG, WEBP, OLE/ZIP), then `uploadFile()` (`lib/storage.ts`) writes to Supabase `uploads` bucket (local `public/uploads` fallback) and returns the URL. Used by flows that don't upload straight from the client.

### 3. DB record creation
`app/(protected)/wallet/actions.ts` → `createPolicy()` (lines ~45–169): validates form via `PolicySchema`, creates a `Policy` (status `analyzing` when documents are attached), and a `PolicyDocument` per URL (`fileUrl`, sanitized `fileName`, `fileSize`, `source: "policyholder"`, `processingStatus: "processing"`). Then schedules `policyService.runBackgroundAnalysis()` via Next.js `after()`.
Alternative single-file entry: `lib/services/policy.service.ts` → `uploadAndParse()` (lines ~279–340), which uploads then creates placeholder `Policy` (`insurerName: "AI Analyzing..."`, `policyNumber: "PENDING-…"`).

### 4. Background analysis trigger
`lib/services/policy.service.ts` → `runBackgroundAnalysis()` (lines ~346–585): calls `PolicyAnalysisOrchestratorService.createAndExecuteRun()`, awaits completion, then merges extracted fields into the `Policy`, handles duplicate detection (same `policyNumber` + `lineOfBusiness` → merge documents, delete temp), flips `Policy.status` → `active`, `PolicyDocument.processingStatus` → `completed`, and emits a `policy_analyzed` notification.

### 5. Document load → base64 (the byte handoff)
`lib/services/analysis/policy-analysis-orchestrator.service.ts` → `prepareDocument()` (lines 1936–2023):
- Loads the latest `PolicyDocument`; fetches bytes via `fetch(fileUrl)` (Supabase URL) **or** `fs.readFile` from `public/` (local fallback), with one retry.
- Picks `mimeType` from the filename extension (defaults to `application/pdf`).
- Computes a content hash (`hashDocumentBuffer`) for extraction caching.
- Returns the `AIDocument`: **`data: buffer.toString("base64")`** — i.e. raw bytes, **no text extraction step**.

### 6. The 8-step orchestrator
Steps (`PolicyAnalysisStep.stepKey`): `document_load_and_validation` → `metadata_extraction_and_verification` → `plain_language_translation` → `coverage_mapping` → `gap_detection` → `savings_detection` → `checklist_scoring_and_actions` → `persistence_and_finalize`.
- The **PDF is sent to the model only in step 2** (`extractPolicyData`). Steps 3 & 5 (`analyzePolicyClarity`, `analyzeGaps`) pass `document: null` plus `structuredContext` (the extracted JSON) to save ~50–100K input tokens.
- Provider selection + retry + **failover** (Gemini → Anthropic → OpenAI) is handled in `executeStepWithRetry`; wrapped by `withTimeoutAndRetry` (180 s) in `lib/services/ai/shared-utils.ts`.
- Extraction caching: a cache hit on `(policyId, documentHash)` skips the AI call entirely.

### 7. The model call (raw bytes — no OCR)
All providers implement `IAIService` (`lib/services/ai/ai-service.interface.ts`) and attach the document identically:

| Provider | `extractPolicyData` `generateObject` | `{ type:"file" }` block |
|---|---|---|
| Gemini | `gemini-ai.service.ts:218` | `:227–229` |
| Anthropic | `anthropic-ai.service.ts:194` | `:203–205` |
| OpenAI | `openai-ai.service.ts:137` | `:150–152` |

Each passes `{ type: "file", data: document.data, mediaType: document.mimeType, filename }` as a content part — base64 bytes with `application/pdf`. Same shape repeats for gaps/clarity/Q&A/risk. The `mock` provider ignores `document.data` and returns synthetic data (tests).

### 8. Persistence
`policy-analysis-orchestrator.service.ts` → `persistAnalysisArtifacts()` (~2100–2288) and `runBackgroundAnalysis()`:
- `Policy.acordData` ← aggregated extraction + clarity analysis (ACORD-shaped JSON).
- `Policy` scalar columns ← `insurerName`, `policyNumber`, `lineOfBusiness`, `startDate`, `endDate`, `premiumAmount`, `coverageSummary`, `lastAnalyzedAt`.
- `PolicyDocument.extractionCache` ← raw `AIPolicyExtractionResponse`; `documentHash` + `extractedAt` set.
- `PolicyAnalysisRun.resultJson` ← full analysis result; `remediationSummary` ← failover/degradation metadata; per-step rows in `PolicyAnalysisStep`.
- `GapInstance` rows created from detected gaps (bilingual `aiExplanation`/`aiSuggestion` + `*El`).

## Path B — Quick extract (`POST /api/policies/extract`)

`app/api/policies/extract/route.ts`: auth via `getAuthenticatedUserOrNull`; validates MIME + size; then:
```
const arrayBuffer = await file.arrayBuffer()
const base64Data = Buffer.from(arrayBuffer).toString("base64")     // line 42–43
const imagePart = { inlineData: { data: base64Data, mimeType: ... } } // line 73–78
const result = await model.generateContent([prompt, imagePart])      // Gemini, raw SDK
```
Returns enriched preview JSON (`enrichExtractionPayload`) — **does not persist**. `POST /api/policies/batch-create` (≤10 policies) later writes rows, gating on confidence ≥ 80 % / `requiresReview`.

> Note: this path uses the **raw `@google/generative-ai` SDK**, independent of the provider-abstraction used by Path A — two extraction implementations to keep in sync.

## What fields come back

Three AI response schemas (TypeScript interfaces in `lib/services/ai/ai-service.interface.ts`; Zod enforcement in each provider, e.g. `gemini-ai.service.ts`):

- **`AIPolicyExtractionResponse`** (interface 86–106): `insurerName`, `policyNumber`, `lineOfBusiness`, `startDate`, `endDate`, `premiumAmount`, `coverageSummary`, optional `customerName/Surname/Email`, `exclusions[]`, `extractionMeta { overallConfidence, fieldConfidence, missingCriticalFields[], requiresReview }`, and nested **`acordData`**.
- **`AIGapAnalysisResponse`** (76–81): `verifiedMetadata`, `gapResults[] { slug, isDetected, explanation{en,el}, suggestion{en,el} }`.
- **`AIPolicyClarityResponse`** (171–182): `plainLanguageSummary`, `coverageSnapshot`, `savingsOpportunities[]`, `coverageGaps[] { slug, severity, evidence, recommendation }`, `checklistScores[]`, `priorityActions[]`, `finePrintWarnings[]`, `hiddenPerks[]`.

**`AcordDataSchema`** (`lib/schemas/acord-data.ts`, `_version: 2`) is the type-specific structured block with sections per line of business: `vehicle` (motor), `property`, `health`, `lifeAndInvestment`, `pet`, plus cross-section `coverages[]`, `exclusions[]`, `finePrintClauses[]`, `perksAndBenefits[]`, `notableConditions[]`.

Greek-only model output is wrapped to bilingual `{en, el}` by `lib/services/translation/greek-to-bilingual.ts` (initially `en := el`, replaced by the batch translator).

Downstream-derived (not extraction): `ProtectionScoreResult` (`lib/services/gap-engine/protection-score.ts`) and the full `GapEngineResult` (`lib/services/gap-engine/index.ts`).

## Data model (extracted-policy data)

`prisma/schema.prisma`:

- **`Policy`** (293–324): scalar metadata columns + **`acordData Json?`** (308, all AI-extracted/aggregated data) + `lastAnalyzedAt`. `status` is a `String` (app-enforced: `analyzing|active|action_needed|expired`), not a DB enum.
- **`PolicyDocument`** (326–346): `fileUrl`, `fileName`, `fileSize`, `source`, `processingStatus` (333), `documentHash` (336), **`extractionCache Json?`** (337), `extractedAt` (338). Cascades on policy delete.
- **`PolicyAnalysisRun`** (from 827): provider/model, `status` (enum `AnalysisRunStatus`), token counters, `remediationSummary Json`, **`resultJson Json`** (final analysis), lease/concurrency fields.
- **`PolicyAnalysisStep`**: per-step status, success %, token usage, remediation type.
- **`GapInstance`**: detected gap (`severity`, `status`, bilingual `aiExplanation`/`aiSuggestion` + `*El`) → `GapDefinition` (templates) → `RecommendationInstance` (personalized, bilingual Json) → `InsuranceProduct`.
- **`ProtectionScore`**: per-user `overallScore`, `categoryScores Json`, `expected/actualLines Json`.
- Reference catalogs (no extracted data): `Insurer`, `InsuranceType`, `InsuranceProduct`.

## Confirmation: NO OCR / NO text layer (raw bytes → model)

| Evidence | Location |
|---|---|
| `AIDocument` stores base64 `data` only — **no text field** | `lib/services/ai/ai-service.interface.ts:12-19` |
| Orchestrator returns `data: buffer.toString("base64")` | `policy-analysis-orchestrator.service.ts:2018` |
| Gemini/Anthropic/OpenAI all send `{ type:"file", data, mediaType }` | `gemini:227`, `anthropic:203`, `openai:150` |
| Quick-extract route sends `inlineData { data: base64, mimeType }` | `app/api/policies/extract/route.ts:42-78` |
| Supported MIME types are document/image, model-native | `*-ai.service.ts` `*_SUPPORTED_MIME_TYPES` (`application/pdf`, png/jpeg/webp) |
| **Zero** OCR/PDF-parse dependencies | `package.json` — no `ocr/tesseract/pdf-parse/pdfjs/pdf2json/mammoth/textract/unpdf` |

Conclusion: the platform relies entirely on the AI models' native document understanding. There is no preprocessing OCR or text-extraction layer.

## Open questions / things to verify next
- Lifecycle: are Supabase/local files deleted when a `Policy` is deleted (only DB rows cascade)?
- `documentHash` dedup: confirmed it's set in `prepareDocument`, but is identical-file dedup enforced at upload?
- Two-path drift: Path B uses a different SDK and prompt than Path A — worth consolidating.
- ACORD write-time validation: is `Policy.acordData` validated against `AcordDataSchema` on persist, or trusted?
