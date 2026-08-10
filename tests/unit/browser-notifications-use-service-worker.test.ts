import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { globSync } from "glob"

/**
 * Sentry POLICYWALLET-11 — `TypeError: Failed to construct 'Notification':
 * Illegal constructor. Use ServiceWorkerRegistration.showNotification()
 * instead.` (Chrome Mobile, Android 10, https://www.policywallet.gr/wallet).
 *
 * Android does not permit the `Notification` constructor at all. Notifications
 * there must be raised through a service worker registration. So on the
 * platform most of this product's customers use, the flow was: we prompt them
 * to enable notifications, they grant permission, and then every completed
 * analysis throws instead of telling them. A promise made and quietly broken
 * exactly where it mattered.
 *
 * Desktop Chrome allows the constructor, which is why this survived local
 * testing and only ever appeared in production, on one Android event.
 */

const CLIENT_FILES = globSync("{app,components,lib}/**/*.{ts,tsx}", {
    ignore: ["**/node_modules/**", "**/*.test.*"],
})

describe("no notification is raised through the bare constructor first", () => {
    it("scans a realistic number of files", () => {
        expect(CLIENT_FILES.length).toBeGreaterThan(300)
    })

    it("every `new Notification(` sits behind a service-worker attempt", () => {
        const offenders: string[] = []

        for (const file of CLIENT_FILES) {
            const src = readFileSync(file, "utf-8")
            const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
            if (!/new Notification\(/.test(code)) continue

            // The constructor is allowed only as a FALLBACK — the service-worker
            // path must be attempted first in the same function.
            const usesServiceWorker =
                /getOrRegisterServiceWorker|registration\.showNotification|serviceWorker\.getRegistration/.test(
                    code
                )
            const swComesFirst =
                code.search(/getOrRegisterServiceWorker|showNotification/) <
                code.search(/new Notification\(/)

            if (!usesServiceWorker || !swComesFirst) {
                const line = code.slice(0, code.search(/new Notification\(/)).split("\n").length
                offenders.push(`${file}:${line}`)
            }
        }

        expect(
            offenders,
            "Android rejects `new Notification()` outright. Attempt\n" +
                "ServiceWorkerRegistration.showNotification() first and keep the\n" +
                `constructor only as a desktop fallback:\n  ${offenders.join("\n  ")}`
        ).toEqual([])
    })

    it("the constructor fallback cannot throw into the caller", () => {
        // This runs inside the wallet's status-poll effect. An exception there
        // would take out the render path that shows the policies themselves —
        // a failed notification must never cost more than the notification.
        const src = readFileSync("components/wallet/PolicyWalletClient.tsx", "utf-8")
        const start = src.indexOf("const fireBrowserNotification")
        const body = src.slice(start, src.indexOf("\n    }", start))

        expect(body).toContain("try {")
        expect(body).toMatch(/\}\s*catch\b/)
    })
})

describe("the service-worker path is available to everyone, not just push opt-ins", () => {
    it("registers the worker on demand rather than assuming one exists", () => {
        // `subscribeToPush` registers `/sw.js`, but it only runs if a customer
        // opens Settings and opts into push. Someone who granted notification
        // permission from the wallet toast had no worker at all — so a check for
        // an EXISTING registration would have left Android exactly as broken.
        const helper = readFileSync("lib/push/register.ts", "utf-8")
        expect(helper).toContain("export async function getOrRegisterServiceWorker")
        expect(helper).toMatch(/navigator\.serviceWorker\.register\("\/sw\.js"\)/)

        const client = readFileSync("components/wallet/PolicyWalletClient.tsx", "utf-8")
        expect(client).toContain("getOrRegisterServiceWorker()")
    })

    it("never throws out of the helper", () => {
        const helper = readFileSync("lib/push/register.ts", "utf-8")
        const start = helper.indexOf("export async function getOrRegisterServiceWorker")
        const body = helper.slice(start, helper.indexOf("\n}", start))
        expect(body).toMatch(/catch\s*\{[\s\S]*?return null/)
    })

    it("deep-links through the data the service worker actually reads", () => {
        // `sw.js`'s notificationclick handler reads `notification.data.url`;
        // passing anything else would open the app at /home from a notification
        // that named a specific policy.
        const client = readFileSync("components/wallet/PolicyWalletClient.tsx", "utf-8")
        expect(client).toMatch(/data:\s*\{\s*url\s*\}/)

        const sw = readFileSync("public/sw.js", "utf-8")
        expect(sw).toMatch(/event\.notification\.data\s*&&\s*event\.notification\.data\.url/)
    })
})
