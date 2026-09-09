import { beforeEach, describe, expect, it, vi } from "vitest"

const dbMock = vi.hoisted(() => ({
    user: { findUnique: vi.fn() },
    invite: { findFirst: vi.fn() },
    featureFlag: { findMany: vi.fn() },
}))
vi.mock("@/lib/db", () => ({ db: dbMock }))

import { registrationsOpen, signupAllowedFor, hasOpenInvite } from "@/lib/auth/registration-gate"

/**
 * The registration kill-switch, asserted on the two things that actually decide
 * whether a person can get an account: the spelling of ALLOW_REGISTRATIONS, and
 * whether the address was invited.
 *
 * The env spellings are not cosmetic. The owner set this variable to the word
 * "NO", the flag layer's parser is the thing that has to understand that, and a
 * value it does NOT understand has to leave signup OPEN — a gate that reads a
 * typo as "closed" takes the product's front door offline with no error
 * anywhere.
 */
describe("ALLOW_REGISTRATIONS", () => {
    beforeEach(() => {
        vi.unstubAllEnvs()
        dbMock.user.findUnique.mockReset().mockResolvedValue(null)
        dbMock.invite.findFirst.mockReset().mockResolvedValue(null)
        dbMock.featureFlag.findMany.mockReset().mockResolvedValue([])
    })

    it("reads the YES/NO the operator actually typed", async () => {
        vi.stubEnv("ALLOW_REGISTRATIONS", "NO")
        expect(await registrationsOpen()).toBe(false)

        vi.stubEnv("ALLOW_REGISTRATIONS", "no")
        expect(await registrationsOpen()).toBe(false)

        vi.stubEnv("ALLOW_REGISTRATIONS", "YES")
        expect(await registrationsOpen()).toBe(true)
    })

    it("lets an admin-console override close it without a redeploy", async () => {
        vi.stubEnv("ALLOW_REGISTRATIONS", "YES")
        dbMock.featureFlag.findMany.mockResolvedValue([
            { key: "auth.allow_registrations", enabled: false, rollout: null, notes: "launch pause" },
        ])
        expect(await registrationsOpen()).toBe(false)
    })

    it("stays OPEN when unset, blank, or misspelt", async () => {
        vi.stubEnv("ALLOW_REGISTRATIONS", "")
        expect(await registrationsOpen()).toBe(true)

        // The failure that matters: a typo must not close the front door.
        vi.stubEnv("ALLOW_REGISTRATIONS", "Nope")
        expect(await registrationsOpen()).toBe(true)

        vi.stubEnv("ALLOW_REGISTRATIONS", "NOT_A_VALUE")
        expect(await registrationsOpen()).toBe(true)
    })
})

describe("signupAllowedFor", () => {
    beforeEach(() => {
        vi.unstubAllEnvs()
        dbMock.user.findUnique.mockReset().mockResolvedValue(null)
        dbMock.invite.findFirst.mockReset().mockResolvedValue(null)
        dbMock.featureFlag.findMany.mockReset().mockResolvedValue([])
    })

    it("lets anyone through while registrations are open, without a query", async () => {
        vi.stubEnv("ALLOW_REGISTRATIONS", "YES")
        expect(await signupAllowedFor("stranger@example.com")).toBe(true)
        expect(dbMock.user.findUnique).not.toHaveBeenCalled()
        expect(dbMock.invite.findFirst).not.toHaveBeenCalled()
    })

    it("refuses a stranger while registrations are closed", async () => {
        vi.stubEnv("ALLOW_REGISTRATIONS", "NO")
        expect(await signupAllowedFor("stranger@example.com")).toBe(false)
    })

    it("exempts an agent-created phantom row — activation is not a new signup", async () => {
        vi.stubEnv("ALLOW_REGISTRATIONS", "NO")
        dbMock.user.findUnique.mockResolvedValue({ id: "u1" })
        expect(await signupAllowedFor("invited@example.com")).toBe(true)
    })

    it("exempts an address a live invite names", async () => {
        vi.stubEnv("ALLOW_REGISTRATIONS", "NO")
        dbMock.invite.findFirst.mockResolvedValue({ id: "i1" })
        expect(await signupAllowedFor("invited@example.com")).toBe(true)
    })

    it("matches the invite on the normalised address, and only a spendable one", async () => {
        vi.stubEnv("ALLOW_REGISTRATIONS", "NO")
        await signupAllowedFor("  Invited@Example.COM ")

        const where = dbMock.invite.findFirst.mock.calls[0][0].where
        expect(where.inviteeEmail).toBe("invited@example.com")
        // Consumed or expired is not an exemption — otherwise a spent invite
        // would be a permanent standing key to a closed product.
        expect(where.consumedAt).toBeNull()
        expect(where.expiresAt.gt).toBeInstanceOf(Date)
    })

    it("refuses an address that is not an address", async () => {
        vi.stubEnv("ALLOW_REGISTRATIONS", "NO")
        expect(await signupAllowedFor("")).toBe(false)
        expect(await hasOpenInvite("")).toBe(false)
    })
})
