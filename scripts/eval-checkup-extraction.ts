/**
 * Richer check-up extraction — accuracy check on REAL documents (prevention
 * brief, 2026-09-24).
 *
 *   EXTRACTION_CITATIONS=1 npx tsx -r dotenv/config scripts/eval-checkup-extraction.ts \
 *       <folder-with-health-pdfs> --owner <dev-account-email> [--truth truth.json]
 *
 * Each PDF goes through the SAME path an upload does — the document gate,
 * then the validated-document brand, then the configured provider — so the
 * owner's AI-processing consent applies and a non-policy PDF is refused
 * before any model sees it. Nothing is written to the database or storage.
 *
 * `--truth` is a JSON map of file name → the terms a human read off the page:
 *   { "policy-a.pdf": { "annualCheckupIncluded": true,
 *                       "checkup": { "frequency": "...", "limitAmount": 150 } } }
 * A term the human left out counts as «not stated»: a model value there is
 * reported as INVENTED, which is the failure this feature must not have.
 *
 * Refuses the production database. Prints a table; exits 1 on any invented term.
 */
import { readFileSync, readdirSync } from "node:fs"
import path from "node:path"

const KEYS = ["frequency", "limitAmount", "tests", "network", "waitingPeriodDays", "conditions"] as const
type Key = (typeof KEYS)[number]

function arg(name: string): string | undefined {
    const i = process.argv.indexOf(name)
    return i > 0 ? process.argv[i + 1] : undefined
}

const norm = (v: unknown) => JSON.stringify(v ?? null).toLowerCase().replace(/\s+/g, " ")

export function compareTerm(expected: unknown, actual: unknown): "match" | "differs" | "missed" | "invented" | "absent" {
    const has = (v: unknown) => v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0) && v !== ""
    if (!has(expected) && !has(actual)) return "absent"
    if (!has(expected)) return "invented"
    if (!has(actual)) return "missed"
    return norm(expected) === norm(actual) ? "match" : "differs"
}

async function main() {
    const folder = process.argv[2]
    const ownerEmail = arg("--owner")
    if (!folder || !ownerEmail) throw new Error("usage: eval-checkup-extraction.ts <folder> --owner <email> [--truth truth.json]")
    if (/cquudefwfwrmvpftuhyl/.test(`${process.env.DATABASE_URL}${process.env.DIRECT_URL}`)) throw new Error("refusing to run against the PRODUCTION database")
    if (process.env.EXTRACTION_CITATIONS !== "1") console.warn("EXTRACTION_CITATIONS is not 1 — no citation will be verified")

    const truthPath = arg("--truth")
    const truth: Record<string, { annualCheckupIncluded?: boolean; checkup?: Partial<Record<Key, unknown>> }> = truthPath ? JSON.parse(readFileSync(truthPath, "utf8")) : {}

    const { db } = await import("@/lib/db")
    const { validateDocumentWithLocalText } = await import("@/lib/ingestion/document-gate")
    const { toValidatedAIDocument } = await import("@/lib/ingestion/validated-document")
    const { getAIService } = await import("@/lib/services/ai/ai-service.factory")
    const owner = await db.user.findUnique({ where: { email: ownerEmail }, select: { id: true } })
    if (!owner) throw new Error(`no account ${ownerEmail}`)

    const files = readdirSync(folder).filter((f) => f.toLowerCase().endsWith(".pdf")).sort()
    let invented = 0
    const tally: Record<string, number> = {}
    for (const file of files) {
        const bytes = readFileSync(path.join(folder, file))
        const { verdict, localText } = await validateDocumentWithLocalText({
            bytes, canonicalMime: "application/pdf", declaredBranch: "health", declaredBranchSource: "user",
            mode: "policy", surface: "wallet_add", actorUserId: owner.id, ownerUserId: owner.id,
        })
        if (verdict.status !== "validated") {
            console.log(`${file}: gate ${verdict.status}${verdict.code ? ` (${verdict.code})` : ""} — skipped`)
            continue
        }
        const response = await getAIService().extractPolicyData(toValidatedAIDocument(verdict, bytes, "application/pdf", localText))
        const acord = (response.acordData ?? {}) as any
        const health = acord.health ?? {}
        const sources = acord.extraction?.sources ?? {}
        const expected = truth[file]
        console.log(`\n${file}  annualCheckupIncluded=${JSON.stringify(health.annualCheckupIncluded)}  citation=${sources["acordData.health.annualCheckupIncluded"]?.verified ?? "none"}`)
        if (expected) {
            const r = compareTerm(expected.annualCheckupIncluded, health.annualCheckupIncluded)
            tally[r] = (tally[r] ?? 0) + 1
            if (r === "invented") invented++
            console.log(`  included: ${r}`)
        }
        for (const key of KEYS) {
            const value = health.checkup?.[key]
            const cited = sources[`acordData.health.checkup.${key}`]?.verified
            const verdictLine = expected ? compareTerm(expected.checkup?.[key], value) : "—"
            if (expected) { tally[verdictLine] = (tally[verdictLine] ?? 0) + 1; if (verdictLine === "invented") invented++ }
            if (value !== undefined || expected) console.log(`  ${key.padEnd(18)} ${JSON.stringify(value ?? null).slice(0, 80).padEnd(82)} cited=${cited ?? "none"}  ${verdictLine}`)
        }
    }
    console.log(`\nfiles: ${files.length}  tally: ${JSON.stringify(tally)}  invented: ${invented}`)
    await db.$disconnect()
    process.exit(invented > 0 ? 1 : 0)
}

if (process.argv[1]?.endsWith("eval-checkup-extraction.ts")) {
    main().catch((error) => { console.error(error); process.exit(2) })
}
