/**
 * PW-CONTENT-01 Goal 5 — two authoring guards, enumerated over the whole
 * authored catalogue:
 *  1. authored-rule-declares-inputs: every rule's inputs are statically
 *     declarable, so B2's composition can tell covered from indeterminate
 *     without guessing (a rule with undeclarable inputs is indeterminate on
 *     every policy, silently).
 *  2. authored-rule-reads-populated-fields: every declared input exists in the
 *     extraction schema AND sits in a section the prompt fills for the rule's
 *     branch (lib/gaps/field-inventory.ts). A rule reading a field the
 *     extractor never produces for its branch is worse than no rule.
 * Both demonstrated red on committed probes.
 */
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { AUTHORED_GAP_DEFINITIONS } from "@/lib/gaps/authored-catalogue"
import { declaredInputs } from "@/lib/gaps/composition"
import { fieldPopulatedFor, schemaHasPath, sectionsFor, BRANCH_SECTIONS } from "@/lib/gaps/field-inventory"
import { WRITE_BRANCH_IDS } from "@/lib/insurance/taxonomy"

function probeDefinition(file: string): { slug: string; lineOfBusiness: string; detectionLogic: unknown } {
    const src = readFileSync(file, "utf8")
    return new Function(`${src.replace(/^export const probe =/m, "return")}`)()
}

describe("Goal 5 — authored-rule-declares-inputs", () => {
    it("every authored rule declares its inputs statically", () => {
        const undeclared = AUTHORED_GAP_DEFINITIONS.filter((d) => declaredInputs(d.detectionLogic) === null).map((d) => d.slug)
        expect(undeclared).toEqual([])
    })
    it("the probe (a low_limit rule) turns it red", () => {
        expect(declaredInputs(probeDefinition("tests/fixtures/guard-probes/rule-undeclared-inputs.ts.txt").detectionLogic)).toBeNull()
    })
})

describe("Goal 5 — authored-rule-reads-populated-fields", () => {
    it("the inventory knows every write branch it maps, and every mapped section exists in the schema", () => {
        for (const branch of Object.keys(BRANCH_SECTIONS)) expect(WRITE_BRANCH_IDS as readonly string[], branch).toContain(branch)
        for (const section of new Set(Object.values(BRANCH_SECTIONS).flat())) expect(schemaHasPath(section), section).toBe(true)
        expect(sectionsFor("renters")).toContain("property")
        expect(sectionsFor("business")).not.toContain("vehicle")
    })
    it("every declared input of every authored rule is a schema path the extractor fills for that branch", () => {
        const offenders: string[] = []
        for (const d of AUTHORED_GAP_DEFINITIONS) {
            for (const path of declaredInputs(d.detectionLogic) ?? []) {
                if (!schemaHasPath(path)) offenders.push(`${d.slug}: ${path} is not in the extraction schema`)
                else if (!fieldPopulatedFor(d.lineOfBusiness, path)) offenders.push(`${d.slug}: ${path} is not filled for ${d.lineOfBusiness}`)
            }
        }
        expect(offenders).toEqual([])
    })
    it("the probe (a renters rule reading vehicle.plateNumber) turns it red", () => {
        const probe = probeDefinition("tests/fixtures/guard-probes/rule-reads-unpopulated-field.ts.txt")
        const paths = declaredInputs(probe.detectionLogic) ?? []
        expect(paths.length).toBeGreaterThan(0)
        expect(paths.every((p) => fieldPopulatedFor(probe.lineOfBusiness, p))).toBe(false)
        expect(schemaHasPath("vehicle.plateNumber")).toBe(true) // the field exists; it is the BRANCH that never fills it
    })
})
