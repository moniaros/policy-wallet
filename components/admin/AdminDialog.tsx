"use client"

import { useId, type ReactNode } from "react"
import { useDialog } from "@/hooks/useDialog"

interface AdminDialogProps {
    /** The dialog only renders when true — callers keep their existing gating. */
    open: boolean
    onClose: () => void
    title: string
    children: ReactNode
    /** Widen for table-ish content. Defaults to the admin standard. */
    className?: string
}

/**
 * The admin section's modal chrome, with dialog semantics.
 *
 * Six admin overlays (UsersClient ×4, BillingOpsPanel, PoliciesClient) each
 * hand-rolled the same `fixed inset-0` + white panel markup with **no** focus
 * trap, no Escape, no `role="dialog"` and no accessible name — so a keyboard
 * user could tab straight out of a role-change or token-grant dialog onto the
 * page behind it, and a screen reader announced nothing. useDialog supplies the
 * trap, Escape and focus-return; the heading is wired as the accessible name.
 *
 * Admin keeps its own chrome rather than adopting components/ui/Modal because
 * the section is deliberately plainer (stone palette, square-ish panels) than
 * the customer-facing product.
 */
export function AdminDialog({ open, onClose, title, children, className = "max-w-md" }: AdminDialogProps) {
    const titleId = useId()
    const dialogRef = useDialog<HTMLDivElement>(onClose, open)

    if (!open) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                className={`bg-white dark:bg-stone-800 rounded-lg w-full p-6 max-h-[90vh] overflow-y-auto ${className}`}
            >
                <h2 id={titleId} className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-3">
                    {title}
                </h2>
                {children}
            </div>
        </div>
    )
}
