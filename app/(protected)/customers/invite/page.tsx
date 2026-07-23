"use client"

import { inviteCustomer } from "@/app/(protected)/agent/actions"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/contexts/LanguageContext"

import { Alert } from "@/components/ui/Alert"
export default function InviteCustomerPage() {
    const [isPending, setIsPending] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [fallbackLink, setFallbackLink] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const router = useRouter()
    const { t } = useLanguage()
    const inv_t = t.agentPages.invite

    async function handleSubmit(formData: FormData) {
        setIsPending(true)
        setError(null)
        try {
            const result = await inviteCustomer(formData)
            if (result.success) {
                setSuccess(true)
                // Email delivery can fail while the invite itself was created —
                // surface the secure link so the agent can share it manually.
                const emailFailed = 'emailDelivered' in result && result.emailDelivered === false
                setFallbackLink(emailFailed && 'inviteLink' in result ? result.inviteLink || null : null)
            } else {
                // Rejections (rate limit, customer limit, auth) return
                // {success:false, error} — previously the form just stopped
                // spinning with no feedback at all.
                setError(('error' in result && result.error) || inv_t.errorFallback)
            }
        } catch (err: any) {
            setError(err.message || inv_t.errorFallback)
        } finally {
            setIsPending(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-12">
            <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                <div className="bg-primary px-8 py-10 text-white dark:text-[#1A2420]">
                    <h1 className="text-3xl font-bold">{inv_t.title}</h1>
                    <p className="mt-2 text-white/80 dark:text-[#1A2420]/80 italic">{inv_t.subtitle}</p>
                </div>

                <div className="p-8">
                    {success ? (
                        <div className="text-center py-6">
                            <div className="h-16 w-16 bg-primary-soft text-[#166534] dark:bg-primary/15 dark:text-mint rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-foreground mb-2">{fallbackLink ? inv_t.emailFailedTitle : inv_t.successTitle}</h2>
                            <p className="text-neutral-600 dark:text-neutral-400 mb-6">{fallbackLink ? inv_t.emailFailedBody : inv_t.successBody}</p>

                            {fallbackLink && (
                                <div className="mb-6 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10 p-3">
                                    <code className="flex-1 truncate text-left text-xs text-neutral-700 dark:text-neutral-300">{fallbackLink}</code>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            navigator.clipboard.writeText(fallbackLink).then(() => {
                                                setCopied(true)
                                                setTimeout(() => setCopied(false), 2000)
                                            }).catch(() => {})
                                        }}
                                        className="shrink-0 rounded-lg bg-neutral-900 dark:bg-neutral-100 px-3 py-2 text-xs font-bold text-white dark:text-neutral-900 hover:opacity-90 transition-opacity"
                                    >
                                        {copied ? inv_t.copied : inv_t.copyLink}
                                    </button>
                                </div>
                            )}

                            <button
                                onClick={() => router.push("/customers")}
                                className="w-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity"
                            >
                                {inv_t.backToCustomers}
                            </button>
                        </div>
                    ) : (
                        <form action={handleSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="email" className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">{inv_t.emailLabel}</label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    required
                                    placeholder="customer@example.com"
                                    className="pw-input"
                                />
                                <p className="mt-2 text-xs text-neutral-500">{inv_t.emailHelper}</p>
                            </div>

                            {error && (
                                <Alert variant="error">{error}</Alert>
                            )}

                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => router.back()}
                                    className="flex-1 px-6 py-3 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 rounded-xl font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                                >
                                    {inv_t.cancel}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="pw-primary-button flex-1"
                                >
                                    {isPending ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5 text-white dark:text-[#1A2420]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            {inv_t.sending}
                                        </>
                                    ) : (
                                        inv_t.send
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}
