import { AcordDataSchema } from "@/lib/schemas/acord-data"

/**
 * PW-CONTENT-01 Goal 5 — what the extractor can populate for a branch.
 *
 * A rule that reads a field the extractor never produces for its branch
 * returns `indeterminate` on every policy and fills the denominator with noise
 * (Step 0 B4). The extraction prompt fills the shared sections for every
 * document and ONE branch section chosen by the detected line
 * (`lib/services/ai/prompts.ts`); this table is that rule, made checkable.
 * The guard `tests/unit/authored-rule-inputs.test.ts` refuses an authored rule
 * whose declared inputs fall outside `sectionsFor(branch)` or outside the
 * schema.
 */
export const SHARED_SECTIONS = [
    "policy", "coverages", "exclusions", "conditions", "insuredItems", "insuredPersons",
    "namedClauses", "territorialScope", "beneficiaries", "finePrintClauses", "perksAndBenefits", "notableConditions",
] as const

/** The branch section the prompt fills for each write branch. Branches absent here get the shared sections only. */
export const BRANCH_SECTIONS: Readonly<Record<string, readonly string[]>> = Object.freeze({
    motor: ["vehicle"], motorbike: ["vehicle"], roadside: ["vehicle"],
    home: ["property"], renters: ["property"], fine_art: ["property"],
    health: ["health"], group_health: ["health"],
    life: ["lifeAndInvestment"], group_life: ["lifeAndInvestment"], pension: ["lifeAndInvestment"], group_pension: ["lifeAndInvestment"],
    income_protection: ["lifeAndInvestment"], personal_accident: ["lifeAndInvestment"],
    pet: ["pet"], travel: ["travel"],
    boat: ["marineVessel"], boat_hull: ["marineVessel"], boat_tpl: ["marineVessel"], marine_hull: ["marineVessel"], marine_crew: ["marineVessel"],
    marine_cargo: ["transit"], transports: ["transit"],
})

export function sectionsFor(branch: string): string[] {
    return [...(BRANCH_SECTIONS[branch] ?? []), ...SHARED_SECTIONS]
}

/** Zod v4 introspection: peel optional / nullable / default wrappers. */
function unwrap(s: any): any {
    let cur = s
    for (let i = 0; i < 6 && cur; i++) {
        const inner = cur?.def?.innerType ?? cur?._def?.innerType
        if (inner) { cur = inner; continue }
        if (typeof cur.unwrap === "function" && !cur.shape && !cur.element) { cur = cur.unwrap(); continue }
        break
    }
    return cur
}

/** Does a dotted path exist in the extraction schema? Arrays are addressed as a whole (`insuredItems`). */
export function schemaHasPath(path: string): boolean {
    let cur: any = AcordDataSchema
    for (const seg of path.split(".")) {
        cur = unwrap(cur)
        const shape = cur?.shape ?? cur?.def?.shape ?? cur?._def?.shape
        if (!shape || !(seg in shape)) return false
        cur = shape[seg]
    }
    return true
}

/** A rule for `branch` may read `path` only if the schema has it and the prompt fills its section for that branch. */
export function fieldPopulatedFor(branch: string, path: string): boolean {
    const root = path.split(".")[0]
    return schemaHasPath(path) && sectionsFor(branch).includes(root)
}
