/**
 * In-process provider circuit breaker state machine.
 *
 * Pins: trips open only after N consecutive tripping-class failures, only
 * transient/auth failures count, a success resets, the cooldown re-opens to
 * half-open (one probe), and healthyFirst reorders without dropping providers.
 */

import { describe, it, expect, beforeEach } from "vitest"
import {
    recordFailure,
    recordSuccess,
    isHealthy,
    healthyFirst,
    __setClock,
    __reset,
    type ProviderId,
} from "@/lib/services/ai/provider-health"

let clock = 0
beforeEach(() => {
    __reset()
    clock = 1_000_000
    __setClock(() => clock)
})

describe("provider-health breaker", () => {
    it("stays healthy below the consecutive-failure threshold", () => {
        recordFailure("gemini", "transient")
        recordFailure("gemini", "transient")
        expect(isHealthy("gemini")).toBe(true)
    })

    it("opens after 3 consecutive transient failures", () => {
        for (let i = 0; i < 3; i++) recordFailure("gemini", "transient")
        expect(isHealthy("gemini")).toBe(false)
    })

    it("only trips on transient/auth failures, not request-fault classes", () => {
        // The breaker signature only accepts transient|auth; assert non-tripping
        // classes passed via a cast are ignored (defensive — callers shouldn't).
        for (let i = 0; i < 5; i++) recordFailure("openai", "schema" as unknown as "transient")
        expect(isHealthy("openai")).toBe(true)
    })

    it("a success closes the breaker and resets the count", () => {
        for (let i = 0; i < 3; i++) recordFailure("anthropic", "transient")
        expect(isHealthy("anthropic")).toBe(false)
        recordSuccess("anthropic")
        expect(isHealthy("anthropic")).toBe(true)
    })

    it("re-opens to half-open after the cooldown (one probe)", () => {
        for (let i = 0; i < 3; i++) recordFailure("gemini", "auth")
        expect(isHealthy("gemini")).toBe(false)
        clock += 60_000 // cooldown elapsed
        expect(isHealthy("gemini")).toBe(true) // half-open probe allowed
    })

    it("healthyFirst pushes unhealthy providers to the back without dropping any", () => {
        for (let i = 0; i < 3; i++) recordFailure("gemini", "transient")
        const order: ProviderId[] = ["gemini", "anthropic", "openai"]
        const reordered = healthyFirst(order)
        expect(reordered).toHaveLength(3)
        expect(reordered).toContain("gemini")
        expect(reordered[reordered.length - 1]).toBe("gemini") // unhealthy last
    })
})
