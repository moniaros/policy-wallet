import Link from "next/link"
import { getTranslations } from "@/lib/i18n"
import { formatPlural } from "@/lib/i18n/plural"
import { resolveSentence, resolveSource, resolveWhyYou } from "@/lib/app/render-copy"
import { formatCurrency, formatDate } from "@/lib/i18n/format"
import { planTierName } from "@/lib/subscription-copy"
import { PRIMARY_NAV, ADD_POLICY } from "@/lib/app/navigation"
import type { HomeModel } from "@/lib/app/home-model"
import { LargeTitleNav } from "@/src/design-system/shell"
import { AppSection, GroupedList, Row } from "@/src/design-system/app-layout"
import { Button, buttonClassName } from "@/src/design-system/primitives"
import { VerdictCard, ActionRow, ActionRowList, MoneyTriad, CoverageMap, HouseholdStrip, LifeEventChips, PlatformNote } from "@/src/design-system/app"
import { MomentOfTruthBeacon } from "@/components/app/MomentOfTruthBeacon"

/**
 * / — «Η προστασία σας» (§8.1). Presentational and pure: the page loads the
 * model, this renders it. Seven `section[id]` landmarks — verdict · now ·
 * money · life · map · household · note — inside the measured ≤7 ceiling
 * (tests/unit/home-section-budget.test.tsx). Desktop: the verdict full
 * width, then two columns 1.35fr / 0.85fr.
 */
export function HomeScreen({ model }: { model: HomeModel }) {
    const { lang, verdict } = model
    const t = getTranslations(lang)
    const stateLabels = { covered: t.app.state.covered, gap: t.app.state.gap, review: t.app.state.review }
    const brand = { href: PRIMARY_NAV[0].href, label: t.app.nav.brand }
    const policyHref = (id: string) => `${PRIMARY_NAV[2].href}/${id}`

    if (model.policyCount === 0) {
        return (
            <>
                <LargeTitleNav title={t.app.home.title} brand={brand} />
                <AppSection id="verdict">
                    <VerdictCard counts={{ covered: 0, gap: 0, review: 0 }} active={0} quiet={false} mood={t.app.verdict.moodReview} sentence={t.app.home.emptyTitle} reassurance={t.app.home.emptyBody} ringLabel={formatPlural(t.app.verdict.ringLabel, { covered: 0, active: 0, gap: 0, review: 0 }, lang)} tiles={[]} />
                    <Link href={ADD_POLICY.href} className={buttonClassName({ variant: "primary", size: "lg" }, "mt-g-4 w-full tablet:w-auto")}>{t.app.home.emptyAction}</Link>
                </AppSection>
                <AppSection id="note"><PlatformNote title={t.app.note.title} body={t.app.note.body} /></AppSection>
            </>
        )
    }

    const nextLine = model.nextExpiry ? formatPlural(t.app.verdict.nextExpiry, { count: model.nextExpiry.days }, lang) : t.app.verdict.noExpiry
    const sentence = verdict.quiet ? t.app.verdict.quietSentence : formatPlural(t.app.verdict.sentence, { covered: verdict.counts.covered, active: verdict.active }, lang)
    const reassurance = verdict.quiet ? formatPlural(t.app.verdict.quietReassurance, { next: nextLine }, lang) : formatPlural(t.app.verdict.thingsToSee, { count: model.findings.filter((f) => f.tier !== "later").length }, lang)
    const mood = verdict.quiet ? t.app.verdict.moodQuiet : verdict.counts.gap > 0 ? t.app.verdict.moodGap : verdict.counts.review > 0 ? t.app.verdict.moodReview : t.app.verdict.moodQuiet
    const seeHref = PRIMARY_NAV[1].href
    const householdHref = `${PRIMARY_NAV[4].href}/household`
    const notChecked: string[] = []
    if (model.notChecked.gapDetection) notChecked.push(formatPlural(t.app.verdict.notChecked.gap_detection_not_in_plan, { plan: planTierName("pro", lang) }, lang))
    if (model.notChecked.notAnalysed > 0) notChecked.push(formatPlural(t.app.verdict.notChecked.policies_not_analysed, { count: model.notChecked.notAnalysed }, lang))
    if (model.notChecked.failed > 0) notChecked.push(formatPlural(t.app.verdict.notChecked.readings_failed, { count: model.notChecked.failed }, lang))

    const money = model.money
    const twiceCount = money.paidTwice.length
    const twiceAmount = money.paidTwice.reduce((a, p) => a + (p.amountPerYear ?? 0), 0)

    return (
        <>
            <LargeTitleNav title={t.app.home.title} brand={brand} />
            <MomentOfTruthBeacon findings={model.now.shown.map((f) => ({ id: f.id, tier: f.tier, kind: f.kind }))} />
            <AppSection id="verdict" className="[padding-block-start:var(--spacing-g-4)]">
                <VerdictCard
                    counts={verdict.counts}
                    active={verdict.active}
                    quiet={verdict.quiet}
                    mood={mood}
                    sentence={sentence}
                    reassurance={reassurance}
                    ringLabel={formatPlural(t.app.verdict.ringLabel, { covered: verdict.counts.covered, active: verdict.active, gap: verdict.counts.gap, review: verdict.counts.review }, lang)}
                    tiles={(["covered", "gap", "review"] as const).map((state) => ({ state, label: t.app.verdict.tiles[state], count: verdict.counts[state], href: `${seeHref}?state=${state}` }))}
                />
                {notChecked.length > 0 && (
                    <ul className="mt-g-3 flex flex-col gap-g-1 text-g-app-body-sm text-fg-secondary">
                        {notChecked.map((line) => <li key={line}>{line}</li>)}
                    </ul>
                )}
                {model.policyCount < 3 && <p className="mt-g-3 text-g-app-body-sm text-fg-secondary">{formatPlural(t.app.home.checklist, { count: model.policyCount }, lang)}</p>}
            </AppSection>

            <div className="desk:grid desk:grid-cols-[1.35fr_0.85fr] desk:gap-x-g-8">
                <div>
                    {verdict.quiet ? (
                        <AppSection id="now" title={t.app.home.nextExpiry}>
                            <GroupedList label={t.app.home.nextExpiry}>
                                {model.nextExpiry && <Row primary={model.nextExpiry.assetLabel} secondary={nextLine} href={policyHref(model.nextExpiry.policyId)} />}
                                {model.lastDid && <Row primary={model.lastDid.text} secondary={`${t.app.home.lastDid} · ${formatDate(model.lastDid.at, lang)}`} />}
                                {!model.nextExpiry && !model.lastDid && <Row primary={t.app.verdict.noExpiry} />}
                            </GroupedList>
                        </AppSection>
                    ) : (
                        <AppSection id="now" title={t.app.home.now} trailing={<Link href={seeHref} className="inline-flex min-h-11 items-center text-g-app-body-sm font-medium text-fg-brand">{t.app.home.seeAll}</Link>}>
                            {model.now.shown.length === 0 ? (
                                <GroupedList label={t.app.home.now}><Row primary={formatPlural(t.app.verdict.thingsToSee, { count: 0 }, lang)} /></GroupedList>
                            ) : (
                                <ActionRowList label={t.app.home.now}>
                                    {model.now.shown.map((f) => (
                                        <ActionRow key={f.id} kind={f.kind} sentence={resolveSentence(f, lang, t)} source={resolveSource(f, lang, t)} trailing={typeof f.daysUntilExpiry === "number" ? formatPlural(t.app.finding.daysUntil, { count: f.daysUntilExpiry }, lang) : undefined} href={f.object.policyId ? policyHref(f.object.policyId) : seeHref} />
                                    ))}
                                </ActionRowList>
                            )}
                            {model.now.overflow > 0 && (
                                <p className="mt-g-1 text-g-app-body-sm text-fg-secondary"><Link href={seeHref} className="inline-flex min-h-11 items-center text-fg-brand">{formatPlural(t.app.home.more, { count: model.now.overflow }, lang)}</Link></p>
                            )}
                        </AppSection>
                    )}

                    <AppSection id="money" title={t.app.home.money} trailing={<Link href={PRIMARY_NAV[3].href} className="inline-flex min-h-11 items-center text-g-app-body-sm font-medium text-fg-brand">{t.app.nav.money}</Link>}>
                        <MoneyTriad
                            paid={{ label: t.app.moneyLine.paid, value: formatCurrency(money.paidPerYear, lang), note: t.app.moneyLine.paidNote, factKey: "money.paidPerYear" }}
                            protects={{ label: t.app.moneyLine.protects, value: money.protectsUpTo ? formatCurrency(money.protectsUpTo.amount, lang) : null, note: money.protectsUpTo ? t.app.moneyLine.protectsNote : t.app.moneyLine.protectsNone, factKey: "money.protectsUpTo" }}
                            twice={{ label: t.app.moneyLine.twice, value: twiceAmount > 0 ? formatCurrency(twiceAmount, lang) : null, note: formatPlural(t.app.moneyLine.twiceNote, { count: twiceCount }, lang), factKey: "money.paidTwice" }}
                        />
                        <p className="mt-g-2 text-g-app-caption text-fg-faint">{t.app.home.moneyThink}</p>
                    </AppSection>

                    <AppSection id="life" title={t.app.home.life}>
                        <p className="mb-g-3 text-g-app-body-sm text-fg-secondary">{t.app.home.lifeLead}</p>
                        <LifeEventChips chips={model.lifeChips.map((c) => ({ id: c.id, label: (t.app.life as Record<string, string>)[chipKey(c.id)] ?? c.id, href: c.href }))} />
                    </AppSection>
                </div>

                <div>
                    <AppSection id="map" title={t.app.home.map}>
                        <CoverageMap legend={{ ...stateLabels, none: t.app.coverageMap.none }} cells={model.map.map((c) => ({ id: c.id, label: c.label, state: c.state }))} />
                    </AppSection>

                    <AppSection id="household" title={t.app.home.household}>
                        {model.household.length === 0 ? (
                            <div className="rounded-g-card border border-dashed border-border-strong p-g-4">
                                <p className="text-g-app-body text-fg-secondary">{t.app.home.householdEmpty}</p>
                                <Link href={householdHref} className={buttonClassName({ variant: "secondary", size: "sm" }, "mt-g-3")}>{t.app.home.householdAdd}</Link>
                            </div>
                        ) : (
                            <HouseholdStrip stateLabels={stateLabels} add={{ href: householdHref, label: t.app.home.householdAdd }} people={model.household.map((p) => ({ id: p.id, name: p.name, state: p.state, countLabel: formatPlural(t.app.household.policies, { count: p.policyCount }, lang), href: householdHref }))} />
                        )}
                    </AppSection>

                    <AppSection id="note">
                        <PlatformNote title={t.app.note.title} body={t.app.note.body} extra={t.app.note.gapDefinition} />
                    </AppSection>
                </div>
            </div>
            <span className="sr-only">{Button.displayName}</span>
        </>
    )
}

const CHIP_KEYS: Record<string, string> = { marriage: "marriage", birth: "child", property_purchase: "newHome", vehicle_purchase: "newCar", job_change: "newJob", mortgage: "loan", divorce: "divorce", relocation: "move", retirement: "retirement", other: "other" }
function chipKey(id: string): string { return CHIP_KEYS[id] ?? id }
