import { cn } from "@/lib/utils"

export interface LedgerLine {
    key: string
    label: string
    /** Already formatted; a count, an amount, never a percentage. */
    value: string
}

/** Ledger (§5.3, §8.8): «Τι έκανα για εσάς φέτος» — lines only for things that happened; the honest empty sentence otherwise. */
export function Ledger({ title, lines, planLine, empty, className }: { title: string; lines: LedgerLine[]; planLine?: string; empty: string; className?: string }) {
    return (
        <section aria-labelledby="ledger-title" className={cn("rounded-g-card border border-border-hair bg-surface-raised p-g-4 shadow-g-raised", className)}>
            <div className="flex items-baseline justify-between gap-g-3">
                <h2 id="ledger-title" className="text-g-heading text-fg-primary">{title}</h2>
                {planLine && <span className="text-g-app-caption tabular-nums text-fg-faint" data-fact="ledger.plan">{planLine}</span>}
            </div>
            {lines.length === 0 ? (
                <p className="mt-g-3 text-g-app-body text-fg-secondary">{empty}</p>
            ) : (
                <dl className="mt-g-3 grid gap-g-2 tablet:grid-cols-2">
                    {lines.map((l) => (
                        <div key={l.key} className="flex items-baseline justify-between gap-g-3 rounded-g-control bg-surface-base px-g-3 py-g-2">
                            <dt className="text-g-app-body-sm text-fg-secondary">{l.label}</dt>
                            <dd className="font-display text-g-heading tabular-nums lining-nums text-fg-primary" data-fact={`ledger.${l.key}`}>{l.value}</dd>
                        </div>
                    ))}
                </dl>
            )}
        </section>
    )
}
