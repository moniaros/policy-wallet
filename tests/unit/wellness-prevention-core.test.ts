import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { resolveCheckupBenefit } from "@/lib/wellness/checkup-benefit"
import { NUDGE_IDS, nudgeForDate, athensDate } from "@/lib/wellness/nudges"
import { buildHealthSnapshot, bmiBand } from "@/lib/wellness/health-share"
import { el } from "@/lib/i18n/translations/el"
import { en } from "@/lib/i18n/translations/en"

const future = new Date("2027-06-30T00:00:00Z")
const NOW = new Date("2026-09-24T09:00:00Z")
const policy = (health: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
    status: "active", policyNumber: "P-1", insurerName: "Εθνική", endDate: future,
    acordData: { health, ...extra },
})
const cited = (verified: boolean) => ({ extraction: { sources: { "acordData.health.annualCheckupIncluded": { page: 3, snippet: "Ετήσιος προληπτικός έλεγχος", verified } } } })

describe("resolveCheckupBenefit — evidence decides the words (prevention brief P0)", () => {
    it("true + verified citation → confirmed by document, card shown, citation carried", () => {
        const r = resolveCheckupBenefit(policy({ annualCheckupIncluded: true }, cited(true)), null, NOW)
        expect(r.state).toBe("confirmed_by_document")
        expect(r.showCard).toBe(true)
        expect(r.citation).toEqual({ page: 3, snippet: "Ετήσιος προληπτικός έλεγχος" })
    })
    it("true without a verified citation → needs confirmation, card still shown", () => {
        for (const extra of [{}, cited(false)]) {
            const r = resolveCheckupBenefit(policy({ annualCheckupIncluded: true }, extra), null, NOW)
            expect(r.state).toBe("needs_confirmation")
            expect(r.showCard).toBe(true)
        }
    })
    it("false is «not included» only with a verified citation; never a card", () => {
        expect(resolveCheckupBenefit(policy({ annualCheckupIncluded: false }, cited(true)), null, NOW).state).toBe("stated_not_included")
        const unverified = resolveCheckupBenefit(policy({ annualCheckupIncluded: false }), null, NOW)
        expect(unverified.state).toBe("needs_confirmation")
        expect(unverified.showCard).toBe(false)
    })
    it("silence is not recorded — never not covered", () => {
        const r = resolveCheckupBenefit(policy({}), null, NOW)
        expect(r.state).toBe("not_recorded")
        expect(r.showCard).toBe(false)
    })
    it("an expired policy never shows the card", () => {
        const r = resolveCheckupBenefit({ ...policy({ annualCheckupIncluded: true }, cited(true)), endDate: new Date("2025-01-01T00:00:00Z") }, null, NOW)
        expect(r.state).toBe("expired")
        expect(r.showCard).toBe(false)
    })
    it("intent hides the card: done, not relevant, later-with-a-future-date", () => {
        const p = policy({ annualCheckupIncluded: true }, cited(true))
        expect(resolveCheckupBenefit(p, { status: "completed", intent: null, remindAt: null }, NOW).showCard).toBe(false)
        expect(resolveCheckupBenefit(p, { status: "available", intent: "not_relevant", remindAt: null }, NOW).showCard).toBe(false)
        expect(resolveCheckupBenefit(p, { status: "available", intent: "later", remindAt: new Date("2026-10-15") }, NOW).showCard).toBe(false)
        expect(resolveCheckupBenefit(p, { status: "available", intent: "later", remindAt: new Date("2026-09-01") }, NOW).showCard).toBe(true)
        expect(resolveCheckupBenefit(p, { status: "available", intent: "considering", remindAt: null }, NOW).showCard).toBe(true)
    })
    it("conditions come only from a document-listed prevention perk; masks refused", () => {
        const r = resolveCheckupBenefit(policy({ annualCheckupIncluded: true }, { perksAndBenefits: [
            { perkType: "prevention", usageLimit: "1 φορά τον χρόνο" },
            { perkType: "prevention", usageLimit: "XXXX" },
            { perkType: "discount", usageLimit: "10%" },
        ] }), null, NOW)
        expect(r.conditions).toEqual(["1 φορά τον χρόνο"])
    })
})

describe("daily nudges — general, deterministic, one per Athens day", () => {
    it("same Athens day → same nudge; consecutive days rotate", () => {
        expect(nudgeForDate(new Date("2026-09-24T06:00:00Z"))).toBe(nudgeForDate(new Date("2026-09-24T20:00:00Z")))
        expect(nudgeForDate(new Date("2026-09-24T12:00:00Z"))).not.toBe(nudgeForDate(new Date("2026-09-25T12:00:00Z")))
        // 22:30 UTC is already the next day in Athens.
        expect(athensDate(new Date("2026-09-24T22:30:00Z"))).toBe("2026-09-25")
    })
    it("every nudge has Greek and English text, and none makes a medical claim", () => {
        const medical = /(διάγνωσ|θεραπε|φάρμακ|εξέτασ|γιατρ|νόσ|diagnos|treat|medic|disease|doctor|screening)/i
        for (const id of NUDGE_IDS) {
            const g = (el.wellness.nudges as Record<string, string>)[id]
            const e = (en.wellness.nudges as Record<string, string>)[id]
            expect(g, id).toBeTruthy()
            expect(e, id).toBeTruthy()
            expect(medical.test(g) || medical.test(e), id).toBe(false)
        }
    })
    it("the catalogue reads no personal input (source has no age/sex/answers/policy)", () => {
        const src = readFileSync("lib/wellness/nudges.ts", "utf-8").replace(/\/\*[\s\S]*?\*\//g, "")
        expect(src).not.toMatch(/ageBand|\bsex\b|answers|acordData|policy/i)
    })
})

describe("health share snapshot — minimised by construction (P2)", () => {
    const assessment = { createdAt: new Date("2026-09-20T10:00:00Z"), scores: [{ category: "cardiovascular", score: 40, band: "moderate", checks: ["lipid_panel"] }] as any }
    const profile = { smokingStatus: "former", activityLevel: "low", chronicConditions: ["diabetes"], familyMedicalHistory: ["heart_disease", 3], heightCm: 180, weightKg: 90 }
    it("assessment scope carries scores and date — no checks, no answers", () => {
        const s = buildHealthSnapshot("assessment", assessment, profile)
        expect(s.profile).toBeUndefined()
        expect(s.assessment?.scores).toEqual([{ category: "cardiovascular", score: 40, band: "moderate" }])
        expect(JSON.stringify(s)).not.toMatch(/checks|lipid|answers/)
    })
    it("profile scope carries a BMI band — never height or weight", () => {
        const s = buildHealthSnapshot("profile", assessment, profile)
        expect(s.assessment).toBeUndefined()
        expect(s.profile).toEqual({ smokingStatus: "former", activityLevel: "low", chronicConditions: ["diabetes"], familyMedicalHistory: ["heart_disease"], bmiBand: "over" })
        expect(JSON.stringify(s)).not.toMatch(/height|weight|180|90/)
    })
    it("bmi bands, and nonsense input gives no band", () => {
        expect(bmiBand(170, 50)).toBe("under")
        expect(bmiBand(170, 65)).toBe("normal")
        expect(bmiBand(170, 110)).toBe("obese")
        expect(bmiBand(null, 70)).toBeNull()
        expect(bmiBand(5, 70)).toBeNull()
    })
})

describe("check-up terms (richer extraction, 2026-09-24)", () => {
    const withTerms = (checkup: Record<string, unknown>, sources: Record<string, unknown> = {}) =>
        policy({ annualCheckupIncluded: true, checkup }, { extraction: { sources: { "acordData.health.annualCheckupIncluded": { page: 3, snippet: "x", verified: true }, ...sources } } })

    it("lists only stated terms, in a fixed order, each with its own evidence", () => {
        const r = resolveCheckupBenefit(withTerms(
            { limitAmount: 150, frequency: "μία φορά ανά ασφαλιστικό έτος", tests: ["γενική αίματος", "XXXX", "σάκχαρο"], network: "" },
            { "acordData.health.checkup.frequency": { page: 5, snippet: "μία φορά ανά ασφαλιστικό έτος", verified: true } }
        ), null, NOW)
        expect(r.details.map((d) => d.key)).toEqual(["frequency", "limitAmount", "tests"])
        expect(r.details[0]).toEqual({ key: "frequency", value: "μία φορά ανά ασφαλιστικό έτος", verified: true, page: 5 })
        expect(r.details[1]).toEqual({ key: "limitAmount", value: 150, verified: false })
        expect(r.details[2].value).toEqual(["γενική αίματος", "σάκχαρο"])
        expect(r.coreTermsMissing).toBe(false)
    })
    it("frequency without a cap (or the reverse) still says the rest needs confirmation", () => {
        expect(resolveCheckupBenefit(withTerms({ frequency: "ετησίως" }), null, NOW).coreTermsMissing).toBe(true)
        expect(resolveCheckupBenefit(withTerms({ limitAmount: 100 }), null, NOW).coreTermsMissing).toBe(true)
        expect(resolveCheckupBenefit(withTerms({ frequency: "ετησίως", limitAmount: 100 }), null, NOW).coreTermsMissing).toBe(false)
    })
    it("nonsense numbers and masks are not terms", () => {
        const r = resolveCheckupBenefit(withTerms({ limitAmount: 0, waitingPeriodDays: Number.NaN, network: "????" }), null, NOW)
        expect(r.details).toEqual([])
        expect(r.coreTermsMissing).toBe(true)
    })
    it("the schema accepts the terms and the citation list includes them", async () => {
        const { AcordDataSchema } = await import("@/lib/schemas/acord-data")
        const { CITATION_FIELDS } = await import("@/lib/services/ai/extraction-citations")
        const parsed = AcordDataSchema.safeParse({ health: { annualCheckupIncluded: true, checkup: { frequency: "ετησίως", limitAmount: 150, tests: ["ΓΕΝ"], waitingPeriodDays: 90 } } })
        expect(parsed.success).toBe(true)
        for (const k of ["frequency", "limitAmount", "tests", "network", "waitingPeriodDays", "conditions"]) {
            expect(CITATION_FIELDS).toContain(`acordData.health.checkup.${k}`)
        }
        expect(CITATION_FIELDS).toContain("acordData.health.annualCheckupIncluded")
    })
})

describe("eval-checkup-extraction — scoring rule", () => {
    it("a value where the human read nothing is INVENTED; silence both sides is absent", async () => {
        const { compareTerm } = await import("../../scripts/eval-checkup-extraction")
        expect(compareTerm(undefined, "ετησίως")).toBe("invented")
        expect(compareTerm(undefined, undefined)).toBe("absent")
        expect(compareTerm(150, undefined)).toBe("missed")
        expect(compareTerm("Μία φορά  ετησίως", "μία φορά ετησίως")).toBe("match")
        expect(compareTerm(150, 200)).toBe("differs")
        expect(compareTerm([], ["x"])).toBe("invented")
    })
})
