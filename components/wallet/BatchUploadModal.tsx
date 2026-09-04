"use client"

import { useId, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AlertTriangle, Check, ChevronDown, Info, RotateCcw, Sparkles } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { normalizeBranch } from "@/lib/insurance/taxonomy"
import { getBranchIcon } from "@/lib/insurance/branch-icons"
import { formatCurrencyFull } from "@/lib/agent/format"
import { formatPolicyDate } from "@/lib/wallet/policy-detail"
import { UploadDropzone } from "@/components/ui/UploadDropzone"
import { UpgradeModal } from "@/components/monetization/UpgradeModal"
import { useDialog } from "@/hooks/useDialog"
import { acceptAttribute } from "@/lib/security/file-upload"
import {
    BATCH_UPLOAD_CONCURRENCY,
    BATCH_UPLOAD_MAX_FILES,
} from "@/lib/constants/time"
import {
    MAX_AUTO_RETRIES,
    autoRetryDelayMs,
    buildFailure,
    classifyExtractFailure,
    classifyThrownError,
    isBatchFailureCode,
    type BatchFailure,
} from "@/lib/wallet/batch-upload-errors"
import { displayInsurerName } from '@/lib/wallet/policy-identity'

/** Fields a row must carry before it can be saved. Mirrors the extract route. */
const REQUIRED_FIELDS = ["insurerName", "policyNumber", "startDate", "endDate"] as const
type RequiredField = (typeof REQUIRED_FIELDS)[number]

interface ExtractedData {
    insurerName: string
    policyNumber: string
    lineOfBusiness: string
    /** What the document called its line, when we could not place it. */
    declaredLineOfBusiness?: string
    startDate: string
    endDate: string
    premiumAmount?: number | null
    coverageSummary?: string | null
    /** From the AI classifier — recorded on the document, not guessed later. */
    documentKind?: string
    acordData?: unknown
    extractionMeta?: {
        overallConfidence?: number
        requiresReview?: boolean
        missingCriticalFields?: string[]
    }
}

interface BatchRow {
    id: string
    /** Kept so a failed document can be retried without re-picking it. */
    file: File
    fileName: string
    status: "processing" | "ready" | "failed"
    failure?: BatchFailure
    data?: ExtractedData
    notices: string[]
    detailsOpen: boolean
    /**
     * The document gate HELD the file rather than refusing it (a scan it could
     * not classify, a thin page). `resolvable` means re-sending the same file
     * with the person's confirmation may pass — the row offers that.
     */
    review?: { reasons: string[]; resolvable: boolean }
    /**
     * Set once the policy exists in the wallet.
     *
     * Its presence changes what "retry" means: the policy is already saved, so
     * a retry must re-send only the FILE. Without it, retrying a document
     * failure would create the policy a second time.
     */
    savedPolicyId?: string
}

interface BatchUploadModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
}

function missingFields(data?: ExtractedData): RequiredField[] {
    if (!data) return [...REQUIRED_FIELDS]
    return REQUIRED_FIELDS.filter((field) => !String(data[field] ?? "").trim())
}

/** Runs `worker` over `items` with at most `limit` in flight. */
async function runBounded<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
    let cursor = 0
    const lanes = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
        while (cursor < items.length) {
            const index = cursor
            cursor += 1
            await worker(items[index])
        }
    })
    await Promise.all(lanes)
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function BatchUploadModal({ isOpen, onClose, onSuccess }: BatchUploadModalProps) {
    const { t, language } = useLanguage()
    const copy = t.wallet.batchUpload
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [rows, setRows] = useState<BatchRow[]>([])
    const [isProcessing, setIsProcessing] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [showUpgrade, setShowUpgrade] = useState(false)
    // One id for the whole upload, sent with every extract call so a support
    // question about a batch can be answered from the logs as a batch.
    const batchIdRef = useRef<string>("")

    // Hooks must precede the early return below — rules-of-hooks.
    const dialogRef = useDialog<HTMLDivElement>(() => handleClose(), isOpen)
    const titleId = useId()

    if (!isOpen) return null

    const withVars = (template: string, vars: Record<string, string | number>) =>
        Object.entries(vars).reduce(
            (acc, [key, value]) => acc.replace(new RegExp(`\\{${key}\\}`, "g"), String(value)),
            template
        )

    const patchRow = (id: string, patch: Partial<BatchRow>) => {
        setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)))
    }

    /**
     * One document, start to finish.
     *
     * Every exit produces a structured failure. The old version threw
     * `new Error(response.statusText)` — empty on HTTP/2 — which is how a
     * throttle, an outage and a rejected file all became "saving failed".
     */
    const extractOne = async (row: BatchRow, attempt = 0, options: { branchConfirmed?: boolean } = {}): Promise<void> => {
        try {
            const formData = new FormData()
            formData.append("file", row.file)
            formData.append("extractOnly", "true")
            // The person read the gate's hold and confirmed this is their policy.
            if (options.branchConfirmed) formData.append("branchConfirmed", "true")

            const response = await fetch("/api/policies/extract", {
                method: "POST",
                headers: { "x-pw-batch-id": batchIdRef.current },
                body: formData,
            })

            const payload = await response.json().catch(() => null)

            if (!response.ok) {
                const failure = classifyExtractFailure({
                    status: response.status,
                    payload,
                    headers: response.headers,
                })

                if (failure.code === "POLICY_LIMIT_REACHED") setShowUpgrade(true)

                // A throttle is retried transparently: the capacity invariant
                // should mean it never fires, and if it ever does the batch
                // should get slower, not wrong.
                if (failure.autoRetry && attempt < MAX_AUTO_RETRIES) {
                    await sleep(autoRetryDelayMs(failure))
                    return extractOne(row, attempt + 1)
                }

                // A recoverable data-quality failure travels with everything the
                // document DID yield, so the user completes one field instead of
                // uploading the file again.
                const partial = payload && typeof payload === "object" ? (payload as any).partial : undefined
                const review = payload && typeof payload === "object" ? (payload as any).review : undefined
                patchRow(row.id, {
                    status: "failed",
                    failure,
                    data: partial ?? undefined,
                    notices: [],
                    review:
                        review && typeof review === "object"
                            ? { reasons: Array.isArray(review.reasons) ? review.reasons : [], resolvable: Boolean(review.resolvable) }
                            : undefined,
                })
                return
            }

            const data = (payload as any)?.data as ExtractedData | undefined
            if (!data) {
                patchRow(row.id, { status: "failed", failure: buildFailure("AI_EXTRACTION_FAILED") })
                return
            }

            const notices: string[] = Array.isArray((payload as any).notices) ? (payload as any).notices : []
            const gaps = missingFields(data)
            patchRow(row.id, {
                status: gaps.length > 0 ? "failed" : "ready",
                failure:
                    gaps.length > 0
                        ? buildFailure("REQUIRED_DATA_MISSING", { missingFields: gaps })
                        : undefined,
                data,
                notices,
            })
        } catch (error) {
            patchRow(row.id, { status: "failed", failure: classifyThrownError(error) })
        }
    }

    /**
     * Attaches a row's source file to the policy it became.
     *
     * Until this existed, a bulk-uploaded policy had NO document: the extract
     * route read the bytes, sent them to the model and dropped them, and
     * batch-create wrote a Policy row and nothing else. Seven policies in
     * production carry no source document because of it — the customer can
     * never reopen the PDF they uploaded.
     *
     * It reuses the existing per-policy documents endpoint rather than adding a
     * second upload path, which is also why nothing is ever orphaned: bytes are
     * only sent for a file that already has a policy to belong to.
     */
    const attachDocument = async (row: BatchRow, policyId: string): Promise<boolean> => {
        try {
            const formData = new FormData()
            formData.append("file", row.file)
            // The classifier already decided what this document is; passing it
            // through is what gives the record a real type instead of a guess
            // from the file extension.
            if (row.data?.documentKind) formData.append("documentKind", row.data.documentKind)

            const response = await fetch(`/api/v1/policies/${policyId}/documents`, {
                method: "POST",
                body: formData,
            })
            return response.ok
        } catch {
            return false
        }
    }

    const processRows = async (queue: BatchRow[]) => {
        setIsProcessing(true)
        await runBounded(queue, BATCH_UPLOAD_CONCURRENCY, (row) => extractOne(row))
        setIsProcessing(false)
    }

    const handleFiles = async (files: FileList | File[]) => {
        const incoming = Array.from(files)
        if (incoming.length === 0) return

        // Append, never replace. "Add more files" used to call setPolicies() with
        // only the new batch, destroying every result already on screen.
        const room = Math.max(0, BATCH_UPLOAD_MAX_FILES - rows.length)
        const accepted = incoming.slice(0, room)
        if (accepted.length === 0) return

        if (!batchIdRef.current) batchIdRef.current = crypto.randomUUID()

        const queued: BatchRow[] = accepted.map((file) => ({
            // Not just a React key: `handleRemove`, `patchRow` and the inline
            // field editors all match on this. A colliding draw edits the wrong
            // document — `Math.random().toString(36).substring(7)` collided about
            // once in 4,800.
            id: crypto.randomUUID(),
            file,
            fileName: file.name,
            status: "processing",
            notices: [],
            detailsOpen: false,
        }))

        setRows((prev) => [...prev, ...queued])
        await processRows(queued)
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) handleFiles(e.target.files)
        // Let the same file be re-picked after a removal.
        e.target.value = ""
    }

    const handleRemove = (id: string) => {
        setRows((prev) => prev.filter((row) => row.id !== id))
    }

    /** One retry, dispatched on what the row actually still owes. */
    const retryOne = async (row: BatchRow) => {
        if (row.savedPolicyId) {
            const ok = await attachDocument(row, row.savedPolicyId)
            if (ok) {
                setRows((prev) => prev.filter((r) => r.id !== row.id))
                router.refresh()
            } else {
                patchRow(row.id, { status: "failed", failure: buildFailure("DOCUMENT_UPLOAD_FAILED") })
            }
            return
        }
        await extractOne({ ...row, status: "processing" })
    }

    const handleRetry = async (id: string) => {
        const row = rows.find((r) => r.id === id)
        if (!row) return
        patchRow(id, { status: "processing", failure: undefined, detailsOpen: false })
        setIsProcessing(true)
        // The policy may already exist — retryOne re-sends only the file in that
        // case, so a retry never spends another AI call or duplicates the row.
        await retryOne({ ...row, status: "processing" })
        setIsProcessing(false)
    }

    const handleRetryAll = async () => {
        const retryable = rows.filter((row) => row.status === "failed" && row.failure?.retryable)
        if (retryable.length === 0) return
        setRows((prev) =>
            prev.map((row) =>
                retryable.some((r) => r.id === row.id)
                    ? { ...row, status: "processing", failure: undefined, detailsOpen: false }
                    : row
            )
        )
        setIsProcessing(true)
        await runBounded(
            retryable.map((row) => ({ ...row, status: "processing" as const })),
            BATCH_UPLOAD_CONCURRENCY,
            retryOne
        )
        setIsProcessing(false)
    }

    /** Inline completion of a field the extractor could not find. */
    const handleFieldChange = (id: string, field: RequiredField, value: string) => {
        setRows((prev) =>
            prev.map((row) => {
                if (row.id !== id || !row.data) return row
                const data = { ...row.data, [field]: value }
                const gaps = missingFields(data)
                const stillMissingData = row.failure?.code === "REQUIRED_DATA_MISSING"
                return {
                    ...row,
                    data,
                    // Only a data-quality failure is curable by typing. A
                    // duplicate or an unreadable file is not.
                    status: stillMissingData && gaps.length === 0 ? "ready" : row.status,
                    failure:
                        stillMissingData && gaps.length === 0
                            ? undefined
                            : stillMissingData
                                ? buildFailure("REQUIRED_DATA_MISSING", { missingFields: gaps })
                                : row.failure,
                }
            })
        )
    }

    const readyRows = rows.filter((row) => row.status === "ready" && row.data)
    const failedRows = rows.filter((row) => row.status === "failed")
    const processingRows = rows.filter((row) => row.status === "processing")
    const retryableCount = failedRows.filter((row) => row.failure?.retryable).length

    const handleSaveAll = async () => {
        if (readyRows.length === 0) {
            toast.error(copy.noValidPolicies)
            return
        }

        setIsSaving(true)

        try {
            const response = await fetch("/api/policies/batch-create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    batchId: batchIdRef.current || undefined,
                    policies: readyRows.map((row) => ({
                        insurerName: row.data!.insurerName,
                        policyNumber: row.data!.policyNumber,
                        lineOfBusiness: row.data!.lineOfBusiness,
                        startDate: row.data!.startDate,
                        endDate: row.data!.endDate,
                        premiumAmount: row.data!.premiumAmount,
                        coverageSummary: row.data!.coverageSummary,
                        acordData: row.data!.acordData,
                        extractionMeta: row.data!.extractionMeta,
                    })),
                }),
            })

            const result = await response.json().catch(() => null)

            if (!response.ok || !result) {
                const failure = classifyExtractFailure({
                    status: response.status,
                    payload: result,
                    headers: response.headers,
                })
                if (failure.code === "POLICY_LIMIT_REACHED") setShowUpgrade(true)
                toast.error(failureCopy(failure).title)
                return
            }

            // The server reports per-item outcomes by index into what we sent.
            // Mapping them back is what turns "4 failed" into four documents the
            // user can see and act on — a duplicate says so, and says so where
            // the duplicate is.
            const rejected = new Map<number, { code: string; context?: any }>()
            for (const item of (result.failedPolicies ?? []) as any[]) {
                if (typeof item?.index === "number") rejected.set(item.index, item)
            }

            // Attach each saved policy's source document. The policy already
            // exists at this point, so a failure here costs the FILE, never the
            // policy — which is why it gets its own code and its own retry.
            const createdEntries: Array<{ index: number; id: string }> = Array.isArray(result.created)
                ? result.created
                : []
            const attachFailures = new Set<string>()
            const policyIdByRow = new Map<string, string>()

            await runBounded(createdEntries, BATCH_UPLOAD_CONCURRENCY, async (entry) => {
                const row = readyRows[entry.index]
                if (!row) return
                policyIdByRow.set(row.id, entry.id)
                const ok = await attachDocument(row, entry.id)
                if (!ok) attachFailures.add(row.id)
            })

            const savedIds = new Set<string>()
            readyRows.forEach((row, index) => {
                if (!rejected.has(index) && !attachFailures.has(row.id)) savedIds.add(row.id)
            })

            setRows((prev) =>
                prev
                    // Fully saved rows leave the list; the user must never be
                    // shown a policy they already added as though it still
                    // needed action.
                    .filter((row) => !savedIds.has(row.id))
                    .map((row) => {
                        if (attachFailures.has(row.id)) {
                            return {
                                ...row,
                                status: "failed" as const,
                                savedPolicyId: policyIdByRow.get(row.id),
                                failure: buildFailure("DOCUMENT_UPLOAD_FAILED"),
                            }
                        }
                        const index = readyRows.findIndex((r) => r.id === row.id)
                        const rejection = index >= 0 ? rejected.get(index) : undefined
                        if (!rejection) return row
                        const code = isBatchFailureCode(rejection.code) ? rejection.code : "UNKNOWN_ERROR"
                        return {
                            ...row,
                            status: "failed" as const,
                            failure: buildFailure(code, rejection.context),
                        }
                    })
            )

            const created = result.count || 0
            if (created > 0) {
                const remaining =
                    (result.failedCount || 0) + failedRows.length + attachFailures.size
                toast.success(
                    remaining > 0
                        ? withVars(copy.savePartialSuccess, { count: created, failed: remaining })
                        : withVars(copy.saveSuccess, { count: created })
                )
                router.refresh()
                onSuccess?.()
                // Close only when nothing is left needing attention — otherwise
                // the failures the user still has to deal with vanish with it.
                if (remaining === 0) handleClose()
            } else if ((result.failedCount || 0) > 0) {
                toast.error(withVars(copy.saveNoneFailedValidation, { failed: result.failedCount }))
            } else {
                toast.error(copy.saveFailed)
            }
        } catch (error) {
            toast.error(failureCopy(classifyThrownError(error)).title)
        } finally {
            setIsSaving(false)
        }
    }

    const handleClose = () => {
        setRows([])
        setIsProcessing(false)
        batchIdRef.current = ""
        onClose()
    }

    /** Resolves a failure to its three-part copy, interpolating any context. */
    function failureCopy(failure: BatchFailure) {
        const entry = (copy.failures as Record<string, { title: string; detail: string; action: string }>)[
            failure.code
        ] ?? copy.failures.UNKNOWN_ERROR

        const kindLabel =
            failure.context?.documentKind
                ? (copy.documentKinds as Record<string, string>)[failure.context.documentKind] ??
                  copy.documentKinds.other
                : ""

        const fieldList = (failure.context?.missingFields ?? [])
            .map((field) => (copy.fieldNames as Record<string, string>)[field] ?? field)
            .join(", ")

        // The gate's branch verdicts name families as write-branch ids.
        const branchLabel = (id: string | undefined) =>
            id ? ((t.policyTypes as Record<string, string>)[id] ?? id) : ""
        const vars = {
            kind: kindLabel,
            fields: fieldList,
            detected: branchLabel(failure.context?.detectedBranch),
            declared: branchLabel(failure.context?.declaredBranch),
        }

        return {
            title: entry.title,
            detail: withVars(entry.detail, vars),
            action: withVars(entry.action, vars),
        }
    }

    /** The gate held the row; the person confirms and the same file is re-sent. */
    const handleConfirm = async (id: string) => {
        const row = rows.find((r) => r.id === id)
        if (!row) return
        patchRow(id, { status: "processing", failure: undefined, review: undefined, detailsOpen: false })
        setIsProcessing(true)
        await extractOne({ ...row, status: "processing" }, 0, { branchConfirmed: true })
        setIsProcessing(false)
    }

    const severityStyles: Record<string, string> = {
        error: "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10",
        warning: "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10",
        info: "border-border bg-muted/40",
        upgrade: "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10",
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
                    <p className="text-base text-muted-foreground font-medium">
                        {withVars(copy.subtitle, { max: BATCH_UPLOAD_MAX_FILES })}
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto p-8 pt-6">
                    {rows.length === 0 ? (
                        <UploadDropzone
                            onFiles={handleFiles}
                            accept={acceptAttribute("policy")}
                            inputId="batch-upload-file-input"
                            inputTestId="batch-upload-file-input"
                            title={copy.dropTitle}
                            hint={withVars(copy.dropSubtitle, { max: BATCH_UPLOAD_MAX_FILES })}
                            className="p-12"
                        />
                    ) : (
                        <div className="space-y-4">
                            {/* Announced to screen readers as counts change, so the
                                outcome of a batch is not sight-only. */}
                            <div
                                role="status"
                                aria-live="polite"
                                data-testid="batch-upload-summary"
                                className="flex flex-wrap items-center gap-3 mb-6"
                            >
                                {processingRows.length > 0 && (
                                    <span className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 rounded-full text-xs font-bold">
                                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        {processingRows.length} {copy.processing}
                                    </span>
                                )}
                                {readyRows.length > 0 && (
                                    <span className="flex items-center gap-2 px-3 py-1.5 bg-primary-soft dark:bg-primary/15 text-primary dark:text-mint rounded-full text-xs font-bold">
                                        <Check className="w-4 h-4" aria-hidden="true" />
                                        {readyRows.length} {copy.completed}
                                    </span>
                                )}
                                {failedRows.length > 0 && (
                                    <span className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 rounded-full text-xs font-bold">
                                        <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                                        {failedRows.length} {copy.needsReview}
                                    </span>
                                )}
                                {retryableCount > 0 && !isProcessing && (
                                    <button
                                        onClick={handleRetryAll}
                                        data-testid="batch-upload-retry-all"
                                        className="ml-auto inline-flex items-center gap-2 px-4 min-h-11 rounded-full border border-border text-xs font-bold text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                    >
                                        <RotateCcw className="w-4 h-4" aria-hidden="true" />
                                        {withVars(copy.retryAll, { count: retryableCount })}
                                    </button>
                                )}
                            </div>

                            <div className="space-y-3">
                                {rows.map((row) => {
                                    const branch = row.data ? normalizeBranch(row.data.lineOfBusiness) : null
                                    const BranchIcon = row.data ? getBranchIcon(row.data.lineOfBusiness) : null
                                    const failure = row.failure
                                    const text = failure ? failureCopy(failure) : null
                                    const gaps = failure?.code === "REQUIRED_DATA_MISSING"
                                        ? (failure.context?.missingFields ?? []) as RequiredField[]
                                        : []

                                    return (
                                    <div
                                        key={row.id}
                                        data-testid="batch-upload-row"
                                        data-status={row.status}
                                        data-code={failure?.code}
                                        className={`
                                            p-4 rounded-2xl border transition-all
                                            ${row.status === "processing"
                                                ? "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10"
                                                : row.status === "ready"
                                                    ? "border-primary-soft dark:border-primary/30 bg-primary-tint dark:bg-primary/10"
                                                    : severityStyles[failure?.severity ?? "error"]
                                            }
                                        `}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={`
                                                w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
                                                ${row.status === "processing" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200" : ""}
                                                ${row.status === "ready" ? "bg-primary-soft dark:bg-primary/15 text-primary dark:text-mint" : ""}
                                                ${row.status === "failed" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200" : ""}
                                            `}>
                                                {row.status === "processing" ? (
                                                    <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                ) : row.status === "ready" && BranchIcon ? (
                                                    <BranchIcon className="w-6 h-6" aria-hidden="true" />
                                                ) : (
                                                    <AlertTriangle className="w-6 h-6" aria-hidden="true" />
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2 mb-1">
                                                    <span
                                                        className="text-xs font-mono text-muted-foreground truncate"
                                                        title={row.fileName}
                                                    >
                                                        {row.fileName}
                                                    </span>
                                                    <button
                                                        onClick={() => handleRemove(row.id)}
                                                        aria-label={`${t.common.delete}: ${row.fileName}`}
                                                        className="flex items-center justify-center w-11 h-11 -mt-3 -mr-2 shrink-0 hover:bg-muted rounded-xl text-muted-foreground hover:text-red-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>

                                                {row.status === "processing" && (
                                                    <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">{copy.analyzing}</p>
                                                )}

                                                {row.status === "failed" && text && (
                                                    <div className="space-y-2">
                                                        {/* The severity is stated in words, never by colour
                                                            alone — WCAG 1.4.1, and the whole point of this
                                                            screen is that it explains itself. */}
                                                        <p className="text-sm font-bold text-foreground">
                                                            <span className="sr-only">{copy.problemLabel}: </span>
                                                            {text.title}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">{text.detail}</p>

                                                        <div className="flex flex-wrap items-center gap-2 pt-1">
                                                            <button
                                                                onClick={() => patchRow(row.id, { detailsOpen: !row.detailsOpen })}
                                                                aria-expanded={row.detailsOpen}
                                                                data-testid="batch-upload-why"
                                                                className="inline-flex items-center gap-1.5 px-3 min-h-11 rounded-full border border-border text-xs font-bold text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                                            >
                                                                <ChevronDown
                                                                    className={`w-3.5 h-3.5 transition-transform ${row.detailsOpen ? "rotate-180" : ""}`}
                                                                    aria-hidden="true"
                                                                />
                                                                {row.detailsOpen ? copy.hideDetails : copy.whyItFailed}
                                                            </button>
                                                            {row.review?.resolvable && (
                                                                <button
                                                                    onClick={() => handleConfirm(row.id)}
                                                                    disabled={isProcessing}
                                                                    data-testid="batch-upload-confirm"
                                                                    className="inline-flex items-center gap-1.5 px-3 min-h-11 rounded-full border border-border text-xs font-bold text-foreground hover:bg-muted transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                                                >
                                                                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                                                                    {copy.confirmAndContinue}
                                                                </button>
                                                            )}
                                                            {failure?.retryable && (
                                                                <button
                                                                    onClick={() => handleRetry(row.id)}
                                                                    disabled={isProcessing}
                                                                    data-testid="batch-upload-retry"
                                                                    className="inline-flex items-center gap-1.5 px-3 min-h-11 rounded-full border border-border text-xs font-bold text-foreground hover:bg-muted transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                                                >
                                                                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                                                                    {copy.retry}
                                                                </button>
                                                            )}
                                                        </div>

                                                        {row.detailsOpen && (
                                                            <div className="mt-2 p-3 rounded-xl bg-muted/60 space-y-1.5 text-xs">
                                                                <p className="text-foreground">
                                                                    <span className="font-bold">{copy.whatToDo}: </span>
                                                                    {text.action}
                                                                </p>
                                                                <p className="text-muted-foreground">
                                                                    <span className="font-bold">{copy.stageLabel}: </span>
                                                                    {(copy.stages as Record<string, string>)[failure!.stage] ?? failure!.stage}
                                                                </p>
                                                                {failure?.context?.correlationId && (
                                                                    <p className="text-muted-foreground font-mono break-all">
                                                                        <span className="font-bold font-sans">{copy.referenceLabel}: </span>
                                                                        {failure.context.correlationId}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )}

                                                        {gaps.length > 0 && row.data && (
                                                            <div className="mt-2 space-y-2">
                                                                <p className="text-xs font-bold text-foreground">{copy.completeFields}</p>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    {gaps.map((field) => (
                                                                        <label key={field} className="text-xs">
                                                                            <span className="text-muted-foreground">
                                                                                {(copy.fieldNames as Record<string, string>)[field]}
                                                                            </span>
                                                                            <input
                                                                                type={field.endsWith("Date") ? "date" : "text"}
                                                                                value={String(row.data?.[field] ?? "")}
                                                                                onChange={(e) => handleFieldChange(row.id, field, e.target.value)}
                                                                                data-testid={`batch-upload-fix-${field}`}
                                                                                className="pw-input border-b w-full mt-0.5"
                                                                            />
                                                                        </label>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {row.status === "ready" && row.data && (
                                                    <div className="space-y-2">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="text-sm font-bold text-foreground">{displayInsurerName(row.data.insurerName, branch!.label[language])}</span>
                                                            <span className="px-2 py-0.5 bg-muted rounded text-xs font-medium text-muted-foreground capitalize">
                                                                {t.policyTypes?.[row.data.lineOfBusiness as keyof typeof t.policyTypes] || branch!.label[language]}
                                                            </span>
                                                            {row.data.extractionMeta?.requiresReview && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300">
                                                                    <Info className="w-3 h-3" aria-hidden="true" />
                                                                    {copy.reviewNeededBadge}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {row.notices.includes("NEW_LINE_OF_BUSINESS") && (
                                                            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                                                <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
                                                                <span>
                                                                    <span className="font-bold text-foreground">{copy.newLineOfBusiness}
                                                                        {row.data.declaredLineOfBusiness ? ` — ${row.data.declaredLineOfBusiness}` : ""}. </span>
                                                                    {copy.newLineOfBusinessHint}
                                                                </span>
                                                            </p>
                                                        )}
                                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                                            <div>
                                                                <span className="text-muted-foreground">{copy.policyNumberLabel}: </span>
                                                                <input
                                                                    type="text"
                                                                    aria-label={copy.policyNumberLabel}
                                                                    value={row.data.policyNumber}
                                                                    onChange={(e) => handleFieldChange(row.id, "policyNumber", e.target.value)}
                                                                    className="pw-input border-b w-32"
                                                                />
                                                            </div>
                                                            <div>
                                                                <span className="text-muted-foreground">{copy.premiumLabel}: </span>
                                                                <span className="text-foreground">{row.data.premiumAmount ? formatCurrencyFull(row.data.premiumAmount, language === "el" ? "el" : "en") : "—"}</span>
                                                            </div>
                                                            <div className="col-span-2">
                                                                <span className="text-muted-foreground">{copy.periodLabel}: </span>
                                                                <span className="text-foreground">{formatPolicyDate(row.data.startDate, language === "el" ? "el-GR" : "en-GB")} → {formatPolicyDate(row.data.endDate, language === "el" ? "el-GR" : "en-GB")}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    )
                                })}
                            </div>

                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept={acceptAttribute("policy")}
                                className="hidden"
                                data-testid="batch-upload-more-input"
                                onChange={handleFileSelect}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isProcessing || rows.length >= BATCH_UPLOAD_MAX_FILES}
                                data-testid="batch-upload-add-more"
                                className="w-full py-4 border-2 border-dashed border-border rounded-2xl text-muted-foreground hover:text-primary dark:hover:text-mint hover:border-primary transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                            >
                                + {copy.addMoreFiles}
                            </button>
                        </div>
                    )}
                </div>

                <div className="p-8 pt-0 space-y-3">
                    {rows.length > 0 && (readyRows.length > 0 || failedRows.length > 0) && (
                        <p className="text-sm text-muted-foreground" data-testid="batch-upload-footer-summary">
                            {readyRows.length > 0 && withVars(copy.summaryReady, { count: readyRows.length })}
                            {readyRows.length > 0 && failedRows.length > 0 && " "}
                            {failedRows.length > 0 && withVars(copy.summaryNeedsReview, { count: failedRows.length })}
                        </p>
                    )}
                    <div className="flex gap-4">
                        <button
                            onClick={handleClose}
                            className="flex-1 px-8 py-5 bg-muted text-foreground rounded-3xl text-kicker font-black uppercase tracking-widest hover:bg-muted/70 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        >
                            {copy.cancel}
                        </button>
                        {readyRows.length > 0 && (
                            <button
                                onClick={handleSaveAll}
                                disabled={isSaving || isProcessing}
                                data-testid="batch-upload-save-all"
                                className="pw-primary-button flex-[2] text-kicker uppercase tracking-widest shadow-primary/20"
                            >
                                {isSaving ? copy.saving : withVars(copy.addPolicies, { count: readyRows.length })}
                            </button>
                        )}
                    </div>
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
