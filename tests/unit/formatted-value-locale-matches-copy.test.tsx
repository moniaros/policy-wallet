/**
 * PW-CONTENT-01 Goal 1 — a formatted date or number takes the same locale as
 * the copy around it. A Greek sentence never carries an English date.
 *
 * Arms: (1) the one tag table — every formatter and the <html data-locale>
 * stamp resolve the same BCP-47 tag per language; (2) rendered: the pre-plan
 * sentence and the provenance date agree in both languages; (3) source: no
 * user-facing module hardcodes a locale tag or calls a bare toLocale*()
 * (browser locale). Enumerated from disk with reasoned exemptions; probe committed.
 */
import { describe, expect, it } from "vitest"
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import React from "react"
import { render } from "@testing-library/react"
import { resolveLocale, formatDate, formatCurrency } from "@/lib/i18n/format"
import { formatProvenanceDate } from "@/lib/gaps/findings-provenance"
import { CoverageComposition } from "@/components/gaps/CoverageComposition"
import { getTranslations } from "@/lib/i18n"

function walk(dir: string): string[] {
    if (!existsSync(dir)) return []
    return readdirSync(dir).flatMap((name) => {
        const p = join(dir, name)
        if (statSync(p).isDirectory()) return name === "node_modules" ? [] : walk(p)
        return /\.(tsx?)$/.test(p) ? [p] : []
    })
}

const GREEK_MONTH = /Ιανουαρίου|Φεβρουαρίου|Μαρτίου|Απριλίου|Μαΐου|Ιουνίου|Ιουλίου|Αυγούστου|Σεπτεμβρίου|Οκτωβρίου|Νοεμβρίου|Δεκεμβρίου/
const ENGLISH_MONTH = /January|February|March|April|May|June|July|August|September|October|November|December/

/** Internal or admin-only or bilingual-by-construction uses of a fixed tag. */
const HARDCODED_EXEMPT: Record<string, string> = {
    "lib/i18n/format.ts": "the tag table itself",
    "lib/policy-status.ts": "en-CA / sv-SE / en-US used to obtain ISO date parts and weekday keys on the Athens calendar — never rendered",
    "lib/notifications/orchestrator.ts": "date parts for a dedupe key, not copy",
    "lib/email/admin-emails.ts": "admin-only operational mail",
    "lib/services/gap-engine/portfolio-rules.ts": "formats el-GR AND en-GB explicitly into bilingual copy",
}
const HARDCODED = /Intl\.(?:DateTimeFormat|NumberFormat)\(\s*['"][a-z]{2}-[A-Z]{2}['"]|toLocale(?:Date|Time)?String\(\s*['"][a-z]{2}-[A-Z]{2}['"]|toLocale(?:Date|Time)?String\(\s*\)/
export function hardcodesLocale(src: string): boolean { return HARDCODED.test(src) }

describe("Goal 1 — one tag table", () => {
    it("formatters and the html stamp agree on the English tag (en-GB, not en-US)", () => {
        expect(resolveLocale("el")).toBe("el-GR")
        expect(resolveLocale("en")).toBe("en-GB")
        const provider = readFileSync("contexts/LanguageContext.tsx", "utf8")
        expect(provider).not.toMatch(/['"]en-US['"]/)
        expect(provider).toMatch(/setAttribute\('data-locale', resolveLocale\(language\)\)/)
    })
})

describe("Goal 1 — rendered: the date speaks the copy's language", () => {
    const at = new Date("2026-08-21T10:00:00Z")
    it.each([["el", GREEK_MONTH, ENGLISH_MONTH], ["en", ENGLISH_MONTH, GREEK_MONTH]] as const)("%s: pre-plan sentence + provenance date", (lang, own, other) => {
        const copy = getTranslations(lang).composition
        const label = formatProvenanceDate(at, lang)
        const { container } = render(<CoverageComposition composition={{ kind: "pre_plan", lineOfBusiness: "motor", runFinishedAt: at.toISOString(), runDateLabel: label }} copy={copy} />)
        const text = container.textContent || ""
        expect(text).toMatch(own)
        expect(text).not.toMatch(other)
        expect(formatDate(at, lang)).toBeTruthy()
        // the thousands separator is the locale's signature; the formatter rounds to whole euros by default
        expect(formatCurrency(1234.5, lang)).toMatch(lang === "el" ? /1\.235/ : /1,235/)
    })
})

describe("Goal 1 — source: no user-facing module hardcodes a locale or formats with the browser's", () => {
    const roots = ["app/(protected)", "app/(public)", "components", "lib/wallet", "lib/gaps", "lib/email", "lib/i18n", "lib/services/reports", "lib/notifications"]
    const files = roots.flatMap(walk).filter((f) => !/\/admin\//.test(f) && !(f in HARDCODED_EXEMPT))
    it("scans a meaningful universe", () => { expect(files.length).toBeGreaterThan(200) })
    it("no offender", () => {
        const offenders = files.filter((f) => hardcodesLocale(readFileSync(f, "utf8")))
        expect(offenders).toEqual([])
    })
    it("every exemption exists", () => { for (const f of Object.keys(HARDCODED_EXEMPT)) expect(existsSync(f), f).toBe(true) })
    it("the probe turns the scan red", () => {
        expect(hardcodesLocale(readFileSync("tests/fixtures/guard-probes/hardcoded-locale-format.tsx.txt", "utf8"))).toBe(true)
    })
})
