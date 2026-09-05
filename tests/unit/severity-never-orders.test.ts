import { describe, expect, it } from "vitest"
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

/**
 * B1 — severity influences nothing (PW-TRANSPARENCY-02).
 *
 * Severity is a rule's unvalidated output. It may be printed as a caveated
 * word inside a finding's own card and nowhere else: it orders nothing,
 * colours nothing, is no chip's text and carries no emphasis. This guard
 * enumerates app/, components/ and lib/ from disk and fails on:
 *   a. a `.sort(` whose comparator reads `severity` or `urgency`;
 *   b. a severity-keyed presentation table (ORDER / RANK / WEIGHT / CONFIG /
 *      PILL / COLOR declared for severities);
 *   c. a className driven by severity, urgency or a severity tone;
 *   d. a same-line ternary on `severity === "critical"|"high"`.
 * Exemptions are listed with a reason; each is a different concept or the
 * primitive itself. Probes under tests/fixtures/guard-probes turn it red.
 */
const ROOTS = ["app", "components", "lib"]
const EXEMPT: Record<string, string> = {
    "lib/gaps/severity-display.ts": "the primitive: owns the word, the caveat and its own rank (no product caller may use the rank)",
    "lib/gap-detection.ts": "the engine: decides severity from the definition; never renders",
    "lib/insurance/policy-conditions.ts": "CONDITION severity (exclusions / obligations) — a different concept; migration debt logged in PROGRESS",
    "lib/wallet/batch-upload-errors.ts": "UPLOAD error severity — a different concept",
    "lib/services/gap-engine/risk-catalog.ts": "reference data authored per risk; not a render site",
    "components/collaboration/DocumentRequestFlow.tsx": "the URGENCY of a document request, chosen by the agent — not a finding's severity",
    "app/(protected)/dashboard/agent/page.tsx": "the action queue's urgency tiers are DAYS TO EXPIRY and profile completeness (see its urgency: assignments) — not a finding's severity",
    "components/agent/ActionQueueCard.tsx": "renders the same days-to-expiry urgency; the severity word it prints is caveated in-card",
    "components/wallet/policy-detail/PolicyBriefCard.tsx": "row tone is the brief's own positive/warning/critical/neutral over lifecycle facts, not a finding's severity; the component currently has no consumer",
}
/** Whole trees exempt for one reason. */
const EXEMPT_PREFIXES: Record<string, string> = {
    "app/(protected)/admin/": "admin operational consoles: automation / notification-log severities, not findings; no customer or agent reads them",
}
const isExempt = (f: string) => f in EXEMPT || Object.keys(EXEMPT_PREFIXES).some((prefix) => f.startsWith(prefix))

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

const SORT_ON_SEVERITY = /\.sort\(\s*\(?[^)]*\)?\s*=>[\s\S]{0,160}?\b(severity|urgency)\b/
const SEVERITY_TABLE = /\b(SEVERITY|Severity|severity)_?(ORDER|RANK|WEIGHTS?|CONFIG|PILL|COLOU?RS?)\b\s*[:=]/
const CLASS_BY_SEVERITY = /className=\{[^}\n]*\b(severity|urgency|\.tone)\b/
const TERNARY_ON_SEVERITY = /\b(severity|urgency)\s*===?\s*['"](critical|high)['"][^\n]*\?/

export function severityOffences(src: string): string[] {
    const found: string[] = []
    if (SORT_ON_SEVERITY.test(src)) found.push("sort")
    if (SEVERITY_TABLE.test(src)) found.push("table")
    if (CLASS_BY_SEVERITY.test(src)) found.push("className")
    if (TERNARY_ON_SEVERITY.test(src)) found.push("ternary")
    return found
}

describe("severity orders, colours and emphasises nothing", () => {
    const files = ROOTS.flatMap((r) => walk(r))

    it("walks a real universe", () => {
        expect(files.length).toBeGreaterThan(500)
        for (const path of Object.keys(EXEMPT)) expect(existsSync(path), `exempt path ${path} no longer exists — drop it`).toBe(true)
    })

    it("finds no offender outside the exemptions", () => {
        const offenders = files
            .filter((f) => !isExempt(f))
            .map((f) => [f, severityOffences(readFileSync(f, "utf8"))] as const)
            .filter(([, o]) => o.length > 0)
            .map(([f, o]) => `${f}: ${o.join(", ")}`)
        expect(offenders).toEqual([])
    })

    it("the tone→colour module is gone and nothing imports it", () => {
        expect(existsSync("components/gaps/severity-tone.ts")).toBe(false)
        for (const f of files) expect(readFileSync(f, "utf8"), f).not.toMatch(/severity-tone/)
    })

    it("PROBES: each pattern fires on its fixture and none fires on the clean one", () => {
        expect(severityOffences(readFileSync("tests/fixtures/guard-probes/severity-sort.ts.txt", "utf8"))).toContain("sort")
        expect(severityOffences(readFileSync("tests/fixtures/guard-probes/severity-table.ts.txt", "utf8"))).toContain("table")
        expect(severityOffences(readFileSync("tests/fixtures/guard-probes/severity-class.tsx.txt", "utf8"))).toEqual(expect.arrayContaining(["className", "ternary"]))
        expect(severityOffences(readFileSync("tests/fixtures/guard-probes/severity-clean.tsx.txt", "utf8"))).toEqual([])
    })
})
