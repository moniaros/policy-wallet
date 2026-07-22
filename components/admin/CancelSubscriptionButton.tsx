"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { cancelSubscriptionAsAdmin } from "@/app/(protected)/admin/billing-actions"

export default function CancelSubscriptionButton({ subscriptionId }: { subscriptionId: string }) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [immediate, setImmediate] = useState(false)
    const [busy, setBusy] = useState(false)

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="px-2 py-1 text-xs rounded border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700"
            >
                Cancel
            </button>
            {open && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-stone-800 rounded-lg max-w-md w-full p-6">
                        <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-2">Cancel subscription</h2>
                        <p className="text-xs text-stone-500 dark:text-stone-400 mb-4 font-mono break-all">{subscriptionId}</p>
                        <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300 mb-6">
                            <input type="checkbox" checked={immediate} onChange={e => setImmediate(e.target.checked)} />
                            Cancel immediately (otherwise at period end)
                        </label>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setOpen(false)}
                                disabled={busy}
                                className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded disabled:opacity-50"
                            >
                                Close
                            </button>
                            <button
                                disabled={busy}
                                onClick={async () => {
                                    setBusy(true)
                                    const res = await cancelSubscriptionAsAdmin({ subscriptionId, immediately: immediate })
                                    setBusy(false)
                                    if (res.ok) {
                                        toast.success("Subscription cancelled.") // i18n-hardcoded-ignore
                                        setOpen(false)
                                        router.refresh()
                                    } else {
                                        toast.error(res.error || "Failed to cancel.") // i18n-hardcoded-ignore
                                    }
                                }}
                                className="px-4 py-2 text-sm bg-primary text-white dark:text-[#1A2420] rounded hover:bg-primary-hover disabled:opacity-50"
                            >
                                {busy ? "Working…" : "Confirm"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
