import { describe, it, expect } from "vitest"

import { z } from "zod"

import { AcordDataSchema, DEPRECATED_PREFIX } from "@/lib/schemas/acord-data"
import { buildExtractionSchema } from "@/lib/services/ai/extraction-schema"
import { schemaPromptBlock, stripDeprecated } from "@/lib/services/ai/json-mode-schema"
import { RULE_READ_FIELDS } from "@/lib/gaps/rule-read-fields"

/**
 * PW-PROVENANCE-01 W5-01 (plan Wave 5, D3). A motor schedule names its
 * additional drivers; the extractor used to copy those names and licence
 * numbers into `vehicle.namedDrivers` — third-party personal data that no rule
 * reads (the walker proves it) and that Art. 15(4) makes awkward to export.
 * The `insuredPersons` principle applies: COUNT and characterise, never name.
 * The schema drives what the model is asked for. LOOP.md §4 forbids narrowing
 * a stored shape, so the two keys STAY, described `DEPRECATED`, and the prompt
 * block drops every such field — the model is never asked, nothing new is
 * collected, a legacy row keeps its type. On 2026-09-11 no row on either
 * database carried a named driver. Removing the keys is the owner's call.
 */

type ZodLike = { _zod?: { def: any }; def?: any }
const def = (s: ZodLike): any => s?._zod?.def ?? s?.def
const unwrap = (s: ZodLike): any => {
    let d = def(s)
    while (d && ["optional", "nullable", "default"].includes(d.type)) d = def(d.innerType)
    return d
}

function itemShapeOf(schema: ZodLike, path: string[]): Record<string, any> {
    let d = unwrap(schema)
    for (const key of path) {
        const shape = typeof d.shape === "function" ? d.shape() : d.shape
        d = unwrap(shape[key])
    }
    const element = unwrap(d.element)
    return typeof element.shape === "function" ? element.shape() : element.shape
}

/** The keys an array-of-objects field declares, wherever it sits in the schema. */
function itemKeysOf(schema: ZodLike, path: string[]): string[] {
    return Object.keys(itemShapeOf(schema, path)).sort()
}

/** The keys the model is ASKED for: declared, and not described DEPRECATED. */
function askedKeysOf(schema: ZodLike, path: string[]): string[] {
    const shape = itemShapeOf(schema, path)
    return Object.keys(shape)
        .filter((k) => !String(shape[k]?.description ?? "").startsWith(DEPRECATED_PREFIX))
        .sort()
}

const DRIVER_ARRAYS = [
    ["vehicle", "namedDrivers"],
    ["motor", "namedDrivers"],
]

describe("named drivers are counted and characterised, never named", () => {
    it("neither driver array ASKS for a name or a licence number — the keys exist only as DEPRECATED", () => {
        for (const path of DRIVER_ARRAYS) {
            const asked = askedKeysOf(AcordDataSchema, path)
            expect(asked, path.join(".")).not.toContain("name")
            expect(asked, path.join(".")).not.toContain("licenseNumber")
            expect(asked, path.join(".")).toEqual(["ageBand", "relationshipToPolicyholder", "yearsLicensed"])
            // §4: the stored shape is not narrowed — the legacy keys are still declared.
            expect(itemKeysOf(AcordDataSchema, path)).toEqual(expect.arrayContaining(["name", "licenseNumber"]))
        }
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

    it("a legacy row carrying names still parses — the stored shape was not narrowed (§4)", () => {
        const parsed = AcordDataSchema.parse({
            vehicle: {
                make: "Toyota",
                namedDrivers: [{ name: "Μαρία Παπαδοπούλου", licenseNumber: "AB123456", ageBand: "over-30" }],
                namedDriverCount: 1,
                namedDriverRestriction: true,
            },
        })
        expect(parsed.vehicle?.namedDrivers?.[0]?.ageBand).toBe("over-30")
        expect(parsed.vehicle?.namedDriverCount).toBe(1)
        expect(parsed.vehicle?.namedDriverRestriction).toBe(true)
    })

    it("probe — a declared name that is NOT deprecated is seen as asked for", () => {
        const probe = z.object({ vehicle: z.object({ namedDrivers: z.array(z.object({ name: z.string(), ageBand: z.string().optional() })).optional() }).optional() })
        expect(askedKeysOf(probe, ["vehicle", "namedDrivers"])).toContain("name")
    })

    it("probe — stripDeprecated drops only the DEPRECATED-described property, and keeps its siblings", () => {
        const wire = {
            type: "object",
            properties: {
                keep: { type: "string", description: "kept" },
                gone: { type: "string", description: `${DEPRECATED_PREFIX} — gone` },
                nested: { type: "array", items: { type: "object", properties: { gone: { type: "string", description: `${DEPRECATED_PREFIX}` }, keep: { type: "number" } }, required: ["gone", "keep"] } },
            },
            required: ["keep", "gone"],
        }
        const out = stripDeprecated(wire) as any
        expect(Object.keys(out.properties)).toEqual(["keep", "nested"])
        expect(out.required).toEqual(["keep"])
        expect(Object.keys(out.properties.nested.items.properties)).toEqual(["keep"])
        expect(out.properties.nested.items.required).toEqual(["keep"])
        // and the real block: with the probe schema (name NOT deprecated) the name IS asked for
        const block = schemaPromptBlock(z.object({ namedDrivers: z.array(z.object({ name: z.string() })) }))
        expect(block).toContain('"name"')
    })
})
