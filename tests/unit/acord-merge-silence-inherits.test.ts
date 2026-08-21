import { describe, it, expect } from "vitest"
import { mergeAcordData } from "@/lib/services/acord-merge"

/**
 * A renewal notice states the premium and the period and says nothing else.
 * That silence must inherit the original contract's terms, not erase them.
 */
describe("a later document overrides explicitly and inherits on silence", () => {
    const originalContract = {
        policy: { sumInsured: 15000, premium: { amount: 420 } },
        vehicle: {
            make: "Toyota",
            model: "Yaris",
            year: 2016,
            ownVehicleDamage: true,
            glassBreakage: true,
            greenCardExpiryDate: "2026-09-30",
            estimatedMarketValue: 9000,
        },
    }

    it("keeps every base term a renewal does not mention", () => {
        // What an ανανεωτήριο actually carries: a new premium, a new value.
        const renewalNotice = {
            policy: { premium: { amount: 465 } },
            vehicle: { estimatedMarketValue: 6000 },
        }

        const merged = mergeAcordData(originalContract, renewalNotice) as any

        // The shallow spread this replaces returned `vehicle: { estimatedMarketValue: 6000 }`
        // and lost all five of these.
        expect(merged.vehicle.make).toBe("Toyota")
        expect(merged.vehicle.model).toBe("Yaris")
        expect(merged.vehicle.ownVehicleDamage).toBe(true)
        expect(merged.vehicle.glassBreakage).toBe(true)
        expect(merged.vehicle.greenCardExpiryDate).toBe("2026-09-30")

        // ...while the renewal's explicit statements win.
        expect(merged.vehicle.estimatedMarketValue).toBe(6000)
        expect(merged.policy.premium.amount).toBe(465)

        // And a nested sibling the renewal never mentioned survives.
        expect(merged.policy.sumInsured).toBe(15000)
    })

    it("lets a renewal explicitly remove cover", () => {
        // `false` is a statement, not silence: the renewal says own-damage is gone.
        const merged = mergeAcordData(originalContract, {
            vehicle: { ownVehicleDamage: false },
        }) as any
        expect(merged.vehicle.ownVehicleDamage).toBe(false)
        expect(merged.vehicle.glassBreakage).toBe(true)
    })

    it("treats null and undefined as silence, not as removal", () => {
        const merged = mergeAcordData(originalContract, {
            vehicle: { make: null, model: undefined, year: 2016 },
        }) as any
        expect(merged.vehicle.make).toBe("Toyota")
        expect(merged.vehicle.model).toBe("Yaris")
    })

    it("replaces arrays wholesale rather than concatenating", () => {
        // A renewal listing drivers restates the whole list; merging item-wise
        // would resurrect a driver the renewal dropped.
        const merged = mergeAcordData(
            { vehicle: { namedDrivers: [{ name: "A" }, { name: "B" }] } },
            { vehicle: { namedDrivers: [{ name: "A" }] } }
        ) as any
        expect(merged.vehicle.namedDrivers).toEqual([{ name: "A" }])
    })

    it("survives missing or malformed sides", () => {
        expect(mergeAcordData(null, { a: 1 })).toEqual({ a: 1 })
        expect(mergeAcordData({ a: 1 }, null)).toEqual({ a: 1 })
        expect(mergeAcordData(null, null)).toEqual({})
    })

    it("does not mutate either input", () => {
        const base = { vehicle: { make: "Toyota" } }
        const incoming = { vehicle: { model: "Yaris" } }
        mergeAcordData(base, incoming)
        expect(base).toEqual({ vehicle: { make: "Toyota" } })
        expect(incoming).toEqual({ vehicle: { model: "Yaris" } })
    })
})
