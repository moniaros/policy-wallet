import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"

/**
 * GDPR Art. 9 (§10, decision 3): consent is PER DOCUMENT and revocable, the
 * sentence is `common.aiConsentBody` verbatim, and the gate fails closed.
 * Grep-shaped over the exact write/check sites (the orchestrator's graph is
 * unmockable in a unit): a deleted line fails CI.
 */
const gate = readFileSync("app/(protected)/add/AddGate.tsx", "utf-8")
const create = readFileSync("app/(protected)/wallet/actions.ts", "utf-8")
const orchestrator = readFileSync("lib/services/analysis/policy-analysis-orchestrator.service.ts", "utf-8")

describe("the Article 9 gate", () => {
    it("renders the reviewed sentence verbatim — the key, never a paraphrase", () => {
        expect(gate).toContain("t.common.aiConsentBody")
        expect(gate).toMatch(/\{agreed && \(/)
        expect(gate).toMatch(/<AddPolicyClient/)
        const before = gate.indexOf("t.common.aiConsentBody")
        const upload = gate.indexOf("<AddPolicyClient")
        expect(before, "the sentence must stand before the dropzone").toBeLessThan(upload)
    })
    it("createPolicy writes one DocumentAiConsent row per created document, keyed to the verbatim text", () => {
        expect(create).toMatch(/documentAiConsent\.createMany/)
        expect(create).toMatch(/textKey: "common\.aiConsentBody"/)
    })
    it("the orchestrator enforces per-document consent at BOTH provider sites, fail closed", () => {
        const sites = orchestrator.split("assertDocumentAiConsent").length - 1
        expect(sites, "both provider entry points call the per-document check").toBeGreaterThanOrEqual(3) // definition + two call sites
        expect(orchestrator).toMatch(/ai_consent_missing/)
        expect(orchestrator).toMatch(/document_consent_revoked|revokedAt/)
    })
    it("revocation is reachable from privacy", () => {
        const privacy = readFileSync("app/(protected)/me/privacy/page.tsx", "utf-8")
        expect(privacy).toMatch(/DocumentConsent/)
    })
})
