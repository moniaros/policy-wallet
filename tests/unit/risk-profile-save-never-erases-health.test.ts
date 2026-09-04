import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { answeredFieldsFrom, wizardPayload } from "@/components/coverage/risk-profile-payload"
import { applyFactWrites, existingFacts, factWritesFrom } from "@/lib/services/protection-profile/fact-writes"

/**
 * A save of the risk wizard must never erase a stored answer the person did
 * not touch — least of all the Art. 9 health fields.
 *
 * Audit B (Sept 2026) found the whole chain broken at once: the page passed
 * 26 of the wizard's 34 initial fields, so gender, height, weight, chronic
 * conditions, family history, driving record, activity level and the
 * building-manager role always rendered EMPTY; the form serialised every
 * control on every save, so those eight went to the server as `[]` / `false`
 * / absent; and the route wrote `{ ...cleanData }` unconditionally while
 * marking the arrays answered. One save after the wizard was first completed,
 * the health answers were gone and the ledger said the person had declared
 * «no conditions».
 *
 * Three seams, each held here: the serialiser (pure), the server rule
 * (pure), and the page's pre-fill (source-derived, so a ninth omission fails).
 */

const STRIP = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
const WIZARD = readFileSync("components/coverage/RiskProfileWizard.tsx", "utf-8")
const PAGE = STRIP(readFileSync("app/(protected)/protection/page.tsx", "utf-8"))
const NOW = new Date("2026-09-04T12:00:00.000Z")

/** The wizard's React defaults for the eight fields the page used to omit. */
const UNTOUCHED_DEFAULTS = {
    gender: "",
    heightCm: "",
    weightKg: "",
    chronicConditions: [] as string[],
    familyMedicalHistory: [] as string[],
    drivingRecord: "",
    activityLevel: "",
    isBuildingManager: false,
}

/** What the stored row held before the save. */
const STORED = {
    gender: "female",
    heightCm: 168,
    weightKg: 62,
    chronicConditions: ["diabetes"],
    familyMedicalHistory: ["cancer"],
    drivingRecord: "clean",
    activityLevel: "active",
    isBuildingManager: true,
    answeredFields: Object.keys(UNTOUCHED_DEFAULTS),
    factProvenance: null,
}

/**
 * PROBE — the serialiser as it was: every control, every save. Kept as a
 * function rather than a fixture so the red side of this test is executable:
 * feed its output to the same server rule and the erasure happens.
 */
function legacyPayload(values: Record<string, unknown>): Record<string, unknown> {
    return {
        gender: values.gender || undefined,
        heightCm: values.heightCm === "" ? undefined : Number(values.heightCm),
        weightKg: values.weightKg === "" ? undefined : Number(values.weightKg),
        chronicConditions: values.chronicConditions,
        familyMedicalHistory: values.familyMedicalHistory,
        drivingRecord: values.drivingRecord || undefined,
        activityLevel: values.activityLevel || undefined,
        isBuildingManager: values.isBuildingManager,
        answeredFields: answeredFieldsFrom(values),
    }
}

/** The route's write derivation, byte for byte: present and not undefined → write. */
function serverApplies(body: Record<string, unknown>) {
    const { answeredFields, ...submitted } = body
    const facts = Object.fromEntries(Object.entries(submitted).filter(([, v]) => v !== undefined))
    return applyFactWrites({
        existing: existingFacts(STORED),
        writes: factWritesFrom(facts, { source: "assessment", precision: "exact" }),
        alsoAnswered: (answeredFields as string[]) ?? [],
        now: NOW,
    })
}

describe("the serialiser sends only what can be a statement by the person", () => {
    // The page as it was: a profile exists, but these eight are not passed.
    const PAGE_OMITTED_THEM = { maritalStatus: "married", hasPets: true }

    it("PROBE: the legacy body carried the empty defaults, and the server rule would have written them", () => {
        const body = legacyPayload(UNTOUCHED_DEFAULTS)
        expect(body).toMatchObject({ chronicConditions: [], familyMedicalHistory: [], isBuildingManager: false })
        const out = serverApplies(body)
        expect(out.data).toMatchObject({ chronicConditions: [], familyMedicalHistory: [], isBuildingManager: false })
    })

    it("an untouched field the page did not pre-fill is ABSENT from the body", () => {
        const body = wizardPayload({ values: UNTOUCHED_DEFAULTS, touched: new Set(), initialData: PAGE_OMITTED_THEM })
        for (const field of Object.keys(UNTOUCHED_DEFAULTS)) {
            expect(body, field).not.toHaveProperty(field)
        }
        expect(serverApplies(body).data).toEqual({})
    })

    it("a touched field travels — including one the person cleared to «none»", () => {
        const body = wizardPayload({
            values: { ...UNTOUCHED_DEFAULTS, chronicConditions: [] },
            touched: new Set(["chronicConditions"]),
            initialData: { ...PAGE_OMITTED_THEM, chronicConditions: ["diabetes"] },
        })
        expect(body).toMatchObject({ chronicConditions: [] })
        expect(serverApplies(body).data).toEqual({ chronicConditions: [] })
        expect(serverApplies(body).data).not.toHaveProperty("familyMedicalHistory")
    })

    it("a pre-filled, unchanged field may travel — it is the stored value and changes nothing", () => {
        const body = wizardPayload({
            values: { ...UNTOUCHED_DEFAULTS, chronicConditions: ["diabetes"], isBuildingManager: true },
            touched: new Set(),
            initialData: { chronicConditions: ["diabetes"], isBuildingManager: true },
        })
        expect(body).toMatchObject({ chronicConditions: ["diabetes"], isBuildingManager: true })
        expect(serverApplies(body).data).toEqual({})
    })

    it("a stored null passed as null is «nothing to protect»: the definite default may travel", () => {
        const body = wizardPayload({
            values: UNTOUCHED_DEFAULTS,
            touched: new Set(),
            initialData: { chronicConditions: null, familyMedicalHistory: null, isBuildingManager: false },
        })
        expect(body).toMatchObject({ chronicConditions: [], familyMedicalHistory: [], isBuildingManager: false })
    })

    it("with no stored profile, the definite controls travel as the real «no» they are", () => {
        const body = wizardPayload({ values: UNTOUCHED_DEFAULTS, touched: new Set(), initialData: undefined })
        expect(body).toMatchObject({ chronicConditions: [], familyMedicalHistory: [], isBuildingManager: false })
        expect(body).not.toHaveProperty("gender")
        expect(body).not.toHaveProperty("heightCm")
    })

    it("a cleared number is absent, never zero", () => {
        const body = wizardPayload({
            values: { childrenCount: "", dependentsCount: "", vehiclesCount: 2 },
            touched: new Set(["childrenCount", "vehiclesCount"]),
            initialData: { childrenCount: 2, dependentsCount: 3, vehiclesCount: 1 },
        })
        expect(body).not.toHaveProperty("childrenCount")
        expect(body).not.toHaveProperty("dependentsCount")
        expect(body.vehiclesCount).toBe(2)
    })

    it("still reports the definite controls and the filled inputs as answered", () => {
        const body = wizardPayload({
            values: { ...UNTOUCHED_DEFAULTS, gender: "male", lifeEvents: [] },
            touched: new Set(["gender"]),
            initialData: PAGE_OMITTED_THEM,
        })
        const answered = body.answeredFields as string[]
        expect(answered).toContain("gender")
        expect(answered).toContain("chronicConditions")
        expect(answered).toContain("isBuildingManager")
        expect(answered).not.toContain("heightCm")
        expect(answered).not.toContain("lifeEvents")
    })
})

describe("the seams are wired, not merely available", () => {
    it("the wizard serialises through wizardPayload and no longer sends bare controls", () => {
        expect(WIZARD).toMatch(/wizardPayload\(\{/)
        expect(WIZARD).toMatch(/touched: touched\.current/)
        const fetchBody = WIZARD.slice(WIZARD.indexOf('fetch("/api/v1/risk-profile"'), WIZARD.indexOf("if (!response.ok)"))
        expect(fetchBody).not.toMatch(/^\s*chronicConditions,\s*$/m)
        expect(fetchBody).not.toMatch(/^\s*isBuildingManager,\s*$/m)
    })

    it("every profile control is a tracked field, so a touch is always recorded", () => {
        const component = WIZARD.slice(WIZARD.indexOf("export function RiskProfileWizard("))
        const rawState = [...component.matchAll(/const \[(\w+), set\w+\] = useState/g)].map((m) => m[1])
        expect(rawState.sort()).toEqual(["loading", "newEventDate", "newEventType", "showAddEvent"])
    })

    it("the page pre-fills EVERY field the wizard can take (derived from the wizard's own prop type)", () => {
        const iface = WIZARD.slice(WIZARD.indexOf("initialData?: {"), WIZARD.indexOf("language?:"))
        const keys = [...iface.matchAll(/^\s+(\w+)\?:/gm)].map((m) => m[1])
        expect(keys.length).toBeGreaterThanOrEqual(34)
        const block = PAGE.slice(PAGE.indexOf("wizardInitialData:"), PAGE.indexOf("showUpgradeTrigger:"))
        const missing = keys.filter((k) => !new RegExp(`\\b${k}:`).test(block))
        expect(missing, `page.tsx omits from wizardInitialData:\n${missing.join("\n")}`).toEqual([])
    })
})
