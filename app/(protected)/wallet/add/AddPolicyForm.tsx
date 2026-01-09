"use client"

import { useState, useTransition } from "react"
import { createPolicy } from "../actions"
import { useLanguage } from "@/contexts/LanguageContext"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

function SubmitButton({ pending }: { pending: boolean }) {
    const { t } = useLanguage()
    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full bg-teal-600 text-white py-3 rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-sm"
        >
            {pending ? t.common.loading : t.common.save}
        </button>
    )
}

interface AddPolicyFormProps {
    insurers: { id: string, name: string }[]
    types: { id: string, name: string, slug: string }[]
}

export function AddPolicyForm({ insurers, types }: AddPolicyFormProps) {
    const { t } = useLanguage()
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setSelectedFiles(Array.from(e.target.files))
        }
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const supabase = createClient()

        startTransition(async () => {
            try {
                // 1. Upload files to Supabase Storage first
                const uploadPromises = selectedFiles.map(async (file) => {
                    const fileExt = file.name.split('.').pop()
                    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
                    const filePath = `${fileName}`

                    const { data, error } = await supabase.storage
                        .from('policies')
                        .upload(filePath, file)

                    if (error) throw error

                    const { data: { publicUrl } } = supabase.storage
                        .from('policies')
                        .getPublicUrl(filePath)

                    return {
                        url: publicUrl,
                        name: file.name,
                        size: file.size
                    }
                })

                const uploadedDocs = await Promise.all(uploadPromises)

                // 2. Prepare Form Data (Remove raw files, add URLs)
                formData.delete("files")
                uploadedDocs.forEach(doc => {
                    formData.append("documentUrls", doc.url)
                    formData.append("documentNames", doc.name)
                    formData.append("documentSizes", doc.size.toString())
                })

                // 3. Create Policy in DB
                await createPolicy(formData)
                toast.success(t.wallet.addPolicy + " Success")
            } catch (error: any) {
                console.error(error)
                toast.error(error.message || t.errors.somethingWentWrong)
            }
        })
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-stone-800 p-6 sm:p-8 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700">
            {/* Insurer Dropdown */}
            <div>
                <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-2">{t.wallet.insurer}</label>
                <select
                    name="insurerName"
                    required
                    className="w-full px-4 py-2.5 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all dark:text-stone-100"
                >
                    <option value="">{t.wallet.insurer}</option>
                    {insurers.map(i => (
                        <option key={i.id} value={i.name}>{i.name}</option>
                    ))}
                </select>
            </div>

            {/* Insurance Type Dropdown */}
            <div>
                <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-2">{t.wallet.type}</label>
                <select
                    name="lineOfBusiness"
                    required
                    className="w-full px-4 py-2.5 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all dark:text-stone-100"
                >
                    <option value="">{t.wallet.type}</option>
                    {types.map(t => (
                        <option key={t.id} value={t.slug}>{t.name}</option>
                    ))}
                </select>
            </div>

            {/* Basic Info (Number & Dates) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-2">{t.wallet.policyNumber}</label>
                    <input
                        name="policyNumber"
                        type="text"
                        required
                        placeholder="e.g. ABC-123456"
                        className="w-full px-4 py-2.5 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all dark:text-stone-100"
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-2">{t.wallet.startDate}</label>
                    <input
                        name="startDate"
                        type="date"
                        required
                        className="w-full px-4 py-2.5 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all dark:text-stone-100"
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-2">{t.wallet.endDate}</label>
                    <input
                        name="endDate"
                        type="date"
                        required
                        className="w-full px-4 py-2.5 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all dark:text-stone-100"
                    />
                </div>
            </div>

            {/* Multiple File Upload */}
            <div>
                <label className="block text-sm font-semibold text-stone-700 dark:text-stone-300 mb-2">{t.wallet.documents} (PDF)</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-stone-300 dark:border-stone-700 border-dashed rounded-lg hover:border-teal-400 dark:hover:border-teal-500 transition-colors">
                    <div className="space-y-1 text-center">
                        <svg className="mx-auto h-12 w-12 text-stone-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <div className="flex text-sm text-stone-600 dark:text-stone-400">
                            <label htmlFor="files" className="relative cursor-pointer bg-white dark:bg-stone-800 rounded-md font-medium text-teal-600 hover:text-teal-500 focus-within:outline-none">
                                <span>{t.wallet.uploadDocument}</span>
                                <input id="files" name="files" type="file" multiple accept=".pdf" className="sr-only" onChange={handleFileChange} />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-stone-500 dark:text-stone-400">
                            PDF only up to 10MB
                        </p>
                    </div>
                </div>
                {selectedFiles.length > 0 && (
                    <ul className="mt-4 space-y-2">
                        {selectedFiles.map((file, i) => (
                            <li key={i} className="text-sm text-stone-600 dark:text-stone-400 flex items-center gap-2">
                                <svg className="w-4 h-4 text-teal-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                </svg>
                                {file.name}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <SubmitButton pending={isPending} />
        </form>
    )
}
