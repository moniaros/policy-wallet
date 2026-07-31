export const runtime = 'nodejs'

import Link from "next/link"
import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { hasAnyRole } from "@/lib/api-auth"
import { normalizeBranch } from "@/lib/insurance/taxonomy"
import { db } from "@/lib/db"

// Admin-only internal tooling — English-only per the admin-page precedent.
// i18n-hardcoded-ignore — admin-only internal tooling

const card = "rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"

/**
 * Gap-definition editor index. The checkCriteria of each definition is per-LoB
 * PROMPT CONTENT: it is rendered verbatim into the gap-analysis prompt for
 * every policy of that line of business, so this page is the first slice of
 * "edit the prompts used in each line-of-business analysis".
 */
export default async function GapDefinitionsPage() {
    const { dbUser } = await getAuthenticatedUser()
    if (!hasAnyRole(dbUser.roles, ["admin"])) {
        redirect("/wallet")
    }

    const definitions = await db.gapDefinition.findMany({
        orderBy: [{ lineOfBusiness: "asc" }, { slug: "asc" }],
        select: {
            id: true,
            slug: true,
            name: true,
            lineOfBusiness: true,
            severity: true,
            scope: true,
            isActive: true,
            version: true,
            changedAt: true,
        },
    })

    const byLob = new Map<string, typeof definitions>()
    for (const def of definitions) {
        const list = byLob.get(def.lineOfBusiness) ?? []
        list.push(def)
        byLob.set(def.lineOfBusiness, list)
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100">Gap Definitions</h1>
                    <p className="mt-2 text-stone-600 dark:text-stone-400">
                        Per-line-of-business gap checks. The check criteria text is fed verbatim into the
                        AI gap-analysis prompt — edits apply to the next analysis run.
                    </p>
                </div>
                <div className="flex gap-2">
                    <a href="/admin/ai" className="px-3 py-2 rounded-md border border-stone-300 dark:border-stone-700 text-sm text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800">
                        AI Performance
                    </a>
                </div>
            </div>

            {[...byLob.entries()].map(([lob, defs]) => (
                <section key={lob} className={card}>
                    <div className="p-4 border-b border-stone-200 dark:border-stone-700 flex items-center justify-between">
                        <h2 className="font-semibold text-stone-900 dark:text-stone-100">
                            {normalizeBranch(lob).label.en}
                            <span className="ml-2 font-mono text-xs text-stone-400">{lob}</span>
                        </h2>
                        <span className="text-xs text-stone-500 dark:text-stone-400">{defs.length} definitions</span>
                    </div>
                    <div className="p-4 overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-stone-500 dark:text-stone-400">
                                    <th className="py-2 pr-4">Slug</th>
                                    <th className="py-2 pr-4">Name</th>
                                    <th className="py-2 pr-4">Severity</th>
                                    <th className="py-2 pr-4">Scope</th>
                                    <th className="py-2 pr-4">Active</th>
                                    <th className="py-2 pr-4">Version</th>
                                </tr>
                            </thead>
                            <tbody>
                                {defs.map((def) => (
                                    <tr key={def.id} className="border-t border-stone-100 dark:border-stone-700">
                                        <td className="py-2 pr-4">
                                            <Link href={`/admin/gaps/${def.id}`} className="font-mono text-xs text-primary dark:text-mint hover:underline">
                                                {def.slug}
                                            </Link>
                                        </td>
                                        <td className="py-2 pr-4 text-stone-900 dark:text-stone-100">{def.name}</td>
                                        <td className="py-2 pr-4 text-stone-700 dark:text-stone-300">{def.severity}</td>
                                        <td className="py-2 pr-4 text-stone-700 dark:text-stone-300">{def.scope}</td>
                                        <td className="py-2 pr-4">{def.isActive ? "yes" : <span className="text-red-600 dark:text-red-400">no</span>}</td>
                                        <td className="py-2 pr-4 text-stone-700 dark:text-stone-300">v{def.version}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            ))}

            {definitions.length === 0 && (
                <p className="text-sm text-stone-500 dark:text-stone-400">No gap definitions found. Seed the database first.</p>
            )}
        </div>
    )
}
