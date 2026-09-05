import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs"
import { join } from "node:path"
import {
    GAP_PROVENANCE,
    PROVENANCE_RANK,
    excludeUnderReview,
    mayCarryEmphasis,
    orderByProvenance,
    partitionByProvenance,
    provenanceOf,
    unmappedAuthoredSlugs,
} from "@/lib/gaps/provenance"
import { AUTHORED_GAP_DEFINITIONS } from "@/lib/gaps/authored-catalogue"
import { el } from "@/lib/i18n/translations/el"
import { en } from "@/lib/i18n/translations/en"

/**
 * B3 — requirement provenance (PW-TRANSPARENCY-02).
 *
 *  1. An authored slug missing from the map fails this test, and this test
 *     runs before the build in CI — an unmapped category is a build failure,
 *     never a silent default. Probe: an invented slug is reported.
 *  2. A classified entry must carry a citation and a reviewer; the agent ships
 *     everything `under_review` with `citation: null`.
 *  3. `under_review` is never counted in a summary and never reaches an email,
 *     a notification or a report: every outbound module that reads gap rows
 *     goes through `excludeUnderReview`, enumerated from disk with a probe.
 *  4. `market` copy prompts review and asserts no deficiency; labels are text.
 */
const OUTBOUND_ROOTS = ["lib/email", "lib/notifications", "lib/services/reports"]
const OUTBOUND_FILES = ["lib/services/weekly-digest.service.ts"]

function walk(dir: string, out: string[] = []): string[] {
    if (!existsSync(dir)) return out
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry)
        if (statSync(full).isDirectory()) walk(full, out)
        else if (/\.tsx?$/.test(entry)) out.push(full)
    }
    return out
}

/** A module that reads gap rows or takes decided gaps for rendering, without classifying them. */
export function readsGapsWithoutClassifying(src: string): boolean {
    const reads = /\b(db|prisma|tx)\.gapInstance\.(findMany|count|groupBy|findFirst)\(|\bdecidedGaps\b/.test(src)
    return reads && !src.includes("excludeUnderReview(")
}

describe("the map", () => {
    it("covers every authored slug — and reports an invented one (probe)", () => {
        expect(unmappedAuthoredSlugs()).toEqual([])
        expect(AUTHORED_GAP_DEFINITIONS.length).toBe(29)
        expect(unmappedAuthoredSlugs([...AUTHORED_GAP_DEFINITIONS, { slug: "probe_unmapped_slug" }])).toEqual(["probe_unmapped_slug"])
        // No stale entry either: the map names only authored slugs.
        const authored = new Set(AUTHORED_GAP_DEFINITIONS.map((d) => d.slug))
        for (const slug of Object.keys(GAP_PROVENANCE)) expect(authored.has(slug), `${slug} is mapped but not authored`).toBe(true)
    })

    it("ships unclassified: a classified entry must carry a citation and a reviewer", () => {
        for (const [slug, entry] of Object.entries(GAP_PROVENANCE)) {
            if (entry.provenance === "under_review") {
                expect(entry.citation, slug).toBeNull()
            } else {
                expect(entry.citation, `${slug} is classified without a citation`).toBeTruthy()
                expect(entry.reviewedBy, `${slug} is classified without a reviewer`).toBeTruthy()
            }
        }
        // An unknown (legacy / variant) slug is the conservative side, not a claim.
        expect(provenanceOf("no-glass-coverage")).toBe("under_review")
        expect(provenanceOf(null)).toBe("under_review")
    })

    it("ranks legislative, contractual, market, under review — and only the first two may carry emphasis", () => {
        expect(PROVENANCE_RANK.legislative).toBeLessThan(PROVENANCE_RANK.contractual)
        expect(PROVENANCE_RANK.contractual).toBeLessThan(PROVENANCE_RANK.market)
        expect(PROVENANCE_RANK.market).toBeLessThan(PROVENANCE_RANK.under_review)
        expect(mayCarryEmphasis("legislative")).toBe(true)
        expect(mayCarryEmphasis("contractual")).toBe(true)
        expect(mayCarryEmphasis("market")).toBe(false)
        expect(mayCarryEmphasis("under_review")).toBe(false)
    })

    it("partitions and orders stably; excludeUnderReview removes every finding that is not classified", () => {
        const items = AUTHORED_GAP_DEFINITIONS.map((d, i) => ({ slug: d.slug, i }))
        const groups = partitionByProvenance(items, (x) => x.slug)
        expect(groups.emphasised).toEqual([])
        expect(groups.market).toEqual([])
        expect(groups.underReview.map((x) => x.i)).toEqual(items.map((x) => x.i))
        expect(orderByProvenance(items, (x) => x.slug)).toEqual(items)
        expect(excludeUnderReview(items, (x) => x.slug)).toEqual([])
    })
})

describe("under review never reaches a summary, a notification, an email or a report", () => {
    it("every outbound module that reads gap rows classifies them first (enumerated from disk)", () => {
        const files = [...OUTBOUND_ROOTS.flatMap((r) => walk(r)), ...OUTBOUND_FILES].filter((f) => existsSync(f))
        expect(files.length).toBeGreaterThan(10)
        const offenders = files.filter((f) => readsGapsWithoutClassifying(readFileSync(f, "utf8")))
        expect(offenders, "outbound gap reads without excludeUnderReview()").toEqual([])
        // The known classifiers really are there.
        for (const f of ["lib/services/weekly-digest.service.ts", "lib/services/reports/savings-report.ts"]) {
            expect(readFileSync(f, "utf8"), f).toContain("excludeUnderReview(")
        }
    })

    it("PROBE: the matcher fires on an unfiltered read and not on a filtered one", () => {
        expect(readsGapsWithoutClassifying(readFileSync("tests/fixtures/guard-probes/under-review-unfiltered.ts.txt", "utf8"))).toBe(true)
        expect(readsGapsWithoutClassifying(readFileSync("tests/fixtures/guard-probes/under-review-filtered.ts.txt", "utf8"))).toBe(false)
    })

    it("the in-product summaries count classified findings only, and the findings list is sectioned by provenance", () => {
        expect(readFileSync("app/(protected)/dashboard/PolicyholderHome.tsx", "utf8")).toMatch(/partitionByProvenance\(/)
        expect(readFileSync("app/(protected)/dashboard/agent/page.tsx", "utf8")).toMatch(/excludeUnderReview\(/)
        expect(readFileSync("app/api/v1/policies/[id]/gaps/route.ts", "utf8")).not.toMatch(/by_severity/)
        const list = readFileSync("components/wallet/gap-report/GapReportList.tsx", "utf8")
        expect(list).toMatch(/partitionByProvenance\(/)
        expect(list).toMatch(/data-provenance=\{section\.provenance\}/)
        const widget = readFileSync("components/dashboard/home/CoverageGapsWidget.tsx", "utf8")
        expect(widget).toMatch(/gap\.underReviewOmitted/)
        expect(widget).not.toMatch(/counts\.underReview\}/)
    })
})

describe("the copy", () => {
    const DEFICIENCY = /σας λείπει|λείπει|δεν καλύπτεστε|είστε εκτεθειμ|ανασφάλιστ|you are missing|you lack|uncovered|you are exposed|uninsured/i
    it("market practice prompts review and asserts no deficiency; every class has a text label; nothing is colour", () => {
        for (const copy of [el.provenance, en.provenance]) {
            expect(copy.marketHeading).not.toMatch(DEFICIENCY)
            expect(copy.marketFraming).not.toMatch(DEFICIENCY)
            for (const key of ["legislative", "contractual", "market", "underReview"] as const) {
                expect(copy[key].length).toBeGreaterThan(3)
                expect(copy[key].length, copy[key]).toBeLessThanOrEqual(24)
            }
        }
        expect(readFileSync("components/gaps/provenance-label.ts", "utf8")).not.toMatch(/bg-|text-(red|amber|rose|orange|green)/)
    })
})
