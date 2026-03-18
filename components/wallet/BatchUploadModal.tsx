"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useLanguage } from "@/contexts/LanguageContext"
import { mapWalletErrorToMessage } from "@/lib/i18n/wallet-error"

interface ExtractedPolicy {
    id: string
    fileName: string
    status: "pending" | "processing" | "success" | "error"
    error?: string
    data?: {
        insurerName: string
        policyNumber: string
        lineOfBusiness: string
        startDate: string
        endDate: string
        premiumAmount?: number
        coverageSummary?: string
    }
}

interface BatchUploadModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
}

export function BatchUploadModal({ isOpen, onClose, onSuccess }: BatchUploadModalProps) {
    const { t } = useLanguage()
    const copy = t.wallet.batchUpload
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [policies, setPolicies] = useState<ExtractedPolicy[]>([])
    const [isProcessing, setIsProcessing] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [dragOver, setDragOver] = useState(false)

    if (!isOpen) return null

    const withVars = (template: string, vars: Record<string, string | number>) =>
        Object.entries(vars).reduce(
            (acc, [key, value]) => acc.replace(new RegExp(`\\{${key}\\}`, "g"), String(value)),
            template
        )

    const processFile = async (file: File): Promise<ExtractedPolicy> => {
        const id = Math.random().toString(36).substring(7)

        try {
            const formData = new FormData()
            formData.append("file", file)
            formData.append("extractOnly", "true")

            const response = await fetch("/api/policies/extract", {
                method: "POST",
                body: formData,
            })

            if (!response.ok) {
                throw new Error(response.statusText || "BATCH_EXTRACT_FAILED")
            }

            const result = await response.json()

            if (result.error) {
                return {
                    id,
                    fileName: file.name,
                    status: "error",
                    error: mapWalletErrorToMessage(result.error, t, "batchUpload"),
                }
            }

            return {
                id,
                fileName: file.name,
                status: "success",
                data: result.data,
            }
        } catch (error) {
            return {
                id,
                fileName: file.name,
                status: "error",
                error: mapWalletErrorToMessage(error instanceof Error ? error.message : error, t, "batchUpload"),
            }
        }
    }

    const handleFiles = async (files: FileList | File[]) => {
        const fileArray = Array.from(files).slice(0, 10)
        if (fileArray.length === 0) return

        setIsProcessing(true)

        const initialPolicies: ExtractedPolicy[] = fileArray.map((file) => ({
            id: Math.random().toString(36).substring(7),
            fileName: file.name,
            status: "processing",
        }))
        setPolicies(initialPolicies)

        const results = await Promise.all(
            fileArray.map(async (file, index) => {
                const result = await processFile(file)
                setPolicies((prev) => prev.map((p, i) => (i === index ? result : p)))
                return result
            })
        )

        setPolicies(results)
        setIsProcessing(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(false)
        handleFiles(e.dataTransfer.files)
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(true)
    }

    const handleDragLeave = () => setDragOver(false)

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) handleFiles(e.target.files)
    }

    const handleRemove = (id: string) => {
        setPolicies((prev) => prev.filter((p) => p.id !== id))
    }

    const handleUpdatePolicy = (id: string, field: string, value: string) => {
        setPolicies((prev) =>
            prev.map((p) => {
                if (p.id !== id || !p.data) return p
                return {
                    ...p,
                    data: {
                        ...p.data,
                        [field]: value,
                    },
                }
            })
        )
    }

    const handleSaveAll = async () => {
        const successPolicies = policies.filter((p) => p.status === "success" && p.data)

        if (successPolicies.length === 0) {
            toast.error(copy.noValidPolicies)
            return
        }

        setIsSaving(true)

        try {
            const response = await fetch("/api/policies/batch-create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    policies: successPolicies.map((p) => p.data),
                }),
            })

            const result = await response.json()

            if (result.success && (result.count || 0) > 0) {
                if ((result.failedCount || 0) > 0) {
                    toast.success(withVars(copy.savePartialSuccess, { count: result.count, failed: result.failedCount }))
                } else {
                    toast.success(withVars(copy.saveSuccess, { count: result.count }))
                }
                router.refresh()
                onSuccess?.()
                handleClose()
            } else if ((result.failedCount || 0) > 0) {
                toast.error(withVars(copy.saveNoneFailedValidation, { failed: result.failedCount }))
            } else {
                toast.error(mapWalletErrorToMessage(result.error || copy.saveFailed, t, "batchUpload"))
            }
        } catch (error) {
            toast.error(mapWalletErrorToMessage(error, t, "batchUpload"))
        } finally {
            setIsSaving(false)
        }
    }

    const handleClose = () => {
        setPolicies([])
        setIsProcessing(false)
        onClose()
    }

    const successCount = policies.filter((p) => p.status === "success").length
    const errorCount = policies.filter((p) => p.status === "error").length
    const processingCount = policies.filter((p) => p.status === "processing").length

    const getPolicyTypeIcon = (type: string) => {
        switch (type?.toLowerCase()) {
            case "motor": return "CAR"
            case "health": return "HLT"
            case "home": return "HOM"
            case "life": return "LIF"
            case "travel": return "TRV"
            case "liability": return "LIA"
            default: return "POL"
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={handleClose} />

            <div data-testid="batch-upload-modal" className="relative w-full max-w-3xl bg-white dark:bg-stone-900 rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
                <div className="p-8 pb-0">
                    <div className="flex items-center gap-3 mb-4 text-teal-600">
                        <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">{copy.badge}</span>
                    </div>
                    <h2 className="text-3xl font-black text-stone-900 dark:text-white tracking-tighter mb-2">{copy.title}</h2>
                    <p className="text-base text-stone-500 dark:text-stone-400 font-medium">{copy.subtitle}</p>
                </div>

                <div className="flex-1 overflow-y-auto p-8 pt-6">
                    {policies.length === 0 ? (
                        <div
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onClick={() => fileInputRef.current?.click()}
                            className={`
                                border-2 border-dashed rounded-[32px] p-12 text-center cursor-pointer transition-all
                                ${dragOver
                                    ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20"
                                    : "border-stone-200 dark:border-stone-700 hover:border-teal-400 hover:bg-stone-50 dark:hover:bg-stone-800/50"
                                }
                            `}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept=".pdf,image/*"
                                data-testid="batch-upload-file-input"
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                            <div className="w-16 h-16 bg-stone-100 dark:bg-stone-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <svg className="w-8 h-8 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-black text-stone-900 dark:text-white mb-2">{copy.dropTitle}</h3>
                            <p className="text-sm text-stone-400">{copy.dropSubtitle}</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 mb-6">
                                {processingCount > 0 && (
                                    <span className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-full text-xs font-bold">
                                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        {processingCount} {copy.processing}
                                    </span>
                                )}
                                {successCount > 0 && (
                                    <span className="flex items-center gap-2 px-3 py-1.5 bg-teal-100 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 rounded-full text-xs font-bold">
                                        OK {successCount} {copy.ready}
                                    </span>
                                )}
                                {errorCount > 0 && (
                                    <span className="flex items-center gap-2 px-3 py-1.5 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-full text-xs font-bold">
                                        ERR {errorCount} {copy.failed}
                                    </span>
                                )}
                            </div>

                            <div className="space-y-3">
                                {policies.map((policy) => (
                                    <div
                                        key={policy.id}
                                        className={`
                                            p-4 rounded-2xl border transition-all
                                            ${policy.status === "processing"
                                                ? "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10"
                                                : policy.status === "success"
                                                    ? "border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-900/10"
                                                    : "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10"
                                            }
                                        `}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={`
                                                w-12 h-12 rounded-xl flex items-center justify-center text-xs font-black tracking-widest flex-shrink-0
                                                ${policy.status === "processing" ? "bg-amber-100 dark:bg-amber-900/30" : ""}
                                                ${policy.status === "success" ? "bg-teal-100 dark:bg-teal-900/30" : ""}
                                                ${policy.status === "error" ? "bg-red-100 dark:bg-red-900/30" : ""}
                                            `}>
                                                {policy.status === "processing"
                                                    ? (
                                                        <svg className="w-6 h-6 text-amber-600 animate-spin" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                    )
                                                    : policy.status === "success"
                                                        ? getPolicyTypeIcon(policy.data?.lineOfBusiness || "")
                                                        : "ERR"
                                                }
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-mono text-stone-400 truncate">{policy.fileName}</span>
                                                    <button
                                                        onClick={() => handleRemove(policy.id)}
                                                        className="p-1 hover:bg-stone-200 dark:hover:bg-stone-700 rounded text-stone-400 hover:text-red-500 transition-colors"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>

                                                {policy.status === "processing" && (
                                                    <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">{copy.analyzing}</p>
                                                )}

                                                {policy.status === "error" && (
                                                    <p className="text-sm text-red-600 dark:text-red-400">{policy.error || copy.extractionFailed}</p>
                                                )}

                                                {policy.status === "success" && policy.data && (
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-bold text-stone-900 dark:text-white">{policy.data.insurerName}</span>
                                                            <span className="px-2 py-0.5 bg-stone-200 dark:bg-stone-700 rounded text-xs font-medium text-stone-600 dark:text-stone-400 capitalize">
                                                                {t.policyTypes?.[policy.data.lineOfBusiness as keyof typeof t.policyTypes] || policy.data.lineOfBusiness}
                                                            </span>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                                            <div>
                                                                <span className="text-stone-400">{copy.policyNumberLabel}: </span>
                                                                <input
                                                                    type="text"
                                                                    value={policy.data.policyNumber}
                                                                    onChange={(e) => handleUpdatePolicy(policy.id, "policyNumber", e.target.value)}
                                                                    className="bg-transparent border-b border-stone-200 dark:border-stone-700 focus:border-teal-500 outline-none text-stone-700 dark:text-stone-300 w-32"
                                                                />
                                                            </div>
                                                            <div>
                                                                <span className="text-stone-400">{copy.premiumLabel}: </span>
                                                                <span className="text-stone-700 dark:text-stone-300">€{policy.data.premiumAmount?.toLocaleString() || "—"}</span>
                                                            </div>
                                                            <div className="col-span-2">
                                                                <span className="text-stone-400">{copy.periodLabel}: </span>
                                                                <span className="text-stone-700 dark:text-stone-300">{policy.data.startDate} ? {policy.data.endDate}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isProcessing}
                                data-testid="batch-upload-add-more"
                                className="w-full py-4 border-2 border-dashed border-stone-200 dark:border-stone-700 rounded-2xl text-stone-400 hover:text-teal-600 hover:border-teal-400 transition-colors disabled:opacity-50"
                            >
                                + {copy.addMoreFiles}
                            </button>
                        </div>
                    )}
                </div>

                <div className="p-8 pt-0 flex gap-4">
                    <button
                        onClick={handleClose}
                        className="flex-1 px-8 py-5 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-white rounded-[24px] text-[10px] font-black uppercase tracking-widest hover:bg-stone-200 dark:hover:bg-stone-700 transition-all"
                    >
                        {copy.cancel}
                    </button>
                    {policies.length > 0 && successCount > 0 && (
                        <button
                            onClick={handleSaveAll}
                            disabled={isSaving || isProcessing}
                            data-testid="batch-upload-save-all"
                            className="flex-[2] px-8 py-5 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-stone-900/10 hover:bg-teal-600 dark:hover:bg-teal-500 hover:text-white transition-all disabled:opacity-50"
                        >
                            {isSaving ? copy.saving : withVars(copy.savePolicies, { count: successCount })}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
