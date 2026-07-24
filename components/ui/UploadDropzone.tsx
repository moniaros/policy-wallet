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
                "border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer",
                dragActive
                    ? "border-primary bg-primary-tint dark:bg-primary/15"
                    : "border-slate-200 dark:border-slate-700 hover:border-primary hover:bg-slate-50 dark:hover:bg-slate-800",
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
                <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full shadow-lg flex items-center justify-center mx-auto mb-4 text-primary dark:text-mint">
                    <FileText className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{title}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">{hint}</p>
            </label>
        </div>
    )
}
