export const runtime = 'nodejs'

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import { calculatePolicyStatus, getStatusColor, getStatusLabel, getDaysUntilExpiry } from "@/lib/policy-status"
import { AnalysisCard } from "@/app/(protected)/wallet/[id]/AnalysisCard"
import { CollaborationTimeline } from "@/components/collaboration/CollaborationTimeline"
import { TrendingUp, MessageSquare, Plus, FileText } from "lucide-react"
import { getTranslations } from "@/lib/i18n"
import { getBranch, normalizeBranch } from "@/lib/insurance/taxonomy"

export default async function AgentPolicyDetailPage({ params }: { params: Promise<{ id: string, policyId: string }> }) {
    const { id: customerId, policyId } = await params
    const { dbUser } = await getAuthenticatedUser()

    // 1. Verify access through the central policy authorization: usable
    // relationship OR an active grant scoped to THIS policy (previously any
    // single grant exposed every policy of the customer here).
    const { getPolicyAccess } = await import("@/lib/policy-access")
    const access = await getPolicyAccess(policyId, {
        id: dbUser.id,
        roles: dbUser.roles,
    })
    if (!access.canRead || access.policy?.ownerUserId !== customerId) {
        notFound()
    }

    // 2. Fetch Policy Details
    const policy = await db.policy.findUnique({
        where: {
            id: policyId,
            ownerUserId: customerId
        },
        include: {
            documents: true,
            gapInstances: {
                include: { definition: true }
            }
        }
    })

    if (!policy) {
        notFound()
    }

    // 3. Fetch Customer for Breadcrumbs + relationship for collaboration
    const [customer, relationship] = await Promise.all([
        db.user.findUnique({
            where: { id: customerId },
            select: { name: true }
        }),
        db.customerRelationship.findFirst({
            where: { agentUserId: dbUser.id, policyholderUserId: customerId },
            select: { id: true }
        })
    ])

    const status = calculatePolicyStatus(policy)
    const statusColor = getStatusColor(status)
    const statusLabel = getStatusLabel(status)
    const daysLeft = getDaysUntilExpiry(policy.endDate)

    const language = ((dbUser.preferredLanguage as 'el' | 'en') || 'el')
    const t = getTranslations(language)
    const pd = t.agentPages.policyDetail
    const locale = language === 'el' ? 'el-GR' : 'en-GB'
    const branch = getBranch(policy.lineOfBusiness) ?? normalizeBranch(policy.lineOfBusiness)
    const lobPhrase = { el: `Κάλυψη ${branch.genitiveEl}`, en: `${branch.label.en} Protection` }[language]
    const isManagedByViewer = access.grantLevel === 'manage' || policy.createdByUserId === dbUser.id
    const returnHere = encodeURIComponent(`/customers/${customerId}/policy/${policyId}`)
    const editHref = `/wallet/${policyId}/edit?returnTo=${returnHere}`
    // Agent-only extraction review: offered while the AI-extracted data is
    // unconfirmed or flagged, to agents who can write to this policy. The
    // role check mirrors the review page's own gate — a non-agent write
    // grantee must not see a link that 404s.
    const { isAgentRole } = await import("@/lib/auth/require-agent")
    const reviewState = (policy.acordData as any)?.extraction?.reviewState
    const showReviewLink =
        isAgentRole(dbUser.roles) &&
        access.canWrite &&
        (reviewState === 'unconfirmed' || reviewState === 'flagged') &&
        policy.status !== 'analyzing'

    return (
        <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-2 mb-8 text-sm font-medium">
                <Link href="/customers" className="text-neutral-500 hover:text-primary dark:hover:text-mint transition-colors">{pd.breadcrumbCustomers}</Link>
                <svg className="w-4 h-4 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
                {customer ? (
                    <Link href={`/customers/${customerId}`} className="text-neutral-500 hover:text-primary dark:hover:text-mint transition-colors">
                        {customer.name}
                    </Link>
                ) : (
                    <span className="text-neutral-500">{pd.loading}</span>
                )}
                <svg className="w-4 h-4 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-neutral-900 dark:text-neutral-100">{policy.policyNumber}</span>
            </nav>

            {/* Agent Action Banner */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-6 mb-8 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="bg-amber-100 dark:bg-amber-800 p-3 rounded-2xl">
                        <TrendingUp className="w-6 h-6 text-amber-700 dark:text-amber-400" />
                    </div>
                    <div>
                        <p className="text-sm font-black text-amber-900 dark:text-amber-100 uppercase tracking-widest">{pd.portfolioManager}</p>
                        <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mt-0.5">{pd.portfolioManagerDesc}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    {showReviewLink && (
                        <Link
                            href={`/wallet/${policyId}/review?returnTo=${returnHere}`}
                            className="flex-1 md:flex-none px-6 py-2.5 bg-amber-100 hover:bg-amber-200 dark:bg-amber-800 dark:hover:bg-amber-700 text-amber-900 dark:text-amber-100 rounded-2xl text-xs font-black uppercase tracking-widest text-center transition-all active:scale-95"
                        >
                            {pd.reviewExtraction}
                        </Link>
                    )}
                    {access.canWrite && (
                        <Link
                            href={editHref}
                            className="flex-1 md:flex-none px-6 py-2.5 bg-primary hover:bg-primary-hover text-white dark:text-[#1A2420] rounded-2xl text-xs font-black uppercase tracking-widest text-center shadow-lg shadow-primary/20 transition-all active:scale-95"
                        >
                            {pd.edit}
                        </Link>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Header Card */}
                    <div className="bg-white dark:bg-neutral-800 rounded-3xl shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                        <div className="p-8 border-b border-neutral-100 dark:border-neutral-700">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className={`px-3 py-1 rounded-full text-kicker font-black uppercase tracking-widest ${statusColor.bg} ${statusColor.text} border ${statusColor.border}`}>
                                            {statusLabel}
                                        </span>
                                        {isManagedByViewer && (
                                            <span className="px-3 py-1 rounded-full text-kicker font-black uppercase tracking-widest bg-primary-soft text-[#166534] dark:bg-primary/15 dark:text-mint">
                                                {pd.managedByYou}
                                            </span>
                                        )}
                                        {daysLeft >= 0 && daysLeft <= 30 && (
                                            <span className="text-amber-700 dark:text-amber-400 text-xs font-bold">
                                                {{ el: `Λήγει σε ${daysLeft} ημέρες`, en: `Expires in ${daysLeft} days` }[language]}
                                            </span>
                                        )}
                                    </div>
                                    <h1 className="text-4xl font-black text-foreground tracking-tight leading-tight">
                                        {policy.insurerName}
                                    </h1>
                                    <p className="text-xl text-neutral-500 font-medium mt-1 uppercase tracking-tighter">{lobPhrase}</p>
                                </div>
                                <div className="bg-neutral-50 dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-100 dark:border-neutral-700 text-center md:min-w-[200px]">
                                    <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1">{pd.annualPremium}</p>
                                    <p className="text-3xl font-black text-foreground leading-none">
                                        {Number(policy.premiumAmount || 0).toLocaleString(locale, { style: 'currency', currency: policy.premiumCurrency || 'EUR' })}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-8">
                            <h2 className="text-sm font-black text-neutral-500 uppercase tracking-widest mb-6">{pd.coverageHighlights}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex items-start gap-4">
                                    <div className="mt-1 w-5 h-5 rounded-full bg-primary-soft dark:bg-primary/15 flex items-center justify-center text-primary dark:text-mint shrink-0">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="3" /></svg>
                                    </div>
                                    <div>
                                        <p className="font-bold text-neutral-900 dark:text-neutral-100">{pd.standardCoverage}</p>
                                        <p className="text-sm text-neutral-500 mt-1">{pd.standardCoverageDesc}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="mt-1 w-5 h-5 rounded-full bg-primary-soft dark:bg-primary/15 flex items-center justify-center text-primary dark:text-mint shrink-0">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="3" /></svg>
                                    </div>
                                    <div>
                                        <p className="font-bold text-neutral-900 dark:text-neutral-100">{pd.directSupport}</p>
                                        <p className="text-sm text-neutral-500 mt-1">{pd.directSupportDesc}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Summary Section */}
                    <div className="bg-neutral-50 dark:bg-neutral-900/30 rounded-3xl p-8 border border-neutral-100 dark:border-neutral-800">
                        <h2 className="text-sm font-black text-neutral-500 uppercase tracking-widest mb-4">{pd.summary}</h2>
                        <div className="prose dark:prose-invert max-w-none text-neutral-600 dark:text-neutral-500 leading-relaxed">
                            {policy.coverageSummary || pd.noSummary}
                        </div>
                    </div>

                    {/* Gap Analysis */}
                    <AnalysisCard policyId={policyId} gaps={policy.gapInstances as any} canRequestOwnerConsent />

                    <CollaborationTimeline
                        policyId={policyId}
                        relationshipId={relationship?.id || null}
                        viewerRole="agent"
                    />

                    {/* AI Analysis Insights (ACORD) */}
                    {(policy as any).acordData && typeof (policy as any).acordData === 'object' && Object.keys((policy as any).acordData).length > 0 && (
                        <div className="bg-white dark:bg-neutral-800 rounded-3xl p-8 border border-neutral-200 dark:border-neutral-700 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-sm font-black text-foreground uppercase tracking-widest">{pd.aiInsights}</h2>
                                    <span className="px-2 py-0.5 rounded-full bg-primary-soft dark:bg-primary/15 text-primary dark:text-mint text-kicker font-black uppercase tracking-widest border border-primary/20 dark:border-primary/30">
                                        {pd.acordVerified}
                                    </span>
                                </div>
                                {(policy as any).lastAnalyzedAt && (
                                    <span className="text-kicker text-neutral-500 font-bold uppercase tracking-widest">
                                        {pd.lastCheck}: {new Date((policy as any).lastAnalyzedAt).toLocaleDateString(locale)}
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div>
                                        <p className="text-kicker font-black text-neutral-500 uppercase tracking-widest mb-2">{pd.verificationOverview}</p>
                                        <div className="p-4 bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                                            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                                                {pd.verificationOverviewDesc}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-kicker font-black text-neutral-500 uppercase tracking-widest mb-1">{pd.contractInsurer}</p>
                                            <p className="text-xs font-bold text-foreground">{(policy as any).acordData.policy?.insurer || policy.insurerName}</p>
                                        </div>
                                        <div>
                                            <p className="text-kicker font-black text-neutral-500 uppercase tracking-widest mb-1">{pd.premiumFound}</p>
                                            <p className="text-xs font-bold text-primary dark:text-mint">
                                                {(policy as any).acordData.policy?.premium?.amount} {(policy as any).acordData.policy?.premium?.currency}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-kicker font-black text-neutral-500 uppercase tracking-widest mb-2">{pd.structuredCoverages}</p>
                                    <div className="space-y-2">
                                        {(policy as any).acordData.coverages?.map((cov: any, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center text-micro p-3 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-100 dark:border-neutral-700 shadow-sm">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-neutral-900 dark:text-neutral-100 uppercase tracking-tighter">{cov.name}</span>
                                                    {cov.deductible && <span className="text-kicker text-neutral-500">{pd.deductible}: {cov.deductible}</span>}
                                                </div>
                                                <span className="font-mono text-primary dark:text-mint font-black">{cov.limit}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Quick Stats Sidebar */}
                    <div className="bg-white dark:bg-neutral-800 rounded-3xl p-6 shadow-sm border border-neutral-200 dark:border-neutral-700 space-y-6">
                        <div>
                            <p className="text-kicker font-black text-neutral-500 uppercase tracking-widest mb-2">{pd.policyId}</p>
                            <p className="font-mono text-sm text-neutral-900 dark:text-neutral-100 font-bold bg-neutral-50 dark:bg-neutral-900/50 p-3 rounded-xl">{policy.policyNumber}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-kicker font-black text-neutral-500 uppercase tracking-widest mb-1">{pd.starts}</p>
                                <p className="text-neutral-900 dark:text-neutral-100 font-bold">{policy.startDate.toLocaleDateString(locale)}</p>
                            </div>
                            <div>
                                <p className="text-kicker font-black text-neutral-500 uppercase tracking-widest mb-1">{pd.ends}</p>
                                <p className="text-neutral-900 dark:text-neutral-100 font-bold">{policy.endDate.toLocaleDateString(locale)}</p>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-neutral-100 dark:border-neutral-700">
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${policy.status === 'active' ? 'bg-primary' : 'bg-neutral-400'}`}></span>
                                <span className="text-xs font-bold text-neutral-500 uppercase">{pd.agentAccessActive}</span>
                            </div>
                        </div>
                    </div>

                    {/* Documents Sidebar */}
                    <div className="bg-white dark:bg-neutral-800 rounded-3xl p-6 shadow-sm border border-neutral-200 dark:border-neutral-700">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-sm font-black text-neutral-500 uppercase tracking-widest">{pd.documents}</h3>
                        </div>

                        {policy.documents.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-xs text-neutral-500 italic">{pd.noFiles}</p>
                            </div>
                        ) : (
                            <ul className="space-y-4">
                                {policy.documents.map((doc: any) => (
                                    <li key={doc.id}>
                                        <a href={`/api/v1/policies/${policy.id}/documents/${doc.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-700/50 group transition-all">
                                            <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-neutral-600 group-hover:text-primary dark:group-hover:text-mint transition-colors">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-xs font-bold text-foreground truncate">{doc.fileName}</p>
                                                <p className="text-xs text-neutral-500 uppercase tracking-widest">{pd.contract}</p>
                                            </div>
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
