"use client"

import { useEffect, useId, useRef, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { IconButton } from "./primitives"

/**
 * The sheet (§5.3): a bottom sheet on the phone, a centred modal from tablet
 * up — one component, one `<dialog>`. The native element gives the top layer,
 * the focus trap, Escape and focus return; the scrim is `::backdrop` on the
 * overlay role; the entrance is the `sheet-present` choreography.
 */
export function Sheet({
    open,
    onClose,
    title,
    closeLabel,
    children,
    className,
}: {
    open: boolean
    onClose: () => void
    title: string
    closeLabel: string
    children: ReactNode
    className?: string
}) {
    const ref = useRef<HTMLDialogElement>(null)
    const titleId = useId()
    useEffect(() => {
        const d = ref.current
        if (!d) return
        if (open && !d.open) d.showModal?.()
        if (!open && d.open) d.close?.()
    }, [open])
    return (
        <dialog
            ref={ref}
            aria-labelledby={titleId}
            onCancel={(e) => { e.preventDefault(); onClose() }}
            onClick={(e) => { if (e.target === ref.current) onClose() }}
            className={cn(
                "g-sheet-present m-0 max-h-[85dvh] w-full max-w-none overflow-y-auto border-0 bg-surface-raised p-0 text-fg-primary shadow-g-overlay backdrop:bg-surface-overlay",
                "fixed inset-x-0 bottom-0 top-auto rounded-t-g-sheet",
                "tablet:inset-auto tablet:left-1/2 tablet:top-1/2 tablet:w-[min(32rem,calc(100vw-2rem))] tablet:-translate-x-1/2 tablet:-translate-y-1/2 tablet:rounded-g-sheet",
                className
            )}
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
            <div className="flex items-center justify-between gap-g-3 px-g-4 pt-g-3">
                <h2 id={titleId} className="text-g-heading">{title}</h2>
                <IconButton label={closeLabel} size="sm" onClick={onClose}>
                    <span aria-hidden className="text-g-heading leading-none">×</span>
                </IconButton>
            </div>
            <div className="px-g-4 pb-g-4 pt-g-2">{children}</div>
        </dialog>
    )
}
