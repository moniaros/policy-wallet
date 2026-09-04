import { describe, expect, it } from "vitest"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

import {
    AREAS,
    AREA_IDS,
    AREA_ORDER,
    areaForLob,
    areaForRisk,
    areasForDomain,
    type AttentionArea,
} from "@/lib/protection/domains"
import { EVENT_DOMAINS } from "@/lib/services/life-events/types"
import { EVENT_DOMAIN_LABELS } from "@/lib/services/life-events/registry"
import { RISK_CATALOG } from "@/lib/services/gap-engine/risk-catalog"
import { WRITE_BRANCH_IDS, getBranch } from "@/lib/insurance/taxonomy"

/**
 * One vocabulary — docs/planning/PERSONAL_RISK_PROFILE.md §C.
 *
 * `lib/protection/domains.ts` is the only place that says which attention area
 * a catalogue risk or a line of business belongs to. This file proves three
 * things about it and one thing about everything else:
 *
 *   1. every catalogue risk belongs to exactly one area — the catalogue is
 *      enumerated from disk, so a risk added to the file cannot go unplaced;
 *   2. every writable line of business (and every line the catalogue can name)
 *      belongs to exactly one area;
 *   3. the table's own invariants: domains in EVENT_DOMAINS, both labels, the
 *      registry's label reused where the area is a domain, stable row ids;
 *   4. no other file under lib/ or components/ keeps its own line→area or
 *      risk→area literal table — the shape `PRIORITY_LOBS` had before this.
 *
 * The scanner in (4) is proven against committed probe fixtures below
 * (CLAUDE.md: "a guard without a probe in the repo is not a guard").
 */

const TABLE = "lib/protection/domains.ts"
const CATALOGUE = "lib/services/gap-engine/risk-catalog.ts"
const CONTRACT_AREAS = ["household", "income", "debt", "retirement", "residence", "property", "mobility", "work", "health", "lifestyle"]
const SCORE_CATEGORIES = ["health", "life", "property", "income", "liability", "other"]
const MONEY_AREAS = ["income", "debt", "retirement"]

const allAreas: AttentionArea[] = AREA_IDS.map((id) => AREAS[id])
const areasHolding = (pick: (a: AttentionArea) => readonly string[], value: string) =>
    allAreas.filter((a) => pick(a).includes(value)).map((a) => a.id)

const catalogueIds = RISK_CATALOG.map((r) => r.id)
const catalogueLines = [...new Set(RISK_CATALOG.flatMap((r) => [r.lineOfBusiness, ...(r.alsoCoveredBy ?? [])]))]

// ─── 3. The table's own invariants ──────────────────────────────────────────

describe("the attention-area table", () => {
    it("names the contract's ten areas, once each, in the contract's order", () => {
        expect([...AREA_IDS]).toEqual(CONTRACT_AREAS)
        expect(Object.keys(AREAS).sort()).toEqual([...AREA_IDS].sort())
        for (const id of AREA_IDS) expect(AREAS[id].id).toBe(id)
    })

    it("every area's domain is a life-event sphere, and every sphere has an area", () => {
        for (const area of allAreas) expect(EVENT_DOMAINS, area.id).toContain(area.domain)
        for (const domain of EVENT_DOMAINS) {
            const ids = areasForDomain(domain).map((a) => a.id)
            expect(ids.length, domain).toBeGreaterThan(0)
            if (domain === "money") expect(ids).toEqual(MONEY_AREAS)
            else expect(ids).toEqual([domain])
        }
    })

    it("carries both labels, reusing the registry's own where the area is a domain", () => {
        for (const area of allAreas) {
            expect(area.label.el.trim().length, area.id).toBeGreaterThan(0)
            expect(area.label.en.trim().length, area.id).toBeGreaterThan(0)
            if ((EVENT_DOMAINS as readonly string[]).includes(area.id)) {
                // By reference: a copy would be a second spelling waiting to drift.
                expect(area.label, area.id).toBe(EVENT_DOMAIN_LABELS[area.domain])
            }
        }
        // The map's money-row wording, as the onboarding already renders it.
        expect(AREAS.income.label).toEqual({ el: "Εισόδημα", en: "Income" })
        expect(AREAS.debt.label).toEqual({ el: "Δάνειο και υποχρεώσεις", en: "Loans and commitments" })
        expect(AREAS.retirement.label).toEqual({ el: "Σύνταξη", en: "Retirement" })
    })

    it("money areas carry their facet and the map's `money:<facet>` row id; the rest carry the domain", () => {
        for (const area of allAreas) {
            if (MONEY_AREAS.includes(area.id)) {
                expect(area.domain, area.id).toBe("money")
                expect(area.facet, area.id).toBe(area.id)
                expect(area.priorityId, area.id).toBe(`money:${area.id}`)
            } else {
                expect(area.facet, area.id).toBeUndefined()
                expect(area.priorityId, area.id).toBe(area.domain)
            }
        }
        // Stored in protection_profiles.priorityAreas — a duplicate would be ambiguous data.
        expect(new Set(allAreas.map((a) => a.priorityId)).size).toBe(allAreas.length)
    })

    it("AREA_ORDER is a permutation of the vocabulary", () => {
        expect([...AREA_ORDER].sort()).toEqual([...AREA_IDS].sort())
        expect(AREA_ORDER.length).toBe(10)
    })

    it("every scoreCategory is a protection-score bucket", () => {
        for (const area of allAreas) expect(SCORE_CATEGORIES, area.id).toContain(area.scoreCategory)
    })
})

// ─── 1. Every catalogue risk belongs to exactly one area ─────────────────────

describe("every catalogue risk belongs to exactly one area", () => {
    const onDisk = [...readFileSync(CATALOGUE, "utf-8").matchAll(/^ {8}id: "([a-z_]+)",$/gm)].map((m) => m[1])

    it("enumerates the catalogue from disk and sees what the module exports", () => {
        // Floor: a collapsed enumeration (an indentation change, a regex that
        // stops matching) must not pass as "nothing to place".
        expect(onDisk.length).toBeGreaterThanOrEqual(20)
        expect([...onDisk].sort()).toEqual([...catalogueIds].sort())
    })

    it("places each risk in exactly one area, and areaForRisk agrees", () => {
        for (const id of onDisk) {
            const holders = areasHolding((a) => a.riskIds, id)
            expect(holders, `${id} must belong to exactly one area`).toHaveLength(1)
            expect(areaForRisk(id)?.id, id).toBe(holders[0])
        }
    })

    it("names no risk the catalogue does not have", () => {
        for (const area of allAreas) {
            for (const riskId of area.riskIds) expect(catalogueIds, `${area.id}.riskIds`).toContain(riskId)
        }
        expect(areaForRisk("no_such_risk")).toBeUndefined()
    })
})

// ─── 2. Every writable line of business belongs to exactly one area ─────────

describe("every line of business belongs to exactly one area", () => {
    it("places every WRITE_BRANCH_IDS entry once, and areaForLob agrees", () => {
        expect(WRITE_BRANCH_IDS.length).toBeGreaterThanOrEqual(30)
        for (const lob of WRITE_BRANCH_IDS) {
            const holders = areasHolding((a) => a.lobFamilies, lob)
            expect(holders, `${lob} must belong to exactly one area`).toHaveLength(1)
            expect(areaForLob(lob)?.id, lob).toBe(holders[0])
        }
    })

    it("lists only real taxonomy branches, each once", () => {
        const seen = new Map<string, string>()
        for (const area of allAreas) {
            for (const lob of area.lobFamilies) {
                expect(getBranch(lob), `${area.id}.lobFamilies names ${lob}, which the taxonomy does not have`).toBeDefined()
                expect(seen.get(lob), `${lob} is listed under both ${seen.get(lob)} and ${area.id}`).toBeUndefined()
                seen.set(lob, area.id)
            }
        }
    })

    it("resolves every line the catalogue can name — primary and alsoCoveredBy", () => {
        expect(catalogueLines.length).toBeGreaterThanOrEqual(15)
        for (const line of catalogueLines) expect(areaForLob(line)?.id, line).toBeDefined()
    })

    it("resolves the lines that used to fall through the tie-break", () => {
        expect(areaForLob("group_health")?.id).toBe("health")
        expect(areaForLob("roadside")?.id).toBe("mobility")
        expect(areaForLob("pension")?.id).toBe("retirement")
        expect(areaForLob("cyber")?.id).toBe("lifestyle")
    })

    it("accepts a suffixed or upper-cased line, climbs an unlisted child to its family, and refuses the unknown", () => {
        expect(areaForLob("MOTOR:own-damage")?.id).toBe("mobility")
        expect(areaForLob("home/earthquake")?.id).toBe("residence")
        // Not writable, not listed, child of `business` in the taxonomy.
        expect(getBranch("technical_works")?.parentId).toBe("business")
        expect(areaForLob("technical_works")?.id).toBe("work")
        expect(areaForLob("")).toBeUndefined()
        expect(areaForLob(null)).toBeUndefined()
        expect(areaForLob("no_such_line")).toBeUndefined()
    })
})

// ─── 4. Source guard: no second table ────────────────────────────────────────

/**
 * A "table" is two or more distinct literal pairs, in either direction:
 *   line-or-risk  : "area"            — `motor: "mobility"`, `life_dependents: "household"`
 *   area          : "line-or-risk"    — `mobility: "motor"`
 *   area          : ["line-or-risk"   — `mobility: ["motor", …]` (the PRIORITY_LOBS shape)
 * The vocabularies are enumerated from the modules, never typed here, so a new
 * line or risk widens the net. ONE pair is not a table: `health: "health"` is
 * also how an i18n section key looks (lib/wallet/coverage-sections.ts).
 */
const LINE_WORDS = [...new Set([...WRITE_BRANCH_IDS, ...allAreas.flatMap((a) => [...a.lobFamilies]), ...catalogueLines])]
const RISK_WORDS = catalogueIds
const AREA_WORDS = [...new Set([...EVENT_DOMAINS, ...AREA_IDS, ...allAreas.map((a) => a.priorityId)])]

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
// Longest first so `income` never wins inside `income_protection`.
const alternation = (words: string[]) => [...words].sort((a, b) => b.length - a.length).map(escape).join("|")
const LINE_OR_RISK = alternation([...new Set([...LINE_WORDS, ...RISK_WORDS])])
const AREA = alternation(AREA_WORDS)
const KEY = `(?<![\\w$.])["']?`
const PAIR_MATCHERS = [
    new RegExp(`${KEY}(${LINE_OR_RISK})["']?\\s*:\\s*["'](${AREA})["']`, "g"),
    new RegExp(`${KEY}(${AREA})["']?\\s*:\\s*["'](${LINE_OR_RISK})["']`, "g"),
    new RegExp(`${KEY}(${AREA})["']?\\s*:\\s*\\[\\s*["'](${LINE_OR_RISK})["']`, "g"),
]

function stripComments(src: string): string {
    return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1")
}

export function literalTablePairs(src: string): Set<string> {
    const pairs = new Set<string>()
    for (const re of PAIR_MATCHERS) {
        for (const m of src.matchAll(re)) pairs.add(`${m[1]}->${m[2]}`)
    }
    return pairs
}

const keepsOwnTable = (src: string) => literalTablePairs(src).size >= 2

function walk(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
        const path = join(dir, entry)
        if (statSync(path).isDirectory()) {
            if (entry === "node_modules" || entry === ".next") continue
            walk(path, out)
        } else if (/\.(ts|tsx)$/.test(entry) && !/\.d\.ts$/.test(entry)) {
            out.push(path)
        }
    }
    return out
}

describe("no other file keeps its own line→area or risk→area table", () => {
    const files = [...walk("lib"), ...walk("components")]

    it("walks the real universe", () => {
        expect(files.length).toBeGreaterThan(200)
        expect(files).toContain("lib/services/protection-profile/derive-priorities.ts")
        expect(files).toContain("lib/services/gap-engine/recommendation-generator.ts")
        expect(files).toContain(TABLE)
    })

    it("finds no second table under lib/ or components/", () => {
        const offenders = files
            .filter((file) => file !== TABLE)
            .map((file) => ({ file, pairs: literalTablePairs(stripComments(readFileSync(file, "utf-8"))) }))
            .filter(({ pairs }) => pairs.size >= 2)
            .map(({ file, pairs }) => `${file}: ${[...pairs].join(", ")}`)
        expect(
            offenders,
            `These files map lines or risks to areas on their own. Read the answer from ` +
                `areaForLob / areaForRisk / AREAS in ${TABLE} instead — the only file allowed to know:\n  ` +
                offenders.join("\n  ")
        ).toEqual([])
    })
})

describe("the scanner is proven against committed probes", () => {
    const probe = (name: string) => stripComments(readFileSync(`tests/fixtures/guard-probes/${name}`, "utf-8"))

    it("flags the exact PRIORITY_LOBS table this guard buried", () => {
        const pairs = literalTablePairs(probe("protection-domains-priority-lobs.ts.txt"))
        expect(pairs).toContain("mobility->motor")
        expect(pairs).toContain("money:income->income_protection")
        expect(keepsOwnTable(probe("protection-domains-priority-lobs.ts.txt"))).toBe(true)
    })

    it("flags a line→domain map and a risk→domain map", () => {
        const pairs = literalTablePairs(probe("protection-domains-lob-to-domain.ts.txt"))
        expect(pairs).toContain("motor->mobility")
        expect(pairs).toContain("life_dependents->household")
        expect(keepsOwnTable(probe("protection-domains-lob-to-domain.ts.txt"))).toBe(true)
    })

    it("does NOT flag a compliant surface full of near-miss shapes", () => {
        const src = probe("protection-domains-compliant.ts.txt")
        // The probe genuinely carries the risky tokens — a label map keyed by
        // domain, a taxonomy scoreCategory, ONE coincidental i18n pair — so this
        // proves discrimination, not absence.
        expect(src).toMatch(/health:\s*"health"/)
        expect(src).toMatch(/scoreCategory:\s*"property"/)
        expect(src).toMatch(/areaForLob\(/)
        expect(literalTablePairs(src).size).toBe(1)
        expect(keepsOwnTable(src)).toBe(false)
    })

    it("ignores mentions inside comments", () => {
        const commented = `
            // const PRIORITY_LOBS = { mobility: ["motor"], residence: ["home"] }
            /* const LOB_DOMAIN = { motor: "mobility", home: "residence" } */
            export {}
        `
        expect(literalTablePairs(stripComments(commented)).size).toBe(0)
    })
})
