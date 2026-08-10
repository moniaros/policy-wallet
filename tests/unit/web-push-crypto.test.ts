import { describe, it, expect, beforeAll } from "vitest"
import {
    createECDH,
    createDecipheriv,
    createPublicKey,
    createVerify,
    hkdfSync,
    randomBytes,
} from "node:crypto"

/**
 * The Web Push stack is hand-rolled on node:crypto (RFC 8291 message
 * encryption, RFC 8188 aes128gcm, RFC 8292 VAPID), matching how the existing
 * FCM sender hand-rolls its RS256 JWT rather than pulling a library.
 *
 * Hand-rolled crypto that is merely "not throwing" is worthless: a wrong key
 * derivation produces a perfectly well-formed record that every push service
 * silently rejects, and you would only find out from an empty notification
 * tray. So this test plays the ROLE OF THE BROWSER — it generates a
 * subscription keypair, hands the public half to our sender, and then decrypts
 * the result. If any step of the derivation is wrong the GCM tag fails and the
 * decrypt throws.
 */

const b64url = (buf: Buffer) =>
    buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
const fromB64url = (s: string) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64")

/** A browser's push subscription: an ECDH keypair plus a 16-byte auth secret. */
function makeSubscriberKeys() {
    const ecdh = createECDH("prime256v1")
    ecdh.generateKeys()
    return {
        publicKey: ecdh.getPublicKey(),
        privateKey: ecdh,
        authSecret: randomBytes(16),
    }
}

/** The browser side of RFC 8291 §3.4 — the inverse of what we send. */
function decryptWebPushBody(
    body: Buffer,
    subscriber: ReturnType<typeof makeSubscriberKeys>
): string {
    const salt = body.subarray(0, 16)
    const idlen = body.readUInt8(20)
    const senderPublic = body.subarray(21, 21 + idlen)
    const ciphertext = body.subarray(21 + idlen)

    const sharedSecret = subscriber.privateKey.computeSecret(senderPublic)

    const keyInfo = Buffer.concat([
        Buffer.from("WebPush: info\0"),
        subscriber.publicKey,
        senderPublic,
    ])
    const ikm = Buffer.from(hkdfSync("sha256", sharedSecret, subscriber.authSecret, keyInfo, 32))
    const cek = Buffer.from(
        hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: aes128gcm\0"), 16)
    )
    const nonce = Buffer.from(
        hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: nonce\0"), 12)
    )

    const tag = ciphertext.subarray(ciphertext.length - 16)
    const data = ciphertext.subarray(0, ciphertext.length - 16)
    const decipher = createDecipheriv("aes-128-gcm", cek, nonce)
    decipher.setAuthTag(tag)
    const plaintext = Buffer.concat([decipher.update(data), decipher.final()])

    // Strip the RFC 8188 padding delimiter (0x02 marks the final record).
    return plaintext.subarray(0, plaintext.length - 1).toString("utf-8")
}

describe("Web Push encryption is actually decryptable by a subscriber", () => {
    let captured: { url: string; headers: Record<string, string>; body: Buffer } | null = null
    let sendWebPush: typeof import("@/lib/push/web-push").sendWebPush

    beforeAll(async () => {
        // A real VAPID pair, so the Authorization header is genuinely signable.
        const vapid = createECDH("prime256v1")
        vapid.generateKeys()
        const pub = vapid.getPublicKey()
        process.env.VAPID_PUBLIC_KEY = b64url(pub)
        process.env.VAPID_PRIVATE_KEY = b64url(vapid.getPrivateKey())
        process.env.VAPID_SUBJECT = "mailto:test@policywallet.gr"

        globalThis.fetch = (async (url: string, init: RequestInit) => {
            captured = {
                url: String(url),
                headers: init.headers as Record<string, string>,
                body: Buffer.from(init.body as Uint8Array),
            }
            return new Response(null, { status: 201 })
        }) as typeof fetch

        sendWebPush = (await import("@/lib/push/web-push")).sendWebPush
    })

    it("a subscriber can decrypt the payload we send it", async () => {
        const subscriber = makeSubscriberKeys()

        const result = await sendWebPush(
            {
                endpoint: "https://push.example.com/send/abc123",
                p256dh: b64url(subscriber.publicKey),
                auth: b64url(subscriber.authSecret),
            },
            { title: "Η πληρωμή σας απέτυχε", body: "Ενημερώστε τον τρόπο πληρωμής σας.", url: "/account" }
        )

        expect(result.ok).toBe(true)
        expect(captured).not.toBeNull()

        const decrypted = JSON.parse(decryptWebPushBody(captured!.body, subscriber))
        // Greek round-trips: the payload is UTF-8 through the whole pipeline.
        expect(decrypted.title).toBe("Η πληρωμή σας απέτυχε")
        expect(decrypted.body).toBe("Ενημερώστε τον τρόπο πληρωμής σας.")
        expect(decrypted.url).toBe("/account")
    })

    it("uses a fresh salt and ephemeral key every send", async () => {
        const subscriber = makeSubscriberKeys()
        const sub = {
            endpoint: "https://push.example.com/send/abc123",
            p256dh: b64url(subscriber.publicKey),
            auth: b64url(subscriber.authSecret),
        }

        await sendWebPush(sub, { title: "one", body: "one" })
        const first = captured!.body
        await sendWebPush(sub, { title: "one", body: "one" })
        const second = captured!.body

        // Identical plaintext must not produce identical ciphertext, or the
        // same nonce would be reused under the same key — the classic AES-GCM
        // catastrophe.
        expect(first.equals(second)).toBe(false)
        expect(first.subarray(0, 16).equals(second.subarray(0, 16))).toBe(false)
    })

    it("sends a well-formed aes128gcm header", async () => {
        const subscriber = makeSubscriberKeys()
        await sendWebPush(
            {
                endpoint: "https://push.example.com/send/abc123",
                p256dh: b64url(subscriber.publicKey),
                auth: b64url(subscriber.authSecret),
            },
            { title: "t", body: "b" }
        )

        const body = captured!.body
        expect(body.readUInt32BE(16)).toBe(4096) // declared record size
        expect(body.readUInt8(20)).toBe(65) // uncompressed P-256 point length
        expect(body.readUInt8(21)).toBe(0x04) // uncompressed point marker
        expect(captured!.headers["Content-Encoding"]).toBe("aes128gcm")
    })

    it("signs a VAPID JWT that verifies against the advertised public key", async () => {
        const subscriber = makeSubscriberKeys()
        await sendWebPush(
            {
                endpoint: "https://push.example.com/send/abc123",
                p256dh: b64url(subscriber.publicKey),
                auth: b64url(subscriber.authSecret),
            },
            { title: "t", body: "b" }
        )

        const authorization = captured!.headers.Authorization
        const [, token] = authorization.match(/vapid t=([^,]+)/)!
        const [headerB64, payloadB64, signatureB64] = token.split(".")

        const header = JSON.parse(fromB64url(headerB64).toString())
        expect(header.alg).toBe("ES256")

        const payload = JSON.parse(fromB64url(payloadB64).toString())
        // Audience is the push service ORIGIN, not the full endpoint — a token
        // scoped to the whole URL is rejected by every push service.
        expect(payload.aud).toBe("https://push.example.com")
        expect(payload.sub).toBe("mailto:test@policywallet.gr")
        expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000))

        const point = fromB64url(process.env.VAPID_PUBLIC_KEY!)
        const publicKey = createPublicKey({
            key: {
                kty: "EC",
                crv: "P-256",
                x: b64url(point.subarray(1, 33)),
                y: b64url(point.subarray(33, 65)),
            },
            format: "jwk",
        } as never)

        const verifier = createVerify("SHA256")
        verifier.update(`${headerB64}.${payloadB64}`)
        // ieee-p1363, not DER: Node signs DER by default and every push service
        // rejects that as an invalid signature.
        expect(
            verifier.verify(
                { key: publicKey, dsaEncoding: "ieee-p1363" },
                fromB64url(signatureB64)
            )
        ).toBe(true)
    })

    it("treats 410 Gone as permanent so dead endpoints are pruned, not retried", async () => {
        globalThis.fetch = (async () => new Response("gone", { status: 410 })) as typeof fetch
        const subscriber = makeSubscriberKeys()

        const result = await sendWebPush(
            {
                endpoint: "https://push.example.com/send/dead",
                p256dh: b64url(subscriber.publicKey),
                auth: b64url(subscriber.authSecret),
            },
            { title: "t", body: "b" }
        )

        expect(result.ok).toBe(false)
        expect(result.ok === false && "gone" in result && result.gone).toBe(true)
    })
})
