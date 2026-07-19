export const runtime = 'nodejs'

import Link from "next/link"
import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { createOffer, updateOffer, updateVendor } from "../actions"
import { VENDOR_CATEGORIES } from "@/lib/partner-offers/validation"
import { TIER_KEYS } from "@/lib/pricing/plan-defaults"
import { PROFILE_TAG_VALUES } from "@/lib/services/gap-engine/recommendation-generator"
import { WRITE_BRANCH_IDS } from "@/lib/insurance/taxonomy"

const inputClass =
    "w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm"
const labelClass = "block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1"

type OfferRow = {
    id: string
    slug: string
    title: unknown
    description: unknown
    offerType: string
    redemptionMethod: string
    redemptionUrl: string | null
    redemptionCode: string | null
    redemptionPhone: string | null
    includedInTiers: string[]
    profileTags: string[]
    linesOfBusiness: string[]
    validFrom: Date | null
    validUntil: Date | null
    termsUrl: string | null
    isActive: boolean
    sortOrder: number
}

function localized(value: unknown, lang: "el" | "en"): string {
    if (value && typeof value === "object" && lang in (value as Record<string, unknown>)) {
        return String((value as Record<string, unknown>)[lang] ?? "")
    }
    return ""
}

function dateValue(value: Date | null): string {
    return value ? value.toISOString().slice(0, 10) : ""
}

/** Shared fields for the create + edit offer forms (server component). */
function OfferFields({ offer }: { offer?: OfferRow }) {
    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={labelClass}>Slug (permanent)</label>
                    <input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={offer?.slug ?? ""} className={inputClass} readOnly={!!offer} />
                </div>
                <div>
                    <label className={labelClass}>Offer type</label>
                    <select name="offerType" className={inputClass} defaultValue={offer?.offerType ?? "free_service"}>
                        <option value="free_service">free_service</option>
                        <option value="discount">discount</option>
                        <option value="gift">gift</option>
                    </select>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={labelClass}>Title (EL)</label>
                    <input name="titleEl" required defaultValue={localized(offer?.title, "el")} className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>Title (EN)</label>
                    <input name="titleEn" required defaultValue={localized(offer?.title, "en")} className={inputClass} />
                </div>
            </div>
            <div>
                <label className={labelClass}>Description (EL)</label>
                <textarea name="descriptionEl" required rows={2} defaultValue={localized(offer?.description, "el")} className={inputClass} />
            </div>
            <div>
                <label className={labelClass}>Description (EN)</label>
                <textarea name="descriptionEn" required rows={2} defaultValue={localized(offer?.description, "en")} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={labelClass}>Redemption method</label>
                    <select name="redemptionMethod" className={inputClass} defaultValue={offer?.redemptionMethod ?? "link"}>
                        <option value="link">link</option>
                        <option value="code">code</option>
                        <option value="phone">phone</option>
                    </select>
                </div>
                <div>
                    <label className={labelClass}>Redemption URL (https, for link)</label>
                    <input name="redemptionUrl" type="url" defaultValue={offer?.redemptionUrl ?? ""} className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>Redemption code (for code)</label>
                    <input name="redemptionCode" defaultValue={offer?.redemptionCode ?? ""} className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>Redemption phone (for phone)</label>
                    <input name="redemptionPhone" defaultValue={offer?.redemptionPhone ?? ""} className={inputClass} />
                </div>
            </div>
            <fieldset>
                <legend className={labelClass}>Included in tiers (at least one)</legend>
                <div className="flex flex-wrap gap-3">
                    {TIER_KEYS.map((tier) => (
                        <label key={tier} className="flex items-center gap-1.5 text-sm text-stone-700 dark:text-stone-300">
                            <input
                                type="checkbox"
                                name="includedInTiers"
                                value={tier}
                                defaultChecked={offer?.includedInTiers.includes(tier) ?? tier === "pro"}
                                className="h-4 w-4"
                            />
                            <span className="font-mono text-xs">{tier}</span>
                        </label>
                    ))}
                </div>
            </fieldset>
            <fieldset>
                <legend className={labelClass}>Profile-tag targeting (empty = everyone)</legend>
                <div className="flex flex-wrap gap-3">
                    {PROFILE_TAG_VALUES.map((tag) => (
                        <label key={tag} className="flex items-center gap-1.5 text-sm text-stone-700 dark:text-stone-300">
                            <input
                                type="checkbox"
                                name="profileTags"
                                value={tag}
                                defaultChecked={offer?.profileTags.includes(tag) ?? false}
                                className="h-4 w-4"
                            />
                            <span className="font-mono text-xs">{tag}</span>
                        </label>
                    ))}
                </div>
            </fieldset>
            <fieldset>
                <legend className={labelClass}>Line-of-business targeting (empty = all)</legend>
                <div className="flex flex-wrap gap-3">
                    {WRITE_BRANCH_IDS.map((lob) => (
                        <label key={lob} className="flex items-center gap-1.5 text-sm text-stone-700 dark:text-stone-300">
                            <input
                                type="checkbox"
                                name="linesOfBusiness"
                                value={lob}
                                defaultChecked={offer?.linesOfBusiness.includes(lob) ?? false}
                                className="h-4 w-4"
                            />
                            <span className="font-mono text-xs">{lob}</span>
                        </label>
                    ))}
                </div>
            </fieldset>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={labelClass}>Valid from (optional)</label>
                    <input name="validFrom" type="date" defaultValue={dateValue(offer?.validFrom ?? null)} className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>Valid until (optional)</label>
                    <input name="validUntil" type="date" defaultValue={dateValue(offer?.validUntil ?? null)} className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>Terms URL (https, optional)</label>
                    <input name="termsUrl" type="url" defaultValue={offer?.termsUrl ?? ""} className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>Sort order</label>
                    <input name="sortOrder" type="number" min="0" max="99" defaultValue={offer?.sortOrder ?? 0} className={inputClass} />
                </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
                <input name="isActive" type="checkbox" defaultChecked={offer?.isActive ?? false} className="h-4 w-4" />
                Active (renders to eligible users while the vendor is also active)
            </label>
        </div>
    )
}

export default async function AdminPartnerVendorPage({
    params,
    searchParams,
}: {
    params: Promise<{ vendorId: string }>
    searchParams: Promise<{ saved?: string }>
}) {
    const { vendorId } = await params
    const { saved } = await searchParams

    const vendor = await db.partnerVendor.findUnique({
        where: { id: vendorId },
        include: { offers: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
    })
    if (!vendor) notFound()

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="mb-6">
                <Link href="/admin/partners" className="text-sm text-primary hover:underline">
                    ← All vendors
                </Link>
            </div>
            <h1 className="text-3xl font-bold mb-1 text-stone-900 dark:text-stone-100">{vendor.name}</h1>
            <p className="text-sm text-stone-500 dark:text-stone-400 mb-6">
                {vendor.slug} · {vendor.category} ·{" "}
                {vendor.isActive ? "ACTIVE (visible to eligible users)" : "inactive (dark everywhere)"}
            </p>

            {saved === "1" && (
                <div className="mb-6 rounded-lg border border-primary/30 bg-primary-soft dark:bg-primary/10 px-4 py-3 text-sm text-[#166534] dark:text-mint">
                    Saved.
                </div>
            )}

            <section className="bg-white dark:bg-stone-800 p-6 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 mb-8">
                <h2 className="text-lg font-semibold mb-4 text-stone-800 dark:text-stone-200">Vendor</h2>
                <form action={updateVendor} className="space-y-3">
                    <input type="hidden" name="vendorId" value={vendor.id} />
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>Name</label>
                            <input name="name" required maxLength={80} defaultValue={vendor.name} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Slug (permanent)</label>
                            <input name="slug" required defaultValue={vendor.slug} className={inputClass} readOnly />
                        </div>
                        <div>
                            <label className={labelClass}>Category</label>
                            <select name="category" className={inputClass} defaultValue={vendor.category}>
                                {VENDOR_CATEGORIES.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Sort order</label>
                            <input name="sortOrder" type="number" min="0" max="99" defaultValue={vendor.sortOrder} className={inputClass} />
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>Description (EL)</label>
                        <input name="descriptionEl" required defaultValue={localized(vendor.description, "el")} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Description (EN)</label>
                        <input name="descriptionEn" required defaultValue={localized(vendor.description, "en")} className={inputClass} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>Website URL</label>
                            <input name="websiteUrl" type="url" defaultValue={vendor.websiteUrl ?? ""} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Logo URL</label>
                            <input name="logoUrl" type="url" defaultValue={vendor.logoUrl ?? ""} className={inputClass} />
                        </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
                        <input name="isActive" type="checkbox" defaultChecked={vendor.isActive} className="h-4 w-4" />
                        Active
                    </label>
                    <button type="submit" className="bg-primary text-white dark:text-[#1A2420] px-5 py-2 rounded-lg font-medium hover:bg-primary-hover transition-colors">
                        Save vendor
                    </button>
                </form>
            </section>

            <section className="mb-8">
                <h2 className="text-lg font-semibold mb-3 text-stone-800 dark:text-stone-200">
                    Offers ({vendor.offers.length})
                </h2>
                {vendor.offers.length === 0 ? (
                    <p className="text-sm text-stone-500 dark:text-stone-400 mb-4">No offers yet.</p>
                ) : (
                    <ul className="space-y-3 mb-6">
                        {vendor.offers.map((offer) => (
                            <li key={offer.id} className="bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700">
                                <details>
                                    <summary className="cursor-pointer px-4 py-3 flex items-center justify-between gap-3">
                                        <span className="text-sm font-medium text-stone-900 dark:text-stone-100">
                                            {localized(offer.title, "el") || offer.slug}
                                        </span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${offer.isActive ? 'bg-primary-soft text-[#166534] dark:bg-primary/15 dark:text-mint' : 'bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300'}`}>
                                            {offer.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </summary>
                                    <form action={updateOffer} className="px-4 pb-4 pt-1 border-t border-stone-100 dark:border-stone-700">
                                        <input type="hidden" name="offerId" value={offer.id} />
                                        <OfferFields offer={offer as unknown as OfferRow} />
                                        <button type="submit" className="mt-4 bg-primary text-white dark:text-[#1A2420] px-5 py-2 rounded-lg font-medium hover:bg-primary-hover transition-colors">
                                            Save offer
                                        </button>
                                    </form>
                                </details>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section className="bg-white dark:bg-stone-800 p-6 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700">
                <h2 className="text-lg font-semibold mb-4 text-stone-800 dark:text-stone-200">New Offer</h2>
                <form action={createOffer}>
                    <input type="hidden" name="vendorId" value={vendor.id} />
                    <OfferFields />
                    <button type="submit" className="mt-4 bg-primary text-white dark:text-[#1A2420] px-5 py-2 rounded-lg font-medium hover:bg-primary-hover transition-colors">
                        Create offer
                    </button>
                </form>
            </section>
        </div>
    )
}
