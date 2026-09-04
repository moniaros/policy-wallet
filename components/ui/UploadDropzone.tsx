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
                "cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors",
                dragActive
                    ? "border-primary bg-primary-tint dark:bg-primary/15"
                    : "border-border hover:border-primary/60 hover:bg-muted",
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
                <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-muted text-primary dark:text-mint">
                    <FileText className="h-7 w-7" aria-hidden="true" />
                </div>
                <h3 className="mb-1 text-base font-semibold text-foreground">{title}</h3>
                <p className="text-caption text-muted-foreground">{hint}</p>
            </label>
        </div>
    )
}
