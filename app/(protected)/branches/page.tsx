export const runtime = 'nodejs'

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { getTranslations } from "@/lib/i18n"
import { buildBranchOverview } from "@/lib/insurance/branch-page"
import { getBranchContent } from "@/lib/insurance/content"
import { getBranchIcon } from "@/lib/insurance/branch-icons"
import { ProductBranchCard } from "@/components/branches/ProductBranchCard"
import { effectivePolicyStatus } from "@/lib/policy-status"

/**
 * Branch coverage overview — every insurance branch as a tile with its
 * covered / attention / gap / neutral state. Read-only: gap states come from
 * the cached ProtectionScore row (never triggers an engine run in render).
 */
export default async function BranchesPage() {
    const { dbUser } = await getAuthenticatedUser()
    const lang: 'el' | 'en' = dbUser.preferredLanguage === 'en' ? 'en' : 'el'
    const t = getTranslations(lang)

    const [policies, score] = await Promise.all([
        db.policy.findMany({
            where: { ownerUserId: dbUser.id },
            // acordData carries the extracted expiry the lifecycle trusts.
            select: { id: true, lineOfBusiness: true, status: true, endDate: true, acordData: true },
        }),
        db.protectionScore.findUnique({ where: { userId: dbUser.id } }),
    ])

    // Tile states must reflect the REAL lifecycle: an expired policy is not
    // "covered" (green) — it renders as attention, never as protection.
    const overview = buildBranchOverview(
        policies.map((policy) => ({
            id: policy.id,
            lineOfBusiness: policy.lineOfBusiness,
            status: effectivePolicyStatus(policy),
            endDate: policy.endDate,
        })),
        (score?.expectedLines as string[] | null) ?? []
    )

    const stateLabels = {
        covered: t.branches.statusCovered,
        attention: t.branches.statusAttention,
        not_held: t.branches.statusNotHeld,
        neutral: t.branches.statusNeutral,
    } as const

    const policyTypeLabels = t.policyTypes as Record<string, string>

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
            <header className="mb-8">
                <h1 className="text-2xl font-black text-black dark:text-white sm:text-3xl">{t.branches.title}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-black/60 dark:text-white/65">{t.branches.subtitle}</p>
            </header>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {overview.map(({ branch, state, policyCount }) => {
                    const content = getBranchContent(branch.id)
                    return (
                        <ProductBranchCard
                            key={branch.id}
                            icon={getBranchIcon(branch.id)}
                            href={`/branches/${branch.id}`}
                            title={policyTypeLabels[branch.id] || branch.label[lang]}
                            tagline={content.tagline[lang]}
                            state={state}
                            stateLabel={stateLabels[state]}
                            policyCount={policyCount}
                            policyCountLabel={
                                policyCount === 1
                                    ? t.branches.onePolicy
                                    : t.branches.policyCountN.replace('{count}', String(policyCount))
                            }
                        />
                    )
                })}
            </div>
        </div>
    )
}
