import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { globSync } from "glob"

import { evaluateAcordFieldCheck, DEFAULT_DRIFT_THRESHOLD_PCT } from "@/lib/gap-detection"

/**
 * Insured-value adequacy: a sum insured that has drifted from the value the
 * policy itself declares.
 *
 * Both directions matter and they are not symmetrical. Over-insurance wastes
 * premium; under-insurance triggers the proportional-payout term (όρος
 * αναλογίας) and pays out less than the loss, which is the one the customer
 * discovers at the worst possible moment.
 *
 * The reference is always a figure ON THE DOCUMENT. There is deliberately no
 * depreciation curve and no market lookup: this check must be able to say
 * where its number came from.
 */
const motorOverInsuredRule = {
    type: "acord_field_check",
    field: "vehicle.insuredValue",
    referenceField: "vehicle.estimatedMarketValue",
    operator: "value_drift",
    direction: "above",
    thresholdPct: 20,
}

const propertyUnderInsuredRule = {
    type: "acord_field_check",
    field: "property.insuredValue",
    referenceField: "property.estimatedRebuildCost",
    operator: "value_drift",
    direction: "below",
    thresholdPct: 20,
}

describe("value_drift fires on real drift and stays quiet otherwise", () => {
    it("flags a ten-year-old car still insured near list price", () => {
        // Declared market value 6,000; still insured for 15,000 → +150%.
        const acord = {
            vehicle: { year: 2016, make: "Toyota", insuredValue: 15000, estimatedMarketValue: 6000 },
        }
        expect(evaluateAcordFieldCheck(acord, motorOverInsuredRule)).toBe(true)
    })

    it("stays silent inside the band", () => {
        // 10% over — a rounded sum insured, not a finding.
        const acord = {
            policy: { sumInsured: 11000 },
            vehicle: { estimatedMarketValue: 10000 },
        }
        expect(evaluateAcordFieldCheck(acord, motorOverInsuredRule)).toBe(false)
    })

    it("does not fire in the wrong direction", () => {
        // Under-insured by 50%, but this rule watches for OVER-insurance.
        const acord = {
            policy: { sumInsured: 5000 },
            vehicle: { estimatedMarketValue: 10000 },
        }
        expect(evaluateAcordFieldCheck(acord, motorOverInsuredRule)).toBe(false)
    })

    it("flags a home insured below its stated rebuild cost", () => {
        const acord = {
            property: { insuredValue: 90000, estimatedRebuildCost: 200000, squareMeters: 95 },
        }
        expect(evaluateAcordFieldCheck(acord, propertyUnderInsuredRule)).toBe(true)
    })

    it("treats unknown as unknown, never as drift", () => {
        // The extractor is silent about most fields. A missing reference must
        // not become "your sum insured is wrong" — the same rule the rest of
        // this engine follows for is_false.
        for (const acord of [
            { vehicle: { insuredValue: 15000 } },
            { vehicle: { estimatedMarketValue: 6000 } },
            { vehicle: { insuredValue: 15000, estimatedMarketValue: 0 } },
            { vehicle: { insuredValue: 15000, estimatedMarketValue: null } },
            {},
        ]) {
            expect(evaluateAcordFieldCheck(acord, motorOverInsuredRule)).toBe(false)
        }
    })

    it("defaults to a named threshold rather than a literal", () => {
        expect(DEFAULT_DRIFT_THRESHOLD_PCT).toBe(20)
        const noThreshold = { ...motorOverInsuredRule, thresholdPct: undefined }
        expect(
            evaluateAcordFieldCheck(
                { vehicle: { insuredValue: 13000, estimatedMarketValue: 10000 } },
                noThreshold
            )
        ).toBe(true)
        expect(
            evaluateAcordFieldCheck(
                { vehicle: { insuredValue: 11000, estimatedMarketValue: 10000 } },
                noThreshold
            )
        ).toBe(false)
    })
})

describe("the wording stays a prompt to review, never advice to act", () => {
    // IDD: PolicyWallet is not an intermediary giving advice. "Reduce your
    // cover" or "you will save €N" is a recommendation; "this is worth
    // discussing at renewal" is an observation. The distinction is the
    // product's whole legal posture, so it is enforced over the repo rather
    // than trusted to whoever writes the next definition.
    // Directives, not topics. An earlier draft banned /switch insurer/ and
    // caught two innocents: "we earn nothing if you switch insurer" (a
    // NEUTRALITY statement — the opposite of advice) and an FAQ heading "Can I
    // switch insurers at renewal?". What is forbidden is telling the customer
    // what to do, and a promise about money.
    const FORBIDDEN = [
        /μειώστε (την κάλυψη|το ασφάλιστρο|το ποσό)/i,
        /αλλάξτε ασφαλιστική/i,
        /θα εξοικονομήσετε/i,
        /σας προτείνουμε να (αλλάξετε|μειώσετε|ακυρώσετε)/i,
        /reduce your (cover|sum insured|premium)/i,
        /you (will|would) save €?\d/i,
        /you should switch/i,
        /we recommend (you|that you) (switch|reduce|cancel)/i,
    ]

    it("no advice phrasing appears in gap or analysis copy", () => {
        const files = globSync("{lib,components,app}/**/*.{ts,tsx}", {
            ignore: ["**/node_modules/**"],
        })
        const offenders: string[] = []
        for (const file of files) {
            const src = readFileSync(file, "utf-8")
            for (const pattern of FORBIDDEN) {
                if (pattern.test(src)) offenders.push(`${file} :: ${pattern}`)
            }
        }
        expect(
            offenders,
            "These phrase a finding as advice to act. PolicyWallet observes; an\n" +
                "underwriter or a licensed intermediary advises:\n  " + offenders.join("\n  ")
        ).toEqual([])
    })
})
