"use client"

import { Modal } from "@/components/ui/Modal"
import { Eye, Download, Crown } from "lucide-react"
import { isBrowserRenderableImage, isPdfFile } from "@/lib/security/file-upload"

interface DocumentPreviewProps {
    isOpen: boolean
    onClose: () => void
    document: {
        fileName: string
        fileUrl: string
    } | null
    labels: {
        download: string
        previewUnavailable: string
        downloadFile: string
    }
}

/**
 * Derived from the upload allowlist. The hand-written regex here listed gif, bmp
 * and svg — none of which the server accepts — and omitted heic, which it does.
 * A phone photo of a policy therefore reached the preview as "other" and was met
 * with "preview unavailable", even where the card offered a preview button.
 */
function getFileType(fileName: string): "pdf" | "image" | "other" {
    if (isPdfFile(fileName)) return "pdf"
    // Only formats the browser can paint reach the <img> branch. HEIC is an
    // accepted image but not browser-renderable — it falls to "other" so the
    // reader gets the download link instead of a broken image.
    if (isBrowserRenderableImage(fileName)) return "image"
    return "other"
}

export function DocumentPreview({ isOpen, onClose, document, labels }: DocumentPreviewProps) {
    if (!document) return null

    const fileType = getFileType(document.fileName)

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="!max-w-4xl !max-h-[92vh]">
            <div className="p-5">
                <div className="mb-4 flex items-center justify-between pr-8">
                    <h3 className="truncate text-sm font-bold text-black dark:text-white">
                        {document.fileName}
                    </h3>
                    <a
                        href={document.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-3 flex shrink-0 items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold text-black/70 transition-colors hover:bg-black/5 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/10"
                    >
                        <Download className="h-3.5 w-3.5" />
                        {labels.download}
                    </a>
                </div>

                <div className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.03]" style={{ height: "70vh" }}>
                    {fileType === "pdf" ? (
                        <iframe
                            src={document.fileUrl}
                            title={document.fileName}
                            className="h-full w-full border-0"
                        />
                    ) : fileType === "image" ? (
                        <div className="flex h-full items-center justify-center p-4">
                            <img
                                src={document.fileUrl}
                                alt={document.fileName}
                                className="max-h-full max-w-full object-contain"
                            />
                        </div>
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-3 text-black/60 dark:text-white/50">
                            <p className="text-sm">{labels.previewUnavailable}</p>
                            <a
                                href={document.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-full bg-black/10 px-4 py-2 text-sm font-semibold text-black/70 transition-colors hover:bg-black/20 dark:bg-white/10 dark:text-white/70 dark:hover:bg-white/20"
                            >
                                {labels.downloadFile}
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    )
}

interface DocumentPreviewButtonProps {
    onClick: () => void
    isLocked?: boolean
    label: string
    lockedLabel?: string
    /** Locked-state click-through (opens the upgrade flow instead of the preview). */
    onLockedClick?: () => void
}

export function DocumentPreviewButton({ onClick, isLocked, label, lockedLabel, onLockedClick }: DocumentPreviewButtonProps) {
    if (isLocked) {
        return (
            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onLockedClick?.()
                }}
                className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-black/55 transition-colors hover:bg-black/5 hover:text-black/70 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white/70"
                title={lockedLabel}
                aria-label={lockedLabel}
            >
                <Crown className="h-3 w-3" />
                <Eye className="h-3.5 w-3.5" />
            </button>
        )
    }

    return (
        <button
            type="button"
            onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onClick()
            }}
            className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-black/60 transition-colors hover:bg-black/5 hover:text-black/80 dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white/80"
            title={label}
        >
            <Eye className="h-3.5 w-3.5" />
        </button>
    )
}
