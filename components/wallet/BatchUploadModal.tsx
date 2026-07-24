"use client"

import { useId, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useLanguage } from "@/contexts/LanguageContext"
import { formatCurrencyFull } from "@/lib/agent/format"
import { mapWalletErrorToMessage } from "@/lib/i18n/wallet-error"
import { UploadDropzone } from "@/components/ui/UploadDropzone"
import { UpgradeModal } from "@/components/monetization/UpgradeModal"
import { useDialog } from "@/hooks/useDialog"
import { acceptAttribute } from "@/lib/security/file-upload"

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
        acordData?: unknown
        extractionMeta?: {
            overallConfidence?: number
            requiresReview?: boolean
            missingCriticalFields?: string[]
        }
    }
}

interface BatchUploadModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
}

export function BatchUploadModal({ isOpen, onClose, onSuccess }: BatchUploadModalProps) {
    const { t, language } = useLanguage()
    const copy = t.wallet.batchUpload
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [policies, setPolicies] = useState<ExtractedPolicy[]>([])
    const [isProcessing, setIsProcessing] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [showUpgrade, setShowUpgrade] = useState(false)

    // Hooks must precede the early return below — rules-of-hooks.
    const dialogRef = useDialog<HTMLDivElement>(() => handleClose(), isOpen)
    const titleId = useId()

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

            const result = await response.json().catch(() => ({} as any))

            if (!response.ok) {
                // Free/Starter hit their policy cap — the extract endpoint blocks
                // the paid AI parse. Surface the upgrade modal once instead of a
                // generic per-file error.
                if (response.status === 403 && result?.code === "POLICY_LIMIT_REACHED") {
                    setShowUpgrade(true)
                    return {
                        id,
                        fileName: file.name,
                        status: "error",
                        error: mapWalletErrorToMessage("POLICY_LIMIT_REACHED", t, "batchUpload"),
                    }
                }
                throw new Error(response.statusText || "BATCH_EXTRACT_FAILED")
            }

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
                    policies: successPolicies.map((p) => ({
                        insurerName: p.data!.insurerName,
                        policyNumber: p.data!.policyNumber,
                        lineOfBusiness: p.data!.lineOfBusiness,
                        startDate: p.data!.startDate,
                        endDate: p.data!.endDate,
                        premiumAmount: p.data!.premiumAmount,
                        coverageSummary: p.data!.coverageSummary,
                        acordData: p.data!.acordData,
                        extractionMeta: p.data!.extractionMeta,
                    })),
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
        <>
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

            <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} data-testid="batch-upload-modal" className="relative w-full max-w-3xl bg-card rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
                <div className="p-8 pb-0">
                    <div className="flex items-center gap-3 mb-4 text-primary dark:text-mint">
                        <div className="w-8 h-8 rounded-xl bg-primary-soft dark:bg-primary/15 flex items-center justify-center">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                        </div>
                        <span className="text-kicker font-black uppercase tracking-[0.2em]">{copy.badge}</span>
                    </div>
                    <h2 id={titleId} className="text-3xl font-black text-foreground tracking-tighter mb-2">{copy.title}</h2>
                    <p className="text-base text-muted-foreground font-medium">{copy.subtitle}</p>
                </div>

                <div className="flex-1 overflow-y-auto p-8 pt-6">
                    {policies.length === 0 ? (
                        <UploadDropzone
                            onFiles={handleFiles}
                            accept={acceptAttribute("policy")}
                            inputId="batch-upload-file-input"
                            inputTestId="batch-upload-file-input"
                            title={copy.dropTitle}
                            hint={copy.dropSubtitle}
                            className="p-12"
                        />
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
                                    <span className="flex items-center gap-2 px-3 py-1.5 bg-primary-soft dark:bg-primary/15 text-primary dark:text-mint rounded-full text-xs font-bold">
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
                                                    ? "border-primary-soft dark:border-primary/30 bg-primary-tint dark:bg-primary/10"
                                                    : "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10"
                                            }
                                        `}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={`
                                                w-12 h-12 rounded-xl flex items-center justify-center text-xs font-black tracking-widest flex-shrink-0
                                                ${policy.status === "processing" ? "bg-amber-100 dark:bg-amber-900/30" : ""}
                                                ${policy.status === "success" ? "bg-primary-soft dark:bg-primary/15" : ""}
                                                ${policy.status === "error" ? "bg-red-100 dark:bg-red-900/30" : ""}
                                            `}>
                                                {policy.status === "processing"
                                                    ? (
                                                        <svg className="w-6 h-6 text-amber-700 animate-spin" fill="none" viewBox="0 0 24 24">
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
                                                    <span className="text-xs font-mono text-muted-foreground truncate">{policy.fileName}</span>
                                                    <button
                                                        onClick={() => handleRemove(policy.id)}
                                                        aria-label={t.common.delete}
                                                        className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-red-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>

                                                {policy.status === "processing" && (
                                                    <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">{copy.analyzing}</p>
                                                )}

                                                {policy.status === "error" && (
                                                    <p className="text-sm text-red-700 dark:text-red-400">{policy.error || copy.extractionFailed}</p>
                                                )}

                                                {policy.status === "success" && policy.data && (
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-bold text-foreground">{policy.data.insurerName}</span>
                                                            <span className="px-2 py-0.5 bg-muted rounded text-xs font-medium text-muted-foreground capitalize">
                                                                {t.policyTypes?.[policy.data.lineOfBusiness as keyof typeof t.policyTypes] || policy.data.lineOfBusiness}
                                                            </span>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                                            <div>
                                                                <span className="text-muted-foreground">{copy.policyNumberLabel}: </span>
                                                                <input
                                                                    type="text"
                                                                    aria-label={copy.policyNumberLabel}
                                                                    value={policy.data.policyNumber}
                                                                    onChange={(e) => handleUpdatePolicy(policy.id, "policyNumber", e.target.value)}
                                                                    className="pw-input border-b w-32"
                                                                />
                                                            </div>
                                                            <div>
                                                                <span className="text-muted-foreground">{copy.premiumLabel}: </span>
                                                                <span className="text-foreground">{policy.data.premiumAmount ? formatCurrencyFull(policy.data.premiumAmount, language === "el" ? "el" : "en") : "—"}</span>
                                                            </div>
                                                            <div className="col-span-2">
                                                                <span className="text-muted-foreground">{copy.periodLabel}: </span>
                                                                <span className="text-foreground">{policy.data.startDate} → {policy.data.endDate}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept={acceptAttribute("policy")}
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isProcessing}
                                data-testid="batch-upload-add-more"
                                className="w-full py-4 border-2 border-dashed border-border rounded-2xl text-muted-foreground hover:text-primary dark:hover:text-mint hover:border-primary transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                            >
                                + {copy.addMoreFiles}
                            </button>
                        </div>
                    )}
                </div>

                <div className="p-8 pt-0 flex gap-4">
                    <button
                        onClick={handleClose}
                        className="flex-1 px-8 py-5 bg-muted text-foreground rounded-[24px] text-kicker font-black uppercase tracking-widest hover:bg-muted/70 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                        {copy.cancel}
                    </button>
                    {policies.length > 0 && successCount > 0 && (
                        <button
                            onClick={handleSaveAll}
                            disabled={isSaving || isProcessing}
                            data-testid="batch-upload-save-all"
                            className="pw-primary-button flex-[2] text-kicker uppercase tracking-widest shadow-primary/20"
                        >
                            {isSaving ? copy.saving : withVars(copy.savePolicies, { count: successCount })}
                        </button>
                    )}
                </div>
            </div>
        </div>
        {showUpgrade && (
            /* relative z-[110] beats the batch modal's z-[100] so the (z-50) UpgradeModal paints on top */
            <div className="relative z-[110]">
                <UpgradeModal
                    isOpen={showUpgrade}
                    onClose={() => setShowUpgrade(false)}
                    featureKey="policy_upload_limit"
                    triggerSource="batch_upload_limit"
                    returnTo="/wallet"
                />
            </div>
        )}
        </>
    )
}
