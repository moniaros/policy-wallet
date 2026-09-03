"use client"

import { forwardRef, useState } from "react"
import { Check, Users } from "lucide-react"
import { toast } from "sonner"
import { redeemInviteCode } from "@/app/onboarding/actions"
import { inviteAdvisorByEmail } from "@/app/(protected)/agent/relationship-actions"
import type { TranslationKeys } from "@/lib/i18n/translations/el"

export type AdvisorLabels = TranslationKeys["onboarding"]["protectionProfile"]["advisor"]

/** The optional last screen — the existing invite mechanics, restyled. */
export const AdvisorScreen = forwardRef<HTMLHeadingElement, {
    labels: AdvisorLabels
    onFinish: (connectedAgent: string | null) => void
    busy: boolean
}>(function AdvisorScreen({ labels, onFinish, busy }, headingRef) {
    const [email, setEmail] = useState("")
    const [emailError, setEmailError] = useState<string | null>(null)
    const [sending, setSending] = useState(false)
    const [inviteSent, setInviteSent] = useState<{ link?: string } | null>(null)
    const [showCode, setShowCode] = useState(false)
    const [code, setCode] = useState("")
    const [codeError, setCodeError] = useState<string | null>(null)
    const [redeeming, setRedeeming] = useState(false)
    const [connected, setConnected] = useState<string | null>(null)

    const errorText = (key: string) => (labels.errors as Record<string, string>)[key] ?? labels.errors.generic

    const sendInvite = async () => {
        if (!email.trim() || sending) return
        setSending(true)
        setEmailError(null)
        try {
            const result = await inviteAdvisorByEmail(email.trim())
            if (result.success) {
                if (result.alreadyConnected) setConnected(email.trim())
                else setInviteSent({ link: result.inviteLink })
            } else {
                setEmailError(errorText(result.error))
            }
        } catch {
            setEmailError(labels.errors.generic)
        } finally {
            setSending(false)
        }
    }

    const redeem = async () => {
        if (!code.trim() || redeeming) return
        setRedeeming(true)
        setCodeError(null)
        try {
            const result = await redeemInviteCode(code.trim())
            if (result.success) setConnected(result.agentName || labels.advisorLabel)
            else setCodeError(errorText("error" in result ? String(result.error) : "generic"))
        } catch {
            setCodeError(labels.errors.generic)
        } finally {
            setRedeeming(false)
        }
    }

    return (
        <section aria-labelledby="protection-advisor-heading" className="pw-card pw-pad">
            <h1 id="protection-advisor-heading" ref={headingRef} tabIndex={-1} className="text-h3 font-semibold tracking-tight text-foreground outline-none">
                {labels.title}
            </h1>
            <p className="mt-2 text-body leading-relaxed text-muted-foreground">{labels.body}</p>

            {connected ? (
                <div className="pw-subcard mt-5 flex items-center gap-3 p-4">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground" aria-hidden="true">
                        <Check className="h-5 w-5" />
                    </span>
                    <div>
                        <p className="text-sm font-semibold text-foreground">{labels.connected}</p>
                        <p className="text-caption text-muted-foreground">
                            {labels.advisorLabel}: {connected}
                        </p>
                    </div>
                </div>
            ) : inviteSent ? (
                <div className="pw-subcard mt-5 p-4">
                    <p className="text-sm font-semibold text-foreground">{labels.inviteSent}</p>
                    <p className="mt-1 text-caption text-muted-foreground">{labels.inviteSentBody}</p>
                    {inviteSent.link ? (
                        <div className="mt-3">
                            <p className="text-caption text-muted-foreground">{labels.emailFailed}</p>
                            <button
                                type="button"
                                onClick={() => {
                                    navigator.clipboard?.writeText(inviteSent.link!)
                                    toast.success(labels.linkCopied)
                                }}
                                className="pw-soft-button mt-2"
                            >
                                {labels.copyLink}
                            </button>
                        </div>
                    ) : null}
                </div>
            ) : (
                <div className="mt-5 space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <label htmlFor="protection-advisor-email" className="sr-only">
                            {labels.emailPlaceholder}
                        </label>
                        <input
                            id="protection-advisor-email"
                            type="email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value)
                                setEmailError(null)
                            }}
                            onKeyDown={(e) => e.key === "Enter" && sendInvite()}
                            placeholder={labels.emailPlaceholder}
                            aria-invalid={emailError ? true : undefined}
                            aria-describedby={emailError ? "protection-advisor-email-error" : undefined}
                            className="pw-input flex-1"
                        />
                        <button type="button" onClick={sendInvite} disabled={sending || !email.trim()} className="pw-soft-button">
                            {sending ? labels.sending : labels.send}
                        </button>
                    </div>
                    {emailError ? (
                        <p id="protection-advisor-email-error" role="alert" className="text-caption text-status-danger">
                            {emailError}
                        </p>
                    ) : null}
                    <button type="button" onClick={() => setShowCode((v) => !v)} aria-expanded={showCode} className="inline-flex min-h-11 items-center text-caption font-semibold text-primary hover:underline dark:text-mint">
                        {labels.haveCode}
                    </button>
                    {showCode ? (
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <label htmlFor="protection-advisor-code" className="sr-only">
                                    {labels.codePlaceholder}
                                </label>
                                <input
                                    id="protection-advisor-code"
                                    type="text"
                                    value={code}
                                    onChange={(e) => {
                                        setCode(e.target.value)
                                        setCodeError(null)
                                    }}
                                    onKeyDown={(e) => e.key === "Enter" && redeem()}
                                    placeholder={labels.codePlaceholder}
                                    className="pw-input flex-1"
                                />
                                <button type="button" onClick={redeem} disabled={redeeming || !code.trim()} aria-label={labels.connect} className="pw-soft-button h-11 w-11 px-0">
                                    <Users className="h-4 w-4" aria-hidden="true" />
                                </button>
                            </div>
                            {codeError ? (
                                <p role="alert" className="text-caption text-status-danger">
                                    {codeError}
                                </p>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            )}

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
                <button type="button" onClick={() => onFinish(connected)} disabled={busy} className="pw-primary-button w-full sm:w-auto">
                    {labels.finish}
                </button>
                {!connected ? (
                    <button type="button" onClick={() => onFinish(null)} disabled={busy} className="pw-soft-button w-full sm:w-auto">
                        {labels.later}
                    </button>
                ) : null}
            </div>
        </section>
    )
})
