"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { deletePolicy } from "@/app/(protected)/wallet/actions"
import { Trash2, AlertTriangle, X } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
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
            <div className="bg-card rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-border">
                <div className="bg-red-500 p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black">{copy.confirmDeletion}</h2>
                                <p className="text-sm text-red-100 mt-0.5">{copy.permanentAction}</p>
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
                    <p className="text-muted-foreground mb-6 leading-relaxed">{copy.confirmBody}</p>

                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
                        <p className="text-sm text-amber-800 dark:text-amber-200 font-semibold flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            {copy.cannotUndo}
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => onOpenChange(false)}
                            className="flex-1 py-3 px-4 bg-muted text-foreground rounded-xl font-bold hover:bg-muted/70 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        >
                            {copy.cancel}
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="flex-1 py-3 px-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-red-500/30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
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
