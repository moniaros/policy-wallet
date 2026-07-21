"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { Download, FileText } from "lucide-react"

import { DocumentPreview, DocumentPreviewButton } from "@/components/wallet/DocumentPreview"
import { UpgradeModal } from "@/components/monetization/UpgradeModal"

interface PolicyDocumentItem {
    id: string
    fileName: string
    fileUrl: string
}

interface DocumentsCardProps {
    policyId: string
    documents: PolicyDocumentItem[]
    isFreeTier: boolean
    copy: {
        documentsArea: string
        noDocuments: string
        contract: string
        preview: string
        upgradeToPlusPreview: string
        previewLabels: {
            download: string
            previewUnavailable: string
            downloadFile: string
        }
    }
}

/**
 * Uploaded documents with inline preview (PDF preview is Plus-gated).
 * Owns the preview-modal state so the page orchestrator stays stateless.
 */
export function DocumentsCard({ policyId, documents, isFreeTier, copy }: DocumentsCardProps) {
    const pathname = usePathname()
    const [previewDoc, setPreviewDoc] = useState<{ fileName: string; fileUrl: string } | null>(null)
    const [upgradeOpen, setUpgradeOpen] = useState(false)

    // Authorized retrieval: the raw storage URL is never rendered. This
    // endpoint re-checks access and 302s to a fresh short-lived signed URL.
    const docHref = (docId: string) => `/api/v1/policies/${policyId}/documents/${docId}`

    return (
        <div className="pw-card p-6">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-black/60 dark:text-white/70">
                <FileText className="h-4 w-4 text-primary dark:text-mint" />
                {copy.documentsArea}
            </h3>

            {documents.length === 0 ? (
                <p className="text-sm text-black/65 dark:text-white/70">{copy.noDocuments}</p>
            ) : (
                <ul className="space-y-3">
                    {documents.map((doc) => {
                        const isPdf = doc.fileName?.toLowerCase().endsWith('.pdf')
                        const isImage = /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(doc.fileName || '')
                        const canPreview = isPdf || isImage
                        const isPreviewLocked = isPdf && isFreeTier

                        return (
                            <li key={doc.id} className="flex items-center gap-2">
                                <a
                                    href={docHref(doc.id)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex flex-1 items-center gap-3 rounded-xl border border-black/10 bg-white px-3 py-3 transition-colors hover:bg-black/5 dark:border-white/15 dark:bg-black dark:hover:bg-white/10"
                                >
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 bg-black/5 dark:border-white/15 dark:bg-white/10">
                                        <FileText className="h-4 w-4 text-black/75 dark:text-white/80" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-black dark:text-white">{doc.fileName}</p>
                                        <p className="text-xs text-black/55 dark:text-white/60">{copy.contract}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        {canPreview && (
                                            <DocumentPreviewButton
                                                onClick={() => setPreviewDoc({ fileName: doc.fileName, fileUrl: docHref(doc.id) })}
                                                isLocked={isPreviewLocked}
                                                label={copy.preview}
                                                lockedLabel={copy.upgradeToPlusPreview}
                                                onLockedClick={() => setUpgradeOpen(true)}
                                            />
                                        )}
                                        <Download className="h-4 w-4 shrink-0 text-black/45 dark:text-white/55" />
                                    </div>
                                </a>
                            </li>
                        )
                    })}
                </ul>
            )}

            <DocumentPreview
                isOpen={!!previewDoc}
                onClose={() => setPreviewDoc(null)}
                document={previewDoc}
                labels={copy.previewLabels}
            />

            <UpgradeModal
                isOpen={upgradeOpen}
                onClose={() => setUpgradeOpen(false)}
                featureKey="pdf_preview"
                triggerSource="document_preview"
                returnTo={pathname || undefined}
            />
        </div>
    )
}
