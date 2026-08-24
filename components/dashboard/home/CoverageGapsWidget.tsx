import Link from "next/link"
import { ShieldAlert } from "lucide-react"
import { GAP_SEVERITIES, describeSeverity } from "@/lib/gaps/severity-display"
import { toneDotClass } from "@/components/gaps/severity-tone"

export interface GapSeverityCounts {
    critical: number
    high: number
    medium: number
    low: number
}


/** Open coverage gaps by severity — links into coverage insights. */
export function CoverageGapsWidget({
    counts,
    labels,
}: {
    counts: GapSeverityCounts
    labels: {
        kicker: string
        noGaps: string
        severity: Record<keyof GapSeverityCounts, string>
        /** Honest framing: these levels are a profile-based priority, not a risk grade. */
        /** Null when the page already states this caveat elsewhere. */
        note: string | null
        /** Accessible name for the chip group — a bare «4 υψηλά» has no subject. */
        groupLabel: string
    }
}) {
    const total = counts.critical + counts.high + counts.medium + counts.low

    return (
        <Link href="/coverage-insights" className="pw-card pw-pad">
            <div className="flex items-center justify-between">
                <p className="pw-kicker">{labels.kicker}</p>
                <ShieldAlert className="h-4 w-4 text-muted-foreground" aria-hidden />
            </div>
            <div className="mt-3">
                {total === 0 ? (
                    <p className="text-sm text-muted-foreground">{labels.noGaps}</p>
                ) : (
                    <>
                        {/* A LIST, with a name. Each chip reads «4 υψηλά» on its
                            own, which is a number and an adjective with no
                            subject; grouped and named, a screen reader announces
                            what the four are and how many kinds there are. */}
                        <div className="flex flex-wrap gap-2" role="list" aria-label={labels.groupLabel}>
                            {GAP_SEVERITIES.filter((key) => counts[key] > 0).map((key) => {
                                // Order and tone come from the primitive; this
                                // card no longer keeps its own severity table.
                                const { tone } = describeSeverity(key)
                                return (
                                    <span
                                        key={key}
                                        role="listitem"
                                        // Subject-scoped: one gap.severityCount per
                                        // severity, so four chips are four subjects,
                                        // never one key disagreeing with itself.
                                        data-count="gap.severityCount"
                                        data-count-subject={key}
                                        className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-black/5 px-3 py-1.5 text-xs font-bold text-black/70 dark:border-white/15 dark:bg-white/5 dark:text-white/75"
                                    >
                                        <span className={`h-1.5 w-1.5 rounded-full ${toneDotClass(tone)}`} aria-hidden />
                                        {counts[key]} {labels.severity[key]}
                                    </span>
                                )
                            })}
                        </div>
                        {/* "Critical/high" read as a risk verdict; the gap engine treats
                            them as a profile-based priority (the report itself omits
                            severity as "unvalidated"). This says so plainly. */}
                        {labels.note && (
                            <p className="mt-2 text-caption leading-snug text-muted-foreground">
                                {labels.note}
                            </p>
                        )}
                    </>
                )}
            </div>
        </Link>
    )
}
