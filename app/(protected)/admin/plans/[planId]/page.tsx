export const runtime = 'nodejs'

import Link from "next/link"
import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { updatePlan } from "../actions"
import {
    AgentEntitlementLimitsSchema,
    EntitlementLimitsSchema,
    entitlementFieldKinds,
} from "@/lib/pricing/entitlement-schema"
import { resolveTierKey } from "@/lib/pricing/plan-catalog"
import { defaultEntitlementsForTier } from "@/lib/pricing/plan-defaults"

const inputClass = "pw-input pw-input-sm"
const labelClass = "block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1"

export default async function AdminPlanEditPage({
    params,
    searchParams,
}: {
    params: Promise<{ planId: string }>
    searchParams: Promise<{ saved?: string }>
}) {
    const { planId } = await params
    const { saved } = await searchParams

    const plan = await db.plan.findUnique({
        where: { id: planId },
        include: { revisions: { orderBy: { createdAt: "desc" }, take: 10 } },
    })
    if (!plan) notFound()

    const planType = plan.planType === "agent" ? "agent" : "policyholder"
    const tierKey = resolveTierKey(planType, plan.tierKey, plan.name)

    // The form is pre-filled with the limits IN EFFECT: the row's canonical
    // entitlements when valid, else the code defaults the resolvers fall back
    // to. Saving always writes the canonical shape (first save canonicalizes
    // a legacy row — the revision diff shows it).
    const schema = planType === "agent" ? AgentEntitlementLimitsSchema : EntitlementLimitsSchema
    const parsed = schema.safeParse(plan.entitlements)
    const effective = (parsed.success
        ? parsed.data
        : defaultEntitlementsForTier(tierKey)) as unknown as Record<string, number | boolean | null>
    const usesFallback = !parsed.success

    const fields = entitlementFieldKinds(planType)
    const revisions = plan.revisions

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="mb-6">
                <Link href="/admin/plans" className="text-sm text-primary hover:underline">
                    ← All plans
                </Link>
            </div>
            <h1 className="text-3xl font-bold mb-1 text-stone-900 dark:text-stone-100">
                {plan.displayName}
            </h1>
            <p className="text-sm text-stone-500 dark:text-stone-400 mb-6">
                {plan.id} · {planType} · tier <code>{tierKey}</code>
                {plan.tierKey == null && " (resolved from name — legacy row)"} · v{plan.version}
            </p>

            {saved === "1" && (
                <div className="mb-6 rounded-lg border border-primary/30 bg-primary-soft dark:bg-primary/10 px-4 py-3 text-sm text-status-success">
                    Saved. Pricing surfaces are refreshing now; the cache backstop is ~5 minutes.
                </div>
            )}
            {saved === "unchanged" && (
                <div className="mb-6 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-4 py-3 text-sm text-stone-600 dark:text-stone-300">
                    No changes to save.
                </div>
            )}

            <div className="mb-6 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                Price changes apply to <strong>new checkouts only</strong> — existing subscribers
                keep billing at the price they signed up with. Tier identity ({planType} /{" "}
                <code>{tierKey}</code>) is fixed and cannot be edited.
            </div>
            {usesFallback && (
                <div className="mb-6 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 px-4 py-3 text-sm text-blue-800 dark:text-blue-200">
                    This row still carries a legacy entitlements shape; the values below are the
                    code defaults currently in effect. Saving writes them in the canonical shape.
                </div>
            )}

            <form action={updatePlan} className="space-y-8">
                <input type="hidden" name="planId" value={plan.id} />

                <section className="bg-white dark:bg-stone-800 p-6 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700">
                    <h2 className="text-lg font-semibold mb-4 text-stone-800 dark:text-stone-200">
                        Pricing
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="page-f1" className={labelClass}>Display name</label>
                            <input id="page-f1" name="displayName" defaultValue={plan.displayName} required maxLength={60} className={inputClass} />
                        </div>
                        <div>
                            <label htmlFor="page-f2" className={labelClass}>Monthly price (€, incl. VAT)</label>
                            <input id="page-f2" name="price" type="number" step="0.01" min="0" max="999" required defaultValue={Number(plan.price)} className={inputClass} />
                        </div>
                        <div>
                            <label htmlFor="page-f3" className={labelClass}>Annual price (€, incl. VAT — empty = 12× monthly)</label>
                            <input id="page-f3" name="annualPrice" type="number" step="0.01" min="0" max="9999" defaultValue={plan.annualPrice == null ? "" : Number(plan.annualPrice)} className={inputClass} />
                        </div>
                        <div>
                            <label htmlFor="page-f4" className={labelClass}>Trial days (0 = no trial)</label>
                            <input id="page-f4" name="trialDays" type="number" step="1" min="0" max="90" required defaultValue={plan.trialDays} className={inputClass} />
                        </div>
                        <div>
                            <label htmlFor="page-f5" className={labelClass}>Sort order</label>
                            <input id="page-f5" name="sortOrder" type="number" step="1" min="0" max="99" required defaultValue={plan.sortOrder} className={inputClass} />
                        </div>
                        <div className="flex items-end gap-6 pb-1">
                            <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
                                <input name="isActive" type="checkbox" defaultChecked={plan.isActive} className="h-4 w-4" />
                                Purchasable
                            </label>
                            <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
                                <input name="isPublic" type="checkbox" defaultChecked={plan.isPublic} className="h-4 w-4" />
                                Shown on pricing
                            </label>
                        </div>
                    </div>
                </section>

                <section className="bg-white dark:bg-stone-800 p-6 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700">
                    <h2 className="text-lg font-semibold mb-1 text-stone-800 dark:text-stone-200">
                        Entitlements
                    </h2>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">
                        Enforced limits — these ARE what the product gates on. Numbers: “Unlimited”
                        overrides the value.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                        {fields.map(({ key, kind }) => (
                            <div key={key} className="flex items-center justify-between gap-3 py-1 border-b border-stone-100 dark:border-stone-700/60">
                                <span className="text-sm text-stone-700 dark:text-stone-300 font-mono">{key}</span>
                                {kind === "boolean" ? (
                                    <input
                                        name={`ent_${key}`}
                                        type="checkbox"
                                        defaultChecked={effective[key] === true}
                                        className="h-4 w-4"
                                    />
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <input
                                            name={`ent_${key}`}
                                            type="number"
                                            step="1"
                                            min="0"
                                            defaultValue={effective[key] == null ? "" : Number(effective[key])}
                                            className="pw-input pw-input-sm w-28 text-right"
                                        />
                                        <label className="flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400">
                                            <input
                                                name={`ent_${key}_unlimited`}
                                                type="checkbox"
                                                defaultChecked={effective[key] == null}
                                                className="h-3.5 w-3.5"
                                            />
                                            Unlimited
                                        </label>
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                <button
                    type="submit"
                    className="pw-primary-button"
                >
                    Save changes
                </button>
            </form>

            <section className="mt-10">
                <h2 className="text-lg font-semibold mb-3 text-stone-800 dark:text-stone-200">
                    Change history
                </h2>
                {revisions.length === 0 ? (
                    <p className="text-sm text-stone-500 dark:text-stone-400">No edits yet.</p>
                ) : (
                    <ul className="space-y-3">
                        {revisions.map((rev) => (
                            <li key={rev.id} className="bg-white dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700 px-4 py-3 text-sm">
                                <div className="flex justify-between text-stone-500 dark:text-stone-400 text-xs mb-1">
                                    <span>
                                        v{rev.version} · {rev.changedByEmail}
                                    </span>
                                    <span>{rev.createdAt.toISOString().replace("T", " ").slice(0, 16)} UTC</span>
                                </div>
                                <ul className="space-y-0.5">
                                    {Object.entries(rev.changes as Record<string, { from: unknown; to: unknown }>).map(
                                        ([field, change]) => (
                                            <li key={field} className="font-mono text-xs text-stone-700 dark:text-stone-300">
                                                {field}: {JSON.stringify(change.from)} → {JSON.stringify(change.to)}
                                            </li>
                                        )
                                    )}
                                </ul>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    )
}
