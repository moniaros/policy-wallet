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
        <div className="max-w-7xl mx-auto px-4 py-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100">Opportunities</h1>
                <p className="mt-2 text-stone-600 dark:text-stone-400">
                    Track potential sales and coverage improvements for your customers.
                </p>
            </header>

            {/* Filters */}
            <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
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
                        className={`px-4 py-2 rounded-xl font-semibold text-sm whitespace-nowrap transition-all ${filter === key
                            ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/30'
                            : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                            }`}
                    >
                        {label} {count > 0 && `(${count})`}
                    </button>
                ))}
            </div>

            {/* Opportunities Table */}
            <div className="bg-white dark:bg-stone-800 rounded-3xl shadow-lg border border-stone-200 dark:border-stone-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-stone-50 dark:bg-stone-900/50 border-b border-stone-100 dark:border-stone-700">
                                <th className="px-6 py-5 text-xs font-black text-stone-400 uppercase tracking-widest pl-8">Customer</th>
                                <th className="px-6 py-5 text-xs font-black text-stone-400 uppercase tracking-widest">Opportunity</th>
                                <th className="px-6 py-5 text-xs font-black text-stone-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-5 text-xs font-black text-stone-400 uppercase tracking-widest">Next Action</th>
                                <th className="px-6 py-5 text-xs font-black text-stone-400 uppercase tracking-widest text-right pr-8">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 dark:divide-stone-700/50">
                            {filteredOpportunities.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-stone-400 italic">
                                        {filter === 'all'
                                            ? 'No active opportunities. Run gap detection to find new ones!'
                                            : `No ${filter} opportunities.`
                                        }
                                    </td>
                                </tr>
                            ) : (
                                filteredOpportunities.map((opp) => (
                                    <tr key={opp.id} className="hover:bg-stone-50 dark:hover:bg-stone-700/30 transition-colors group">
                                        <td className="px-6 py-5 pl-8">
                                            <div className="font-bold text-stone-900 dark:text-white capitalize">{opp.customerName}</div>
                                            <div className="text-xs font-medium text-stone-500 dark:text-stone-400">{opp.customerEmail}</div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="text-sm font-medium text-stone-700 dark:text-stone-300">{opp.title}</div>
                                            {opp.notes && (
                                                <div className="text-xs text-stone-500 dark:text-stone-400 mt-1 line-clamp-1">
                                                    {opp.notes}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${opp.status === 'won' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-100 dark:border-green-800' :
                                                opp.status === 'lost' ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-100 dark:border-red-800' :
                                                    opp.status === 'quoted' ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-100 dark:border-purple-800' :
                                                        opp.status === 'contacted' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-100 dark:border-blue-800' :
                                                            'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-100 dark:border-amber-800'
                                                }`}>
                                                {opp.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-sm font-bold text-stone-500">
                                            {opp.nextActionAt ? new Date(opp.nextActionAt).toLocaleDateString() : '—'}
                                        </td>
                                        <td className="px-6 py-5 text-right pr-8">
                                            <button
                                                onClick={() => setSelectedOpp(opp)}
                                                className="text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-bold text-sm bg-teal-50 dark:bg-teal-900/20 px-4 py-2 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                Update
                                            </button>

                                            {opp.policyId && (
                                                <a
                                                    href={`/wallet/${opp.policyId}`}
                                                    className="ml-2 text-stone-500 hover:text-teal-600 font-bold text-sm bg-stone-50 dark:bg-stone-900/20 px-4 py-2 rounded-xl transition-colors opacity-0 group-hover:opacity-100 dark:text-stone-400 dark:hover:text-teal-400 inline-block"
                                                >
                                                    View Policy
                                                </a>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
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
