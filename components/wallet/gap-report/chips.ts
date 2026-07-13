import type { GapCoverageArea, GapMechanic } from "@/lib/wallet/gap-report"

/** Maps engine enum values to i18n copy-object keys (camelCase). */
export const MECHANIC_CHIP_KEY: Record<GapMechanic, string> = {
    exclusion: "exclusion",
    limit: "limit",
    cost_sharing: "costSharing",
    other: "other",
}

export const AREA_CHIP_KEY: Record<GapCoverageArea, string> = {
    hospital: "hospital",
    outpatient: "outpatient",
    maternity_mental: "maternityMental",
    abroad: "abroad",
    vehicle: "vehicle",
    property: "property",
    pet: "pet",
    general: "general",
}
