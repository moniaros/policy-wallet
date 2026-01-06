import { getAgentDashboardData } from "@/app/(protected)/agent/actions"
import Link from "next/link"

export default async function AgentDashboardPage() {
    const data = await getAgentDashboardData()

    if (!data) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100">Access Denied</h2>
                    <p className="mt-2 text-stone-600 dark:text-stone-400">You do not have the required permissions to view the agent dashboard.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-12 lg:py-20">
            <header className="mb-16">
                <div className="flex items-center gap-3 mb-4">
                    <span className="w-12 h-0.5 bg-stone-900 dark:bg-white rounded-full" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-400">Intelligence Command</span>
                </div>
                <h1 className="text-5xl md:text-6xl font-black text-stone-900 dark:text-white tracking-tighter mb-6 leading-[0.9]">
                    Agency <br />
                    <span className="text-stone-400 dark:text-stone-500 italic">Overview.</span>
                </h1>
                <p className="text-stone-500 dark:text-stone-400 text-lg max-w-xl leading-relaxed">
                    Performance metrics and actionable insights for your professional insurance practice.
                </p>
            </header>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="relative overflow-hidden bg-white dark:bg-stone-800 p-10 rounded-[40px] border border-stone-100 dark:border-stone-700 shadow-2xl shadow-stone-200/50 dark:shadow-none group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-teal-500/10 transition-colors" />
                    <div className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-4">Total Customers</div>
                    <div className="flex items-end gap-3">
                        <span className="text-5xl font-black text-stone-900 dark:text-white tracking-tighter">{data.stats.totalCustomers}</span>
                        <span className="text-xs font-bold text-teal-600 mb-2 italic">Managed</span>
                    </div>
                </div>
                <div className="relative overflow-hidden bg-white dark:bg-stone-800 p-10 rounded-[40px] border border-stone-100 dark:border-stone-700 shadow-2xl shadow-stone-200/50 dark:shadow-none group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-amber-500/10 transition-colors" />
                    <div className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-4">Active Leads</div>
                    <div className="flex items-end gap-3">
                        <span className="text-5xl font-black text-stone-900 dark:text-white tracking-tighter">{data.stats.activeOpportunities}</span>
                        <span className="text-xs font-bold text-amber-600 mb-2 italic">Strategic</span>
                    </div>
                </div>
                <div className="relative overflow-hidden bg-stone-900 dark:bg-stone-950 p-10 rounded-[40px] text-white shadow-2xl group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full -mr-16 -mt-16" />
                    <div className="text-[10px] font-black text-stone-500 uppercase tracking-widest mb-4">Pending Invites</div>
                    <div className="flex items-end gap-3">
                        <span className="text-5xl font-black text-white tracking-tighter">{data.stats.pendingInvites}</span>
                        <span className="text-xs font-bold text-stone-400 mb-2 italic">Outreach</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Recent Customers */}
                <section>
                    <div className="flex items-center justify-between mb-8 px-2">
                        <h2 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight">Recent Activity</h2>
                        <Link href="/customers" className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] hover:text-teal-600 transition-colors">View All Customers</Link>
                    </div>
                    <div className="space-y-4">
                        {data.recentCustomers.length === 0 ? (
                            <div className="p-12 text-center bg-stone-50 dark:bg-stone-900/50 rounded-[32px] border border-dashed border-stone-200 dark:border-stone-800 text-stone-400 italic">No activity yet.</div>
                        ) : (
                            data.recentCustomers.map((rel) => (
                                <div key={rel.id} className="bg-white dark:bg-stone-800 p-6 rounded-[32px] border border-stone-100 dark:border-stone-700 hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-6 group">
                                    <div className="h-14 w-14 rounded-2xl bg-stone-900 dark:bg-stone-700 flex items-center justify-center text-white font-black text-xl shadow-lg group-hover:bg-teal-600 transition-colors">
                                        {rel.customer.name?.[0] || 'U'}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-black text-stone-900 dark:text-white uppercase tracking-tight">{rel.customer.name}</div>
                                        <div className="text-xs text-stone-400 font-bold italic">{rel.customer.email}</div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <span className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-full ${rel.status === 'active' ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30' : 'bg-stone-50 text-stone-500'}`}>
                                            {rel.status}
                                        </span>
                                        <span className="text-[8px] font-black text-stone-300 uppercase tracking-widest">Customer</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                {/* Recent Opportunities */}
                <section>
                    <div className="flex items-center justify-between mb-8 px-2">
                        <h2 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight">Growth Map</h2>
                        <Link href="/opportunities" className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] hover:text-amber-600 transition-colors">View All Leads</Link>
                    </div>
                    <div className="space-y-4">
                        {data.recentOpportunities.length === 0 ? (
                            <div className="p-12 text-center bg-stone-50 dark:bg-stone-900/50 rounded-[32px] border border-dashed border-stone-200 dark:border-stone-800 text-stone-400 italic">No active leads.</div>
                        ) : (
                            data.recentOpportunities.map((opp) => (
                                <div key={opp.id} className="bg-stone-900 dark:bg-stone-800 p-8 rounded-[32px] text-white hover:scale-[1.02] transition-all group relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 blur-2xl rounded-full -mr-12 -mt-12" />
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="font-black text-lg uppercase tracking-tight leading-none group-hover:text-amber-500 transition-colors">{opp.relationship.customer.name}</div>
                                        <div className="px-3 py-1 bg-amber-500 text-white text-[8px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-amber-500/20">
                                            {opp.status}
                                        </div>
                                    </div>
                                    <p className="text-stone-400 text-sm italic mb-6 line-clamp-1">{opp.notes || 'No strategic notes added yet.'}</p>
                                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                        <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Identified {new Date(opp.createdAt).toLocaleDateString()}</span>
                                        <div className="flex items-center gap-2 text-teal-500">
                                            <span className="text-[10px] font-black uppercase tracking-widest italic">High Intent</span>
                                            <div className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse" />
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </div>

            {/* Quick Actions Header */}
            <section className="mt-24">
                <div className="flex items-center gap-4 mb-10">
                    <h2 className="text-[10px] font-black text-stone-400 uppercase tracking-[0.3em]">Operational Shortcuts</h2>
                    <div className="h-px flex-1 bg-stone-100 dark:bg-stone-800" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Link href="/customers/invite" className="p-8 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-[32px] shadow-2xl shadow-stone-900/10 hover:translate-y-[-4px] transition-all flex flex-col items-center justify-center text-center gap-4 group">
                        <div className="w-12 h-12 bg-white/10 dark:bg-stone-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="2.5" /></svg>
                        </div>
                        <span className="font-black text-xs uppercase tracking-widest">Invite Customer</span>
                    </Link>
                    <Link href="/opportunities" className="p-8 bg-white dark:bg-stone-800 text-stone-900 dark:text-white border border-stone-100 dark:border-stone-700 rounded-[32px] shadow-xl shadow-stone-100/50 dark:shadow-none hover:translate-y-[-4px] transition-all flex flex-col items-center justify-center text-center gap-4 group">
                        <div className="w-12 h-12 bg-stone-50 dark:bg-stone-900 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <svg className="h-6 w-6 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeWidth="2" /></svg>
                        </div>
                        <span className="font-black text-xs uppercase tracking-widest">Review Gaps</span>
                    </Link>
                    <Link href="/insights" className="p-8 bg-white dark:bg-stone-800 text-stone-900 dark:text-white border border-stone-100 dark:border-stone-700 rounded-[32px] shadow-xl shadow-stone-100/50 dark:shadow-none hover:translate-y-[-4px] transition-all flex flex-col items-center justify-center text-center gap-4 group">
                        <div className="w-12 h-12 bg-stone-50 dark:bg-stone-900 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <svg className="h-6 w-6 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" strokeWidth="2" /></svg>
                        </div>
                        <span className="font-black text-xs uppercase tracking-widest">Market Insights</span>
                    </Link>
                    <Link href="/settings" className="p-8 bg-stone-50 dark:bg-stone-900/50 text-stone-400 border border-stone-100 dark:border-stone-800 rounded-[32px] hover:translate-y-[-4px] transition-all flex flex-col items-center justify-center text-center gap-4 group grayscale hover:grayscale-0">
                        <div className="w-12 h-12 bg-white dark:bg-stone-800 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" strokeWidth="2" /><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="2" /></svg>
                        </div>
                        <span className="font-black text-xs uppercase tracking-widest">Platform Settings</span>
                    </Link>
                </div>
            </section>
        </div>
    )
}
