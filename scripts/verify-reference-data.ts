/**
 * Cross-environment fingerprints for REFERENCE DATA.
 *
 * Reference data is anything the product's behaviour reads but a user never
 * writes: which gap rules are live, what the plans cost, which insurers exist.
 * Rows with no versioned origin drift, and the drift is invisible — it changes
 * behaviour with no diff and no review. This has now happened three times:
 * migrations, plan rows, and gap definitions.
 *
 * WHAT THIS DOES: prints one content fingerprint per reference table. Run it
 * against two databases and compare — identical output means identical
 * reference data. No rows leave either environment, so it works across
 * environments whose credentials are deliberately not held together.
 *
 * WHAT IT DOES NOT DO: decide which environment is right. `verify:gap-catalogue`
 * does that for gap definitions, because those have an authored source in the
 * repo (lib/gaps/authored-catalogue.ts). Plans and insurers do not yet — see
 * the note printed at the end.
 *
 * Run: npx tsx -r dotenv/config scripts/verify-reference-data.ts
 */
import { createHash } from "node:crypto"
import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()
const fp = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 16)
const canon = (rows: string[]) => fp(rows.slice().sort().join("\n"))

async function main() {
    const gaps = await db.gapDefinition.findMany({
        select: { slug: true, lineOfBusiness: true, severity: true, defaultSeverity: true, ruleId: true, isActive: true },
    })
    const plans = await db.plan.findMany({
        select: { id: true, name: true, price: true, tierKey: true, isActive: true, isPublic: true },
    })
    const insurers = await db.insurer.findMany({ select: { slug: true, name: true, isActive: true, status: true } })
    const types = await db.insuranceType.findMany({ select: { slug: true, name: true } })

    const report = [
        ["gap_definitions", gaps.length, canon(gaps.map((g) => `${g.slug}|${g.lineOfBusiness}|${g.severity}|${g.defaultSeverity}|${g.ruleId}|${g.isActive}`))],
        ["plans", plans.length, canon(plans.map((p) => `${p.id}|${p.name}|${p.price}|${p.tierKey}|${p.isActive}|${p.isPublic}`))],
        ["insurers", insurers.length, canon(insurers.map((i) => `${i.slug}|${i.name}|${i.isActive}|${i.status}`))],
        ["insurance_types", types.length, canon(types.map((t) => `${t.slug}|${t.name}`))],
    ] as const

    console.log("table              rows  fingerprint")
    console.log("-----------------  ----  ----------------")
    for (const [name, count, hash] of report) {
        console.log(`${name.padEnd(17)}  ${String(count).padStart(4)}  ${hash}`)
    }
    console.log("\nCompare this table against another environment. Any differing line is drift.")

    const unslugged = insurers.filter((i) => !i.slug).length
    if (unslugged) {
        console.log(`\nWARNING: ${unslugged} insurer row(s) have no slug — the catalogue cannot address them.`)
    }
    console.log("\nOnly gap_definitions has an authored source in the repo today")
    console.log("(lib/gaps/authored-catalogue.ts, enforced by npm run verify:gap-catalogue).")
    console.log("plans and insurers are still database-first: this reports drift but cannot resolve it.")
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
