import { db } from "@/lib/db"
import { auth } from "@/auth"

export default async function OpportunitiesPage() {
    const session = await auth()

    const opportunities = await db.opportunity.findMany({
        where: { ownerAgentUserId: session?.user?.id },
        include: {
            relationship: {
                include: {
                    customer: {
                        select: { name: true, email: true }
                    }
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    })

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100">Opportunities</h1>
                <p className="mt-2 text-stone-600 dark:text-stone-400">Track potential sales and coverage improvements for your customers.</p>
            </header>

            <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-stone-50 dark:bg-stone-900/50 border-b border-stone-200 dark:border-stone-700">
                                <th className="px-6 py-4 text-sm font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-4 text-sm font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">Opportunity</th>
                                <th className="px-6 py-4 text-sm font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-sm font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">Next Action</th>
                                <th className="px-6 py-4 text-sm font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                            {opportunities.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-stone-500 italic">
                                        No active opportunities. Run gap detection to find new ones!
                                    </td>
                                </tr>
                            ) : (
                                opportunities.map((opp) => (
                                    <tr key={opp.id} className="hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-stone-900 dark:text-white">{opp.relationship.customer.name}</div>
                                            <div className="text-xs text-stone-500">{opp.relationship.customer.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-stone-700 dark:text-stone-300">{opp.notes || 'General Opportunity'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/30 border border-amber-100 dark:border-amber-800`}>
                                                {opp.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-stone-500">
                                            {opp.nextActionAt ? new Date(opp.nextActionAt).toLocaleDateString() : 'TBD'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-teal-600 hover:text-teal-700 font-bold text-sm">Update</button>
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
