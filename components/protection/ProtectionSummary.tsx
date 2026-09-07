import Link from "next/link"
import { Eye } from "lucide-react"

import { CardHead } from "@/components/dashboard/home/CardHead"
import type { CoverageStatusId, CoverageStatusSummary } from "@/lib/protection/coverage-status"
import { CoverageStatusChip } from "./CoverageStatusChip"

/**
 * «Η εικόνα σας με μια ματιά» — the first answer to «Είμαι καλά
 * προστατευμένος/η;», as four counted doors over the categories that concern
 * the person. No verdict word, no score: each door is a status the module
 * can prove (lib/protection/coverage-status.ts), a number, and a one-line
 * meaning; the number links to the category list filtered by that status,
 * so every count is a door. The denominator is stated once, in words, and
 * the branches the four do not count are disclosed as sentences beneath —
 * findings still under review, cover the person declared elsewhere.
 */
export interface ProtectionSummaryCopy {
    title: string
    denominatorExpected: string
    denominatorHeldOnly: string
    underReviewOnly: string
    underReviewOnlyOne: string
    notRecorded: string
    notRecordedOne: string
    heldElsewhere: string
    meaning: Record<CoverageStatusId, string>
    status: Record<CoverageStatusId, string>
}

const DOORS: ReadonlyArray<{ status: CoverageStatusId; field: "appearsCovered" | "finding" | "noPolicy" | "notChecked"; countKey: string }> = [
    { status: "appears_covered", field: "appearsCovered", countKey: "branch.coveredCount" },
    { status: "finding", field: "finding", countKey: "branch.findingCount" },
    { status: "no_policy", field: "noPolicy", countKey: "branch.noPolicyCount" },
    { status: "not_checked", field: "notChecked", countKey: "branch.notCheckedCount" },
]

export function ProtectionSummary({
    summary,
    heldElsewhereLabels,
    copy,
}: {
    summary: CoverageStatusSummary
    heldElsewhereLabels: string[]
    copy: ProtectionSummaryCopy
}) {
    if (summary.relevantCount === 0 && summary.heldElsewhere === 0) return null
    const template = summary.hasExpectedLines ? copy.denominatorExpected : copy.denominatorHeldOnly
    const [before = "", after = ""] = template.split("{n}")
    const underReview =
        summary.underReviewOnly === 1
            ? copy.underReviewOnlyOne
            : copy.underReviewOnly.replace("{n}", String(summary.underReviewOnly))
    // A recording-class finding («δεν καταγράφεται») changes no status, so «Μερική
    // κάλυψη 0» can sit above a findings list that is not empty. Say so, once, as a
    // door to the findings — never as a fifth status.
    const notRecorded =
        summary.notRecorded === 1 ? copy.notRecordedOne : copy.notRecorded.replace("{n}", String(summary.notRecorded))

    return (
        <section id="summary" aria-labelledby="protection-summary-heading" className="pw-card pw-pad scroll-mt-20">
            <CardHead icon={Eye} title={copy.title} id="protection-summary-heading" />
            {/* The denominator, once, as a door to the whole list. Its first
                numeral is the count the scan reads. */}
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                <Link href="#categories" data-count="branch.relevantCount" className="-my-2.5 inline-flex min-h-11 items-center hover:underline">
                    {before}
                    <span className="mx-1 font-semibold tabular-nums text-foreground">{summary.relevantCount}</span>
                    {after}
                </Link>
            </p>
            <ul className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
                {DOORS.map((door) => (
                    <li key={door.status} className="min-w-0">
                        <Link
                            href={`/protection?status=${door.status}#categories`}
                            data-count={door.countKey}
                            className="pw-subcard flex min-h-11 flex-col gap-2 p-3.5 transition-colors"
                        >
                            <span className="text-title font-semibold leading-none tabular-nums text-foreground">{summary[door.field]}</span>
                            <CoverageStatusChip status={door.status} label={copy.status[door.status]} className="w-fit" />
                            <span className="text-caption leading-snug text-muted-foreground">{copy.meaning[door.status]}</span>
                        </Link>
                    </li>
                ))}
            </ul>
            {(summary.underReviewOnly > 0 || summary.notRecorded > 0 || heldElsewhereLabels.length > 0) && (
                <div className="mt-4 space-y-1 text-caption leading-relaxed text-muted-foreground">
                    {summary.notRecorded > 0 && (
                        <p>
                            <Link href="#gaps" data-count="branch.notRecordedCount" className="hover:underline">
                                {notRecorded}
                            </Link>
                        </p>
                    )}
                    {summary.underReviewOnly > 0 && (
                        <p>
                            <Link href="#categories" data-count="branch.underReviewOnlyCount" className="hover:underline">
                                {underReview}
                            </Link>
                        </p>
                    )}
                    {heldElsewhereLabels.length > 0 && <p>{copy.heldElsewhere.replace("{list}", heldElsewhereLabels.join(", "))}</p>}
                </div>
            )}
        </section>
    )
}
