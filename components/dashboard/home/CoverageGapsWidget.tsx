import { ShieldAlert } from "lucide-react"
import { GAP_SEVERITIES, describeSeverity } from "@/lib/gaps/severity-display"
import { toneDotClass } from "@/components/gaps/severity-tone"
import { CardHead } from "./CardHead"

export interface GapSeverityCounts {
    critical: number
    high: number
    medium: number
    low: number
}


/**
 * Open coverage gaps by severity — a TALLY, deliberately not a link.
 *
 * This card used to wrap itself in `<Link href="/protection">`, one of the
 * four bare `/protection` offers the duplicate-actions metric gated on this
 * page (§11 metric 7). It sits in the SAME section as the attention list,
 * whose rows and «Όλες» continuation already navigate to the finding set —
 * a second, implicit whole-card link one card down offered the same act
 * again with less affordance (and put a `role="list"` inside an anchor,
 * which no screen reader announces cleanly). The numbers are the content;
 * the section's explicit links own the navigation.
 *
 * Direction A: the tally is a segmented bar of COUNTS — the reference's
 * "score" slot, filled with something a reader can check («13 υψηλά» is
 * thirteen rows) rather than a grade. `variant="embedded"` renders it inside
 * another card (the attention list); `"card"` keeps it a card of its own.
 */
export function CoverageGapsWidget({
    counts,
    labels,
    variant = "card",
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
    variant?: "card" | "embedded"
}) {
    const total = counts.critical + counts.high + counts.medium + counts.low
    const present = GAP_SEVERITIES.filter((key) => counts[key] > 0)

    const body =
        total === 0 ? (
            <p className="text-sm text-muted-foreground">{labels.noGaps}</p>
        ) : (
            <>
                {/* The bar is decoration for the numbers beneath it — proportion
                    at a glance, nothing a reader has to read from it. Colour is
                    never the only carrier: each segment's count and word sit in
                    the named list right under it. */}
                <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
                    {present.map((key) => (
                        <span
                            key={key}
                            className={`block h-full ${toneDotClass(describeSeverity(key).tone)}`}
                            style={{ width: `${(counts[key] / total) * 100}%` }}
                        />
                    ))}
                </div>
                {/* A LIST, with a name. Each chip reads «4 υψηλά» on its
                    own, which is a number and an adjective with no
                    subject; grouped and named, a screen reader announces
                    what the four are and how many kinds there are. */}
                <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5" role="list" aria-label={labels.groupLabel}>
                    {present.map((key) => {
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
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground/80 tabular-nums"
                            >
                                <span className={`h-2 w-2 rounded-full ${toneDotClass(tone)}`} aria-hidden />
                                {`${counts[key]} ${labels.severity[key]}`}
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
        )

    if (variant === "embedded") {
        return <div>{body}</div>
    }

    return (
        <div className="pw-card pw-pad">
            <CardHead icon={ShieldAlert} title={labels.kicker} as="p" />
            <div className="mt-4">{body}</div>
        </div>
    )
}
