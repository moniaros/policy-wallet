export const runtime = 'nodejs'

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { PolicyWalletClient } from "@/components/wallet/PolicyWalletClient"
import type { Policy } from "@/components/wallet/types"
import { getRoleCopy } from "@/lib/i18n/role-copy"
import { resolveUserEntitlements } from "@/lib/subscription-entitlements"
import { resolveInsurerDisplay } from "@/lib/wallet/insurer-registry"
import {
    displayInsurerName,
    displayPersonName,
    displayPolicyNumber,
    fileNameLabel,
    policyRowIdentity,
} from "@/lib/wallet/policy-identity"
import { normalizeBranch } from '@/lib/insurance/taxonomy'
import { resolveUserLanguage } from "@/lib/i18n/resolve-language"

export default async function WalletPage() {
    const { dbUser } = await getAuthenticatedUser()
    const language = resolveUserLanguage(dbUser.preferredLanguage)
    const roleCopy = getRoleCopy(language)

    const entitlements = await resolveUserEntitlements(dbUser.id)
    const tier = entitlements.tier

    const profile = await db.policyholderProfile.findUnique({
        where: { userId: dbUser.id }
    })
    const showTour = (profile?.preferences as any)?.showTour || false


    let policies = await db.policy.findMany({
        where: {
            ownerUserId: dbUser.id,
            // The API's DELETE path soft-deletes (status 'deleted'). Such a row
            // is not a policy the owner holds: it must neither render as a card
            // nor count in the tiles — the dashboard applies the same predicate,
            // so portfolio.policyCount agrees across the two surfaces.
            status: { not: 'deleted' }
        },
        include: {
            documents: true,
            _count: {
                // Open gaps use the same status set as home / coverage-insights.
                // (Gaps are written 'open'/'detected'; 'active' matched nothing.)
                select: { gapInstances: { where: { status: { in: ['open', 'detected', 'acknowledged'] }, supersededAt: null } } }
            }
        },
        orderBy: {
            endDate: 'asc'
        }
    })

    // Self-heal exactly where the user is staring at the spinner: an
    // 'analyzing' policy whose run's executor died (expired lease) is reaped
    // here, scoped to this user's policies, so the poller's next refresh shows
    // the retryable error instead of an eternal spinner. In prod (no QStash)
    // this and the daily cron are the only recovery paths. No-op — one cheap
    // indexed query — while a live run's heartbeat keeps its lease fresh.
    const analyzingIds = policies.filter((p) => p.status === 'analyzing').map((p) => p.id)
    if (analyzingIds.length > 0) {
        try {
            const { PolicyAnalysisOrchestratorService } = await import(
                '@/lib/services/analysis/policy-analysis-orchestrator.service'
            )
            const { reaped } = await new PolicyAnalysisOrchestratorService().reapStaleRuns({
                graceMs: 2 * 60 * 1000,
                limit: 5,
                policyIds: analyzingIds,
            })
            if (reaped > 0) {
                policies = await db.policy.findMany({
                    where: { ownerUserId: dbUser.id, status: { not: 'deleted' } },
                    include: {
                        documents: true,
                        _count: {
                            select: { gapInstances: { where: { status: { in: ['open', 'detected', 'acknowledged'] }, supersededAt: null } } }
                        }
                    },
                    orderBy: { endDate: 'asc' }
                })
            }
        } catch {
            // Best-effort: a reap hiccup must never break the wallet render.
        }
    }

    // (The agent-relationship query that used to live here existed only to feed
    // MobileAppShell's profile card. With the mobile fork gone it was a dead
    // per-request join on every wallet load, so it was removed. `/agent` is the
    // surface that actually shows the advisor.)

    const user = {
        id: dbUser.id,
        name: dbUser.name || roleCopy.defaults.userName,
        email: dbUser.email,
        photoUrl: dbUser.image || undefined,
        isOnline: true
    }

    // Fetch active access grants
    const allGrants = await db.accessGrant.findMany({
        where: {
            granterUserId: dbUser.id,
            status: 'active',
            scope: { startsWith: 'policy:' }
        },
        include: {
            // The share badge names the grantee and links their id — nothing else (A-01b).
            grantee: { select: { id: true, name: true } }
        }
    })

    // Map Prisma types to UI types
    const mappedPolicies: Policy[] = policies.map(p => {
        // Find grants for this policy
        const policyGrants = allGrants.filter(g => g.scope === `policy:${p.id}`)

        const insuredItem = (() => {
            // Child branches count as their parent: motorbike and truck are motor,
            // renters is home. Matching the id exactly meant a motorbike showed no
            // plate and a rented home no address on the wallet list — the two
            // details that tell you which policy you are looking at.
            const branch = normalizeBranch(p.lineOfBusiness)
            const family = (branch.parentId ?? branch.id).toLowerCase()
            // The SUBTITLE is the identifier, and it goes through the primitive.
            // This read `v.plateNumber` / `prop.postalCode` raw — a second
            // identity path outside `lib/wallet/policy-identity.ts`, which meant
            // an extractor mask («XXXX») or a sentinel rendered here as though
            // it were data. The TITLE is a label (make/model, address) and stays
            // composed here; only identity is delegated.
            const identifier = policyRowIdentity(p).value ?? undefined
            if (family === 'motor' && (p.acordData as any)?.vehicle) {
                const v = (p.acordData as any).vehicle
                return {
                    type: 'vehicle' as const,
                    title: `${v.make || ''} ${v.model || ''}`.trim() || roleCopy.defaults.vehicle,
                    subtitle: identifier
                }
            }
            if (family === 'home' && (p.acordData as any)?.property) {
                const prop = (p.acordData as any).property
                return {
                    type: 'property' as const,
                    title: prop.address || roleCopy.defaults.property,
                    subtitle: identifier
                }
            }
            // Default fallback
            return undefined
        })()

        const extraction = (p.acordData as any)?.extraction
        const hasExtraction = Boolean(extraction)
        const requiresReview = hasExtraction && Boolean(
            extraction?.requiresReview ||
            (typeof extraction?.confidence?.overall === 'number' && extraction.confidence.overall < 80) ||
            (Array.isArray(extraction?.missingCriticalFields) && extraction.missingCriticalFields.length > 0)
        )

        return {
            id: p.id,
            // Scrubbed at the read boundary, not in the components downstream:
            // this list feeds the wallet cards, the table AND the notice strip,
            // and the strip used to interpolate the raw column — which is how
            // "Αυτοκίνητο · __PENDING_EXTRACTION__" reached a customer.
            policyNumber: displayPolicyNumber(p.policyNumber) ?? '',
            // Canonical Greek-market display name (raw extracted strings like
            // "ΕΘΝΙΚΗ Η ΠΡΩΤΗ ΑΣΦΑΛΙΣΤΙΚΗ" normalize to "Εθνική Ασφαλιστική").
            //
            // The uploaded file name USED to be the fallback here, which is
            // precisely the leak: a card for a policy whose extraction had not
            // finished was labelled "LIFE POLICY" because that is what the
            // customer called the file. displayInsurerName's own default is
            // used instead.
            insurerName: displayInsurerName(
                resolveInsurerDisplay(p.insurerName).displayName
            ),
            insurerLogo: null, // Placeholder
            lineOfBusiness: p.lineOfBusiness as any,
            // Pass the RAW stored status and the extracted envelope; the card
            // derives the displayed status via getPolicyStatusView /
            // resolvePolicyLifecycle (canonical, expiry-aware). The old
            // mapStatus was a second pipeline off the placeholder-prone endDate
            // column that could never show 'expired'/'unknown_duration' and
            // contradicted the detail page.
            status: p.status as Policy['status'],
            acordData: p.acordData,
            startDate: p.startDate.toISOString(),
            endDate: p.endDate.toISOString(),
            lastUpdated: p.updatedAt.toISOString(),
            premiumAmount: p.premiumAmount ? Number(p.premiumAmount) : undefined,
            premiumCurrency: p.premiumCurrency || 'EUR',
            sharedWithAgents: policyGrants.map(g => ({
                agentName: displayPersonName(g.grantee.name) || roleCopy.defaults.agentName,
                agentId: g.grantee.id,
                permissions: g.permissions
            })),
            coverageHighlights: [], // Mock or parse from summary
            verified: hasExtraction && !requiresReview,
            documents: p.documents.map((d: any) => ({
                id: d.id,
                fileName: d.fileName,
                uploadedAt: d.uploadedAt.toISOString(),
                uploadedBy: d.source as any
            })),
            insuredItem,
            gapCount: (p as any)._count?.gapInstances || 0,
        } as Policy & { gapCount: number }
    })

    return (
        <div className="pw-page-shell">
            <PolicyWalletClient policies={mappedPolicies} user={user} showTour={showTour} tier={tier} />
        </div>
    )
}
