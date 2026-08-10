/**
 * Browser-side push registration.
 *
 * Standard Web Push: register the service worker, ask the browser to
 * subscribe, hand the subscription to our API. No Firebase SDK, no client
 * config, and it is the only path that works for installed PWAs on iOS 16.4+.
 *
 * Everything here answers "why not" as clearly as "yes", because a push
 * permission prompt is a one-shot: a browser that has been denied will not ask
 * again, so a prompt fired at the wrong moment permanently costs the channel.
 */

export type PushSupport =
    | { supported: true; permission: NotificationPermission }
    | { supported: false; reason: "no_service_worker" | "no_push_manager" | "no_notifications" }

export function detectPushSupport(): PushSupport {
    if (typeof window === "undefined") return { supported: false, reason: "no_service_worker" }
    if (!("serviceWorker" in navigator)) return { supported: false, reason: "no_service_worker" }
    if (!("PushManager" in window)) return { supported: false, reason: "no_push_manager" }
    if (!("Notification" in window)) return { supported: false, reason: "no_notifications" }
    return { supported: true, permission: Notification.permission }
}

/** VAPID keys travel as base64url; PushManager wants raw bytes. */
function urlBase64ToUint8Array(base64: string): Uint8Array {
    const padding = "=".repeat((4 - (base64.length % 4)) % 4)
    const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/")
    const raw = window.atob(normalized)
    const output = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
    return output
}

export type SubscribeResult =
    | { ok: true; alreadySubscribed: boolean }
    | { ok: false; reason: "unsupported" | "denied" | "dismissed" | "no_key" | "failed"; error?: string }

/**
 * The service worker registration, registering it if this browser has none.
 *
 * Notifications on Android MUST be raised through a service worker — Chrome
 * there rejects `new Notification()` with "Illegal constructor" (Sentry
 * POLICYWALLET-11). Push opt-in registers the worker, but a customer who
 * granted notification permission from the wallet toast and never opened
 * Settings had no worker at all, so the local "analysis finished" notification
 * had nothing to go through and threw on exactly the platform most of them use.
 *
 * Registering here is safe and cheap: `public/sw.js` deliberately caches
 * nothing, so taking control of the page changes no behaviour. Returns null
 * rather than throwing — a notification is never worth an exception on a render
 * path.
 */
export async function getOrRegisterServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null
    try {
        const existing = await navigator.serviceWorker.getRegistration()
        if (existing) return existing
        const registration = await navigator.serviceWorker.register("/sw.js")
        await navigator.serviceWorker.ready
        return registration
    } catch {
        return null
    }
}

/**
 * Subscribe this browser to push and register it server-side.
 *
 * MUST be called from a user gesture: browsers require one for the permission
 * prompt, and calling it on page load is both rejected and rude.
 */
export async function subscribeToPush(publicKey: string | undefined): Promise<SubscribeResult> {
    const support = detectPushSupport()
    if (!support.supported) return { ok: false, reason: "unsupported" }
    if (!publicKey) return { ok: false, reason: "no_key" }
    if (support.permission === "denied") return { ok: false, reason: "denied" }

    try {
        const registration = await navigator.serviceWorker.register("/sw.js")
        await navigator.serviceWorker.ready

        // Re-subscribing the same browser returns the SAME endpoint, so this is
        // safe to call again; the server upserts on endpoint.
        const existing = await registration.pushManager.getSubscription()
        if (existing) {
            await sendSubscription(existing)
            return { ok: true, alreadySubscribed: true }
        }

        if (support.permission === "default") {
            const permission = await Notification.requestPermission()
            if (permission === "denied") return { ok: false, reason: "denied" }
            if (permission !== "granted") return { ok: false, reason: "dismissed" }
        }

        const subscription = await registration.pushManager.subscribe({
            // Required by Chrome, and the honest setting anyway: we only push
            // when there is something to show the person.
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        })

        await sendSubscription(subscription)
        return { ok: true, alreadySubscribed: false }
    } catch (error) {
        return {
            ok: false,
            reason: "failed",
            error: error instanceof Error ? error.message : String(error),
        }
    }
}

async function sendSubscription(subscription: PushSubscription): Promise<void> {
    const json = subscription.toJSON() as { endpoint?: string; keys?: Record<string, string> }
    const res = await fetch("/api/v1/notifications/device-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            endpoint: json.endpoint,
            p256dh: json.keys?.p256dh,
            auth: json.keys?.auth,
            platform: "web",
        }),
    })
    if (!res.ok) throw new Error(`device registration failed: ${res.status}`)
}

/**
 * Unsubscribe this browser and drop the server-side row.
 *
 * The server delete matters as much as the browser one: a subscription we keep
 * pushing to after the person opted out is both a broken promise and, once the
 * endpoint dies, a row that retries forever.
 */
export async function unsubscribeFromPush(): Promise<boolean> {
    const support = detectPushSupport()
    if (!support.supported) return false

    try {
        const registration = await navigator.serviceWorker.getRegistration()
        const subscription = await registration?.pushManager.getSubscription()
        if (!subscription) return true

        await fetch("/api/v1/notifications/device-token", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
        }).catch(() => undefined)

        return await subscription.unsubscribe()
    } catch {
        return false
    }
}
