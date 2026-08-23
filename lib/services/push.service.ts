import { createSign, createPrivateKey } from "crypto"
import { logger } from "../logger"
import { outboundDispatchAllowed } from "@/lib/outbound/dispatch-guard"

/**
 * Web Push Notification Service via Firebase Cloud Messaging HTTP v1 API.
 *
 * Uses Google OAuth2 service account credentials with Node.js built-in crypto.
 * No external JWT library required.
 *
 * Requires env vars:
 * - FCM_PROJECT_ID     — Firebase project ID
 * - FCM_CLIENT_EMAIL   — Service account email
 * - FCM_PRIVATE_KEY    — Service account private key (PEM, with \n)
 *
 * Falls back to console.log in development if credentials are not configured.
 */

const FCM_TOKEN_URL = "https://oauth2.googleapis.com/token"
const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging"

// Cache the access token in memory (valid for ~1 hour)
let cachedAccessToken: string | null = null
let cachedTokenExpiresAt = 0

interface PushPayload {
    token: string
    title: string
    body: string
    icon?: string
    url?: string
    data?: Record<string, string>
}

interface PushResult {
    success: boolean
    error?: string
}

/**
 * Base64url encode a buffer or string.
 */
function base64url(input: Buffer | string): string {
    const buf = typeof input === "string" ? Buffer.from(input) : input
    return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

/**
 * Create a signed JWT for Google OAuth2 service account auth
 * using Node.js built-in crypto module.
 */
function createSignedJwt(): string {
    const clientEmail = process.env.FCM_CLIENT_EMAIL
    const privateKeyRaw = process.env.FCM_PRIVATE_KEY

    if (!clientEmail || !privateKeyRaw) {
        throw new Error("FCM_CLIENT_EMAIL and FCM_PRIVATE_KEY are required")
    }

    const privateKeyPem = privateKeyRaw.replace(/\\n/g, "\n")
    const now = Math.floor(Date.now() / 1000)

    const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))
    const payload = base64url(
        JSON.stringify({
            iss: clientEmail,
            sub: clientEmail,
            aud: FCM_TOKEN_URL,
            scope: FCM_SCOPE,
            iat: now,
            exp: now + 3600,
        })
    )

    const signingInput = `${header}.${payload}`
    const key = createPrivateKey(privateKeyPem)
    const signer = createSign("RSA-SHA256")
    signer.update(signingInput)
    const signature = base64url(signer.sign(key))

    return `${signingInput}.${signature}`
}

/**
 * Get a valid OAuth2 access token, refreshing if expired.
 */
async function getAccessToken(): Promise<string> {
    const now = Date.now()

    // Return cached token if still valid (with 5 min buffer)
    if (cachedAccessToken && cachedTokenExpiresAt > now + 300_000) {
        return cachedAccessToken
    }

    const jwt = createSignedJwt()

    const response = await fetch(FCM_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion: jwt,
        }),
    })

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`OAuth2 token exchange failed: ${response.status} ${errorText}`)
    }

    const tokenData = await response.json()
    cachedAccessToken = tokenData.access_token
    cachedTokenExpiresAt = now + (tokenData.expires_in || 3600) * 1000

    return cachedAccessToken!
}

/**
 * Send a push notification via FCM HTTP v1 API.
 */
export async function sendPushNotification(payload: PushPayload): Promise<PushResult> {
    const { token, title, body, icon, url, data } = payload

    if (!token) {
        return { success: false, error: "No push token" }
    }

    // ENVIRONMENT decides, before any credential check. The `!projectId` branch
    // below is the same credential-presence pattern that let `sendEmail` mail
    // real people from a laptop: it stops dispatch only while FCM happens to be
    // unconfigured, and says nothing about whether dispatch is ALLOWED.
    // See lib/outbound/dispatch-guard.ts.
    const dispatch = outboundDispatchAllowed("push", `fcm:${token.slice(0, 8)}`)
    if (!dispatch.allowed) {
        logger("info", `[Push/dev] not sent - ${dispatch.reason}: ${title}`)
        return { success: true }
    }

    const projectId = process.env.FCM_PROJECT_ID

    // Dev mode: log instead of sending
    if (!projectId || !process.env.FCM_CLIENT_EMAIL || !process.env.FCM_PRIVATE_KEY) {
        logger("info", `[Push/dev] ${title}: ${body}`, { token: token.slice(0, 20) + "..." })
        return { success: true }
    }

    try {
        const accessToken = await getAccessToken()

        const fcmPayload = {
            message: {
                token,
                notification: {
                    title,
                    body,
                },
                webpush: {
                    notification: {
                        icon: icon || "/icons/icon-192x192.png",
                        requireInteraction: false,
                    },
                    fcm_options: {
                        link: url || process.env.NEXT_PUBLIC_APP_URL || "https://policywallet.gr",
                    },
                },
                data: {
                    ...(data || {}),
                    url: url || "/home",
                },
            },
        }

        const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`

        const response = await fetch(fcmUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(fcmPayload),
        })

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}))
            const errorMsg =
                (errorBody as Record<string, Record<string, string>>)?.error?.message ||
                `HTTP ${response.status}`

            // Invalidate token on 401 (expired/invalid)
            if (response.status === 401) {
                cachedAccessToken = null
                cachedTokenExpiresAt = 0
            }

            logger("warn", "FCM v1 push failed", { status: response.status, error: errorMsg })
            return { success: false, error: errorMsg }
        }

        return { success: true }
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        logger("error", "Push notification send error", { error: msg })
        return { success: false, error: msg }
    }
}

/**
 * Batch send push notifications.
 */
export async function sendPushNotifications(
    payloads: PushPayload[]
): Promise<{ sent: number; failed: number }> {
    let sent = 0
    let failed = 0

    const batchSize = 10
    for (let i = 0; i < payloads.length; i += batchSize) {
        const batch = payloads.slice(i, i + batchSize)
        const results = await Promise.allSettled(
            batch.map((p) => sendPushNotification(p))
        )

        for (const result of results) {
            if (result.status === "fulfilled" && result.value.success) {
                sent++
            } else {
                failed++
            }
        }
    }

    return { sent, failed }
}
