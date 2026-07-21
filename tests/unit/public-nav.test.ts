import { describe, expect, it } from "vitest"

import {
    PRIMARY_CTA,
    PUBLIC_NAV_ITEMS,
    SECONDARY_CTA,
    SKIP_LINK_TARGET_ID,
    publicNavLinks,
} from "@/lib/nav/public-nav"

/**
 * The canonical public nav is the single source of truth for every public
 * header. These guards fail the build if a nav item points at a dead anchor,
 * loses a translation, or the CTA destinations drift — the "route clickability"
 * contract the whole refactor depends on.
 */
describe("canonical public navigation", () => {
    it("keeps the agreed order and keys", () => {
        expect(PUBLIC_NAV_ITEMS.map((item) => item.key)).toEqual([
            "product",
            "solutions",
            "guides",
            "company",
            "pricing",
        ])
    })

    it("every item has both Greek and English labels", () => {
        for (const item of PUBLIC_NAV_ITEMS) {
            expect(item.label.el.trim().length).toBeGreaterThan(0)
            expect(item.label.en.trim().length).toBeGreaterThan(0)
        }
    })

    it("every link destination is a real internal route (no dead anchors)", () => {
        for (const item of publicNavLinks()) {
            expect(item.href.startsWith("/"), `${item.key} must be an absolute internal path`).toBe(true)
            expect(item.href).not.toBe("#")
            expect(item.href).not.toBe("")
            expect(item.href).not.toContain("javascript:")
            expect(item.href).not.toContain(" ")
        }
    })

    it("exactly one dropdown item (Solutions), the rest are links", () => {
        const dropdowns = PUBLIC_NAV_ITEMS.filter((item) => item.kind === "dropdown")
        expect(dropdowns).toHaveLength(1)
        expect(dropdowns[0]?.key).toBe("solutions")
        expect(publicNavLinks()).toHaveLength(PUBLIC_NAV_ITEMS.length - 1)
    })

    it("CTAs are bilingual and route into the auth flow", () => {
        for (const cta of [PRIMARY_CTA, SECONDARY_CTA]) {
            expect(cta.href.startsWith("/auth/")).toBe(true)
            expect(cta.label.el.trim().length).toBeGreaterThan(0)
            expect(cta.label.en.trim().length).toBeGreaterThan(0)
        }
        expect(PRIMARY_CTA.href).toContain("/auth/signup")
        expect(SECONDARY_CTA.href).toBe("/auth/signin")
    })

    it("exposes a stable skip-link target id", () => {
        expect(SKIP_LINK_TARGET_ID).toBe("main-content")
    })
})
