"use client"

import { useId, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { deletePolicy } from "@/app/(protected)/wallet/actions"
import { Trash2, AlertTriangle, X } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { useDialog } from "@/hooks/useDialog"
import { mapWalletErrorToMessage } from "@/lib/i18n/wallet-error"

interface DeletePolicyDialogProps {
    policyId: string
    open: boolean
    onOpenChange: (open: boolean) => void
}

/**
 * Delete-policy confirmation dialog. Triggered from the policy header's
 * overflow menu — the old standalone "Ζώνη κινδύνου" card is gone from the
 * right rail.
 */
export function DeletePolicyDialog({ policyId, open, onOpenChange }: DeletePolicyDialogProps) {
    const [isDeleting, setIsDeleting] = useState(false)
    const router = useRouter()
    const { t } = useLanguage()

    const copy = t.wallet.deletePolicyModal
    const dialogRef = useDialog<HTMLDivElement>(() => onOpenChange(false), open)
    const titleId = useId()

    const handleDelete = async () => {
        setIsDeleting(true)
        onOpenChange(false)
        const toastId = toast.loading(t.toast.policyDeleting)

        try {
            const result = await deletePolicy(policyId)
            if (result.error) {
                toast.error(mapWalletErrorToMessage(result.error, t, "deletePolicy"), { id: toastId })
            } else {
                toast.success(t.toast.policyDeleted, { id: toastId })
                router.push("/wallet")
                router.refresh()
            }
        } catch {
            toast.error(t.errors.somethingWentWrong, { id: toastId })
        } finally {
            setIsDeleting(false)
        }
    }

    if (!open) return null

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            {/* Focus trap + Escape + focus-return. This is a destructive dialog that
                previously had none of the three: keyboard users could tab out of it
                onto the page behind, and Escape did nothing. */}
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                className="w-full max-w-md overflow-hidden rounded-g-sheet border border-border-subtle bg-surface-raised shadow-g-overlay"
            >
                {/* action-danger + fg-on-brand: the token pair the contrast matrix
                    measures, so the sentence that says the deletion cannot be
                    undone stays legible in both themes (red-500-on-white never
                    cleared 4.5:1 — the background, not the text, was the defect). */}
                <div className="bg-action-danger p-6 text-fg-on-brand">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 id={titleId} className="text-xl font-black">{copy.confirmDeletion}</h2>
                                <p className="mt-0.5 text-g-app-body-sm">{copy.permanentAction}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => onOpenChange(false)}
                            className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="p-6">
                    <p className="mb-6 leading-relaxed text-fg-secondary">{copy.confirmBody}</p>

                    <div className="mb-6 rounded-g-control border border-state-gap-border bg-state-gap-fill p-4">
                        <p className="flex items-center gap-2 text-g-app-body-sm font-semibold text-state-gap">
                            <AlertTriangle className="w-4 h-4" />
                            {copy.cannotUndo}
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => onOpenChange(false)}
                            className="flex-1 cursor-pointer rounded-g-control bg-surface-sunken px-4 py-3 font-bold text-fg-primary transition-colors hover:bg-surface-wash focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                        >
                            {copy.cancel}
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-g-control bg-action-danger px-4 py-3 font-bold text-fg-on-brand shadow-g-raised transition-all duration-300 hover:bg-action-danger-hover disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-danger/50 focus-visible:ring-offset-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            {isDeleting ? copy.deleting : copy.deleteForever}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
