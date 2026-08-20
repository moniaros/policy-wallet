/**
 * Assert that EVERY plan row in the connected database carries canonical
 * entitlements — i.e. none of them resolves through the code-default fallback.
 *
 * The fallback exists so a malformed admin edit can never brick gating, but it
 * has a cost nobody sees: while a row is non-canonical, /admin/plans edits to
 * its limits are silently inert (the resolver ignores the row's JSON), and the
 * startup log line "Plan entitlements not in canonical shape" fires once per
 * plan and changes nothing. On 2026-08-20 ALL plan rows in BOTH databases were
 * non-canonical — the ph-* rows still carried the pre-2026-07 informational
 * shape and the agent-* rows a 3-key subset — so every budget in the product
 * was a code constant wearing a database costume.
 *
 * Exit 1 on any non-canonical row, listing each with its Zod issues.
 *
 *   npx tsx -r dotenv/config scripts/verify-plan-entitlements.ts
 *
 * NOTE the .env.local DIRECT_URL trap (last occurrence wins and may point at
 * production): this script is READ-ONLY, so it is safe either way, but the
 * header line tells you which database was actually checked.
 */
import { db } from "@/lib/db"
import {
    AgentEntitlementLimitsSchema,
    EntitlementLimitsSchema,
} from "@/lib/pricing/entitlement-schema"

function databaseRef(): string {
    const url =
        process.env.POOLED_DATABASE_URL || process.env.DIRECT_URL || process.env.DATABASE_URL || ""
    return (
        url.match(/postgres\.([a-z0-9]{16,})[:@]/)?.[1] ??
        url.match(/db\.([a-z0-9]{16,})\.supabase\.co/)?.[1] ??
        "unknown"
    )
}

async function main() {
    const rows = await db.plan.findMany({
        select: { id: true, planType: true, name: true, tierKey: true, entitlements: true },
        orderBy: [{ planType: "asc" }, { id: "asc" }],
    })

    console.log(`Plan entitlement verification — supabase:${databaseRef()} (${rows.length} rows)`)

    let failures = 0
    for (const row of rows) {
        const schema =
            row.planType === "agent" ? AgentEntitlementLimitsSchema : EntitlementLimitsSchema
        const parsed = schema.safeParse(row.entitlements)
        if (parsed.success) {
            console.log(`  OK       ${row.id}`)
            continue
        }
        failures += 1
        const issues = parsed.error.issues
            .slice(0, 4)
            .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
            .join("; ")
        console.log(`  INVALID  ${row.id} (${row.planType}, tier_key=${row.tierKey ?? "null"}) — ${issues}`)
    }

    console.log("─".repeat(72))
    if (failures > 0) {
        console.error(
            `${failures} plan row(s) resolve through code defaults. Admin edits to their limits are INERT until repaired.`
        )
        process.exitCode = 1
    } else {
        console.log("All plan rows parse canonically — no plan resolves through code defaults.")
    }
}

main()
    .catch((error) => {
        console.error("verify-plan-entitlements failed:", error)
        process.exitCode = 1
    })
    .finally(async () => {
        await db.$disconnect()
    })
