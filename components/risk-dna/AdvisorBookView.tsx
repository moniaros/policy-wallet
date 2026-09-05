"use client"

/**
 * The advisor's book, ranked by advisory impact.
 *
 * **Not a lead queue.** The order is where an advisor's time does the most good
 * — protection recoverable, exposure standing open, how many people a gap
 * reaches, and how much only a human can settle. Conversion likelihood is not a
 * factor, so the household that never logs in and needs help most no longer
 * sinks to the bottom.
 *
 * Every row answers the same five questions the customer's own surfaces do,
 * phrased for the advisor.
 */

import Link from "next/link"
import { AlertTriangle, TrendingDown, Users } from "lucide-react"
import type { Bilingual } from "@/lib/services/gap-engine/risk-types"

interface HouseholdView {
    userId: string
    name: string
    impact: number
    factors: { recoverable: number; exposure: number; reach: number; unresolved: number }
    whatChanged: Bilingual | null
    whyItMatters: Bilingual
    nextAction: Bilingual
    howItImproves: Bilingual
    confidence: "high" | "medium" | "low"
    healthIndex: number | null
    dependantCount: number
}

export interface AdvisorBookViewProps {
    language: "en" | "el"
    overview: {
        householdCount: number
        peopleCovered: number
        urgentHouseholds: number
        recoverablePoints: number
        unknownHouseholds: number
        medianHealth: number | null
        whatChanged: Bilingual | null
        whyItMatters: Bilingual
        nextAction: Bilingual
    }
    households: HouseholdView[]
    totalCustomers: number
    truncated: boolean
}

export function AdvisorBookView({
    language,
    overview,
    households,
    totalCustomers,
    truncated,
}: AdvisorBookViewProps) {
    const lang = language
    const t = (el: string, en: string) => (lang === "el" ? el : en)

    return (
        <div className="space-y-6">
            {/* ── Executive view ────────────────────────────────────── */}
            <div className="pw-card pw-pad">
                <p className="text-caption font-semibold text-muted-foreground">{t("Το χαρτοφυλάκιό σας", "Your book")}</p>

                {/* Every figure is a protection measure. Policies, premium and
                    conversion are measures of the seller; these are measures of
                    whether the book is doing its job. */}
                <dl className="mt-3 grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 lg:grid-cols-4">
                    <Stat label={t("Νοικοκυριά", "Households")} value={overview.householdCount} />
                    <Stat label={t("Άτομα που καλύπτονται", "People covered")} value={overview.peopleCovered} />
                    <Stat label={t("Επείγοντα", "Need attention")} value={overview.urgentHouseholds} tone="warn" />
                    <Stat
                        label={t("Ανακτήσιμες μονάδες", "Recoverable points")}
                        value={overview.recoverablePoints}
                        tone="good"
                    />
                </dl>

                <p className="mt-3 text-caption leading-relaxed text-black/70 dark:text-white/70">
                    {overview.whyItMatters[lang] || overview.whyItMatters.en}
                </p>
                {overview.whatChanged && (
                    <p className="mt-1 text-caption leading-relaxed text-amber-700 dark:text-amber-400">
                        {overview.whatChanged[lang] || overview.whatChanged.en}
                    </p>
                )}
                <p className="mt-1.5 text-caption font-semibold text-primary dark:text-mint">
                    {overview.nextAction[lang] || overview.nextAction.en}
                </p>

                {truncated && (
                    <p className="mt-3 border-t border-black/8 pt-2 text-caption text-muted-foreground dark:border-white/10">
                        {t(
                            `Βαθμολογήθηκαν ${households.length} από ${totalCustomers} νοικοκυριά.`,
                            `Scored ${households.length} of ${totalCustomers} households.`,
                        )}
                    </p>
                )}
            </div>

            {/* ── The queue ─────────────────────────────────────────── */}
            <div className="pw-card pw-pad">
                <h2 className="text-lg font-semibold text-black dark:text-white">
                    {t("Πού έχει τη μεγαλύτερη αξία ο χρόνος σας", "Where your time does the most good")}
                </h2>
                <p className="text-caption text-muted-foreground">
                    {t(
                        "Ταξινόμηση κατά συμβουλευτικό αντίκτυπο — όχι κατά πιθανότητα πώλησης.",
                        "Ordered by advisory impact — not by how likely they are to buy.",
                    )}
                </p>

                {households.length === 0 ? (
                    <p className="mt-3 text-sm text-muted-foreground">
                        {t("Δεν υπάρχουν συνδεδεμένα νοικοκυριά ακόμη.", "No connected households yet.")}
                    </p>
                ) : (
                    <ul className="mt-4 space-y-3">
                        {households.map((household) => (
                            <li
                                key={household.userId}
                                className="rounded-2xl border border-black/10 p-3.5 dark:border-white/12 sm:p-4"
                            >
                                <div className="flex items-start gap-3">
                                    <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold tabular-nums text-foreground">
                                        {household.impact}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <Link
                                            href={`/customers/${household.userId}`}
                                            className="block text-sm font-semibold text-black hover:underline dark:text-white [overflow-wrap:anywhere]"
                                        >
                                            {household.name}
                                        </Link>

                                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
                                            {household.dependantCount > 0 && (
                                                <span className="inline-flex items-center gap-1">
                                                    <Users className="h-3 w-3" aria-hidden="true" />
                                                    {household.dependantCount}
                                                </span>
                                            )}
                                            {household.factors.exposure >= 40 && (
                                                <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                                                    <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                                                    {t("Επείγον", "Urgent")}
                                                </span>
                                            )}
                                            {household.whatChanged && (
                                                <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                                                    <TrendingDown className="h-3 w-3" aria-hidden="true" />
                                                    {t("Υποχώρησε", "Moved back")}
                                                </span>
                                            )}
                                            {/* F2: the household index (0-100) is computed, never rendered. */}
                                        </div>

                                        <p className="mt-1.5 text-caption leading-relaxed text-black/70 dark:text-white/70 [overflow-wrap:anywhere]">
                                            {household.whyItMatters[lang] || household.whyItMatters.en}
                                        </p>
                                        <p className="mt-1 text-caption font-semibold text-primary dark:text-mint [overflow-wrap:anywhere]">
                                            {household.nextAction[lang] || household.nextAction.en}
                                        </p>
                                        <p className="mt-1 text-caption leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                                            {household.howItImproves[lang] || household.howItImproves.en}
                                        </p>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}

function Stat({
    label,
    value,
    tone,
}: {
    label: string
    value: number
    tone?: "good" | "warn"
}) {
    const toneClass =
        tone === "good"
            ? "text-primary dark:text-mint"
            : tone === "warn" && value > 0
              ? "text-red-600 dark:text-red-400"
              : "text-black dark:text-white"
    return (
        <div className="pw-subcard px-3 py-2">
            <dt className="text-caption text-muted-foreground">{label}</dt>
            <dd className={`text-lg font-bold tabular-nums ${toneClass}`}>{value}</dd>
        </div>
    )
}
