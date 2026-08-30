import { BROKER_SCAN_ROWS, BROKER_SCAN_STRINGS } from "@/lib/marketing/broker-band"
import { pick, type MarketingLocale } from "@/lib/marketing/positioning"
import { STATE_LABELS, StatusChip } from "./primitives"
import { cn } from "@/lib/utils"

/**
 * BrokerScanPanel (§4.7) — the sample portfolio scan. Fictional role-labelled
 * clients under a permanent stamp; states through the three-state system (a
 * severity scale is an underwriting verdict, and samples do not hand those
 * out). Server component: static markup, no JS shipped.
 */
export function BrokerScanPanel({ locale, className }: { locale: MarketingLocale; className?: string }) {
    const S = BROKER_SCAN_STRINGS
    return (
        <div
            aria-label={pick(S.panelLabel, locale)}
            className={cn("rounded-g-lg border border-border-subtle bg-surface-raised p-g-5", className)}
        >
            <p className="text-g-label font-semibold uppercase tracking-[0.1em] text-fg-secondary">
                {pick(S.stamp, locale)}
            </p>
            <ul className="mt-g-4 divide-y divide-border-subtle">
                {BROKER_SCAN_ROWS.map((row, i) => (
                    <li key={i} className="flex flex-col gap-g-2 py-g-4 sm:flex-row sm:items-start sm:gap-g-4">
                        <div className="w-40 flex-none">
                            <p className="text-g-body-sm font-semibold text-fg-primary">{pick(row.client, locale)}</p>
                            <p className="text-g-caption text-fg-secondary">{pick(row.lines, locale)}</p>
                        </div>
                        <StatusChip state={row.state} className="flex-none">{pick(STATE_LABELS[row.state], locale)}</StatusChip>
                        <p className="text-g-body-sm text-fg-secondary">{pick(row.finding, locale)}</p>
                    </li>
                ))}
            </ul>
        </div>
    )
}
