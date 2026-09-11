import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/db", () => ({ db: {} }))

import {
    DOCUMENT_EVIDENCE_STATES,
    documentEvidenceFor,
    documentEvidenceForFields,
    documentEvidenceForLogic,
    lowestDocumentEvidence,
} from "@/lib/gaps/document-evidence"
import { writeRuleDecidedGaps } from "@/lib/gaps/gap-instance-writer"
import { AUTHORED_GAP_DEFINITIONS } from "@/lib/gaps/authored-catalogue"
import { fieldsReadByDetectionLogic } from "@/lib/gaps/rule-read-fields"

/**
 * PW-PROVENANCE-01 W2-01. What the document is evidence of, per field, in
 * three states a rule can see — and every gap row the ONE writer writes
 * carries one per field its rule read, plus the weakest, beside the inputs.
 * Computed at the writer because `lib/gap-detection.ts` is owner-frozen.
 * Nothing here decides what a rule may CLAIM at each state; that is W2-02.
 */

const verifiedRow = {
    property: { earthquakeCoverageIncluded: false, fireCoverageIncluded: true, floodCoverageIncluded: false },
    extraction: {
        sources: {
            "acordData.property.earthquakeCoverageIncluded": { page: 2, snippet: "Σεισμός: Δεν καλύπτεται", verified: true },
            "acordData.property.fireCoverageIncluded": { page: 2, snippet: "Πυρκαγιά: Καλύπτεται", verified: false },
        },
    },
}

describe("documentEvidenceFor — three states", () => {
    it("a value with a citation found in the text is policy_verified", () => {
        expect(documentEvidenceFor(verifiedRow, "property.earthquakeCoverageIncluded")).toBe("policy_verified")
    })

    it("a value whose citation was refuted, or absent, is policy_asserted", () => {
        expect(documentEvidenceFor(verifiedRow, "property.fireCoverageIncluded")).toBe("policy_asserted")
        expect(documentEvidenceFor(verifiedRow, "property.floodCoverageIncluded")).toBe("policy_asserted")
    })

    it("no value — including an empty array — is policy_silent", () => {
        expect(documentEvidenceFor(verifiedRow, "property.theftCoverageLimit")).toBe("policy_silent")
        expect(documentEvidenceFor({ beneficiaries: [] }, "beneficiaries")).toBe("policy_silent")
        expect(documentEvidenceFor({ policy: { premium: null } }, "policy.premium")).toBe("policy_silent")
        expect(documentEvidenceFor(null, "vehicle.insuredValue")).toBe("policy_silent")
    })

    it("an explicit false is a value, not silence — the whole point of «unknown is not absence»", () => {
        expect(documentEvidenceFor({ pet: { leishmaniaCovered: false } }, "pet.leishmaniaCovered")).toBe("policy_asserted")
    })

    it("the weakest link decides; nothing read is silence", () => {
        expect(lowestDocumentEvidence(["policy_verified", "policy_asserted"])).toBe("policy_asserted")
        expect(lowestDocumentEvidence(["policy_verified", "policy_silent", "policy_asserted"])).toBe("policy_silent")
        expect(lowestDocumentEvidence(["policy_verified"])).toBe("policy_verified")
        expect(lowestDocumentEvidence([])).toBe("policy_silent")
        expect(DOCUMENT_EVIDENCE_STATES).toEqual(["policy_verified", "policy_asserted", "policy_silent"])
    })

    it("documentEvidenceForFields keeps the order asked", () => {
        expect(Object.keys(documentEvidenceForFields(verifiedRow, ["property.fireCoverageIncluded", "property.earthquakeCoverageIncluded"]))).toEqual([
            "property.fireCoverageIncluded",
            "property.earthquakeCoverageIncluded",
        ])
    })
})

describe("every decided gap carries an evidence state for every field its rule read", () => {
    const enfia = AUTHORED_GAP_DEFINITIONS.find((d) => d.slug.includes("enfia"))!

    it("the ENFIA rule reads three property fields; the weakest decides", () => {
        expect(enfia).toBeDefined()
        const { evidence, lowest } = documentEvidenceForLogic(enfia.detectionLogic, verifiedRow)
        expect(Object.keys(evidence).sort()).toEqual(fieldsReadByDetectionLogic(enfia.detectionLogic).sort())
        expect(evidence["property.earthquakeCoverageIncluded"]).toBe("policy_verified")
        expect(evidence["property.fireCoverageIncluded"]).toBe("policy_asserted")
        expect(lowest).toBe("policy_asserted")
    })

    it("a rule whose fields are all cited and found is policy_verified as a whole", () => {
        const row = {
            property: { fireCoverageIncluded: false, earthquakeCoverageIncluded: false, floodCoverageIncluded: false },
            extraction: {
                sources: Object.fromEntries(
                    ["fire", "earthquake", "flood"].map((p) => [`acordData.property.${p}CoverageIncluded`, { page: 1, snippet: "x", verified: true }])
                ),
            },
        }
        expect(documentEvidenceForLogic(enfia.detectionLogic, row).lowest).toBe("policy_verified")
    })

    const logic = { rules: [{ type: "acord_field_check", field: "property.earthquakeCoverageIncluded", operator: "is_false" }], operator: "AND" }
    const tx = (definitions: Array<{ id: string; detectionLogic: unknown }>) => ({
        gapInstance: {
            findMany: vi.fn().mockResolvedValue([]),
            updateMany: vi.fn(),
            createMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        gapDefinition: { findMany: vi.fn().mockResolvedValue(definitions) },
    })
    const row = {
        gapDefinitionId: "def_1",
        severity: "high",
        ruleId: "acord_deterministic",
        ruleInputs: { "property.earthquakeCoverageIncluded": false },
        aiExplanation: null,
        aiExplanationEl: null,
        aiSuggestion: null,
        aiSuggestionEl: null,
    }

    it("the writer persists the evidence beside the inputs, computed against the definition's own logic", async () => {
        const client = tx([{ id: "def_1", detectionLogic: logic }])
        await writeRuleDecidedGaps(client as any, {
            policyId: "p1",
            runId: "run_1",
            lineOfBusiness: "home",
            catalogueVersion: "x",
            decided: [row],
            acordData: verifiedRow,
        })
        expect(client.gapDefinition.findMany).toHaveBeenCalledWith({ where: { id: { in: ["def_1"] } }, select: { id: true, detectionLogic: true } })
        const [written] = client.gapInstance.createMany.mock.calls[0][0].data
        expect(written.ruleInputs).toEqual({
            "property.earthquakeCoverageIncluded": false,
            _evidence: { "property.earthquakeCoverageIncluded": "policy_verified", lowest: "policy_verified" },
        })
    })

    it("without the document the writer writes rows exactly as before — no key, no query", async () => {
        const client = tx([])
        await writeRuleDecidedGaps(client as any, { policyId: "p1", runId: "run_1", lineOfBusiness: "home", catalogueVersion: "x", decided: [row] })
        expect(client.gapDefinition.findMany).not.toHaveBeenCalled()
        const [written] = client.gapInstance.createMany.mock.calls[0][0].data
        expect(written.ruleInputs).toEqual({ "property.earthquakeCoverageIncluded": false })
    })

    it("probe — a definition with no evaluable field reads nothing, and says so", () => {
        const { evidence, lowest } = documentEvidenceForLogic({ check: "does it cover…?" }, verifiedRow)
        expect(evidence).toEqual({})
        expect(lowest).toBe("policy_silent")
    })
})
