/**
 * The proxy sends an anonymous visitor to sign-in only for paths in
 * APP_SEGMENTS (proxy.ts); unknown paths fall through to the real 404
 * (SEO review 2026-10 S2). That is only safe while APP_SEGMENTS names every
 * signed-in section — so the universe is enumerated from app/ on disk.
 */
import { readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it, vi } from "vitest"

vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn() }))
vi.mock("@/lib/rate-limit", () => ({ rateLimit: vi.fn() }))

import { APP_SEGMENTS, isAppPath } from "@/proxy"

const dirs = (root: string) => readdirSync(root).filter((name) => statSync(join(root, name)).isDirectory())

/** Top-level app/ segments that are not signed-in trees. */
const NOT_APP = new Set(["auth", "opengraph-image-en", "llms.txt"])

function appSegmentsOnDisk(): string[] {
    const protectedSections = dirs("app/(protected)").filter((d) => !d.startsWith("(") && !d.startsWith("["))
    const topLevel = dirs("app").filter((d) => !d.startsWith("(") && !NOT_APP.has(d))
    return [...protectedSections, ...topLevel]
}

describe("proxy APP_SEGMENTS covers every signed-in section", () => {
    const onDisk = appSegmentsOnDisk()

    it("enumerates app/(protected) and the other signed-in trees", () => {
        expect(onDisk).toEqual(expect.arrayContaining(["dashboard", "wallet", "admin", "onboarding", "api"]))
    })

    it("probe: a section missing from the set is reported", () => {
        const missing = [...onDisk, "brand-new-section"].filter((s) => !APP_SEGMENTS.has(s))
        expect(missing).toEqual(["brand-new-section"])
    })

    it("every signed-in section is in APP_SEGMENTS", () => {
        expect(onDisk.filter((s) => !APP_SEGMENTS.has(s))).toEqual([])
    })

    it("unknown and GEO paths are not app paths; app paths are", () => {
        expect(isAppPath("/random-page")).toBe(false)
        expect(isAppPath("/llms.txt")).toBe(false)
        expect(isAppPath("/.well-known/security.txt")).toBe(false)
        expect(isAppPath("/dashboard")).toBe(true)
        expect(isAppPath("/wallet/abc")).toBe(true)
        expect(isAppPath("/uploads/policies/test.pdf")).toBe(true)
    })
})
