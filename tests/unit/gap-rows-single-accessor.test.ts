import { describe, expect, it } from "vitest"
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { recommendationIsClassified } from "@/lib/gaps/gap-rows"

/**
 * R3 (PW-TRANSPARENCY-02) — ONE accessor for gap rows.
 *
 * `lib/gaps/gap-rows.ts` is the only module that reads `gap_instances`; it
 * applies the B0 live-row filter and the B3 provenance rules. The writer keeps
 * its own read (it supersedes the rows it is about to replace). Nothing else may
 * call `gapInstance.findMany/count/groupBy/findFirst/findUnique/aggregate`, and
 * nothing may read `gapCount` off a `ProtectionScore` record: B1.7 removed the
 * score from every render, and a stored count surviving as a data source is how
 * V2's agent chip leaked under-review findings. Enumerated from disk; probes
 * committed for each pattern.
 */
const ROOTS = ["app", "components", "lib"]
const ACCESSOR = "lib/gaps/gap-rows.ts"
const EXEMPT: Record<string, string> = {
    [ACCESSOR]: "the accessor",
    "lib/gaps/gap-instance-writer.ts": "the ONE writer: reads the live rows it is about to supersede",
}
/** Files that may still read the score record's gapCount, each with the reason and the human item that retires it. */
const SCORE_GAPCOUNT_EXEMPT: Record<string, string> = {
    "lib/services/gap-engine/index.ts": "computes and caches the score record itself (dormant; H-001 / HANDOFF H3 decide its fate)",
    "app/api/v1/protection-score/route.ts": "pending deletion — BL-02 / H-T02 (external-consumer check)",
    "app/api/v1/customers/protection-scores/route.ts": "pending deletion — BL-02 / H-T02",
    "lib/services/compliance.service.ts": "the Art. 15 export: a person receives every stored field of their score record, gapCount included — an export, not a render or a count",
}

/** A reader of recommendation rows that lists, counts or feeds them must classify them (a gap-derived recommendation is the gap under another name). */
const REC_READ = /\b(db|prisma|tx)\.recommendationInstance\.(findMany|count|groupBy)\(/
const REC_EXEMPT: Record<string, string> = {
    "lib/services/compliance.service.ts": "the Art. 15 export returns every stored row",
    "lib/services/gap-engine/recommendation-generator.ts": "the generator's other read is the write path's dedupe over its own rows; the list read is classified (asserted below)",
}
const DIRECT_READ = /\b(db|prisma|tx|this\.db|client)\.gapInstance\.(findMany|count|groupBy|findFirst|findUnique|aggregate)\(/
const SCORE_READ = /protectionScore\.(findMany|findFirst|findUnique|findFirstOrThrow|findUniqueOrThrow)\(/
/** gapCount SELECTED from the record, or read as a member off a score-shaped variable. `facts.gapCount` computed from accessor rows is not a read of the record. */
const GAPCOUNT = /select:\s*\{[^}]*\bgapCount:\s*true|\b(score|scores|cached|protectionScore|scoreRecord|result\.protectionScore)\??\.gapCount\b/

function walk(dir: string, out: string[] = []): string[] {
    if (!existsSync(dir)) return out
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry)
        if (entry === "node_modules" || entry === ".next") continue
        if (statSync(full).isDirectory()) walk(full, out)
        else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full)
    }
    return out
}

export function readsGapRowsDirectly(src: string): boolean {
    return DIRECT_READ.test(src)
}
export function readsScoreGapCount(src: string): boolean {
    return SCORE_READ.test(src) && GAPCOUNT.test(src)
}

describe("gap rows have one accessor", () => {
    const files = ROOTS.flatMap((r) => walk(r))

    it("walks a real universe and the accessor exists", () => {
        expect(files.length).toBeGreaterThan(500)
        expect(existsSync(ACCESSOR)).toBe(true)
        for (const p of [...Object.keys(EXEMPT), ...Object.keys(SCORE_GAPCOUNT_EXEMPT)]) expect(existsSync(p), `${p} listed as exempt no longer exists — drop it`).toBe(true)
    })

    it("no module outside the accessor (and the writer) reads gap_instances", () => {
        const offenders = files.filter((f) => !(f in EXEMPT) && readsGapRowsDirectly(readFileSync(f, "utf8")))
        expect(offenders).toEqual([])
    })

    it("no module outside the named exemptions reads gapCount off a ProtectionScore record", () => {
        const offenders = files.filter((f) => !(f in SCORE_GAPCOUNT_EXEMPT) && readsScoreGapCount(readFileSync(f, "utf8")))
        expect(offenders).toEqual([])
    })

    it("every reader that lists, counts or feeds recommendation rows classifies them", () => {
        const offenders = files.filter((f) => !(f in REC_EXEMPT)).filter((f) => { const src = readFileSync(f, "utf8"); return REC_READ.test(src) && !src.includes("classifiedRecommendations(") })
        expect(offenders).toEqual([])
        expect(readFileSync("lib/services/gap-engine/recommendation-generator.ts", "utf8")).toMatch(/classifiedRecommendations\(await db\.recommendationInstance\.findMany/)
        expect(readFileSync("app/(protected)/dashboard/PolicyholderHome.tsx", "utf8")).toMatch(/classifiedRecommendations\(rows\)/)
        expect(readFileSync("lib/services/timeline/service.ts", "utf8")).toMatch(/classifiedRecommendations\(rows\)/)
    })

    it("PROBE: the recommendation classifier — a gap-derived row follows its gap; a profile rule is untouched; an unauthored concept is under review", () => {
        expect(recommendationIsClassified({ gapInstanceId: "g1", gapInstance: { definition: { slug: "no_glass_breakage_cover" } } })).toBe(false)
        expect(recommendationIsClassified({ ruleId: "mortgage_no_life" })).toBe(true)
        expect(recommendationIsClassified({ ruleId: "policy_gap:motor:glass-breakage" })).toBe(false)
        expect(recommendationIsClassified({ ruleId: "policy_gap:motor:something-nobody-authored" })).toBe(false)
    })

    it("the accessor applies both rules: supersededAt null and a live status, and drops under_review for a classified read", () => {
        const src = readFileSync(ACCESSOR, "utf8")
        expect(src).toMatch(/supersededAt: null/)
        expect(src).toMatch(/LIVE_GAP_STATUSES/)
        expect(src).toMatch(/isClassified\(r\.provenance\)/)
        expect(src).toMatch(/scope === "classified"/)
    })

    it("PROBES: each matcher fires on its fixture and neither fires on the clean one", () => {
        expect(readsGapRowsDirectly(readFileSync("tests/fixtures/guard-probes/gap-rows-direct-read.ts.txt", "utf8"))).toBe(true)
        expect(readsScoreGapCount(readFileSync("tests/fixtures/guard-probes/protection-score-gapcount-read.ts.txt", "utf8"))).toBe(true)
        const clean = readFileSync("tests/fixtures/guard-probes/gap-rows-clean.ts.txt", "utf8")
        expect(readsGapRowsDirectly(clean)).toBe(false)
        expect(readsScoreGapCount(clean)).toBe(false)
    })
})
