"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { Download, FileText } from "lucide-react"

import { DocumentPreview, DocumentPreviewButton } from "@/components/wallet/DocumentPreview"
import { UpgradeModal } from "@/components/monetization/UpgradeModal"
import { isAcceptedImageFile, isBrowserRenderableImage, isPdfFile } from "@/lib/security/file-upload"

interface PolicyDocumentItem {
    id: string
    fileName: string
    fileUrl: string
    /** ISO string. Already loaded and ordered desc by the page — see below. */
    uploadedAt?: string
}

interface DocumentsCardProps {
    policyId: string
    /** Resolved by the caller, like `copy` — this card reads no context. */
    locale?: "el" | "en"
    documents: PolicyDocumentItem[]
    isFreeTier: boolean
    copy: {
        documentsArea: string
        noDocuments: string
        /** Factual file-format labels — the product does not know a document's
            insurance TYPE (no schema field), so it states the format it can see
            rather than labelling every upload "Contract", which mislabels a
            receipt or a photo. */
        documentFormatPdf: string
        documentFormatImage: string
        documentFormatOther: string
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
export function DocumentsCard({ policyId, documents, isFreeTier, copy, locale = "el" }: DocumentsCardProps) {
    const pathname = usePathname()
    const [previewDoc, setPreviewDoc] = useState<{ fileName: string; fileUrl: string } | null>(null)
    const [upgradeOpen, setUpgradeOpen] = useState(false)

    // Authorized retrieval: the raw storage URL is never rendered. This
    // endpoint re-checks access and 302s to a fresh short-lived signed URL.
    const docHref = (docId: string) => `/api/v1/policies/${policyId}/documents/${docId}`

    return (
        <div className="pw-card pw-pad">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-black/60 dark:text-white/70">
                <FileText className="h-4 w-4 text-primary dark:text-mint" />
                {copy.documentsArea}
            </h3>

            {documents.length === 0 ? (
                <p className="text-sm text-black/65 dark:text-white/70">{copy.noDocuments}</p>
            ) : (
                <ul className="space-y-3">
                    {documents.map((doc) => {
                        // Derived from the upload allowlist, not hand-written: the
                        // old regex listed gif/bmp/svg (which the server rejects) and
                        // omitted heic (which it accepts, and which iPhones produce
                        // by default), so a phone photo of a policy showed as "other
                        // file" and lost its inline preview.
                        const isPdf = isPdfFile(doc.fileName)
                        const isImage = isAcceptedImageFile(doc.fileName)
                        // The LABEL calls HEIC an image (it is one); previewability
                        // is narrower — HEIC cannot render in a browser <img>, so it
                        // gets no inline preview button (the modal would show a
                        // broken image). It stays downloadable via the row link.
                        const canPreview = isPdf || isBrowserRenderableImage(doc.fileName)
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
                                        {/* A policy accumulates documents over its life — the
                                            original schedule, a renewal endorsement, an amended
                                            schedule after a mid-term change — and insurer PDFs
                                            often arrive with near-identical names. The page
                                            already loads uploadedAt and orders newest first, but
                                            the card showed only the filename and format, so the
                                            reader could not tell which one is current. */}
                                        <p className="text-xs text-muted-foreground">
                                            {isPdf ? copy.documentFormatPdf : isImage ? copy.documentFormatImage : copy.documentFormatOther}
                                            {doc.uploadedAt && (
                                                <>
                                                    {" · "}
                                                    <time dateTime={doc.uploadedAt}>
                                                        {new Date(doc.uploadedAt).toLocaleDateString(
                                                            locale === "el" ? "el-GR" : "en-GB",
                                                            { day: "numeric", month: "short", year: "numeric" }
                                                        )}
                                                    </time>
                                                </>
                                            )}
                                        </p>
                                    </div>
                                    <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
                                </a>
                                {/* The preview control is a real <button>, so it must be a SIBLING
                                    of the download <a> — never a child. A <button> nested inside an
                                    <a> is invalid HTML (an anchor may have no interactive descendant)
                                    and a screen-reader anti-pattern the rest of the app avoids. It
                                    sits at the row's trailing edge, beside the link. */}
                                {canPreview && (
                                    <DocumentPreviewButton
                                        onClick={() => setPreviewDoc({ fileName: doc.fileName, fileUrl: docHref(doc.id) })}
                                        isLocked={isPreviewLocked}
                                        label={copy.preview}
                                        lockedLabel={copy.upgradeToPlusPreview}
                                        onLockedClick={() => setUpgradeOpen(true)}
                                    />
                                )}
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
