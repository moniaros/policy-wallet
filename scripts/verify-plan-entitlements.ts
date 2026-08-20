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
 *   npx tsx scripts/verify-plan-entitlements.ts --from-json <file>
 *
 * The second form validates rows supplied as JSON instead of connecting. It
 * exists because PRODUCTION plan rows cannot be read from a developer machine —
 * Vercel returns empty strings for sensitive env vars, so there is no prod
 * connection string locally. Fetch them with the Supabase MCP:
 *
 *   SELECT plan_id AS id, plan_type AS "planType", name, tier_key AS "tierKey",
 *          entitlements FROM plans ORDER BY plan_type, plan_id;
 *
 * save the array to a file, and point --from-json at it. Same schema, same
 * verdict, same exit code — so "green against BOTH databases" is achievable
 * without ever holding a prod credential.
 *
 * NOTE the .env.local DIRECT_URL trap (last occurrence wins and may point at
 * production): this script is READ-ONLY, so it is safe either way, but the
 * header line tells you which database was actually checked.
 */
import fs from "node:fs"
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

type PlanRow = {
    id: string
    planType: string
    name: string | null
    tierKey: string | null
    entitlements: unknown
}

function jsonSource(): string | null {
    const i = process.argv.indexOf("--from-json")
    if (i === -1) return null
    const file = process.argv[i + 1]
    if (!file) throw new Error("--from-json needs a file path")
    return file
}

async function main() {
    const file = jsonSource()

    let rows: PlanRow[]
    let source: string

    if (file) {
        const parsed = JSON.parse(fs.readFileSync(file, "utf8"))
        if (!Array.isArray(parsed)) throw new Error(`${file} must contain a JSON array of plan rows`)
        rows = parsed as PlanRow[]
        source = `file:${file}`
    } else {
        rows = (await db.plan.findMany({
            select: { id: true, planType: true, name: true, tierKey: true, entitlements: true },
            orderBy: [{ planType: "asc" }, { id: "asc" }],
        })) as PlanRow[]
        source = `supabase:${databaseRef()}`
    }

    if (rows.length === 0) {
        console.error(`No plan rows found in ${source} — refusing to report green on an empty set.`)
        process.exitCode = 1
        return
    }

    console.log(`Plan entitlement verification — ${source} (${rows.length} rows)`)

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
