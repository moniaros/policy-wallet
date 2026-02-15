"use client"

import { useState } from "react"
import { ArrowRight, Send, UserPlus, Copy, Check } from "lucide-react"

import { sendClientInvite, completeOnboarding } from "@/app/onboarding/agent/actions"
import { useSession } from "next-auth/react"

interface StepProps {
    onNext: () => void // In this case, 'Finish'
    onBack: () => void
}

export function FirstClientInviteStep({ onNext, onBack }: StepProps) {
    const { data: session } = useSession()
    const [email, setEmail] = useState("")
    const [inviteSent, setInviteSent] = useState(false)
    const [copied, setCopied] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!session?.user?.id) return

        setIsLoading(true)
        await sendClientInvite(session.user.id, email)
        setIsLoading(false)
        setInviteSent(true)
    }

    const handleFinish = async () => {
        if (!session?.user?.id) return

        setIsLoading(true)
        await completeOnboarding(session.user.id)
        setIsLoading(false)
        onNext()
    }

    const copyLink = () => {
        navigator.clipboard.writeText("https://policywallet.app/agent/test-agency-local")
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="space-y-6">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-6">
                <UserPlus className="w-8 h-8 text-white" />
            </div>

            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                    Activate your first client.
                </h1>
                <p className="text-slate-600 dark:text-slate-400 text-lg">
                    Send an invite to a client to onboard them to your digital office immediately.
                </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
                {!inviteSent ? (
                    <form onSubmit={handleInvite} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Client Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="client@example.com"
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                        >
                            <Send className="w-4 h-4" /> {isLoading ? "Sending..." : "Send Invite"}
                        </button>
                    </form>
                ) : (
                    <div className="text-center py-4">
                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Check className="w-6 h-6 text-emerald-600" />
                        </div>
                        <p className="font-bold text-slate-900 dark:text-white">Invite Sent!</p>
                        <p className="text-sm text-slate-500">We've sent an onboarding email to {email}.</p>
                        <button
                            onClick={() => { setInviteSent(false); setEmail(""); }}
                            className="text-sm text-emerald-600 font-bold mt-2 hover:underline"
                        >
                            Send another
                        </button>
                    </div>
                )}

                <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold uppercase">Or share link</span>
                    <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                </div>

                <div
                    onClick={copyLink}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-emerald-500 transition-colors group"
                >
                    <span className="text-sm text-slate-600 dark:text-slate-300 font-mono truncate max-w-[200px]">policywallet.app/agent/test-agency</span>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 group-hover:text-emerald-600">
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied ? "Copied" : "Copy"}
                    </div>
                </div>
            </div>

            <div className="flex gap-3 pt-4">
                <button
                    onClick={onBack}
                    className="px-6 py-4 rounded-xl font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-all"
                >
                    Back
                </button>
                <button
                    onClick={handleFinish}
                    disabled={isLoading}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:-translate-y-1 disabled:opacity-50"
                >
                    {isLoading ? "Finishing..." : "Finish Setup"} <ArrowRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    )
}
