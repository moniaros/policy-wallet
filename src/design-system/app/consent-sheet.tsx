"use client"

import { Button, Tag } from "../primitives"
import { Sheet } from "../sheet"
import { Switch } from "../switch"

/**
 * ConsentSheet (§5.3, §8.7, §8.9): what will be sent as chips, ONE sentence,
 * ONE switch, no legal wall. Confirm is inert until the switch is on. The
 * sentence is rendered verbatim from the catalogue key the caller names
 * (Article 9: `common.aiConsentBody`, A-14) — never paraphrased here.
 */
export function ConsentSheet({
    open,
    onClose,
    title,
    chips,
    sentence,
    plainWords,
    switchLabel,
    checked,
    onCheckedChange,
    confirm,
    cancelLabel,
    closeLabel,
    busy,
}: {
    open: boolean
    onClose: () => void
    title: string
    chips: string[]
    sentence: string
    /** «τι σημαίνει» — the plain-words line under the sentence. */
    plainWords?: string
    switchLabel: string
    checked: boolean
    onCheckedChange: (v: boolean) => void
    confirm: { label: string; onConfirm: () => void | Promise<void> }
    cancelLabel: string
    closeLabel: string
    busy?: boolean
}) {
    return (
        <Sheet open={open} onClose={onClose} title={title} closeLabel={closeLabel}>
            <ul className="flex flex-wrap gap-g-2" aria-label={title}>
                {chips.map((c) => (
                    <li key={c}><Tag>{c}</Tag></li>
                ))}
            </ul>
            <p className="mt-g-4 text-g-app-body text-fg-primary" data-fact="consent.sentence">{sentence}</p>
            {plainWords && <p className="mt-g-2 text-g-app-body-sm text-fg-secondary">{plainWords}</p>}
            <Switch checked={checked} onCheckedChange={onCheckedChange} label={switchLabel} className="mt-g-3" />
            <div className="mt-g-4 flex justify-end gap-g-2">
                <Button variant="secondary" onClick={onClose}>{cancelLabel}</Button>
                <Button disabled={!checked || busy} loading={busy} onClick={() => confirm.onConfirm()}>{confirm.label}</Button>
            </div>
        </Sheet>
    )
}
