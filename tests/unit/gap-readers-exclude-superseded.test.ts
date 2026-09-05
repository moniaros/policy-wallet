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
const RELATION_READ = /\bgapInstances\s*:\s*\{/
const BARE_INCLUDE = /\bgapInstances\s*:\s*true\b/
const FILTERED = /\bstatus\s*:|\bsupersededAt\b|\bwhere\s*:\s*\{\s*id\s*:|\bid\s*:\s*(gapId|gapInstanceId|id|params\.id|input\.gapId)\b|\bid\s*:\s*\{\s*in\b/

/** Files that read history on purpose, with the reason. */
const HISTORY_READERS: ReadonlyMap<string, string> = new Map([
    ["lib/services/compliance.service.ts", "Art. 15 export of derived data — a person's history is their data"],
    ["app/(protected)/admin/actions.ts", "admin total row count beside the open count"],
    ["lib/gaps/gap-instance-writer.ts", "the writer itself reads live rows by supersededAt"],
])

const WINDOW_LINES = 14

/**
 * The lines of ONE call: from the call line until the first line that closes
 * at the call's own indentation (or the window cap). Without the stop, a
 * by-id lookup in the NEXT statement excused an unfiltered read in this one.
 */
function callWindow(lines: string[], start: number): string {
    const indent = lines[start].search(/\S/)
    const out = [lines[start]]
    for (let j = start + 1; j < Math.min(lines.length, start + WINDOW_LINES); j++) {
        out.push(lines[j])
        const ind = lines[j].search(/\S/)
        if (ind !== -1 && ind <= indent && /^\s*[}\]]/.test(lines[j])) break
    }
    return out.join("\n")
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
        if (!READ_CALL.test(line) && !RELATION_READ.test(line)) return
        const window = callWindow(lines, i)
        if (!FILTERED.test(window)) {
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
        expect(readers.length).toBeGreaterThan(15)
    })

    it("is proven red on an unfiltered read and a bare include, green on a filtered one", () => {
        expect(findUnfilteredReaders(probe("gap-reader-unfiltered.ts.txt")).map((v) => v.kind)).toEqual([
            "unfiltered_read",
            "bare_include",
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

    it("every named history reader still exists and still reads", () => {
        for (const [f, why] of HISTORY_READERS) {
            const src = strip(readFileSync(path.join(ROOT, f), "utf8"))
            expect(READ_CALL.test(src) || RELATION_READ.test(src), `${f} (${why}) no longer reads gap rows — drop it from the list`).toBe(true)
        }
    })
})
