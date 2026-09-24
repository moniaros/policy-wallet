"use client"

import { useState } from "react"
import { Printer, Share2 } from "lucide-react"

/** Web Share where it exists, the clipboard where it does not, print always. */
export function ShareCardButton({ title, copy }: { title: string; copy: { share: string; print: string; copied: string } }) {
    const [copied, setCopied] = useState(false)
    const share = async () => {
        const url = window.location.href
        try {
            if (navigator.share) await navigator.share({ title, url })
            else { await navigator.clipboard.writeText(url); setCopied(true) }
        } catch { /* dismissed */ }
    }
    return (
        <>
            <button type="button" onClick={share} className="pw-soft-button inline-flex items-center gap-1">
                <Share2 className="h-4 w-4" aria-hidden="true" />{copied ? copy.copied : copy.share}
            </button>
            <button type="button" onClick={() => window.print()} className="pw-soft-button inline-flex items-center gap-1">
                <Printer className="h-4 w-4" aria-hidden="true" />{copy.print}
            </button>
        </>
    )
}
