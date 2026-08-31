import crypto from "node:crypto"
import { cookies } from "next/headers"

/**
 * The signed OAuth intent — how ROLE SURVIVES THE ROUND TRIP (brief §2.3).
 *
 * OAuth from /auth/signup/agent must come back an agent account, and the role
 * may not travel in a query parameter the user can edit. It travels here: an
 * HMAC-signed, httpOnly, 10-minute cookie written by `startSocialAuth` and
 * consumed exactly once by /auth/callback. Tampering breaks the signature;
 * expiry bounds replay; the nonce ties one click to one callback. Terms
 * acceptance context (version, locale) rides along so the callback can record
 * consent server-side with timestamp and version (brief §2.3) — the social
 * path shows «Με τη συνέχεια αποδέχεστε…» instead of a checkbox.
 */
const COOKIE_NAME = "pw_oauth_intent"
const MAX_AGE_SECONDS = 600

export interface OAuthIntent {
    v: 1
    role: "policyholder" | "agent"
    provider: string
    /** Where to send the user after a successful exchange ("/onboarding" etc.). */
    next: string
    /** Terms version shown under the buttons at click time. */
    termsVersion: string
    locale: "el" | "en"
    nonce: string
    exp: number
}

function secret(): string {
    const s = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
    if (!s) throw new Error("AUTH_SECRET/NEXTAUTH_SECRET is required to sign OAuth intents")
    return s
}

function sign(payload: string): string {
    return crypto.createHmac("sha256", secret()).update(payload).digest("base64url")
}

export async function setOAuthIntent(intent: Omit<OAuthIntent, "v" | "nonce" | "exp">): Promise<void> {
    const full: OAuthIntent = {
        v: 1,
        ...intent,
        nonce: crypto.randomBytes(16).toString("base64url"),
        exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
    }
    const payload = Buffer.from(JSON.stringify(full)).toString("base64url")
    const store = await cookies()
    store.set(COOKIE_NAME, `${payload}.${sign(payload)}`, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/auth",
        maxAge: MAX_AGE_SECONDS,
    })
}

/** Reads AND clears the intent — one click, one callback. Returns null on any defect. */
export async function consumeOAuthIntent(): Promise<OAuthIntent | null> {
    const store = await cookies()
    const raw = store.get(COOKIE_NAME)?.value
    if (raw) store.delete(COOKIE_NAME)
    if (!raw) return null
    const dot = raw.lastIndexOf(".")
    if (dot < 0) return null
    const payload = raw.slice(0, dot)
    const mac = raw.slice(dot + 1)
    const expected = sign(payload)
    const a = Buffer.from(mac)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
    try {
        const intent = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as OAuthIntent
        if (intent.v !== 1) return null
        if (intent.exp < Math.floor(Date.now() / 1000)) return null
        if (intent.role !== "policyholder" && intent.role !== "agent") return null
        if (typeof intent.next !== "string" || !intent.next.startsWith("/")) return null
        return intent
    } catch {
        return null
    }
}
