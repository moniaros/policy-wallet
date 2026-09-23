/**
 * The preventive calendar (spec v2 §9.3): general adult screening intervals,
 * keyed off the age band and sex the person GAVE in their self-assessment —
 * never read from the profile, so the calendar exists only under the same
 * consent as the assessment. Source: docs/content/CLAIMS.md C16 (general
 * preventive guidance); every card says to confirm with a doctor, and none
 * claims a policy covers it — coverage is what the policy's own reading states.
 */
export interface PreventiveItem {
    id: string
    sex?: "female" | "male"
    minAge: number
    maxAge?: number
    everyYears: number
}

export const PREVENTIVE_ITEMS: readonly PreventiveItem[] = [
    { id: "blood_pressure", minAge: 18, everyYears: 1 },
    { id: "dental_cleaning", minAge: 18, everyYears: 1 },
    { id: "lipid_panel", minAge: 40, everyYears: 5 },
    { id: "glucose", minAge: 45, everyYears: 3 },
    { id: "cervical", sex: "female", minAge: 21, maxAge: 65, everyYears: 3 },
    { id: "mammography", sex: "female", minAge: 50, maxAge: 69, everyYears: 2 },
    { id: "colorectal", minAge: 50, maxAge: 74, everyYears: 2 },
]

/** Midpoint of the assessment's age band — enough for a screening window. */
export function ageFromBand(band: string | undefined): number | null {
    const map: Record<string, number> = { "18_29": 24, "30_39": 35, "40_49": 45, "50_59": 55, "60_plus": 66 }
    return band !== undefined && band in map ? map[band] : null
}

export function preventiveItemsFor(ageBand: string | undefined, sex: string | undefined): PreventiveItem[] {
    const age = ageFromBand(ageBand)
    if (age === null) return []
    return PREVENTIVE_ITEMS.filter((item) => {
        if (age < item.minAge) return false
        if (item.maxAge !== undefined && age > item.maxAge) return false
        if (item.sex && sex !== item.sex) return false
        return true
    })
}
