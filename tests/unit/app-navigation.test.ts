import { describe, it, expect } from "vitest"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { PRIMARY_NAV, SECONDARY_NAV, SIDEBAR_NAV, ADD_POLICY, isNavActive, activePrimary } from "@/lib/app/navigation"

const pageFor = (href: string) => join(process.cwd(), "app/(protected)", href === "/" ? "home" : href.slice(1), "page.tsx")

describe("the navigation registry (§7)", () => {
    it("has five primary tabs in the brief's order with unique ids and hrefs", () => {
        expect(PRIMARY_NAV.map((e) => e.id)).toEqual(["protection", "see", "policies", "money", "me"])
        expect(new Set(PRIMARY_NAV.map((e) => e.href)).size).toBe(5)
    })
    it("the desktop sidebar is the five plus Ενημερώσεις and Σύμβουλος, in §7 order", () => {
        expect(SIDEBAR_NAV.map((e) => e.id)).toEqual(["protection", "see", "policies", "money", "updates", "adviser", "me"])
    })
    it("every href — today's — resolves to a page on disk (a tab never points at a route that does not exist)", () => {
        for (const e of [...PRIMARY_NAV, ...SECONDARY_NAV, ADD_POLICY]) {
            expect(existsSync(pageFor(e.href)), `${e.id} → ${e.href}`).toBe(true)
        }
    })
    it("every successor is one of the brief's routes", () => {
        const allowed = ["/", "/see", "/policies", "/money", "/me", "/updates", "/adviser", "/add"]
        for (const e of [...PRIMARY_NAV, ...SECONDARY_NAV, ADD_POLICY]) expect(allowed).toContain(e.successor)
    })
    it("active state follows the href, the successor and the aliases — and never the adviser's own tools", () => {
        const see = PRIMARY_NAV[1]
        expect(isNavActive("/protection", see)).toBe(true)
        expect(isNavActive("/protection/motor", see)).toBe(true)
        expect(isNavActive("/see", see)).toBe(true)
        expect(isNavActive("/wallet", see)).toBe(false)
        const adviser = SECONDARY_NAV[1]
        expect(isNavActive("/agent", adviser)).toBe(true)
        expect(isNavActive("/agent/settings", adviser)).toBe(false)
        expect(isNavActive("/agent/pricing", adviser)).toBe(false)
        const protection = PRIMARY_NAV[0]
        expect(isNavActive("/", protection)).toBe(true)
        expect(isNavActive("/dashboard", protection)).toBe(true)
        expect(isNavActive("/dashboard/agent", protection)).toBe(true)
    })
    it("exactly one primary tab is active for a path, or none on a sub-screen", () => {
        expect(activePrimary("/wallet/abc")).toBe("policies")
        expect(activePrimary("/help")).toBeNull()
        for (const path of ["/dashboard", "/protection", "/wallet", "/money", "/account/plan"]) {
            expect(PRIMARY_NAV.filter((e) => isNavActive(path, e)).length, path).toBe(1)
        }
    })
})
