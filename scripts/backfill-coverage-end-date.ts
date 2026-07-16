/**
 * Backfill Policy.coverageEndDate for existing rows.
 *
 * coverageEndDate is the denormalized resolved coverage end date
 * (resolvePolicyLifecycle: renewal history → extracted envelope → endDate
 * column). New/edited/analyzed policies get it at write time; this populates
 * everything that predates the column. Idempotent + resumable (id cursor) —
 * safe to re-run to reconcile any staleness.
 *
 * Run with prod env sourced:
 *   set -a; source .prod-db-env; set +a
 *   npx tsx scripts/backfill-coverage-end-date.ts
 */
import { db } from "@/lib/db"
import { resolveCoverageEndDate } from "@/lib/policy-status"

async function main() {
    const BATCH = 500
    let cursor: string | undefined
    let processed = 0
    let withDate = 0

    for (;;) {
        const policies = await db.policy.findMany({
            select: {
                id: true,
                status: true,
                endDate: true,
                acordData: true,
                policyNumber: true,
                insurerName: true,
            },
            orderBy: { id: "asc" },
            take: BATCH,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        })
        if (policies.length === 0) break

        for (const p of policies) {
            const coverageEndDate = resolveCoverageEndDate(p)
            await db.policy.update({ where: { id: p.id }, data: { coverageEndDate } })
            processed++
            if (coverageEndDate) withDate++
        }

        cursor = policies[policies.length - 1].id
        console.log(`… processed ${processed} (with a resolved date: ${withDate})`)
    }

    console.log(`DONE — processed ${processed} policies; ${withDate} got a coverage end date, ${processed - withDate} are unknown-duration (NULL = counts as coverage).`)
    await db.$disconnect()
}

main().catch((e) => {
    console.error(e)
    process.exit(1)
})
