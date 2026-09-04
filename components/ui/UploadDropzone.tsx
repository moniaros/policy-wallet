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
    disabled = false,
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
    /**
     * A precondition the caller has not met yet (an attestation the agent
     * must tick before a document may be scanned). The input is disabled,
     * drops are ignored and the box says so — nothing can reach `onFiles`.
     */
    disabled?: boolean
}) {
    const [dragActive, setDragActive] = useState(false)

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (disabled) return
        setDragActive(e.type === "dragenter" || e.type === "dragover")
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)
        if (disabled) return
        if (e.dataTransfer.files?.length) {
            onFiles(Array.from(e.dataTransfer.files))
        }
    }

    return (
        <div
            className={cn(
                "rounded-2xl border-2 border-dashed p-8 text-center transition-colors",
                disabled
                    ? "cursor-not-allowed border-border opacity-60"
                    : dragActive
                        ? "cursor-pointer border-primary bg-primary-tint dark:bg-primary/15"
                        : "cursor-pointer border-border hover:border-primary/60 hover:bg-muted",
                className
            )}
            aria-disabled={disabled || undefined}
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
                disabled={disabled}
                className="hidden"
                onChange={(e) => {
                    if (disabled) return
                    if (e.target.files?.length) onFiles(Array.from(e.target.files))
                }}
            />
            <label htmlFor={inputId} className={disabled ? "block cursor-not-allowed" : "cursor-pointer block"}>
                <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-muted text-primary dark:text-mint">
                    <FileText className="h-7 w-7" aria-hidden="true" />
                </div>
                <h3 className="mb-1 text-base font-semibold text-foreground">{title}</h3>
                <p className="text-caption text-muted-foreground">{hint}</p>
            </label>
        </div>
    )
}
