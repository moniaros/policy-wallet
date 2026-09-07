export const runtime = 'nodejs'

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import { calculatePolicyStatus, getStatusColor, getStatusLabel, resolvePolicyLifecycle } from "@/lib/policy-status"
import { AnalysisCard } from "@/app/(protected)/wallet/[id]/AnalysisCard"
import { CollaborationTimeline } from "@/components/collaboration/CollaborationTimeline"
import { TrendingUp, MessageSquare, Plus, FileText } from "lucide-react"
import { getTranslations } from "@/lib/i18n"
import { attemptedRuleCountOf, describeFindingsProvenance, findingsProvenanceLine, formatProvenanceDate } from "@/lib/gaps/findings-provenance"
import { composeFindings } from "@/lib/gaps/composition"
import { extractionConfirmation, resolveRecordStatus } from "@/lib/wallet/record-status"
import { formatDate, formatDateTime, resolveLocale } from "@/lib/i18n/format"
import { branchFamilyId, getBranch, normalizeBranch } from "@/lib/insurance/taxonomy"
import { displayInsurerName, displayPolicyNumber, policyAssetIdentity } from '@/lib/wallet/policy-identity'
import { deriveInsuredNames } from '@/lib/wallet/insured-people'
import { provenanceOf } from '@/lib/gaps/provenance'
import { resolveInsurerDisplay } from '@/lib/wallet/insurer-registry'
import { OPEN_GAP_STATUSES } from '@/lib/wallet/gap-status'
import { resolveUserLanguage } from "@/lib/i18n/resolve-language"

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
            // Same order and the same six display fields as the customer's page
            // (wallet/[id]): a bare include re-loaded storage locators this page
            // never renders (PW-BRIDGE-01 A-14).
            documents: {
                orderBy: { uploadedAt: 'desc' },
                select: { id: true, fileName: true, fileSize: true, uploadedAt: true, documentKind: true, mimeType: true },
            },
            gapInstances: {
                // The LIVE set the customer's page reads: `supersededAt: null` alone
                // listed resolved and dismissed findings as current on the advisor's
                // side and fed them into the composition (PW-BRIDGE-01 A-15).
                where: { status: { in: [...OPEN_GAP_STATUSES] }, supersededAt: null },
                include: { definition: true, analysisRun: { select: { id: true, finishedAt: true } } }
            },
            analysisRuns: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: { id: true, status: true, finishedAt: true, createdAt: true, attemptedRules: true },
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
    // Was getDaysUntilExpiry(policy.endDate) — the raw column, which
    // resolvePolicyLifecycle treats as its LAST fallback behind a renewal
    // re-upload and the extracted envelope. The status badge beside this
    // number already used the resolved date, so a renewed policy could show
    // "Active" next to a negative days-left. One source for both now.
    // ONE lifecycle call for status, end date and countdown (CLAUDE.md: never re-derive) — the end date
    // rendered below is the lifecycle's, not the raw column (A-04).
    const lifecycle = resolvePolicyLifecycle(policy)
    const daysLeft = lifecycle.daysUntilExpiry ?? 0

    const language = resolveUserLanguage(dbUser.preferredLanguage)
    const t = getTranslations(language)
    // The status label in the ACCOUNT's language — it was computed before the language was resolved and
    // defaulted to Greek for every account (A-19).
    const statusLabel = getStatusLabel(status, language)
    // A placeholder number (PENDING-…) never renders (A-05): the identity module returns null and the page
    // says the value could not be read — the same words the customer reads.
    const shownPolicyNumber = displayPolicyNumber(policy.policyNumber)
    const unreadable = t.wallet.policyDetailsPage.valueUnreadable
    // The premium as the customer's view computes it (getPremiumAmount): the
    // extracted amount first, the column second — and the column is a Prisma
    // Decimal, so a `typeof … === "number"` test was false for every real policy
    // and rendered «Δεν διαβάστηκε» beside the customer's «312,40 €» (harness,
    // expired state, 2026-09-07).
    const extractedPremium = Number((policy.acordData as any)?.policy?.premium?.amount)
    const premiumNumber =
        Number.isFinite(extractedPremium) && extractedPremium > 0
            ? extractedPremium
            : policy.premiumAmount == null
              ? null
              : Number(policy.premiumAmount.toString())
    const hasPremium = premiumNumber !== null && Number.isFinite(premiumNumber) && premiumNumber > 0
    // The coverage type as the customer's view derives it (getCoverageType):
    // the envelope's line of business first, the column second.
    const coverageType: string = (policy.acordData as any)?.policy?.lineOfBusiness || policy.lineOfBusiness

    // "What is insured?" — the same primitive and the same words as the customer's
    // head (PolicyDetailsClientView → PolicyHead): the plate through the ONE
    // line→field map for motor, the first insured person otherwise. The value
    // keeps an extractor mask so the unreadable pipeline can say so (A-13).
    const insuredSubject =
        branchFamilyId(coverageType) === "motor"
            ? { label: t.wallet.policyDetailsPage.headInsuredVehicle, field: policyAssetIdentity({ lineOfBusiness: coverageType, acordData: policy.acordData }) }
            : { label: t.wallet.policyDetailsPage.headInsuredPerson, field: { value: deriveInsuredNames(policy.acordData)[0] ?? null, readable: true } }

    // The under-review figure the customer's report band states («— εκ των οποίων N
    // υπό αξιολόγηση»), on the advisor's side too, over the same live rows (A-17).
    // The customer's report LIST is not mounted here: the advisor's confirm action
    // lives in the analysis card's own list, and swapping lists would remove it.
    const underReviewCount = policy.gapInstances.filter((g) => provenanceOf(g.definition?.slug) === "under_review").length
    const classifiedCount = policy.gapInstances.length - underReviewCount
    const pd = t.agentPages.policyDetail

    // B0.3: the run these findings come from, and whether the latest attempt is
    // that run — the intermediary must never read a failed re-run as a clean one.
    const latestAttempt = policy.analysisRuns[0] ?? null
    const lastCompletedRun =
        latestAttempt && (latestAttempt.status === 'completed' || latestAttempt.status === 'completed_with_warnings')
            ? latestAttempt
            : await db.policyAnalysisRun.findFirst({
                  where: { policyId, status: { in: ['completed', 'completed_with_warnings'] } },
                  orderBy: { finishedAt: 'desc' },
                  select: { id: true, status: true, finishedAt: true, createdAt: true, attemptedRules: true },
              })
    const findingsProvenance = findingsProvenanceLine(
        describeFindingsProvenance(
            policy.gapInstances.map((g) => ({ analysisRunId: g.analysisRunId, runFinishedAt: g.analysisRun?.finishedAt ?? null })),
            latestAttempt ? { ...latestAttempt, attemptedRuleCount: attemptedRuleCountOf(latestAttempt.attemptedRules) } : null,
            lastCompletedRun ? { ...lastCompletedRun, attemptedRuleCount: attemptedRuleCountOf(lastCompletedRun.attemptedRules) } : null,
        ),
        t.gapProvenance,
        language,
    )
    // B2: the same two lines the owner sees, over the same run and rows.
    const attemptedPlan = (lastCompletedRun?.attemptedRules ?? null) as { slugs?: unknown; catalogueVersion?: unknown } | null
    const composition = composeFindings({
        lineOfBusiness: policy.lineOfBusiness,
        acordData: policy.acordData,
        firedSlugs: policy.gapInstances.map((g) => g.definition.slug),
        // V3: a completed run with no plan renders the dated pre-plan state, never nothing.
        completedRun: lastCompletedRun
            ? {
                  finishedAt: lastCompletedRun.finishedAt ?? lastCompletedRun.createdAt ?? null,
                  dateLabel: formatProvenanceDate(lastCompletedRun.finishedAt ?? lastCompletedRun.createdAt ?? null, language),
              }
            : null,
        attempted:
            attemptedPlan && Array.isArray(attemptedPlan.slugs) && typeof attemptedPlan.catalogueVersion === 'string'
                ? { slugs: attemptedPlan.slugs.filter((s): s is string => typeof s === 'string'), catalogueVersion: attemptedPlan.catalogueVersion }
                : null,
    })
    // B1: the same record status the owner sees.
    const recordStatus = resolveRecordStatus({
        lifecycleStatus: status,
        policyStatus: policy.status,
        latestRun: latestAttempt
            ? { status: latestAttempt.status, blockedReason: (latestAttempt as { blockedReason?: string | null }).blockedReason ?? null }
            : null,
        // The advisor's confirmation, from the extraction envelope — never invented, never ignored (A-06).
        ...extractionConfirmation(policy.acordData),
    })
    const locale = resolveLocale(language)
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
                <Link href="/customers" className="text-neutral-500 dark:text-neutral-400 hover:text-primary dark:hover:text-mint transition-colors">{pd.breadcrumbCustomers}</Link>
                <svg className="w-4 h-4 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
                {customer ? (
                    <Link href={`/customers/${customerId}`} className="text-neutral-500 dark:text-neutral-400 hover:text-primary dark:hover:text-mint transition-colors">
                        {customer.name}
                    </Link>
                ) : (
                    <span className="text-neutral-500 dark:text-neutral-400">{pd.loading}</span>
                )}
                <svg className="w-4 h-4 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-neutral-900 dark:text-neutral-100">{shownPolicyNumber ?? unreadable}</span>
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
                            className="flex-1 md:flex-none px-6 py-2.5 bg-primary hover:bg-primary-hover text-primary-foreground rounded-2xl text-xs font-black uppercase tracking-widest text-center shadow-lg shadow-primary/20 transition-all active:scale-95"
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
                                        <span className={`px-3 py-1 rounded-full text-kicker font-black uppercase tracking-widest ${statusColor.bg} ${statusColor.text} border ${statusColor.border}`} data-fact="policy.status" data-fact-value={statusLabel}>
                                            {statusLabel}
                                        </span>
                                        {isManagedByViewer && (
                                            <span className="px-3 py-1 rounded-full text-kicker font-black uppercase tracking-widest bg-primary-soft text-status-success dark:bg-primary/15">
                                                {pd.managedByYou}
                                            </span>
                                        )}
                                        {daysLeft >= 0 && daysLeft <= 30 && (
                                            <span className="text-amber-700 dark:text-amber-400 text-xs font-bold">
                                                {{ el: `Λήγει σε ${daysLeft} ημέρες`, en: `Expires in ${daysLeft} days` }[language]}
                                            </span>
                                        )}
                                    </div>
                                    <h1 className="text-4xl font-black text-foreground tracking-tight leading-tight" data-fact="policy.insurerName" data-fact-value={displayInsurerName(resolveInsurerDisplay(policy.insurerName).displayName || policy.insurerName, branch.label[language])}>
                                        {displayInsurerName(resolveInsurerDisplay(policy.insurerName).displayName || policy.insurerName, branch.label[language])}
                                    </h1>
                                    <p className="text-xl text-neutral-500 dark:text-neutral-400 font-medium mt-1 uppercase tracking-tighter">{lobPhrase}</p>
                                </div>
                                <div className="bg-neutral-50 dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-100 dark:border-neutral-700 text-center md:min-w-[200px]">
                                    <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-1">{pd.annualPremium}</p>
                                    <p className="text-3xl font-black text-foreground leading-none" data-fact="policy.premiumAmount" data-fact-value={hasPremium ? `${premiumNumber} ${policy.premiumCurrency || 'EUR'}` : ""}>
                                        {hasPremium
                                            ? Number(premiumNumber).toLocaleString(locale, { style: 'currency', currency: policy.premiumCurrency || 'EUR' })
                                            : unreadable}
                                    </p>
                                </div>
                            </div>
                        </div>
                        {/* Removed: a generic "Coverage Highlights" block that showed the
                            SAME two static items with green checkmarks for every policy —
                            "Standard Coverage · Full protection based on policy
                            specifications" and "Direct Support · 24/7 assistance via
                            insurer". Neither was extracted from the policy; the 24/7-
                            assistance line asserted cover many policies don't have. The
                            real, policy-specific coverage is the summary + AI-extracted
                            structured coverages + gap analysis below. */}
                    </div>

                    {/* Summary Section */}
                    <div className="bg-neutral-50 dark:bg-neutral-900/30 rounded-3xl p-8 border border-neutral-100 dark:border-neutral-800">
                        <h2 className="text-sm font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-4">{pd.summary}</h2>
                        <div className="prose dark:prose-invert max-w-none text-neutral-600 dark:text-neutral-400 leading-relaxed">
                            {policy.coverageSummary || pd.noSummary}
                        </div>
                    </div>

                    {/* Gap Analysis */}
                    <section id="gap-analysis" aria-label={t.analysis.report.summaryFoundPrefix}>
                    {policy.gapInstances.length > 0 && (
                        <p className="mb-3 text-sm font-bold text-foreground">
                            {/* One sentence, one door; the under-review figure is the keyed part
                                (the customer's band keys the same span). The classified total
                                carries no key on either side — a key coined here would be one-sided. */}
                            <a href="#gap-analysis" className="hover:underline">
                                {t.analysis.report.summaryFoundPrefix} {classifiedCount} {classifiedCount === 1 ? t.analysis.report.summaryFoundOne : t.analysis.report.summaryFoundMany}
                                {underReviewCount > 0 && (
                                    <span className="font-medium text-muted-foreground" data-count="gap.underReviewCount">
                                        {" "}
                                        {t.analysis.report.summaryUnderReview.replace("{count}", String(underReviewCount))}
                                    </span>
                                )}
                            </a>
                        </p>
                    )}
                    <AnalysisCard
                        policyId={policyId}
                        gaps={policy.gapInstances as any}
                        findingsProvenance={findingsProvenance}
                        composition={composition}
                        recordStatus={recordStatus}
                        canRequestOwnerConsent
                        // Evidence ladder: only an advisor with write access may
                        // confirm an AI-probable gap (probable → confirmed).
                        canConfirmGaps={isAgentRole(dbUser.roles) && access.canWrite}
                    />
                    </section>

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
                                    <span className="text-kicker text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-widest">
                                        {pd.lastCheck}: {formatDateTime((policy as any).lastAnalyzedAt, language)}
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div>
                                        <p className="text-kicker font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-2">{pd.verificationOverview}</p>
                                        <div className="p-4 bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                                            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                                                {pd.verificationOverviewDesc}
                                            </p>
                                        </div>
                                    </div>

                                    {/* The insurer and the premium render ONCE on this page — the
                                        registry-resolved head and the premium tile above. A second,
                                        raw-envelope render here said «ΕΘΝΙΚΗ» eight rems under
                                        «Εθνική Ασφαλιστική» and printed a bare number beside «Δεν
                                        διαβάστηκε από το έγγραφο» (PW-BRIDGE-01 A-07). The
                                        extracted-vs-stored comparison belongs on the review screen. */}
                                </div>

                                <div className="space-y-3">
                                    <p className="text-kicker font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-2">{pd.structuredCoverages}</p>
                                    <div className="space-y-2">
                                        {(policy as any).acordData.coverages?.map((cov: any, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center text-micro p-3 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-100 dark:border-neutral-700 shadow-sm">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-neutral-900 dark:text-neutral-100 uppercase tracking-tighter">{cov.name}</span>
                                                    {cov.deductible && <span className="text-kicker text-neutral-500 dark:text-neutral-400">{pd.deductible}: {cov.deductible}</span>}
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
                            <p className="text-kicker font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-2">{pd.policyId}</p>
                            <p className="font-mono text-sm text-neutral-900 dark:text-neutral-100 font-bold bg-neutral-50 dark:bg-neutral-900/50 p-3 rounded-xl" data-fact="policy.policyNumber" data-fact-value={shownPolicyNumber ?? ""}>{shownPolicyNumber ?? unreadable}</p>
                        </div>

                        {insuredSubject.field.value !== null && (
                            <div>
                                <p className="text-kicker font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-2">{insuredSubject.label}</p>
                                <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100" data-fact="policy.insuredSubject" data-fact-value={insuredSubject.field.value ?? ""}>
                                    {insuredSubject.field.readable ? insuredSubject.field.value : unreadable}
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-kicker font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-1">{pd.starts}</p>
                                {/* Contractual date — Athens-pinned like every B2C render;
                                    the server's UTC zone shifted the day at Athens midnight. */}
                                <p className="text-neutral-900 dark:text-neutral-100 font-bold" data-fact="policy.startDate" data-fact-value={policy.startDate ? new Date(policy.startDate).toISOString().slice(0, 10) : ""}>{formatDate(policy.startDate, language)}</p>
                            </div>
                            <div>
                                <p className="text-kicker font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-1">{pd.ends}</p>
                                <p className="text-neutral-900 dark:text-neutral-100 font-bold" data-fact="policy.expiryDate" data-fact-value={lifecycle.endDate ? new Date(lifecycle.endDate).toISOString().slice(0, 10) : ""}>{lifecycle.endDate ? formatDate(lifecycle.endDate, language) : unreadable}</p>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-neutral-100 dark:border-neutral-700">
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${policy.status === 'active' ? 'bg-primary' : 'bg-neutral-400'}`}></span>
                                <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase">{pd.agentAccessActive}</span>
                            </div>
                        </div>
                    </div>

                    {/* Documents Sidebar */}
                    <div id="documents" className="bg-white dark:bg-neutral-800 rounded-3xl p-6 shadow-sm border border-neutral-200 dark:border-neutral-700 scroll-mt-20">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-sm font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">{pd.documents}</h3>
                            {/* The same count the customer's documents heading carries (A-14). */}
                            <a href="#documents" data-count="document.count" className="-my-2.5 inline-flex min-h-11 items-center text-sm font-bold tabular-nums text-neutral-500 dark:text-neutral-400 hover:underline">
                                {policy.documents.length}
                            </a>
                        </div>

                        {policy.documents.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 italic">{pd.noFiles}</p>
                            </div>
                        ) : (
                            <ul className="space-y-4">
                                {policy.documents.map((doc: any) => (
                                    <li key={doc.id}>
                                        <a href={`/api/v1/policies/${policy.id}/documents/${doc.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-700/50 group transition-all">
                                            <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-neutral-600 dark:text-neutral-400 group-hover:text-primary dark:group-hover:text-mint transition-colors">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-xs font-bold text-foreground truncate">{doc.fileName}</p>
                                                <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">{pd.contract}</p>
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
