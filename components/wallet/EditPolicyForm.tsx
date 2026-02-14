"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { updatePolicy } from "@/app/(protected)/wallet/actions"

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
}

export function EditPolicyForm({ policy, t }: EditPolicyFormProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    // Form State
    const [formData, setFormData] = useState({
        insurerName: policy.insurerName,
        policyNumber: policy.policyNumber,
        lineOfBusiness: policy.lineOfBusiness,
        startDate: policy.startDate ? new Date(policy.startDate).toISOString().split('T')[0] : '',
        endDate: policy.endDate ? new Date(policy.endDate).toISOString().split('T')[0] : '',
        premiumAmount: policy.premiumAmount ? String(policy.premiumAmount) : '',
        coverageSummary: policy.coverageSummary || '',
    })

    const copy = {
        save: t?.common?.save || "Save",
        saving: t?.common?.saving || "Saving...",
        cancel: t?.common?.cancel || "Cancel",
        success: t?.wallet?.updateSuccess || "Policy updated successfully",
        labels: {
            insurer: t?.wallet?.insurer || "Insurer Name",
            number: t?.wallet?.policyNumber || "Policy Number",
            type: t?.wallet?.type || "Insurance Type",
            start: t?.wallet?.starts || "Start Date",
            end: t?.wallet?.ends || "End Date",
            premium: t?.wallet?.premium || "Premium Amount",
            summary: t?.wallet?.summary || "Coverage Summary",
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
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
                toast.error(result.error)
            } else {
                toast.success(copy.success)
                router.push(`/wallet/${policy.id}`)
                router.refresh()
            }
        })
    }

    const policyTypes = [
        { value: "motor", label: "Motor / Vehicle" },
        { value: "health", label: "Health / Medical" },
        { value: "home", label: "Home / Property" },
        { value: "life", label: "Life Insurance" },
        { value: "travel", label: "Travel & Flight" },
        { value: "business", label: "Business / Commercial" },
        { value: "liability", label: "Liability" },
        { value: "pet", label: "Pet Insurance" },
        { value: "other", label: "Other" },
    ]

    const inputClass = "flex h-10 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
    const labelClass = "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-stone-700"

    return (
        <form onSubmit={handleSubmit} className="space-y-6 pb-20">
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
                            <option value="" disabled>Select type</option>
                            {policyTypes.map((type) => (
                                <option key={type.value} value={type.value}>
                                    {type.label}
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
                    <label htmlFor="premiumAmount" className={labelClass}>{copy.labels.premium} (€)</label>
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

            <div className="flex items-center gap-3 pt-4 border-t border-stone-100">
                <button
                    type="button"
                    onClick={() => router.back()}
                    disabled={isPending}
                    className="flex-1 h-10 px-4 py-2 bg-white border border-stone-300 rounded-lg text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                >
                    {copy.cancel}
                </button>
                <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 h-10 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center"
                >
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isPending ? copy.saving : copy.save}
                </button>
            </div>
        </form>
    )
}
