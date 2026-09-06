/**
 * PW-CONTENT-01 Goal 1 — ONE resolved locale per request.
 *
 * The B2B customer-policy view rendered a Greek pre-plan sentence with an
 * English date: the server half read the stored preference, the client card
 * read the client context, which starts at Greek and then reads localStorage.
 * The fix is structural, not per view: every authenticated layout resolves
 * the language ONCE with resolveUserLanguage and seeds the client provider
 * with it, and a seeded provider never lets localStorage win over the server.
 *
 * Three arms: the layouts (source, enumerated), the provider (rendered), and
 * every surface Step 0 found where a server string and a client string share
 * a view — each must sit under a seeded layout.
 */
import { describe, expect, it, vi, beforeEach } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import React from "react"
import { act, render } from "@testing-library/react"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }), usePathname: () => "/" }))

import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext"

/** A layout that mounts the dictionary must seed the client provider from the one resolver. */
export function mountsSeededProvider(src: string): boolean {
    if (!/<TranslationsProvider>/.test(src)) return true // no dictionary, nothing to seed
    const resolves = /resolveUserLanguage\(/.test(src)
    const seeds = /<LanguageProvider initialLanguage=\{/.test(src)
    return resolves && seeds
}

const AUTHENTICATED_LAYOUTS = ["app/(protected)/layout.tsx", "app/onboarding/layout.tsx"]

// Step 0 finding C7: server surfaces that render a useLanguage() client component.
const MEETING_SURFACES = [
    "app/(protected)/customers/[id]/policy/[policyId]/page.tsx",
    "app/(protected)/insights/page.tsx",
    "app/(protected)/collaboration/threads/[id]/page.tsx",
    "app/(protected)/tasks/page.tsx",
    "app/(protected)/tasks/[id]/page.tsx",
    "app/(protected)/notifications/page.tsx",
    "app/(protected)/layout.tsx",
    "app/(protected)/wallet/page.tsx",
    "app/(protected)/wallet/[id]/page.tsx",
    "app/(protected)/wallet/[id]/edit/page.tsx",
    "app/(protected)/protection/page.tsx",
    "app/(protected)/benefits/page.tsx",
]

describe("Goal 1 — the layouts seed the client provider from the one resolver", () => {
    it.each(AUTHENTICATED_LAYOUTS)("%s resolves once and seeds", (p) => {
        const src = readFileSync(p, "utf8")
        expect(mountsSeededProvider(src), p).toBe(true)
        // and it never normalises the stored preference by hand
        expect(src).not.toMatch(/preferredLanguage as ['"]e[ln]|preferredLanguage === ['"]en['"] \?|preferredLanguage \|\| ['"]e[ln]['"]/)
    })
    it("the probe (dictionary mounted, provider unseeded) turns the scan red", () => {
        expect(mountsSeededProvider(readFileSync("tests/fixtures/guard-probes/layout-unseeded-provider.tsx.txt", "utf8"))).toBe(false)
    })
    it("every server+client surface from Step 0 sits under a seeded authenticated layout and reads the resolver", () => {
        for (const p of MEETING_SURFACES) {
            expect(existsSync(p), p).toBe(true)
            expect(p.startsWith("app/(protected)/"), p).toBe(true)
            const src = readFileSync(p, "utf8")
            if (/preferredLanguage/.test(src)) expect(src, p).toMatch(/resolveUserLanguage\(/)
        }
    })
})

function Probe() {
    const { language } = useLanguage()
    return <span data-testid="lang">{language}</span>
}

describe("Goal 1 — a seeded provider: the server wins, and follows the server", () => {
    beforeEach(() => { try { localStorage.clear() } catch { /* jsdom */ } })

    it("seeded 'en' with localStorage 'el' renders 'en' (the server value is the truth)", async () => {
        localStorage.setItem("language", "el")
        const { getByTestId } = render(<LanguageProvider initialLanguage="en"><Probe /></LanguageProvider>)
        await act(async () => {})
        expect(getByTestId("lang").textContent).toBe("en")
        expect(localStorage.getItem("language")).toBe("en") // mirrored, so the public tree agrees
    })
    it("follows a new server value after a toggle re-render", async () => {
        const { getByTestId, rerender } = render(<LanguageProvider initialLanguage="en"><Probe /></LanguageProvider>)
        await act(async () => {})
        rerender(<LanguageProvider initialLanguage="el"><Probe /></LanguageProvider>)
        await act(async () => {})
        expect(getByTestId("lang").textContent).toBe("el")
    })
    it("an UNSEEDED provider (the public tree, no user) still honours the visitor's stored choice", async () => {
        localStorage.setItem("language", "en")
        const { getByTestId } = render(<LanguageProvider><Probe /></LanguageProvider>)
        await act(async () => {})
        expect(getByTestId("lang").textContent).toBe("en")
    })
    it("nested: an unseeded root provider around a seeded 'en' provider — the SEEDED value stamps <html lang> (the root yields)", async () => {
        document.documentElement.setAttribute("lang", "el")
        const { getByTestId, unmount } = render(<LanguageProvider><LanguageProvider initialLanguage="en"><Probe /></LanguageProvider></LanguageProvider>)
        await act(async () => {})
        expect(getByTestId("lang").textContent).toBe("en")
        expect(document.documentElement.lang).toBe("en")
        expect(document.documentElement.getAttribute("data-locale")).toBe("en-GB")
        expect(document.documentElement.dataset.langOwner).toBe("seeded")
        unmount()
        expect(document.documentElement.dataset.langOwner).toBeUndefined()
    })

    it("an unseeded provider defaults to Greek", async () => {
        const { getByTestId } = render(<LanguageProvider><Probe /></LanguageProvider>)
        await act(async () => {})
        expect(getByTestId("lang").textContent).toBe("el")
    })
})
