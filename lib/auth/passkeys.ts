/**
 * Passkeys as a SECOND factor — PW-PROVENANCE-01 R-01 (§14.4).
 *
 * `PasskeyCredential` and `WebAuthnChallenge` existed with no code behind
 * them; the settings screen said so honestly and offered nothing. This module
 * is the code. The Supabase session remains the first factor; a passkey is
 * proof, per browser and for `STEP_UP_TTL_SECONDS`, that the signed-in person
 * also holds an enrolled authenticator (lib/auth/step-up.ts). Enforcement sits
 * in ONE place — proxy.ts — and keys on a claim the ENROLMENT writes into the
 * user's Supabase `app_metadata` (server-only, never user-editable), so the
 * proxy needs no database read to know a passkey is required.
 *
 * Feature-flagged (`PASSKEYS_ENABLED`, env-only). Off, nothing changes: no
 * settings block, the routes refuse, the proxy enforces nothing. That is also
 * the break-glass: an owner locked out by a lost passkey unsets the flag and
 * redeploys. Nothing here is a claim the product makes publicly until the
 * owner turns it on.
 */

import {
    generateAuthenticationOptions,
    generateRegistrationOptions,
    verifyAuthenticationResponse,
    verifyRegistrationResponse,
    type AuthenticationResponseJSON,
    type AuthenticatorTransportFuture,
    type PublicKeyCredentialCreationOptionsJSON,
    type PublicKeyCredentialRequestOptionsJSON,
    type RegistrationResponseJSON,
} from "@simplewebauthn/server"

import { db } from "@/lib/db"
import { createAdminClient } from "@/lib/supabase/admin"

export const PASSKEY_CLAIM = "passkeys"
/** A challenge lives five minutes; one per user at a time. */
export const CHALLENGE_TTL_MS = 5 * 60 * 1000
export const RP_NAME = "PolicyWallet"

/** Env-only flag; the registry entry `auth.passkeys` names this variable. */
export function passkeysEnabled(): boolean {
    return process.env.PASSKEYS_ENABLED === "1"
}

/** The relying party, from the deployment's own URL — never a literal. */
export function relyingParty(): { rpID: string; origin: string } {
    const raw = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const url = new URL(raw)
    return { rpID: url.hostname, origin: url.origin }
}

export interface PasskeySummary {
    id: string
    createdAt: string
    lastUsedAt: string
    transports: string[]
}

function splitTransports(raw: string | null): AuthenticatorTransportFuture[] {
    return raw ? (raw.split(",").filter(Boolean) as AuthenticatorTransportFuture[]) : []
}

export async function listPasskeys(userId: string): Promise<PasskeySummary[]> {
    const rows = await db.passkeyCredential.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
        select: { id: true, createdAt: true, lastUsedAt: true, transports: true },
    })
    return rows.map((r) => ({ id: r.id, createdAt: r.createdAt.toISOString(), lastUsedAt: r.lastUsedAt.toISOString(), transports: splitTransports(r.transports) }))
}

async function storeChallenge(userId: string, challenge: string): Promise<void> {
    const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS)
    await db.webAuthnChallenge.upsert({
        where: { userId },
        create: { userId, challenge, expiresAt },
        update: { challenge, expiresAt, createdAt: new Date() },
    })
}

/** Reads AND deletes — one challenge, one response. Null when absent or expired. */
async function consumeChallenge(userId: string): Promise<string | null> {
    const row = await db.webAuthnChallenge.findUnique({ where: { userId } })
    if (!row) return null
    await db.webAuthnChallenge.delete({ where: { userId } }).catch(() => undefined)
    if (row.expiresAt.getTime() <= Date.now()) return null
    return row.challenge
}

/**
 * The claim the proxy reads. Written on every enrolment and removal so it can
 * never disagree with the table for longer than one request.
 */
export async function syncPasskeyClaim(userId: string, supabaseUserId: string): Promise<number> {
    const count = await db.passkeyCredential.count({ where: { userId } })
    const admin = createAdminClient()
    const { data } = await admin.auth.admin.getUserById(supabaseUserId)
    const existing = (data?.user?.app_metadata ?? {}) as Record<string, unknown>
    const { error } = await admin.auth.admin.updateUserById(supabaseUserId, { app_metadata: { ...existing, [PASSKEY_CLAIM]: count } })
    if (error) throw new Error(`passkeys: could not write the ${PASSKEY_CLAIM} claim: ${error.message}`)
    return count
}

export async function registrationOptions(user: { id: string; email: string }): Promise<PublicKeyCredentialCreationOptionsJSON> {
    const { rpID } = relyingParty()
    const existing = await db.passkeyCredential.findMany({ where: { userId: user.id }, select: { credentialID: true, transports: true } })
    const options = await generateRegistrationOptions({
        rpName: RP_NAME,
        rpID,
        userName: user.email,
        userID: new TextEncoder().encode(user.id),
        attestationType: "none",
        excludeCredentials: existing.map((c) => ({ id: c.credentialID, transports: splitTransports(c.transports) })),
        authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
    })
    await storeChallenge(user.id, options.challenge)
    return options
}

export async function verifyRegistration(
    user: { id: string; supabaseUserId: string },
    response: RegistrationResponseJSON
): Promise<{ ok: true; id: string; count: number } | { ok: false; reason: "no_challenge" | "not_verified" }> {
    const expectedChallenge = await consumeChallenge(user.id)
    if (!expectedChallenge) return { ok: false, reason: "no_challenge" }
    const { rpID, origin } = relyingParty()
    const result = await verifyRegistrationResponse({ response, expectedChallenge, expectedOrigin: origin, expectedRPID: rpID })
    if (!result.verified || !result.registrationInfo) return { ok: false, reason: "not_verified" }
    const { credential } = result.registrationInfo
    const row = await db.passkeyCredential.create({
        data: {
            userId: user.id,
            credentialID: credential.id,
            credentialPublicKey: Buffer.from(credential.publicKey),
            counter: BigInt(credential.counter),
            transports: (credential.transports ?? []).join(",") || null,
        },
        select: { id: true },
    })
    const count = await syncPasskeyClaim(user.id, user.supabaseUserId)
    return { ok: true, id: row.id, count }
}

export async function authenticationOptions(userId: string): Promise<PublicKeyCredentialRequestOptionsJSON | null> {
    const { rpID } = relyingParty()
    const credentials = await db.passkeyCredential.findMany({ where: { userId }, select: { credentialID: true, transports: true } })
    if (credentials.length === 0) return null
    const options = await generateAuthenticationOptions({
        rpID,
        allowCredentials: credentials.map((c) => ({ id: c.credentialID, transports: splitTransports(c.transports) })),
        userVerification: "preferred",
    })
    await storeChallenge(userId, options.challenge)
    return options
}

export async function verifyAuthentication(
    userId: string,
    response: AuthenticationResponseJSON
): Promise<{ ok: true } | { ok: false; reason: "no_challenge" | "unknown_credential" | "not_verified" }> {
    const expectedChallenge = await consumeChallenge(userId)
    if (!expectedChallenge) return { ok: false, reason: "no_challenge" }
    // The credential must belong to THIS user — a valid assertion for someone else's key is not a second factor.
    const stored = await db.passkeyCredential.findFirst({ where: { userId, credentialID: response.id } })
    if (!stored) return { ok: false, reason: "unknown_credential" }
    const { rpID, origin } = relyingParty()
    const result = await verifyAuthenticationResponse({
        response,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
            id: stored.credentialID,
            publicKey: new Uint8Array(stored.credentialPublicKey),
            counter: Number(stored.counter),
            transports: splitTransports(stored.transports),
        },
    })
    if (!result.verified) return { ok: false, reason: "not_verified" }
    await db.passkeyCredential.update({
        where: { id: stored.id },
        data: { counter: BigInt(result.authenticationInfo.newCounter), lastUsedAt: new Date() },
    })
    return { ok: true }
}

/** Removes one of the user's own passkeys and re-syncs the claim. False when it was not theirs. */
export async function removePasskey(user: { id: string; supabaseUserId: string }, passkeyId: string): Promise<{ removed: boolean; count: number }> {
    const { count: deleted } = await db.passkeyCredential.deleteMany({ where: { id: passkeyId, userId: user.id } })
    const count = await syncPasskeyClaim(user.id, user.supabaseUserId)
    return { removed: deleted > 0, count }
}
