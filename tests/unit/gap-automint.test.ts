import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"

/**
 * A model cannot add to the gap catalogue.
 *
 * This file used to pin the OPPOSITE: that when the clarity pass emitted a slug
 * no definition matched, the orchestrator created a `GapDefinition` from the
 * model's own output — and it checked that the new row was at least minted
 * `isActive: false`. That safeguard did not hold. By 2026-08-19 production held
 * **41 of 41** gap definitions authored this way (`rule_id LIKE 'ai_%'`,
 * `detection_logic = {"source":"ai_clarity_pipeline"}`), **35 of them active**.
 *
 * The catalogue drifted exactly as you would expect a vocabulary invented one
 * request at a time to drift: `cyber_risk_gap` (critical), `cyber_liability`
 * (medium) and `cyber-risk-gap` (medium) are the same risk under three
 * spellings and two severities. `mental_health_exclusion` was high;
 * `mental-health-exclusion` was medium. What a customer was told about the
 * seriousness of their situation depended on which slug the model spelled that
 * run.
 *
 * So the mint is gone rather than made safer. A human adds definitions; rules
 * decide when they apply.
 */

const ORCHESTRATOR = readFileSync(
    "lib/services/analysis/policy-analysis-orchestrator.service.ts",
    "utf-8"
)
const GAP_DETECTION = readFileSync("lib/gap-detection.ts", "utf-8")
const INTERFACE = readFileSync("lib/services/ai/ai-service.interface.ts", "utf-8")

describe("the model cannot author the catalogue", () => {
    it("the orchestrator never creates a GapDefinition", () => {
        expect(ORCHESTRATOR).not.toMatch(/gapDefinition\.(upsert|create)\(/)
    })

    it("no code path stamps the AI-minted marker any more", () => {
        // Everything carrying this marker is undecidable by construction, so
        // writing a new one is writing a gap type nothing can ever evaluate.
        expect(ORCHESTRATOR).not.toContain('detectionLogic: { source: "ai_clarity_pipeline" }')
    })

    it("definitions carrying that marker cannot produce a gap", () => {
        // hasEvaluableRule is the gate; gap-rule-evaluator.test.ts proves it
        // rejects both the marker and the natural-language `check` shape.
        expect(GAP_DETECTION).toContain("hasEvaluableRule")
    })
})

describe("the model cannot decide detection or severity", () => {
    it("an AI gap result carries no detection verdict", () => {
        // `isDetected: boolean` used to be the product: whether a customer was
        // told they had a gap came down to a model's judgement over a
        // natural-language criteria string.
        //
        // Match a FIELD DECLARATION, not the word. The comments in that file
        // explain why the field was removed and must keep saying `isDetected`
        // to be worth reading — the same mention-vs-use trap that let a probe
        // slip past the authorization guard in Phase 1.
        expect(INTERFACE).not.toMatch(/^\s*isDetected\s*[?:]/m)
    })

    it("clarity gaps carry no severity", () => {
        const clarityBlock = INTERFACE.slice(
            INTERFACE.indexOf("interface ClarityCoverageGap"),
            INTERFACE.indexOf("interface ClarityChecklistScore")
        )
        expect(clarityBlock).not.toMatch(/severity/)
    })

    it("no provider schema offers the model those fields", () => {
        for (const provider of ["anthropic", "gemini", "openai"]) {
            const src = readFileSync(`lib/services/ai/${provider}-ai.service.ts`, "utf-8")
            expect(src, provider).not.toMatch(/isDetected: z\.boolean\(\)/)
            expect(src, provider).not.toMatch(
                /severity: z\.enum\(\[\s*['"]low['"],\s*['"]medium['"]/
            )
        }
    })

    it("severity is written from the rule decision, never from a literal", () => {
        // The old write site hardcoded `severity: "medium"` for every gap the
        // gap_detection step flagged, and — because that source merged first —
        // that literal silently overrode the clarity pass's own severity for
        // the same slug.
        expect(ORCHESTRATOR).not.toMatch(/severity:\s*"medium"/)
        expect(ORCHESTRATOR).toContain("decideGapsForPolicy")
    })
})
