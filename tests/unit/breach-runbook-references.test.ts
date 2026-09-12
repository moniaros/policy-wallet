import { existsSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

/**
 * PW-PROVENANCE-01 R-03 (compliance pack §14.7). A breach runbook that cites a
 * tool, a file or a route that does not exist is the failure this guard
 * exists for: at 02:00 on the night it is needed, every reference must resolve.
 * The universe is the runbook itself — every backticked repository path and
 * every `/api/...` route it names — plus the two facts the published
 * commitment makes (Art. 33/34, the HDPA) and the register the drill wrote.
 */

const RUNBOOK = "docs/operations/RUNBOOK_PERSONAL_DATA_BREACH.md"
const REGISTER = "docs/compliance/evidence/breach-register.md"

/** Backticked references that look like repository paths or API routes. */
export function repoReferences(markdown: string): string[] {
    const out = new Set<string>()
    for (const m of markdown.matchAll(/`([^`\n]+)`/g)) {
        const ref = m[1].trim()
        if (/^(app|lib|docs|scripts|tests|prisma|components)\/[\w\-./[\]()]+$/.test(ref)) out.add(ref)
        else if (/^(GET|POST|DELETE) \/api\/[\w\-/[\]]+$/.test(ref)) out.add(ref.split(" ")[1])
        else if (/^\/api\/[\w\-/[\]]+$/.test(ref)) out.add(ref)
    }
    return [...out].sort()
}

/** Where a reference must exist on disk. */
export function pathFor(ref: string): string {
    if (ref.startsWith("/api/")) return `app${ref}/route.ts`
    return ref
}

describe("the personal-data breach runbook cites only what exists", () => {
    const runbook = readFileSync(RUNBOOK, "utf-8")
    const refs = repoReferences(runbook)

    it("names enough tools to be a runbook, and every one of them resolves", () => {
        expect(refs.length).toBeGreaterThanOrEqual(8)
        const missing = refs.filter((r) => !existsSync(pathFor(r)))
        expect(missing, `dangling references in ${RUNBOOK}`).toEqual([])
    })

    it("states the 72-hour clock, names the HDPA (ΑΠΔΠΧ), Art. 33 and Art. 34, and the single-operator reality", () => {
        expect(runbook).toMatch(/72\s*(hours|ώρες)/)
        expect(runbook).toMatch(/ΑΠΔΠΧ/)
        expect(runbook).toMatch(/Art\.\s*33/)
        expect(runbook).toMatch(/Art\.\s*34/)
        expect(runbook).toMatch(/single operator|H-P4/)
    })

    it("the breach register exists, with the drill as its first row, and the runbook points at it", () => {
        expect(existsSync(REGISTER)).toBe(true)
        const register = readFileSync(REGISTER, "utf-8")
        expect(register).toMatch(/\| BR-0001 \|/)
        expect(register).toMatch(/drill/i)
        expect(runbook).toContain(REGISTER)
    })

    it("probe — a dangling reference is what the reference walker reports", () => {
        const refs = repoReferences("see `lib/does/not/exist.ts` and `POST /api/v1/jobs/nope` but also `npm run build`")
        expect(refs).toEqual(["/api/v1/jobs/nope", "lib/does/not/exist.ts"])
        expect(refs.filter((r) => !existsSync(pathFor(r)))).toEqual(refs)
    })
})
