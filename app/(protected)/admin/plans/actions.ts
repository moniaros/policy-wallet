"use server"

import { db } from "@/lib/db"
import { revalidatePath, revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import { logAdminAction, verifyAdminRole } from "@/lib/admin/admin-guard"
import { computePlanDiff, parsePlanUpdateForm } from "@/lib/admin/plan-update"
import { PLAN_CATALOG_CACHE_TAG } from "@/lib/pricing/plan-catalog"

// Every surface that renders plan prices/facts — revalidated on save so an
// admin edit lands everywhere without waiting out the cache TTL.
const PLAN_FACT_PATHS = [
    "/pricing",
    "/en/pricing",
    "/for-agents",
    "/upgrade",
    "/agent/pricing",
    "/admin/plans",
] as const

export async function updatePlan(formData: FormData) {
    const admin = await verifyAdminRole()

    const planId = String(formData.get("planId") ?? "")
    const plan = await db.plan.findUnique({ where: { id: planId } })
    if (!plan) throw new Error("Plan not found")

    // Identity is frozen: tierKey/planType/name are not form fields, and the
    // update below never touches them. Parse against the row's audience.
    const planType = plan.planType === "agent" ? "agent" : "policyholder"
    const parsed = parsePlanUpdateForm(formData, planType)

    const diff = computePlanDiff(
        {
            displayName: plan.displayName,
            price: Number(plan.price),
            annualPrice: plan.annualPrice == null ? null : Number(plan.annualPrice),
            trialDays: plan.trialDays,
            isActive: plan.isActive,
            isPublic: plan.isPublic,
            sortOrder: plan.sortOrder,
            entitlements: (plan.entitlements ?? {}) as Record<string, unknown>,
        },
        parsed
    )

    if (Object.keys(diff).length === 0) {
        redirect(`/admin/plans/${planId}?saved=unchanged`)
    }

    const newVersion = plan.version + 1
    await db.$transaction(async (tx) => {
        const updated = await tx.plan.update({
            where: { id: planId },
            data: {
                displayName: parsed.scalars.displayName,
                price: parsed.scalars.price,
                annualPrice: parsed.scalars.annualPrice,
                trialDays: parsed.scalars.trialDays,
                isActive: parsed.scalars.isActive,
                isPublic: parsed.scalars.isPublic,
                sortOrder: parsed.scalars.sortOrder,
                entitlements: parsed.entitlements as object,
                version: newVersion,
            },
        })
        await tx.planRevision.create({
            data: {
                planId,
                version: newVersion,
                snapshot: JSON.parse(JSON.stringify(updated)),
                changes: diff as object,
                changedBy: admin.id,
                changedByEmail: admin.email ?? "unknown",
            },
        })
    })

    await logAdminAction(
        admin.id,
        admin.email ?? "unknown",
        "UPDATE_PLAN",
        `Updated plan ${planId} (v${newVersion}): ${Object.keys(diff).join(", ")}`,
        { planId, version: newVersion, changes: diff }
    )

    // Next 16 signature: the 'max' profile marks tagged entries stale
    // immediately (the admin pages themselves read the raw table, so the
    // editor is fresh regardless — this refreshes the pricing surfaces).
    revalidateTag(PLAN_CATALOG_CACHE_TAG, "max")
    for (const path of PLAN_FACT_PATHS) revalidatePath(path)
    revalidatePath(`/admin/plans/${planId}`)

    redirect(`/admin/plans/${planId}?saved=1`)
}
