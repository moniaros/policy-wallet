"use client"

import { useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button, buttonClassName } from "../primitives"
import { Sheet } from "../sheet"
import { KindChip } from "./rows"
import type { RenderableFinding, DismissReason } from "@/lib/app/finding"

export interface FindingCardLabels {
    kind: string
    sourceLabel: string
    open: string
    help: string
    dismiss: string
    dismissTitle: string
    dismissConfirm: string
    close: string
    cancel: string
    reasons: ReadonlyArray<{ value: DismissReason; label: string }>
}

/**
 * FindingCard (§8.2): the full anatomy, and it CANNOT render without every
 * required field — the prop type is `RenderableFinding`, a value only the
 * specificity gate (`toRenderableFinding`) can produce. Sentence, source line
 * and why-you arrive resolved from the catalogue (typed fields composed by
 * the page; never model prose). `whyYou` is optional and never generic: absent
 * means the block is absent, not a template sentence.
 */
export function FindingCard({
    finding,
    sentence,
    sourceLine,
    whyYou,
    renewalChecks,
    trailing,
    openHref,
    helpHref,
    onDismiss,
    labels,
    className,
}: {
    finding: RenderableFinding
    sentence: string
    /** «Ασφαλιστήριο κατοικίας · σελ. 4» / «… · ενότητα καλύψεων — δεν αναφέρεται» — composed by the page from the source pointer. */
    sourceLine: string
    whyYou?: string
    /** «Βρήκα 2 σημεία…» — rendered only when the model counted real findings. */
    renewalChecks?: string
    /** «8 ημέρες» for an expiry; nothing otherwise. */
    trailing?: string
    openHref: string
    helpHref: string
    onDismiss?: (reason: DismissReason) => void | Promise<void>
    labels: FindingCardLabels
    className?: string
}) {
    const [sheet, setSheet] = useState(false)
    const [reason, setReason] = useState<DismissReason | null>(null)
    const [busy, setBusy] = useState(false)
    return (
        <article
            data-finding-id={finding.id}
            data-finding-hash={finding.hash}
            className={cn("rounded-g-card border border-border-hair bg-surface-raised p-g-4 shadow-g-raised", className)}
            aria-labelledby={`finding-${finding.id}-title`}
        >
            <div className="flex items-start justify-between gap-g-3">
                <KindChip kind={finding.kind} label={labels.kind} />
                {trailing && <span className="text-g-app-body-sm tabular-nums text-fg-secondary">{trailing}</span>}
            </div>
            <h3 id={`finding-${finding.id}-title`} className="mt-g-3 text-g-row text-fg-primary">{sentence}</h3>
            <p className="mt-g-2 text-g-app-body-sm text-fg-secondary">
                <span className="font-semibold text-fg-faint">{labels.sourceLabel} </span>
                <span data-fact="finding.source">{sourceLine}</span>
            </p>
            {whyYou && <p className="mt-g-2 text-g-app-body-sm text-fg-primary">{whyYou}</p>}
            {renewalChecks && <p className="mt-g-2 text-g-app-body-sm text-fg-primary" data-fact="finding.renewalChecks">{renewalChecks}</p>}
            <div className="mt-g-4 flex flex-wrap gap-g-2">
                <Link href={openHref} className={buttonClassName({ variant: "secondary", size: "sm" })}>{labels.open}</Link>
                <Link href={helpHref} className={buttonClassName({ variant: "ghost", size: "sm" })}>{labels.help}</Link>
                {onDismiss && (
                    <Button variant="ghost" size="sm" onClick={() => setSheet(true)}>
                        {labels.dismiss}
                    </Button>
                )}
            </div>
            {onDismiss && (
                <Sheet open={sheet} onClose={() => setSheet(false)} title={labels.dismissTitle} closeLabel={labels.close}>
                    <div role="radiogroup" aria-label={labels.dismissTitle} className="flex flex-col gap-g-2">
                        {labels.reasons.map((r) => (
                            <button
                                key={r.value}
                                type="button"
                                role="radio"
                                aria-checked={reason === r.value}
                                onClick={() => setReason(r.value)}
                                className={cn(
                                    "g-row-press flex min-h-12 items-center gap-g-3 rounded-g-control border px-g-3 text-start text-g-app-body focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[2px] focus-visible:outline-border-focus",
                                    reason === r.value ? "border-action-primary-bg bg-surface-sunken text-fg-primary" : "border-border-subtle text-fg-primary"
                                )}
                            >
                                <span aria-hidden className={cn("size-4 rounded-g-pill border-2", reason === r.value ? "border-action-primary-bg bg-action-primary-bg" : "border-border-strong")} />
                                {r.label}
                            </button>
                        ))}
                    </div>
                    <div className="mt-g-4 flex justify-end gap-g-2">
                        <Button variant="secondary" onClick={() => setSheet(false)}>{labels.cancel}</Button>
                        <Button
                            disabled={!reason || busy}
                            loading={busy}
                            onClick={async () => {
                                if (!reason) return
                                setBusy(true)
                                try { await onDismiss(reason) } finally { setBusy(false); setSheet(false) }
                            }}
                        >
                            {labels.dismissConfirm}
                        </Button>
                    </div>
                </Sheet>
            )}
        </article>
    )
}
