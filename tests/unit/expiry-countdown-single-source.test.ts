import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"

/**
 * Expiry countdowns come from ONE call — PW-BRIDGE-01 C-01 / C-02.
 *
 * CLAUDE.md: «Status, expiry and any countdown come from ONE call».
 * `resolvePolicyLifecycle(policy, now)` resolves the real end date (latest
 * renewal-history end → extracted envelope → the `endDate` column) and returns
 * the Athens day count, or null when no trustworthy date exists. The weekly
 * digest and the renewal cron each took `calendarDaysUntil(<row>.endDate, now)`
 * straight off the raw column, so a renewed policy was reminded about the OLD
 * period (PARITY A4 measured the customer at 2028-02-18 and the templates at
 * 2027-02-18), and lib/wallet/document-insights kept a hand-rolled third clock
 * that skipped renewal history.
 *
 * Two rules, guarded together:
 *  (a) the files whose whole job is the countdown carry the one call and no
 *      raw read — pinned by name, because a countdown taken from a LOCAL
 *      `endDate` variable (document-insights' shape) is invisible to (b);
 *  (b) an enumerated scan of app/, components/ and lib/ for a countdown taken
 *      off a `.endDate` property. Every remaining site is allowlisted with an
 *      exact count and the reason it is still there, so a new site — or a
 *      repaired one left in the list — fails. C-01b (2026-09-07) emptied the
 *      debt: the portfolio rules, the risk graph, the timeline, the comparison
 *      card and the agent urgency tier now receive the RESOLVED date under a
 *      name that says so (`coverageEndDate` / `expiresAt`);
 *  (c) an enumerated scan for an expiry WINDOW queried on the raw column
 *      (`endDate: { gte | lte | gt | lt … }` in a Prisma where). The churn email
 *      and the perk reminder admitted policies that way; the only place allowed
 *      to spell that fragment is `expiryWindowWhere` in lib/policy-status.ts,
 *      whose callers re-check through the lifecycle.
 */

const ROOT = process.cwd()

/** A countdown taken straight off a `.endDate` property — the raw column. */
export const RAW_COUNTDOWN = /calendarDaysUntil\(\s*(?:new Date\(\s*)?[\w$.]+\.endDate\b/

const stripComments = (src: string) =>
    src
        .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
        .replace(/^(\s*)\/\/.*$/gm, "$1")
        .replace(/\{\/\*[\s\S]*?\*\/\}/g, (m) => m.replace(/[^\n]/g, " "))

export function rawCountdownHits(src: string): number[] {
    const hits: number[] = []
    stripComments(src)
        .split("\n")
        .forEach((line, i) => {
            if (RAW_COUNTDOWN.test(line)) hits.push(i + 1)
        })
    return hits
}

interface SingleSourceRule {
    file: string
    must: RegExp[]
    mustNot: RegExp[]
}

/** (a) The files whose whole job is the countdown: one call, and no raw read. */
export const SINGLE_SOURCE_FILES: SingleSourceRule[] = [
    {
        file: "lib/services/renewal.service.ts",
        must: [
            /const lifecycle = resolvePolicyLifecycle\(row, now\)/,
            /const policy = \{ \.\.\.row, endDate: lifecycle\.endDate \}/,
            /closeSupersededRenewals\(db, row\.id, lifecycle\.endDate, true\)/,
            /expiryWindowWhere\(startOfToday, cutoff\)/,
        ],
        mustNot: [RAW_COUNTDOWN, /policyEndDate: row\.endDate/],
    },
    {
        file: "lib/services/weekly-digest.service.ts",
        must: [/resolvePolicyLifecycle\(r, now\)/, /expiryWindowWhere\(startOfAthensDay\(now\), thirtyDaysOut\)/, /acordData: true/],
        mustNot: [RAW_COUNTDOWN],
    },
    {
        file: "lib/wallet/document-insights.ts",
        must: [/resolvePolicyLifecycle\(policy/],
        mustNot: [/calendarDaysUntil\(/, /parseDocumentDate\(\s*policy\.endDate/],
    },
    {
        file: "app/(protected)/renewals/actions.ts",
        must: [/formatDate\(renewal\.policyEndDate, "el"\)/, /formatDate\(renewal\.policyEndDate, "en"\)/],
        mustNot: [/renewal\.policy\.endDate/],
    },
]

export function singleSourceOffences(src: string, rule: SingleSourceRule = SINGLE_SOURCE_FILES[0]): string[] {
    const code = stripComments(src)
    const out: string[] = []
    for (const re of rule.must) if (!re.test(code)) out.push(`missing ${re.source}`)
    for (const re of rule.mustNot) if (re.test(code)) out.push(`forbidden ${re.source}`)
    return out
}

/**
 * (b) Sites that still count from a raw `.endDate` property, with the exact
 * number of hits and the reason. Fewer hits than `count` fails too: a repaired
 * site must leave this list, or the list rots into an allowlist.
 */
export const RESIDUE: ReadonlyMap<string, { count: number; reason: string }> = new Map([
    ["lib/services/risk-dna/monitoring.ts", { count: 1, reason: "NOT debt: policies[].endDate is resolvePolicyLifecycle(p).endDate (risk-dna/service.ts builds the input from the lifecycle)." }],
])

/**
 * (c) An expiry window on the raw column inside a Prisma `where`. The helper
 * `expiryWindowWhere` (lib/policy-status.ts) is the ONE place that may spell it,
 * because it puts the resolved column first and the raw column only while the
 * resolved one is NULL — and its docblock binds callers to re-check in memory.
 */
export const RAW_WINDOW = /\bendDate\s*:\s*\{\s*(?:gte|gt|lte|lt)\b/g
export const RAW_WINDOW_OWNER = "lib/policy-status.ts"

export function rawWindowHits(src: string): number[] {
    const code = stripComments(src)
    const lines: number[] = []
    let m: RegExpExecArray | null
    RAW_WINDOW.lastIndex = 0
    while ((m = RAW_WINDOW.exec(code))) lines.push(code.slice(0, m.index).split("\n").length)
    return lines
}

function walk(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
        if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) continue
        const full = path.join(dir, entry)
        if (statSync(full).isDirectory()) walk(full, out)
        else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full)
    }
    return out
}

const FILES = ["app", "components", "lib"].map((d) => path.join(ROOT, d)).flatMap((d) => walk(d))
const PROBES = path.join(ROOT, "tests/fixtures/guard-probes")
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8")

describe("expiry countdowns come from the one lifecycle call (PW-BRIDGE-01 C-01 / C-02)", () => {
    it("enumerates a real universe", () => {
        expect(FILES.length).toBeGreaterThan(400)
    })

    it("is proven red on a raw-column countdown and green on the lifecycle", () => {
        const raw = readFileSync(path.join(PROBES, "expiry-countdown-raw-column.ts.txt"), "utf8")
        expect(rawCountdownHits(raw)).toHaveLength(2)
        expect(singleSourceOffences(raw)).not.toEqual([])
        const clean = readFileSync(path.join(PROBES, "expiry-countdown-lifecycle-clean.ts.txt"), "utf8")
        expect(rawCountdownHits(clean)).toEqual([])
        expect(rawWindowHits(clean)).toEqual([])
    })

    it("is proven red on an expiry window queried on the raw column", () => {
        const probe = readFileSync(path.join(PROBES, "expiry-window-raw-column.ts.txt"), "utf8")
        expect(rawWindowHits(probe)).toHaveLength(2)
        // The helper is the one place the raw column may take part in a window — and only
        // behind the NULL-column arm, never as the first arm.
        expect(read(RAW_WINDOW_OWNER)).toMatch(/\{ coverageEndDate: null, endDate: bounds \}/)
    })

    it.each(SINGLE_SOURCE_FILES.map((r) => [r.file, r] as const))("%s takes status, end date and countdown from the one call", (file, rule) => {
        expect(singleSourceOffences(read(file), rule), file).toEqual([])
    })

    it("every residue site still exists, with exactly the recorded number of raw countdowns", () => {
        for (const [rel, { count, reason }] of RESIDUE) {
            expect(() => statSync(path.join(ROOT, rel)), `${rel} no longer exists — remove it from RESIDUE`).not.toThrow()
            const hits = rawCountdownHits(read(rel))
            expect(hits.length, `${rel}: expected ${count} raw countdown(s) (${reason}); found lines ${hits.join(", ") || "none"}`).toBe(count)
        }
    })

    it("no file outside the residue list counts days from a raw .endDate", () => {
        const pinned = new Set(SINGLE_SOURCE_FILES.map((r) => r.file))
        const offenders: string[] = []
        for (const file of FILES) {
            const rel = path.relative(ROOT, file)
            if (RESIDUE.has(rel) || pinned.has(rel)) continue
            for (const line of rawCountdownHits(readFileSync(file, "utf8"))) offenders.push(`${rel}:${line}`)
        }
        expect(offenders, "a countdown off the raw column — resolve the lifecycle first, or record the site in RESIDUE with its reason").toEqual([])
    })

    it("no file but the helper queries an expiry window on the raw endDate column", () => {
        const offenders: string[] = []
        for (const file of FILES) {
            const rel = path.relative(ROOT, file)
            if (rel === RAW_WINDOW_OWNER) continue
            for (const line of rawWindowHits(readFileSync(file, "utf8"))) offenders.push(`${rel}:${line}`)
        }
        expect(offenders, "an expiry window on the raw column — spread expiryWindowWhere(from, to?) and re-check the rows with resolvePolicyLifecycle").toEqual([])
    })
})
