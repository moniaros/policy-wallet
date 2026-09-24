"use client"

import { useState } from "react"
import { Copy, ExternalLink, Phone } from "lucide-react"
import { recordPartnerReferral } from "@/app/(protected)/benefits/actions"

/**
 * A partner offer's action, recording that the person used it (owner decision
 * 2026-09-24). The record is fire-and-forget: the link or call proceeds
 * whether or not it lands — using the offer never waits on our bookkeeping.
 */
export function TrackedOfferAction({ offerId, method, url, phone, code, labels }: {
    offerId: string
    method: "link" | "code" | "phone"
    url?: string | null
    phone?: string | null
    code?: string | null
    labels: { visit: string; call: string; useCode: string; copy: string; copied: string }
}) {
    const [copied, setCopied] = useState(false)
    const record = () => { void recordPartnerReferral({ offerId, method }).catch(() => undefined) }

    if (method === "link" && url) {
        return (
            <a href={url} target="_blank" rel="noopener noreferrer" className="pw-soft-button" onClick={record}>
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                {labels.visit}
            </a>
        )
    }
    if (method === "phone" && phone) {
        return (
            <a href={`tel:${phone.replace(/ /g, "")}`} className="pw-soft-button" onClick={record}>
                <Phone className="h-4 w-4" aria-hidden="true" />
                {labels.call}
            </a>
        )
    }
    if (method === "code" && code) {
        return (
            <span className="inline-flex min-h-11 flex-wrap items-center gap-1.5 text-sm text-foreground">
                {labels.useCode}:{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-caption text-foreground">{code}</code>
                <button
                    type="button"
                    className="pw-soft-button"
                    onClick={() => {
                        record()
                        try { void navigator.clipboard.writeText(code); setCopied(true) } catch { /* clipboard unavailable */ }
                    }}
                >
                    <Copy className="h-4 w-4" aria-hidden="true" />
                    {copied ? labels.copied : labels.copy}
                </button>
            </span>
        )
    }
    return null
}
