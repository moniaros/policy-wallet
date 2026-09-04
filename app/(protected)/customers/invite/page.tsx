"use client"

import { inviteCustomer } from "@/app/(protected)/agent/actions"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/contexts/LanguageContext"

import { Alert } from "@/components/ui/Alert"
import { CheckCircle2 } from "lucide-react"
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
        <div className="pw-page-shell">
            <div className="mx-auto max-w-form space-y-4 px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
                <div className="min-w-0">
                    <h1 className="text-h3 font-semibold tracking-tight text-foreground">{inv_t.title}</h1>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{inv_t.subtitle}</p>
                </div>

                {success ? (
                    <section className="pw-card pw-pad-roomy flex flex-col items-center text-center">
                        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft dark:bg-primary/15" aria-hidden="true">
                            <CheckCircle2 className="h-7 w-7 text-primary dark:text-mint" />
                        </span>
                        <h2 className="mt-4 text-title font-semibold text-foreground">{fallbackLink ? inv_t.emailFailedTitle : inv_t.successTitle}</h2>
                        <p className="mt-1 max-w-md text-sm text-muted-foreground">{fallbackLink ? inv_t.emailFailedBody : inv_t.successBody}</p>

                        {fallbackLink && (
                            <div className="pw-subcard mt-5 flex w-full items-center gap-2 p-3">
                                <code className="flex-1 truncate text-left text-caption text-foreground">{fallbackLink}</code>
                                <button
                                    type="button"
                                    onClick={() => {
                                        navigator.clipboard.writeText(fallbackLink).then(() => {
                                            setCopied(true)
                                            setTimeout(() => setCopied(false), 2000)
                                        }).catch(() => {})
                                    }}
                                    className="pw-soft-button shrink-0"
                                >
                                    {copied ? inv_t.copied : inv_t.copyLink}
                                </button>
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={() => router.push("/customers")}
                            className="pw-primary-button mt-5"
                        >
                            {inv_t.backToCustomers}
                        </button>
                    </section>
                ) : (
                    <form action={handleSubmit} className="pw-card pw-pad space-y-5">
                        <div>
                            <label htmlFor="email" className="mb-2 block text-sm font-semibold text-foreground">{inv_t.emailLabel}</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                required
                                placeholder="customer@example.com"
                                className="pw-input"
                            />
                            <p className="mt-2 text-caption text-muted-foreground">{inv_t.emailHelper}</p>
                        </div>

                        {error && (
                            <Alert variant="error">{error}</Alert>
                        )}

                        <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="pw-soft-button flex-1"
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
                                        <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
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
    )
}
