import { cn } from "@/lib/utils"

export interface MoneyCell {
    label: string
    /** Already formatted («8.224 €», «1,3 εκ. €»). Null = not found — the note says so. */
    value: string | null
    /** The honest one-liner under the figure (what «έως» means; how ≈ was derived; or «δεν βρήκα»). */
    note: string
    factKey: string
}

/** MoneyTriad (§5.3, §8.5): paid / protects up to / possibly paid twice. Figures in tabular lining numerals. */
export function MoneyTriad({ paid, protects, twice, className }: { paid: MoneyCell; protects: MoneyCell; twice: MoneyCell; className?: string }) {
    const cells = [paid, protects, twice]
    return (
        <div className={cn("@container", className)}>
        <dl className="grid gap-g-2 @xl:grid-cols-3">
            {cells.map((c) => (
                <div key={c.factKey} className="rounded-g-card border border-border-hair bg-surface-raised p-g-4">
                    <dt className="text-g-app-caption text-fg-secondary">{c.label}</dt>
                    <dd className="mt-g-1">
                        <span className="block font-display text-g-title tabular-nums lining-nums text-fg-primary" data-fact={c.factKey}>
                            {c.value ?? "—"}
                        </span>
                        <span className="mt-g-1 block text-g-app-caption text-fg-faint">{c.note}</span>
                    </dd>
                </div>
            ))}
        </dl>
        </div>
    )
}
