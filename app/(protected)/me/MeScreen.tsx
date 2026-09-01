"use client"

import { LifeBuoy, type LucideIcon } from "lucide-react"
import { SETTINGS_ICONS } from "@/lib/settings/section-icons"
import type { SettingsSectionId } from "@/lib/settings/sections"
import { useEffect } from "react"
import Link from "next/link"
import { useLanguage } from "@/contexts/LanguageContext"
import { formatPlural } from "@/lib/i18n/plural"
import { trackJourneyEvent } from "@/lib/journey/funnel"
import type { LedgerCounts } from "@/lib/app/ledger"
import type { HouseholdModel } from "@/lib/app/household-model"
import { AppSection, GroupedList, Row } from "@/src/design-system/app-layout"
import { StatusChip, buttonClassName } from "@/src/design-system/primitives"
import { Ledger, type LedgerLine } from "@/src/design-system/app"

export interface MeSections {
    id: string
    href: string
    label: string
    description: string
}

/**
 * /me — «Εσείς» (§8.9): the ledger first (what the product DID, from events —
 * or the honest empty sentence), the household, then the settings list from
 * the one registry. The plan price sits beside the ledger without commentary.
 */
/** The wireframe's leading icon block, at settings scale. */
function SettingsTile({ icon: Icon }: { icon: LucideIcon }) {
    return (
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-g-control bg-surface-sunken text-fg-secondary tablet:hidden">
            <Icon className="size-5" strokeWidth={1.8} />
        </span>
    )
}

export function MeScreen({ ledger, household, sections, planLine }: { ledger: LedgerCounts; household: HouseholdModel; sections: MeSections[]; planLine: string; /** Optional: without it the ledger renders exactly as it did before. */ user?: { name: string } }) {
    const { t, language: lang } = useLanguage()
    const me = t.app.me
    const stateLabels = { covered: t.app.state.covered, gap: t.app.state.gap, review: t.app.state.review }

    useEffect(() => {
        try {
            if (sessionStorage.getItem("pw:ledger-viewed")) return
            sessionStorage.setItem("pw:ledger-viewed", "1")
        } catch { /* storage unavailable */ }
        trackJourneyEvent("plan.viewed_ledger", { tier: planLine })
    }, [planLine])

    const lines: LedgerLine[] = (Object.keys(me.ledger) as Array<keyof typeof me.ledger>)
        .filter((key) => ledger[key] > 0)
        .map((key) => ({ key, label: formatPlural(me.ledger[key], { count: ledger[key] }, lang), value: String(ledger[key]) }))

    return (
        <>
            <div className="px-g-4 pt-g-2 tablet:px-0">
                <Ledger title={formatPlural(me.ledgerTitle, { year: ledger.year }, lang)} lines={lines} planLine={planLine} empty={me.ledgerEmpty} />
            </div>

            {household.enabled && (
                <AppSection id="household" title={t.settings.nav.household.label}>
                    {household.people.length === 0 ? (
                        <p className="text-g-app-body-sm text-fg-secondary">{me.household.empty}</p>
                    ) : (
                        <GroupedList label={t.settings.nav.household.label}>
                            {household.people.map((p) => (
                                <Row key={p.id} href={`/me/household/${p.id}`} primary={p.name} secondary={[me.household.relations[p.relation as keyof typeof me.household.relations] ?? p.relation, formatPlural(t.app.household.policies, { count: p.policyCount }, lang)].filter(Boolean).join(" · ")} trailing={<StatusChip state={p.state}>{stateLabels[p.state]}</StatusChip>} />
                            ))}
                        </GroupedList>
                    )}
                    <Link href="/me/household" className={buttonClassName({ variant: "secondary", size: "sm" }, "mt-g-3")}>{me.household.addTitle}</Link>
                </AppSection>
            )}

            <AppSection id="sections" title={me.sections} className="desk:hidden">
                <GroupedList label={me.sections}>
                    {sections.map((s) => {
                        const Icon = SETTINGS_ICONS[s.id as SettingsSectionId]
                        return (
                            <Row
                                key={s.id}
                                href={s.href}
                                icon={Icon ? <SettingsTile icon={Icon} /> : undefined}
                                iconClassName="tablet:hidden"
                                primary={s.label}
                                secondary={s.description}
                            />
                        )
                    })}
                    {/* the help centre lost its only entry point in the cutover —
                        the loss gate (audit D7.1) found it orphaned */}
                    <Row href="/help" icon={<SettingsTile icon={LifeBuoy} />} iconClassName="tablet:hidden" primary={t.help.pageTitle} secondary={t.help.pageSubtitle} />
                </GroupedList>
            </AppSection>
        </>
    )
}
