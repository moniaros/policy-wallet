"use client"

import { useId, useState, type ReactNode } from "react"
import { AlertTriangle } from "lucide-react"
import { Modal } from "@/components/ui/Modal"
import { useLanguage } from "@/contexts/LanguageContext"

interface ConfirmDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** Short question, e.g. "Delete your account?" */
    title: string
    /** What will happen. Keep it concrete. */
    description?: ReactNode
    /** Bulleted consequences — use for irreversible actions. */
    consequences?: string[]
    /** Defaults to t.common.confirm. */
    confirmLabel?: string
    /** Defaults to t.common.cancel. */
    cancelLabel?: string
    /** Red styling + warning glyph. */
    destructive?: boolean
    /**
     * Runs on confirm. If it returns a promise the dialog shows a pending state
     * and stays open until it settles, so the user never double-fires a
     * destructive action — the native confirm() this replaces had no such state.
     */
    onConfirm: () => void | Promise<void>
}

/**
 * The branded replacement for `window.confirm`.
 *
 * Native confirm() guarded four actions in this app, including account deletion
 * and severing an advisor relationship: OS-chrome dialogs with no product
 * styling, no pending state, no consequence copy, and nothing a screen reader
 * could associate with the surrounding task. This wraps the shared Modal, so it
 * inherits the focus trap, Escape handling, scroll lock and accessible name.
 */
export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    consequences,
    confirmLabel,
    cancelLabel,
    destructive = false,
    onConfirm,
}: ConfirmDialogProps) {
    const { t } = useLanguage()
    const titleId = useId()
    const descId = useId()
    const [pending, setPending] = useState(false)

    const handleConfirm = async () => {
        try {
            setPending(true)
            await onConfirm()
        } finally {
            setPending(false)
        }
    }

    return (
        <Modal
            isOpen={open}
            onClose={() => { if (!pending) onOpenChange(false) }}
            showCloseButton={false}
            ariaLabelledBy={titleId}
            ariaDescribedBy={description ? descId : undefined}
        >
            <div className="p-6 md:p-8">
                <div className="flex items-start gap-4">
                    {destructive && (
                        <div className="rounded-2xl bg-red-50 p-3 text-red-600 dark:bg-red-950/40 dark:text-red-400">
                            <AlertTriangle aria-hidden="true" className="h-6 w-6" />
                        </div>
                    )}
                    <div className="min-w-0">
                        <h2 id={titleId} className="text-lg font-bold text-foreground">{title}</h2>
                        {description && (
                            <div id={descId} className="mt-2 text-sm text-muted-foreground">{description}</div>
                        )}
                    </div>
                </div>

                {consequences && consequences.length > 0 && (
                    <ul className="mt-4 space-y-1.5 rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">
                        {consequences.map((line) => (
                            <li key={line} className="flex gap-2">
                                <span aria-hidden="true">•</span>
                                <span>{line}</span>
                            </li>
                        ))}
                    </ul>
                )}

                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        disabled={pending}
                        className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                        {cancelLabel ?? t.common.cancel}
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={pending}
                        className={`rounded-full px-5 py-2.5 text-sm font-bold transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${destructive
                            ? "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600"
                            : "bg-primary text-white hover:bg-primary-hover focus-visible:ring-primary dark:text-[#1A2420]"
                            }`}
                    >
                        {pending ? t.common.loading : (confirmLabel ?? t.common.confirm)}
                    </button>
                </div>
            </div>
        </Modal>
    )
}
