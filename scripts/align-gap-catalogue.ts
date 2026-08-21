/**
 * Bring a database's ACTIVE gap definitions into line with the authored
 * catalogue in the repo.
 *
 * Upsert by slug, so existing rows keep their id and any gap_instances that
 * reference them survive. Deactivates any active definition the catalogue does
 * not declare rather than deleting it — an active rule that nobody authored is
 * the thing to stop, and deactivating is reversible.
 *
 * Run: npx tsx -r dotenv/config scripts/align-gap-catalogue.ts [--apply]
 */
import { PrismaClient } from "@prisma/client"
import { AUTHORED_GAP_DEFINITIONS } from "../lib/gaps/authored-catalogue"

const apply = process.argv.includes("--apply")
const db = new PrismaClient()

async function main() {
    const declared = new Map(AUTHORED_GAP_DEFINITIONS.map((d) => [d.slug, d]))
    const existing = await db.gapDefinition.findMany({
        select: { slug: true, isActive: true, severity: true },
    })
    const bySlug = new Map(existing.map((r) => [r.slug, r]))

    const toCreate = [...declared.keys()].filter((s) => !bySlug.has(s))
    const toUpdate = [...declared.keys()].filter((s) => bySlug.has(s))
    const strays = existing.filter((r) => r.isActive && !declared.has(r.slug)).map((r) => r.slug)

    console.log(`catalogue declares : ${declared.size}`)
    console.log(`database has       : ${existing.length} (${existing.filter((r) => r.isActive).length} active)`)
    console.log(`to create          : ${toCreate.length}`)
    console.log(`to update in place : ${toUpdate.length}`)
    console.log(`active but unauthored (will be DEACTIVATED, not deleted): ${strays.length}`)
    strays.forEach((s) => console.log(`   - ${s}`))

    if (!apply) {
        console.log("\nDry run. Re-run with --apply to write.")
        return
    }

    for (const def of AUTHORED_GAP_DEFINITIONS) {
        await db.gapDefinition.upsert({
            where: { slug: def.slug },
            update: def,
            create: def,
        })
    }
    if (strays.length) {
        await db.gapDefinition.updateMany({
            where: { slug: { in: strays } },
            data: { isActive: false },
        })
    }

    const after = await db.gapDefinition.findMany({ select: { slug: true, isActive: true } })
    console.log(`\nAfter: ${after.length} rows, ${after.filter((r) => r.isActive).length} active`)
}

main()
    .catch((e) => { console.error(e); process.exit(1) })
    .finally(() => db.$disconnect())
