import Link from "next/link"
import { ArrowRight, ChevronDown, LayoutGrid, type LucideIcon } from "lucide-react"

import { CardHead } from "@/components/dashboard/home/CardHead"
import { getBranchContent } from "@/lib/insurance/content"
import { getBranchIcon } from "@/lib/insurance/branch-icons"
import { COVERAGE_FAMILY_IDS, familyOfBranch, type FamilyFilterId } from "@/lib/protection/coverage-families"
import { relevantRows, type BranchCoverageStatus, type CoverageStatusId } from "@/lib/protection/coverage-status"
import { CoverageStatusChip, type ChipStatus } from "./CoverageStatusChip"

/**
 * «Οι καλύψεις σας ανά κατηγορία» — the branch lens as scannable rows: icon ·
 * category · what it protects · status chip · the sentence that backs the
 * status · «N ασφαλιστήρια» · one door into the branch page. A family filter
 * (Όλα / Περιουσία / Υγεία / Οικογένεια / Μετακίνηση / Άλλα) narrows the rows
 * through `?family=`; the summary's doors narrow them through `?status=`.
 * Rows that neither concern the person nor hold anything wait under «Άλλες
 * κατηγορίες» — listed, never counted, never given a status word (a line the
 * person does not own is not a gap). Business lines render only when held.
 */
export interface CategoryListCopy {
    title: string
    lead: string
    view: string
    seeWhatCouldProtect: string
    otherTitle: string
    otherLead: string
    emptyFiltered: string
    clearStatus: string
    onePolicy: string
    policyCountN: string
    status: Record<ChipStatus, string>
    caveats: Record<string, string>
    filters: Record<FamilyFilterId, string> & { aria: string }
    policyTypeLabels: Record<string, string>
}

function fill(template: string, values: Record<string, string | number>): string {
    return Object.entries(values).reduce((s, [k, v]) => s.replace(`{${k}}`, String(v)), template)
}

/** The one sentence beneath a chip — what backs the word. */
export function caveatFor(row: BranchCoverageStatus, caveats: Record<string, string>): { text: string; key: "branch.checkedPoints" | "branch.openFindingCount" | null } | null {
    if (row.bucket === "under_review_only") return { text: caveats.underReviewOnly, key: null }
    if (row.bucket === "held_elsewhere") return { text: caveats.heldElsewhere, key: null }
    switch (row.status) {
        case "appears_covered": {
            const parts = [fill(caveats.checkedPoints, { covered: row.covered, checked: row.checked })]
            if (row.flags.limitsUnread) parts.push(caveats.limitsUnread)
            else if (row.indeterminate > 0) parts.push(row.indeterminate === 1 ? caveats.indeterminateOne : fill(caveats.indeterminate, { n: row.indeterminate }))
            else if (row.notRecordedCount > 0) parts.push(row.notRecordedCount === 1 ? caveats.notRecordedOne : fill(caveats.notRecorded, { n: row.notRecordedCount }))
            if (row.flags.expiringSoon) parts.push(caveats.expiringSoon)
            return { text: parts.join(" "), key: "branch.checkedPoints" }
        }
        case "finding":
            return { text: row.findingCount === 1 ? caveats.findingCountOne : fill(caveats.findingCount, { n: row.findingCount }), key: "branch.openFindingCount" }
        case "no_policy":
            return { text: row.flags.lapsedOnly ? caveats.lapsedOnly : caveats.noPolicy, key: null }
        case "not_checked":
            return { text: caveats[row.reason ?? "never_analysed"] ?? caveats.never_analysed, key: null }
        default:
            return null
    }
}

function chipOf(row: BranchCoverageStatus): ChipStatus | null {
    if (row.status) return row.status
    if (row.bucket === "under_review_only" || row.bucket === "held_elsewhere") return row.bucket
    return null
}

function filterHref(family: FamilyFilterId, status: CoverageStatusId | null): string {
    const params = new URLSearchParams()
    if (family !== "all") params.set("family", family)
    if (status) params.set("status", status)
    const query = params.toString()
    return `/protection${query ? `?${query}` : ""}#categories`
}

function CategoryRow({ row, icon: Icon, language, copy }: { row: BranchCoverageStatus; icon: LucideIcon; language: "el" | "en"; copy: CategoryListCopy }) {
    const title = copy.policyTypeLabels[row.branch.id] || row.branch.label[language]
    const tagline = getBranchContent(row.branch.id).tagline[language]
    const chip = chipOf(row)
    const caveat = caveatFor(row, copy.caveats)
    const countLabel = row.policyCount === 1 ? copy.onePolicy : copy.policyCountN.replace("{count}", String(row.policyCount))
    return (
        <li className="min-w-0" data-branch={row.branch.id} data-coverage-status={row.status ?? row.bucket ?? "neutral"}>
            <Link href={`/protection/${row.branch.id}`} className="group flex min-h-11 items-start gap-3 py-3.5 transition-colors first:pt-0">
                <span className="pw-card-chip mt-0.5" aria-hidden="true">
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-sm font-semibold text-foreground">{title}</span>
                        {chip && <CoverageStatusChip status={chip} label={copy.status[chip]} subject={row.branch.id} />}
                    </span>
                    <span className="mt-0.5 block text-caption leading-relaxed text-muted-foreground">{tagline}</span>
                    {caveat && (
                        <span
                            className="mt-1 block text-caption leading-snug text-foreground/80"
                            data-fact={caveat.key === "branch.checkedPoints" ? caveat.key : undefined}
                            data-fact-subject={caveat.key === "branch.checkedPoints" ? row.branch.id : undefined}
                            data-count={caveat.key === "branch.openFindingCount" ? caveat.key : undefined}
                            data-count-subject={caveat.key === "branch.openFindingCount" ? row.branch.id : undefined}
                        >
                            {caveat.text}
                        </span>
                    )}
                    {row.policyCount > 0 && (
                        <span className="mt-1 block text-caption font-semibold text-muted-foreground" data-count="branch.policyCount" data-count-subject={row.branch.id}>
                            {countLabel}
                        </span>
                    )}
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 self-center text-caption font-semibold text-primary group-hover:underline dark:text-mint">
                    <span className="hidden sm:inline">{row.status === "no_policy" ? copy.seeWhatCouldProtect : copy.view}</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
            </Link>
        </li>
    )
}

export function CategoryList({
    rows,
    family,
    status,
    language,
    copy,
}: {
    rows: BranchCoverageStatus[]
    family: FamilyFilterId
    status: CoverageStatusId | null
    language: "el" | "en"
    copy: CategoryListCopy
}) {
    // B-06: the business line renders only when the customer holds a policy in it.
    const rendered = (r: BranchCoverageStatus) => r.branch.segment !== "b2b" || r.policyCount > 0
    const inFamily = (r: BranchCoverageStatus) => family === "all" || familyOfBranch(r.branch.id) === family
    const main = relevantRows(rows)
        .filter(rendered)
        .filter(inFamily)
        .filter((r) => !status || r.status === status)
    const others = rows
        .filter((r) => r.status === null && r.bucket !== "under_review_only")
        .filter(rendered)
        .filter(inFamily)

    return (
        <section id="categories" aria-labelledby="protection-categories-heading" className="scroll-mt-20">
            <div className="pw-card pw-pad">
                <CardHead icon={LayoutGrid} title={copy.title} id="protection-categories-heading" />
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy.lead}</p>
                {/* The family strip scrolls rather than wraps: six Greek labels do
                    not fit 342px, and a wrapped segmented control reads as two
                    controls. */}
                <nav aria-label={copy.filters.aria} className="pw-segmented pw-scroll-strip mt-4 max-w-full">
                    {(["all", ...COVERAGE_FAMILY_IDS] as const).map((f) => (
                        <Link key={f} href={filterHref(f, status)} aria-current={f === family ? "page" : undefined} className="pw-segment min-h-11 px-4">
                            {copy.filters[f]}
                        </Link>
                    ))}
                </nav>
                {status && (
                    <p className="mt-3">
                        <Link href={filterHref(family, null)} className="pw-soft-button !min-h-9 !px-3 !text-caption" data-clear-status>
                            {copy.status[status]} · {copy.clearStatus}
                        </Link>
                    </p>
                )}
                {main.length === 0 ? (
                    <p className="mt-4 text-sm text-muted-foreground">{copy.emptyFiltered}</p>
                ) : (
                    <ul className="mt-2 divide-y divide-border" data-list="main">
                        {main.map((row) => (
                            <CategoryRow key={row.branch.id} row={row} icon={getBranchIcon(row.branch.id)} language={language} copy={copy} />
                        ))}
                    </ul>
                )}
            </div>
            {others.length > 0 && (
                <details className="pw-card mt-4 group/other">
                    <summary className="pw-pad flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
                        <span className="min-w-0">
                            <span className="block text-sm font-semibold text-foreground">{copy.otherTitle}</span>
                            <span className="mt-0.5 block text-caption leading-relaxed text-muted-foreground">{copy.otherLead}</span>
                        </span>
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open/other:rotate-180" aria-hidden="true" />
                    </summary>
                    <ul className="divide-y divide-border px-4 pb-4 sm:px-6 sm:pb-6" data-list="other">
                        {others.map((row) => (
                            <CategoryRow key={row.branch.id} row={row} icon={getBranchIcon(row.branch.id)} language={language} copy={copy} />
                        ))}
                    </ul>
                </details>
            )}
        </section>
    )
}
