import { describe, expect, it } from "vitest"
import { flowReducer, initialFlowState } from "@/lib/onboarding/protection-profile/reducer"

describe("protection-profile flow reducer", () => {
    it("answer → saved moves forward and keeps the answer; back returns without losing it", () => {
        let s = initialFlowState("intent", 1000)
        s = flowReducer(s, { type: "answer", step: "intent", value: { intent: "find_gaps" } })
        s = flowReducer(s, { type: "saving" })
        expect(s.status).toBe("saving")
        s = flowReducer(s, { type: "saved", step: "intent", answeredSteps: ["intent"], next: "people", now: 2000 })
        expect(s.current).toBe("people")
        expect(s.visited).toEqual(["intent", "people"])
        expect(s.enteredAt).toBe(2000)
        s = flowReducer(s, { type: "back", now: 3000 })
        expect(s.current).toBe("intent")
        expect(s.answers.intent).toEqual({ intent: "find_gaps" })
        expect(s.direction).toBe(-1)
    })

    it("a failed save keeps the answer selected and reports the error", () => {
        let s = initialFlowState("home")
        s = flowReducer(s, { type: "answer", step: "home", value: { home: "rented" } })
        s = flowReducer(s, { type: "failed", errorCode: "failed" })
        expect(s.status).toBe("error")
        expect(s.answers.home).toEqual({ home: "rented" })
    })

    it("back on the first screen is a no-op", () => {
        const s = initialFlowState("intent")
        expect(flowReducer(s, { type: "back" })).toBe(s)
    })

    it("restore seeds the visited path so back works after a refresh", () => {
        const s = flowReducer(initialFlowState("intent"), {
            type: "restore",
            current: "income",
            answers: { intent: { intent: "organise" }, people: { people: ["only_me"] }, home: { home: "owned" } },
            answeredSteps: ["intent", "people", "home"],
            unsureSteps: [],
        })
        expect(s.current).toBe("income")
        expect(s.visited).toEqual(["intent", "people", "home", "income"])
        expect(flowReducer(s, { type: "back" }).current).toBe("home")
    })

    it("«Κρατήσαμε τις απαντήσεις σου» is said only on the screen a restore with answers landed on — never after in-flow navigation", () => {
        // A fresh start: nothing to keep, nothing to say.
        expect(initialFlowState("intent").resumed).toBe(false)
        const fresh = flowReducer(initialFlowState("intent"), { type: "restore", current: "intent", answers: {}, answeredSteps: [], unsureSteps: [] })
        expect(fresh.resumed).toBe(false)

        // A page load onto a flow in progress: the answers came back, say so.
        let s = flowReducer(initialFlowState("intent"), {
            type: "restore",
            current: "home",
            answers: { intent: { intent: "organise" }, people: { people: ["only_me"] } },
            answeredSteps: ["intent", "people"],
            unsureSteps: [],
        })
        expect(s.resumed).toBe(true)
        // Staying on the screen keeps it: drafting, saving, a failed save.
        s = flowReducer(s, { type: "answer", step: "home", value: { home: "rented" } })
        s = flowReducer(s, { type: "saving" })
        s = flowReducer(s, { type: "failed", errorCode: "failed" })
        expect(s.resumed).toBe(true)

        // Any navigation clears it: «Πίσω»…
        expect(flowReducer(s, { type: "back" }).resumed).toBe(false)
        // …moving on after a save…
        expect(flowReducer(s, { type: "saved", step: "home", answeredSteps: ["intent", "people", "home"], next: "income" }).resumed).toBe(false)
        // …and a jump into the tail.
        expect(flowReducer(s, { type: "goto", step: "map" }).resumed).toBe(false)
        // And it does not come back on the way forward again.
        const after = flowReducer(flowReducer(s, { type: "back" }), { type: "saved", step: "people", answeredSteps: ["intent", "people"], next: "home" })
        expect(after.resumed).toBe(false)
    })

    it("an unsure answer is remembered as such and cleared when answered properly", () => {
        let s = initialFlowState("people")
        s = flowReducer(s, { type: "answer", step: "people", value: { unsure: true }, unsure: true })
        expect(s.unsureSteps).toEqual(["people"])
        s = flowReducer(s, { type: "answer", step: "people", value: { people: ["only_me"] } })
        expect(s.unsureSteps).toEqual([])
    })
})
