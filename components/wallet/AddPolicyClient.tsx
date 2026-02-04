"use client"

import React, { useState, useTransition } from "react"
import { useLanguage } from "@/contexts/LanguageContext"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { createPolicy } from "@/app/(protected)/wallet/actions"
import {
    UploadCloud,
    FileText,
    Shield,
    Calendar,
    Hash,
    Check,
    X,
    Loader2,
    ArrowLeft
} from 'lucide-react'

interface AddPolicyClientProps {
    insurers: { id: string, name: string }[]
    types: { id: string, name: string, slug: string }[]
}

export function AddPolicyClient({ insurers, types }: AddPolicyClientProps) {
    const { t } = useLanguage()
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [dragActive, setDragActive] = useState(false)

    // Form Steps or just structured scroll? Let's do structured scroll for friction-less entry.

    // File Handling
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            // Append or replace? Let's allow multiple.
            setSelectedFiles(prev => [...prev, ...Array.from(e.target.files || [])])
        }
    }

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === "dragenter" || e.type === "dragover") setDragActive(true)
        else if (e.type === "dragleave") setDragActive(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)
        if (e.dataTransfer.files) {
            setSelectedFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)])
        }
    }

    const removeFile = (index: number) => {
        setSelectedFiles(files => files.filter((_, i) => i !== index))
    }

    // Submit
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const supabase = createClient()

        if (selectedFiles.length === 0) {
            toast.error("Please upload the policy document")
            return
        }

        // Validate required field (Coverage Type) manually just in case
        if (!formData.get("lineOfBusiness")) {
            toast.error("Please select a Coverage Type")
            return
        }

        // Inject defaults for optional fields if empty
        if (!formData.get("insurerName")) {
            formData.set("insurerName", "Unknown Insurer")
        }

        if (!formData.get("policyNumber")) {
            formData.set("policyNumber", `PENDING-${Date.now()}`)
        }

        if (!formData.get("startDate")) {
            formData.set("startDate", new Date().toISOString().split('T')[0])
        }

        if (!formData.get("endDate")) {
            const nextYear = new Date()
            nextYear.setFullYear(nextYear.getFullYear() + 1)
            formData.set("endDate", nextYear.toISOString().split('T')[0])
        }

        startTransition(async () => {
            try {
                // Upload files
                const uploadPromises = selectedFiles.map(async (file) => {
                    const fileExt = file.name.split('.').pop()
                    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

                    const { error: uploadError } = await supabase.storage
                        .from('policies')
                        .upload(fileName, file)

                    if (uploadError) throw uploadError

                    const { data: { publicUrl } } = supabase.storage
                        .from('policies')
                        .getPublicUrl(fileName)

                    return {
                        url: publicUrl,
                        name: file.name,
                        size: file.size
                    }
                })

                const uploadedDocs = await Promise.all(uploadPromises)

                // Update FormData
                formData.delete("files")
                uploadedDocs.forEach(doc => {
                    formData.append("documentUrls", doc.url)
                    formData.append("documentNames", doc.name)
                    formData.append("documentSizes", doc.size.toString())
                })

                await createPolicy(formData)
                toast.success("Policy added successfully")
                router.push("/wallet")
            } catch (error: any) {
                console.error(error)
                toast.error(error.message || "Failed to add policy")
            }
        })
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
                <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="p-2 -ml-2 text-slate-500 hover:text-slate-900 dark:text-slate-400"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <span className="font-bold text-slate-900 dark:text-white">Add New Policy</span>
                    <div className="w-9" /> {/* Spacer */}
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 py-8">
                <form onSubmit={handleSubmit} className="space-y-8">

                    {/* File Upload Section - Prominent */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-xl border border-slate-200 dark:border-slate-800 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                    <UploadCloud className="w-5 h-5" />
                                </div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                                    Upload Document
                                </h2>
                            </div>

                            <div
                                className={`
                                    border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer
                                    ${dragActive
                                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                        : 'border-slate-200 dark:border-slate-700 hover:border-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                    }
                                `}
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                            >
                                <input
                                    type="file"
                                    name="files"
                                    multiple
                                    accept=".pdf,.png,.jpg,.jpeg"
                                    className="hidden"
                                    id="file-upload"
                                    onChange={handleFileChange}
                                />
                                <label htmlFor="file-upload" className="cursor-pointer block">
                                    <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full shadow-lg flex items-center justify-center mx-auto mb-4 text-emerald-500">
                                        <FileText className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                                        Tap to upload policy PDF
                                    </h3>
                                    <p className="text-slate-500 text-sm">
                                        or drag and drop your files here
                                    </p>
                                </label>
                            </div>

                            {/* File List */}
                            {selectedFiles.length > 0 && (
                                <div className="mt-4 space-y-2">
                                    {selectedFiles.map((file, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-2">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="w-8 h-8 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                                    <FileText className="w-4 h-4" />
                                                </div>
                                                <div className="truncate">
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                                        {file.name}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {(file.size / 1024 / 1024).toFixed(2)} MB
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeFile(idx)}
                                                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="mt-4 flex items-center gap-2 p-3 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900/20">
                                <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                                    AI will automatically extract policy details.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Manual Details */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-xl border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-400">
                                <FileText className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white">
                                Policy Details
                            </h2>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Type - REQUIRED */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white ml-1">
                                        Coverage Type <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <select
                                            name="lineOfBusiness"
                                            required
                                            className="w-full appearance-none bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                                        >
                                            <option value="">Select Type</option>
                                            {types.map(t => (
                                                <option key={t.id} value={t.slug}>{t.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Insurer - OPTIONAL */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center ml-1">
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                            Insurer Provider
                                        </label>
                                        <span className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">Optional</span>
                                    </div>
                                    <div className="relative">
                                        <select
                                            name="insurerName"
                                            className="w-full appearance-none bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3.5 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700"
                                        >
                                            <option value="">Select or leave empty</option>
                                            {insurers.map(i => (
                                                <option key={i.id} value={i.name}>{i.name}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <Shield className="w-4 h-4 text-slate-400" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Policy Number - OPTIONAL */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center ml-1">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                        Policy Number
                                    </label>
                                    <span className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">Optional</span>
                                </div>
                                <div className="relative">
                                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        name="policyNumber"
                                        placeholder="e.g. POL-123456789"
                                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl pl-10 pr-4 py-3.5 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700 pointer-events-auto"
                                    />
                                </div>
                            </div>

                            {/* Dates - OPTIONAL */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center ml-1">
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Start Date</label>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            name="startDate"
                                            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3.5 text-sm font-medium text-slate-500 dark:text-slate-400 focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center ml-1">
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">End Date</label>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            name="endDate"
                                            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3.5 text-sm font-medium text-slate-500 dark:text-slate-400 focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isPending}
                        className="w-full group relative overflow-hidden bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl py-4 font-black text-sm uppercase tracking-widest hover:scale-[1.01] active:scale-[0.99] transition-all shadow-xl hover:shadow-2xl disabled:opacity-70 disabled:scale-100"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/10 to-emerald-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                        <span className="relative z-10 flex items-center justify-center gap-2">
                            {isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    Add Policy to Wallet
                                    <Check className="w-5 h-5" />
                                </>
                            )}
                        </span>
                    </button>

                    <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                        Your data is encrypted and secure.
                    </p>
                </form>
            </div>
        </div>
    )
}
