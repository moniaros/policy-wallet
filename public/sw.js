/* PolicyWallet service worker.
 *
 * Deliberately minimal: this exists to receive Web Push and to open the right
 * page when someone taps a notification. It does NOT cache anything — an
 * offline cache for an app whose whole job is showing current policy data
 * would be a way to show someone stale cover, and that is worse than a page
 * that fails honestly.
 */

self.addEventListener("install", () => {
    // Take over immediately: a customer who just granted permission should be
    // reachable on the next event, not after their next full page load.
    self.skipWaiting()
})

self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim())
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
