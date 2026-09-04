/**
 * What the risk wizard sends to PATCH /api/v1/risk-profile — pure, so the
 * erasure it used to cause is a unit test rather than a production incident.
 *
 * The bug (audit B, Sept 2026): the form serialised EVERY control on every
 * save. `chronicConditions` and `familyMedicalHistory` were always arrays and
 * `isBuildingManager` always a boolean, and the page never pre-filled those
 * eight fields — so each save sent `[]` / `false` for data the person had
 * stored, the route wrote them, and the Art. 9 answers were gone. The route now
 * writes only what the body carries (applyFactWrites), and this module sends
 * only what can be a statement by the person:
 *
 *   • a field the person TOUCHED — including one they cleared to «none»;
 *   • a field the page PRE-FILLED from the stored row (`initialData[field]`
 *     is not undefined) — sending the stored value back is a no-op;
 *   • a DEFINITE control when there is no stored profile at all
 *     (`initialData` undefined): an unticked box is then a real «no», and
 *     there is nothing to erase.
 *
 * A field the page did not pre-fill and the person did not touch is ABSENT
 * from the body, and absent is untouched on the server. That is what makes a
 * future omission in page.tsx harmless instead of destructive. Empty inputs
 * («», null) are absent too: a cleared number is not a declaration of zero.
 */

/**
 * Controls whose state is DEFINITE the moment they are rendered.
 *
 * A checkbox is either ticked or not — leaving it alone is a real answer ("no
 * pets"), and it writes `false`, the same value the column defaults to. So these
 * must be reported as answered or the engine can never tell a deliberate "no"
 * from silence, and the risk sits in `needs_review` however carefully the form
 * was filled in.
 *
 * Selects, text and number inputs are deliberately NOT here. They have an empty
 * state, and rendering one is not the same as answering it.
 */
export const DEFINITE_WIZARD_FIELDS = [
    "ownsHome", "rentsOutProperty", "ownsBoat", "ownsBusiness", "hasLoans",
    "hasPets", "travelsFrequently", "retirementPlanning", "isBuildingManager",
    // Multi-selects: an empty list is the answer "none of these".
    "activities", "chronicConditions", "familyMedicalHistory",
] as const

const DEFINITE = new Set<string>(DEFINITE_WIZARD_FIELDS)

/** Inputs whose state is `number | ""`; sent as numbers. */
const NUMERIC_WIZARD_FIELDS = new Set<string>([
    "dependentsCount", "mortgageAmount", "vehiclesCount", "annualIncome", "loanAmount",
    "heightCm", "weightKg", "childrenCount", "propertiesOwned", "businessEmployees",
    "savingsAmount", "valuablesValue",
])

/** Not a fact column — never reported as answered. */
const NOT_A_FACT = new Set<string>(["lifeEvents"])

/**
 * What the customer has actually answered.
 *
 * Reporting every RENDERED field as answered was wrong in exactly the way the
 * engine exists to avoid. Leaving the residence select on "Επιλέξτε…" marked
 * `residence` as known-with-no-value, and both property risks then resolved to
 * `not_applicable` — the engine stating that this person owns no home and rents
 * nowhere, on the strength of a question they had skipped. Skipped means
 * `needs_review`, which is the whole point of tracking knownness.
 */
export function answeredFieldsFrom(values: Record<string, unknown>): string[] {
    const answered = [...DEFINITE_WIZARD_FIELDS] as string[]
    for (const [field, value] of Object.entries(values)) {
        if (NOT_A_FACT.has(field)) continue
        if (value === "" || value === null || value === undefined) continue
        answered.push(field)
    }
    return [...new Set(answered)]
}

const isBlank = (value: unknown) => value === "" || value === null || value === undefined

/** May this field travel, given who has said anything about it? */
export function wizardFieldIsSendable(
    field: string,
    touched: ReadonlySet<string>,
    initialData: Record<string, unknown> | undefined
): boolean {
    if (touched.has(field)) return true
    // No stored profile: nothing can be erased, and an unticked definite
    // control is a real «no». (Non-definite controls only reach here when
    // they hold a value — a select's empty state was dropped by the caller.)
    if (initialData === undefined) return true
    return initialData[field] !== undefined
}

export interface WizardPayloadArgs {
    /** Every control's current state, keyed by profile column. */
    values: Record<string, unknown>
    /** Fields the person changed at least once this session. */
    touched: ReadonlySet<string>
    /** What the page pre-filled from the stored row; undefined = no profile yet. */
    initialData: Record<string, unknown> | undefined
}

export function wizardPayload({ values, touched, initialData }: WizardPayloadArgs): Record<string, unknown> {
    const body: Record<string, unknown> = {}
    for (const [field, raw] of Object.entries(values)) {
        if (isBlank(raw)) continue
        if (!wizardFieldIsSendable(field, touched, initialData)) continue
        if (field === "lifeEvents" && Array.isArray(raw) && raw.length === 0 && !touched.has(field)) continue
        body[field] = NUMERIC_WIZARD_FIELDS.has(field) ? Number(raw) : raw
    }
    // Only what they actually answered. A skipped select stays unknown rather
    // than becoming a declaration of "none".
    body.answeredFields = answeredFieldsFrom(values)
    return body
}
