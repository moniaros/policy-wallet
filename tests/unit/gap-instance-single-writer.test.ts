import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"
import { GAP_INSTANCE_WRITER_MODULE } from "@/lib/gaps/gap-instance-writer"

/**
 * One writer of `gap_instances` (PW-TRANSPARENCY-02 amendment 01, B0.1).
 *
 * Two engines wrote the table until Sept 2026. The orchestrator wrote
 * rule-decided rows with provenance and replaced the set; a legacy path
 * (`detectGapsForPolicy` + `createGapInstances` in lib/gap-detection.ts) wrote
 * rows with no provenance and RE-ACTIVATED dismissed ones, from the protection
 * refresh action and the process-policy job. Goal 0 F4.
 *
 * The legacy functions were deleted from lib/gap-detection.ts in B0.1 — the
 * ONLY edit the series makes to that file, and it removes a writer without
 * touching `decideGapsForPolicy` or any evaluator (the standing constraint is
 * about what fires, and nothing that fires changed). This guard keeps the
 * table single-writer: it enumerates every module under app/, components/ and
 * lib/ from disk and fails if any of them (a) calls a gap-row create outside
 * the writer module, (b) imports or calls one of the legacy symbols, or (c)
 * re-adds a legacy export to lib/gap-detection.ts. Comments are stripped first.
 *
 * Probe fixtures prove each matcher red.
 */
const ROOT = process.cwd()

const WRITE_CALL = /\bgapInstance\s*\.\s*(create|createMany|upsert)\s*\(/
const LEGACY_IMPORT =
    /import\s*\{[^}]*\b(createGapInstances|detectGapsForPolicy|detectGapsForUser)\b[^}]*\}\s*from\s*["']@\/lib\/gap-detection["']/
const LEGACY_CALL = /\b(createGapInstances|detectGapsForPolicy|detectGapsForUser)\s*\(/

/** Where the legacy writer lived; it was removed in B0.1 and must not return. */
const LEGACY_HOME = "lib/gap-detection.ts"

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

export function classify(source: string): { writes: boolean; importsLegacy: boolean; callsLegacy: boolean } {
    const code = strip(source)
    return {
        writes: WRITE_CALL.test(code),
        importsLegacy: LEGACY_IMPORT.test(code),
        callsLegacy: LEGACY_CALL.test(code),
    }
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

describe("gap_instances has one writer (B0.1)", () => {
    it("enumerates a real universe", () => {
        expect(FILES.length).toBeGreaterThan(400)
        expect(FILES).toContain(GAP_INSTANCE_WRITER_MODULE)
        expect(FILES).toContain(LEGACY_HOME)
    })

    it("is proven red on a second write path and on a legacy import, green on a clean file", () => {
        expect(classify(probe("gap-writer-second-path.ts.txt")).writes).toBe(true)
        expect(classify(probe("gap-writer-legacy-import.ts.txt")).importsLegacy).toBe(true)
        expect(classify(probe("gap-writer-legacy-import.ts.txt")).callsLegacy).toBe(true)
        expect(classify(probe("gap-writer-clean.ts.txt"))).toEqual({ writes: false, importsLegacy: false, callsLegacy: false })
    })

    it("exactly one module creates gap rows", () => {
        const writers = FILES.filter((f) => classify(readFileSync(path.join(ROOT, f), "utf8")).writes)
        expect(writers).toEqual([GAP_INSTANCE_WRITER_MODULE])
    })

    it("the legacy writer has not returned to lib/gap-detection.ts", () => {
        const src = strip(readFileSync(path.join(ROOT, LEGACY_HOME), "utf8"))
        expect(src).not.toMatch(/export async function (createGapInstances|detectGapsForPolicy|detectGapsForUser)\b/)
        expect(src).toMatch(/export async function decideGapsForPolicy\b/)
    })

    it("nothing imports or calls the legacy writer", () => {
        const offenders: string[] = []
        for (const f of FILES) {
            const c = classify(readFileSync(path.join(ROOT, f), "utf8"))
            if (c.importsLegacy) offenders.push(`${f} imports a legacy gap writer`)
            if (c.callsLegacy) offenders.push(`${f} calls a legacy gap writer`)
        }
        expect(offenders, offenders.join("\n")).toEqual([])
    })

    it("the writer never reactivates a row — it supersedes and creates", () => {
        const src = strip(readFileSync(path.join(ROOT, GAP_INSTANCE_WRITER_MODULE), "utf8"))
        // No status write back to a live status anywhere in the writer.
        expect(src).not.toMatch(/status:\s*["'](detected|acknowledged)["']/)
        expect(src).toMatch(/supersededAt:\s*now/)
        expect(src).toMatch(/createMany\(/)
        expect(src).not.toMatch(/gapInstance\s*\.\s*delete(Many)?\s*\(/)
    })
})
