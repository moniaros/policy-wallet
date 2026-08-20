/**
 * Find and remove the two kinds of rot a failed policy upload used to leave.
 *
 *   1. **Sentinel-valued policies** — rows whose `insurer_name` /
 *      `policy_number` are still the pre-extraction placeholders
 *      (`__PENDING_EXTRACTION__`, `AI Analyzing...`, `PENDING-<n>`). The
 *      product renders these to the customer.
 *
 *   2. **Orphaned storage objects** — bytes in the `policies` bucket that no
 *      `policy_documents` row references. This is the compliance half: an
 *      object with no row is personal data that appears in no GDPR export and
 *      that no erasure request can reach. When this was written, production
 *      held 9 of them and dev held 34.
 *
 * DRY RUN BY DEFAULT. Nothing is deleted without `--apply`.
 *
 *   npx tsx scripts/cleanup-sentinel-policies.ts                # report only
 *   npx tsx scripts/cleanup-sentinel-policies.ts --apply        # delete
 *   npx tsx scripts/cleanup-sentinel-policies.ts --apply --policies-only
 *   npx tsx scripts/cleanup-sentinel-policies.ts --apply --orphans-only
 *
 * Against production, source the prod env first:
 *   set -a; source .prod-db-env; set +a
 *
 * Two safety rails, both deliberate:
 *
 * - A policy is only removed when BOTH halves of its identity are placeholders
 *   AND it is not currently being analysed. A row an agent typed an insurer
 *   into, or one whose analysis is in flight, is reported and left alone.
 * - An orphan younger than `--min-age-hours` (default 24) is left alone: an
 *   upload in flight has its object in the bucket for a few seconds before its
 *   row exists, and deleting that would break a live upload.
 */
import { createClient } from "@supabase/supabase-js"

import { db } from "@/lib/db"
import { env } from "@/lib/env"
import {
    PLACEHOLDER_INSURER_NAMES,
    PLACEHOLDER_POLICY_NUMBER_PREFIX,
    hasPlaceholderIdentity,
} from "@/lib/wallet/policy-identity"

const args = new Set(process.argv.slice(2))
const APPLY = args.has("--apply")
const POLICIES_ONLY = args.has("--policies-only")
const ORPHANS_ONLY = args.has("--orphans-only")

const minAgeArg = process.argv.find((a) => a.startsWith("--min-age-hours="))
const MIN_AGE_HOURS = minAgeArg ? Number(minAgeArg.split("=")[1]) : 24

const BUCKET = "policies"

/** Supabase project ref behind the Prisma connection, or null. */
function databaseRef(): string | null {
    // Same precedence as lib/db.ts, which is the client this script uses.
    const url =
        process.env.POOLED_DATABASE_URL || process.env.DIRECT_URL || process.env.DATABASE_URL || ""
    return (
        url.match(/postgres\.([a-z0-9]{16,})[:@]/)?.[1] ??
        url.match(/db\.([a-z0-9]{16,})\.supabase\.co/)?.[1] ??
        null
    )
}

/** Supabase project ref behind the storage client, or null. */
function storageRef(): string | null {
    return (env.NEXT_PUBLIC_SUPABASE_URL || "").match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1] ?? null
}

/**
 * Refuse to run when the database and the bucket are different projects.
 *
 * `.env.local` in this repo carries TWO `DIRECT_URL` lines — dev first,
 * production second — and dotenv keeps the LAST. So the obvious invocation
 * points Prisma at PRODUCTION while `NEXT_PUBLIC_SUPABASE_URL` still points at
 * dev. A cleanup that reads rows from one project and deletes objects from
 * another would call every live object an orphan. This check is the difference
 * between a cleanup and an incident.
 */
function assertSameProject(): void {
    const dbRef = databaseRef()
    const bucketRef = storageRef()

    if (!dbRef || !bucketRef) {
        throw new Error(
            `Cannot identify the Supabase project (database=${dbRef ?? "unknown"}, storage=${bucketRef ?? "unknown"}). ` +
                `Refusing to run: this script deletes data and must know exactly where.`
        )
    }
    if (dbRef !== bucketRef) {
        throw new Error(
            `Database and storage point at DIFFERENT Supabase projects:\n` +
                `  database (POOLED_DATABASE_URL/DIRECT_URL/DATABASE_URL): ${dbRef}\n` +
                `  storage  (NEXT_PUBLIC_SUPABASE_URL):                    ${bucketRef}\n` +
                `Every object would look orphaned. Fix the environment before re-running.`
        )
    }
}

function label(): string {
    // Enough to tell dev from prod in the output without printing a secret.
    return `supabase:${databaseRef() ?? "unknown-database"}`
}

function adminStorage() {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!env.NEXT_PUBLIC_SUPABASE_URL || !key) {
        throw new Error(
            "SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL are required to inspect storage"
        )
    }
    return createClient(env.NEXT_PUBLIC_SUPABASE_URL, key, {
        auth: { persistSession: false },
    }).storage.from(BUCKET)
}

async function findSentinelPolicies() {
    const policies = await db.policy.findMany({
        where: {
            OR: [
                { insurerName: { in: [...PLACEHOLDER_INSURER_NAMES] } },
                { policyNumber: { startsWith: PLACEHOLDER_POLICY_NUMBER_PREFIX } },
            ],
        },
        select: {
            id: true,
            insurerName: true,
            policyNumber: true,
            status: true,
            ownerUserId: true,
            createdAt: true,
            documents: { select: { id: true, fileUrl: true, storageKey: true } },
        },
        orderBy: { createdAt: "asc" },
    })

    const removable = policies.filter(
        (p) => hasPlaceholderIdentity(p) && p.status !== "analyzing"
    )
    const kept = policies.filter((p) => !removable.includes(p))
    return { policies, removable, kept }
}

/** Every object key in the bucket. Paginated — `list` caps at 100 by default. */
async function listAllObjects(): Promise<Array<{ name: string; createdAt: string | null }>> {
    const storage = adminStorage()
    const out: Array<{ name: string; createdAt: string | null }> = []
    const PAGE = 1000

    for (let offset = 0; ; offset += PAGE) {
        const { data, error } = await storage.list("", { limit: PAGE, offset })
        if (error) throw new Error(`storage.list failed: ${error.message}`)
        if (!data?.length) break
        for (const item of data) {
            // Folders come back with no id; only real objects have one.
            if (!item.id) continue
            out.push({ name: item.name, createdAt: item.created_at ?? null })
        }
        if (data.length < PAGE) break
    }
    return out
}

async function findOrphanedObjects() {
    const [objects, documents] = await Promise.all([
        listAllObjects(),
        db.policyDocument.findMany({ select: { fileUrl: true, storageKey: true } }),
    ])

    // Match on the object key, however the row happens to record it: the
    // storageKey column is authoritative where present, the URL tail otherwise.
    const referenced = new Set<string>()
    for (const doc of documents) {
        if (doc.storageKey) referenced.add(doc.storageKey)
        const tail = (doc.fileUrl || "").split("/").pop()
        if (tail) referenced.add(decodeURIComponent(tail))
    }

    const cutoff = Date.now() - MIN_AGE_HOURS * 3600_000
    const orphans = objects.filter((o) => !referenced.has(o.name))
    const removable = orphans.filter(
        (o) => !o.createdAt || new Date(o.createdAt).getTime() < cutoff
    )
    const tooYoung = orphans.filter((o) => !removable.includes(o))

    return { total: objects.length, referenced: referenced.size, orphans, removable, tooYoung }
}

async function main() {
    assertSameProject()

    console.log(`\nPolicyWallet sentinel/orphan cleanup — ${label()}`)
    console.log(APPLY ? "MODE: APPLY (deletes)" : "MODE: dry run (nothing is deleted)")
    console.log("─".repeat(72))

    let deletedPolicies = 0
    let deletedObjects = 0

    if (!ORPHANS_ONLY) {
        const { policies, removable, kept } = await findSentinelPolicies()
        console.log(`\nSentinel-valued policies: ${policies.length} found`)
        console.log(`  removable (placeholder identity, not analysing): ${removable.length}`)
        console.log(`  kept (user-supplied identity or in flight):      ${kept.length}`)

        for (const p of kept) {
            console.log(
                `    KEEP  ${p.id}  status=${p.status}  insurer=${JSON.stringify(p.insurerName)}  number=${JSON.stringify(p.policyNumber)}`
            )
        }

        for (const p of removable) {
            console.log(
                `    ${APPLY ? "DELETE" : "WOULD DELETE"}  ${p.id}  owner=${p.ownerUserId}  docs=${p.documents.length}  created=${p.createdAt.toISOString()}`
            )
            if (!APPLY) continue

            // Storage first — see lib/services/policy-discard.ts for why.
            const { discardFailedPolicy } = await import("@/lib/services/policy-discard")
            const outcome = await discardFailedPolicy(p.id, { reason: "cleanup_script" })
            if (outcome.discarded) {
                deletedPolicies += 1
                deletedObjects += outcome.objectsRemoved
            } else {
                console.log(`      SKIPPED (${outcome.keptReason}); objects failed: ${outcome.objectsFailed}`)
            }
        }
    }

    if (!POLICIES_ONLY) {
        const { total, referenced, orphans, removable, tooYoung } = await findOrphanedObjects()
        console.log(`\nStorage objects in "${BUCKET}": ${total}`)
        console.log(`  keys referenced by a policy_documents row: ${referenced}`)
        console.log(`  orphaned (no policy_documents row):  ${orphans.length}`)
        console.log(`  removable (older than ${MIN_AGE_HOURS}h):        ${removable.length}`)
        console.log(`  too young to touch (upload in flight): ${tooYoung.length}`)

        if (removable.length > 0) {
            const storage = adminStorage()
            for (let i = 0; i < removable.length; i += 100) {
                const batch = removable.slice(i, i + 100)
                for (const o of batch) {
                    console.log(`    ${APPLY ? "DELETE" : "WOULD DELETE"}  ${o.name}  created=${o.createdAt ?? "unknown"}`)
                }
                if (!APPLY) continue
                const { error } = await storage.remove(batch.map((o) => o.name))
                if (error) {
                    console.error(`    storage.remove failed: ${error.message}`)
                    continue
                }
                deletedObjects += batch.length
            }
        }
    }

    console.log("\n" + "─".repeat(72))
    if (APPLY) {
        console.log(`Deleted ${deletedPolicies} policies and ${deletedObjects} storage objects.`)
    } else {
        console.log("Dry run complete. Re-run with --apply to delete.")
    }
}

main()
    .catch((error) => {
        console.error("\ncleanup-sentinel-policies failed:", error)
        process.exitCode = 1
    })
    .finally(async () => {
        await db.$disconnect()
    })
