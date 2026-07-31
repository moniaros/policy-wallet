export const runtime = 'nodejs'

import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { hasAnyRole } from "@/lib/api-auth"
import { normalizeBranch } from "@/lib/insurance/taxonomy"
import { db } from "@/lib/db"
import { MAX_CHECK_CRITERIA_CHARS } from "@/lib/admin/gap-definition-update"
import { updateGapDefinitionFromForm } from "../actions"

// Admin-only internal tooling — English-only per the admin-page precedent.
// i18n-hardcoded-ignore — admin-only internal tooling

const inputClass = "pw-input pw-input-sm"
const labelClass = "block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1"
const sectionClass = "bg-white dark:bg-stone-800 p-6 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700"

export default async function GapDefinitionEditorPage({
    params,
    searchParams,
}: {
    params: Promise<{ gapDefinitionId: string }>
    searchParams: Promise<{ saved?: string }>
}) {
    const { dbUser } = await getAuthenticatedUser()
    if (!hasAnyRole(dbUser.roles, ["admin"])) {
        redirect("/wallet")
    }

    const { gapDefinitionId } = await params
    const { saved } = await searchParams

    const def = await db.gapDefinition.findUnique({ where: { id: gapDefinitionId } })
    if (!def) notFound()

    const checkCriteria = String(
        (def.detectionLogic as Record<string, unknown> | null)?.check ?? def.description ?? ""
    )
    // Admin pages are English-only; raw LoB codes must not render as UI text.
    const lobLabel = normalizeBranch(def.lineOfBusiness).label.en

    return (
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
            <div>
                <Link href="/admin/gaps" className="text-sm text-primary dark:text-mint hover:underline">← Gap definitions</Link>
                <h1 className="mt-2 text-3xl font-bold text-stone-900 dark:text-stone-100">{def.slug}</h1>
                <p className="mt-1 text-stone-600 dark:text-stone-400">
                    v{def.version} · {lobLabel} · {def.scope}
                    {def.changedAt ? ` · last changed ${def.changedAt.toISOString().slice(0, 10)}` : ""}
                </p>
            </div>

            {saved === "1" && (
                <div className="rounded-lg border border-primary/30 bg-primary-soft dark:bg-primary/15 p-3 text-sm font-medium text-[#166534] dark:text-mint">
                    Saved. The new check criteria applies to the next analysis run (reads are uncached).
                </div>
            )}

            <form action={updateGapDefinitionFromForm} className="space-y-6">
                <input type="hidden" name="gapDefinitionId" value={def.id} />

                <section className={sectionClass}>
                    <h2 className="font-semibold text-stone-900 dark:text-stone-100 mb-4">Identity (read-only)</h2>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <div className={labelClass}>Slug</div>
                            <div className="font-mono text-xs text-stone-900 dark:text-stone-100">{def.slug}</div>
                        </div>
                        <div>
                            <div className={labelClass}>Line of business</div>
                            <div className="text-stone-900 dark:text-stone-100">{lobLabel}</div>
                        </div>
                        <div>
                            <div className={labelClass}>Rule id</div>
                            <div className="font-mono text-xs text-stone-900 dark:text-stone-100">{def.ruleId}</div>
                        </div>
                        <div>
                            <div className={labelClass}>Severity</div>
                            <div className="text-stone-900 dark:text-stone-100">{def.severity}</div>
                        </div>
                    </div>
                </section>

                <section className={sectionClass}>
                    <h2 className="font-semibold text-stone-900 dark:text-stone-100 mb-4">Editable</h2>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="name" className={labelClass}>Name</label>
                            <input id="name" name="name" defaultValue={def.name} className={inputClass} required />
                        </div>
                        <div>
                            <label htmlFor="description" className={labelClass}>Description</label>
                            <textarea id="description" name="description" defaultValue={def.description} rows={3} className={inputClass} required />
                        </div>
                        <div>
                            <label htmlFor="checkCriteria" className={labelClass}>
                                Check criteria (AI prompt content — max {MAX_CHECK_CRITERIA_CHARS} chars)
                            </label>
                            <textarea id="checkCriteria" name="checkCriteria" defaultValue={checkCriteria} rows={5} className={inputClass} required />
                            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                                Rendered verbatim into the gap-analysis prompt for every {lobLabel} policy.
                                Advice language, persona overrides and reserved delimiters are rejected on save.
                                Validate significant changes with <code>npm run eval</code>.
                            </p>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-stone-900 dark:text-stone-100">
                            <input type="checkbox" name="isActive" defaultChecked={def.isActive} className="h-4 w-4" />
                            Active (inactive definitions are skipped by every analysis)
                        </label>
                    </div>
                </section>

                <button type="submit" className="pw-primary-button px-4 py-2">Save changes</button>
            </form>
        </div>
    )
}
