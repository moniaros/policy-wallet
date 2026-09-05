/**
 * Does this database's ACTIVE gap catalogue match the one in the repo?
 *
 * Gap definitions are REFERENCE DATA. The authored set lives in
 * lib/gaps/authored-catalogue.ts and is the only thing allowed to decide which
 * rules are live. A row that drifts from it changes what the product detects,
 * with no diff and no review — the same failure class that has now hit
 * migrations, plan rows and this table.
 *
 * WHAT IS COMPARED: the ACTIVE set, field by field (slug, line of business,
 * severity, default severity, rule id, detection logic). Not the row count.
 * Inactive rows are history and legitimately differ between environments —
 * production carries 41 definitions the AI minted for itself at runtime before
 * that was stopped, and dev has never had them. Comparing counts would fail
 * forever on a difference that changes nothing.
 *
 * WHY A FINGERPRINT: two environments can be compared without shipping either
 * one's rows anywhere. Run this against each and compare the printed hash.
 *
 * Run: npx tsx -r dotenv/config scripts/verify-gap-catalogue.ts
 * Exits non-zero on drift.
 */
import { PrismaClient } from "@prisma/client"
import { AUTHORED_GAP_DEFINITIONS } from "../lib/gaps/authored-catalogue"
import { fingerprintGapDefinitions as fingerprint } from "../lib/gaps/catalogue-version"

const db = new PrismaClient()

// The fingerprint lives in lib/gaps/catalogue-version.ts (B0): the same
// function stamps every gap row and every run, so the verifier and the data
// cannot disagree about what a "catalogue version" is.

async function main() {
    const live = await db.gapDefinition.findMany({
        where: { isActive: true },
        select: { slug: true, lineOfBusiness: true, severity: true, defaultSeverity: true, ruleId: true, detectionLogic: true },
    })

    const declaredFp = fingerprint(AUTHORED_GAP_DEFINITIONS as any)
    const liveFp = fingerprint(live as any)

    console.log(`authored catalogue : ${AUTHORED_GAP_DEFINITIONS.length} definitions  fingerprint ${declaredFp}`)
    console.log(`database (active)  : ${live.length} definitions  fingerprint ${liveFp}`)

    if (declaredFp === liveFp) {
        console.log("\nActive gap catalogue matches the repo. No drift.")
        return
    }

    const declaredSlugs = new Set(AUTHORED_GAP_DEFINITIONS.map((d) => d.slug))
    const liveSlugs = new Set(live.map((d) => d.slug))
    const missing = [...declaredSlugs].filter((s) => !liveSlugs.has(s))
    const unauthored = [...liveSlugs].filter((s) => !declaredSlugs.has(s))

    console.error("\nDRIFT: the active gap catalogue does not match the repo.")
    if (missing.length) {
        console.error(`\n  Authored but NOT active in this database (${missing.length}) —`)
        console.error("  these rules are not running here:")
        missing.forEach((s) => console.error(`    - ${s}`))
    }
    if (unauthored.length) {
        console.error(`\n  Active in this database but NOT authored (${unauthored.length}) —`)
        console.error("  nobody wrote these; a model or a hand-edit did:")
        unauthored.forEach((s) => console.error(`    - ${s}`))
    }
    const shared = [...declaredSlugs].filter((s) => liveSlugs.has(s))
    const changed = shared.filter((slug) => {
        const a = AUTHORED_GAP_DEFINITIONS.find((d) => d.slug === slug)!
        const b = live.find((d) => d.slug === slug)!
        return fingerprint([a as any]) !== fingerprint([b as any])
    })
    if (changed.length) {
        console.error(`\n  Same slug, different content (${changed.length}) —`)
        console.error("  severity or detection logic was edited away from the repo:")
        changed.forEach((s) => console.error(`    - ${s}`))
    }
    console.error("\nFix: npx tsx -r dotenv/config scripts/align-gap-catalogue.ts --apply")
    process.exit(1)
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
