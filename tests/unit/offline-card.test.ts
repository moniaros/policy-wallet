import { describe, it, expect } from "vitest"
import { offlineCardRows } from "@/lib/wallet/offline-card"

/** Spec v2 §18.1: only numbers the policy's own reading states, labelled by purpose; masks refused. */
describe("offlineCardRows", () => {
    const base = { insurerName: "Εθνική", endDate: new Date("2027-03-01T00:00:00Z") }
    it("collects every stated phone with its purpose", () => {
        const rows = offlineCardRows([{ id: "m1", lineOfBusiness: "motor", ...base, acordData: { vehicle: { accidentDeclarationPhone: "210 100 0000", roadsideAssistancePhone: "1158" } } }])
        expect(rows).toHaveLength(1)
        expect(rows[0].phones.map((p) => p.kind)).toEqual(["accident", "roadside"])
        expect(rows[0].endDate).toBe("2027-03-01")
    })
    it("drops a policy with no stated number and a masked one", () => {
        expect(offlineCardRows([{ id: "h1", lineOfBusiness: "home", ...base, acordData: { property: {} } }])).toEqual([])
        expect(offlineCardRows([{ id: "h2", lineOfBusiness: "health", ...base, acordData: { health: { coordinationCentre: { phone: "XXXX" } } } }])).toEqual([])
    })
    it("reads the legacy motor alias too", () => {
        const rows = offlineCardRows([{ id: "m2", lineOfBusiness: "motor", ...base, acordData: { motor: { roadsideAssistancePhone: "1158" } } }])
        expect(rows[0].phones).toEqual([{ kind: "roadside", number: "1158" }])
    })
    it("uses the insurer's verified call centre only when the document states no number", () => {
        const fallback = () => ({ phone: "+30 210 909 9000" })
        const silent = offlineCardRows([{ id: "h3", lineOfBusiness: "health", ...base, acordData: { health: {} } }], fallback)
        expect(silent[0].phones).toEqual([{ kind: "insurer", number: "+30 210 909 9000" }])
        const stated = offlineCardRows([{ id: "m3", lineOfBusiness: "motor", ...base, acordData: { vehicle: { roadsideAssistancePhone: "1158" } } }], fallback)
        expect(stated[0].phones).toEqual([{ kind: "roadside", number: "1158" }])
        expect(offlineCardRows([{ id: "h4", lineOfBusiness: "health", ...base, acordData: {} }], () => null)).toEqual([])
    })
})
