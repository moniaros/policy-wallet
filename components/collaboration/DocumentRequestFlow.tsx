"use client"

import React, { useState, useRef } from "react"
import {
    Upload,
    Send,
    Camera,
    FileText,
    CheckCircle2,
    Clock,
    AlertTriangle,
    X,
    ChevronDown,
} from "lucide-react"
import { BrandCard } from "@/components/ui/brand/BrandCard"
import { BrandActionButton } from "@/components/ui/brand/BrandActionButton"
import { Skeleton } from "@/components/ui/skeleton"
import { useLanguage } from "@/contexts/LanguageContext"
import { formatDateShort } from "@/lib/agent/format"
import { DOCUMENT_TYPE_TAXONOMY } from "./types"
import type { DocumentRequestData, DocumentUrgency, DocumentTypeKey, ViewerRole } from "./types"
import { acceptAttribute } from "@/lib/security/file-upload"

// ── Agent: Create Document Request ────────────────────────────────────

interface DocumentRequestCreateProps {
    clientName: string
    onSend: (data: {
        documentType: DocumentTypeKey
        instruction: string
        urgency: DocumentUrgency
        dueDate?: string
    }) => void
    onCancel?: () => void
    isSending?: boolean
}

export function DocumentRequestCreate({ clientName, onSend, onCancel, isSending }: DocumentRequestCreateProps) {
    const { language, t } = useLanguage()
    const [documentType, setDocumentType] = useState<DocumentTypeKey>("id_card")
    const [instruction, setInstruction] = useState("")
    const [urgency, setUrgency] = useState<DocumentUrgency>("normal")
    const [dueDate, setDueDate] = useState("")

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSend({
            documentType,
            instruction,
            urgency,
            dueDate: dueDate || undefined,
        })
    }

    return (
        <BrandCard className="p-5">
            <h3 className="text-base font-bold text-foreground mb-1">
                {t.collaboration.documentRequests.requestDocument}
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                {t.collaboration.documentRequests.sendRequestTo.replace("{name}", clientName)}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Document type */}
                <div>
                    <label htmlFor="documentrequestflow-f1" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        {t.collaboration.documentRequests.documentType}
                    </label>
                    <select id="documentrequestflow-f1"
                        value={documentType}
                        onChange={(e) => setDocumentType(e.target.value as DocumentTypeKey)}
                        className="pw-input pw-input-sm"
                    >
                        {Object.entries(DOCUMENT_TYPE_TAXONOMY).map(([key, labels]) => (
                            <option key={key} value={key}>
                                {language === "el" ? labels.el : labels.en}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Instruction */}
                <div>
                    <label htmlFor="documentrequestflow-f2" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        {t.collaboration.documentRequests.instructions}
                    </label>
                    <textarea id="documentrequestflow-f2"
                        value={instruction}
                        onChange={(e) => setInstruction(e.target.value)}
                        rows={2}
                        placeholder={t.collaboration.documentRequests.instructionsPlaceholder}
                        className="pw-input pw-input-sm resize-none"
                    />
                </div>

                {/* Urgency + Due date */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label htmlFor="documentrequestflow-f3" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                            {t.collaboration.documentRequests.urgency}
                        </label>
                        <select id="documentrequestflow-f3"
                            value={urgency}
                            onChange={(e) => setUrgency(e.target.value as DocumentUrgency)}
                            className="pw-input pw-input-sm"
                        >
                            <option value="low">{t.collaboration.documentRequests.urgencyLow}</option>
                            <option value="normal">{t.collaboration.documentRequests.urgencyNormal}</option>
                            <option value="urgent">{t.collaboration.documentRequests.urgent}</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="documentrequestflow-f4" className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                            {t.collaboration.documentRequests.dueDate}
                        </label>
                        <input id="documentrequestflow-f4"
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="pw-input pw-input-sm"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-2">
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition cursor-pointer"
                        >
                            {t.collaboration.documentRequests.cancel}
                        </button>
                    )}
                    <BrandActionButton type="submit" disabled={isSending} className="text-sm">
                        <Send className="h-4 w-4" />
                        {isSending
                            ? t.collaboration.documentRequests.sending
                            : t.collaboration.documentRequests.sendRequest}
                    </BrandActionButton>
                </div>
            </form>
        </BrandCard>
    )
}

// ── Client: Respond to Document Request ───────────────────────────────

interface DocumentRequestRespondProps {
    request: DocumentRequestData
    agentName: string
    onUpload: (requestId: string, file: File) => Promise<boolean>
    isUploading?: boolean
}

export function DocumentRequestRespond({ request, agentName, onUpload, isUploading }: DocumentRequestRespondProps) {
    const { language, t } = useLanguage()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [uploaded, setUploaded] = useState(request.status === "uploaded")
    const [error, setError] = useState<string | null>(null)

    const docLabel = DOCUMENT_TYPE_TAXONOMY[request.documentType as DocumentTypeKey]
    const docName = docLabel
        ? (language === "el" ? docLabel.el : docLabel.en)
        : request.documentType

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setError(null)
            const success = await onUpload(request.id, file).catch(() => false)
            if (success) {
                setUploaded(true)
            } else {
                setError(
                    language === "el"
                        ? "Η μεταφόρτωση απέτυχε. Παρακαλώ δοκιμάστε ξανά."
                        : "Upload failed. Please try again."
                )
                if (fileInputRef.current) {
                    fileInputRef.current.value = ""
                }
            }
        }
    }

    const urgencyStyles: Record<DocumentUrgency, string> = {
        low: "border-blue-200 bg-blue-50/50 dark:border-blue-800/50 dark:bg-blue-950/20",
        normal: "border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800",
        urgent: "border-red-200 bg-red-50/50 dark:border-red-800/50 dark:bg-red-950/20",
    }

    if (uploaded) {
        return (
            <BrandCard className="p-5">
                <div className="flex flex-col items-center text-center py-4">
                    <CheckCircle2 className="h-10 w-10 text-[#22C55E] mb-3" />
                    <p className="text-sm font-medium text-foreground">
                        {t.collaboration.documentRequests.documentUploaded}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                        {language === "el"
                            ? `${agentName} θα λάβει ειδοποίηση`
                            : `${agentName} will be notified`}
                    </p>
                </div>
            </BrandCard>
        )
    }

    return (
        <BrandCard className={`p-5 border ${urgencyStyles[request.urgency]}`}>
            {/* Urgency badge */}
            {request.urgency === "urgent" && (
                <div className="flex items-center gap-1.5 mb-3">
                    <AlertTriangle className="h-4 w-4 text-red-700" />
                    <span className="text-xs font-bold text-red-700 dark:text-red-400 uppercase">
                        {t.collaboration.documentRequests.urgent}
                    </span>
                </div>
            )}

            <p className="text-sm text-foreground">
                <span className="font-bold">{agentName}</span>{" "}
                {language === "el"
                    ? `ζητά: ${docName}`
                    : `requests: ${docName}`}
            </p>

            {request.instruction && (
                <p className="text-xs text-muted-foreground mt-2 italic">
                    "{request.instruction}"
                </p>
            )}

            {request.dueDate && (
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-2 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {t.collaboration.documentRequests.due}: {formatDateShort(request.dueDate, language)}
                </p>
            )}

            {/* Error feedback */}
            {error && (
                <div className="flex items-center gap-2 mt-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 px-3 py-2">
                    <AlertTriangle className="h-4 w-4 text-red-700 dark:text-red-400 shrink-0" />
                    <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
                    <button
                        type="button"
                        onClick={() => setError(null)}
                        className="ml-auto text-red-400 hover:text-red-700 dark:hover:text-red-300"
                    >
                        <X className="h-3 w-3" />
                    </button>
                </div>
            )}

            {/* Upload buttons */}
            <div className="flex gap-2 mt-4">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={acceptAttribute("document")}
                    onChange={handleFileChange}
                    className="hidden"
                />
                <BrandActionButton
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex-1 text-sm"
                >
                    <Upload className="h-4 w-4" />
                    {isUploading
                        ? t.collaboration.documentRequests.uploading
                        : t.collaboration.documentRequests.uploadFile}
                </BrandActionButton>
                <BrandActionButton
                    variant="secondary"
                    onClick={() => {
                        // Trigger camera capture on mobile
                        const input = fileInputRef.current
                        if (input) {
                            input.setAttribute("capture", "environment")
                            input.click()
                            input.removeAttribute("capture")
                        }
                    }}
                    className="text-sm"
                >
                    <Camera className="h-4 w-4" />
                </BrandActionButton>
            </div>
        </BrandCard>
    )
}

// ── Document Request List Item ────────────────────────────────────────

interface DocumentRequestCardProps {
    request: DocumentRequestData
    viewerRole: ViewerRole
    agentName?: string
    onRespond?: (requestId: string) => void
}

export function DocumentRequestCard({ request, viewerRole, agentName, onRespond }: DocumentRequestCardProps) {
    const { language, t } = useLanguage()
    const docLabel = DOCUMENT_TYPE_TAXONOMY[request.documentType as DocumentTypeKey]
    const docName = docLabel ? (language === "el" ? docLabel.el : docLabel.en) : request.documentType

    const statusIcons: Record<string, React.ElementType> = {
        pending: Clock,
        uploaded: CheckCircle2,
        expired: AlertTriangle,
    }
    const statusColors: Record<string, string> = {
        pending: "text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400",
        uploaded: "text-[#166534] bg-primary-soft dark:bg-primary/15 dark:text-mint",
        expired: "text-red-700 bg-red-50 dark:bg-red-900/30 dark:text-red-400",
    }

    const StatusIcon = statusIcons[request.status] || Clock

    return (
        <div className="flex items-center gap-3 rounded-xl border border-[var(--brand-border-subtle)] p-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${statusColors[request.status]}`}>
                <StatusIcon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                    {docName}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {request.status === "pending"
                        ? t.collaboration.documentRequests.pending
                        : request.status === "uploaded"
                            ? t.collaboration.documentRequests.uploaded
                            : t.collaboration.documentRequests.expired}
                </p>
            </div>
            {request.status === "pending" && viewerRole === "policyholder" && onRespond && (
                <BrandActionButton
                    onClick={() => onRespond(request.id)}
                    className="text-xs py-1.5 px-3"
                >
                    <Upload className="h-3 w-3" />
                    {t.collaboration.documentRequests.upload}
                </BrandActionButton>
            )}
        </div>
    )
}
