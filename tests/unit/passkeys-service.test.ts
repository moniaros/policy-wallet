import { beforeEach, describe, expect, it, vi } from "vitest"

const dbMock = vi.hoisted(() => ({
    passkeyCredential: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), deleteMany: vi.fn(), count: vi.fn() },
    webAuthnChallenge: { upsert: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
}))
vi.mock("@/lib/db", () => ({ db: dbMock }))

const admin = vi.hoisted(() => ({
    getUserById: vi.fn(async () => ({ data: { user: { app_metadata: { role: "policyholder" } } } })),
    updateUserById: vi.fn(async () => ({ error: null })),
}))
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ auth: { admin } }) }))

const webauthn = vi.hoisted(() => ({
    generateRegistrationOptions: vi.fn(async (o: any) => ({ challenge: "reg-challenge", rp: { id: o.rpID }, excludeCredentials: o.excludeCredentials })),
    verifyRegistrationResponse: vi.fn(),
    generateAuthenticationOptions: vi.fn(async (o: any) => ({ challenge: "auth-challenge", allowCredentials: o.allowCredentials })),
    verifyAuthenticationResponse: vi.fn(),
}))
vi.mock("@simplewebauthn/server", () => webauthn)

import {
    CHALLENGE_TTL_MS,
    PASSKEY_CLAIM,
    authenticationOptions,
    passkeysEnabled,
    registrationOptions,
    relyingParty,
    removePasskey,
    verifyAuthentication,
    verifyRegistration,
} from "@/lib/auth/passkeys"

/**
 * PW-PROVENANCE-01 R-01. The ceremony's cryptography is the library's; what is
 * ours — and pinned here — is the state machine around it: one challenge per
 * user, consumed once; a credential stored and looked up under ITS user; the
 * claim the proxy reads rewritten from the table on every change.
 */

const USER = { id: "db-user-1", supabaseUserId: "sb-user-1" }
const live = () => ({ userId: USER.id, challenge: "reg-challenge", expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS) })

beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXTAUTH_URL = "https://www.policywallet.gr"
    dbMock.passkeyCredential.findMany.mockResolvedValue([])
    dbMock.passkeyCredential.count.mockResolvedValue(1)
    dbMock.webAuthnChallenge.delete.mockResolvedValue({})
})

describe("the flag and the relying party", () => {
    it("is off unless PASSKEYS_ENABLED is exactly '1'", () => {
        delete process.env.PASSKEYS_ENABLED
        expect(passkeysEnabled()).toBe(false)
        process.env.PASSKEYS_ENABLED = "true"
        expect(passkeysEnabled()).toBe(false)
        process.env.PASSKEYS_ENABLED = "1"
        expect(passkeysEnabled()).toBe(true)
        delete process.env.PASSKEYS_ENABLED
    })

    it("derives the RP id and origin from the deployment's own URL", () => {
        expect(relyingParty()).toEqual({ rpID: "www.policywallet.gr", origin: "https://www.policywallet.gr" })
    })
})

describe("enrolment", () => {
    it("stores one challenge per user and excludes the credentials already enrolled", async () => {
        dbMock.passkeyCredential.findMany.mockResolvedValue([{ credentialID: "cred-a", transports: "internal,hybrid" }])
        const options = await registrationOptions({ id: USER.id, email: "u@example.com" })
        expect(options.challenge).toBe("reg-challenge")
        expect(webauthn.generateRegistrationOptions).toHaveBeenCalledWith(
            expect.objectContaining({ rpID: "www.policywallet.gr", userName: "u@example.com", excludeCredentials: [{ id: "cred-a", transports: ["internal", "hybrid"] }] })
        )
        expect(dbMock.webAuthnChallenge.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: USER.id } }))
    })

    it("refuses without a live challenge, and consumes the challenge whether or not verification succeeds", async () => {
        dbMock.webAuthnChallenge.findUnique.mockResolvedValue(null)
        expect(await verifyRegistration(USER, {} as any)).toEqual({ ok: false, reason: "no_challenge" })
        const expired = { ...live(), expiresAt: new Date(Date.now() - 1) }
        dbMock.webAuthnChallenge.findUnique.mockResolvedValue(expired)
        expect(await verifyRegistration(USER, {} as any)).toEqual({ ok: false, reason: "no_challenge" })
        expect(dbMock.webAuthnChallenge.delete).toHaveBeenCalledTimes(1)
        dbMock.webAuthnChallenge.findUnique.mockResolvedValue(live())
        webauthn.verifyRegistrationResponse.mockResolvedValue({ verified: false })
        expect(await verifyRegistration(USER, {} as any)).toEqual({ ok: false, reason: "not_verified" })
        expect(dbMock.passkeyCredential.create).not.toHaveBeenCalled()
    })

    it("stores the verified credential under its user and writes the claim from the table's count", async () => {
        dbMock.webAuthnChallenge.findUnique.mockResolvedValue(live())
        webauthn.verifyRegistrationResponse.mockResolvedValue({
            verified: true,
            registrationInfo: { credential: { id: "cred-new", publicKey: new Uint8Array([1, 2, 3]), counter: 0, transports: ["internal"] } },
        })
        dbMock.passkeyCredential.create.mockResolvedValue({ id: "row-1" })
        dbMock.passkeyCredential.count.mockResolvedValue(2)
        const out = await verifyRegistration(USER, {} as any)
        expect(out).toEqual({ ok: true, id: "row-1", count: 2 })
        expect(webauthn.verifyRegistrationResponse).toHaveBeenCalledWith(
            expect.objectContaining({ expectedChallenge: "reg-challenge", expectedOrigin: "https://www.policywallet.gr", expectedRPID: "www.policywallet.gr" })
        )
        expect(dbMock.passkeyCredential.create).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ userId: USER.id, credentialID: "cred-new", counter: BigInt(0), transports: "internal" }) })
        )
        expect(admin.updateUserById).toHaveBeenCalledWith(USER.supabaseUserId, { app_metadata: { role: "policyholder", [PASSKEY_CLAIM]: 2 } })
    })
})

describe("the step-up ceremony", () => {
    it("offers no challenge to a user with no passkey", async () => {
        expect(await authenticationOptions(USER.id)).toBeNull()
        expect(dbMock.webAuthnChallenge.upsert).not.toHaveBeenCalled()
    })

    it("restricts the challenge to the user's own credentials", async () => {
        dbMock.passkeyCredential.findMany.mockResolvedValue([{ credentialID: "cred-a", transports: null }])
        const options = await authenticationOptions(USER.id)
        expect(options?.allowCredentials).toEqual([{ id: "cred-a", transports: [] }])
        expect(dbMock.webAuthnChallenge.upsert).toHaveBeenCalledTimes(1)
    })

    it("a valid assertion for a credential that is not THIS user's is refused before the library is asked", async () => {
        dbMock.webAuthnChallenge.findUnique.mockResolvedValue({ ...live(), challenge: "auth-challenge" })
        dbMock.passkeyCredential.findFirst.mockResolvedValue(null)
        expect(await verifyAuthentication(USER.id, { id: "someone-elses" } as any)).toEqual({ ok: false, reason: "unknown_credential" })
        expect(dbMock.passkeyCredential.findFirst).toHaveBeenCalledWith({ where: { userId: USER.id, credentialID: "someone-elses" } })
        expect(webauthn.verifyAuthenticationResponse).not.toHaveBeenCalled()
    })

    it("a verified assertion advances the counter and the last-used date", async () => {
        dbMock.webAuthnChallenge.findUnique.mockResolvedValue({ ...live(), challenge: "auth-challenge" })
        dbMock.passkeyCredential.findFirst.mockResolvedValue({ id: "row-1", credentialID: "cred-a", credentialPublicKey: Buffer.from([1]), counter: BigInt(4), transports: "internal" })
        webauthn.verifyAuthenticationResponse.mockResolvedValue({ verified: true, authenticationInfo: { newCounter: 5 } })
        expect(await verifyAuthentication(USER.id, { id: "cred-a" } as any)).toEqual({ ok: true })
        expect(webauthn.verifyAuthenticationResponse).toHaveBeenCalledWith(
            expect.objectContaining({ expectedChallenge: "auth-challenge", credential: expect.objectContaining({ id: "cred-a", counter: 4, transports: ["internal"] }) })
        )
        expect(dbMock.passkeyCredential.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "row-1" }, data: expect.objectContaining({ counter: BigInt(5) }) }))
    })
})

describe("removal", () => {
    it("deletes only the user's own passkey and rewrites the claim from the table", async () => {
        dbMock.passkeyCredential.deleteMany.mockResolvedValue({ count: 1 })
        dbMock.passkeyCredential.count.mockResolvedValue(0)
        expect(await removePasskey(USER, "row-1")).toEqual({ removed: true, count: 0 })
        expect(dbMock.passkeyCredential.deleteMany).toHaveBeenCalledWith({ where: { id: "row-1", userId: USER.id } })
        expect(admin.updateUserById).toHaveBeenCalledWith(USER.supabaseUserId, { app_metadata: { role: "policyholder", [PASSKEY_CLAIM]: 0 } })
        dbMock.passkeyCredential.deleteMany.mockResolvedValue({ count: 0 })
        expect((await removePasskey(USER, "not-mine")).removed).toBe(false)
    })
})
