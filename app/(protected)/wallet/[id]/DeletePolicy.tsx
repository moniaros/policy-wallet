"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { deletePolicy } from "../actions"

export function DeletePolicy({ policyId }: { policyId: string }) {
    const [isDeleting, setIsDeleting] = useState(false)
    const router = useRouter()

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this policy? This action cannot be undone.")) return

        setIsDeleting(true)
        const toastId = toast.loading("Deleting policy...")

        try {
            const result = await deletePolicy(policyId)
            if (result.error) {
                toast.error(result.error, { id: toastId })
            } else {
                toast.success(result.message || "Policy deleted successfully", { id: toastId })
                router.push("/wallet")
            }
        } catch (e) {
            toast.error("Something went wrong", { id: toastId })
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div className="bg-white dark:bg-stone-800 rounded-3xl p-6 shadow-sm border border-stone-200 dark:border-stone-700 border-red-100 dark:border-red-900/30">
            <h3 className="text-sm font-black text-red-400 uppercase tracking-widest mb-4">Danger Zone</h3>
            <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-full py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                {isDeleting ? "Deleting..." : "Delete Policy"}
            </button>
            <p className="text-[10px] text-stone-400 mt-3 text-center leading-relaxed">
                This will permanently remove the policy and all associated documents from your wallet.
            </p>
        </div>
    )
}
