export const runtime = 'nodejs'

import Link from "next/link"
import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { hasAnyRole } from "@/lib/api-auth"
import { normalizeBranch, WRITE_BRANCH_IDS } from "@/lib/insurance/taxonomy"
import { db } from "@/lib/db"
import {
    GLOBAL_LINE_OF_BUSINESS,
    PROMPT_OPERATIONS,
} from "@/lib/services/ai/prompt-overrides"
import { MAX_GUIDANCE_CHARS, OPERATION_LABELS } from "@/lib/admin/ai-prompt-update"
import { createAiPromptOverride } from "./actions"

// Admin-only internal tooling — English-only per the admin-page precedent.
// i18n-hardcoded-ignore — admin-only internal tooling

const card = "rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"
const inputClass = "pw-input pw-input-sm"
const labelClass = "block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1"

function lobDisplay(lob: string): string {
    return lob === GLOBAL_LINE_OF_BUSINESS ? "Global (all lines)" : normalizeBranch(lob).label.en
}

/**
 * Operator-guidance overrides: admin-authored prompt content appended to one
 * operation's prompt, optionally scoped to a line of business. Guidance is
 * ADDITIVE — it renders under an OPERATOR GUIDANCE label after the canonical
 * task rules and cannot replace the compliance persona (rejected at save time).
 */
export default async function AiPromptOverridesPage({
    searchParams,
}: {
    searchParams: Promise<{ saved?: string }>
}) {
    const { dbUser } = await getAuthenticatedUser()
    if (!hasAnyRole(dbUser.roles, ["admin"])) {
        redirect("/wallet")
    }
    const { saved } = await searchParams

    const overrides = await db.aiPromptOverride.findMany({
        orderBy: [{ operation: "asc" }, { lineOfBusiness: "asc" }],
    })

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100">AI Prompt Overrides</h1>
                    <p className="mt-2 text-stone-600 dark:text-stone-400 max-w-3xl">
                        Operator guidance appended to an operation&apos;s prompt — globally or for one line of
                        business (the LoB row wins). Guidance supplements the built-in rules; it can never
                        replace the informational-assistant persona. Validate significant changes with{" "}
                        <code>npm run eval</code>.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link href="/admin/ai" className="px-3 py-2 rounded-md border border-stone-300 dark:border-stone-700 text-sm text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800">
                        AI Performance
                    </Link>
                    <Link href="/admin/ai/settings" className="px-3 py-2 rounded-md border border-stone-300 dark:border-stone-700 text-sm text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800">
                        Model Settings
                    </Link>
                </div>
            </div>

            {saved === "1" && (
                <div className="rounded-lg border border-primary/30 bg-primary-soft dark:bg-primary/15 p-3 text-sm font-medium text-status-success">
                    Saved. The guidance applies to the next AI call (cache revalidated).
                </div>
            )}

            <section className={card}>
                <div className="p-4 border-b border-stone-200 dark:border-stone-700">
                    <h2 className="font-semibold text-stone-900 dark:text-stone-100">Configured overrides</h2>
                </div>
                <div className="p-4 overflow-x-auto">
                    {overrides.length === 0 ? (
                        <p className="text-sm text-stone-500 dark:text-stone-400">
                            No overrides yet — every prompt runs with its built-in rules only.
                        </p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-stone-500 dark:text-stone-400">
                                    <th className="py-2 pr-4">Operation</th>
                                    <th className="py-2 pr-4">Line of business</th>
                                    <th className="py-2 pr-4">Guidance</th>
                                    <th className="py-2 pr-4">Active</th>
                                    <th className="py-2 pr-4">Version</th>
                                    <th className="py-2 pr-4">Updated</th>
                                </tr>
                            </thead>
                            <tbody>
                                {overrides.map((o) => (
                                    <tr key={o.id} className="border-t border-stone-100 dark:border-stone-700">
                                        <td className="py-2 pr-4">
                                            <Link href={`/admin/ai/prompts/${o.id}`} className="font-mono text-xs text-primary dark:text-mint hover:underline">
                                                {OPERATION_LABELS[o.operation] ?? o.operation}
                                            </Link>
                                        </td>
                                        <td className="py-2 pr-4 text-stone-700 dark:text-stone-300">{lobDisplay(o.lineOfBusiness)}</td>
                                        <td className="py-2 pr-4 text-stone-700 dark:text-stone-300 max-w-md truncate">{o.guidance}</td>
                                        <td className="py-2 pr-4">{o.isActive ? "yes" : <span className="text-red-600 dark:text-red-400">no</span>}</td>
                                        <td className="py-2 pr-4 text-stone-700 dark:text-stone-300">v{o.version}</td>
                                        <td className="py-2 pr-4 text-stone-500 dark:text-stone-400">{o.updatedAt.toISOString().slice(0, 10)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </section>

            <section className={card}>
                <div className="p-4 border-b border-stone-200 dark:border-stone-700">
                    <h2 className="font-semibold text-stone-900 dark:text-stone-100">Create override</h2>
                </div>
                <form action={createAiPromptOverride} className="p-4 space-y-4 max-w-3xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="operation" className={labelClass}>Operation</label>
                            <select id="operation" name="operation" className={inputClass} required>
                                {PROMPT_OPERATIONS.map((op) => (
                                    <option key={op} value={op}>{OPERATION_LABELS[op] ?? op}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="lineOfBusiness" className={labelClass}>Line of business</label>
                            <select id="lineOfBusiness" name="lineOfBusiness" className={inputClass} required>
                                <option value={GLOBAL_LINE_OF_BUSINESS}>Global (all lines)</option>
                                {WRITE_BRANCH_IDS.map((lob) => (
                                    <option key={lob} value={lob}>{normalizeBranch(lob).label.en}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="guidance" className={labelClass}>
                            Guidance (max {MAX_GUIDANCE_CHARS} chars)
                        </label>
                        <textarea id="guidance" name="guidance" rows={5} className={inputClass} required />
                        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                            Appended to the prompt under an &quot;OPERATOR GUIDANCE&quot; label — it cannot replace the
                            built-in persona or grounding rules. Advice language, persona overrides and reserved
                            delimiters are rejected on save.
                        </p>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-stone-900 dark:text-stone-100">
                        <input type="checkbox" name="isActive" defaultChecked className="h-4 w-4" />
                        Active
                    </label>
                    <button type="submit" className="pw-primary-button px-4 py-2">Create</button>
                </form>
            </section>
        </div>
    )
}
