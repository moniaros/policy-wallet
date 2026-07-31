export const runtime = 'nodejs'

import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { hasAnyRole } from "@/lib/api-auth"
import { normalizeBranch } from "@/lib/insurance/taxonomy"
import { db } from "@/lib/db"
import { GLOBAL_LINE_OF_BUSINESS } from "@/lib/services/ai/prompt-overrides"
import { MAX_GUIDANCE_CHARS, OPERATION_LABELS } from "@/lib/admin/ai-prompt-update"
import { updateAiPromptOverride } from "../actions"

// Admin-only internal tooling — English-only per the admin-page precedent.
// i18n-hardcoded-ignore — admin-only internal tooling

const inputClass = "pw-input pw-input-sm"
const labelClass = "block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1"
const sectionClass = "bg-white dark:bg-stone-800 p-6 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700"

export default async function AiPromptOverrideEditorPage({
    params,
    searchParams,
}: {
    params: Promise<{ overrideId: string }>
    searchParams: Promise<{ saved?: string }>
}) {
    const { dbUser } = await getAuthenticatedUser()
    if (!hasAnyRole(dbUser.roles, ["admin"])) {
        redirect("/wallet")
    }

    const { overrideId } = await params
    const { saved } = await searchParams

    const override = await db.aiPromptOverride.findUnique({ where: { id: overrideId } })
    if (!override) notFound()

    const opLabel = OPERATION_LABELS[override.operation] ?? override.operation
    const lobLabel = override.lineOfBusiness === GLOBAL_LINE_OF_BUSINESS
        ? "Global (all lines)"
        : normalizeBranch(override.lineOfBusiness).label.en

    return (
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
            <div>
                <Link href="/admin/ai/prompts" className="text-sm text-primary dark:text-mint hover:underline">← Prompt overrides</Link>
                <h1 className="mt-2 text-3xl font-bold text-stone-900 dark:text-stone-100">{opLabel}</h1>
                <p className="mt-1 text-stone-600 dark:text-stone-400">
                    v{override.version} · {lobLabel} · last changed {override.updatedAt.toISOString().slice(0, 10)}
                </p>
            </div>

            {saved === "1" && (
                <div className="rounded-lg border border-primary/30 bg-primary-soft dark:bg-primary/15 p-3 text-sm font-medium text-[#166534] dark:text-mint">
                    Saved. The guidance applies to the next AI call (cache revalidated).
                </div>
            )}
            {saved === "unchanged" && (
                <div className="rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 p-3 text-sm text-stone-600 dark:text-stone-300">
                    No changes to save.
                </div>
            )}

            <form action={updateAiPromptOverride} className="space-y-6">
                <input type="hidden" name="overrideId" value={override.id} />

                <section className={sectionClass}>
                    <h2 className="font-semibold text-stone-900 dark:text-stone-100 mb-4">Identity (read-only)</h2>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <div className={labelClass}>Operation</div>
                            <div className="text-stone-900 dark:text-stone-100">{opLabel}</div>
                        </div>
                        <div>
                            <div className={labelClass}>Line of business</div>
                            <div className="text-stone-900 dark:text-stone-100">{lobLabel}</div>
                        </div>
                    </div>
                </section>

                <section className={sectionClass}>
                    <h2 className="font-semibold text-stone-900 dark:text-stone-100 mb-4">Editable</h2>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="guidance" className={labelClass}>
                                Guidance (max {MAX_GUIDANCE_CHARS} chars)
                            </label>
                            <textarea id="guidance" name="guidance" defaultValue={override.guidance} rows={8} className={inputClass} required />
                            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                                Appended to the prompt under an &quot;OPERATOR GUIDANCE&quot; label — it supplements the
                                built-in rules and cannot replace the informational-assistant persona. Advice
                                language, persona overrides and reserved delimiters are rejected on save.
                                Validate significant changes with <code>npm run eval</code>.
                            </p>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-stone-900 dark:text-stone-100">
                            <input type="checkbox" name="isActive" defaultChecked={override.isActive} className="h-4 w-4" />
                            Active (inactive overrides are ignored by every AI call)
                        </label>
                    </div>
                </section>

                <button type="submit" className="pw-primary-button px-4 py-2">Save changes</button>
            </form>
        </div>
    )
}
