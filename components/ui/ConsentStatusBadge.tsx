/**
 * Consent-state pill for agent-collaboration surfaces: explicit consent
 * (granted), agent attestation pending activation (attested), or none.
 * Shared primitive — the label arrives pre-resolved.
 */
export type ConsentStatus = 'granted' | 'attested' | 'none'

const CONSENT_TONES: Record<ConsentStatus, string> = {
    granted: 'bg-primary-soft text-[#166534] dark:bg-primary/15 dark:text-mint',
    attested: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    none: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
}

export function ConsentStatusBadge({ status, label }: { status: ConsentStatus; label: string }) {
    return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${CONSENT_TONES[status]}`}>
            {label}
        </span>
    )
}
