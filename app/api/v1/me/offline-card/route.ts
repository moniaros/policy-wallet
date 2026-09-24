import { withApiGuard } from "@/lib/api-guard"
import { createApiResponse } from "@/lib/api-utils"
import { db } from "@/lib/db"
import { NON_LIVE_POLICY_STATUSES } from "@/lib/policy-status"
import { offlineCardRows } from "@/lib/wallet/offline-card"
import { loadCatalogueInsurers, matchVerifiedCallCentre } from "@/lib/wallet/verified-insurer-contact"

/**
 * Spec v2 §18.1: the roadside numbers, as a small JSON the service worker
 * caches (public/sw.js) so /offline can show them with no connection. Own
 * policies only — a cached copy must never outlive a family membership.
 */
export const GET = withApiGuard({ auth: { mode: "user" } }, async ({ auth }) => {
    const policies = await db.policy.findMany({
        where: { ownerUserId: auth!.dbUser.id, status: { notIn: [...NON_LIVE_POLICY_STATUSES] } },
        select: { id: true, insurerName: true, lineOfBusiness: true, endDate: true, acordData: true },
        orderBy: { endDate: "asc" },
    })
    const catalogue = await loadCatalogueInsurers()
    const response = createApiResponse({ generatedAt: new Date().toISOString(), rows: offlineCardRows(policies, (name) => matchVerifiedCallCentre(catalogue, name)) })
    response.headers.set("Cache-Control", "private, no-store")
    return response
})
