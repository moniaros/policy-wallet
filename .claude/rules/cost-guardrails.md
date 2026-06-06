# Cost guardrails — document pipeline

Scope: `lib/services/ingestion/*` (triage → extraction → gap engine → explanations) and
the analysis orchestrator. **The common case (text-layer PDF, or a cache hit) must be ~$0.**
A wrong extraction is visible; a silent cost regression is not — these are the rules that
prevent the latter. Each is enforced by a NEGATIVE assertion in the test suite (see testing).

## Forbidden patterns

1. **Never send a text-layer PDF to a vision/multimodal model.** `triage.ts` classifies
   text-layer vs scanned; only `source === 'scanned'` may reach OCR. Text-layer text is
   extracted locally for $0 (`text-extraction.ts`).
2. **Never OCR pages outside the coverage table once it is locatable.** `scan-extraction.ts`
   is hybrid: short scans OCR all pages; longer scans do a cheap low-res locate pass, then
   HQ-OCR **only** the coverage pages. Downscale + grayscale (sharp) **before** OCR.
3. **No LLM in gap DETECTION.** Detection is deterministic — `gap-detection.ts`
   `detectGaps(actual, envelope)`, pure, no I/O, no model. The LLM is allowed only for
   extraction fallback and (optionally) is not even used for explanations.
   > ⚠️ **OPEN RESIDUAL (cutover pending):** `gap-analysis.service.ts:257`
   > (`aiService.analyzeGaps`) and the `gap_detection` step of
   > `policy-analysis-orchestrator.service.ts` still call the LLM. `runIngestionPipeline`
   > (deterministic) is not yet wired into the active routes. Replacing those with
   > `detectGaps` is a tracked next action; do not add new LLM calls to detection.
4. **Never re-extract a content-hash already cached.** `extraction-cache.ts`
   `getOrExtract(contentHash, …)` returns the stored `ExtractionResult` from
   `DocumentExtraction` (a $0 DB read). The cache is permanent (no TTL) and global by hash.
5. **Never use a frontier model for field parsing.** Use the cheapest tier + structured
   (JSON-schema-constrained) output: `model-router.ts` `getCheapestAvailableProvider()` /
   `routeModel(...)` (Gemini Flash) + the `ai` SDK `generateObject`. A frontier model is a
   last-resort fallback only, and only on the ambiguous remainder of fields.
6. **Never regenerate a gap explanation cached by gap-type.** `gap-explanations.ts` builds
   one template per `Gap.reason` (`<kind>:<taxonomyKey>`) and memoizes it; only instance
   amounts are filled per call. Templates are deterministic ($0).

## Dependency injection (so tests can prove the above)

Expensive clients are injected, never hard-imported into the hot path:
- Extraction model fallback: `extractFields({ resolver })`; real wiring
  `createModelFieldResolver()`.
- OCR: `extractScannedText(triage, { renderer, preprocess, ocr })`; real wiring
  `createPdfPageRenderer` / `sharpPreprocess` / `createTesseractOcr`.
This lets specs assert call-count **== 0** on the cheap paths.

## Cost telemetry

Every run records the path + tokens + EUR: `DocumentExtraction.pathTaken`
(`cache-hit | text-layer | template | ocr | model-fallback | frontier-fallback`) +
`inputTokens/outputTokens/costEur`, alongside the existing `TokenUsage` rows. This feeds
the margin dashboard; $0 paths log zeros + `model: null`.
