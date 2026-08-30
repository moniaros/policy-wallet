"use client"

import { useState } from "react"
import { FileText } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Drag-and-drop file dropzone (extracted from AddPolicyClient /
 * BatchUploadModal). Renders the dropzone box only — file lists and
 * submission stay with the caller. Copy arrives pre-resolved.
 */
export function UploadDropzone({
    onFiles,
    accept,
    multiple = true,
    inputId,
    inputName,
    inputTestId,
    title,
    hint,
    className,
}: {
    onFiles: (files: File[]) => void
    accept: string
    multiple?: boolean
    /** id for the hidden input — the whole box is its label. */
    inputId: string
    inputName?: string
    inputTestId?: string
    title: string
    hint: string
    className?: string
}) {
    const [dragActive, setDragActive] = useState(false)

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(e.type === "dragenter" || e.type === "dragover")
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)
        if (e.dataTransfer.files?.length) {
            onFiles(Array.from(e.dataTransfer.files))
        }
    }

    return (
        <div
            className={cn(
                "cursor-pointer rounded-g-card border-2 border-dashed p-8 text-center transition-all",
                dragActive
                    ? "border-border-focus bg-surface-wash"
                    : "border-border-strong hover:border-border-focus hover:bg-surface-sunken",
                className
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
        >
            <input
                type="file"
                id={inputId}
                name={inputName}
                data-testid={inputTestId}
                multiple={multiple}
                accept={accept}
                className="hidden"
                onChange={(e) => {
                    if (e.target.files?.length) onFiles(Array.from(e.target.files))
                }}
            />
            <label htmlFor={inputId} className="cursor-pointer block">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-raised text-fg-brand shadow-g-raised">
                    <FileText className="w-8 h-8" />
                </div>
                <h3 className="mb-1 text-g-heading text-fg-primary">{title}</h3>
                <p className="text-g-app-body-sm text-fg-secondary">{hint}</p>
            </label>
        </div>
    )
}
