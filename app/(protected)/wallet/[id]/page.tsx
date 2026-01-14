import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import { calculatePolicyStatus, getStatusColor, getStatusLabel, getDaysUntilExpiry } from "@/lib/policy-status"
import { getPolicyShares } from "../actions"
import { SharePolicy } from "./SharePolicy"
import { DeletePolicy } from "./DeletePolicy"

import { AnalysisCard } from "./AnalysisCard"

export default async function PolicyDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: policyId } = await params
    const { dbUser } = await getAuthenticatedUser()

    const policy = await db.policy.findUnique({
        where: {
            id: policyId,
            ownerUserId: dbUser.id
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

    const status = calculatePolicyStatus(policy)
    const statusColor = getStatusColor(status)
    const statusLabel = getStatusLabel(status)
    const daysLeft = getDaysUntilExpiry(policy.endDate)

    const shares = await getPolicyShares(policyId)

    return (
        <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-2 mb-8 text-sm font-medium">
                <Link href="/wallet" className="text-stone-400 hover:text-teal-600 transition-colors">My Wallet</Link>
                <svg className="w-4 h-4 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-stone-900 dark:text-stone-100">{policy.policyNumber}</span>
            </nav>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Header Card */}
                    <div className="bg-white dark:bg-stone-800 rounded-3xl shadow-sm border border-stone-200 dark:border-stone-700 overflow-hidden">
                        <div className="p-8 border-b border-stone-100 dark:border-stone-700">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${statusColor.bg} ${statusColor.text} border ${statusColor.border}`}>
                                            {statusLabel}
                                        </span>
                                        {daysLeft >= 0 && daysLeft <= 30 && (
                                            <span className="text-amber-600 dark:text-amber-400 text-xs font-bold">
                                                Expires in {daysLeft} days
                                            </span>
                                        )}
                                    </div>
                                    <h1 className="text-4xl font-black text-stone-900 dark:text-white tracking-tight leading-tight">
                                        {policy.insurerName}
                                    </h1>
                                    <p className="text-xl text-stone-500 font-medium mt-1 uppercase tracking-tighter">{policy.lineOfBusiness} Protection</p>
                                </div>
                                <div className="bg-stone-50 dark:bg-stone-900 p-6 rounded-2xl border border-stone-100 dark:border-stone-700 text-center md:min-w-[200px]">
                                    <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Annual Premium</p>
                                    <p className="text-3xl font-black text-stone-900 dark:text-white leading-none">
                                        {Number(policy.premiumAmount || 0).toLocaleString('el-GR', { style: 'currency', currency: policy.premiumCurrency || 'EUR' })}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-8">
                            <h2 className="text-sm font-black text-stone-400 uppercase tracking-widest mb-6">Coverage Highlights</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex items-start gap-4">
                                    <div className="mt-1 w-5 h-5 rounded-full bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 shrink-0">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="3" /></svg>
                                    </div>
                                    <div>
                                        <p className="font-bold text-stone-900 dark:text-stone-100">Standard Coverage</p>
                                        <p className="text-sm text-stone-500 mt-1">Full protection based on policy specifications.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="mt-1 w-5 h-5 rounded-full bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 shrink-0">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="3" /></svg>
                                    </div>
                                    <div>
                                        <p className="font-bold text-stone-900 dark:text-stone-100">Direct Support</p>
                                        <p className="text-sm text-stone-500 mt-1">24/7 emergency assistance via insurer.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Summary Section */}
                    <div className="bg-stone-50 dark:bg-stone-900/30 rounded-3xl p-8 border border-stone-100 dark:border-stone-800">
                        <h2 className="text-sm font-black text-stone-400 uppercase tracking-widest mb-4">Summary</h2>
                        <div className="prose dark:prose-invert max-w-none text-stone-600 dark:text-stone-400 leading-relaxed">
                            {policy.coverageSummary || "No summary provided for this policy. Our AI analysis will populate this section as soon as your document is processed."}
                        </div>
                    </div>

                    {/* Gap Analysis */}
                    <AnalysisCard policyId={policyId} gaps={policy.gapInstances} />

                    {/* AI Analysis Insights (ACORD) */}
                    {(policy as any).acordData && typeof (policy as any).acordData === 'object' && Object.keys((policy as any).acordData).length > 0 && (
                        <div className="bg-white dark:bg-stone-800 rounded-3xl p-8 border border-stone-200 dark:border-stone-700 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-sm font-black text-stone-900 dark:text-white uppercase tracking-widest">AI Policy Insights</h2>
                                    <span className="px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 text-[9px] font-black uppercase tracking-widest border border-teal-100 dark:border-teal-800">
                                        ACORD Verified
                                    </span>
                                </div>
                                {(policy as any).lastAnalyzedAt && (
                                    <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">
                                        Last Check: {new Date((policy as any).lastAnalyzedAt).toLocaleDateString()}
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div>
                                        <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Verification Overview</p>
                                        <div className="p-4 bg-stone-50 dark:bg-stone-900/50 rounded-2xl border border-stone-100 dark:border-stone-800">
                                            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                                                Our AI has cross-referenced the policy contract with the digital wallet metadata.
                                                The details below have been extracted directly from the official document.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Contract Insurer</p>
                                            <p className="text-xs font-bold text-stone-900 dark:text-white">{(policy as any).acordData.policy?.insurer || policy.insurerName}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Premium Found</p>
                                            <p className="text-xs font-bold text-teal-600 dark:text-teal-400">
                                                {(policy as any).acordData.policy?.premium?.amount} {(policy as any).acordData.policy?.premium?.currency}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Structured Coverages</p>
                                    <div className="space-y-2">
                                        {(policy as any).acordData.coverages?.map((cov: any, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center text-[11px] p-3 bg-white dark:bg-stone-800 rounded-xl border border-stone-100 dark:border-stone-700 hover:border-teal-200 dark:hover:border-teal-900/50 transition-colors shadow-sm">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-stone-900 dark:text-stone-100 uppercase tracking-tighter">{cov.name}</span>
                                                    {cov.deductible && <span className="text-[9px] text-stone-400">Deductible: {cov.deductible}</span>}
                                                </div>
                                                <span className="font-mono text-teal-600 dark:text-teal-400 font-black">{cov.limit}</span>
                                            </div>
                                        ))}
                                        {(!(policy as any).acordData.coverages || (policy as any).acordData.coverages.length === 0) && (
                                            <div className="p-4 text-center border-2 border-dashed border-stone-100 dark:border-stone-800 rounded-2xl">
                                                <p className="text-xs text-stone-400 italic">No specific coverages parsed.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Quick Stats Sidebar */}
                    <div className="bg-white dark:bg-stone-800 rounded-3xl p-6 shadow-sm border border-stone-200 dark:border-stone-700 space-y-6">
                        <div>
                            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Policy ID</p>
                            <p className="font-mono text-sm text-stone-900 dark:text-stone-100 font-bold bg-stone-50 dark:bg-stone-900/50 p-3 rounded-xl border border-stone-100 dark:border-stone-700">{policy.policyNumber}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Starts</p>
                                <p className="text-stone-900 dark:text-stone-100 font-bold">{policy.startDate.toLocaleDateString()}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Ends</p>
                                <p className="text-stone-900 dark:text-stone-100 font-bold">{policy.endDate.toLocaleDateString()}</p>
                            </div>
                        </div>

                        <hr className="border-stone-100 dark:border-stone-700" />

                        <div>
                            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-4">Action Items</p>
                            <div className="space-y-3">
                                {daysLeft <= 30 && (
                                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-bold border border-amber-100 dark:border-amber-800/50">
                                        ⚠️ Review renewal options soon
                                    </div>
                                )}
                                <div className="p-4 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 rounded-xl text-xs font-bold border border-teal-100 dark:border-teal-800/50">
                                    ✓ Download latest contract
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Documents Sidebar */}
                    <div className="bg-white dark:bg-stone-800 rounded-3xl p-6 shadow-sm border border-stone-200 dark:border-stone-700">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-sm font-black text-stone-400 uppercase tracking-widest">Documents</h3>
                            <button className="text-teal-600 hover:text-teal-700">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                            </button>
                        </div>

                        {policy.documents.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-xs text-stone-400 italic">No files attached</p>
                            </div>
                        ) : (
                            <ul className="space-y-4">
                                {policy.documents.map(doc => (
                                    <li key={doc.id}>
                                        <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-2xl hover:bg-stone-50 dark:hover:bg-stone-700/50 group transition-all">
                                            <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-900 flex items-center justify-center text-stone-400 group-hover:text-teal-600 transition-colors">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-xs font-bold text-stone-900 dark:text-white truncate">{doc.fileName}</p>
                                                <p className="text-xs text-stone-400 uppercase tracking-widest">Contract</p>
                                            </div>
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Share Policy */}
                    <SharePolicy policyId={policyId} initialShares={shares} />

                    {/* Delete Policy */}
                    <DeletePolicy policyId={policyId} />
                </div>
            </div>
        </div>
    )
}
