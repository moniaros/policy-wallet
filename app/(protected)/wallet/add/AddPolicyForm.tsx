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
            className="w-full relative group overflow-hidden rounded-2xl bg-stone-900 dark:bg-white text-white dark:text-stone-900 py-4 font-black text-[12px] uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 transition-all shadow-xl hover:shadow-2xl"
        >
            <div className="absolute inset-0 bg-gradient-to-r from-teal-500/0 via-teal-500/10 to-teal-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            <span className="relative z-10 flex items-center justify-center gap-2">
                {pending ? (
                    <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        {t.common.loading}
                    </>
                ) : (
                    <>
                        {t.wallet.addScan}
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                    </>
                )}
            </span>
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
    const [dragActive, setDragActive] = useState(false)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setSelectedFiles(Array.from(e.target.files))
        }
    }

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true)
        } else if (e.type === "dragleave") {
            setDragActive(false)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setSelectedFiles(Array.from(e.dataTransfer.files))
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
                router.push("/wallet")
            } catch (error: any) {
                console.error(error)
                toast.error(error.message || t.errors.somethingWentWrong)
            }
        })
    }

    return (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-[40px] p-8 sm:p-12 shadow-2xl shadow-stone-200/50 dark:shadow-none max-w-2xl mx-auto relative overflow-hidden">
            {/* Decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 dark:bg-teal-900/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            {/* Header */}
            <div className="mb-10 relative">
                <div className="flex items-center gap-3 mb-4">
                    <span className="w-8 h-px bg-stone-200 dark:bg-stone-700" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-500">{t.wallet.newAsset}</h3>
                </div>
                <h2 className="text-3xl font-black text-stone-900 dark:text-white tracking-tighter">
                    {t.wallet.uploadTitle} <span className="text-teal-600 dark:text-teal-500">.</span>
                </h2>
            </div>

            <div className="space-y-8 relative z-10">
                {/* Insurer Dropdown */}
                <div className="group">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-2 group-focus-within:text-teal-600 transition-colors">
                        {t.wallet.insurer}
                    </label>
                    <div className="relative">
                        <select
                            name="insurerName"
                            required
                            className="w-full appearance-none bg-stone-50 dark:bg-stone-800/50 border-none rounded-xl px-4 py-4 text-sm font-bold text-stone-900 dark:text-white placeholder-stone-400 focus:ring-2 focus:ring-teal-500 transition-all cursor-pointer hover:bg-stone-100 dark:hover:bg-stone-800"
                        >
                            <option value="">{t.wallet.selectProvider}</option>
                            {insurers.map(i => (
                                <option key={i.id} value={i.name}>{i.name}</option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Insurance Type Dropdown */}
                <div className="group">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-2 group-focus-within:text-teal-600 transition-colors">
                        {t.wallet.type}
                    </label>
                    <div className="relative">
                        <select
                            name="lineOfBusiness"
                            required
                            className="w-full appearance-none bg-stone-50 dark:bg-stone-800/50 border-none rounded-xl px-4 py-4 text-sm font-bold text-stone-900 dark:text-white placeholder-stone-400 focus:ring-2 focus:ring-teal-500 transition-all cursor-pointer hover:bg-stone-100 dark:hover:bg-stone-800"
                        >
                            <option value="">{t.wallet.selectType}</option>
                            {types.map(type => (
                                <option key={type.id} value={type.slug}>
                                    {t.policyTypes[type.slug as keyof typeof t.policyTypes] || type.name}
                                </option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Policy Number */}
                <div className="group">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-2 group-focus-within:text-teal-600 transition-colors">
                        {t.wallet.policyNumber}
                    </label>
                    <input
                        name="policyNumber"
                        type="text"
                        required
                        placeholder="e.g. ABC-123456"
                        className="w-full bg-stone-50 dark:bg-stone-800/50 border-none rounded-xl px-4 py-4 text-sm font-bold text-stone-900 dark:text-white placeholder-stone-400 focus:ring-2 focus:ring-teal-500 transition-all"
                    />
                </div>

                {/* Dates Group */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-stone-50/50 dark:bg-stone-800/30 p-6 rounded-2xl border border-stone-100 dark:border-stone-800">
                    <div className="group">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-2 group-focus-within:text-teal-600 transition-colors">{t.wallet.startDate}</label>
                        <input
                            name="startDate"
                            type="date"
                            required
                            className="w-full bg-white dark:bg-stone-800 border-none rounded-lg px-3 py-2 text-sm font-bold text-stone-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                        />
                    </div>
                    <div className="group">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-2 group-focus-within:text-teal-600 transition-colors">{t.wallet.endDate}</label>
                        <input
                            name="endDate"
                            type="date"
                            required
                            className="w-full bg-white dark:bg-stone-800 border-none rounded-lg px-3 py-2 text-sm font-bold text-stone-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                        />
                    </div>
                </div>

                {/* File Upload */}
                <div>
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-2">
                        {t.wallet.documents} (PDF)
                    </label>
                    <div
                        className={`mt-1 relative group cursor-pointer transition-all duration-300 ${dragActive ? 'scale-[1.02]' : ''}`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        <input
                            id="files"
                            name="files"
                            type="file"
                            multiple
                            accept=".pdf"
                            className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer"
                            onChange={handleFileChange}
                        />

                        <div className={`
                            border-2 border-dashed rounded-2xl p-10 text-center transition-all bg-stone-50 dark:bg-stone-800/30
                            ${dragActive ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-900/20' : 'border-stone-200 dark:border-stone-700 hover:border-teal-400 dark:hover:border-teal-600 hover:bg-stone-100 dark:hover:bg-stone-800'}
                        `}>
                            <div className="w-16 h-16 bg-white dark:bg-stone-800 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm group-hover:scale-110 transition-transform duration-300">
                                <svg className={`w-8 h-8 transition-colors ${dragActive ? 'text-teal-600' : 'text-stone-400 group-hover:text-teal-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                            </div>
                            <p className="text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">
                                {dragActive ? t.wallet.dropFiles : t.wallet.uploadDesc}
                            </p>
                            <p className="text-xs font-medium text-stone-400">
                                {t.wallet.dragDropBrowse}
                            </p>
                        </div>
                    </div>

                    {selectedFiles.length > 0 && (
                        <div className="mt-4 space-y-2">
                            {selectedFiles.map((file, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-xl border border-teal-100 dark:border-teal-900/30 animate-in slide-in-from-left-2">
                                    <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center text-teal-600 dark:text-teal-400">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <span className="text-sm font-bold text-teal-900 dark:text-teal-100 truncate flex-1">{file.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedFiles(files => files.filter((_, idx) => idx !== i))}
                                        className="p-1 text-teal-400 hover:text-red-500 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="pt-4">
                    <SubmitButton pending={isPending} />
                </div>
            </div>
        </form>
    )
}
