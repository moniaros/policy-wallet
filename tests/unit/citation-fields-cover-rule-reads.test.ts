import { describe, it, expect } from "vitest"

import { AUTHORED_GAP_DEFINITIONS } from "@/lib/gaps/authored-catalogue"
import { fieldsReadByDetectionLogic, RULE_READ_FIELDS } from "@/lib/gaps/rule-read-fields"
import {
    CITATION_FIELDS,
    CITATIONS_PROMPT_SECTION,
    ExtractionSourcesSchema,
    IDENTITY_CITATION_FIELDS,
    sanitizeExtractionSources,
} from "@/lib/services/ai/extraction-citations"

/**
 * PW-PROVENANCE-01 W1-01. A finding quotes a figure or fires on a boolean at
 * some `acordData` path; if the extraction of that path carries no citation,
 * the finding cannot be followed to a page. The universe is the authored
 * catalogue — every ACTIVE definition's `detectionLogic`, walked the way the
 * engine walks it — and every path it reads must be a citation field.
 */

describe("every field an active rule reads is a citation field", () => {
    const active = AUTHORED_GAP_DEFINITIONS.filter((d) => d.isActive)

    it("enumerates a real universe", () => {
        expect(active.length).toBeGreaterThan(40)
        expect(RULE_READ_FIELDS.length).toBeGreaterThan(25)
        expect(RULE_READ_FIELDS).toContain("property.earthquakeCoverageIncluded")
        expect(RULE_READ_FIELDS).toContain("health.annualLimit".replace("annualLimit", "hospitalClass"))
    })

    it("no active rule reads a path the citation list does not name", () => {
        const missing = active.flatMap((d) =>
            fieldsReadByDetectionLogic(d.detectionLogic)
                .filter((path) => !CITATION_FIELDS.includes(`acordData.${path}`))
                .map((path) => `${d.slug} reads ${path}`)
        )
        expect(missing, missing.join("\n")).toEqual([])
    })

    it("the identity fields come first and unchanged; the rest are acordData paths", () => {
        expect([...CITATION_FIELDS].slice(0, IDENTITY_CITATION_FIELDS.length)).toEqual([...IDENTITY_CITATION_FIELDS])
        expect([...CITATION_FIELDS].slice(IDENTITY_CITATION_FIELDS.length)).toEqual(RULE_READ_FIELDS.map((p) => `acordData.${p}`))
    })

    it("the prompt and the response schema name the rule-read paths in the same key form", () => {
        expect(CITATIONS_PROMPT_SECTION).toContain("acordData.vehicle.hasRoadsideAssistance")
        expect(CITATIONS_PROMPT_SECTION).toContain('keyed "acordData.<path>"')
        expect(ExtractionSourcesSchema.description).toContain("acordData.property.earthquakeCoverageIncluded")
    })

    it("the sanitizer keeps a rule-read citation and still drops an unknown one", () => {
        const kept = sanitizeExtractionSources({
            "acordData.vehicle.hasRoadsideAssistance": { page: 3, snippet: "Οδική βοήθεια: Καλύπτεται" },
            "acordData.vehicle.nope": { page: 3, snippet: "x" },
            insurerName: { page: 1, snippet: "Interamerican" },
        })
        expect(Object.keys(kept ?? {}).sort()).toEqual(["acordData.vehicle.hasRoadsideAssistance", "insurerName"])
    })
})

describe("probe — the walker reads what the engine reads", () => {
    it("field, fields[], the drift reference, and the low_limit defaults", () => {
        expect(fieldsReadByDetectionLogic({ rules: [{ type: "acord_field_check", field: "a.b", operator: "is_false" }] })).toEqual(["a.b"])
        expect(
            fieldsReadByDetectionLogic({
                rules: [{ type: "acord_field_check", field: "property", operator: "all_false", fields: ["p.x", "p.y"] }],
            })
        ).toEqual(["p.x", "p.y"])
        expect(
            fieldsReadByDetectionLogic({
                rules: [{ type: "acord_field_check", field: "v.insured", operator: "value_drift", referenceField: "v.market" }],
            })
        ).toEqual(["v.insured", "v.market"])
        expect(fieldsReadByDetectionLogic({ rules: [{ type: "low_limit", minimum: 1 }] })).toEqual([
            "coverage.sumInsured",
            "property.insuredValue",
            "home.insuredValue",
        ])
        // A single-rule logic without `rules` is read as one rule, as the engine does.
        expect(fieldsReadByDetectionLogic({ type: "date_within_days", field: "vehicle.greenCardExpiryDate", withinDays: 30 })).toEqual([
            "vehicle.greenCardExpiryDate",
        ])
        expect(fieldsReadByDetectionLogic({ check: "does the policy…?" })).toEqual([])
    })

    it("a rule reading a field outside the list is reported by name", () => {
        const probe = [{ slug: "probe", isActive: true, detectionLogic: { rules: [{ type: "acord_field_check", field: "vehicle.nope", operator: "missing" }] } }]
        const missing = probe.flatMap((d) =>
            fieldsReadByDetectionLogic(d.detectionLogic)
                .filter((path) => !CITATION_FIELDS.includes(`acordData.${path}`))
                .map((path) => `${d.slug} reads ${path}`)
        )
        expect(missing).toEqual(["probe reads vehicle.nope"])
    })
})
