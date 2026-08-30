import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"

/**
 * The application-tier token contract (G2): what the JSON must carry so the
 * app can be built on roles alone, and what the generator must refuse.
 */
const prim = JSON.parse(readFileSync("tokens/primitives.json", "utf8"))
const sem = JSON.parse(readFileSync("tokens/semantic.json", "utf8"))
const css = readFileSync("app/grafi.css", "utf8")

describe("semantic roles the app needs", () => {
    const required = [
        "surface-base", "surface-raised", "surface-sunken", "surface-wash", "surface-inverse", "surface-overlay", "surface-blur",
        "fg-primary", "fg-secondary", "fg-faint", "fg-disabled", "fg-brand", "fg-on-brand",
        "border-subtle", "border-strong", "border-focus", "border-hair",
        "state-covered", "state-gap", "state-review",
        "action-primary-bg", "action-primary-hover", "action-secondary-bg", "action-secondary-border", "action-danger", "action-danger-hover",
    ]
    it("exist in BOTH themes — dark is a real second theme", () => {
        for (const r of required) {
            expect(sem.light[r], `light.${r}`).toBeTruthy()
            expect(sem.dark[r], `dark.${r}`).toBeTruthy()
        }
    })
    it("there are exactly three states and no fourth", () => {
        const states = Object.keys(sem.light).filter((k) => /^state-[a-z]+$/.test(k))
        expect(states.sort()).toEqual(["state-covered", "state-gap", "state-review"])
    })
    it("every text-bearing role is measured by at least one contrast check", () => {
        const measured = new Set(sem.contrastChecks.map((c: { fg: string }) => c.fg))
        for (const role of Object.keys(sem.light)) {
            if (/^(fg-|state-(covered|gap|review)$)/.test(role)) expect(measured.has(role), `${role} has no contrast check`).toBe(true)
        }
    })
    it("alpha roles resolve to composited colours and are never in a contrast check", () => {
        for (const role of ["border-hair", "surface-overlay", "surface-blur"]) {
            expect(sem.light[role]).toMatch(/^alpha:/)
            expect(sem.dark[role]).toMatch(/^alpha:/)
            expect(sem.contrastChecks.some((c: { fg: string; bg: string }) => c.fg === role || c.bg === role)).toBe(false)
            expect(css).toMatch(new RegExp(`--${role}: rgba?\\(`))
        }
    })
})

describe("primitives the app needs", () => {
    it("purpose-named radii beside the marketing size-named steps (A-10)", () => {
        expect(prim.radius).toMatchObject({ sm: "9px", md: "14px", lg: "22px", pill: "999px", control: "12px", card: "16px", sheet: "20px", hero: "26px" })
        for (const k of ["control", "card", "sheet", "hero"]) expect(css).toContain(`--radius-g-${k}:`)
    })
    it("flat is the default: exactly two elevations", () => {
        expect(Object.keys(prim.shadow).sort()).toEqual(["overlay", "raised"])
        expect(css).toContain("--shadow-g-raised:")
        expect(css).toContain("--shadow-g-overlay: var(--shadow-g-overlay)")
    })
    it("two curves: ease-out for everything, spring for presses", () => {
        expect(prim.ease.out).toBe("cubic-bezier(.2,.7,.2,1)")
        expect(prim.ease.spring).toBe("cubic-bezier(.34,1.3,.64,1)")
        expect(css).toContain("--ease-g-spring: var(--ease-spring-g)")
    })
    it("the app type steps carry their weight; body is 17px on phones and 16px from tablet up", () => {
        expect(prim.type["title-lg"]).toMatchObject({ size: "2.1rem", weight: "800" })
        expect(prim.type["title"]).toMatchObject({ size: "1.5rem", weight: "800" })
        expect(prim.type["heading"]).toMatchObject({ size: "1.15rem", weight: "700" })
        expect(prim.type["row"]).toMatchObject({ size: "1.02rem", weight: "600" })
        expect(prim.type["app-label"]).toMatchObject({ weight: "600", tracking: "0.06em" })
        expect(css).toContain("--text-g-title-lg--font-weight: 800;")
        expect(css).toMatch(/--text-g-app-base: 17px;[\s\S]*@media \(min-width: 768px\)[\s\S]*--text-g-app-base: 16px;/)
        expect(css).toMatch(/--space-app-section: 26px;[\s\S]*--space-app-section: 32px;/)
    })
    it("the alpha hairline is the brief's rgba(16,49,43,.12)", () => {
        expect(prim.alpha.hairline.replace(/\s/g, "")).toBe("rgba(16,49,43,0.12)")
    })
})

describe("the stylesheet is wired", () => {
    it("globals.css imports the app choreographies after the tokens", () => {
        const g = readFileSync("app/globals.css", "utf8")
        expect(g.indexOf('@import "./grafi.css"')).toBeLessThan(g.indexOf('@import "./grafi-app.css"'))
        expect(g).toContain("--font-display: var(--font-commissioner)")
    })
    it("the choreographies exist and every one has a reduced-motion final state", () => {
        const a = readFileSync("app/grafi-app.css", "utf8")
        for (const c of ["g-screen-enter", "g-ring-arc", "g-row-press", "g-sheet-present", "g-tier-reveal"]) expect(a).toContain(c)
        const reduced = a.slice(a.indexOf("prefers-reduced-motion"))
        for (const c of ["g-screen-enter", "g-ring-arc", "g-row-press", "g-sheet-present", "g-tier-reveal"]) expect(reduced).toContain(c)
    })
    it("one Inter and one Commissioner, both in the root layout, nowhere else", () => {
        const layout = readFileSync("app/layout.tsx", "utf8")
        expect(layout).toContain('Inter, Commissioner } from "next/font/google"')
        expect(layout).toContain('variable: "--font-commissioner"')
    })
})
