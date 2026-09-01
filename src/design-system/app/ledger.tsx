import { cn } from "@/lib/utils"
import { Avatar } from "../primitives"

export interface LedgerLine {
    key: string
    label: string
    /** Already formatted; a count, an amount, never a percentage. */
    value: string
}

/**
 * Ledger (§5.3, §8.8): «Τι έκανα για εσάς φέτος» — lines only for things that
 * happened; the honest empty sentence otherwise.
 *
 * With `person`, the phone gets the wireframe's profile head: an avatar lifted
 * over a tinted band of the first three ledger figures, then the name. The band
 * is the SAME data as the list below it, not a second source — it promotes
 * three numbers the reader would otherwise have to go looking for. Everything
 * profile-shaped is `tablet:hidden`; from 768 up this renders exactly as before.
 */
export function Ledger({ title, lines, planLine, empty, person, className }: { title: string; lines: LedgerLine[]; planLine?: string; empty: string; person?: { name: string; subLine?: string }; className?: string }) {
    const band = person ? lines.slice(0, 3) : []
    return (
        <section aria-labelledby="ledger-title" className={cn("overflow-hidden rounded-g-card border border-border-hair bg-surface-raised", person ? "" : "p-g-4", className)}>
            {person && (
                <>
                    {band.length > 0 && (
                        <dl className="grid grid-cols-3 gap-g-2 bg-surface-sunken px-g-4 pb-g-10 pt-g-3 tablet:hidden">
                            {band.map((l) => (
                                <div key={`band-${l.key}`} className="min-w-0 text-center">
                                    <dd className="font-display text-g-heading tabular-nums lining-nums text-fg-primary">{l.value}</dd>
                                    <dt className="mt-g-1 line-clamp-2 text-g-app-label text-fg-secondary">{l.label}</dt>
                                </div>
                            ))}
                        </dl>
                    )}
                    <div className={cn("px-g-4 tablet:hidden", band.length > 0 ? "-mt-g-8" : "pt-g-4")}>
                        <Avatar name={person.name} className="size-20 text-g-title ring-4 ring-surface-raised" />
                        <p className="mt-g-2 font-display text-g-title text-fg-primary">{person.name}</p>
                        {person.subLine && <p className="text-g-app-body-sm text-fg-secondary">{person.subLine}</p>}
                    </div>
                </>
            )}
            <div className={cn(person && "px-g-4 pb-g-4 pt-g-4")}>
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
            </div>
        </section>
    )
}
