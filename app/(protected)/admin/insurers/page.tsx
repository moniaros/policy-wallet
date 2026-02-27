export const runtime = 'nodejs'

import { db } from "@/lib/db"
import { createInsurer } from "../actions"

export default async function AdminInsurersPage() {
    const insurers = await db.insurer.findMany({
        orderBy: { name: 'asc' }
    })

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8 text-stone-900 dark:text-stone-100">Manage Insurers</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Form to add new insurer */}
                <div className="bg-white dark:bg-stone-800 p-6 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700">
                    <h2 className="text-lg font-semibold mb-4 text-stone-800 dark:text-stone-200">Add New Insurer</h2>
                    <form action={createInsurer} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1">Insurer Name</label>
                            <input
                                name="name"
                                type="text"
                                required
                                className="w-full px-4 py-2 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                            />
                        </div>
                        <button type="submit" className="w-full bg-teal-600 text-white py-2 rounded-lg font-medium hover:bg-teal-700 transition-colors">
                            Add Insurer
                        </button>
                    </form>
                </div>

                {/* List of insurers */}
                <div className="bg-white dark:bg-stone-800 p-6 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700">
                    <h2 className="text-lg font-semibold mb-4 text-stone-800 dark:text-stone-200">Current Insurers</h2>
                    <ul className="divide-y divide-stone-100 dark:divide-stone-700">
                        {insurers.map(i => (
                            <li key={i.id} className="py-3 flex justify-between items-center">
                                <span className="text-stone-900 dark:text-stone-100 font-medium">{i.name}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${i.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {i.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    )
}
