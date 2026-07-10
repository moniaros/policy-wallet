"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { deletePolicy } from "@/app/(protected)/wallet/actions"
import { Trash2, AlertTriangle, X } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { mapWalletErrorToMessage } from "@/lib/i18n/wallet-error"

export function DeletePolicy({ policyId }: { policyId: string }) {
    const [isDeleting, setIsDeleting] = useState(false)
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const router = useRouter()
    const { t } = useLanguage()

    const copy = t.wallet.deletePolicyModal

    const handleDelete = async () => {
        setIsDeleting(true)
        setShowConfirmModal(false)
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

    return (
        <>
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-red-200/50 dark:border-red-900/30 transition-all duration-300 hover:shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center shadow-lg">
                        <AlertTriangle className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-sm font-black text-red-600 dark:text-red-400 uppercase tracking-widest">{copy.dangerZone}</h3>
                </div>

                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">{copy.dangerDesc}</p>

                <button
                    onClick={() => setShowConfirmModal(true)}
                    disabled={isDeleting}
                    className="group w-full py-3 px-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 border border-red-200 dark:border-red-800 hover:shadow-md cursor-pointer"
                >
                    <Trash2 className="w-4 h-4 transition-transform group-hover:scale-110" />
                    <span>{copy.deletePolicy}</span>
                </button>
            </div>

            {showConfirmModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-700">
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
                                    onClick={() => setShowConfirmModal(false)}
                                    className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center cursor-pointer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6">
                            <p className="text-slate-700 dark:text-slate-300 mb-6 leading-relaxed">{copy.confirmBody}</p>

                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
                                <p className="text-sm text-amber-800 dark:text-amber-200 font-semibold flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    {copy.cannotUndo}
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowConfirmModal(false)}
                                    className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                                >
                                    {copy.cancel}
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="flex-1 py-3 px-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-red-500/30 cursor-pointer"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    {isDeleting ? copy.deleting : copy.deleteForever}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
