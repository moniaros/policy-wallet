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
import { formatDateGreek } from "@/lib/agent/format"
import { DOCUMENT_TYPE_TAXONOMY } from "./types"
import type { DocumentRequestData, DocumentUrgency, DocumentTypeKey, ViewerRole } from "./types"

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
    const { language } = useLanguage()
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
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                {language === "el" ? "Αίτημα Εγγράφου" : "Request Document"}
            </h3>
            <p className="text-sm text-slate-500 mb-4">
                {language === "el" ? `Αποστολή αιτήματος σε ${clientName}` : `Send request to ${clientName}`}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Document type */}
                <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        {language === "el" ? "Τύπος εγγράφου" : "Document type"}
                    </label>
                    <select
                        value={documentType}
                        onChange={(e) => setDocumentType(e.target.value as DocumentTypeKey)}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white"
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
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        {language === "el" ? "Οδηγίες (προαιρετικό)" : "Instructions (optional)"}
                    </label>
                    <textarea
                        value={instruction}
                        onChange={(e) => setInstruction(e.target.value)}
                        rows={2}
                        placeholder={language === "el" ? "π.χ. Χρειάζομαι την τελευταία σελίδα..." : "e.g. I need the last page..."}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-white resize-none placeholder:text-slate-400"
                    />
                </div>

                {/* Urgency + Due date */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                            {language === "el" ? "Επείγον" : "Urgency"}
                        </label>
                        <select
                            value={urgency}
                            onChange={(e) => setUrgency(e.target.value as DocumentUrgency)}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm"
                        >
                            <option value="low">{language === "el" ? "Χαμηλό" : "Low"}</option>
                            <option value="normal">{language === "el" ? "Κανονικό" : "Normal"}</option>
                            <option value="urgent">{language === "el" ? "Επείγον" : "Urgent"}</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                            {language === "el" ? "Προθεσμία" : "Due date"}
                        </label>
                        <input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-2">
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
                        >
                            {language === "el" ? "Ακύρωση" : "Cancel"}
                        </button>
                    )}
                    <BrandActionButton type="submit" disabled={isSending} className="text-sm">
                        <Send className="h-4 w-4" />
                        {isSending
                            ? (language === "el" ? "Αποστολή..." : "Sending...")
                            : (language === "el" ? "Αποστολή Αιτήματος" : "Send Request")}
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
    const { language } = useLanguage()
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
        normal: "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800",
        urgent: "border-red-200 bg-red-50/50 dark:border-red-800/50 dark:bg-red-950/20",
    }

    if (uploaded) {
        return (
            <BrandCard className="p-5">
                <div className="flex flex-col items-center text-center py-4">
                    <CheckCircle2 className="h-10 w-10 text-[#22C55E] mb-3" />
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {language === "el" ? "Το έγγραφο στάλθηκε!" : "Document uploaded!"}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
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
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-xs font-bold text-red-700 dark:text-red-400 uppercase">
                        {language === "el" ? "Επείγον" : "Urgent"}
                    </span>
                </div>
            )}

            <p className="text-sm text-slate-900 dark:text-white">
                <span className="font-bold">{agentName}</span>{" "}
                {language === "el"
                    ? `ζητά: ${docName}`
                    : `requests: ${docName}`}
            </p>

            {request.instruction && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 italic">
                    "{request.instruction}"
                </p>
            )}

            {request.dueDate && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {language === "el" ? "Προθεσμία" : "Due"}: {formatDateGreek(request.dueDate)}
                </p>
            )}

            {/* Error feedback */}
            {error && (
                <div className="flex items-center gap-2 mt-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 px-3 py-2">
                    <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
                    <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
                    <button
                        type="button"
                        onClick={() => setError(null)}
                        className="ml-auto text-red-400 hover:text-red-600 dark:hover:text-red-300"
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
                    accept="image/*,.pdf,.doc,.docx"
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
                        ? (language === "el" ? "Μεταφόρτωση..." : "Uploading...")
                        : (language === "el" ? "Μεταφόρτωση Αρχείου" : "Upload File")}
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
    const { language } = useLanguage()
    const docLabel = DOCUMENT_TYPE_TAXONOMY[request.documentType as DocumentTypeKey]
    const docName = docLabel ? (language === "el" ? docLabel.el : docLabel.en) : request.documentType

    const statusIcons: Record<string, React.ElementType> = {
        pending: Clock,
        uploaded: CheckCircle2,
        expired: AlertTriangle,
    }
    const statusColors: Record<string, string> = {
        pending: "text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400",
        uploaded: "text-[#166534] bg-primary-soft dark:bg-primary/15 dark:text-mint",
        expired: "text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400",
    }

    const StatusIcon = statusIcons[request.status] || Clock

    return (
        <div className="flex items-center gap-3 rounded-xl border border-[var(--brand-border-subtle)] p-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${statusColors[request.status]}`}>
                <StatusIcon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {docName}
                </p>
                <p className="text-xs text-slate-500">
                    {request.status === "pending"
                        ? (language === "el" ? "Αναμονή" : "Pending")
                        : request.status === "uploaded"
                            ? (language === "el" ? "Μεταφορτώθηκε" : "Uploaded")
                            : (language === "el" ? "Έληξε" : "Expired")}
                </p>
            </div>
            {request.status === "pending" && viewerRole === "policyholder" && onRespond && (
                <BrandActionButton
                    onClick={() => onRespond(request.id)}
                    className="text-xs py-1.5 px-3"
                >
                    <Upload className="h-3 w-3" />
                    {language === "el" ? "Ανέβασμα" : "Upload"}
                </BrandActionButton>
            )}
        </div>
    )
}
