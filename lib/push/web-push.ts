/**
 * Web Push (RFC 8291 message encryption, RFC 8188 aes128gcm, RFC 8292 VAPID).
 *
 * Written against `node:crypto` rather than pulling in a library, matching the
 * existing FCM sender which hand-rolls its RS256 JWT for the same reason.
 * Everything here is standard primitives: ECDH on P-256, HKDF-SHA256, AES-128-GCM
 * and an ES256 JWT.
 *
 * Why standard Web Push and not FCM. The pre-existing `push.service.ts` targets
 * FCM HTTP v1, which needs an *FCM registration token* — obtainable only through
 * the Firebase JS SDK, i.e. a client dependency, a Firebase project, and
 * `NEXT_PUBLIC_FIREBASE_*` config. Standard Web Push uses the browser's own
 * `PushManager.subscribe()`, needs no client SDK at all, and is the only thing
 * that works for installed PWAs on iOS 16.4+ — which decides it for a Greek
 * consumer product. The FCM path is kept for any legacy token still on
 * `User.pushToken`.
 *
 * Keys: `VAPID_PUBLIC_KEY` (65-byte uncompressed P-256 point, base64url) and
 * `VAPID_PRIVATE_KEY` (32-byte scalar, base64url). Generate a pair with
 * `node scripts/generate-vapid-keys.mjs`.
 */

import {
    createCipheriv,
    createECDH,
    createPrivateKey,
    createSign,
    hkdfSync,
    randomBytes,
} from "node:crypto"

/** RFC 8188 record size we advertise. */
const RECORD_SIZE = 4096
/**
 * Header is salt(16) + rs(4) + idlen(1) + key(65) = 86 bytes, and AES-GCM adds a
 * 16-byte tag plus our 1-byte padding delimiter. Anything longer than this is
 * rejected by the push service outright, so we truncate rather than fail.
 */
const MAX_PLAINTEXT = RECORD_SIZE - 86 - 16 - 1

export interface PushSubscriptionKeys {
    endpoint: string
    p256dh: string
    auth: string
}

export type WebPushResult =
    | { ok: true }
    /** The subscription is permanently gone — delete the row, do not retry. */
    | { ok: false; gone: true; error: string }
    | { ok: false; gone: false; error: string; retryable: boolean }

function b64url(buf: Buffer): string {
    return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function fromB64url(value: string): Buffer {
    return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64")
}

/**
 * VAPID Authorization header.
 *
 * The JWT is audience-scoped to the push service's ORIGIN — a token minted for
 * Mozilla's endpoint is rejected by Google's, so this cannot be cached across
 * subscriptions the way an OAuth token can.
 */
function vapidAuthorization(endpoint: string): string {
    const publicKey = process.env.VAPID_PUBLIC_KEY
    const privateKey = process.env.VAPID_PRIVATE_KEY
    if (!publicKey || !privateKey) throw new Error("VAPID keys are not configured")

    const subject = process.env.VAPID_SUBJECT || "mailto:support@policywallet.gr"
    const audience = new URL(endpoint).origin

    const header = b64url(Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })))
    const payload = b64url(
        Buffer.from(
            JSON.stringify({
                aud: audience,
                // 12h. The spec caps it at 24h; staying well under avoids clock-skew
                // rejections from push services that are strict about `exp`.
                exp: Math.floor(Date.now() / 1000) + 12 * 3600,
                sub: subject,
            })
        )
    )
    const signingInput = `${header}.${payload}`

    // The raw VAPID key pair expressed as a JWK, which is the only way to hand
    // Node a bare P-256 scalar without wrapping it in DER by hand.
    const publicPoint = fromB64url(publicKey)
    const key = createPrivateKey({
        key: {
            kty: "EC",
            crv: "P-256",
            x: b64url(publicPoint.subarray(1, 33)),
            y: b64url(publicPoint.subarray(33, 65)),
            d: b64url(fromB64url(privateKey)),
        },
        format: "jwk",
    } as never)

    const signer = createSign("SHA256")
    signer.update(signingInput)
    // JOSE wants the raw r||s pair. Node emits DER by default, which every push
    // service rejects as an invalid signature.
    const signature = signer.sign({ key, dsaEncoding: "ieee-p1363" })

    return `vapid t=${signingInput}.${b64url(signature)}, k=${publicKey}`
}

/**
 * Encrypt a payload to a subscription (RFC 8291 §3.4, single aes128gcm record).
 */
function encryptPayload(sub: PushSubscriptionKeys, plaintext: Buffer): Buffer {
    const uaPublic = fromB64url(sub.p256dh) // 65-byte uncompressed point
    const authSecret = fromB64url(sub.auth) // 16-byte shared auth secret

    const ecdh = createECDH("prime256v1")
    ecdh.generateKeys()
    const asPublic = ecdh.getPublicKey()
    const sharedSecret = ecdh.computeSecret(uaPublic)

    // Bind the derived key to BOTH public keys, so a captured record cannot be
    // replayed against a different subscription.
    const keyInfo = Buffer.concat([Buffer.from("WebPush: info\0"), uaPublic, asPublic])
    const ikm = Buffer.from(hkdfSync("sha256", sharedSecret, authSecret, keyInfo, 32))

    const salt = randomBytes(16)
    const cek = Buffer.from(
        hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: aes128gcm\0"), 16)
    )
    const nonce = Buffer.from(
        hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: nonce\0"), 12)
    )

    // 0x02 is the RFC 8188 delimiter marking this as the final record.
    const padded = Buffer.concat([plaintext, Buffer.from([0x02])])
    const cipher = createCipheriv("aes-128-gcm", cek, nonce)
    const ciphertext = Buffer.concat([cipher.update(padded), cipher.final(), cipher.getAuthTag()])

    const rs = Buffer.alloc(4)
    rs.writeUInt32BE(RECORD_SIZE, 0)

    // aes128gcm header: salt || rs || idlen || keyid
    return Buffer.concat([salt, rs, Buffer.from([asPublic.length]), asPublic, ciphertext])
}

export interface WebPushMessage {
    title: string
    body: string
    /** In-app path to open on click. */
    url?: string
    tag?: string
}

export async function sendWebPush(
    sub: PushSubscriptionKeys,
    message: WebPushMessage,
    options: { ttlSeconds?: number; urgency?: "very-low" | "low" | "normal" | "high" } = {}
): Promise<WebPushResult> {
    try {
        let json = Buffer.from(JSON.stringify(message), "utf-8")
        if (json.length > MAX_PLAINTEXT) {
            // Truncate the BODY rather than dropping the notification: a clipped
            // sentence still tells someone their payment failed.
            const overflow = json.length - MAX_PLAINTEXT
            const trimmed = { ...message, body: message.body.slice(0, Math.max(0, message.body.length - overflow - 3)) + "…" }
            json = Buffer.from(JSON.stringify(trimmed), "utf-8")
        }

        const body = encryptPayload(sub, json)

        const response = await fetch(sub.endpoint, {
            method: "POST",
            headers: {
                TTL: String(options.ttlSeconds ?? 24 * 3600),
                Urgency: options.urgency ?? "normal",
                "Content-Encoding": "aes128gcm",
                "Content-Type": "application/octet-stream",
                "Content-Length": String(body.length),
                Authorization: vapidAuthorization(sub.endpoint),
            },
            body: new Uint8Array(body),
        })

        if (response.status === 201 || response.status === 200 || response.status === 202) {
            return { ok: true }
        }

        const detail = await response.text().catch(() => "")
        const error = `HTTP ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`

        // 404/410 mean the user uninstalled the PWA or cleared site data. The
        // subscription will never work again, so retrying it forever is how a
        // push queue silently fills with dead endpoints.
        if (response.status === 404 || response.status === 410) {
            return { ok: false, gone: true, error }
        }

        // 429 and 5xx are worth another attempt; 400/413 mean we built it wrong.
        const retryable = response.status === 429 || response.status >= 500
        return { ok: false, gone: false, error, retryable }
    } catch (error) {
        return {
            ok: false,
            gone: false,
            error: error instanceof Error ? error.message : String(error),
            retryable: true,
        }
    }
}
