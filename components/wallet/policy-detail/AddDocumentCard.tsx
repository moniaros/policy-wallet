"use client"

import { useId, useState } from "react"
import { useRouter } from "next/navigation"
import { FilePlus2, RefreshCw } from "lucide-react"

import { UploadDropzone } from "@/components/ui/UploadDropzone"
import {
    acceptAttribute,
    preflightUploadSize,
    MAX_UPLOAD_SIZE_BYTES,
} from "@/lib/security/file-upload"
import { uploadRejectionMessage } from "@/lib/i18n/upload-errors"
import type { DocumentKind } from "@/lib/services/ai/document-kind"

/**
 * The kinds a customer may DECLARE when attaching an extra document by hand.
 * A subset of DOCUMENT_KINDS (type-checked against it): `policy_schedule`
 * stays out because a schedule is a new policy or a review case, not a
 * side-attachment, and `renewal_notice` has its own entry point below with
 * the analysis re-run that a renewal actually needs. The server validates the
 * value against the full closed vocabulary regardless.
 */
const ATTACHABLE_KINDS: readonly DocumentKind[] = [
    "terms_and_conditions",
    "certificate",
    "invoice",
    "other",
]

interface AddDocumentCardProps {
    policyId: string
    /**
     * The SERVER's verdict from resolvePolicyLifecycle — status, expiry and
     * countdown come from that one call. This component must never re-derive
     * a day count from `Date.now()`: a client recomputation disagrees with
     * the chip beside it around Athens midnight.
     */
    lifecycleStatus?: string | null
    /** Full translations tree — uploadRejectionMessage reads t.uploadRejection. */
    t: any
    copy: {
        title: string
        /** TRUTH LINE: stored for reference, NOT analysed. Nothing reads a
            document attached through the REST route, so no copy here may
            imply work-in-progress on its contents. */
        note: string
        kindLabel: string
        /** Keyed by DocumentKind — the same labels DocumentsCard shows, so the
            choice made here matches the label the stored row gets. */
        kindLabels: Record<string, string>
        dropTitle: string
        /** Carries {maxMb}; resolved below from the shared constant. */
        dropHint: string
        uploading: string
        stored: string
        failed: string
        limitReached: string
        renewalTitle: string
        renewalNote: string
        renewalDropTitle: string
        renewalUploading: string
        renewalUploaded: string
        renewalFailed: string
    }
}

/**
 * «Προσθήκη εγγράφου» — attach an extra document to a policy the customer
 * already holds. Lives INSIDE <section id="documents"> beside DocumentsCard,
 * so it costs nothing against the page's 8-grouping budget.
 *
 * Two entry points, two server paths, two different truths:
 *
 *  - The always-available picker posts to POST /api/v1/policies/[id]/documents.
 *    That route stores the file and runs NO analysis, so every string on this
 *    arm says "stored for reference" and the success message says the document
 *    was NOT analysed — matching the register of
 *    lib/services/ai/document-kind.ts's "stored but not analysed as a policy".
 *
 *  - The renewal arm renders only when the server-resolved lifecycle says
 *    `expired` / `expiring_soon`, and calls the addRenewalDocument server
 *    action — which re-runs the analysis over the merged view, so ITS copy is
 *    allowed to say the analysis is running again.
 *
 * The customer's file name is read nowhere: the File object goes into a
 * FormData whole, the server generates the stored label, and this component
 * renders no name, before or after upload.
 */
export function AddDocumentCard({ policyId, lifecycleStatus, t, copy }: AddDocumentCardProps) {
    const router = useRouter()
    const kindSelectId = useId()

    const [kind, setKind] = useState<DocumentKind>("other")
    const [busy, setBusy] = useState<null | "attach" | "renewal">(null)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    // Renders only on the server's word — never on a recomputed day count.
    const showRenewalEntry = lifecycleStatus === "expired" || lifecycleStatus === "expiring_soon"

    const maxMb = String(Math.floor(MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)))
    const dropHint = copy.dropHint.replace("{maxMb}", maxMb)

    /** Shared pre-flight: reject an empty/oversized file before any bytes move. */
    const preflight = (file: File): boolean => {
        const reason = preflightUploadSize(file.size)
        if (reason) {
            setSuccess(null)
            setError(uploadRejectionMessage(t, reason))
            return false
        }
        return true
    }

    /** Entry point 1 — store a reference document. NO analysis runs. */
    const handleAttachFiles = async (files: File[]) => {
        const file = files[0]
        if (!file || busy) return
        if (!preflight(file)) return

        setBusy("attach")
        setError(null)
        setSuccess(null)
        try {
            const formData = new FormData()
            formData.append("file", file)
            formData.append("documentKind", kind)

            const response = await fetch(`/api/v1/policies/${policyId}/documents`, {
                method: "POST",
                body: formData,
            })

            if (response.ok) {
                // Truthful: stored, not analysed. DocumentsCard re-reads on refresh.
                setSuccess(copy.stored)
                router.refresh()
                return
            }

            let reason: string | null = null
            try {
                const payload = await response.json()
                reason = payload?.error?.details?.reason ?? null
            } catch {
                reason = null
            }
            if (reason === "document_limit") {
                setError(copy.limitReached)
            } else {
                // The shared localised rejection copy; the generic failure
                // message only when the server sent no machine-readable reason.
                setError(uploadRejectionMessage(t, reason, copy.failed))
            }
        } catch {
            setError(copy.failed)
        } finally {
            setBusy(null)
        }
    }

    /** Entry point 2 — renewal notice. This one DOES re-run the analysis. */
    const handleRenewalFiles = async (files: File[]) => {
        const file = files[0]
        if (!file || busy) return
        if (!preflight(file)) return

        setBusy("renewal")
        setError(null)
        setSuccess(null)
        try {
            // Dynamic import keeps the "use server" module out of the static
            // client graph (the pattern the rest of this page uses).
            const { addRenewalDocument } = await import("@/app/(protected)/wallet/actions")
            const formData = new FormData()
            formData.append("file", file)

            const result = await addRenewalDocument(policyId, formData)
            if (result?.error) {
                setError(copy.renewalFailed)
                return
            }
            setSuccess(copy.renewalUploaded)
            router.refresh()
        } catch {
            setError(copy.renewalFailed)
        } finally {
            setBusy(null)
        }
    }

    return (
        <div className="rounded-g-card bg-surface-raised p-g-5 shadow-g-raised">
            <h3 className="mb-2 flex items-center gap-2 text-g-app-body-sm font-semibold text-fg-secondary">
                <FilePlus2 className="h-4 w-4 text-fg-brand" />
                {copy.title}
            </h3>
            {/* The truth constraint, stated before the picker: stored for
                reference — nothing will read it. */}
            <p className="mb-4 text-g-app-caption leading-relaxed text-fg-secondary">{copy.note}</p>

            <label
                htmlFor={kindSelectId}
                className="mb-1 block text-g-app-caption font-semibold text-fg-secondary"
            >
                {copy.kindLabel}
            </label>
            <select
                id={kindSelectId}
                value={kind}
                disabled={busy !== null}
                onChange={(e) => setKind(e.target.value as DocumentKind)}
                className="mb-4 block w-full rounded-g-control border border-border-strong bg-surface-raised px-3 py-2.5 text-g-app-body-sm text-fg-primary"
            >
                {ATTACHABLE_KINDS.map((k) => (
                    <option key={k} value={k}>
                        {copy.kindLabels[k]}
                    </option>
                ))}
            </select>

            <UploadDropzone
                onFiles={handleAttachFiles}
                accept={acceptAttribute("policy")}
                multiple={false}
                inputId={`add-document-${policyId}`}
                inputTestId="add-document-input"
                title={copy.dropTitle}
                hint={dropHint}
            />
            {busy === "attach" && (
                <p role="status" className="mt-3 text-g-app-body-sm text-fg-secondary">
                    {copy.uploading}
                </p>
            )}

            {showRenewalEntry && (
                <div className="mt-6 border-t border-border-hair pt-5">
                    <h4 className="mb-2 flex items-center gap-2 text-g-app-body-sm font-semibold text-fg-secondary">
                        <RefreshCw className="h-4 w-4 text-fg-brand" />
                        {copy.renewalTitle}
                    </h4>
                    {/* This path re-runs the analysis, so the copy may say so. */}
                    <p className="mb-4 text-g-app-caption leading-relaxed text-fg-secondary">
                        {copy.renewalNote}
                    </p>
                    <UploadDropzone
                        onFiles={handleRenewalFiles}
                        accept={acceptAttribute("policy")}
                        multiple={false}
                        inputId={`add-renewal-${policyId}`}
                        inputTestId="add-renewal-input"
                        title={copy.renewalDropTitle}
                        hint={dropHint}
                    />
                    {busy === "renewal" && (
                        <p role="status" className="mt-3 text-g-app-body-sm text-fg-secondary">
                            {copy.renewalUploading}
                        </p>
                    )}
                </div>
            )}

            {error && (
                <p role="alert" className="mt-4 text-g-app-body-sm font-medium text-action-danger">
                    {error}
                </p>
            )}
            {success && (
                <p role="status" className="mt-4 text-g-app-body-sm font-medium text-fg-brand">
                    {success}
                </p>
            )}
        </div>
    )
}
