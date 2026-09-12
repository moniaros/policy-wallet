/**
 * The step-up token — proof, for this browser, that the signed-in person also
 * presented a passkey (PW-PROVENANCE-01 R-01, §14.4).
 *
 * The Supabase session says WHO is signed in. A passkey is a second factor on
 * top of it, and the proof that it was presented has to travel with every
 * request, be unforgeable, expire, and be bound to the user it was issued
 * for. It is an HMAC-signed, httpOnly cookie — the same shape as the OAuth
 * intent (lib/auth/oauth-intent.ts) — signed with Web Crypto so the SAME code
 * verifies in the proxy and in a route handler.
 *
 * Token: `<userId>.<exp>.<nonce>.<signature>`; every field is checked. Deleting
 * the cookie is not a bypass: the proxy then asks for the passkey again. The
 * user id in the token is the SUPABASE auth id the proxy already holds.
 */

export const STEP_UP_COOKIE = "pw_step_up"
/** Twelve hours: a working day, then the passkey again. */
export const STEP_UP_TTL_SECONDS = 12 * 60 * 60

const encoder = new TextEncoder()

function secret(): string {
    const s = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
    if (!s) throw new Error("AUTH_SECRET/NEXTAUTH_SECRET is required to sign step-up tokens")
    return s
}

function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
    const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
    let binary = ""
    for (const b of view) binary += String.fromCharCode(b)
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

async function hmac(payload: string): Promise<string> {
    const key = await crypto.subtle.importKey("raw", encoder.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
    return toBase64Url(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)))
}

function constantTimeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false
    let diff = 0
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
    return diff === 0
}

/** Mint a token for this user, valid for the TTL from `now`. */
export async function issueStepUpToken(userId: string, now: Date = new Date()): Promise<string> {
    if (!userId || userId.includes(".")) throw new Error("step-up: a user id must be non-empty and dot-free")
    const exp = Math.floor(now.getTime() / 1000) + STEP_UP_TTL_SECONDS
    const nonce = toBase64Url(crypto.getRandomValues(new Uint8Array(12)))
    const payload = `${userId}.${exp}.${nonce}`
    return `${payload}.${await hmac(payload)}`
}

/**
 * True only for a token this deployment signed, for THIS user, that has not
 * expired. Any defect — shape, signature, user, time — is a plain false.
 */
export async function verifyStepUpToken(token: string | null | undefined, userId: string, now: Date = new Date()): Promise<boolean> {
    if (!token || !userId) return false
    const parts = token.split(".")
    if (parts.length !== 4) return false
    const [tokenUser, expRaw, nonce, signature] = parts
    if (tokenUser !== userId || !nonce || !signature) return false
    const exp = Number(expRaw)
    if (!Number.isFinite(exp) || exp <= Math.floor(now.getTime() / 1000)) return false
    let expected: string
    try {
        expected = await hmac(`${tokenUser}.${expRaw}.${nonce}`)
    } catch {
        return false
    }
    return constantTimeEqual(expected, signature)
}
