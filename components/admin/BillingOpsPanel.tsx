"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { issueRefund, cancelSubscriptionAsAdmin, applyCredit } from "@/app/(protected)/admin/billing-actions"
import { AdminDialog } from "@/components/admin/AdminDialog"

type ConfirmState = {
    title: string
    description: string
    run: () => Promise<{ ok: boolean; error?: string }>
    successMessage: string
} | null

const inputClass =
    "w-full p-2 border rounded text-sm dark:bg-stone-700 dark:border-stone-600 dark:text-white"
const labelClass = "block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1"
const sectionClass = "rounded-lg border border-stone-200 dark:border-stone-700 p-4 space-y-3"
const primaryBtn =
    "px-4 py-2 text-sm bg-primary text-white dark:text-[#1A2420] rounded hover:bg-primary-hover disabled:opacity-50"

export default function BillingOpsPanel() {
    const router = useRouter()
    const [confirm, setConfirm] = useState<ConfirmState>(null)
    const [busy, setBusy] = useState(false)

    // Refund
    const [refundPi, setRefundPi] = useState("")
    const [refundAmount, setRefundAmount] = useState("")
    const [refundReason, setRefundReason] = useState("")

    // Cancel
    const [cancelSubId, setCancelSubId] = useState("")
    const [cancelImmediate, setCancelImmediate] = useState(false)

    // Credit
    const [creditUserId, setCreditUserId] = useState("")
    const [creditAmount, setCreditAmount] = useState("")
    const [creditMemo, setCreditMemo] = useState("")

    const runConfirmed = async () => {
        if (!confirm) return
        setBusy(true)
        try {
            const res = await confirm.run()
            if (res.ok) {
                toast.success(confirm.successMessage) // i18n-hardcoded-ignore
                setConfirm(null)
                router.refresh()
            } else {
                toast.error(res.error || "Operation failed.") // i18n-hardcoded-ignore
            }
        } catch {
            toast.error("Unexpected error. Please retry.") // i18n-hardcoded-ignore
        } finally {
            setBusy(false)
        }
    }

    return (
        <section className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800">
            <div className="p-4 border-b border-stone-200 dark:border-stone-700">
                <h2 className="font-semibold text-stone-900 dark:text-stone-100">Billing Operations</h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                    Act on a subscriber directly. Every action is confirmed and written to the admin audit log.
                </p>
            </div>

            <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Refund */}
                <div className={sectionClass}>
                    <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Issue refund</h3>
                    <div>
                        <label htmlFor="billingopspanel-f1" className={labelClass}>Payment intent ID</label>
                        <input id="billingopspanel-f1" className={inputClass} placeholder="pi_..." value={refundPi} onChange={e => setRefundPi(e.target.value)} />
                    </div>
                    <div>
                        <label htmlFor="billingopspanel-f2" className={labelClass}>Amount (€) — blank = full</label>
                        <input id="billingopspanel-f2" className={inputClass} type="number" min="0" step="0.01" placeholder="Full refund" value={refundAmount} onChange={e => setRefundAmount(e.target.value)} />
                    </div>
                    <div>
                        <label htmlFor="billingopspanel-f3" className={labelClass}>Reason (optional)</label>
                        <input id="billingopspanel-f3" className={inputClass} placeholder="e.g. goodwill" value={refundReason} onChange={e => setRefundReason(e.target.value)} />
                    </div>
                    <button
                        className={primaryBtn}
                        disabled={!refundPi.trim()}
                        onClick={() => {
                            const amt = refundAmount.trim() ? Number(refundAmount) : undefined
                            setConfirm({
                                title: "Confirm refund",
                                description: `Refund ${amt ? `€${amt.toFixed(2)}` : "the full amount"} on ${refundPi.trim()}? This cannot be undone.`,
                                successMessage: "Refund issued.",
                                run: () => issueRefund({ paymentIntentId: refundPi.trim(), amountEur: amt, reason: refundReason.trim() || undefined }),
                            })
                        }}
                    >
                        Refund
                    </button>
                </div>

                {/* Cancel */}
                <div className={sectionClass}>
                    <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Cancel subscription</h3>
                    <div>
                        <label htmlFor="billingopspanel-f4" className={labelClass}>Subscription ID</label>
                        <input id="billingopspanel-f4" className={inputClass} placeholder="subscription row id" value={cancelSubId} onChange={e => setCancelSubId(e.target.value)} />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
                        <input type="checkbox" checked={cancelImmediate} onChange={e => setCancelImmediate(e.target.checked)} />
                        Cancel immediately (otherwise at period end)
                    </label>
                    <button
                        className={primaryBtn}
                        disabled={!cancelSubId.trim()}
                        onClick={() => {
                            setConfirm({
                                title: "Confirm cancellation",
                                description: `Cancel subscription ${cancelSubId.trim()} ${cancelImmediate ? "immediately (access ends now)" : "at the end of the current period"}?`,
                                successMessage: "Subscription cancelled.",
                                run: () => cancelSubscriptionAsAdmin({ subscriptionId: cancelSubId.trim(), immediately: cancelImmediate }),
                            })
                        }}
                    >
                        Cancel subscription
                    </button>
                </div>

                {/* Credit */}
                <div className={sectionClass}>
                    <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Apply credit</h3>
                    <div>
                        <label htmlFor="billingopspanel-f5" className={labelClass}>User ID</label>
                        <input id="billingopspanel-f5" className={inputClass} placeholder="user id" value={creditUserId} onChange={e => setCreditUserId(e.target.value)} />
                    </div>
                    <div>
                        <label htmlFor="billingopspanel-f6" className={labelClass}>Amount (€)</label>
                        <input id="billingopspanel-f6" className={inputClass} type="number" min="0" step="0.01" value={creditAmount} onChange={e => setCreditAmount(e.target.value)} />
                    </div>
                    <div>
                        <label htmlFor="billingopspanel-f7" className={labelClass}>Memo</label>
                        <input id="billingopspanel-f7" className={inputClass} placeholder="reason shown on the account" value={creditMemo} onChange={e => setCreditMemo(e.target.value)} />
                    </div>
                    <button
                        className={primaryBtn}
                        disabled={!creditUserId.trim() || !creditAmount.trim() || !creditMemo.trim()}
                        onClick={() => {
                            const amt = Number(creditAmount)
                            setConfirm({
                                title: "Confirm credit",
                                description: `Apply €${Number.isFinite(amt) ? amt.toFixed(2) : "0.00"} credit to user ${creditUserId.trim()}?`,
                                successMessage: "Credit applied.",
                                run: () => applyCredit({ userId: creditUserId.trim(), amountEur: amt, memo: creditMemo.trim() }),
                            })
                        }}
                    >
                        Apply credit
                    </button>
                </div>
            </div>

            {confirm && (
                <AdminDialog open onClose={() => setConfirm(null)} title={confirm.title}>
                        <p className="text-stone-600 dark:text-stone-400 mb-6">{confirm.description}</p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setConfirm(null)}
                                disabled={busy}
                                className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button onClick={runConfirmed} disabled={busy} className={primaryBtn}>
                                {busy ? "Working…" : "Confirm"}
                            </button>
                        </div>
                </AdminDialog>
            )}
        </section>
    )
}
