export const runtime = 'nodejs'

import Link from "next/link"
import { db } from "@/lib/db"
import { createInsurer } from "./actions"

export default async function AdminInsurersPage() {
    const insurers = await db.insurer.findMany({
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    })

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8 text-stone-900 dark:text-stone-100">Manage Insurers</h1>

            <div className="bg-white dark:bg-stone-800 p-6 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 mb-8">
                <h2 className="text-lg font-semibold mb-4 text-stone-800 dark:text-stone-200">Add New Insurer</h2>
                <form action={createInsurer} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label htmlFor="admin-insurer-name" className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1">Name (Greek, canonical)</label>
                        <input
                            id="admin-insurer-name"
                            name="name"
                            type="text"
                            required
                            minLength={2}
                            maxLength={120}
                            className="pw-input pw-input-sm"
                        />
                    </div>
                    <div>
                        <label htmlFor="admin-insurer-name-en" className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1">Name (English, optional)</label>
                        <input
                            id="admin-insurer-name-en"
                            name="nameEn"
                            type="text"
                            maxLength={200}
                            className="pw-input pw-input-sm"
                        />
                    </div>
                    <div className="sm:col-span-2 flex items-center justify-between gap-4">
                        <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
                            <input name="isActive" type="checkbox" defaultChecked className="h-4 w-4" />
                            Active
                        </label>
                        <button type="submit" className="pw-primary-button">
                            Add Insurer
                        </button>
                    </div>
                </form>
                <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">
                    Creates the row, then opens its detail page for contact, address and line-of-business data.
                </p>
            </div>

            <div className="bg-white dark:bg-stone-800 p-6 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700">
                <h2 className="text-lg font-semibold mb-4 text-stone-800 dark:text-stone-200">
                    Current Insurers ({insurers.length})
                </h2>
                <ul className="divide-y divide-stone-100 dark:divide-stone-700">
                    {insurers.map(i => (
                        <li key={i.id} className="py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                            <div className="min-w-0">
                                <span className="text-stone-900 dark:text-stone-100 font-medium">{i.name}</span>
                                <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                                    {i.nameEn}
                                    {i.nameEn && i.slug && " · "}
                                    {i.slug && <span className="font-mono">{i.slug}</span>}
                                    {!i.nameEn && !i.slug && "admin-created"}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {i.status !== 'active' && (
                                    <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300">
                                        {i.status}
                                    </span>
                                )}
                                {i.linesOfBusiness.length > 0 && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300">
                                        {i.linesOfBusiness.length} LoB
                                    </span>
                                )}
                                <span className={`text-xs px-2 py-0.5 rounded-full ${i.isActive ? 'bg-primary-soft text-status-success dark:bg-primary/15' : 'bg-red-100 dark:bg-rose-900/40 text-red-700 dark:text-rose-200'}`}>
                                    {i.isActive ? 'Active' : 'Inactive'}
                                </span>
                                <Link
                                    href={`/admin/insurers/${i.id}`}
                                    className="text-sm text-primary hover:underline px-2 py-1"
                                >
                                    Manage
                                </Link>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}
