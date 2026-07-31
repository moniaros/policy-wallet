/**
 * WP-23 — the trust page must be reachable, bilingual, and true.
 *
 * The product had no /security or /trust page at all. Its security posture was
 * asserted only by a chip row saying "AES-256" with nothing to link to, while
 * the platform genuinely does the hard parts — per-policy revocable agent
 * access, self-service Art. 15 export, erasure, an automated retention job,
 * documents served only through an authorizing route — and none of it was
 * visible to the people it was built for.
 *
 * The risk with such a page is the opposite one: overstating. A trust page is
 * the single page a sceptical reader checks against reality, so each claim here
 * is tied to code that exists. These tests guard that tie.
 */
import { existsSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const PAGE_SOURCE = readFileSync("components/legal/TrustPage.tsx", "utf-8")

/**
 * User-facing copy only. The file's own doc comment names the phrases the page
 * must avoid ("bank-grade" and friends) in order to explain why — scanning the
 * whole file would flag that explanation as the violation it warns against.
 */
const PAGE = PAGE_SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")

describe("trust page", () => {
    it("exists in both languages", () => {
        expect(existsSync("app/(public)/trust/page.tsx")).toBe(true)
        expect(existsSync("app/(public)/en/trust/page.tsx")).toBe(true)
    })

    it("is reachable anonymously", () => {
        // It exists to be read BEFORE signing up; a signin redirect would defeat
        // its entire purpose. proxy.ts redirects anything not allowlisted.
        expect(readFileSync("proxy.ts", "utf-8")).toContain('"/trust"')
    })

    it("carries every section in both Greek and English", () => {
        const el = [...PAGE.matchAll(/\bel:\s*"/g)].length
        const en = [...PAGE.matchAll(/\ben:\s*"/g)].length

        expect(el).toBeGreaterThan(10)
        expect(el).toBe(en)
    })

    it("claims only capabilities that exist in the codebase", () => {
        // Each assertion on the page maps to a shipped feature. If one of these
        // disappears, the page starts lying and this test says so.
        const backing: Array<[string, string]> = [
            ["per-policy revocable agent access", "lib/agent-visibility.ts"],
            ["separate AI-processing consent", "lib/ai-consent.ts"],
            ["self-service data export", "app/api/v1/me/data-export/route.ts"],
            ["erasure", "lib/services/gdpr-erasure.service.ts"],
            ["automated retention", "app/api/v1/jobs/privacy-retention/route.ts"],
            ["authorised document retrieval", "lib/supabase/storage-download.ts"],
        ]

        const missing = backing.filter(([, file]) => !existsSync(file)).map(([claim]) => claim)
        expect(missing, "the page claims these but the implementation is gone").toEqual([])
    })

    it("does not claim certifications or absolutes the product does not hold", () => {
        // The cheapest way for a trust page to become a liability.
        expect(PAGE).not.toMatch(/ISO\s?27001|SOC\s?2|PCI[- ]DSS/i)
        expect(PAGE).not.toMatch(/bank[- ]grade|military[- ]grade|unhackable|100% secure/i)
    })

    it("keeps the AI output framed as support rather than advice", () => {
        expect(PAGE).toMatch(/δεν αποτελ|not legal or insurance advice|does not advise/i)
    })

    it("links onward to the subprocessor list and the privacy policy", () => {
        expect(PAGE).toContain("/subprocessors")
        expect(PAGE).toContain("/privacy")
    })
})
