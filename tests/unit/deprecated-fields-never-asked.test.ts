import { describe, it, expect } from "vitest"
import { z } from "zod"

import { AcordDataSchema, DEPRECATED_PREFIX } from "@/lib/schemas/acord-data"
import { buildExtractionSchema } from "@/lib/services/ai/extraction-schema"
import { schemaPromptBlock, stripDeprecated } from "@/lib/services/ai/json-mode-schema"
import { RULE_READ_FIELDS } from "@/lib/gaps/rule-read-fields"

/**
 * PW-PROVENANCE-01 W5-02 (plan D3), generalising W5-01. LOOP.md §4 says a
 * stored shape is never narrowed, so a field the product must stop collecting
 * stays DECLARED and is described `DEPRECATED`; the JSON-mode prompt block
 * drops every such field, so the model is never asked. This guard enumerates
 * the deprecated set from the schema itself — not from a list kept here — and
 * checks the prompt block the model actually receives against it. The
 * expected set is asserted exactly, so a field deprecated or un-deprecated
 * without a ledger row is noticed either way.
 */

type ZodLike = { _zod?: { def: any }; def?: any; description?: unknown }
const def = (s: ZodLike): any => s?._zod?.def ?? s?.def
const isDeprecated = (s: ZodLike) => String(s?.description ?? "").startsWith(DEPRECATED_PREFIX)

/** Every path in a Zod schema whose field is described DEPRECATED. `[]` marks an array element. */
function deprecatedPaths(schema: ZodLike, prefix = ""): string[] {
    const out: string[] = []
    if (isDeprecated(schema)) out.push(prefix)
    let d = def(schema)
    while (d && ["optional", "nullable", "default"].includes(d.type)) d = def(d.innerType)
    if (!d) return out
    if (d.type === "object") {
        const shape = typeof d.shape === "function" ? d.shape() : d.shape
        for (const key of Object.keys(shape)) out.push(...deprecatedPaths(shape[key], prefix ? `${prefix}.${key}` : key))
    } else if (d.type === "array") {
        out.push(...deprecatedPaths(d.element, `${prefix}[]`))
    }
    return out
}

/** Every property path in a wire JSON schema, in the same notation. */
function wirePaths(node: any, prefix = ""): string[] {
    if (!node || typeof node !== "object") return []
    const out: string[] = []
    if (node.properties) {
        for (const [key, sub] of Object.entries(node.properties)) {
            const path = prefix ? `${prefix}.${key}` : key
            out.push(path, ...wirePaths(sub, path))
        }
    }
    if (node.items) out.push(...wirePaths(node.items, `${prefix}[]`))
    for (const alt of [...(node.anyOf ?? []), ...(node.oneOf ?? []), ...(node.allOf ?? [])]) out.push(...wirePaths(alt, prefix))
    return out
}

function wireOf(block: string): any {
    return JSON.parse(block.slice(block.indexOf("JSON SCHEMA:") + "JSON SCHEMA:".length).trim())
}

const EXPECTED = [
    "lifeAndInvestment.beneficiaries",
    "motor.namedDrivers[].licenseNumber",
    "motor.namedDrivers[].name",
    "vehicle.namedDrivers[].licenseNumber",
    "vehicle.namedDrivers[].name",
]

describe("a DEPRECATED field stays declared and is never asked for", () => {
    it("the deprecated set, read from the schema, is exactly the ledgered one", () => {
        expect(deprecatedPaths(AcordDataSchema).sort()).toEqual(EXPECTED)
    })

    it("none of them reaches the prompt block; their replacements do", () => {
        const paths = new Set(wirePaths(wireOf(schemaPromptBlock(buildExtractionSchema())), "").map((p) => p.replace(/^acordData\./, "")))
        expect(paths.size).toBeGreaterThan(100)
        for (const p of EXPECTED) expect(paths.has(p), p).toBe(false)
        for (const p of ["lifeAndInvestment.beneficiaryCount", "lifeAndInvestment.beneficiaryRelationships", "vehicle.namedDriverCount", "vehicle.namedDrivers[].ageBand"]) {
            expect(paths.has(p), p).toBe(true)
        }
    })

    it("the beneficiary rules keep a live input: the designations themselves, not the deprecated name list", () => {
        // `no_beneficiaries_recorded` and its siblings use all_missing over both
        // paths; the top-level array is what a life schedule fills, so the rule
        // is unchanged and the catalogue fingerprint does not move.
        expect(RULE_READ_FIELDS).toContain("beneficiaries")
        expect(RULE_READ_FIELDS).toContain("lifeAndInvestment.beneficiaries")
        expect(RULE_READ_FIELDS.some((p) => p.includes("beneficiaryCount") || p.includes("beneficiaryRelationships"))).toBe(false)
    })

    it("probe — a DEPRECATED field at depth is found by the walker and dropped from the block", () => {
        const probe = z.object({
            a: z.object({ list: z.array(z.object({ secret: z.string().optional().describe(`${DEPRECATED_PREFIX} x`), keep: z.string() })) }).optional(),
            b: z.array(z.string()).optional().describe(`${DEPRECATED_PREFIX} y`),
            c: z.string().optional().describe("not deprecated"),
        })
        expect(deprecatedPaths(probe).sort()).toEqual(["a.list[].secret", "b"])
        const paths = wirePaths(wireOf(schemaPromptBlock(probe)))
        expect(paths).toEqual(["a", "a.list", "a.list[].keep", "c"])
        // and without the strip the same field IS in the wire — the strip is what removes it
        const raw = wirePaths(JSON.parse(JSON.stringify(stripDeprecated({ properties: { b: { description: "kept b" } } }))))
        expect(raw).toEqual(["b"])
    })
})
