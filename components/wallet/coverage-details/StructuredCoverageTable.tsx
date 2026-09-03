"use client"

import { formatCurrency } from "@/lib/i18n/format"
import { getTranslations } from "@/lib/i18n"
import type { AcordData } from "@/types/domain"

/**
 * Coverages with their structured limits and deductibles — for every line.
 *
 * Deliberately branch-agnostic. The five hand-written panels
 * (health/motor/home/life/pet) answer questions specific to an insured object;
 * this answers the question every policy shares — how much, on what basis, and
 * what you carry first — and it renders for lines that have no typed panel at
 * all, which until now showed nothing.
 *
 * Renders only what the document stated. A coverage with no structured limits
 * falls back to the v2 free-text string; a coverage with neither shows its name
 * alone rather than an invented number.
 */

type Coverage = NonNullable<AcordData["coverages"]>[number]

interface Props {
    acordData: AcordData
    language: "el" | "en"
}

export function StructuredCoverageTable({ acordData, language }: Props) {
    const copy = getTranslations(language).coverageDetails
    const coverages = acordData.coverages ?? []
    if (coverages.length === 0) return null

    const hasStructure = coverages.some(
        (coverage) => (coverage.limits?.length ?? 0) > 0 || (coverage.deductibles?.length ?? 0) > 0
    )
    // With no structured amounts anywhere, the existing free-text coverage list
    // already says everything this table would. Rendering an empty grid beside
    // it would be noise.
    if (!hasStructure) return null

    const basisLabel = (basis: string): string => {
        const map: Record<string, string> = {
            per_claim: copy.limitsBasisPerClaim,
            per_event: copy.limitsBasisPerEvent,
            per_person: copy.limitsBasisPerPerson,
            per_item: copy.limitsBasisPerItem,
            per_location: copy.limitsBasisPerLocation,
            per_period_aggregate: copy.limitsBasisAggregate,
            daily: copy.limitsBasisDaily,
            monthly: copy.limitsBasisMonthly,
            annual: copy.limitsBasisAnnual,
        }
        return map[basis] ?? basis
    }

    const statusLabel = (status: Coverage["status"]): string | null => {
        switch (status) {
            case "included":
                return copy.coverageStatusIncluded
            case "optional_taken":
                return copy.coverageStatusOptionalTaken
            case "optional_not_taken":
                return copy.coverageStatusOptionalNotTaken
            case "excluded":
                return copy.coverageStatusExcluded
            default:
                return null
        }
    }

    // Currency is read from the document rather than assumed: the corpus holds a
    // crew benefit table written in USD, and rendering it with a euro sign would
    // overstate the cover by roughly a tenth while looking authoritative.
    const amount = (value: number | undefined, currency: string | undefined) =>
        typeof value === "number"
            ? formatCurrency(value, language, { currency: currency ?? "EUR" })
            : null

    return (
        <section className="pw-card pw-pad space-y-4">
            <h3 className="text-caption font-semibold text-muted-foreground">{copy.limitsTitle}</h3>

            <ul className="space-y-4">
                {coverages.map((coverage, index) => {
                    const limits = coverage.limits ?? []
                    const deductibles = coverage.deductibles ?? []
                    const status = statusLabel(coverage.status)
                    // A cover that was offered and not taken is the quiet cause
                    // of "but I have all-risks" — it earns a visible marker.
                    const notTaken = coverage.status === "optional_not_taken" || coverage.status === "excluded"

                    return (
                        <li
                            key={`${coverage.name}-${index}`}
                            className={notTaken ? "opacity-60" : undefined}
                        >
                            <div className="flex items-baseline justify-between gap-3">
                                <span className="text-sm font-semibold text-foreground">{coverage.name}</span>
                                {status ? <span className="pw-pill text-xs shrink-0">{status}</span> : null}
                            </div>

                            {limits.length > 0 ? (
                                <dl className="mt-2 grid gap-1">
                                    {limits.map((limit, limitIndex) => (
                                        <div key={limitIndex} className="flex items-baseline justify-between gap-3 text-sm">
                                            <dt className="text-neutral-500 dark:text-neutral-400">
                                                {limit.appliesTo || basisLabel(limit.basis)}
                                            </dt>
                                            <dd className="font-medium text-foreground tabular-nums">
                                                {limit.unlimited
                                                    ? copy.limitUnlimited
                                                    : amount(limit.amount, limit.currency) ?? "—"}
                                                {limit.appliesTo ? (
                                                    <span className="ml-1 text-xs font-normal text-neutral-500 dark:text-neutral-400">
                                                        {basisLabel(limit.basis)}
                                                    </span>
                                                ) : null}
                                            </dd>
                                        </div>
                                    ))}
                                </dl>
                            ) : coverage.limit ? (
                                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{coverage.limit}</p>
                            ) : null}

                            {deductibles.length > 0 ? (
                                <dl className="mt-2 grid gap-1 border-t border-neutral-200 dark:border-neutral-800 pt-2">
                                    {deductibles.map((deductible, deductibleIndex) => (
                                        <div key={deductibleIndex} className="flex items-baseline justify-between gap-3 text-sm">
                                            <dt className="text-neutral-500 dark:text-neutral-400">
                                                {copy.deductibleLabel}
                                                {deductible.appliesTo ? ` — ${deductible.appliesTo}` : ""}
                                            </dt>
                                            <dd className="font-medium text-foreground tabular-nums">
                                                {amount(deductible.amount, deductible.currency) ??
                                                    (typeof deductible.minimum === "number"
                                                        ? `${copy.deductibleMinimum} ${amount(deductible.minimum, deductible.currency)}`
                                                        : "—")}
                                            </dd>
                                        </div>
                                    ))}
                                </dl>
                            ) : null}

                            {typeof coverage.coinsurancePercent === "number" ? (
                                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                                    {copy.coinsuranceLabel}: {coverage.coinsurancePercent}%
                                </p>
                            ) : null}

                            {typeof coverage.waitingPeriodDays === "number" ? (
                                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                                    {copy.waitingPeriodLabel}: {coverage.waitingPeriodDays} {copy.waitingPeriodDays}
                                </p>
                            ) : null}
                        </li>
                    )
                })}
            </ul>

            {acordData.deductibleResolution === "largest_applies" ? (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{copy.deductibleLargestApplies}</p>
            ) : acordData.deductibleResolution === "cumulative" ? (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{copy.deductibleCumulative}</p>
            ) : null}
        </section>
    )
}
