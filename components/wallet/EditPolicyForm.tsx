"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { updatePolicy } from "@/app/(protected)/wallet/actions"
import { useLanguage } from "@/contexts/LanguageContext"
import { mapWalletErrorToMessage } from "@/lib/i18n/wallet-error"
import { WRITE_BRANCH_IDS } from "@/lib/insurance/taxonomy"
import { displayInsurerName, displayPolicyNumber } from '@/lib/wallet/policy-identity'
import { AiDisclaimer } from "@/components/ui/AiDisclaimer"

interface EditPolicyFormProps {
    policy: {
        id: string
        insurerName: string
        policyNumber: string
        lineOfBusiness: string
        startDate: Date
        endDate: Date
        premiumAmount?: number | null
        coverageSummary?: string | null
    }
    t?: any
    /** Same-origin path to navigate back to after save (agent surfaces). */
    returnTo?: string
}

export function EditPolicyForm({ policy, t, returnTo }: EditPolicyFormProps) {
    const { t: contextT } = useLanguage()
    const i18n = t || contextT
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    const [formData, setFormData] = useState({
        // Placeholders are not editable text — the field starts empty so the
        // user types the real value rather than deleting '__PENDING_EXTRACTION__'.
        insurerName: displayInsurerName(policy.insurerName),
        policyNumber: displayPolicyNumber(policy.policyNumber) ?? '',
        lineOfBusiness: policy.lineOfBusiness,
        startDate: policy.startDate ? new Date(policy.startDate).toISOString().split("T")[0] : "",
        endDate: policy.endDate ? new Date(policy.endDate).toISOString().split("T")[0] : "",
        premiumAmount: policy.premiumAmount ? String(policy.premiumAmount) : "",
        coverageSummary: policy.coverageSummary || "",
    })

    const copy = {
        save: i18n.common.save,
        saving: i18n.common.saving,
        cancel: i18n.common.cancel,
        success: i18n.wallet.editPolicyForm.updateSuccess,
        labels: {
            insurer: i18n.wallet.insurer,
            number: i18n.wallet.policyNumber,
            type: i18n.wallet.type,
            start: i18n.wallet.starts,
            end: i18n.wallet.ends,
            summary: i18n.wallet.summary,
        },
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        startTransition(async () => {
            const data = new FormData()
            data.append("insurerName", formData.insurerName)
            data.append("policyNumber", formData.policyNumber)
            data.append("lineOfBusiness", formData.lineOfBusiness)
            data.append("startDate", formData.startDate)
            data.append("endDate", formData.endDate)
            if (formData.premiumAmount) data.append("premiumAmount", formData.premiumAmount)
            if (formData.coverageSummary) data.append("coverageSummary", formData.coverageSummary)

            const result = await updatePolicy(policy.id, data)

            if (result.error) {
                toast.error(mapWalletErrorToMessage(result.error, i18n, "updatePolicy"))
            } else {
                toast.success(copy.success)
                router.push(returnTo ?? `/wallet/${policy.id}`)
                router.refresh()
            }
        })
    }

    // Derived from the taxonomy, not hand-listed. The previous 9-value literal
    // was narrower than the write enum the server accepts, so opening this form
    // on a pension, boat or cyber policy offered no option matching its own
    // type — saving silently changed it.
    const policyTypes = WRITE_BRANCH_IDS

    const inputClass = "flex min-h-11 w-full rounded-g-control border border-border-control bg-surface-raised px-g-4 text-g-app-body text-fg-primary placeholder:text-fg-secondary focus:border-border-focus focus:outline-none"
    const labelClass = "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground"

    return (
        <form onSubmit={handleSubmit} className="space-y-6 pb-20">
        {/* H-006/H-007: This form is pre-filled with values an AI read out of the document — including the coverage summary it WROTE. The reader is correcting a machine, and should be told so. */}
        <AiDisclaimer variant="inline" />
            <div className="space-y-4">
                <div className="grid gap-2">
                    <label htmlFor="insurerName" className={labelClass}>{copy.labels.insurer}</label>
                    <input
                        id="insurerName"
                        name="insurerName"
                        value={formData.insurerName}
                        onChange={handleChange}
                        className={inputClass}
                        disabled={isPending}
                        required
                    />
                </div>

                <div className="grid gap-2">
                    <label htmlFor="policyNumber" className={labelClass}>{copy.labels.number}</label>
                    <input
                        id="policyNumber"
                        name="policyNumber"
                        value={formData.policyNumber}
                        onChange={handleChange}
                        className={inputClass}
                        disabled={isPending}
                        required
                    />
                </div>

                <div className="grid gap-2">
                    <label htmlFor="lineOfBusiness" className={labelClass}>{copy.labels.type}</label>
                    <div className="relative">
                        <select
                            id="lineOfBusiness"
                            name="lineOfBusiness"
                            value={formData.lineOfBusiness}
                            onChange={handleChange}
                            className={inputClass}
                            disabled={isPending}
                            required
                        >
                            <option value="" disabled>{i18n.wallet.editPolicyForm.selectType}</option>
                            {policyTypes.map((type) => (
                                <option key={type} value={type}>
                                    {i18n.policyTypes[type] || type}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <label htmlFor="startDate" className={labelClass}>{copy.labels.start}</label>
                        <input
                            id="startDate"
                            name="startDate"
                            type="date"
                            value={formData.startDate}
                            onChange={handleChange}
                            className={inputClass}
                            disabled={isPending}
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <label htmlFor="endDate" className={labelClass}>{copy.labels.end}</label>
                        <input
                            id="endDate"
                            name="endDate"
                            type="date"
                            value={formData.endDate}
                            onChange={handleChange}
                            className={inputClass}
                            disabled={isPending}
                            required
                        />
                    </div>
                </div>

                <div className="grid gap-2">
                    <label htmlFor="premiumAmount" className={labelClass}>{i18n.wallet.editPolicyForm.premiumCurrency}</label>
                    <input
                        id="premiumAmount"
                        name="premiumAmount"
                        type="number"
                        step="0.01"
                        value={formData.premiumAmount}
                        onChange={handleChange}
                        className={inputClass}
                        disabled={isPending}
                    />
                </div>

                <div className="grid gap-2">
                    <label htmlFor="coverageSummary" className={labelClass}>{copy.labels.summary}</label>
                    <textarea
                        id="coverageSummary"
                        name="coverageSummary"
                        value={formData.coverageSummary}
                        onChange={handleChange}
                        className={`${inputClass} h-32 py-3`}
                        disabled={isPending}
                    />
                </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-border">
                <button
                    type="button"
                    onClick={() => router.back()}
                    disabled={isPending}
                    className="flex min-h-11 flex-1 items-center justify-center rounded-g-control border border-action-secondary-border px-4 py-2 text-sm font-medium text-fg-primary hover:bg-surface-sunken disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                    {copy.cancel}
                </button>
                <button
                    type="submit"
                    disabled={isPending}
                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-g-control bg-action-primary-bg px-g-4 text-sm font-bold text-fg-on-brand transition-colors hover:bg-action-primary-hover disabled:opacity-60"
                >
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isPending ? copy.saving : copy.save}
                </button>
            </div>
        </form>
    )
}
