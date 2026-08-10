import { describe, it, expect } from "vitest"
import { readFileSync, existsSync } from "node:fs"

/**
 * `public/sw.js` is the whole push feature.
 *
 * Web Push has no fallback path: if that file is missing or replaced, permission
 * still gets granted, subscriptions still get stored, deliveries still get
 * recorded as sent — and nothing ever reaches a phone. There is no error to see.
 *
 * `@ducanh2912/next-pwa` was configured with `dest: "public"`, which is exactly
 * where it writes its generated service worker. It happened to be harmless
 * because it is a webpack plugin and Next 16 builds with Turbopack, so it
 * emitted nothing at all — which also meant its offline-caching options had been
 * dead configuration for as long as they had been there. But a single build-tool
 * change would have turned a silent no-op into a silent deletion.
 */

describe("the push service worker is the only thing that owns /sw.js", () => {
    it("exists and handles push", () => {
        expect(existsSync("public/sw.js")).toBe(true)
        const sw = readFileSync("public/sw.js", "utf-8")
        expect(sw).toMatch(/addEventListener\(\s*["']push["']/)
        expect(sw).toMatch(/addEventListener\(\s*["']notificationclick["']/)
    })

    it("is not a generated workbox bundle", () => {
        // If a build ever overwrites the hand-written worker, this is what the
        // replacement looks like.
        const sw = readFileSync("public/sw.js", "utf-8")
        expect(sw).not.toMatch(/workbox/i)
        expect(sw).not.toMatch(/__WB_MANIFEST/)
    })

    it("no build plugin is configured to write into public/", () => {
        const config = readFileSync("next.config.ts", "utf-8")
        const code = config.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

        expect(code, "next-pwa writes public/sw.js and would clobber the push worker").not.toMatch(
            /next-pwa/
        )
        expect(code).not.toMatch(/withPWAInit/)
    })

    it("registration points at that exact file", () => {
        // A rename on either side breaks push silently, so pin both ends.
        expect(readFileSync("lib/push/register.ts", "utf-8")).toContain('register("/sw.js")')
    })

    it("the worker deliberately caches nothing", () => {
        // Stated in its own header: an offline cache for an app whose job is
        // showing CURRENT policy data is a way to show someone stale cover.
        // This is the reason precaching was removed rather than reconfigured.
        const sw = readFileSync("public/sw.js", "utf-8")
        expect(sw).not.toMatch(/caches\.(?:open|match|addAll)/)
    })
})
