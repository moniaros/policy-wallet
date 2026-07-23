export const runtime = 'nodejs'

import { db } from "@/lib/db"
import { createInsuranceType } from "../actions"

export default async function AdminTypesPage() {
    const types = await db.insuranceType.findMany({
        orderBy: { name: 'asc' }
    })

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8 text-stone-900 dark:text-stone-100">Manage Insurance Types</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Form to add new type */}
                <div className="bg-white dark:bg-stone-800 p-6 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700">
                    <h2 className="text-lg font-semibold mb-4 text-stone-800 dark:text-stone-200">Add New Type</h2>
                    <form action={createInsuranceType} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1">Display Name</label>
                            <input
                                name="name"
                                type="text"
                                required
                                placeholder="e.g. Health (Υγεία)"
                                className="pw-input pw-input-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1">Slug (Internal)</label>
                            <input
                                name="slug"
                                type="text"
                                required
                                placeholder="e.g. health"
                                className="pw-input pw-input-sm"
                            />
                        </div>
                        <button type="submit" className="pw-primary-button w-full">
                            Add Type
                        </button>
                    </form>
                </div>

                {/* List of types */}
                <div className="bg-white dark:bg-stone-800 p-6 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700">
                    <h2 className="text-lg font-semibold mb-4 text-stone-800 dark:text-stone-200">Current Types</h2>
                    <ul className="divide-y divide-stone-100 dark:divide-stone-700">
                        {types.map(t => (
                            <li key={t.id} className="py-3 flex justify-between items-center">
                                <div>
                                    <span className="text-stone-900 dark:text-stone-100 font-medium block">{t.name}</span>
                                    <span className="text-xs text-stone-500 font-mono">{t.slug}</span>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${t.isActive ? 'bg-primary-soft text-[#166534] dark:bg-primary/15 dark:text-mint' : 'bg-red-100 text-red-700'}`}>
                                    {t.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    )
}
