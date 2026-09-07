import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"

/**
 * Every reader of `gap_instances` excludes superseded rows (B0.1).
 *
 * The single writer no longer deletes a policy's previous findings; it marks
 * them `superseded` (status) with `supersededAt` set, and writes the new run's
 * rows. History therefore accumulates in the same table, and a reader that
 * used to see "everything for this policy" would now count or list rows from
 * runs that no longer speak for the policy. Goal 0 F5 was the symptom in the
 * other direction (a failed re-run leaving old rows unmarked); this is the
 * guard that keeps the fix from creating its mirror image.
 *
 * Rule, enumerated from disk over app/, components/ and lib/: every
 * `gapInstance.findMany / findFirst / count / groupBy` call and every
 * `gapInstances:` relation read must, within the lines that follow it, filter
 * on a status set (no live set contains "superseded"), on `supersededAt`, or
 * look a row up by id. Readers that deliberately include history are named
 * with their reason. A bare `gapInstances: true` include fails outright.
 */
const ROOT = process.cwd()

const READ_CALL = /\bgapInstance\s*\.\s*(findMany|findFirst|count|groupBy|aggregate)\s*\(/
// The PLURAL relation only. The singular `gapInstance:` include on an opportunity,
// a recommendation or a task fetches the ONE row that parent's own foreign key
// names — a by-reference read, where the parent's liveness is the filter — not a
// list of a policy's current findings (checked 2026-09-07: eight such sites, all FKs).
const RELATION_READ = /\bgapInstances\s*:\s*\{/
const BARE_INCLUDE = /\bgapInstances\s*:\s*true\b/
/** A call whose receiver ends one line and whose method opens the next (`db.gapInstance\n  .count(`). */
const SPLIT_RECEIVER = /\bgapInstance\s*$/
const SPLIT_METHOD = /^\s*\.\s*(findMany|findFirst|count|groupBy|aggregate)\s*\(/
/**
 * A LIVE set, not a status: `status: 'open'` alone under-counts (detected and
 * acknowledged rows are live too), `supersededAt: null` alone lists resolved
 * and dismissed rows as current, and a bare `status:` token could belong to a
 * sibling relation inside the same include (PW-BRIDGE-01 A-15 found all three
 * live). A read is live when it names the live set AND excludes superseded
 * rows, or looks a row up by id.
 */
const LIVE_SET = /\bstatus\s*:\s*\{\s*in\s*:\s*(?:\[\s*\.\.\.(?:OPEN_GAP_STATUSES|LIVE_GAP_STATUSES)\s*\]|\[\s*['"]open['"]\s*,\s*['"]detected['"]\s*,\s*['"]acknowledged['"]\s*\]|allowed)\s*\}/
const NOT_SUPERSEDED = /\bsupersededAt\s*:\s*null\b/
const BY_ID = /\bwhere\s*:\s*\{\s*id\s*:|\bid\s*:\s*(gapId|gapInstanceId|id|params\.id|input\.gapId)\b|\bid\s*:\s*\{\s*in\b/
const isLive = (window: string) => (LIVE_SET.test(window) && NOT_SUPERSEDED.test(window)) || BY_ID.test(window)

/** Files that read history on purpose, with the reason. */
const HISTORY_READERS: ReadonlyMap<string, string> = new Map([
    // R3: reads of gap rows live in ONE accessor. Its live paths filter through
    // `liveWhere` (asserted below); its history doors — readGapHistory /
    // countGapHistory — are the only unfiltered reads, used by the Art. 15
    // export, the admin totals and the resolved-findings achievement.
    ["lib/gaps/gap-rows.ts", "the accessor: live reads filter in liveWhere(); readGapHistory/countGapHistory are the named history doors"],
    ["lib/gaps/gap-instance-writer.ts", "the writer: reads the live rows it is about to supersede"],
])

const WINDOW_LINES = 80

/**
 * The text of ONE call or ONE relation object: from the first opening bracket
 * on the start line to its matching close (brace-matched, string-blind), capped
 * at WINDOW_LINES. A fixed 14-line window let a nested include whose `where`
 * sat further down escape, and let a sibling relation's `status:` inside the
 * same block excuse the read (PW-BRIDGE-01 A-15).
 */
function callWindow(lines: string[], start: number): string {
    const text = lines.slice(start, Math.min(lines.length, start + WINDOW_LINES)).join("\n")
    const open = text.search(/[({]/)
    if (open < 0) return lines[start]
    let depth = 0
    for (let i = open; i < text.length; i++) {
        const ch = text[i]
        if (ch === "(" || ch === "{" || ch === "[") depth++
        else if (ch === ")" || ch === "}" || ch === "]") {
            depth--
            if (depth === 0) return text.slice(0, i + 1)
        }
    }
    return text
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

const strip = (src: string) =>
    src
        .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
        .replace(/^(\s*)\/\/.*$/gm, "$1")

export interface ReaderViolation {
    line: number
    kind: "unfiltered_read" | "bare_include"
    text: string
}

export function findUnfilteredReaders(source: string): ReaderViolation[] {
    const lines = strip(source).split("\n")
    const out: ReaderViolation[] = []
    lines.forEach((line, i) => {
        if (BARE_INCLUDE.test(line)) {
            out.push({ line: i + 1, kind: "bare_include", text: line.trim().slice(0, 100) })
            return
        }
        const splitCall = SPLIT_RECEIVER.test(line) && SPLIT_METHOD.test(lines[i + 1] ?? "")
        if (!READ_CALL.test(line) && !RELATION_READ.test(line) && !splitCall) return
        const window = callWindow(lines, splitCall ? i + 1 : i)
        if (!isLive(window)) {
            out.push({ line: i + 1, kind: "unfiltered_read", text: line.trim().slice(0, 100) })
        }
    })
    return out
}

const FILES = ["app", "components", "lib"]
    .map((d) => path.join(ROOT, d))
    .filter((d) => {
        try {
            return statSync(d).isDirectory()
        } catch {
            return false
        }
    })
    .flatMap((d) => walk(d))
    .map((f) => path.relative(ROOT, f).replace(/\\/g, "/"))

const PROBES = path.join(ROOT, "tests/fixtures/guard-probes")
const probe = (name: string) => readFileSync(path.join(PROBES, name), "utf8")

describe("every gap-row reader excludes superseded rows (B0.1)", () => {
    it("enumerates a real universe with readers in it", () => {
        expect(FILES.length).toBeGreaterThan(400)
        const readers = FILES.filter((f) => {
            const src = strip(readFileSync(path.join(ROOT, f), "utf8"))
            return READ_CALL.test(src) || RELATION_READ.test(src)
        })
        // Since R3 the direct readers are the accessor and the writer; the rest
        // are relation includes on policy queries. The universe is still real.
        expect(readers.length).toBeGreaterThan(3)
        expect(readers).toContain("lib/gaps/gap-rows.ts")
    })

    it("is proven red on an unfiltered read and a bare include, green on a filtered one", () => {
        // Six red shapes, in file order: the unfiltered call, the bare include, a single
        // status, a sibling relation's status:, supersededAt alone, a call split across lines.
        expect(findUnfilteredReaders(probe("gap-reader-unfiltered.ts.txt")).map((v) => v.kind)).toEqual([
            "unfiltered_read",
            "bare_include",
            "unfiltered_read",
            "unfiltered_read",
            "unfiltered_read",
            "unfiltered_read",
        ])
        expect(findUnfilteredReaders(probe("gap-reader-filtered.ts.txt"))).toEqual([])
    })

    it("no reader outside the named history readers reads without a live filter", () => {
        const offenders: string[] = []
        for (const f of FILES) {
            if (HISTORY_READERS.has(f)) continue
            for (const v of findUnfilteredReaders(readFileSync(path.join(ROOT, f), "utf8"))) {
                offenders.push(`${f}:${v.line} [${v.kind}] ${v.text}`)
            }
        }
        expect(offenders, `gap rows read without excluding superseded history:\n${offenders.join("\n")}`).toEqual([])
    })

    it("the accessor's live path carries the B0 filter in code, not in each caller", () => {
        const src = readFileSync("lib/gaps/gap-rows.ts", "utf8")
        expect(src).toMatch(/function liveWhere[\s\S]*supersededAt: null/)
        expect(src).toMatch(/status: \{ in: allowed \}/)
    })

    it("every named history reader still exists and still reads", () => {
        for (const [f, why] of HISTORY_READERS) {
            const src = strip(readFileSync(path.join(ROOT, f), "utf8"))
            expect(READ_CALL.test(src) || RELATION_READ.test(src), `${f} (${why}) no longer reads gap rows — drop it from the list`).toBe(true)
        }
    })
})
