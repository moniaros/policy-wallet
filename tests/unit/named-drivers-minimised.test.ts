import { describe, it, expect } from "vitest"

import { AcordDataSchema } from "@/lib/schemas/acord-data"
import { buildExtractionSchema } from "@/lib/services/ai/extraction-schema"
import { schemaPromptBlock } from "@/lib/services/ai/json-mode-schema"
import { RULE_READ_FIELDS } from "@/lib/gaps/rule-read-fields"

/**
 * PW-PROVENANCE-01 W5-01 (plan Wave 5, D3). A motor schedule names its
 * additional drivers; the extractor used to copy those names and licence
 * numbers into `vehicle.namedDrivers` — third-party personal data that no rule
 * reads (the walker proves it) and that Art. 15(4) makes awkward to export.
 * The `insuredPersons` principle applies: COUNT and characterise, never name.
 * The schema drives what the model is asked for, so narrowing it is what stops
 * the collection; a legacy item's name is stripped on parse, never rendered.
 * On 2026-09-11 no row on either database carried a named driver.
 */

type ZodLike = { _zod?: { def: any }; def?: any }
const def = (s: ZodLike): any => s?._zod?.def ?? s?.def
const unwrap = (s: ZodLike): any => {
    let d = def(s)
    while (d && ["optional", "nullable", "default"].includes(d.type)) d = def(d.innerType)
    return d
}

/** The keys an array-of-objects field asks the model for, wherever it sits in the schema. */
function itemKeysOf(schema: ZodLike, path: string[]): string[] {
    let d = unwrap(schema)
    for (const key of path) {
        const shape = typeof d.shape === "function" ? d.shape() : d.shape
        d = unwrap(shape[key])
    }
    const element = unwrap(d.element)
    const shape = typeof element.shape === "function" ? element.shape() : element.shape
    return Object.keys(shape).sort()
}

describe("named drivers are counted and characterised, never named", () => {
    it("neither driver array in the schema carries a name or a licence number", () => {
        expect(itemKeysOf(AcordDataSchema, ["vehicle", "namedDrivers"])).not.toContain("name")
        expect(itemKeysOf(AcordDataSchema, ["vehicle", "namedDrivers"])).not.toContain("licenseNumber")
        expect(itemKeysOf(AcordDataSchema, ["motor", "namedDrivers"])).not.toContain("name")
        expect(itemKeysOf(AcordDataSchema, ["motor", "namedDrivers"])).not.toContain("licenseNumber")
    })

    it("what the model is asked for — the JSON-mode prompt block — names no driver", () => {
        const block = schemaPromptBlock(buildExtractionSchema())
        const drivers = block.slice(block.indexOf("namedDrivers"))
        expect(drivers.length).toBeGreaterThan(0)
        expect(drivers.slice(0, 600)).not.toMatch(/licenseNumber|"name"/)
        expect(block).toContain("namedDriverCount")
    })

    it("no rule reads a named driver — the count and the flags are what cover turns on", () => {
        expect(RULE_READ_FIELDS.some((p) => p.startsWith("vehicle.namedDrivers"))).toBe(false)
    })

    it("a legacy row carrying names parses, and the names are gone", () => {
        const parsed = AcordDataSchema.parse({
            vehicle: {
                make: "Toyota",
                namedDrivers: [{ name: "Μαρία Παπαδοπούλου", licenseNumber: "AB123456", ageBand: "over-30" }],
                namedDriverCount: 1,
                namedDriverRestriction: true,
            },
        })
        expect(parsed.vehicle?.namedDrivers).toEqual([{ ageBand: "over-30" }])
        expect(JSON.stringify(parsed)).not.toContain("Παπαδοπούλου")
        expect(JSON.stringify(parsed)).not.toContain("AB123456")
        expect(parsed.vehicle?.namedDriverCount).toBe(1)
        expect(parsed.vehicle?.namedDriverRestriction).toBe(true)
    })

    it("probe — the item-key reader sees a name when one is declared", () => {
        const { z } = require("zod") as typeof import("zod")
        const probe = z.object({ vehicle: z.object({ namedDrivers: z.array(z.object({ name: z.string(), ageBand: z.string().optional() })).optional() }).optional() })
        expect(itemKeysOf(probe, ["vehicle", "namedDrivers"])).toContain("name")
    })
})
