# PW-AUDIT-01 — Product truth, Phase 0

**Audit date:** 2026-09-12. **Baseline:** local `NEW-UI`, commit `f6bb47e`. **Disposition:** Phase 0 delivered for owner review; Tracks A–G have not started. This is a code audit, not a production certification.

## Evidence contract

- **[C] Code-verified:** the cited implementation exists and its data flow was inspected. This does not prove deployment, runtime configuration, or successful real-world execution.
- **[M] Locally measured:** a counted source inventory or dependency-free assertion executed in this checkout.
- **[D] Documented-only:** a statement in existing documentation or the programme brief, not independently established.
- **[U] Unavailable:** evidence is absent or outside the owner's local-only authorization. Unknown never means zero.
- Paths and line numbers refer to this baseline. No production database, storage, telemetry, Vercel settings, accounts, or provider APIs were accessed. No documents were uploaded; no email, push, seed, migration, or product change was executed. Existing unrelated working-tree changes were preserved.

Companion records: [HALTS](HALTS.md) and [local verification evidence](LOCAL-EVIDENCE.md).

**Principal conclusion [C/U]:** PolicyWallet has a substantial two-sided insurance organisation and analysis application. It is not yet evidenced as the deterministic, provenance-controlled product assumed by the brief. Its primary analysis pipeline lets models produce detected gaps and severity-bearing clarity findings, persists them into shared records, and exposes derived judgments to policyholders. Reliable accuracy and euro-cost measurements are unavailable. Several security and correctness defects gate readiness independently of visual quality.

### Baseline disagreements

| Assumption | What this checkout establishes |
|---|---|
| `decideGapsForPolicy` owns detection and severity | [C] No implementation found in `lib`, `app`, or tests. `lib/gap-detection.ts:19` exports `detectGapsForPolicy`; the main orchestrator instead calls provider `analyzeGaps` at line 1124. |
| D-V1 is the frozen engine baseline | [U] No identifiable D-V1 baseline was found. [M] Current SHA-256: `f230e51e962402acbce95313fd3be04c9192335e47dfb7bd0f53be3b630d1964`. Recorded as current only; file unchanged. |
| Transparency/content/bridge predecessors have established the boundary | [U] No matching completed programme artifacts found in the local documentation search. Existing untracked programme proposals are not completion evidence. |
| F4 provides a no-consumer production window | [U] No usable F4 evidence/window established. Nothing is eligible for deletion based on this audit. |
| Three seeded production accounts and zero native registrations | [D/U] Brief assertions; neither production identities nor row counts verified. Local seed scripts do not establish production state. |
| `/methodology` exists | [C] No corresponding route found in the public route inventory. |

## 0.1 — Document to finding to outbound artifact

### Entry paths: there is no single upload pipeline

1. **Server-action upload [C]:** `app/(protected)/wallet/actions.ts:303` authenticates, calls `PolicyService.uploadAndParse`, then schedules `runBackgroundAnalysis` with Next `after` (line 328). `lib/services/policy.service.ts:279` validates size/MIME, calls storage, and creates an analysing policy with temporary identity, dates, zero premium, and `lineOfBusiness: 'other'`. The service returns `{policy, extracted:false, policyId}`; it does not synchronously extract.
2. **Manual form plus client-uploaded URLs [C]:** `wallet/actions.ts:45` authenticates, checks policy capacity, validates metadata, persists supplied document URLs/names/sizes, and schedules the same background analysis at line 139. A policy without documents becomes active immediately. URL acceptance and later server fetching deserve a dedicated trust-boundary review; this audit did not exercise arbitrary URLs.
3. **Batch extraction [C]:** `components/wallet/BatchUploadModal.tsx:55` posts each file to `/api/policies/extract`. That endpoint invokes the older Google SDK directly, parses JSON, enriches fields and returns data to the modal; it does not use orchestrator token reservation, extraction caching, or its telemetry (`app/api/policies/extract/route.ts:32`). Missing insurer/number/branch/dates become defaults at lines 106–110, including `motor` and manufactured dates. Batch save is a separate `/api/policies/batch-create` request. Its schema accepts metadata only (maximum ten policies/request); it creates no PolicyDocument and schedules no full analysis. It marks metadata active/incomplete based on client-supplied extractionMeta. No policy-capacity check appears in this handler (`app/api/policies/batch-create/route.ts:7,39`).
4. **Generic upload [C]:** `/api/v1/upload` is authenticated and rate-limited to 20 requests/minute, accepts a multipart `file` and optional folder, returns `{url,fileUrl}` inside the standard response. It permits PDF/JPEG/PNG/WebP/DOC/DOCX up to 15 MiB and checks for any allowed signature, not a signature matched to the selected extension (`app/api/v1/upload/route.ts:7`). HEIC is absent here; other upload validation advertises HEIC, while document preparation infers only PDF/PNG/JPEG/WebP. Acceptance and actual provider-readable format are inconsistent.

### Stage ledger

For **every row below**, real-document input/output token counts, elapsed time, and euro cost are **[U]**. A dash in the AI column means no direct model call in that stage, not zero infrastructure cost. Source estimates are budgets, not measurements. No OCR or analysis benchmark was run.

| Stage and evidence [C] | Inputs → outputs | Service/settings and accounting | Failure, retry/cache, and visible result |
|---|---|---|---|
| Storage — `lib/storage.ts:24` | `File, folder` → stored bytes and URL; URL/name/size/uploader become `PolicyDocument` | Supabase `uploads`, timestamp + sanitised name, `upsert:false`; `getPublicUrl` at line 59. No model. | Configured upload errors throw. Without Supabase configuration, writes under `public/uploads` without a production-only prohibition. Bucket privacy/RLS [U]; public local fallback is code-verified. Caller receives upload error, no trustworthy analysis result. |
| Queue and admission — orchestrator `:278`, service `:346` | `policyId,userId` → `PolicyAnalysisRun{status,provider,model,estimatedTokens,priority}` | Loads authorised policy, counts active definitions for the **current stored branch**, estimates budget, sets policy/document processing states, checks tokens. Run provider hardcoded `gemini`. | Blocked budget returns `blocked/TOKEN_LIMIT_BLOCKED`, policy `action_needed`, documents `failed`. `after` is code scheduling, not evidence of a durable production queue. |
| Load/validation — orchestrator `:1936` | Latest `PolicyDocument.fileUrl` → `AIDocument{data:base64,mimeType,fileName}`, document ID and SHA-256 | HTTP fetch or local file read; extension-derived MIME. No separate OCR worker/service found on this path. | Missing document: `MISSING_DOCUMENT`. Fetch/read attempted twice with 500 ms pause; failure `DOCUMENT_LOAD_FAILED`. Whole file held in memory; no resumable or camera-conversion stage here. |
| OCR/extraction — orchestrator `:870`, provider `gemini-ai.service.ts:219` | Raw document → `AIPolicyExtractionResponse` (shape below) | Multimodal provider does document reading and extraction together. Gemini default `gemini-2.5-pro`, temperature 0.1, structured object output. Usage goes to token tracking if supplied. | Cache keyed by policy + SHA-256 + current document ID, 24-hour TTL (`extraction-cache.ts:16`). Cache read errors become misses; writes are background best effort. No cross-policy global deduplication. Missing required fields reduce a six-field completeness score, not measured accuracy. |
| Envelope/population — orchestrator `:2025`, `:2126` | Extraction + stored metadata + clarity ACORD → `Policy` fields and `acordData.analysis.{clarity,pipeline}` | `enrichExtractionPayload` and shallow object merges; date parsing falls back to stored dates. No independent formal evidence/provenance envelope. | Existing/default fields can survive failed extraction. Clarity ACORD is merged after extraction ACORD. Missing evidence must not be interpreted as a verified value. |
| Plain language/coverage — orchestrator `:977`, `:1058` | Structured extraction + metadata + checklist → bilingual summary, covered/not-covered lists, limits, deductibles, exclusions, savings, clarity gaps, actions | Calls `analyzePolicyClarity(null,...)`, default Gemini Pro, temperature 0.2. Coverage mapping consumes the result; no second PDF call. | Eligible for degraded completion subject to flags/canary. Missing sections persist in pipeline metadata. A complete JSON response does not establish correct coverage interpretation. |
| Main gap decision — orchestrator `:1104` | Metadata + definitions `{slug,name,description,checkCriteria}` + structured extraction → `{verifiedMetadata,gapResults:[{slug,isDetected,explanation,suggestion}]}` | Provider `analyzeGaps(null,...)`, temperature 0.2. All three real provider schemas accept `isDetected`; clarity schemas accept `severity`. | Return-count/definition-count produces `successPct` at line 1142. It is a response-completeness measure. Definitions were loaded at line 724 **before** extracted branch is applied: initial `other` policies can receive the wrong/empty authored set. |
| Savings/checklist — orchestrator `:1170`, `:1226` | Clarity outputs + deterministic savings heuristics → merged savings, checklist/actions | Local processing after the clarity model call. Eleven checklist pillars, 37 authored checklist entries [M]. | Derived estimated savings and pass counts are not independently validated against document labels. Both stages can degrade. |
| English translation — orchestrator `:1285`, `translation/batch-translator.ts:29` | Greek strings → English strings, batches of at most 40 | Hardcoded `gemini-2.0-flash`, structured object; translation cache hashes language pair + source text, uses a 500-entry memory LRU plus DB, with no expiry check in the read path (`translation-cache.ts:12,47`). Temperature/output cap not explicitly set at call site. Usage discarded, outside run/token cost totals. | Translator catches batch errors and returns Greek in English slots at line 77. Therefore outer `translationFailed` handling can remain false. Count mismatch pads with Greek. EN parity can fail silently. |
| Persistence — orchestrator `:2180`–`:2284` | AI gap results + clarity gaps → definitions/instances, updated policy/document, run result | Transaction replaces all policy gap instances. Main detected gaps get `medium`; clarity-only gaps retain AI severity. Unknown slugs create active global definitions with `ruleId: ai_<slug>`, source `ai_clarity_pipeline`. | No authored-only or `under_review` gate. Reanalysis deletes/recreates instances and can lose resolved/dismissed history and IDs. Transaction rollback protects this group of writes, not every earlier run/token/cache operation. Persistence is critical. |
| Policyholder render — wallet detail `page.tsx:29`; coverage-insights `page.tsx:13` | Policy/ACORD/open gaps/run status → details, summaries, scores, recommendations | Wallet detail filters `open`; coverage-insights includes `detected,acknowledged,open`. `PolicyDetailsClient` delegates to `components/wallet/PolicyDetailsClientView.tsx`. | Different status filters can produce different visible finding sets. Coverage-insights can run legacy detection on page render when no policy was analysed within the last hour, then runs the profile/score engine. Error fallback derives score from gap penalties. |
| Agent render — `customers/[id]/policy/[policyId]/page.tsx:17` | Same policy/definition/instance records + customer relationship → client policy view and collaboration | Different access path from wallet; relationship or active grant. | No shared agent-only/strict-content policy found. Relaxed basis labels and provenance checks cannot be assumed from current severity styling. |
| Export — `api/v1/policies/[id]/savings-report/route.ts:28`, report generator `:32` | Latest completed or warning-completed `resultJson` → downloadable HTML, printable to PDF | Owner-only, Pro feature/admin entitlement bypass; no agent branding parameters. No model. | No analysis → 404; non-owner → 403. Generator renders savings/confidence and severity (including default medium), English structural text, bilingual disclaimer. No strict-content sanitiser. |
| Outbound notifications/digest — `lib/notifications.ts:23`, `weekly-digest.service.ts:16` | Events or account queries → title/message/template HTML → Brevo/FCM → notification records | See outbound inventory below. This is not a guaranteed final stage of every orchestrator run. | Credentials enable real dispatch. No blanket test stub. Digest can render stale score without catalogue/date validation; failure-return handling can incorrectly record success. |

**Concrete shapes [C]:** `ai-service.interface.ts:12`–`:108` defines raw documents, metadata, extraction and gap responses. Extraction requires insurerName, policyNumber, lineOfBusiness, startDate/endDate strings, premiumAmount number and coverageSummary; optional customer identifiers, exclusions, extractionMeta `{overallConfidence,fieldConfidence,missingCriticalFields,requiresReview}`, arbitrary `acordData`, and usage. This is seven required top-level extraction fields; the runtime completeness calculation checks six identification/date/premium fields. `GapInstance` stores severity/status and EL/EN explanation/suggestion, without confidence, authored validation state, office-standard attribution, or evaluated-definition version (`schema.prisma:372`). Definition version exists but is not pinned to each instance (`:361`).

### Separate engines and failure semantics

- **Legacy deterministic path [C]:** `detectGapsForPolicy` reads active definitions for exact branch equality. It interprets `rules` or legacy `type`, not natural-language `check`. `createGapInstances` writes status `detected` and can reactivate closed instances (`gap-detection.ts:180`). Called by user-authenticated, owner-checked `/api/v1/jobs/process-policy` and coverage-insights page. Thus it is not merely unused code. Prompt-only seeds cannot evaluate there; the `all` seed is excluded by exact branch queries. `low_limit` compares `premiumAmount` to threshold (`:100`), not an insured coverage limit.
- **Portfolio/profile path [C]:** `gap-engine/index.ts:78` loads profile, policies and persisted gaps; computes profile gaps, protection score, product recommendations and optional AI risk insights. `profile-gap-rules.ts:343` deduplicates by branch, keeping highest severity. This is a distinct inference system, not evidence of authored document checks for those branches.
- **Older AI gap service [C]:** `gap-analysis.service.ts:180` separately loads the document and invokes provider analysis. `wallet/actions.ts:596` calls it. Optimisations in the orchestrator do not cover every extraction/gap request.
- **Retry boundaries [C]:** orchestrator constants at lines 69–70 allow three step attempts and five run attempts; actual execution depends on failure classification, model/provider capability and remediation (`:1528`, `:1749`, `:1782`, `:1845`). Document loading has its own two tries. Provider `shared-utils.ts:10,48` adds a 180-second timeout and one transient retry with 2-second backoff; sampled Gemini callbacks ignore the supplied AbortSignal, so wrapper timeout does not establish upstream cancellation. Provider calls do not set explicit output-token caps in the inspected extraction/gap/clarity call sites; SDK-internal defaults are unverified without dependencies. Successful preceding stages can repeat in a full-run retry. `retryMissing` reuses stored results with schema validation, but document preparation and extraction/cache lookup still occur. Do not multiply these maxima into a claimed observed retry rate.
- **Provider disagreement [C]:** factory `:84` supports environment override and Gemini → Anthropic → OpenAI → mock when unspecified. The orchestrator creates a Gemini run explicitly, so a factory mock fallback does **not** describe every analysis path. Routing has a tier API but orchestrator `getDefaultModelForStep` supplies no user tier. Standard/premium Gemini extraction point to the same model.
- **Flag disagreement [C/U]:** `env.ts:29` declares default canary `internal`; remediation policy reads raw `process.env` and defaults missing canary to `off` (`remediation-policy.ts:39`). Degraded=true in the parsed configuration is not sufficient to enable degradation for a user. Production values unavailable.
- **Failure presentation [C/U]:** run results expose status, blocked/failure codes, missing artifacts and message keys through the status endpoint; service catches unsuccessful completion and marks failure. These mappings were inspected, not observed in a browser. No before/after timings or mobile screenshots exist for this phase.

## 0.2 — Audiences, shared facts, and outbound boundary

| Audience | Can see/do/cause [C] | Limits and cross-boundary defects [C/U] |
|---|---|---|
| Policyholder | Own wallet, upload/manual/batch entry, ask questions, trigger eligible analysis, inspect findings, grant/revoke access, answer questionnaires, complete tasks, collaborate, export eligible report. Evidence: `wallet/actions.ts`, `tasks/actions.ts`, wallet detail, v1 grant/invite routes. | Wallet detail checks exact policy scope. Other APIs/actions do not consistently reproduce it. Free-tier UI and enforcement differ; see money section. |
| Agent | Customer relationships, customer policies, opportunities, reminders, questionnaires, collaboration, team features; `agent/actions.ts:89,403,552,594,658`. Agent customer view reads the same policy/ACORD/gap rows as owner. | Relationship and AccessGrant are overlapping authorities. Orchestrator rejects any active shared-viewer grant before checking agent relationship (`:2453`), but accepts a relationship without status filtering (`:2469`). An agent with both records can be denied while an inactive relationship alone can permit analysis. |
| Admin | Admin layout role gate, administrative configuration and review, explicit collaboration override (`collaboration.service.ts:48`). | Admin permissions are not universally interchangeable with ownership: savings-report entitlement bypass does not bypass its owner check. No production admin action performed. |

### Interaction ledger for Phase 0 (code trace; not the two-session Track D harness)

| Interaction | Shared state / reader and writer evidence | What remains broken or unproved |
|---|---|---|
| Invite/redeem | `Invite`, `AccessGrant`, `CustomerRelationship`; `wallet/actions.ts:376`, `/api/v1/invites`, public invite route | sharePolicy owner gate and random UUID fix still present. Redeem, expired invite and wrong-account behavior require isolated two-session validation. |
| Grant/revoke / advisor disconnect | `AccessGrant.status`, relationship authority; `wallet/actions.ts:553,580,686`, `api/v1/access-grants`, `api/v1/policies/share/route.ts:118` | Shared-list GET extracts policy IDs from grant scopes without binding returned policy owner back to grant granter. Revoking a grant does not establish that independent relationship/participant access disappeared. |
| Agent policy/extraction confirmation | Customer policy editor and shared policy/ACORD rows; `agent/actions.ts:403`, customer policy page | No single immutable authored confirmation/provenance boundary established. Cross-view update visibility and edit permission require Track D evidence. |
| Notify about finding | Gap/opportunity records, notification events, collaboration automation | Generic sending transports exist; no central strict-content filter verifies arbitrary supplied title/message. No message sent. |
| Questionnaire | `QuestionnaireInstance`, response; `agent/actions.ts:552`, `tasks/actions.ts:123` | Submit action authenticates but does not verify instance recipient/ownership before creating response and marking instance completed. |
| Task creation | `UserTask`; `tasks/taskActions.ts:18` | Authenticated caller supplies recipient `userId` without relationship/recipient authorisation. Update action checks recipient or creator. |
| Document request and messaging | `CollaborationThread`, participants/messages/actions; `collaboration.service.ts:37,232,257,306` | Access accepts participant or either relationship party, without active relationship/grant requirement. Retained records may remain accessible after disconnect. No zero-leakage claim possible. |
| Report and sharing | Savings HTML from run JSON; policy-sharing grants and invite email | Owner report exists; office-branded, one-click client report delivery advertised on marketing was not found as an implemented report pipeline. Generic sharing is not that feature. |
| Consent on upload | Consent utility and upload/analysis entrypoints | Only cookie/terms/privacy versions in `lib/compliance/consent.ts:6`; no explicit AI-processing consent gate in traced upload/provider path. |
| Digest | Policyholder-owned policies/gaps, cached score/recommendations → digest email | Reads cached score without freshness proof; urgency/cost leave agent-independent logic for policyholder inbox. Transport result handling discussed below. |

### Outbound inventory and strict surfaces

**Strict boundary is an owner requirement, not currently an implemented universal guard.** The existing AI disclaimer does not remove severity, rankings, estimates, unsupported assurances, or provenance omissions.

| Surface family | Delivering code and payload | Boundary observation |
|---|---|---|
| Policy invitation / existing access email | `lib/email/invite-emails.ts:68,95`, called by `wallet/actions.ts:376`; policy identity, sender identity, invite/access URL | Must remain strict; token/owner improvements do not validate all downstream access. |
| General notification / renewal / gap event | `lib/notifications.ts:23`, `lib/mail-templates.ts:54`, jobs/process-policy, renewal actions and `renewal.service.ts:26` | Template or caller message goes to email/push. Viber/WhatsApp channel values exist but no delivery branch in this dispatcher; absent push token also skips dispatch while default sent status can survive. |
| Collaboration and document/questionnaire request | `collaboration.service.ts:217,281,328`; `collaboration-reminders.service.ts` | Messages are customer-facing even when composed by agent. Retained thread permissions lack disconnect enforcement in shared access helper. |
| Weekly digest | `weekly-digest.service.ts:95,111,138,171`; `email/templates/weekly-digest.ts:26` | Includes gap count, health score, top recommendation urgency/estimated cost. `healthScoreChange` hardcoded zero. `sendEmail` result is not checked before creating sent record (`:185`). |
| Welcome / engagement / churn / perk reminders | `engagement-drip.service.ts`, `churn-prevention.service.ts`, `perk-reminder.service.ts`; corresponding email templates | Separate caller families must be included in future guard coverage; not automatically protected by a report-only fix. |
| Auth and account messages | `app/auth/actions.ts`, `app/api/auth/reset-password/route.ts`, `lib/mail.ts` | Verification/reset artifacts are outbound too; no auth journey executed. |
| Agent approval/rejection/welcome and team invitations | `app/(protected)/admin/actions.ts`, `email/templates/agent-emails.ts`, `team.service.ts` | Agent operational messages are a separate audience; forwarding or client-facing output still invokes strict policy. |
| Policy report / data export / shared link | Savings-report route/generator; `/api/v1/me/data-export` and download route; policy share/invite routes | Exports leave the screen. Savings HTML renders raw derived severity/confidence; no destination-aware filter found. Privacy export semantics need owner review before modification. |

**Dispatch verification [C]:** `email-service.ts:45` only simulates success in nonproduction **when BREVO_API_KEY is absent**. With a key it calls Brevo. `push.service.ts:120` uses FCM credentials for real OAuth/send. No blanket stub was verified, so no service/job/UI path capable of sending was executed.

**Renewal cross-check [C/M]:** the early `.find` at `renewal.service.ts:70` returns 90 at day 7, but it is only an eligibility check. Actual dispatch computes unsent milestones and selects the last/closest at lines 123–131; day 7 with no sent milestones selects 7. Therefore the early expression is **not evidence of a reminder-selection defect**. Delivery history and catch-up behavior are unmeasured. The verified notification/digest sent-status defects remain independent findings.

## 0.3 — Honest coverage and quality

### Authoring counts [M]

Counting basis: `const gaps` in `prisma/seed.ts:342`–`:504`; nine definition objects, all nine set `isActive:true` **in seed source**. No seed was executed. `ruleId` is an authoring hint, not validated provenance.

| Stored branch | Definitions / 9 seeded definitions | Prompt checks | Deterministic rules | Seed identifiers |
|---|---:|---:|---:|---|
| motor | 3/9 | 2 | 1 | motor-theft, motor-legal, green_card_expiring |
| health | 2/9 | 1 | 1 | health-outpatient, missing_coordination_centre |
| home | 2/9 | 1 | 1 | home-earthquake, missing_enfia_components |
| pet | 1/9 | 0 | 1 | missing_leishmaniasis |
| all | 1/9 | 1 | 0 | low_deductible_premium_waste; excluded by exact branch selectors |
| contents, life, travel, liability, cyber, group health, group pension and other branches | 0/9 each | 0 | 0 | No entries in this seed array; not a statement about production definitions or generic AI output. |

Totals: **5/9 prompt checks; 4/9 deterministic rules; four named branches with document definitions**. Only three named branches have prompt checks. On the deterministic path prompt-only `check` entries fall through; on the AI path deterministic entries become description/checkCriteria rather than executing their authored rules. Auto-created AI definitions can extend the DB set, so production-active counts cannot be inferred from these nine.

**Separate profile rules [M]:** 14/14 objects in `profile-gap-rules.ts:87`–`:337`: life 5, health 2, legal_expenses 2, motor/home/travel/liability/pet 1 each. Eight distinct branches; deduplication reduces visible results to one per branch. These ask whether profile circumstances imply missing lines, not whether a document contains accurate coverage clauses.

**Other denominators [M/C]:** 11 checklist pillars / 37 checklist entries in `insurance-clarity-checklist.ts`; seven public product categories in `lib/product/catalog.tsx:29`; 18 accepted manual form branch values in `wallet/actions.ts:31`. None is an interchangeable denominator for verified document coverage. Marketing property maps conceptually to stored home; contents/group variants do not have equivalent dedicated checks established here.

### Provenance and three-state handling

[C] `GapDefinition.version/changedAt/changedBy` exists, but instances do not retain evaluated version or provenance status. `under_review` was not found as a gap validation state in the searched schema/application paths. No universal pre-plan / unauthored branch / stale catalogue render contract was found. AI-created definitions are immediately active.

[C] Coverage-insights fallback starts at 100 and subtracts penalties; `CoverageInsightsClient.tsx:90` calls high scores “strong” coverage and combines that with no-gap text at line 138. This is a live mounted reassurance path. `components/gaps/GapList.tsx:20` also contains reassurance, but its only JSX definition reference was found locally: classify it as an unmounted candidate, not proof of a shipped page. No deletion is authorised.

### Benchmark reality

| Branch in requested ground-truth minimum | Fixture inventory under `tests/fixtures` | Labelled-document accuracy, fill rate, hallucination rate |
|---|---|---|
| motor | 0/1 fixture files | [U] No admissible document/label pairs evaluated. |
| home | 0/1 | [U] Same. |
| health | 1/1 (`health-ethniki-1.ts`) | [U] Structured fixture and shape tests exist; apparent identifying fields make anonymisation unestablished. It was not used as an anonymised accuracy benchmark. |
| contents | 0/1 | [U] No admissible document/label pairs evaluated. |
| pet | 0/1 | [U] Same. |

The test fixture's origin/authenticity and consent are unverified. Its test asserts identifying fields and shape, not independent model performance. Do not reproduce its values in audit artifacts. **Real-document analyses evaluated in this audit: 0; accuracy denominator: 0, therefore undefined, not 0% or 100%.** The fixture inventory covers that test directory, not a claim that no PDFs exist elsewhere on disk. No customer-document search/retrieval was undertaken.

To resolve: owner-supplied, anonymised 30–50-document set across the five required branches, hand-labelled fields with document/page evidence and explicit absent values. Separate extraction completeness from accuracy; count populated-but-absent values separately as hallucinations. Baseline and candidate must use the same document/label versions and report all three metrics per branch. That is downstream Track B work, not completed Phase 0 measurement.

## 0.4 — The money

### Accounting is presently unsuitable for a profitability conclusion

1. **Unit mismatch [C/M]:** `token-utils.ts:8` calls the table EUR per million tokens but uses `0.00007` for Gemini Flash input while its comment says `0.070`. `token-tracking.ts:49` then divides token counts by one million. One million input tokens therefore records **€0.00007**, 1,000 times below the comment's €0.07. Anthropic comments show the same mismatch. This is internal arithmetic inconsistency; no current vendor price was consulted or asserted.
2. **Missing-model failure [C/M]:** default `gemini-2.5-pro` and `gemini-2.5-flash` from `env.ts:13`–`:17` are absent from `TOKEN_COSTS`. Tracking dereferences `costs.input` without a fallback at `token-tracking.ts:49`; Gemini awaits tracking after a successful provider call (`gemini-ai.service.ts:247`). With these defaults and usage present, paid provider work can end in a tracking exception rather than a returned extraction. Runtime overrides [U].
3. **Incomplete cost attribution [C]:** batch translator discards usage; direct batch extraction has no token tracker; failed provider calls may have billable usage that never reaches successful-result accounting. Run totals accumulate step payload usage, not every billable platform operation. Storage, egress, compute, retries, messages, payment fees and support are absent from the token cost table.
4. **Budget versus quality [C]:** `successPct` is completeness/checklist-derived. Token estimates contain allocations for non-AI stages; they cannot be multiplied by one blended token price and called measured cost per analysis.

### Published prices and limits, not live contracts

Sources: `public-pricing-content.ts:81`, `subscription-entitlements.ts:13,60,186`, `billing.ts:30`, `token-tracking.ts:21`. Prices are repository copy. Monthly checkout reads `SubscriptionPlan.price` from the database; those production values are [U]. Annual values below are configured code amounts. `c` is measured all-in marginal euro cost per completed analysis including attributable failures, currently [U].

| Tier | Published monthly / annual | Authored capacity and analyses/month | Token budget evidence | Analysis-only monthly break-even ceiling* |
|---|---|---|---|---|
| Policyholder Free | €0 / — | 3 policies; 10 analyses | 250,000 in token tracker | 0 if c > 0; any subsidised usage requires an acquisition budget |
| Policyholder Plus | €2.99 / €29 | 10 policies; 25 analyses | 1,000,000 in tracker | floor(2.99/c); annual monthly allocation floor((29/12)/c) |
| Policyholder Pro | €9.99 / €99 | unlimited policies/analysis count | 5,000,000 in tracker, despite “unlimited AI” | floor(9.99/c); annual floor((99/12)/c) |
| Agent Free | €0 / — | 10 clients, 5 policies/client, 5 analyses | 500,000 in agent entitlements | 0 if c > 0 |
| Agent Starter | €19.99 / €199 | 100 clients, 20 policies/client, 50 analyses | 2,000,000 in agent entitlements | floor(19.99/c); annual floor((199/12)/c) |
| Agent Pro | €49.99 / €499 | 500 clients, unlimited policies/client, 200 analyses | 10,000,000 in agent entitlements | floor(49.99/c); annual floor((499/12)/c) |
| Agency | €99.99 / €999 | unlimited clients/policies/analysis count | 25,000,000 in agent entitlements | floor(99.99/c); annual floor((999/12)/c) |

\*These are formulas, not observed break-even counts. Actual ceiling is `floor((net period revenue − non-analysis period cost)/c)` where the numerator is nonnegative. If it is negative, the tier loses money before an analysis. At limit N, margin is `net revenue − non-analysis cost − N*c`. For a branch mix use `sum(N_branch*c_branch)` instead. Unlimited count requires an enforced cost/usage constraint to bound exposure. **Loss-making-at-limit status is [U] for every tier.**

For Free, direct revenue is zero and positive usage cost needs subsidy from the first paid operation; the usage at which acquisition economics stop being viable depends on conversion, retention and allowed acquisition spend, all [U]. With a monthly subsidy S and non-analysis cost K, supported analyses are `floor((S−K)/c)` if S ≥ K. There is no measured numerical free-tier viability threshold.

### Enforcement reconciliation

- [C] B2C entitlement counts and token ceilings are separate. `wallet/actions.ts:734` reports the analysis limit; the orchestrator gates tokens. Agent manual start checks `canAgentRunAnalysis` (`wallet/actions.ts:914`), which counts runs on agent-created policies, including attempts/statuses as queried (`subscription-entitlements.ts:307`). The provider token tracker resolves B2C subscription tiers, not the agent `monthlyTokenBudget`; references to the latter were found in declarations, not the traced token admission path. Declared B2B budgets are not proven centrally enforced.
- [C] Free `interactiveQA:true` conflicts with public pricing marking it unavailable. Pro count-unlimited is bounded by the tracker. `/for-agents` advertises 5/25/unlimited clients at €0/€19/€49, while central entitlements say 10/100/500 and €0/€19.99/€49.99. `/product` says two free policies while main pricing says three.
- [C/M] Estimator with a document, three definitions and eleven pillars budgets **187,440 tokens**: document 1,200; extraction 102,000; clarity 21,600; mapping 6,000; gaps 21,600; savings 20,160; checklist 12,480; persistence 2,400. This is an admission estimate, not consumption. It also omits document page count and translation tokens.
- [U] Needed for numerical economics: validated model/rate/FX snapshot, billable token records including retries/translation, per-branch timings, actual tier prices, usage mix, infra allocation and conversion economics. The local-only evidence rule prevents resolving these with production queries or live provider experiments.

## 0.5 — Claim-to-capability trace

**Verdicts:** “true” means delivering code exists for the bounded capability; “partially true” means some delivery exists but the wording exceeds it; “not delivered” means no delivering mechanism or substantiating evidence was found for the stated promise. For scale, accuracy, security certification, testimonials and timing, “not delivered” is an evidence verdict, not an assertion that an external event is impossible.

The inventory covers distinct capability promises in the current public route source, shared rendered landing/product/pricing content, and SEO. Repeated EL/EN promises are grouped; differing numbers are called out. Navigation labels and aspirational slogans are not counted as capabilities. Legal pages are traced as approval-dependent surfaces, not assessed as a legal opinion. Older unmounted landing content is distinguished from active `/` and `/en`.

| Claim · originating source [C] | Delivering code / evidence | Verdict |
|---|---|---|
| Digital wallet; policies in one place — `ServicesGrid.tsx:12`, `/product` | Wallet pages/actions and policy/document schema | true for organisation; not proof of complete insurance protection |
| Upload PDF/photo, extract data — landing `:412`, `/product:24` | PolicyService and provider extraction | partially true: accepted formats differ; HEIC, missing fields and provider failures prevent “any file/every term” |
| Automatic gap analysis — landing `:215`, ServicesGrid `:22` | Orchestrator provider calls, legacy engine, profile engine | true that analysis is implemented; accuracy/deterministic-only implication not established |
| AI keeps you fully protected — landing `:239` | Produces findings, does not issue or guarantee cover | not delivered |
| 500+ trusting policyholders — landing `:274` | Hardcoded literal; no admissible supporting measurement | not delivered |
| 10,000+ analysed policies — landing `:363` | Hardcoded literal; production count [U] | not delivered |
| 98% extraction accuracy — landing `:368` | No admissible labelled evaluation; completeness score is not accuracy | not delivered |
| Under 30 seconds / in seconds — landing `:373,422`, `/product:57` | No timed benchmark, multiple provider and retry stages | not delivered as a performance guarantee |
| All Greek insurers / any insurer — landing `:290`, `/product:78` | Generic provider accepts documents; nine seed definitions, no carrier-wide quality evidence | partially true |
| AES-256 / EU servers — landing `:297`, `/product:74`, company `:37` | Supabase integration, public URL generation and public local fallback; deployment encryption/location [U] | not delivered as a substantiated security/location assurance |
| GDPR / full compliance / explicit consent before sharing — landing `:299,378`, `/product:74` | Cookie/terms/privacy utilities; AI-processing consent absent, access gaps present | not delivered as a demonstrated guarantee; legal review is separate |
| Every step automated — landing `:328` | Extraction/background analysis exists; review/failures/limits remain | partially true |
| Two experiences for individuals/agents — landing `:345` | Protected wallet, agent/customers dashboards | true |
| Smart renewal alerts, never miss renewal, 30-day notice — ServicesGrid `:34`, AudienceTabs `:111` | Renewal service and templates | partially true: milestone implementation exists; guaranteed receipt and production scheduling unverified |
| Automatic price-change/new-benefit alerts — ServicesGrid `:34`, `/product:44` | Renewal and perk reminders exist; no independent insurer price-change feed established | partially true; price-change automation not delivered |
| AI Q&A from policy text — ServicesGrid `:44` | `wallet/actions.ts:742,817,832` uses stored ACORD structured context | partially true: Q&A exists, direct grounding in full original text is not guaranteed |
| Advisor sharing/messages/proposals — ServicesGrid `:54` | Grants, invites and collaboration services | partially true: mechanics exist; revocation/recipient consistency not proven |
| Always up-to-date wallet — AudienceTabs `:141` | Stored policies and reanalysis, not a live insurer-sync guarantee | partially true |
| Gaps even advisor missed — AudienceTabs `:115` | No comparative advisor evaluation | not delivered as comparative performance |
| Agent portfolio, renewals, gaps, opportunities dashboard — AudienceTabs `:228`, `/for-agents:24` | Agent/customers pages, opportunities, renewal/commission features | true for aggregation; completeness and two-sided parity unproved |
| AI cross-sell based on client profile — AudienceTabs `:232`, `/for-agents:52` | `agent/actions.ts:658,666`, profile rules/recommendation generator | true for generated suggestions, not validated revenue/insurance suitability |
| 50 files in a few minutes — AudienceTabs `:236` | Batch extraction UI exists; no throughput benchmark | not delivered as a performance claim |
| Scale without more staff / 10x clients — AudienceTabs `:260`, `/solutions/agents:28` | No productivity measurement | not delivered |
| Personalised renewal reminders — `/solutions/agents:99` | Reminder action and renewal service | partially true: capability exists; delivery-result correctness and deployment unverified |
| Office-branded reports ready to send/archive in one click — `/solutions/agents:116,159` | Owner-only savings HTML, no office branding inputs; no matching delivery pipeline found | not delivered |
| Business unlimited clients, roles, renewal pipeline — `/solutions/agents:178` | Agency/team entitlements and team/renewal services | partially true: tier naming differs; unlimited applies to Agency, not all agent plans |
| Free 30-day agent trial — `/solutions/agents:42,211` | Free tier exists; no matching 30-day paid trial activation found in traced signup/checkout | not delivered as advertised trial |
| 3x faster renewals testimonial — `/solutions/agents:195` | Hardcoded quotation/name; no admissible testimonial evidence | not delivered |
| Product testimonial / user illustrations — `/product:519`, landing/AudienceTabs widgets | Literal names, scores, values and scenarios in JSX | not delivered as evidence of real customer results; illustrative origin must be disclosed |
| Free, no card, three policies — landing `:492`, central pricing | Free entitlements and signup | true for central offer; `/product:86` contradicts with two |
| Advanced versus basic extraction quality — central pricing | Same default extraction model for standard/premium routing | partially true feature differentiation; improved accuracy not established |
| Unlimited AI on Pro — pricing `:157` | 5M token ceiling in tracker | partially true for count declaration, not unlimited usage |
| Free Q&A unavailable — pricing comparison | `ENTITLEMENT_LIMITS.free.interactiveQA:true` | not delivered consistently |
| Agent 5/25/unlimited clients; €0/€19/€49 — `/for-agents:68` | Central limits 10/100/500 and prices 0/19.99/49.99 | not delivered consistently |
| All remaining central pricing features: analytics, comparisons, portfolio gaps, priority, notifications, collaboration, export, teams, templates, commissions, API, import — pricing plans/comparison | `subscription-entitlements.ts`, corresponding protected features/API routes | partially true: declarations and implementations exist, but uniform enforcement and production provisioning not proven; unsupported quantitative limits above take precedence |
| Motor live market value / 98% match — motor `page.tsx:52,81`, catalog `:38` | Static marketing meter; no live valuation integration found in code search | not delivered |
| Motor roadside gaps/duplicate towing — motor `:59` | Generic AI/structured vehicle data, no dedicated seed check for duplicate towing | partially true |
| Property rebuild inflation guard — property `:80`, catalog `:54` | No live material-inflation/rebuild-cost source found | not delivered |
| ENFIA checks / guaranteed discount — property `:87` | Seed `missing_enfia_components` checks three coverage booleans; not full eligibility or guarantee | partially true; tax percentage not validated by this local code audit |
| Health deductible/out-of-pocket visibility — health `page.tsx:52,59`, catalog `:70` | Structured extraction/health data, general detail UI | partially true; exact future bill or 100% network coverage is not guaranteed |
| Direct-billing hospital linkups — catalog `:71`, health example | No hospital transaction integration found | not delivered as a billing integration |
| Cyber ransomware/BI validation and system monitoring — cyber `:28,52,59` | Generic policy fields/AI; no dedicated authored cyber document checks or monitoring service established | partially true for reading text, not delivered as systems monitoring/validated coverage |
| Incident response team one tap away — cyber `:46`, catalog `:88` | Contact-style extracted benefits exist; no established cyber responder integration | partially true as potential stored contact, not guaranteed response |
| Group-health dependents and corporate/personal coordination — group-health `:52`, catalog `:102` | General policy/profile representation; no dedicated coordination engine established | partially true for storing information |
| Group plan completely zeros personal deductible — group-health `:59` | Static example; no adjudication/coordination implementation found | not delivered |
| Pension live fund growth, contributions/matching — group-pension `:28,46` | No fund feed/valuation pipeline found | not delivered |
| Pension exact tax deductions/export — group-pension `:52` | No dedicated tax calculation/export found | not delivered |
| Retirement projections, vesting age, withdrawal penalties — group-pension `:59` | No retirement calculator found | not delivered |
| Pet Leishmania check — pet `:76` | One seeded deterministic field check, generic extraction | partially true: no measured disease/branch extraction accuracy |
| Pet breed-mapped exclusion radar / exact vet bill coverage — pet `:83`, catalog `:137` | Generic exclusions plus static marketing sample; no breed-specific validation engine established | partially true for displaying exclusions, not exact coverage assurance |
| Company transparency / customer-driven refinement — company `:50,63` | Coverage UI exists; no user-research evidence reviewed | partially true for UI, customer-research assertion unverified |
| Hiring / open roles — company `:80,88` | CTA link exists; no role inventory established | partially true as contact invitation, not evidence of vacancies |
| Contact form / response availability — contact `page.tsx:97,273` | `/api/contact` path; literal contact details/hours including placeholder telephone | partially true; response service and phone availability unverified |
| Structured-data FAQ: encrypted storage / insurer cannot see without explicit sharing — `landing/content.ts:415`, `landing/seo.ts:93` | Role/grant checks exist, but encryption deployment and all access boundaries are not established | partially true for access-control implementation; blanket guarantee not demonstrated |
| Structured-data FAQ: usable without agent; user controls decisions — content `:433,441` | Owner wallet works independently; no insurance purchase is executed by the analysis pipeline | true for standalone use and manual insurance decisions; not proof every automated notification waits for confirmation |
| Priority/dedicated support — central pricing `:152,331` | Plan copy and contact endpoint; no response SLA or staffed support evidence reviewed | not delivered as a substantiated service-level promise |
| SEO promises of hidden-gap/overlap/risk detection and rapid snapshot | `lib/landing/seo.ts` consumes shared landing content; generic analysis/profile engines | partially true for analysis; completeness/time promises lack evidence |

No marketing text was rewritten. The brief's proposed replacement “deterministic engine” would itself be inaccurate for the current primary pipeline. Track E must consume this distinction rather than replace one unsupported claim with another.

## 0.6 — Readiness, decisions, and handoff

### Broken / insecure — launch-gating findings

| ID | Priority and finding | Evidence and impact | Resolution boundary |
|---|---|---|---|
| SEC-01 | Critical exposure: tracked service-account private key | `docs/architecture/policy-wallet-c0980-firebase-adminsdk-fbsvc-7647dfa5b2.json:5`; tracked, type service_account, nonempty private_key [M]. Last touching local commit `0dc95fd` (2026-03-26). Credential validity/reach [U]. No secret reproduced or tested. | Owner credential revocation/rotation and exposure review; removing current file alone does not remove history. No rotation/deletion performed. |
| SEC-02 | High: explicit AI-processing consent missing | Consent utility plus traced upload/orchestrator/provider entrypoints. Previous STATUS finding still present [C]. | Owner-approved consent/data-handling design; legal assessment and any migration separate. |
| SEC-03 | High: resource/recipient authorisation gaps | Run-status scope omission; questionnaire instance ownership; arbitrary task recipient; grant-list owner trust; inactive relationship/retained participant access [C]. | Fixes plus negative/two-sided tests required before a zero-leakage claim. No production exploit attempted. |
| SEC-04 | High: document storage privacy not established | Public URL generation and public local fallback [C], bucket/RLS deployment [U]. | Fail-closed storage/access design and configuration evidence required; privacy surface change approval. |
| SEC-05 | High: fixture anonymisation not established | `tests/fixtures/health-ethniki-1.ts` and associated test contain apparent identifying fields [C]. No values copied into report. | Owner provenance/privacy review and approved sanitisation; cannot serve as safe benchmark yet. |
| PIPE-01 | High: default provider accounting can fail after billable work | Missing Gemini 2.5 cost keys and awaited unguarded tracker [C/M]. | Reconcile model accounting, preserve successful provider output, verify failure/retry semantics. |
| PIPE-02 | High: gap truth/strict boundary absent | AI detection, active auto-created definitions, unversioned instances, raw exported severity, mounted reassurance [C]. | Architecture and strict-output policy first; frozen engine/possible migrations require halt. |
| PIPE-03 | High: initial branch/catalogue mismatch and history replacement | Definitions loaded before extracted branch; all instance deletion/recreation [C]. | Model initial analysis and recomputation explicitly; preserve finding lifecycle. |
| PIPE-04 | High: batch entry bypasses the full document workflow | Batch-save schema has no document, run scheduling or policy-capacity check; client extractionMeta controls active/incomplete status (`app/api/policies/batch-create/route.ts:7,39,67`) [C]. | Unify limits and document retention/analysis semantics; verify with isolated upload tests. |
| COST-01 | High: cost/margin claims not supportable | 1,000x internal rate-unit mismatch, untracked translation/direct extraction, unknown billing data [C/M/U]. | Repair accounting before optimisation/pricing conclusions. Live prices/Terms untouched. |
| MSG-01 | High: reminder/delivery correctness | Digest ignores failure return; unsupported/no-token channels can look sent [C]. Renewal milestone selection was cross-checked and is not reported as broken. | Mocked dispatch contract and owner send-policy review. |
| CLAIM-01 | High: public promises exceed evidence | Hardcoded accuracy, speed, scale, compliance and unavailable specialised capabilities [C/U]. | Track E rewrite/evidence; consent/legal/pricing wording remains approval-dependent. |
| LANG-01 | Medium correctness: silent Greek fallback in EN; English report body | Translator absorbs failure before outer flag; report structural text [C]. | Visible degraded translation state and EL-first report parity; not merely a style preference. |

**Earlier fixes that remain present [C]:** sharePolicy checks ownership before agent lookup/invite/grant; random UUID invite tokens; all five onboarding agent actions call `requireAgent`; shared AI disclaimer component and informational provider wording remain. Those repairs do not close the newly enumerated boundaries. Earlier STATUS “all guardrails pass” is historical, not verified for this audit.

**Auth/native understanding [C/U]:** signin PIN compares a four-digit hash in localStorage, then only prefills an identifier and focuses password (`app/auth/signin/page.tsx:69,91`). It does not authenticate a session; do not describe it as a working biometric/PIN login or as a proven server-auth bypass. Native issuance/refresh/per-device revocation remain Track G design work. Current device-token endpoint writes `User.pushToken`, and dispatcher reads that single field (`device-token/route.ts:25`, `notifications.ts:83`); the brief's asserted registration-table population is unverified. No Android contract or client was built in Phase 0.

### UI/UX dissatisfaction — separate, non-launch backlog

No rendered-layout verdict is issued. Multiple marketing styles, hardcoded demonstration widgets, density, visual hierarchy and mobile ergonomics are Track E/F evaluation candidates. Dishonest claims, inaccessible controls if proven, missing translations and leaked private data are correctness issues, not aesthetic dissatisfaction.

Track F result: **0 product surfaces changed / 0 surfaces requiring before/after measurement in this documentation-only phase.** Measurements at 320/390/430, target sizes, overlap boxes, clipping, contrast, LCP and scroll height are **not run**, not “passed.” Existing visual quality is unknown.

### Evidence needed and blocking decisions

| Missing input [U] | Consequence | Next authorised way to resolve |
|---|---|---|
| D-V1 hash / predecessor completion artifacts | Cannot certify inherited invariants or parity | Owner supplies baseline evidence, or accepts this checkout as starting point (already selected for audit). |
| Anonymised document/label set | No accuracy, hallucination, real fill-rate or optimisation acceptance | Owner-provided sanitised corpus and reviewed labels; no customer-document retrieval in current scope. |
| Production traffic/flags/row counts/account state | No dead-code deletion proof, real coverage counts or account cleanup | Continue marking unknown; later explicit evidence authorization required. |
| Validated rates, usage and costs | No numerical profitability or quality/cost claim | Correct local accounting first, then approve appropriate evidence collection. |
| Consent/privacy, frozen-engine changes, schema, outbound policy, prices/Terms | Cannot implement affected fixes under blanket audit scope | Concrete proposals and approvals in `HALTS.md`; no changes now. |
| Dependency/toolchain setup | Cannot run Vitest, build, full guardrails, or two-session browser tests | Re-establish Node 20.11.0 and lockfile dependencies for later authorised implementation/testing. |

### Local verification record

- [M] Eight dependency-free assertions passed across the initial and follow-up runs under available Node **26.8.1** using built-in assertions and direct imports of pure TypeScript modules: both missing default model keys; one-million-token arithmetic; document/no-document estimator difference; nonretryable token error classification; critical/degradable step classification; early renewal eligibility expression. An additional dispatch-selection assertion passed and disproved a suspected renewal-selection defect (8/8 total bounded assertions). These confirm bounded behavior/defects, **not eight product acceptance tests**.
- [M] Source counts: 9 seed definitions, 14 profile rules, 11 checklist pillars/37 entries, one fixture file. Credential check emitted only tracked/type/key-presence booleans. Frozen engine hash recorded.
- [C/U] Vitest config/setup and candidate tests inspected. Global setup does not blanket-stub dispatch; share-policy tests explicitly mock DB/storage/AI/email. `node_modules` is absent, so no Vitest, production build, type-check or E2E results are claimed. No dependencies installed during the audit. Repository Node requirement is 20.11.0; native Node assertions are not a substitute for it.
- [M] Final documentation validation checks referenced source paths/line bounds, UTF-8, diff whitespace, required report sections, absence of private-key material, frozen hash, and restriction of tracked edits to documentation. Reproduction details are in `docs/audit/LOCAL-EVIDENCE.md`. No recurrence guard was added or demonstrated red; those belong to approved tracks.

### Phase 0 exit

The six requested sections and Greek explanation below are delivered. Unavailable production/benchmark inputs are explicit. **Stop here for owner approval.** This report does not approve launch, delete code, optimise models, change pricing, seed accounts, or start the seven tracks. The downstream roadmap must put security, reliable analysis truth and accounting ahead of feature expansion. The three seeded production accounts remain an unverified brief assertion, untouched.

## «Τι είναι αυτό το προϊόν και για ποιον»

Το PolicyWallet είναι ένας ψηφιακός φάκελος ασφαλιστηρίων για τον ασφαλισμένο και ένας χώρος οργάνωσης πελατών για τον ασφαλιστικό διαμεσολαβητή. Ο ασφαλισμένος μπορεί να συγκεντρώνει έγγραφα, να βλέπει στοιχεία συμβολαίων και λήξεις, να κάνει ερωτήσεις και να συνεργάζεται με τον σύμβουλό του. Ο επαγγελματίας έχει εργαλεία για πελάτες, ανανεώσεις, εκκρεμότητες, μηνύματα και πιθανές ευκαιρίες κάλυψης. Υπάρχει ουσιαστικός κώδικας πίσω από αυτά. Δεν είναι όμως ακόμη αποδεδειγμένο ότι όλα λειτουργούν με την ίδια ακρίβεια, ασφάλεια και συνέπεια.

Σήμερα, όταν ανεβαίνει ένα έγγραφο, η βασική ροή ζητά από μοντέλο τεχνητής νοημοσύνης να διαβάσει το περιεχόμενο, να εξαγάγει στοιχεία και να παράγει εξηγήσεις και πιθανά κενά. Το μοντέλο συμμετέχει και στην απόφαση ότι υπάρχει κενό. Παράλληλα υπάρχει διαφορετικός μηχανισμός κανόνων και ένας ακόμη μηχανισμός που εξετάζει το προφίλ του ανθρώπου. Επομένως δεν μπορούμε να παρουσιάσουμε το σημερινό προϊόν ως έναν ενιαίο, πλήρως ελεγχόμενο μηχανισμό ντετερμινιστικής αξιολόγησης.

Στον κώδικα αρχικοποίησης υπάρχουν εννέα ορισμοί ελέγχων εγγράφων: τρεις για αυτοκίνητο, δύο για υγεία, δύο για κατοικία, ένας για κατοικίδια και ένας γενικός. Μόνο τέσσερις από τους εννέα είναι γραμμένοι ως ντετερμινιστικοί κανόνες. Οι δεκατέσσερις κανόνες προφίλ είναι ξεχωριστό σύνολο και δεν αποδεικνύουν ότι διαβάζουμε σωστά τα ασφαλιστήρια οκτώ κλάδων. Δεν γνωρίζουμε πόσοι ορισμοί είναι ενεργοί στην παραγωγή. Η απουσία ευρήματος δεν αποδεικνύει ότι ο άνθρωπος είναι καλυμμένος.

Δεν έχουμε ασφαλές σύνολο ανωνυμοποιημένων εγγράφων με ανεξάρτητες ετικέτες ώστε να μετρήσουμε την ακρίβεια. Το «98%» και ο χρόνος «κάτω από 30 δευτερόλεπτα» της αρχικής σελίδας δεν στηρίζονται σε μέτρηση που επαληθεύτηκε εδώ. Δεν γνωρίζουμε ούτε το πραγματικό κόστος ανά ανάλυση: η καταγραφή κόστους έχει ασυμφωνία μονάδων, λείπουν προεπιλεγμένα μοντέλα από τον πίνακα τιμών και ορισμένες κλήσεις δεν καταγράφονται. Δεν μπορούμε να πούμε έντιμα ποιο πλάνο είναι κερδοφόρο στο όριό του.

Πριν από τη διάθεση χρειάζονται διορθώσεις που δεν είναι αισθητικές: χειρισμός του ιδιωτικού κλειδιού που βρίσκεται στο αποθετήριο, σαφής συγκατάθεση για την επεξεργασία AI, σωστός έλεγχος πρόσβασης σε κάθε ενέργεια και συνεπής ανάκληση πρόσβασης. Χρειάζεται επίσης να διορθωθούν η καταγραφή κόστους και η καταγραφή παράδοσης ειδοποιήσεων, και να ξεχωρίζουν τα τεκμηριωμένα ευρήματα από τις εκτιμήσεις και τα άγνωστα.

Η πιο πειστική αξία του προϊόντος είναι η συνέχεια: το βιβλίο πελατών, το ιστορικό, τα έγγραφα και η συνεργασία γύρω από τα ίδια στοιχεία. Για τον ασφαλισμένο πρέπει να προσφέρει σαφή εικόνα και καλύτερες ερωτήσεις προς τον σύμβουλο. Για τον επαγγελματία, οργανωμένη πληροφορία που μπορεί να ελέγξει και να κρίνει. Όσα δείχνει ο agent στην οθόνη του τα κρίνει ο ίδιος· όσα φεύγουν προς τον ασφαλισμένο τα εγγυάται το προϊόν. Σήμερα αυτός είναι ο κανόνας που πρέπει να χτίσουμε και να αποδείξουμε, όχι μια ιδιότητα που μπορούμε ήδη να υποσχεθούμε.
