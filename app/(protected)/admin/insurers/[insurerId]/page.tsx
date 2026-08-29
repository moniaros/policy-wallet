export const runtime = 'nodejs'

import Link from "next/link"
import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { updateInsurer } from "../actions"
import { INSURER_LOB_VALUES, INSURER_STATUS_VALUES } from "@/lib/insurers/constants"
import type { InsurerAddress } from "@/lib/insurers/validation"

const inputClass = "pw-input pw-input-sm"
const labelClass = "block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1"

const CONFIDENCE_BADGE_CLASSES: Record<string, string> = {
    verified_2026: "bg-primary-soft text-status-success dark:bg-primary/15",
    stale: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    unverified: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    not_applicable: "bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300",
    admin_edited: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
}

function ConfidenceBadge({ level }: { level?: string }) {
    if (!level) return null
    const classes = CONFIDENCE_BADGE_CLASSES[level] ?? CONFIDENCE_BADGE_CLASSES.not_applicable
    return (
        <span className={`ml-2 align-middle text-micro font-mono px-1.5 py-0.5 rounded-full ${classes}`}>
            {level}
        </span>
    )
}

function FieldLabel({
    htmlFor,
    label,
    confidence,
}: {
    htmlFor: string
    label: string
    confidence?: string
}) {
    return (
        <label htmlFor={htmlFor} className={labelClass}>
            {label}
            <ConfidenceBadge level={confidence} />
        </label>
    )
}

export default async function AdminInsurerDetailPage({
    params,
    searchParams,
}: {
    params: Promise<{ insurerId: string }>
    searchParams: Promise<{ saved?: string }>
}) {
    const { insurerId } = await params
    const { saved } = await searchParams

    const insurer = await db.insurer.findUnique({ where: { id: insurerId } })
    if (!insurer) notFound()

    const confidence = (insurer.fieldConfidence ?? {}) as Record<string, string>
    const address = (insurer.hqAddress ?? null) as InsurerAddress | null

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="mb-6">
                <Link href="/admin/insurers" className="text-sm text-primary hover:underline">
                    ← All insurers
                </Link>
            </div>
            <h1 className="text-3xl font-bold mb-1 text-stone-900 dark:text-stone-100">{insurer.name}</h1>
            <p className="text-sm text-stone-500 dark:text-stone-400 mb-6">
                {insurer.slug ?? "no reference-data key (admin-created)"} · {insurer.status} ·{" "}
                {insurer.isActive ? "ACTIVE (listed in policy dropdowns)" : "inactive (hidden from dropdowns)"}
            </p>

            {saved === "1" && (
                <div className="mb-6 rounded-lg border border-primary/30 bg-primary-soft dark:bg-primary/10 px-4 py-3 text-sm text-status-success">
                    Saved.
                </div>
            )}

            <form action={updateInsurer} className="space-y-8">
                <input type="hidden" name="insurerId" value={insurer.id} />

                <section className="bg-white dark:bg-stone-800 p-6 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700">
                    <h2 className="text-lg font-semibold mb-4 text-stone-800 dark:text-stone-200">Identity</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <FieldLabel htmlFor="ins-name" label="Name (Greek, canonical)" confidence={confidence.name} />
                            <input id="ins-name" name="name" required minLength={2} maxLength={120} defaultValue={insurer.name} className={inputClass} />
                        </div>
                        <div>
                            <FieldLabel htmlFor="ins-name-en" label="Name (English)" confidence={confidence.nameEn} />
                            <input id="ins-name-en" name="nameEn" maxLength={200} defaultValue={insurer.nameEn ?? ""} className={inputClass} />
                        </div>
                        <div className="sm:col-span-2">
                            <FieldLabel htmlFor="ins-legal-name" label="Legal entity name (Greek)" confidence={confidence.legalNameEl} />
                            <input id="ins-legal-name" name="legalNameEl" maxLength={200} defaultValue={insurer.legalNameEl ?? ""} className={inputClass} />
                        </div>
                        <div>
                            <FieldLabel htmlFor="ins-status" label="Market status" confidence={confidence.status} />
                            <select id="ins-status" name="status" className={inputClass} defaultValue={insurer.status}>
                                {INSURER_STATUS_VALUES.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <FieldLabel htmlFor="ins-group" label="Group / ultimate parent" confidence={confidence.groupParent} />
                            <input id="ins-group" name="groupParent" maxLength={200} defaultValue={insurer.groupParent ?? ""} className={inputClass} />
                        </div>
                        <div>
                            <FieldLabel htmlFor="ins-slug" label="Reference-data key (permanent)" />
                            <input id="ins-slug" value={insurer.slug ?? ""} placeholder="—" className={inputClass} readOnly disabled />
                        </div>
                    </div>
                </section>

                <section className="bg-white dark:bg-stone-800 p-6 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700">
                    <h2 className="text-lg font-semibold mb-4 text-stone-800 dark:text-stone-200">Contact</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <FieldLabel htmlFor="ins-website" label="Website" confidence={confidence.website} />
                            <input id="ins-website" name="website" type="url" defaultValue={insurer.website ?? ""} className={inputClass} />
                        </div>
                        <div>
                            <FieldLabel htmlFor="ins-email" label="Contact email" confidence={confidence.contactEmail} />
                            <input id="ins-email" name="contactEmail" type="email" defaultValue={insurer.contactEmail ?? ""} className={inputClass} />
                        </div>
                        <div>
                            <FieldLabel htmlFor="ins-call-center" label="Call centre" confidence={confidence.callCenter} />
                            <input id="ins-call-center" name="callCenter" maxLength={160} defaultValue={insurer.callCenter ?? ""} className={inputClass} />
                        </div>
                        <div>
                            <FieldLabel htmlFor="ins-claims-phone" label="Claims phone" confidence={confidence.claimsPhone} />
                            <input id="ins-claims-phone" name="claimsPhone" maxLength={160} defaultValue={insurer.claimsPhone ?? ""} className={inputClass} />
                        </div>
                        <div>
                            <FieldLabel htmlFor="ins-roadside-phone" label="Roadside phone (24h)" confidence={confidence.roadsidePhone} />
                            <input id="ins-roadside-phone" name="roadsidePhone" maxLength={160} defaultValue={insurer.roadsidePhone ?? ""} className={inputClass} />
                        </div>
                        <div>
                            <FieldLabel htmlFor="ins-payment-url" label="Payment gateway URL" confidence={confidence.paymentGatewayUrl} />
                            <input id="ins-payment-url" name="paymentGatewayUrl" type="url" defaultValue={insurer.paymentGatewayUrl ?? ""} className={inputClass} />
                        </div>
                        <div className="sm:col-span-2">
                            <FieldLabel htmlFor="ins-logo-url" label="Logo URL" confidence={confidence.logoUrl} />
                            <input id="ins-logo-url" name="logoUrl" type="url" defaultValue={insurer.logoUrl ?? ""} className={inputClass} />
                        </div>
                    </div>
                </section>

                <section className="bg-white dark:bg-stone-800 p-6 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700">
                    <h2 className="text-lg font-semibold mb-4 text-stone-800 dark:text-stone-200">
                        Head office
                        <ConfidenceBadge level={confidence.hqAddress} />
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                            <FieldLabel htmlFor="ins-hq-street" label="Street" />
                            <input id="ins-hq-street" name="hqStreet" maxLength={200} defaultValue={address?.street ?? ""} className={inputClass} />
                        </div>
                        <div>
                            <FieldLabel htmlFor="ins-hq-city" label="City" />
                            <input id="ins-hq-city" name="hqCity" maxLength={200} defaultValue={address?.city ?? ""} className={inputClass} />
                        </div>
                        <div>
                            <FieldLabel htmlFor="ins-hq-postal" label="Postal code" />
                            <input id="ins-hq-postal" name="hqPostalCode" maxLength={20} defaultValue={address?.postalCode ?? ""} className={inputClass} />
                        </div>
                        <div>
                            <FieldLabel htmlFor="ins-hq-country" label="Country" />
                            <input id="ins-hq-country" name="hqCountry" maxLength={60} defaultValue={address?.country ?? ""} className={inputClass} />
                        </div>
                    </div>
                </section>

                <section className="bg-white dark:bg-stone-800 p-6 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700">
                    <h2 className="text-lg font-semibold mb-4 text-stone-800 dark:text-stone-200">Operations</h2>
                    <div className="mb-4">
                        <FieldLabel htmlFor="ins-roadside-provider" label="Roadside assistance provider" confidence={confidence.roadsideAssistanceProvider} />
                        <input id="ins-roadside-provider" name="roadsideAssistanceProvider" maxLength={200} defaultValue={insurer.roadsideAssistanceProvider ?? ""} className={inputClass} />
                    </div>
                    <fieldset>
                        <legend className={labelClass}>
                            Lines of business
                            <ConfidenceBadge level={confidence.linesOfBusiness} />
                        </legend>
                        <div className="flex flex-wrap gap-3">
                            {INSURER_LOB_VALUES.map((lob) => (
                                <label key={lob} className="flex items-center gap-1.5 text-sm text-stone-700 dark:text-stone-300">
                                    <input
                                        type="checkbox"
                                        name="linesOfBusiness"
                                        value={lob}
                                        defaultChecked={insurer.linesOfBusiness.includes(lob)}
                                        className="h-4 w-4"
                                    />
                                    <span className="font-mono text-xs">{lob}</span>
                                </label>
                            ))}
                        </div>
                    </fieldset>
                </section>

                <section className="bg-white dark:bg-stone-800 p-6 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700">
                    <h2 className="text-lg font-semibold mb-4 text-stone-800 dark:text-stone-200">Notes</h2>
                    <div className="mb-4">
                        <FieldLabel htmlFor="ins-notes" label="Internal notes" confidence={confidence.notes} />
                        <textarea id="ins-notes" name="notes" rows={4} maxLength={2000} defaultValue={insurer.notes ?? ""} className={inputClass} />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300 mb-4">
                        <input name="isActive" type="checkbox" defaultChecked={insurer.isActive} className="h-4 w-4" />
                        Active (listed in the add-policy insurer dropdown)
                    </label>
                    <button type="submit" className="pw-primary-button">
                        Save insurer
                    </button>
                </section>
            </form>
        </div>
    )
}
