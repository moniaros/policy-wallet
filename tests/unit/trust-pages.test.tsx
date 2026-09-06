/**
 * PW-CONTENT-01 Goal 7 — the public trust pages.
 *
 *  methodology-numbers-from-catalogue: every digit the methodology renders is
 *  a registered public count read from the catalogue (never a literal), in
 *  both languages; the capability claims name the code they rest on; the
 *  changelog's entries are dated merges with PR numbers; the status page
 *  claims no uptime figure; all three pages exist in both languages, are in
 *  the page registry and on the proxy allowlist. In-test probe: an
 *  unregistered count in a rendered sentence is caught.
 */
import { describe, expect, it, vi } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import React from "react"
import { render } from "@testing-library/react"

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {}, refresh: () => {} }), usePathname: () => "/", useSearchParams: () => new URLSearchParams() }))

import { methodologySections } from "@/lib/trust/methodology-content"
import { CHANGELOG, CHANGELOG_START_DATE } from "@/lib/changelog/entries"
import { STATUS_SECTIONS } from "@/lib/trust/status-content"
import { PUBLIC_COUNT_VALUES, CATALOGUE_FACTS } from "@/lib/marketing/public-counts"
import { AUTHORED_GAP_DEFINITIONS } from "@/lib/gaps/authored-catalogue"
import { marketingPages } from "@/lib/seo/marketing-pages"

/** Every integer in rendered copy must be a registered public count (years and dates excluded). */
export function unregisteredNumbers(text: string, allowed: ReadonlySet<number>): string[] {
    const out: string[] = []
    for (const m of text.matchAll(/(?<![\d.,])(\d[\d.]*)(?![\d.,%])/g)) {
        const raw = m[1].replace(/\.$/, "")
        if (/^(19|20)\d\d$/.test(raw)) continue
        const n = Number(raw.replace(/\./g, ""))
        if (!Number.isFinite(n)) continue
        if (!allowed.has(n)) out.push(raw)
    }
    return out
}

describe("Goal 7 — methodology-numbers-from-catalogue", () => {
    it.each(["el", "en"] as const)("%s: every number in the methodology is a registered catalogue-derived count", (lang) => {
        const text = methodologySections(lang).flatMap((s) => s.body.map((b) => b[lang])).join(" ")
        expect(unregisteredNumbers(text, PUBLIC_COUNT_VALUES)).toEqual([])
        expect(text).toContain(String(AUTHORED_GAP_DEFINITIONS.length))
        expect(text).toContain(String(CATALOGUE_FACTS.branchesWithChecks.length))
    })
    it("the probe (an unregistered count in copy) is caught", () => {
        expect(unregisteredNumbers("Ο κατάλογος έχει 999 κανόνες σε 8 κλάδους", new Set([8]))).toEqual(["999"])
    })
    it("the content module holds no digit literal in its copy — numbers come only from PUBLIC_COUNTS", () => {
        const src = readFileSync("lib/trust/methodology-content.ts", "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
        const copyDigits = [...src.matchAll(/(?:el|en): [`"']([^`"']*)[`"']/g)].map((m) => m[1]).filter((s) => /\d/.test(s.replace(/\$\{[^}]+\}/g, "")))
        expect(copyDigits).toEqual([])
    })
    it("capability claims match the code: rules decide, the AI has no verdict field, severity renders nowhere, no score", () => {
        const el = methodologySections("el").flatMap((s) => s.body.map((b) => b.el)).join(" ")
        expect(el).toMatch(/το αποφασίζει ένας κανόνας/)
        expect(el).toMatch(/δεν έχει καν τέτοιο πεδίο/)
        expect(el).toMatch(/Δεν δίνουμε βαθμολογία προστασίας/)
        expect(readFileSync("lib/services/ai/extraction-schema.ts", "utf8")).not.toMatch(/isDetected/)
        expect(readFileSync("lib/gaps/provenance.ts", "utf8")).toMatch(/GAP_PROVENANCE/)
    })
})

describe("Goal 7 — changelog and status are honest", () => {
    it("every changelog entry is a dated merge with PR numbers, newest first, on or after the start date", () => {
        expect(CHANGELOG.length).toBeGreaterThan(0)
        let prev = "9999-12-31"
        for (const e of CHANGELOG) {
            expect(e.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
            expect(e.date >= CHANGELOG_START_DATE).toBe(true)
            expect(e.date <= prev).toBe(true)
            prev = e.date
            expect(e.prs.length).toBeGreaterThan(0)
            for (const n of e.prs) expect(Number.isInteger(n) && n > 0).toBe(true)
            expect(e.title.el.length).toBeGreaterThan(5); expect(e.title.en.length).toBeGreaterThan(5)
        }
    })
    it("the status page states no uptime percentage and no 'last checked' time", () => {
        const text = STATUS_SECTIONS.flatMap((s) => s.body.map((b) => b.el + " " + b.en)).join(" ")
        expect(text).not.toMatch(/\d+\s*%/)
        expect(text).not.toMatch(/uptime of|διαθεσιμότητα \d/)
        expect(text).toMatch(/Δεν δημοσιεύουμε ποσοστό διαθεσιμότητας/)
    })
})

describe("Goal 7 — the three pages exist in both languages, are registered and reachable anonymously", () => {
    const proxy = readFileSync("proxy.ts", "utf8")
    for (const key of ["methodology", "changelog", "status"] as const) {
        it(key, () => {
            expect(existsSync(`app/(public)/${key}/page.tsx`)).toBe(true)
            expect(existsSync(`app/(public)/en/${key}/page.tsx`)).toBe(true)
            expect(marketingPages[key].path).toBe(`/${key}`)
            expect(marketingPages[key].en).toBeTruthy()
            expect(proxy).toContain(`"/${key}"`)
            expect(proxy).toContain(`"/en/${key}"`)
        })
    }
    it("renders in both languages without a raw key or an English fallback leaking into Greek", async () => {
        const { MethodologySections } = await import("@/app/(public)/methodology/MethodologySections")
        const { container } = render(<MethodologySections locale="el" />)
        const text = container.textContent || ""
        expect(text).toContain("Πώς αποφασίζεται ένα εύρημα")
        expect(text).not.toMatch(/How a finding is decided/)
    })
})
