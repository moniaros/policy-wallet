"use client"

import { useState } from "react"
import { Loader2, LockOpen, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { trackJourneyEvent } from "@/lib/journey/funnel"

interface ReportUnlockCtaProps {
    policyId: string
    lockedCount: number
    copy: {
        unlockCtaPrefix: string
        unlockCtaSuffix: string
        unlockValueLine: string
        unlockTrust: string
        unlockError: string
    }
}

/**
 * THE one paid CTA of the gap report (id="gap-unlock" is also the anchor the
 * sidebar widget deep-links to). Honest by construction: the locked count is
 * the real remainder, no urgency, no countdown.
 */
export function ReportUnlockCta({ policyId, lockedCount, copy }: ReportUnlockCtaProps) {
    const [starting, setStarting] = useState(false)

    const handleUnlock = async () => {
        if (starting) return
        setStarting(true)
        trackJourneyEvent("upgrade_trigger_clicked", {
            trigger_source: "gap_report_unlock",
            feature_requested: "report_unlock",
        })
        try {
            const response = await fetch(`/api/v1/policies/${policyId}/report-unlock`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ returnTo: `/wallet/${policyId}#analysis` }),
            })
            const payload = await response.json().catch(() => null)
            const checkoutUrl = payload?.data?.checkout_url || payload?.checkout_url
            if (!response.ok || !checkoutUrl) {
                if (payload?.data?.already_unlocked || payload?.already_unlocked) {
                    window.location.reload()
                    return
                }
                toast.error(copy.unlockError)
                setStarting(false)
                return
            }
            window.location.href = checkoutUrl
        } catch {
            toast.error(copy.unlockError)
            setStarting(false)
        }
    }

    return (
        <div
            id="gap-unlock"
            className="scroll-mt-24 rounded-2xl border border-primary/25 bg-primary/5 p-4 dark:border-primary/35 dark:bg-primary/10"
        >
            <p className="text-sm font-bold text-black dark:text-white">{copy.unlockValueLine}</p>
            <button
                type="button"
                onClick={handleUnlock}
                disabled={starting}
                className="pw-primary-button mt-3 min-h-10 w-full sm:w-auto"
            >
                {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockOpen className="h-4 w-4" />}
                {copy.unlockCtaPrefix} {lockedCount} {copy.unlockCtaSuffix}
            </button>
            <p className="mt-2 flex items-center gap-1.5 text-micro text-black/50 dark:text-white/55">
                <ShieldCheck className="h-3.5 w-3.5" />
                {copy.unlockTrust}
            </p>
        </div>
    )
}
