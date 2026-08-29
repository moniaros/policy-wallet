export const runtime = 'nodejs'

import Link from "next/link"
import { db } from "@/lib/db"
import { createVendor } from "./actions"
import { VENDOR_CATEGORIES } from "@/lib/partner-offers/validation"

const inputClass = "pw-input pw-input-sm"
const labelClass = "block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1"

export default async function AdminPartnersPage() {
    const vendors = await db.partnerVendor.findMany({
        orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
        include: { _count: { select: { offers: true } } },
    })

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-2 text-stone-900 dark:text-stone-100">Partner Vendors</h1>
            <p className="text-sm text-stone-500 dark:text-stone-400 mb-8">
                Third-party benefits bundled into paid plans. Vendors and offers start{" "}
                <strong>inactive</strong> — nothing renders to users or on the marketing site until
                you activate a signed partner. Slugs are permanent identifiers.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-stone-800 p-6 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700">
                    <h2 className="text-lg font-semibold mb-4 text-stone-800 dark:text-stone-200">Add Vendor</h2>
                    <form action={createVendor} className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="page-f1" className={labelClass}>Name</label>
                                <input id="page-f1" name="name" required maxLength={80} className={inputClass} />
                            </div>
                            <div>
                                <label htmlFor="page-f2" className={labelClass}>Slug</label>
                                <input id="page-f2" name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="affidea" className={inputClass} />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="page-f3" className={labelClass}>Description (EL)</label>
                            <input id="page-f3" name="descriptionEl" required className={inputClass} />
                        </div>
                        <div>
                            <label htmlFor="page-f4" className={labelClass}>Description (EN)</label>
                            <input id="page-f4" name="descriptionEn" required className={inputClass} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="page-f5" className={labelClass}>Category</label>
                                <select id="page-f5" name="category" className={inputClass} defaultValue="health">
                                    {VENDOR_CATEGORIES.map((c) => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="page-f6" className={labelClass}>Sort order</label>
                                <input id="page-f6" name="sortOrder" type="number" min="0" max="99" defaultValue={0} className={inputClass} />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="page-f7" className={labelClass}>Website URL (https)</label>
                            <input id="page-f7" name="websiteUrl" type="url" placeholder="https://…" className={inputClass} />
                        </div>
                        <div>
                            <label htmlFor="page-f8" className={labelClass}>Logo URL (https)</label>
                            <input id="page-f8" name="logoUrl" type="url" placeholder="https://…" className={inputClass} />
                        </div>
                        <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
                            <input name="isActive" type="checkbox" className="h-4 w-4" />
                            Active immediately (only for a signed, live partner)
                        </label>
                        <button type="submit" className="pw-primary-button w-full">
                            Create Vendor
                        </button>
                    </form>
                </div>

                <div className="bg-white dark:bg-stone-800 p-6 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700">
                    <h2 className="text-lg font-semibold mb-4 text-stone-800 dark:text-stone-200">Vendors</h2>
                    {vendors.length === 0 ? (
                        <p className="text-sm text-stone-500 dark:text-stone-400">
                            No vendors yet. The perks program is dark until the first one is created and activated.
                        </p>
                    ) : (
                        <ul className="divide-y divide-stone-100 dark:divide-stone-700">
                            {vendors.map((vendor) => (
                                <li key={vendor.id} className="py-3 flex justify-between items-center gap-3">
                                    <div>
                                        <span className="text-stone-900 dark:text-stone-100 font-medium">{vendor.name}</span>
                                        <span className="ml-2 text-xs text-stone-500 dark:text-stone-400">
                                            {vendor.category} · {vendor._count.offers} offer{vendor._count.offers === 1 ? "" : "s"}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${vendor.isActive ? 'bg-primary-soft text-status-success dark:bg-primary/15' : 'bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300'}`}>
                                            {vendor.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                        <Link href={`/admin/partners/${vendor.id}`} className="text-primary hover:underline text-sm font-medium">
                                            Manage
                                        </Link>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    )
}
