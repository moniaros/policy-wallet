"use client"

import { AlertTriangle, CalendarClock, Link2, ShieldCheck } from "lucide-react"

import { getTranslations } from "@/lib/i18n"
import { branchLabel } from "@/lib/insurance/taxonomy"
import { conditionSeverity } from "@/lib/insurance/policy-conditions"
import type { AcordData } from "@/types/domain"

/**
 * The conditions a policy attaches to its own cover.
 *
 * Until ACORD v3 these lived nowhere: a warranty to service the engines
 * annually, an alarm that must stay linked to a monitoring centre, a
 * requirement that a separate property policy be in force. Each one is a thing
 * the customer can lose cover by not doing, and none of them appeared anywhere
 * in the product.
 *
 * The framing is deliberate. Every line here is the INSURER'S requirement read
 * back from the document — never our advice about what they ought to do. That
 * is what keeps this the description of a contract rather than a recommendation.
 */

interface Props {
    acordData: AcordData
    language: "el" | "en"
}

export function PolicyConditionsCard({ acordData, language }: Props) {
    const i18n = getTranslations(language)
    const copy = i18n.coverageDetails
    const conditions = acordData.conditions ?? []
    if (conditions.length === 0) return null

    const kindLabel = (kind: string): string => {
        const map: Record<string, string> = {
            warranty: copy.conditionKindWarranty,
            condition_precedent: copy.conditionKindConditionPrecedent,
            security_requirement: copy.conditionKindSecurity,
            maintenance: copy.conditionKindMaintenance,
            documentation: copy.conditionKindDocumentation,
            reporting: copy.conditionKindReporting,
        }
        return map[kind] ?? copy.conditionKindOther
    }

    const breachLabel = (effect: string | undefined): string => {
        switch (effect) {
            case "voids_cover":
                return copy.conditionBreachVoids
            case "suspends_cover":
                return copy.conditionBreachSuspends
            case "reduces_claim":
                return copy.conditionBreachReduces
            default:
                return copy.conditionBreachUnknown
        }
    }

    const recurrenceLabel = (recurrence: string | undefined): string | null => {
        switch (recurrence) {
            case "annual":
                return copy.conditionRecurrenceAnnual
            case "periodic":
                return copy.conditionRecurrencePeriodic
            case "continuous":
                return copy.conditionRecurrenceContinuous
            default:
                return null
        }
    }

    return (
        <section className="pw-card pw-pad space-y-4">
            <div className="flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                    <h3 className="text-caption font-semibold text-muted-foreground">{copy.conditionsTitle}</h3>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{copy.conditionsIntro}</p>
                </div>
            </div>

            <ul className="space-y-3">
                {conditions.map((condition, index) => {
                    const severity = conditionSeverity(condition)
                    const recurrence = recurrenceLabel(condition.recurrence)
                    return (
                        <li
                            key={`${condition.kind}-${index}`}
                            className="border-l-2 pl-3 border-neutral-200 dark:border-neutral-800 data-[severe=true]:border-amber-500"
                            data-severe={severity === "critical" || severity === "high"}
                        >
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="pw-pill text-xs">{kindLabel(condition.kind)}</span>
                                {recurrence ? (
                                    <span className="inline-flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                                        <CalendarClock className="h-3 w-3" aria-hidden="true" />
                                        {recurrence}
                                    </span>
                                ) : null}
                                {condition.dependsOnOtherPolicy ? (
                                    <span className="inline-flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                                        <Link2 className="h-3 w-3" aria-hidden="true" />
                                        {copy.conditionDependsOnPolicy}
                                        {": "}
                                        {branchLabel(condition.dependsOnOtherPolicy, language)}
                                    </span>
                                ) : null}
                            </div>

                            <p className="mt-1 text-sm text-foreground">
                                {condition.summary?.[language] || condition.text}
                            </p>

                            <p className="mt-1 inline-flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                                <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
                                {breachLabel(condition.breachEffect)}
                            </p>
                        </li>
                    )
                })}
            </ul>
        </section>
    )
}
