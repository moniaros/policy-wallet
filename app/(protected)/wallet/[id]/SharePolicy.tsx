"use client"

import { useState } from "react"
import { sharePolicy, revokeShare } from "../actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface Share {
    id: string
    email: string
    name: string | null
    image: string | null
    grantedAt: Date
}

export function SharePolicy({ policyId, initialShares }: { policyId: string, initialShares: Share[] }) {
    const [email, setEmail] = useState("")
    const [loading, setLoading] = useState(false)
    const [inviteLink, setInviteLink] = useState<string | null>(null)
    const router = useRouter()

    const handleShare = async () => {
        if (!email) return
        setLoading(true)
        setInviteLink(null)
        const res = await sharePolicy(policyId, email)
        setLoading(false)
        if (res.error) {
            toast.error(res.error)
        } else {
            if (res.link) {
                setInviteLink(res.link)
                toast.success("Invitation created. Send the link to your agent.")
            } else {
                toast.success("Policy shared successfully")
            }
            setEmail("")
            router.refresh()
        }
    }

    const copyLink = () => {
        if (inviteLink) {
            navigator.clipboard.writeText(inviteLink)
            toast.success("Link copied!")
        }
    }

    const handleRevoke = async (grantId: string) => {
        if (!confirm("Revoke access?")) return
        const res = await revokeShare(grantId)
        if (res.success) {
            toast.success("Access revoked")
            router.refresh()
        }
    }

    return (
        <div className="bg-white dark:bg-stone-800 rounded-3xl p-6 shadow-sm border border-stone-200 dark:border-stone-700">
            <h3 className="text-sm font-black text-stone-400 uppercase tracking-widest mb-4">Share with Agent</h3>

            {inviteLink && (
                <div className="mb-6 bg-teal-50 dark:bg-teal-900/20 p-4 rounded-xl border border-teal-100 dark:border-teal-800">
                    <p className="text-xs font-bold text-teal-700 dark:text-teal-300 mb-2">Invitation Link Created</p>
                    <div className="flex gap-2">
                        <input
                            readOnly
                            value={inviteLink}
                            className="bg-white dark:bg-stone-900 flex-1 px-3 py-1 text-xs rounded border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400"
                        />
                        <button onClick={copyLink} className="text-xs font-bold text-teal-600 hover:text-teal-700">Copy</button>
                    </div>
                </div>
            )}

            <div className="flex gap-2 mb-6">
                <input
                    type="email"
                    placeholder="agent@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="flex-1 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button
                    onClick={handleShare}
                    disabled={loading || !email}
                    className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-xl font-bold text-sm disabled:opacity-50 transition-colors"
                >
                    {loading ? "Sharing..." : "Share"}
                </button>
            </div>

            {initialShares.length > 0 && (
                <div className="space-y-3">
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Access Granted To</p>
                    {initialShares.map(share => (
                        <div key={share.id} className="flex items-center justify-between p-3 bg-stone-50 dark:bg-stone-900/50 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-stone-200 dark:bg-stone-700 rounded-full flex items-center justify-center text-xs font-bold text-stone-600 dark:text-stone-300">
                                    {share.name?.[0] || share.email[0].toUpperCase()}
                                </div>
                                <div className="text-xs">
                                    <p className="font-bold text-stone-900 dark:text-stone-100">{share.name || "Agent"}</p>
                                    <p className="text-stone-500">{share.email}</p>
                                </div>
                            </div>
                            <button onClick={() => handleRevoke(share.id)} className="text-red-500 text-[10px] font-bold uppercase hover:underline">Revoke</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
