#!/usr/bin/env node
/**
 * Generate a VAPID key pair for Web Push.
 *
 *   node scripts/generate-vapid-keys.mjs
 *
 * Prints the two values to put in the environment. The PUBLIC key is also
 * shipped to the browser as NEXT_PUBLIC_VAPID_PUBLIC_KEY — that is by design,
 * it is what identifies us to the push service. The PRIVATE key is a signing
 * key: anyone holding it can push notifications to every subscriber you have.
 *
 * Rotating the pair invalidates every existing subscription, so browsers must
 * re-subscribe. Generate once per environment and keep it.
 */

import { generateKeyPairSync, createPublicKey } from "node:crypto"

const b64url = (buf) =>
    Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")

const { privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" })

// Export as JWK to get the raw scalar and point coordinates — VAPID uses the
// bare values, not DER or PEM.
const privateJwk = privateKey.export({ format: "jwk" })
const publicJwk = createPublicKey(privateKey).export({ format: "jwk" })

const x = Buffer.from(publicJwk.x, "base64url")
const y = Buffer.from(publicJwk.y, "base64url")
// Uncompressed point: 0x04 || X || Y
const publicPoint = Buffer.concat([Buffer.from([0x04]), x, y])

console.log("")
console.log("VAPID key pair (P-256). Add to your environment:")
console.log("")
console.log(`VAPID_PUBLIC_KEY=${b64url(publicPoint)}`)
console.log(`VAPID_PRIVATE_KEY=${b64url(Buffer.from(privateJwk.d, "base64url"))}`)
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${b64url(publicPoint)}`)
console.log(`VAPID_SUBJECT=mailto:support@policywallet.gr`)
console.log("")
console.log("Keep VAPID_PRIVATE_KEY secret. Rotating the pair invalidates every")
console.log("existing subscription — subscribers must opt in again.")
console.log("")
