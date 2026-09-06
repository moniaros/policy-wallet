export const runtime = 'nodejs'

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { getTranslations } from "@/lib/i18n"
import { resolveUserLanguage } from "@/lib/i18n/resolve-language"
import { isPolicyCoverageActive } from "@/lib/policy-status"
import { getGapEngineSnapshot, type GapEngineSnapshot } from "@/lib/services/gap-engine"
import { resolveUserEntitlements } from "@/lib/subscription-entitlements"
import { RecommendationCards } from "@/components/coverage/RecommendationCards"

/**
 * «Συστάσεις» — the recommendations as a page of their own (story rebuild,
 * 2026-09-07; the owner chose a dedicated route over a lens on /protection).
 *
 * The SAME read as /protection's recommendation block — `getGapEngineSnapshot`
 * is read-only (no gap-instance writes, no score caching) and returns the
 * persisted recommendation set, so dismissals stay respected — rendered by the
 * SAME component with the SAME count key. Two routes, one truth: a person who
 * opens both sees one list. When the snapshot cannot be built the page says so
 * instead of rendering an empty list that would read as «nothing to do».
 */
export default async function RecommendationsPage() {
    const { dbUser } = await getAuthenticatedUser()
    const lang: 'el' | 'en' = resolveUserLanguage(dbUser.preferredLanguage)
    const t = getTranslations(lang)
    const copy = t.recommendationsPage

    const [entitlements, policies] = await Promise.all([
        resolveUserEntitlements(dbUser.id),
        db.policy.findMany({
            where: { ownerUserId: dbUser.id, status: { not: 'deleted' } },
            select: {
                id: true,
                lineOfBusiness: true,
                status: true,
                endDate: true,
                acordData: true,
                policyNumber: true,
                insurerName: true,
                lastAnalyzedAt: true,
            },
        }),
    ])

    let snapshot: GapEngineSnapshot | null = null
    try {
        snapshot = await getGapEngineSnapshot(dbUser.id)
    } catch (err) {
        console.error("Gap engine snapshot failed on /recommendations:", err)
    }

    // Coverage TODAY drives the empty state, exactly as on /protection.
    const hasPolicies = policies.some((policy) => isPolicyCoverageActive(policy))

    return (
        <div className="pw-page-shell">
            <div className="mx-auto max-w-4xl space-y-4 px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
                <div className="min-w-0">
                    <h1 className="text-h3 font-semibold tracking-tight text-foreground">{copy.title}</h1>
                    <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted-foreground">{copy.subtitle}</p>
                </div>

                {snapshot ? (
                    <RecommendationCards
                        recommendations={snapshot.recommendations.map((r) => ({
                            ...r,
                            createdAt: r.createdAt.toISOString(),
                        }))}
                        countKey="recommendation.openCount"
                        language={lang}
                        profileIncomplete={snapshot.profileCompleteness < 80}
                        smartContent={snapshot.smartContent}
                        tier={entitlements.tier}
                        hasPolicies={hasPolicies}
                    />
                ) : (
                    <div className="pw-card pw-pad text-sm text-muted-foreground" role="status" data-state="unavailable">
                        {copy.unavailable}
                    </div>
                )}

                <Link
                    href="/protection"
                    className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary hover:underline dark:text-mint"
                >
                    {copy.allProtection}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
            </div>
        </div>
    )
}
