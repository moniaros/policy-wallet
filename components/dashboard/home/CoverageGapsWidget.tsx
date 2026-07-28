import Link from "next/link"
import { ShieldAlert } from "lucide-react"

export interface GapSeverityCounts {
    critical: number
    high: number
    medium: number
    low: number
}

const SEVERITY_DOTS: Array<{ key: keyof GapSeverityCounts; dot: string }> = [
    { key: "critical", dot: "bg-rose-500" },
    { key: "high", dot: "bg-amber-500" },
    { key: "medium", dot: "bg-sky-500" },
    { key: "low", dot: "bg-black/30 dark:bg-white/30" },
]

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
        note: string
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
                        <div className="flex flex-wrap gap-2">
                            {SEVERITY_DOTS.filter(({ key }) => counts[key] > 0).map(({ key, dot }) => (
                                <span
                                    key={key}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-black/5 px-3 py-1.5 text-xs font-bold text-black/70 dark:border-white/15 dark:bg-white/5 dark:text-white/75"
                                >
                                    <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
                                    {counts[key]} {labels.severity[key]}
                                </span>
                            ))}
                        </div>
                        {/* "Critical/high" read as a risk verdict; the gap engine treats
                            them as a profile-based priority (the report itself omits
                            severity as "unvalidated"). This says so plainly. */}
                        <p className="mt-2 text-caption leading-snug text-muted-foreground">
                            {labels.note}
                        </p>
                    </>
                )}
            </div>
        </Link>
    )
}
