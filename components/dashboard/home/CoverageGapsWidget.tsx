import Link from "next/link"
import { ShieldAlert } from "lucide-react"
import { CardHead } from "./CardHead"

/**
 * Open findings by PROVENANCE class (B3) — a tally, deliberately not a ranking.
 *
 * Only classified findings are counted: legal requirements, contractual
 * requirements, market practice. Findings still under review are never
 * counted in a summary; when they are the only findings, the tile says that
 * they exist and where to read them, without a number. Severity is not an
 * input anywhere here (B1): no colour, no order, no chip carries it.
 */
export interface GapProvenanceCounts {
    legislative: number
    contractual: number
    market: number
    underReview: number
}

const CLASSIFIED = ["legislative", "contractual", "market"] as const

export function CoverageGapsWidget({
    counts,
    assessment,
    labels,
    variant = "card",
}: {
    counts: GapProvenanceCounts
    /** B1.5: how many policies the tally can speak for, and how many it excludes. */
    assessment?: { assessedPolicies: number; excludedPolicies: number }
    labels: {
        kicker: string
        noGaps: string
        noGapsAmongAssessedOne?: string
        noGapsAmongAssessedMany?: string
        assessmentExcludedOne?: string
        assessmentExcludedMany?: string
        noGapsNothingAssessed?: string
        provenance: Record<(typeof CLASSIFIED)[number], string>
        /** «Τα ευρήματα υπό αξιολόγηση δεν περιλαμβάνονται σε αυτή τη σύνοψη…» */
        underReviewOmitted: string
        underReviewLink: string
        note: string | null
        groupLabel: string
    }
    variant?: "card" | "embedded"
}) {
    const classified = counts.legislative + counts.contractual + counts.market
    const present = CLASSIFIED.filter((key) => counts[key] > 0)

    const zeroLine = (() => {
        if (!assessment) return <p className="text-sm text-muted-foreground">{labels.noGaps}</p>
        const { assessedPolicies, excludedPolicies } = assessment
        if (assessedPolicies === 0) {
            return (
                <p className="text-sm text-muted-foreground" data-assessment-state="nothing_assessed">
                    {labels.noGapsNothingAssessed ?? labels.noGaps}
                </p>
            )
        }
        const among =
            assessedPolicies === 1
                ? labels.noGapsAmongAssessedOne ?? labels.noGaps
                : (labels.noGapsAmongAssessedMany ?? labels.noGaps).replace("{assessed}", String(assessedPolicies))
        const excluded =
            excludedPolicies === 0
                ? null
                : excludedPolicies === 1
                  ? labels.assessmentExcludedOne ?? null
                  : (labels.assessmentExcludedMany ?? null)?.replace("{excluded}", String(excludedPolicies)) ?? null
        return (
            <p className="text-sm text-muted-foreground" data-assessment-state="assessed">
                <span data-count="portfolio.assessedCount">{among}</span>
                {excluded && (
                    <>
                        {" "}
                        <span data-count="portfolio.unassessedCount">{excluded}</span>
                    </>
                )}
            </p>
        )
    })()

    // Findings under review exist but are not counted: say so, and point at
    // the place that shows them. No number — a count would be a summary.
    const underReviewLine =
        counts.underReview > 0 ? (
            <p className="text-sm text-muted-foreground" data-fact="gap.underReviewOmitted" data-assessment-state="under_review_present">
                {labels.underReviewOmitted}{" "}
                <Link href="/protection" className="font-medium text-foreground underline underline-offset-2">
                    {labels.underReviewLink}
                </Link>
            </p>
        ) : null

    const body =
        classified === 0 ? (
            underReviewLine ?? zeroLine
        ) : (
            <>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5" role="list" aria-label={labels.groupLabel}>
                    {present.map((key) => (
                        <span
                            key={key}
                            role="listitem"
                            data-count="gap.provenanceCount"
                            data-count-subject={key}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground/80 tabular-nums"
                        >
                            {`${counts[key]} ${labels.provenance[key]}`}
                        </span>
                    ))}
                </div>
                {underReviewLine && <div className="mt-2">{underReviewLine}</div>}
                {labels.note && <p className="mt-2 text-caption leading-snug text-muted-foreground">{labels.note}</p>}
            </>
        )

    if (variant === "embedded") {
        return <div>{body}</div>
    }

    return (
        <div className="pw-card pw-pad">
            <CardHead icon={ShieldAlert} title={labels.kicker} as="p" />
            <div className="mt-3">{body}</div>
        </div>
    )
}
