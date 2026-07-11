"use client"

import { ShieldCheck } from "lucide-react"

/** Trust microcopy row rendered beside every payment CTA. */
export function BillingTrustBox({ text }: { text: string }) {
    return (
        <p className="flex items-start justify-center gap-1.5 text-center text-[11px] leading-relaxed text-black/45 dark:text-white/50">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary dark:text-mint" />
            {text}
        </p>
    )
}
