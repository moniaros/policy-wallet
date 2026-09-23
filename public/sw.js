/* PolicyWallet service worker.
 *
 * Deliberately minimal: this exists to receive Web Push and to open the right
 * page when someone taps a notification.
 *
 * It caches exactly TWO things (spec v2 §18.1): the /offline page and the
 * /api/v1/me/offline-card JSON — the phone numbers a person needs at the
 * roadside with no signal. Nothing else: an offline copy of the wallet would
 * be a way to show someone stale cover, which is worse than a page that
 * fails honestly. The card carries its own generatedAt so /offline can say
 * how old the numbers are.
 */
const OFFLINE_CACHE = "pw-offline-v1"
const OFFLINE_PAGE = "/offline"
const OFFLINE_CARD = "/api/v1/me/offline-card"

self.addEventListener("install", (event) => {
    // Take over immediately: a customer who just granted permission should be
    // reachable on the next event, not after their next full page load.
    self.skipWaiting()
    event.waitUntil(caches.open(OFFLINE_CACHE).then((cache) => cache.add(OFFLINE_PAGE).catch(() => undefined)))
})

self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim())
})

self.addEventListener("fetch", (event) => {
    const url = new URL(event.request.url)
    if (url.origin !== self.location.origin) return
    // The card: network first, cached copy when the network is gone.
    if (url.pathname === OFFLINE_CARD && event.request.method === "GET") {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    if (response.ok) caches.open(OFFLINE_CACHE).then((cache) => cache.put(OFFLINE_CARD, response.clone()))
                    return response
                })
                .catch(() => caches.match(OFFLINE_CARD).then((cached) => cached || new Response("", { status: 503 })))
        )
        return
    }
    // A page navigation that cannot reach the network lands on /offline.
    if (event.request.mode === "navigate") {
        event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_PAGE).then((cached) => cached || Response.error())))
    }
})

self.addEventListener("push", (event) => {
    if (!event.data) return

    let payload
    try {
        payload = event.data.json()
    } catch {
        // A push we cannot parse still means something happened; show the raw
        // text rather than swallowing it silently.
        payload = { title: "PolicyWallet", body: event.data.text() }
    }

    const title = payload.title || "PolicyWallet"
    const options = {
        body: payload.body || "",
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-192x192.png",
        // Same tag replaces an earlier notification about the same thing
        // instead of stacking duplicates in the tray.
        tag: payload.tag || undefined,
        data: { url: payload.url || "/home" },
        lang: payload.lang || "el",
    }

    event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", (event) => {
    event.notification.close()
    const target = (event.notification.data && event.notification.data.url) || "/home"

    event.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
            // Focus an existing tab and navigate it rather than opening a
            // second copy of the app — people end up with a dozen otherwise.
            for (const client of clients) {
                if ("focus" in client) {
                    client.navigate(target)
                    return client.focus()
                }
            }
            return self.clients.openWindow(target)
        })
    )
})
