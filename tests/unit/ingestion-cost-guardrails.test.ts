// @vitest-environment node
/**
 * Cost-guardrail NEGATIVE assertions — the point of the suite.
 *
 * A wrong extraction is visible; a silent cost regression is not. These tests fail
 * if a deterministic/$0 module ever starts referencing an expensive client (model,
 * OCR, vision, or image rasterizer). Gate 1 covers the static-import guarantees;
 * later gates add call-count==0 assertions at the injected boundary.
 */
import { describe, it, expect } from "vitest"
import { readFile } from "fs/promises"
import path from "path"

const read = (rel: string): Promise<string> =>
  readFile(path.join(process.cwd(), rel), "utf8")

// Any reference to an LLM/model, OCR, or image-rasterization client.
const EXPENSIVE_CLIENT =
  /@ai-sdk|generateObject|createGoogleGenerativeAI|getAIService|model-router|createModelFieldResolver|tesseract|createWorker|@napi-rs\/canvas|\bsharp\b/

describe("cost guardrail: gap DETECTION is deterministic (no model in the loop)", () => {
  it("gap-detection.ts references no model/LLM/OCR client", async () => {
    expect(await read("lib/services/ingestion/gap-detection.ts")).not.toMatch(EXPENSIVE_CLIENT)
  })
})

describe("cost guardrail: the cheap paths import no expensive client", () => {
  it("triage.ts (P1) references no model/OCR/vision client", async () => {
    // pdfjs text detection is local $0; triage must never pull a model/OCR client.
    expect(await read("lib/services/ingestion/triage.ts")).not.toMatch(EXPENSIVE_CLIENT)
  })

  it("text-extraction.ts (P2 local $0 path) references no expensive client", async () => {
    expect(await read("lib/services/ingestion/text-extraction.ts")).not.toMatch(EXPENSIVE_CLIENT)
  })

  it("greek-locale.ts (P4 parsers) references no expensive client", async () => {
    expect(await read("lib/services/ingestion/greek-locale.ts")).not.toMatch(EXPENSIVE_CLIENT)
  })

  it("gap-explanations.ts (P7 templates) references no model client", async () => {
    // Explanations are deterministic templates cached by gap-type — never a model.
    expect(await read("lib/services/ingestion/gap-explanations.ts")).not.toMatch(EXPENSIVE_CLIENT)
  })
})

/**
 * FINDING — the deterministic Gap Engine (detectGaps) is NOT yet wired into the active
 * upload→analysis paths, which still call the LLM for gap DETECTION. These are marked
 * `it.fails`: they pass today because the residual LLM call is present, and will flip
 * RED the moment the cutover lands — forcing them to become plain `it()`.
 *
 *   - lib/services/gap-analysis.service.ts:257  (aiService.analyzeGaps) via the
 *     `analyzeGaps` server action (app/(protected)/wallet/actions.ts:629)
 *   - lib/services/analysis/policy-analysis-orchestrator.service.ts:~1124
 *     (service.analyzeGaps) — the orchestrator's gap_detection step (jobs/process-policy)
 */
describe("FINDING: residual LLM in gap detection (detectGaps cutover pending)", () => {
  it.fails("GapAnalysisService should NOT call aiService.analyzeGaps for gap detection", async () => {
    expect(await read("lib/services/gap-analysis.service.ts")).not.toMatch(/aiService\.analyzeGaps\(/)
  })

  it.fails("the orchestrator gap_detection step should NOT call the LLM analyzeGaps", async () => {
    expect(await read("lib/services/analysis/policy-analysis-orchestrator.service.ts")).not.toMatch(
      /\.analyzeGaps\(/,
    )
  })
})
