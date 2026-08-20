import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { getLegalContent } from "@/lib/legal/legal-content"

/**
 * The retention table is a promise to a regulator, and the only thing that keeps
 * it true is a cron job nobody looks at.
 *
 * Nothing connected the two. The privacy policy could say "24 months" while
 * `FORM_SUBMISSION_RETENTION_DAYS` said 365, and both would look fine in review:
 * the copy reads plausibly, the job runs green, and the mismatch is only visible
 * to someone holding both files open at once.
 *
 * A Phase 6 sweep also found the table simply SILENT about two categories the
 * system holds — public-form captures and session records — which is its own kind
 * of inaccuracy in an Art. 13 disclosure. Both are listed now, and pinned here.
 *
 * Constants are module-private in the route, so they are read from source rather
 * than imported. That is deliberate: exporting them purely to satisfy a test would
 * add a non-handler export to a Next route module.
 */

const JOB = "app/api/v1/jobs/privacy-retention/route.ts"

function retentionConstant(name: string): number {
    const source = readFileSync(JOB, "utf8")
    const m = new RegExp(`const ${name}\\s*=\\s*([0-9*\\s]+)`).exec(source)
    if (!m) throw new Error(`${name} not found in ${JOB} — was it renamed?`)
    // Values are written as `730` or `5 * 365`.
    return m[1]
        .split("*")
        .map((part) => Number(part.trim()))
        .reduce((a, b) => a * b, 1)
}

function retentionRows(language: "el" | "en"): string[][] {
    const section = getLegalContent(language).privacy.sections.find((s) => s.id === "retention")
    if (!section?.table) throw new Error(`no retention table in the ${language} privacy policy`)
    return section.table.rows as string[][]
}

/** The retention value stated for the row whose label matches. */
function statedFor(language: "el" | "en", labelPattern: RegExp): string {
    const row = retentionRows(language).find((r) => labelPattern.test(r[0]))
    if (!row) {
        throw new Error(
            `no retention row matching ${labelPattern} in ${language} — ` +
                `rows are:\n  ${retentionRows(language).map((r) => r[0]).join("\n  ")}`
        )
    }
    return row[1]
}

describe("the retention table states what the job actually does", () => {
    it("reads the job's constants (the parser is not vacuous)", () => {
        expect(retentionConstant("FORM_SUBMISSION_RETENTION_DAYS")).toBe(730)
        expect(retentionConstant("USER_ACTIVITY_RETENTION_DAYS")).toBe(365)
        expect(retentionConstant("ADMIN_AUDIT_RETENTION_DAYS")).toBe(5 * 365)
        expect(retentionConstant("INVITE_RETENTION_DAYS")).toBe(90)
    })

    it("states public-form captures at the job's actual window", () => {
        const months = Math.round(retentionConstant("FORM_SUBMISSION_RETENTION_DAYS") / 30.44)
        expect(months).toBe(24)
        expect(statedFor("en", /public-form/i)).toContain(String(months))
        expect(statedFor("el", /φορμ/i)).toContain(String(months))
    })

    it("states technical logs at the job's actual window", () => {
        const months = Math.round(retentionConstant("USER_ACTIVITY_RETENTION_DAYS") / 30.44)
        expect(months).toBe(12)
        expect(statedFor("en", /technical logs/i)).toContain(String(months))
        expect(statedFor("el", /Τεχνικά/i)).toContain(String(months))
    })

    it("discloses session records, which erasure deletes but no job sweeps", () => {
        // lib/services/gdpr-erasure.service.ts deletes Session and ActiveSession.
        // Nothing purges them on a timer, so the table must not imply one.
        const eraser = readFileSync("lib/services/gdpr-erasure.service.ts", "utf8")
        expect(eraser).toMatch(/tx\.session\.deleteMany/)
        expect(eraser).toMatch(/tx\.activeSession\.deleteMany/)

        expect(statedFor("en", /session records/i)).toMatch(/account is deleted/i)
        expect(statedFor("el", /συνεδρι/i)).toMatch(/λογαριασμ/i)
    })

    it("keeps both languages listing the same categories", () => {
        expect(retentionRows("el").length).toBe(retentionRows("en").length)
    })
})
