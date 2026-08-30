/**
 * The 16 lines (§5.3 CoverageMap) — the SAME sixteen the marketing site
 * reads (`productCategories`, lib/product/catalog.tsx), so the app and the
 * site cannot disagree about what a "line" is. The taxonomy's 31 write
 * branches fold onto them here; `null` means a branch that belongs to no
 * consumer line and is counted in the verdict but not drawn on the map.
 */
import { productCategories } from "@/lib/product/catalog"
import { WRITE_BRANCH_IDS, normalizeBranch, type WriteBranchId } from "@/lib/insurance/taxonomy"

export type LineId = (typeof productCategories)[number]["id"]

export const LINE_OF_BRANCH: Record<WriteBranchId, LineId | null> = {
    motor: "motor", motorbike: "motor", roadside: "motor",
    home: "property",
    health: "health",
    life: "life", income_protection: "life", personal_accident: "life",
    pension: "pension",
    travel: "travel",
    pet: "pet",
    cyber: "cyber",
    liability: "liability", professional_liability: "liability", employer_liability: "liability",
    legal_expenses: "legal-expenses",
    boat: "boat", boat_hull: "boat", boat_tpl: "boat", marine_hull: "boat", marine_cargo: "boat", marine_crew: "boat",
    fine_art: "fine-art",
    business: "business", transports: "business", money: "business", fidelity: "business",
    group_health: "group-health", group_life: "group-life", group_pension: "group-pension",
    other: null,
}

export const LINES: ReadonlyArray<{ id: LineId; label: { el: string; en: string } }> = productCategories.map((c) => ({ id: c.id, label: { el: c.labelEl, en: c.labelEn } }))

/** The line a policy belongs to, or null. */
export function lineOf(lineOfBusiness: string): LineId | null {
    const id = normalizeBranch(lineOfBusiness).id as WriteBranchId
    return (WRITE_BRANCH_IDS as readonly string[]).includes(id) ? LINE_OF_BRANCH[id] : null
}
