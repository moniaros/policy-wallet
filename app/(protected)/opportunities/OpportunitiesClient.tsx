"use client"

import { useState } from "react"
import { OpportunityUpdateModal } from "@/components/agent/OpportunityUpdateModal"
import { updateOpportunityStatus } from "../agent/actions"
import { useRouter } from "next/navigation"

interface Opportunity {
    id: string
    customerName: string
    customerEmail: string
    title: string
    status: string
    severity: string
    nextActionAt: Date | null
    notes: string | null
    policyId: string | null
    conversionLikelihood: "high" | "medium" | "low" | null
    conversionScore: number | null
}

interface OpportunitiesClientProps {
    initialOpportunities: Opportunity[]
}

export function OpportunitiesClient({ initialOpportunities }: OpportunitiesClientProps) {
    const [opportunities, setOpportunities] = useState(initialOpportunities)
    const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null)
    const [filter, setFilter] = useState<string>('all')
    const router = useRouter()

    const handleUpdate = async (opportunityId: string, status: string, notes: string, nextActionDate?: string) => {
        await updateOpportunityStatus(
            opportunityId,
            status as any,
            notes,
            nextActionDate
        )

        // Update local state
        setOpportunities(opps =>
            opps.map(o => o.id === opportunityId
                ? { ...o, status, notes, nextActionAt: nextActionDate ? new Date(nextActionDate) : null }
                : o
            )
        )

        router.refresh()
    }

    const filteredOpportunities = opportunities.filter(opp => {
        if (filter === 'all') return true
        return opp.status === filter
    })

    const statusCounts = {
        all: opportunities.length,
        open: opportunities.filter(o => o.status === 'open').length,
        contacted: opportunities.filter(o => o.status === 'contacted').length,
        quoted: opportunities.filter(o => o.status === 'quoted').length,
        won: opportunities.filter(o => o.status === 'won').length,
        lost: opportunities.filter(o => o.status === 'lost').length,
    }

    return (
        <div className="pw-page-shell min-h-screen">
            <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12 lg:py-16">
                <header className="mb-10 text-center sm:text-left">
                    <span className="pw-kicker inline-block mb-2">PIPELINE</span>
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-3">
                        Opportunities
                    </h1>
                    <p className="max-w-xl text-lg text-slate-600 dark:text-slate-400">
                        Track potential sales and coverage improvements for your customers.
                    </p>
                </header>

                {/* Filters */}
                <div className="mb-8 flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                    {[
                        { key: 'all', label: 'All', count: statusCounts.all },
                        { key: 'open', label: 'Open', count: statusCounts.open },
                        { key: 'contacted', label: 'Contacted', count: statusCounts.contacted },
                        { key: 'quoted', label: 'Quoted', count: statusCounts.quoted },
                        { key: 'won', label: 'Won', count: statusCounts.won },
                        { key: 'lost', label: 'Lost', count: statusCounts.lost },
                    ].map(({ key, label, count }) => (
                        <button
                            key={key}
                            onClick={() => setFilter(key)}
                            className={`px-5 py-2.5 rounded-full font-bold text-sm tracking-wide whitespace-nowrap transition-all duration-300 ${filter === key
                                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xl shadow-slate-900/10'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white shadow-sm'
                                }`}
                        >
                            {label} {count > 0 && <span className="ml-1.5 opacity-60 text-xs">({count})</span>}
                        </button>
                    ))}
                </div>

                {/* Opportunities Table */}
                <div className="arc-card overflow-hidden border-t-4 border-t-primary">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 dark:bg-slate-900/20 border-b border-slate-100 dark:border-slate-800/60">
                                    <th className="px-6 py-5 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-8">Customer</th>
                                    <th className="px-6 py-5 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Opportunity</th>
                                    <th className="px-6 py-5 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-5 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Likelihood</th>
                                    <th className="px-6 py-5 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Next Action</th>
                                    <th className="px-6 py-5 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right pr-8">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                {filteredOpportunities.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-20 text-center">
                                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-4">
                                                <svg className="w-8 h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <p className="text-slate-500 dark:text-slate-400 font-medium tracking-tight">
                                                {filter === 'all'
                                                    ? 'No active opportunities. Run gap detection to find new ones!'
                                                    : `No ${filter} opportunities.`
                                                }
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredOpportunities.map((opp) => (
                                        <tr key={opp.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors group">
                                            <td className="px-6 py-6 pl-8">
                                                <div className="font-bold text-slate-900 dark:text-white capitalize tracking-tight">{opp.customerName}</div>
                                                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">{opp.customerEmail}</div>
                                            </td>
                                            <td className="px-6 py-6">
                                                <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{opp.title}</div>
                                                {opp.notes && (
                                                    <div className="text-[13px] text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-1 max-w-[300px]">
                                                        {opp.notes}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-6">
                                                <span className={`pw-pill uppercase tracking-widest ${opp.status === 'won' ? 'bg-primary-soft text-[#166534] dark:bg-primary/15 dark:text-mint' :
                                                    opp.status === 'lost' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400' :
                                                        opp.status === 'quoted' ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' :
                                                            opp.status === 'contacted' ? 'bg-mint/25 text-primary dark:bg-primary/15 dark:text-mint' :
                                                                'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                                                    }`}>
                                                    {opp.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-6">
                                                {opp.conversionLikelihood ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`inline-block h-2 w-2 rounded-full ${
                                                            opp.conversionLikelihood === "high" ? "bg-primary" :
                                                            opp.conversionLikelihood === "medium" ? "bg-amber-500" : "bg-slate-400"
                                                        }`} />
                                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 capitalize">
                                                            {opp.conversionLikelihood}
                                                        </span>
                                                        {opp.conversionScore != null && (
                                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                                                                {opp.conversionScore}%
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-6 text-sm font-bold text-slate-500 dark:text-slate-400">
                                                {opp.nextActionAt ? new Date(opp.nextActionAt).toLocaleDateString() : '—'}
                                            </td>
                                            <td className="px-6 py-6 text-right pr-8">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => setSelectedOpp(opp)}
                                                        className="arc-btn bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 px-4 py-2 text-[13px]"
                                                    >
                                                        Update
                                                    </button>

                                                    {opp.policyId && (
                                                        <a
                                                            href={`/wallet/${opp.policyId}`}
                                                            className="arc-btn arc-btn-primary px-4 py-2 text-[13px]"
                                                        >
                                                            View
                                                        </a>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Update Modal */}
            {selectedOpp && (
                <OpportunityUpdateModal
                    isOpen={!!selectedOpp}
                    onClose={() => setSelectedOpp(null)}
                    opportunity={{
                        id: selectedOpp.id,
                        customerName: selectedOpp.customerName,
                        title: selectedOpp.title,
                        status: selectedOpp.status,
                        notes: selectedOpp.notes || undefined
                    }}
                    onUpdate={handleUpdate}
                />
            )}
        </div>
    )
}
