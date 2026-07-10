"use client"

import React, { useState, useTransition, useEffect, useRef, useCallback } from "react"
import { useLanguage } from "@/contexts/LanguageContext"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { createPolicy, getPolicyReviewData, retryPolicyAnalysis } from "@/app/(protected)/wallet/actions"
import { mapWalletErrorToMessage } from "@/lib/i18n/wallet-error"
import { Skeleton } from "@/components/ui/skeleton"
import { AiConsentModal } from "@/components/ui/AiConsentModal"
import { PolicyReviewScreen } from "@/components/wallet/PolicyReviewScreen"
import type { PolicyReviewData } from "@/lib/wallet/policy-review"
import {
    UploadCloud,
    FileText,
    Shield,
    Hash,
    Check,
    X,
    Loader2,
    ArrowLeft,
    BadgeCheck,
    Calendar,
    Banknote,
    Pencil,
    Sparkles,
    AlertTriangle,
    RefreshCw,
} from 'lucide-react'

interface AddPolicyClientProps {
    insurers: { id: string, name: string }[]
    types: { id: string, name: string, slug: string }[]
    hasAiConsent: boolean
}

type Phase = 'form' | 'reviewing'

function getAnalyzingStep(elapsed: number, t: any): string {
    const steps = (t.wallet as any)?.review
    if (elapsed < 5) return steps?.stepUploading || 'Uploading document...'
    if (elapsed < 15) return steps?.stepExtracting || 'Extracting policy data...'
    if (elapsed < 40) return steps?.stepAnalyzing || 'Analyzing coverage...'
    return steps?.stepGenerating || 'Generating insights...'
}

export function AddPolicyClient({ insurers, types, hasAiConsent }: AddPolicyClientProps) {
    const { t, language } = useLanguage()
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [dragActive, setDragActive] = useState(false)
    const formCopy = t.wallet.addPolicyForm

    // AI-processing consent (GDPR): analysis starts in the background right after
    // createPolicy, so consent must be captured before the form is submitted.
    const [aiConsent, setAiConsent] = useState(hasAiConsent)
    const [consentModalOpen, setConsentModalOpen] = useState(false)
    const pendingFormDataRef = useRef<FormData | null>(null)

    // Review phase state
    const [phase, setPhase] = useState<Phase>('form')
    const [createdPolicyId, setCreatedPolicyId] = useState<string | null>(null)
    const [reviewData, setReviewData] = useState<PolicyReviewData | null>(null)
    const pollingStartRef = useRef<number>(0)

    // File Handling
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
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

    // Submit — now transitions to review phase instead of navigating away
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)

        if (selectedFiles.length === 0) {
            toast.error(formCopy.uploadDocumentRequired)
            return
        }

        if (!formData.get("lineOfBusiness")) {
            toast.error(formCopy.coverageTypeRequired)
            return
        }

        if (!formData.get("insurerName")) {
            formData.set("insurerName", "__PENDING_EXTRACTION__")
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

        if (!aiConsent) {
            pendingFormDataRef.current = formData
            setConsentModalOpen(true)
            return
        }

        submitPolicy(formData)
    }

    const submitPolicy = (formData: FormData) => {
        const supabase = createClient()
        startTransition(async () => {
            try {
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

                    return { url: publicUrl, name: file.name, size: file.size }
                })

                const uploadedDocs = await Promise.all(uploadPromises)

                formData.delete("files")
                uploadedDocs.forEach(doc => {
                    formData.append("documentUrls", doc.url)
                    formData.append("documentNames", doc.name)
                    formData.append("documentSizes", doc.size.toString())
                })

                const result = await createPolicy(formData)
                if ('policyId' in result && result.policyId) {
                    setCreatedPolicyId(result.policyId)
                    pollingStartRef.current = Date.now()
                    setPhase('reviewing')
                } else {
                    toast.success(formCopy.addSuccess)
                    router.push("/wallet")
                }
            } catch (error: any) {
                console.error(error)
                toast.error(mapWalletErrorToMessage(error?.message || error, t, "addPolicy"))
            }
        })
    }

    // Polling for review data with backoff
    const pollReviewData = useCallback(async () => {
        if (!createdPolicyId) return
        try {
            const data = await getPolicyReviewData(createdPolicyId)
            if ('error' in data) return

            if (data.status !== 'analyzing') {
                setReviewData(data as PolicyReviewData)
            }
        } catch {
            // silent
        }
    }, [createdPolicyId])

    useEffect(() => {
        if (phase !== 'reviewing' || !createdPolicyId) return
        if (reviewData) return // already got data

        const getInterval = () => {
            const elapsed = Date.now() - pollingStartRef.current
            if (elapsed < 30_000) return 2000
            if (elapsed < 120_000) return 5000
            return 10_000
        }

        let timeout: ReturnType<typeof setTimeout>
        const poll = () => {
            pollReviewData()
            timeout = setTimeout(poll, getInterval())
        }
        timeout = setTimeout(poll, getInterval())

        return () => clearTimeout(timeout)
    }, [phase, createdPolicyId, reviewData, pollReviewData])

    const locale = language === 'el' ? 'el-GR' : 'en-US'
    const reviewCopy = (t.wallet as any)?.review || {}

    const formatCurrency = (amount: number, currency: string) =>
        new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleDateString(locale)

    // ────────────────────────────── REVIEW SCREEN ──────────────────────────────
    if (phase === 'reviewing') {
        const elapsedSecs = (Date.now() - pollingStartRef.current) / 1000
        const localizedLob = t.policyTypes?.[reviewData?.lineOfBusiness as keyof typeof t.policyTypes] || reviewData?.lineOfBusiness

        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
                {/* Header */}
                <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
                    <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-center">
                        <span className="font-bold text-slate-900 dark:text-white">
                            {reviewCopy.title || 'Policy Review'}
                        </span>
                    </div>
                </div>

                <div className="max-w-3xl mx-auto px-4 py-8">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-xl border border-slate-200 dark:border-slate-800">

                        {reviewData?.status === 'action_needed' ? (
                            /* ── Analysis Failed State ── */
                            <div className="space-y-6">
                                <div className="flex flex-col items-center gap-4 py-4">
                                    <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                        <AlertTriangle className="w-7 h-7 text-amber-500" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                            {language === 'el'
                                                ? 'Η ανάλυση δεν ολοκληρώθηκε'
                                                : 'Analysis could not be completed'}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                                            {language === 'el'
                                                ? 'Μπορείτε να δοκιμάσετε ξανά ή να συμπληρώσετε τα στοιχεία χειροκίνητα.'
                                                : 'You can retry or fill in the details manually.'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            if (!createdPolicyId) return
                                            const result = await retryPolicyAnalysis(createdPolicyId)
                                            if ('error' in result) {
                                                toast.error(result.error)
                                                return
                                            }
                                            setReviewData(null)
                                            pollingStartRef.current = Date.now()
                                        }}
                                        className="w-full bg-primary hover:bg-primary-hover text-white dark:text-[#1A2420] rounded-2xl py-4 font-bold text-sm uppercase tracking-widest transition-all shadow-xl shadow-primary/25"
                                    >
                                        <span className="flex items-center justify-center gap-2">
                                            <RefreshCw className="w-5 h-5" />
                                            {reviewCopy.tryAgain}
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => router.push(`/wallet/${createdPolicyId}/edit`)}
                                        className="w-full rounded-2xl py-3.5 font-bold text-sm text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        <span className="flex items-center justify-center gap-2">
                                            <Pencil className="w-4 h-4" />
                                            {reviewCopy.edit}
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => router.push('/wallet')}
                                        className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline transition-colors mt-2"
                                    >
                                        {reviewCopy.skipForNow}
                                    </button>
                                </div>
                            </div>
                        ) : !reviewData ? (
                            /* ── Skeleton / Loading State ── */
                            <div className="space-y-6">
                                <div className="flex flex-col items-center gap-4 py-4">
                                    <div className="relative">
                                        <div className="w-16 h-16 rounded-full bg-primary-soft dark:bg-primary/15 flex items-center justify-center">
                                            <Sparkles className="w-7 h-7 text-primary dark:text-mint animate-pulse" />
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                            {reviewCopy.analyzing || "We're reading your document..."}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 animate-pulse">
                                            {getAnalyzingStep(elapsedSecs, t)}
                                        </p>
                                    </div>
                                </div>

                                {/* Skeleton rows */}
                                <div className="space-y-4 pt-2">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="flex items-center gap-4">
                                            <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                                            <div className="flex-1 space-y-2">
                                                <Skeleton className="h-3 w-24" />
                                                <Skeleton className="h-4 w-40" />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="pt-4 text-center">
                                    <button
                                        type="button"
                                        onClick={() => router.push('/wallet')}
                                        className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline transition-colors"
                                    >
                                        {reviewCopy.skipForNow || 'Skip and review later'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* ── Full extraction review (edit / confirm / flag) ── */
                            <PolicyReviewScreen
                                data={reviewData}
                                insurers={insurers}
                                types={types}
                                onDone={() => router.push('/wallet')}
                                onRetry={async () => {
                                    if (!createdPolicyId) return
                                    const result = await retryPolicyAnalysis(createdPolicyId)
                                    if ('error' in result) {
                                        toast.error(mapWalletErrorToMessage(result.error, t, 'analysis'))
                                        return
                                    }
                                    setReviewData(null)
                                    pollingStartRef.current = Date.now()
                                }}
                            />
                        )}
                    </div>
                </div>
            </div>
        )
    }

    // ────────────────────────────── UPLOAD FORM ──────────────────────────────
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
                <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="p-2 -ml-2 text-slate-500 hover:text-slate-900 dark:text-slate-400"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <span className="font-bold text-slate-900 dark:text-white">{t.wallet.addPolicy}</span>
                    <div className="w-9" />
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 py-8">
                <AiConsentModal
                    isOpen={consentModalOpen}
                    onClose={() => {
                        setConsentModalOpen(false)
                        pendingFormDataRef.current = null
                    }}
                    onConsented={() => {
                        setAiConsent(true)
                        setConsentModalOpen(false)
                        const pending = pendingFormDataRef.current
                        pendingFormDataRef.current = null
                        if (pending) submitPolicy(pending)
                    }}
                    source="wallet_add_policy"
                />

                <form onSubmit={handleSubmit} className="space-y-8">

                    {/* File Upload Section */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 shadow-xl border border-slate-200 dark:border-slate-800 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-primary-soft dark:bg-primary/15 rounded-xl flex items-center justify-center text-primary dark:text-mint">
                                    <UploadCloud className="w-5 h-5" />
                                </div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                                    {t.wallet.uploadDocument}
                                </h2>
                            </div>

                            <div
                                className={`
                                    border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer
                                    ${dragActive
                                        ? 'border-primary bg-primary-tint dark:bg-primary/15'
                                        : 'border-slate-200 dark:border-slate-700 hover:border-primary hover:bg-slate-50 dark:hover:bg-slate-800'
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
                                    <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full shadow-lg flex items-center justify-center mx-auto mb-4 text-primary dark:text-mint">
                                        <FileText className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                                        {t.wallet.tapToUpload}
                                    </h3>
                                    <p className="text-slate-500 text-sm">
                                        {t.wallet.dragDrop}
                                    </p>
                                </label>
                            </div>

                            {selectedFiles.length > 0 && (
                                <div className="mt-4 space-y-2">
                                    {selectedFiles.map((file, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-2">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="w-8 h-8 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                                    <FileText className="w-4 h-4" />
                                                </div>
                                                <div className="truncate">
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{file.name}</p>
                                                    <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                                </div>
                                            </div>
                                            <button type="button" onClick={() => removeFile(idx)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="mt-4 flex items-center gap-2 p-3 bg-primary-tint dark:bg-primary/10 rounded-xl border border-primary-soft dark:border-primary/20">
                                <Shield className="w-4 h-4 text-primary dark:text-mint" />
                                <p className="text-xs font-semibold text-primary dark:text-mint">
                                    {t.wallet.aiExtraction}
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
                                {t.wallet.policyDetails}
                            </h2>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Type - REQUIRED */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white ml-1">
                                        {t.wallet.coverageType} <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        name="lineOfBusiness"
                                        required
                                        className="w-full appearance-none bg-primary-tint dark:bg-primary/10 border border-primary-soft dark:border-primary/30 rounded-xl px-4 py-3.5 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-slate-800 transition-all"
                                    >
                                        <option value="">{t.wallet.selectTypePlaceholder}</option>
                                        {types.map(typeItem => (
                                            <option key={typeItem.id} value={typeItem.slug}>
                                                {t.policyTypes[typeItem.slug as keyof typeof t.policyTypes] || typeItem.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Insurer - OPTIONAL */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center ml-1">
                                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                            {t.wallet.insurerProvider}
                                        </label>
                                        <span className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{t.wallet.optional}</span>
                                    </div>
                                    <div className="relative">
                                        <select
                                            name="insurerName"
                                            className="w-full appearance-none bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3.5 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700"
                                        >
                                            <option value="">{t.wallet.selectOrEmpty}</option>
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
                                        {t.wallet.policyNumber}
                                    </label>
                                    <span className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{t.wallet.optional}</span>
                                </div>
                                <div className="relative">
                                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        name="policyNumber"
                                        placeholder={formCopy.policyNumberPlaceholder}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl pl-10 pr-4 py-3.5 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700 pointer-events-auto"
                                    />
                                </div>
                            </div>

                            {/* Dates - OPTIONAL */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">{t.wallet.startDate}</label>
                                    <input
                                        type="date"
                                        name="startDate"
                                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3.5 text-sm font-medium text-slate-500 dark:text-slate-400 focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">{t.wallet.endDate}</label>
                                    <input
                                        type="date"
                                        name="endDate"
                                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3.5 text-sm font-medium text-slate-500 dark:text-slate-400 focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isPending}
                        className="w-full group relative overflow-hidden bg-primary hover:bg-primary-hover text-white dark:text-[#1A2420] rounded-2xl py-4 font-bold text-sm uppercase tracking-widest hover:scale-[1.01] active:scale-[0.99] transition-all shadow-xl hover:shadow-2xl shadow-primary/25 disabled:opacity-70 disabled:scale-100"
                    >
                        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                        <span className="relative z-10 flex items-center justify-center gap-2">
                            {isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {t.wallet.processing}
                                </>
                            ) : (
                                <>
                                    {t.wallet.addToWalletAction}
                                    <Check className="w-5 h-5" />
                                </>
                            )}
                        </span>
                    </button>

                    <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                        {t.wallet.securityNote}
                    </p>
                </form>
            </div>
        </div>
    )
}
