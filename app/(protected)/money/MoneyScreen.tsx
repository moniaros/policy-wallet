"use client"

import Link from "next/link"
import { useLanguage } from "@/contexts/LanguageContext"
import { formatPlural } from "@/lib/i18n/plural"
import { formatCurrency } from "@/lib/i18n/format"
import { PRIMARY_NAV, ADD_POLICY } from "@/lib/app/navigation"
import type { MoneyModel } from "@/lib/app/money-model"
import { LargeTitleNav } from "@/src/design-system/shell"
import { AppSection, GroupedList, Row } from "@/src/design-system/app-layout"
import { buttonClassName } from "@/src/design-system/primitives"
import { MoneyTriad, PlatformNote } from "@/src/design-system/app"

/**
 * /money (§8.5): the triad, the pairs that may be paid twice (never an
 * invented amount), the benefits already paid for, and where the premiums
 * go — by line. Sections: triad · twice · unused · where · note (≤ 5).
 * Never «κόψτε», never «αλλάξτε».
 */
export function MoneyScreen({ model }: { model: MoneyModel }) {
    const { t, language: lang } = useLanguage()
    const brand = { href: PRIMARY_NAV[0].href, label: t.app.nav.brand }
    const { money, footprint } = model
    const notCounted = footprint.unknownPremiumCount + footprint.unknownDurationCount

    if (model.policyCount === 0) {
        return (
            <>
                <LargeTitleNav title={t.app.money.title} brand={brand} />
                <AppSection id="triad">
                    <p className="text-g-app-body text-fg-primary">{t.app.money.empty}</p>
                    <Link href={ADD_POLICY.href} className={buttonClassName({ variant: "primary", size: "lg" }, "mt-g-4 w-full tablet:w-auto")}>{t.app.home.emptyAction}</Link>
                </AppSection>
            </>
        )
    }

    return (
        <>
            <LargeTitleNav title={t.app.money.title} brand={brand} />

            <AppSection id="triad">
                <MoneyTriad
                    paid={{ label: t.app.moneyLine.paid, value: formatCurrency(money.paidPerYear, lang), note: t.app.moneyLine.paidNote, factKey: "money.paidPerYear" }}
                    protects={{ label: t.app.moneyLine.protects, value: money.protectsUpTo ? formatCurrency(money.protectsUpTo.amount, lang) : null, note: money.protectsUpTo ? t.app.moneyLine.protectsNote : t.app.moneyLine.protectsNone, factKey: "money.protectsUpTo" }}
                    twice={{ label: t.app.moneyLine.twice, value: null, note: formatPlural(t.app.moneyLine.twiceNote, { count: money.paidTwice.length }, lang), factKey: "money.paidTwice" }}
                />
                <p className="mt-g-3 text-g-app-body-sm text-fg-secondary">{t.app.money.upToNote}</p>
                {notCounted > 0 && <p className="mt-g-1 text-g-app-body-sm text-fg-secondary">{formatPlural(t.app.money.notCounted, { count: notCounted }, lang)}</p>}
            </AppSection>

            <AppSection id="twice" title={t.app.money.twiceTitle}>
                {model.paidTwice.length === 0 ? (
                    <p className="text-g-app-body text-fg-secondary">{t.app.money.twiceEmpty}</p>
                ) : (
                    <>
                        <p className="mb-g-3 text-g-app-body-sm text-fg-secondary">{t.app.money.twiceIntro}</p>
                        <GroupedList label={t.app.money.twiceTitle}>
                            {model.paidTwice.map((pair, i) => (
                                <Row
                                    key={i}
                                    primary={`${pair.label} · ${pair.partnerLabel}`}
                                    secondary={[pair.asset ? formatPlural(t.app.money.twiceFor, { asset: pair.asset }, lang) : null, pair.amountPerYear !== null ? formatCurrency(pair.amountPerYear, lang) : null].filter(Boolean).join(" · ") || undefined}
                                />
                            ))}
                        </GroupedList>
                        <p className="mt-g-2 text-g-app-body-sm text-fg-secondary">{t.app.money.twiceAsk}</p>
                    </>
                )}
            </AppSection>

            <AppSection id="unused" title={t.app.money.unusedTitle}>
                {model.benefits.length === 0 && !model.enfiaGuideHref && model.offers.length === 0 ? (
                    <p className="text-g-app-body text-fg-secondary">{t.app.money.unusedEmpty}</p>
                ) : (
                    <>
                        {model.benefits.length > 0 && (
                            <>
                                <p className="mb-g-3 text-g-app-body-sm text-fg-secondary">{t.app.money.unusedIntro}</p>
                                <GroupedList label={t.app.money.unusedTitle}>
                                    {model.benefits.map((b) => (
                                        <Row key={b.id} primary={b.name} secondary={[b.policyLabel, b.contact].filter(Boolean).join(" · ") || undefined} />
                                    ))}
                                </GroupedList>
                            </>
                        )}
                        {model.enfiaGuideHref && (
                            <p className="mt-g-3 text-g-app-body-sm text-fg-secondary">
                                {t.app.money.enfia} <Link href={model.enfiaGuideHref} className="inline-flex min-h-11 items-center font-medium text-fg-brand">{t.app.money.enfiaAction}</Link>
                            </p>
                        )}
                        {model.offers.length > 0 && (
                            <>
                                <p className="mb-g-2 mt-g-4 text-g-app-body-sm font-semibold text-fg-secondary">{t.app.money.offersTitle}</p>
                                <GroupedList label={t.app.money.offersTitle}>
                                    {model.offers.map((o) => (
                                        <Row key={o.id} href={o.href} primary={o.title} secondary={o.vendor} />
                                    ))}
                                </GroupedList>
                            </>
                        )}
                    </>
                )}
            </AppSection>

            {model.byLine.length > 0 && (
                <AppSection id="where" title={formatPlural(t.app.money.whereTitle, { amount: formatCurrency(footprint.total, lang) }, lang)}>
                    <p className="mb-g-3 text-g-app-body-sm text-fg-secondary">{t.app.money.whereNote}</p>
                    <ul className="flex flex-col gap-g-2" data-fact="money.byLine">
                        {model.byLine.map((l) => (
                            <li key={l.id} className="flex items-center gap-g-3">
                                <span className="w-32 shrink-0 text-g-app-body-sm text-fg-secondary">{l.label}</span>
                                <span aria-hidden className="h-2 rounded-g-pill bg-state-covered" style={{ width: `${Math.max(6, Math.round((l.amount / (model.byLine[0]?.amount || 1)) * 100))}%` }} />
                                <span className="shrink-0 text-g-app-body-sm tabular-nums text-fg-primary">{formatCurrency(l.amount, lang)}</span>
                            </li>
                        ))}
                    </ul>
                </AppSection>
            )}

            <AppSection id="note">
                <PlatformNote title={t.app.note.title} body={t.app.note.body} extra={t.app.money.noteBody} />
            </AppSection>
        </>
    )
}
