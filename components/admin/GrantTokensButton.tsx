"use client"

import { useId, useState } from "react"
import { useDialog } from "@/hooks/useDialog"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { grantTokens } from "@/app/(protected)/admin/actions"

export default function GrantTokensButton({ userId, label }: { userId: string; label: string }) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const dialogRef = useDialog<HTMLDivElement>(() => setOpen(false), open)
    const titleId = useId()
    const [amount, setAmount] = useState("")
    const [reason, setReason] = useState("")
    const [busy, setBusy] = useState(false)

    return (
        <>
            <button
                onClick={() => { setAmount(""); setReason(""); setOpen(true) }}
                className="px-3 py-1.5 text-sm rounded bg-primary text-white dark:text-[#1A2420] hover:bg-primary-hover"
            >
                Grant tokens
            </button>
            {open && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="bg-white dark:bg-stone-800 rounded-lg max-w-md w-full p-6">
                        <h2 id={titleId} className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-2">Grant Tokens</h2>
                        <p className="text-stone-600 dark:text-stone-400 mb-4">Add AI tokens to {label}.</p>
                        <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1">Amount (tokens)</label>
                        <input
                            type="number" min="1" step="1"
                            className="w-full p-2 border rounded mb-3 dark:bg-stone-700 dark:border-stone-600 dark:text-white"
                            value={amount} onChange={e => setAmount(e.target.value)}
                        />
                        <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1">Reason</label>
                        <input
                            className="w-full p-2 border rounded mb-6 dark:bg-stone-700 dark:border-stone-600 dark:text-white"
                            placeholder="e.g. goodwill / support comp"
                            value={reason} onChange={e => setReason(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setOpen(false)} disabled={busy} className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded disabled:opacity-50">Cancel</button>
                            <button
                                disabled={busy || !amount.trim() || !reason.trim()}
                                onClick={async () => {
                                    const n = Number(amount)
                                    if (!Number.isInteger(n) || n <= 0) {
                                        toast.error("Enter a whole number of tokens greater than zero.") // i18n-hardcoded-ignore
                                        return
                                    }
                                    setBusy(true)
                                    const res = await grantTokens({ userId, amount: n, reason: reason.trim() })
                                    setBusy(false)
                                    if (res.ok) {
                                        toast.success(`Granted ${n.toLocaleString()} tokens — new balance ${res.newAvailable.toLocaleString()}.`) // i18n-hardcoded-ignore
                                        setOpen(false)
                                        router.refresh()
                                    } else {
                                        toast.error(res.error || "Failed to grant tokens.") // i18n-hardcoded-ignore
                                    }
                                }}
                                className="px-4 py-2 bg-primary text-white dark:text-[#1A2420] rounded hover:bg-primary-hover disabled:opacity-50"
                            >
                                {busy ? "Working…" : "Grant"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
