import { getAgentCustomers } from "@/app/(protected)/agent/actions"
import Link from "next/link"
import { QuestionnaireSender } from "@/components/agent/QuestionnaireSender"

export default async function CustomersPage() {
    const customers = await getAgentCustomers()

    return (
        <div className="max-w-7xl mx-auto px-4 py-12 lg:py-16">
            <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-lg shadow-teal-600/20">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">Agent Console</span>
                    </div>
                    <h1 className="text-5xl font-black text-stone-900 dark:text-white tracking-tighter mb-4 leading-tight">
                        Your <span className="text-stone-400 dark:text-stone-500 italic">Portfolio</span>
                    </h1>
                    <p className="text-stone-500 dark:text-stone-400 text-lg max-w-xl">
                        Monitor active relationships, track interactions, and proactively address customer risks.
                    </p>
                </div>

                <Link
                    href="/customers/invite"
                    className="bg-stone-900 dark:bg-white text-white dark:text-stone-900 px-8 py-4 rounded-2xl shadow-xl shadow-stone-900/10 hover:scale-[1.02] active:scale-95 transition-all font-black text-sm flex items-center gap-3 group"
                >
                    <svg className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                    </svg>
                    INVITE NEW CUSTOMER
                </Link>
            </header>

            <div className="bg-white dark:bg-stone-800 rounded-[40px] shadow-2xl shadow-stone-200/50 dark:shadow-none border border-stone-100 dark:border-stone-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-stone-50/50 dark:bg-stone-900/50 border-b border-stone-100 dark:border-stone-700">
                                <th className="px-10 py-6 text-[10px] font-black text-stone-400 uppercase tracking-widest">Customer Entity</th>
                                <th className="px-10 py-6 text-[10px] font-black text-stone-400 uppercase tracking-widest">Contact Information</th>
                                <th className="px-10 py-6 text-[10px] font-black text-stone-400 uppercase tracking-widest">Relationship Status</th>
                                <th className="px-10 py-6 text-[10px] font-black text-stone-400 uppercase tracking-widest">Recent Activity</th>
                                <th className="px-10 py-6 text-[10px] font-black text-stone-400 uppercase tracking-widest text-right">Strategic Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-50 dark:divide-stone-700/50">
                            {customers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-10 py-24 text-center">
                                        <div className="max-w-xs mx-auto">
                                            <div className="w-16 h-16 bg-stone-50 dark:bg-stone-900 rounded-2xl flex items-center justify-center mx-auto mb-6 text-stone-300">
                                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" strokeWidth="2" /></svg>
                                            </div>
                                            <h3 className="text-xl font-bold text-stone-900 dark:text-white mb-2">No active clients</h3>
                                            <p className="text-stone-400 text-sm leading-relaxed italic">You haven&apos;t invited any customers to the platform yet.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                customers.map((rel) => (
                                    <tr key={rel.id} className="group hover:bg-stone-50/50 dark:hover:bg-stone-900/30 transition-all">
                                        <td className="px-10 py-8">
                                            <div className="flex items-center gap-4">
                                                <div className="relative">
                                                    <div className="h-12 w-12 rounded-2xl bg-stone-900 dark:bg-stone-700 flex items-center justify-center text-white font-black text-lg shadow-lg group-hover:scale-110 transition-transform">
                                                        {rel.customer.name?.[0] || 'U'}
                                                    </div>
                                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-teal-500 border-2 border-white dark:border-stone-800 rounded-full shadow-sm" />
                                                </div>
                                                <div>
                                                    <span className="block font-black text-stone-900 dark:text-white group-hover:text-teal-600 transition-colors uppercase tracking-tight">{rel.customer.name}</span>
                                                    <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Premium Account</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <span className="text-sm font-bold text-stone-600 dark:text-stone-300">{rel.customer.email}</span>
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-teal-100 dark:border-teal-900/50">
                                                {rel.status}
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-stone-900 dark:text-white">
                                                    {rel.lastInteractionAt ? new Date(rel.lastInteractionAt).toLocaleDateString('el-GR', { day: '2-digit', month: 'short' }) : 'Never'}
                                                </span>
                                                <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Last Review</span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="flex items-center justify-end gap-6">
                                                <QuestionnaireSender
                                                    relationshipId={rel.id}
                                                    customerName={rel.customer.name || 'Customer'}
                                                />
                                                <Link
                                                    href={`/customers/${rel.id}`}
                                                    className="w-10 h-10 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-100 dark:border-stone-700 flex items-center justify-center text-stone-400 hover:text-stone-900 dark:hover:text-white hover:border-stone-300 transition-all"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 7l5 5m0 0l-5 5m5-5H6" strokeWidth="2.5" /></svg>
                                                </Link>
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
    )
}
