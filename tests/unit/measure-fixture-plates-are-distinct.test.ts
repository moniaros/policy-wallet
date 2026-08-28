/**
 * Every motor fixture must carry its OWN plate — except the one pair that is
 * meant to collide visually.
 *
 * The measurement fixtures gave all thirteen motor policies «ΙΚΖ-4821», so the
 * wallet was asked to tell apart thirteen copies of one car. P5-wallet-01's
 * acceptance — "motor, property, pet duplicates = 0" — could not be met by that
 * fixture however correct the product was, which made the target unfalsifiable
 * from two directions at once: the metric did not read the plate
 * (`tests/measure/metrics.ts`, fixed separately) and the fixture had only one.
 *
 * `motorPlate` is deterministic so captures stay reproducible. Deterministic is
 * not the same as distinct — a hash can collide — so the universe is ENUMERATED
 * from the exported spec lists and the result asserted, rather than assumed.
 */
import { describe, expect, it } from "vitest"
import {
    FIXTURE_SPECS,
    DEFECT_SPECS,
    FREE_SPECS,
    motorPlate,
    type FixtureSpec,
} from "../measure/fixtures"

const MOTOR: FixtureSpec[] = [...FIXTURE_SPECS, ...DEFECT_SPECS, ...FREE_SPECS].filter(
    (s) => s.lineOfBusiness === "motor"
)

/** «ΙΚΖ» (Greek) and «IKZ» (Latin) render the same; this is the deliberate pair. */
const HOMOGLYPH = new Set(["ΙΚΖ-4821", "IKZ-4821"])

describe("measurement fixtures give each motor policy its own plate", () => {
    it("the scan actually sees the motor fixtures", () => {
        // A guard whose universe empties passes for ever. Thirteen motor rows
        // were what made this a problem.
        expect(MOTOR.length).toBeGreaterThanOrEqual(8)
    })

    it("no two motor fixtures share a plate", () => {
        const byPlate = new Map<string, string[]>()
        for (const s of MOTOR) {
            const plate = motorPlate(s)
            byPlate.set(plate, [...(byPlate.get(plate) || []), s.key])
        }
        const collisions = [...byPlate.entries()].filter(([, keys]) => keys.length > 1)
        expect(
            collisions,
            `these fixtures share a plate, so the wallet cannot tell their rows apart:\n` +
                collisions.map(([p, k]) => `  ${p}: ${k.join(", ")}`).join("\n")
        ).toEqual([])
    })

    it("keeps the Greek/Latin homoglyph pair — two vehicles that LOOK identical", () => {
        // assetIdentityKey deliberately never folds one alphabet into the other,
        // because two different registrations can produce this pair. The wallet
        // must render both rows unmerged and log the near-miss, and that path
        // stays exercised only while the fixture actually contains the pair.
        const plates = MOTOR.map(motorPlate)
        for (const half of HOMOGLYPH) {
            expect.soft(plates, `${half} must be present`).toContain(half)
        }
        // ...and they must be different STRINGS, or nothing is being tested.
        expect("ΙΚΖ-4821").not.toBe("IKZ-4821")
    })

    it("is deterministic — a capture must be reproducible run to run", () => {
        for (const s of MOTOR) expect(motorPlate(s)).toBe(motorPlate(s))
    })

    it("emits plausible Greek plates: three letters, four digits", () => {
        for (const s of MOTOR) {
            expect.soft(motorPlate(s), s.key).toMatch(/^[Α-ΩA-Z]{3}-\d{4}$/)
        }
    })
})
