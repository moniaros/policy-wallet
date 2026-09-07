import { CircleDashed, Clock3, ExternalLink, HelpCircle, ShieldAlert, ShieldCheck, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import type { CoverageStatusId, DisclosedBucket } from "@/lib/protection/coverage-status"

/**
 * The status of a coverage category as an icon AND a word — never colour
 * alone (Goal 4, WCAG 1.4.1). The semantic pairs are the design system's:
 * ok for «Φαίνεται να καλύπτεται», amber for the found gap (amber means gap,
 * nothing else), info blue for «Δεν ελέγχθηκε ακόμη», muted ink for the rest.
 * When the chip sits on a category row it carries the subject-scoped fact
 * `branch.coverageStatus`; in the summary doors it is a label only.
 */
export type ChipStatus = CoverageStatusId | Extract<DisclosedBucket, "under_review_only" | "held_elsewhere">

const CHIP: Record<ChipStatus, { icon: LucideIcon; tone: string }> = {
    appears_covered: { icon: ShieldCheck, tone: "bg-status-success-tint text-status-success" },
    finding: { icon: ShieldAlert, tone: "bg-status-warning-tint text-status-warning" },
    no_policy: { icon: CircleDashed, tone: "bg-muted text-foreground" },
    not_checked: { icon: HelpCircle, tone: "bg-status-info-tint text-status-info" },
    under_review_only: { icon: Clock3, tone: "bg-muted text-foreground" },
    held_elsewhere: { icon: ExternalLink, tone: "bg-muted text-foreground" },
}

export function CoverageStatusChip({
    status,
    label,
    subject,
    className,
}: {
    status: ChipStatus
    label: string
    /** The branch id when the chip states a row's fact; omitted in the summary doors. */
    subject?: string
    className?: string
}) {
    const { icon: Icon, tone } = CHIP[status]
    return (
        <span
            className={cn("inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-semibold [overflow-wrap:anywhere]", tone, className)}
            data-status={status}
            data-fact={subject ? "branch.coverageStatus" : undefined}
            data-fact-subject={subject}
        >
            <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
            {label}
        </span>
    )
}
