"use client"

import React, { useState, useTransition, useEffect, useRef, useCallback } from "react"
import { useLanguage } from "@/contexts/LanguageContext"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { createPolicy, getPolicyAnalysisStatus, getPolicyReviewData, retryPolicyAnalysis } from "@/app/(protected)/wallet/actions"
import { mapWalletErrorToMessage } from "@/lib/i18n/wallet-error"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/src/design-system/primitives"
import { AiConsentModal } from "@/components/ui/AiConsentModal"
import { UploadDropzone } from "@/components/ui/UploadDropzone"
import { UpgradeModal } from "@/components/monetization/UpgradeModal"
import type { PolicyReviewData } from "@/lib/wallet/policy-review"
import { usePolling } from "@/hooks/usePolling"
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
    Pencil,
    Sparkles,
    AlertTriangle,
    RefreshCw,
} from 'lucide-react'
import { acceptAttribute } from "@/lib/security/file-upload"

interface AddPolicyClientProps {
    insurers: { id: string, name: string }[]
    types: { id: string, name: string, slug: string }[]
    hasAiConsent: boolean
}

type Phase = 'form' | 'reviewing'

function getAnalyzingStep(elapsed: number, t: any): string {
    const steps = t.wallet.review
    if (elapsed < 5) return steps.stepUploading
    if (elapsed < 15) return steps.stepExtracting
    if (elapsed < 40) return steps.stepAnalyzing
    return steps.stepGenerating
}

export function AddPolicyClient({ insurers, types, hasAiConsent }: AddPolicyClientProps) {
    const { t } = useLanguage()
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    // Inline field errors. These were toast-only: the message named a problem
    // but pointed at no field, and vanished when the toast timed out.
    const [fieldErrors, setFieldErrors] = useState<{ files?: string; lineOfBusiness?: string }>({})
    const formCopy = t.wallet.addPolicyForm

    // AI-processing consent (GDPR): analysis starts in the background right after
    // createPolicy, so consent must be captured before the form is submitted.
    const [aiConsent, setAiConsent] = useState(hasAiConsent)
    const [consentModalOpen, setConsentModalOpen] = useState(false)
    const pendingFormDataRef = useRef<FormData | null>(null)

    // Policy-limit upgrade modal (Trigger A — free tier holds 3 policies)
    const [limitModalOpen, setLimitModalOpen] = useState(false)

    // Review phase state
    const [phase, setPhase] = useState<Phase>('form')
    const [createdPolicyId, setCreatedPolicyId] = useState<string | null>(null)
    const [reviewData, setReviewData] = useState<PolicyReviewData | null>(null)
    // Re-analysis is a metered AI job — without this the retry button stayed
    // live during the round-trip and a second click billed the user twice.
    const [retryingAnalysis, setRetryingAnalysis] = useState(false)
    // The upload was thrown away because the analysis failed technically.
    const [discarded, setDiscarded] = useState(false)
    const pollingStartRef = useRef<number>(0)

    const removeFile = (index: number) => {
        setSelectedFiles(files => files.filter((_, i) => i !== index))
    }

    // Submit — now transitions to review phase instead of navigating away
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)

        const nextErrors: { files?: string; lineOfBusiness?: string } = {}
        if (selectedFiles.length === 0) nextErrors.files = formCopy.uploadDocumentRequired
        if (!formData.get("lineOfBusiness")) nextErrors.lineOfBusiness = formCopy.coverageTypeRequired
        setFieldErrors(nextErrors)

        if (Object.keys(nextErrors).length > 0) {
            // Toast stays for discoverability when the field is off-screen; the
            // inline message beside the field is the durable one.
            toast.error(nextErrors.files ?? nextErrors.lineOfBusiness!)
            document.getElementById(nextErrors.files ? "add-policy-files-error" : "add-lineOfBusiness")?.scrollIntoView({ block: "center", behavior: "smooth" })
            return
        }

        if (!formData.get("insurerName")) {
            formData.set("insurerName", "__PENDING_EXTRACTION__")
        }
        if (!formData.get("policyNumber")) {
            formData.set("policyNumber", `PENDING-${Date.now()}`)
        }
        // Creation placeholders for the NOT NULL date columns until extraction
        // fills them — the lifecycle/display layers read the extracted envelope
        // first and never trust these as real dates (see lib/policy-status).
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
                    // Opaque, server-unguessable storage name — the original
                    // filename is never used as the storage key (it leaks the
                    // user/policy/insurer). crypto UUID is collision-safe, so
                    // upsert can't silently overwrite another object.
                    const fileExt = (file.name.split('.').pop() || 'pdf')
                        .toLowerCase()
                        .replace(/[^a-z0-9]/g, '')
                        .slice(0, 5) || 'pdf'
                    const fileName = `${crypto.randomUUID()}.${fileExt}`

                    const { error: uploadError } = await supabase.storage
                        .from('policies')
                        .upload(fileName, file)

                    if (uploadError) throw uploadError

                    const { data: { publicUrl } } = supabase.storage
                        .from('policies')
                        .getPublicUrl(fileName)

                    // No `name`. The server discards `documentNames` and
                    // labels the document from the policy instead, so sending
                    // the customer's file name only puts it in a request body
                    // that nothing reads. The name still reaches us in the
                    // multipart part header of the file itself; that is
                    // unavoidable, this was not.
                    return { url: publicUrl, size: file.size }
                })

                const uploadedDocs = await Promise.all(uploadPromises)

                formData.delete("files")
                uploadedDocs.forEach(doc => {
                    formData.append("documentUrls", doc.url)
                    formData.append("documentSizes", doc.size.toString())
                })

                const result = await createPolicy(formData)
                if ('error' in result) {
                    if (result.error === "POLICY_LIMIT_REACHED") {
                        // Natural upgrade moment — show the plan prompt instead
                        // of a dead-end error toast.
                        setLimitModalOpen(true)
                        return
                    }
                    toast.error(mapWalletErrorToMessage(result.error, t, "addPolicy"))
                    return
                }
                if (result.policyId) {
                    setCreatedPolicyId(result.policyId)
                    pollingStartRef.current = Date.now()
                    setPhase('reviewing')
                } else {
                    toast.success(formCopy.addSuccess)
                    router.push("/wallet")
                }
            } catch (error: any) {
                console.error(error)
                const message = String(error?.message || error)
                toast.error(mapWalletErrorToMessage(message, t, "addPolicy"))
            }
        })
    }

    // Poll the LIGHTWEIGHT status endpoint; fetch the full review payload
    // exactly once, on the terminal transition. The old loop fetched the
    // whole review payload (entire acordData) every few seconds just to read
    // `status` — ~45 heavy calls per analysis.
    const pollReviewData = useCallback(async () => {
        if (!createdPolicyId) return
        try {
            const probe = await getPolicyAnalysisStatus(createdPolicyId)
            if ('error' in probe) {
                // A technical failure discards the upload outright, so the
                // policy this screen is polling for stops existing. Without
                // this branch the spinner ran forever and the customer was
                // never told anything happened.
                if (probe.error === 'Not found') setDiscarded(true)
                return
            }
            if (probe.status === 'analyzing') return

            const data = await getPolicyReviewData(createdPolicyId)
            if ('error' in data) {
                if (data.error === 'Not found') setDiscarded(true)
                return
            }
            if (data.status !== 'analyzing') {
                setReviewData(data as PolicyReviewData)
            }
        } catch {
            // silent
        }
    }, [createdPolicyId])

    // Shared backoff + hidden-tab pause (was a hand-rolled copy of the wallet's).
    usePolling(pollReviewData, {
        enabled: phase === 'reviewing' && Boolean(createdPolicyId) && !reviewData && !discarded,
    })

    const reviewCopy = t.wallet.review

    // KEEP-AND-INFORM: the run never started for a reason the customer can act
    // on, so say which one — in their language, never the internal code. Falls
    // back to the generic "did not complete" for a technical failure that kept
    // the policy (one with a user-typed insurer or number).
    const blockedCopy = ((): { title: string; hint: string } => {
        switch (reviewData?.processingErrorCode) {
            case 'TOKEN_LIMIT_BLOCKED':
                return { title: reviewCopy.blockedTokenLimit, hint: reviewCopy.blockedTokenLimitHint }
            case 'AI_CONSENT_REQUIRED':
                return { title: reviewCopy.blockedConsent, hint: reviewCopy.blockedConsentHint }
            case 'ANALYSIS_NOT_PERMITTED':
                return { title: reviewCopy.blockedNotPermitted, hint: reviewCopy.blockedNotPermittedHint }
            default:
                return {
                    title: reviewCopy.analysisNotCompleted,
                    hint: reviewCopy.analysisNotCompletedHint,
                }
        }
    })()

    // ─────────────────── POST-UPLOAD PROCESSING SCREEN ───────────────────
    if (phase === 'reviewing') {
        const elapsedSecs = (Date.now() - pollingStartRef.current) / 1000

        return (
            <div className="pb-20">
            {/* Every top-level branch needs the heading: the component returns
                from more than one place and the default state had none, so the
                route reported no <h1> even after the polling branch got one. */}
                {/* Hoisted out of a conditional branch: the route rendered no
                    <h1> at all in some states, so a screen-reader user landed on
                    a form with nothing naming the page. Visually hidden because
                    the sticky bar already names it on screen. */}
                {/* Header */}
                <div className="border-b border-border-hair">
                    <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-center">
                        <span className="font-bold text-fg-primary">
                            {t.wallet.addPolicy}
                        </span>
                    </div>
                </div>

                <div className="max-w-3xl mx-auto px-4 py-8">
                    <div className="rounded-g-sheet border border-border-subtle bg-surface-raised p-6 shadow-g-raised md:p-8">

                        {discarded ? (
                            /* ── Discarded State ──
                               The analysis failed technically and the upload was
                               removed, so there is no policy to retry, edit or
                               skip to. Saying so beats a policy in the wallet
                               with placeholder values where its insurer should
                               be. */
                            <div className="space-y-6">
                                <div className="flex flex-col items-center gap-4 py-4">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-state-gap-fill">
                                        <AlertTriangle className="w-7 h-7 text-state-gap" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-semibold text-fg-primary">
                                            {reviewCopy.discardedTitle}
                                        </p>
                                        <p className="mt-1 text-xs text-fg-secondary">
                                            {reviewCopy.discardedHint}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDiscarded(false)
                                            setCreatedPolicyId(null)
                                            setReviewData(null)
                                            setSelectedFiles([])
                                            setPhase('form')
                                        }}
                                        className="w-full rounded-g-control bg-action-primary-bg py-4 text-sm font-bold text-fg-on-brand shadow-g-raised transition-all hover:bg-action-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
                                    >
                                        <span className="flex items-center justify-center gap-2">
                                            <UploadCloud className="w-5 h-5" />
                                            {reviewCopy.uploadAgain}
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => router.push('/wallet')}
                                        className="text-xs text-fg-secondary hover:text-fg-primary underline transition-colors mt-2"
                                    >
                                        {reviewCopy.skipForNow}
                                    </button>
                                </div>
                            </div>
                        ) : reviewData?.status === 'action_needed' ? (
                            /* ── Analysis Failed State ── */
                            <div className="space-y-6">
                                <div className="flex flex-col items-center gap-4 py-4">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-state-gap-fill">
                                        <AlertTriangle className="w-7 h-7 text-state-gap" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-semibold text-fg-primary">
                                            {blockedCopy.title}
                                        </p>
                                        <p className="mt-1 text-xs text-fg-secondary">
                                            {blockedCopy.hint}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            if (!createdPolicyId || retryingAnalysis) return
                                            setRetryingAnalysis(true)
                                            try {
                                                const result = await retryPolicyAnalysis(createdPolicyId)
                                                if ('error' in result) {
                                                    toast.error(mapWalletErrorToMessage(result.error, t, 'analysis'))
                                                    return
                                                }
                                                setReviewData(null)
                                                pollingStartRef.current = Date.now()
                                            } finally {
                                                setRetryingAnalysis(false)
                                            }
                                        }}
                                        disabled={retryingAnalysis}
                                        className="w-full rounded-g-control bg-action-primary-bg py-4 text-sm font-bold text-fg-on-brand shadow-g-raised transition-all hover:bg-action-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <span className="flex items-center justify-center gap-2">
                                            <RefreshCw className={`w-5 h-5 ${retryingAnalysis ? 'animate-spin' : ''}`} />
                                            {reviewCopy.tryAgain}
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => router.push(`/wallet/${createdPolicyId}/edit`)}
                                        className="w-full rounded-g-control border border-action-secondary-border py-3.5 text-sm font-bold text-fg-primary transition-colors hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                                    >
                                        <span className="flex items-center justify-center gap-2">
                                            <Pencil className="w-4 h-4" />
                                            {reviewCopy.edit}
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => router.push(createdPolicyId ? `/wallet/${createdPolicyId}` : '/wallet')}
                                        className="text-xs text-fg-secondary hover:text-fg-primary underline transition-colors mt-2"
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
                                            <Sparkles className="w-7 h-7 text-fg-brand animate-pulse" />
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-semibold text-fg-primary">
                                            {reviewCopy.analyzing}
                                        </p>
                                        <p className="mt-1 text-xs text-fg-secondary animate-pulse">
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
                                        onClick={() => router.push(createdPolicyId ? `/wallet/${createdPolicyId}` : '/wallet')}
                                        className="text-xs text-fg-secondary hover:text-fg-primary underline transition-colors"
                                    >
                                        {reviewCopy.skipForNow}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* ── Analysis complete — the extraction review is an
                                agent-only step, so the policyholder goes straight
                                to their policy page ── */
                            <div className="space-y-6">
                                <div className="flex flex-col items-center gap-4 py-4">
                                    <div className="w-16 h-16 rounded-full bg-primary-soft dark:bg-primary/15 flex items-center justify-center">
                                        <BadgeCheck className="w-7 h-7 text-fg-brand" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-semibold text-fg-primary">
                                            {reviewCopy.success}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => router.push(`/wallet/${createdPolicyId}`)}
                                    className="w-full rounded-g-control bg-action-primary-bg py-4 text-sm font-bold text-fg-on-brand shadow-g-raised transition-all hover:bg-action-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
                                >
                                    <span className="flex items-center justify-center gap-2">
                                        <Check className="w-5 h-5" />
                                        {reviewCopy.viewPolicy}
                                    </span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    // ────────────────────────────── UPLOAD FORM ──────────────────────────────
    return (
        <div className="pb-20">
            {/* Header */}
            <div className="border-b border-border-hair">
                <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        aria-label={t.common.back}
                        // min-h-11 min-w-11: p-2 around a w-5 icon is 36px wide, and
                        // the h-16 header stretched it to 36x44 — measured on
                        // /wallet/add at 320/390/430. Explicit, like MainNav's rows,
                        // so a padding change cannot silently sink it again.
                        className="grid min-h-11 min-w-11 place-items-center -ml-2 text-fg-secondary hover:text-fg-primary transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <span className="font-bold text-fg-primary">{t.wallet.addPolicy}</span>
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

                <UpgradeModal
                    isOpen={limitModalOpen}
                    onClose={() => setLimitModalOpen(false)}
                    featureKey="policy_upload_limit"
                    triggerSource="add_policy_limit"
                    returnTo="/wallet/add"
                />

                <form onSubmit={handleSubmit} className="space-y-8">

                    {/* File Upload Section */}
                    <div className="group relative overflow-hidden rounded-g-sheet border border-border-subtle bg-surface-raised p-6 shadow-g-raised md:p-8">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-primary-soft dark:bg-primary/15 rounded-xl flex items-center justify-center text-fg-brand">
                                    <UploadCloud className="w-5 h-5" />
                                </div>
                                {/* This is the page's primary heading in the state
                                    users actually land on — AddPolicyClient returns
                                    from several places and the sr-only headings added
                                    earlier both landed in a branch that never renders,
                                    so the route reported no <h1> at all. */}
                                <h1 className="text-xl font-black text-fg-primary">
                                    {t.wallet.uploadDocument}
                                </h1>
                            </div>

                            <UploadDropzone
                                onFiles={(files) => { setSelectedFiles(prev => [...prev, ...files]); setFieldErrors(prev => ({ ...prev, files: undefined })) }}
                                accept={acceptAttribute("policy")}
                                inputId="file-upload"
                                inputName="files"
                                title={t.wallet.tapToUpload}
                                hint={t.wallet.dragDrop}
                            />

                            {fieldErrors.files && (
                                <p id="add-policy-files-error" role="alert" className="mt-2 ml-1 text-xs font-semibold text-red-700 dark:text-red-400">
                                    {fieldErrors.files}
                                </p>
                            )}

                            {selectedFiles.length > 0 && (
                                <div className="mt-4 space-y-2">
                                    {selectedFiles.map((file, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-surface-sunken rounded-xl border border-border animate-in fade-in slide-in-from-bottom-2">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="w-8 h-8 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-rose-200 rounded-lg flex items-center justify-center flex-shrink-0">
                                                    <FileText className="w-4 h-4" />
                                                </div>
                                                <div className="truncate">
                                                    <p className="text-sm font-bold text-fg-primary truncate">{file.name}</p>
                                                    <p className="text-xs text-fg-secondary">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                                </div>
                                            </div>
                                            <button type="button" onClick={() => removeFile(idx)} aria-label={t.common.delete} className="p-2 text-fg-secondary hover:text-red-500 transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="mt-4 flex items-center gap-2 rounded-g-control border border-border-subtle bg-surface-wash p-3">
                                <Shield className="w-4 h-4 text-fg-brand" />
                                <p className="text-xs font-semibold text-fg-brand">
                                    {t.wallet.aiExtraction}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Manual Details */}
                    <div className="rounded-g-sheet border border-border-subtle bg-surface-raised p-6 shadow-g-raised md:p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-surface-sunken rounded-xl flex items-center justify-center text-fg-secondary">
                                <FileText className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-black text-fg-primary">
                                {t.wallet.policyDetails}
                            </h2>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Type - REQUIRED */}
                                <div className="space-y-2">
                                    <label htmlFor="add-lineOfBusiness" className="text-xs font-bold uppercase tracking-wider text-fg-primary ml-1 block">
                                        {t.wallet.coverageType} <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        id="add-lineOfBusiness"
                                        name="lineOfBusiness"
                                        required
                                        aria-invalid={fieldErrors.lineOfBusiness ? true : undefined}
                                        aria-describedby={fieldErrors.lineOfBusiness ? "add-lineOfBusiness-error" : undefined}
                                        onChange={() => setFieldErrors(prev => ({ ...prev, lineOfBusiness: undefined }))}
                                        className={`w-full appearance-none rounded-g-control border bg-surface-wash px-4 py-3.5 text-sm font-bold text-fg-primary transition-all focus:bg-surface-raised focus:ring-2 focus:ring-border-focus ${fieldErrors.lineOfBusiness ? "border-action-danger ring-2 ring-action-danger/40" : "border-border-subtle"}`}
                                    >
                                        <option value="">{t.wallet.selectTypePlaceholder}</option>
                                        {types.map(typeItem => (
                                            <option key={typeItem.id} value={typeItem.slug}>
                                                {t.policyTypes[typeItem.slug as keyof typeof t.policyTypes] || typeItem.name}
                                            </option>
                                        ))}
                                    </select>
                                    {fieldErrors.lineOfBusiness && (
                                        <p id="add-lineOfBusiness-error" role="alert" className="ml-1 text-xs font-semibold text-red-700 dark:text-red-400">
                                            {fieldErrors.lineOfBusiness}
                                        </p>
                                    )}
                                </div>

                                {/* Insurer - OPTIONAL */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center ml-1">
                                        <label htmlFor="add-insurerName" className="text-xs font-bold uppercase tracking-wider text-fg-secondary">
                                            {t.wallet.insurerProvider}
                                        </label>
                                        <span className="text-g-app-caption font-medium text-fg-secondary bg-surface-sunken px-2 py-0.5 rounded-full">{t.wallet.optional}</span>
                                    </div>
                                    <div className="relative">
                                        <select
                                            id="add-insurerName"
                                            name="insurerName"
                                            className="pw-input appearance-none"
                                        >
                                            <option value="">{t.wallet.selectOrEmpty}</option>
                                            {insurers.map(i => (
                                                <option key={i.id} value={i.name}>{i.name}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <Shield className="w-4 h-4 text-fg-secondary" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Policy Number - OPTIONAL */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center ml-1">
                                    <label htmlFor="add-policyNumber" className="text-xs font-bold uppercase tracking-wider text-fg-secondary">
                                        {t.wallet.policyNumber}
                                    </label>
                                    <span className="text-g-app-caption font-medium text-fg-secondary bg-surface-sunken px-2 py-0.5 rounded-full">{t.wallet.optional}</span>
                                </div>
                                <div className="relative">
                                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-secondary" />
                                    <Input
                                        id="add-policyNumber"
                                        type="text"
                                        name="policyNumber"
                                        placeholder={formCopy.policyNumberPlaceholder}
                                        className="pl-10 pr-4 pointer-events-auto"
                                    />
                                </div>
                            </div>

                            {/* Dates - OPTIONAL */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label htmlFor="add-startDate" className="ml-1 block text-g-app-caption font-semibold text-fg-secondary">{t.wallet.startDate}</label>
                                    <Input
                                        id="add-startDate"
                                        type="date"
                                        name="startDate"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="add-endDate" className="ml-1 block text-g-app-caption font-semibold text-fg-secondary">{t.wallet.endDate}</label>
                                    <Input
                                        id="add-endDate"
                                        type="date"
                                        name="endDate"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isPending}
                        className="w-full rounded-g-control bg-action-primary-bg py-4 text-sm font-bold text-fg-on-brand shadow-g-raised transition-all hover:bg-action-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 group relative overflow-hidden"
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

                    <p className="text-center text-xs text-fg-secondary">
                        {t.wallet.securityNote}
                    </p>
                </form>
            </div>
        </div>
    )
}
