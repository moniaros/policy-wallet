import { GitCompareArrows } from "lucide-react"
import type { FieldChange, RenewalDifferential } from "@/lib/services/renewal-differential"

/**
 * Spec v2 §10.3 «compare with previous»: what the newer document changed
 * against the older one. Every line is a field path the reader can find in
 * both documents — a differential nobody can verify is a rumour.
 */
const show = (v: unknown) => (v === undefined || v === null ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v))

function Rows({ rows, kind }: { rows: FieldChange[]; kind: (c: FieldChange) => string }) {
    return (
        <ul className="mt-1 space-y-1">
            {rows.map((c) => (
                <li key={c.path} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                    <code className="text-caption text-muted-foreground">{c.path}</code>
                    <span className="text-caption text-muted-foreground">{kind(c)}</span>
                    <span className="text-foreground">{show(c.before)} → {show(c.after)}</span>
                </li>
            ))}
        </ul>
    )
}

export function RenewalDifferentialCard({ diff, locale, copy }: {
    diff: RenewalDifferential
    locale: string
    copy: { title: string; intro: string; premium: string; sums: string; terms: string; noChanges: string; added: string; removed: string; modified: string }
}) {
    const money = (n: number | null) => (n === null ? "—" : new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n))
    const kind = (c: FieldChange) => (c.kind === "added" ? copy.added : c.kind === "removed" ? copy.removed : copy.modified)
    return (
        <div className="pw-subcard p-4" data-fact="policy.renewalDifferential">
            <div className="flex items-center gap-2">
                <GitCompareArrows className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-foreground">{copy.title}</h3>
            </div>
            <p className="mt-1 text-caption text-muted-foreground">{copy.intro}</p>
            {diff.isEmpty && diff.premiumDelta === null ? (
                <p className="mt-3 text-sm text-muted-foreground">{copy.noChanges}</p>
            ) : (
                <div className="mt-3 space-y-3">
                    {diff.premiumDelta !== null && (
                        <p className="text-sm text-foreground"><span className="font-semibold">{copy.premium}:</span> {money(diff.premiumBefore)} → {money(diff.premiumAfter)}</p>
                    )}
                    {diff.sumChanges.length > 0 && <div><p className="text-sm font-semibold text-foreground">{copy.sums}</p><Rows rows={diff.sumChanges} kind={kind} /></div>}
                    {diff.termChanges.length > 0 && <div><p className="text-sm font-semibold text-foreground">{copy.terms}</p><Rows rows={diff.termChanges.slice(0, 12)} kind={kind} /></div>}
                </div>
            )}
        </div>
    )
}
