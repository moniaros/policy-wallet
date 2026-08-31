"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useLanguage } from "@/contexts/LanguageContext"
import { formatPlural } from "@/lib/i18n/plural"
import { formatCurrency } from "@/lib/i18n/format"
import { PRIMARY_NAV, ADD_POLICY } from "@/lib/app/navigation"
import type { PoliciesModel, PolicyRow } from "@/lib/app/policies-model"
import { LargeTitleNav } from "@/src/design-system/shell"
import { AppSection, GroupHeader, GroupedList, Row } from "@/src/design-system/app-layout"
import { SegmentedControl } from "@/src/design-system/segmented-control"
import { SearchField, StatusChip, buttonClassName } from "@/src/design-system/primitives"
import { PlatformNote } from "@/src/design-system/app"

type Lens = "line" | "expiry" | "person"
const EXPIRING_DAYS = 45
const YEAR_DAYS = 365

function matches(row: PolicyRow, q: string): boolean {
    if (!q) return true
    const hay = [row.label, row.asset, row.insurer, row.number, row.person, row.lineLabel, ...(row.covers ?? [])].filter(Boolean).join(" ").toLocaleLowerCase("el-GR")
    return hay.includes(q.toLocaleLowerCase("el-GR"))
}

/**
 * /policies — «Ο φάκελός σας» (§8.3). One title. Search, three lenses, month-
 * style group headers, one row per policy with the asset on the row and the
 * three-state chip trailing; expired collapsed under one header. Sections:
 * tools · list · expired · note (≤ 4).
 */
export function PoliciesScreen({ model }: { model: PoliciesModel }) {
    const { t, language: lang } = useLanguage()
    const [query, setQuery] = useState("")
    const [lens, setLens] = useState<Lens>("line")
    const brand = { href: PRIMARY_NAV[0].href, label: t.app.nav.brand }
    const stateLabels = { covered: t.app.state.covered, gap: t.app.state.gap, review: t.app.state.review }

    const rows = useMemo(() => model.rows.filter((r) => matches(r, query.trim())), [model.rows, query])
    const groups = useMemo(() => {
        const map = new Map<string, { title: string; rows: PolicyRow[]; order: number }>()
        for (const r of rows) {
            let key: string, title: string, order: number
            if (lens === "line") { key = r.line ?? "other"; title = r.lineLabel; order = 0 }
            else if (lens === "expiry") {
                const d = r.daysUntilExpiry
                if (d === null) { key = "none"; title = t.app.policies.noEnd; order = 3 }
                else if (d <= EXPIRING_DAYS) { key = "soon"; title = t.app.policies.expiring; order = 0 }
                else if (d <= YEAR_DAYS) { key = "year"; title = t.app.policies.thisYear; order = 1 }
                else { key = "later"; title = t.app.policies.later; order = 2 }
            } else { key = r.person ?? "?"; title = r.person ?? t.app.policies.unknownPerson; order = r.person ? 0 : 1 }
            const g = map.get(key) ?? { title, rows: [], order }
            g.rows.push(r)
            map.set(key, g)
        }
        const list = [...map.values()]
        for (const g of list) g.rows.sort((a, b) => (a.daysUntilExpiry ?? Infinity) - (b.daysUntilExpiry ?? Infinity))
        return list.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, lang === "el" ? "el-GR" : "en-GB"))
    }, [rows, lens, t, lang])

    const secondary = (r: PolicyRow) =>
        [
            // the expiry lens exists to show WHEN — the date leads its rows;
            // an expiring or expired policy carries its date in EVERY lens
            // (the old dashboard showed it; the loss gate keeps it)
            lens === "expiry" || (r.daysUntilExpiry != null && r.daysUntilExpiry <= 45) ? r.endDate : null,
            lens !== "line" ? r.lineLabel : null,
            r.covers ? r.covers.join(", ") : t.app.policies.coversUnknown,
            r.premium ? formatPlural(t.app.policies.premiumPerYear, { amount: formatCurrency(r.premium.amount, lang, { currency: r.premium.currency }) }, lang) : null,
            lens !== "person" ? r.person : null,
            r.documentCount > 1 ? formatPlural(t.app.policies.documents, { count: r.documentCount }, lang) : null,
        ]
            .filter(Boolean)
            .join(" · ")
    const trailing = (r: PolicyRow) => (r.state ? <StatusChip state={r.state}>{stateLabels[r.state]}</StatusChip> : null)
    const primary = (r: PolicyRow) => (r.asset ? `${r.label} · ${r.asset}` : r.label)

    if (model.rows.length === 0 && model.expired.length === 0) {
        return (
            <>
                <LargeTitleNav title={t.app.policies.title} brand={brand} />
                <AppSection id="empty">
                    <p className="text-g-app-body text-fg-primary">{t.app.policies.empty}</p>
                    <Link href={ADD_POLICY.href} className={buttonClassName({ variant: "primary", size: "lg" }, "mt-g-4 w-full tablet:w-auto")}>{t.app.policies.emptyAction}</Link>
                </AppSection>
            </>
        )
    }

    return (
        <>
            <LargeTitleNav title={t.app.policies.title} brand={brand} subtitle={formatPlural(t.app.policies.count, { count: model.rows.length }, lang)} />
            <AppSection id="tools">
                <SearchField label={t.app.policies.search} placeholder={t.app.policies.searchHint} value={query} onChange={(e) => setQuery(e.target.value)} />
                <SegmentedControl<Lens>
                    className="mt-g-3"
                    label={t.app.policies.lens}
                    value={lens}
                    onChange={setLens}
                    options={[{ value: "line", label: t.app.policies.byLine }, { value: "expiry", label: t.app.policies.byExpiry }, { value: "person", label: t.app.policies.byPerson }]}
                />
                {lens === "person" && <p className="mt-g-2 text-g-app-body-sm text-fg-secondary">{t.app.policies.personHint}</p>}
            </AppSection>

            <AppSection id="list">
                {rows.length === 0 ? (
                    <p className="text-g-app-body text-fg-secondary">{formatPlural(t.app.policies.noMatch, { query: query.trim() }, lang)}</p>
                ) : (
                    groups.map((g) => (
                        <div key={g.title}>
                            <GroupHeader count={g.rows.length}>{g.title}</GroupHeader>
                            <GroupedList label={g.title}>
                                {g.rows.map((r) => (
                                    <Row key={r.id} href={r.href} primary={primary(r)} secondary={secondary(r)} trailing={trailing(r)} />
                                ))}
                            </GroupedList>
                        </div>
                    ))
                )}
            </AppSection>

            {model.expired.length > 0 && (
                <AppSection id="expired">
                    <details className="group">
                        <summary className="g-row-press flex min-h-11 cursor-pointer list-none items-center justify-between rounded-g-control px-g-4 text-g-app-body font-semibold text-fg-primary tablet:px-0">
                            <span>{t.app.policies.expired} · <span className="tabular-nums">{model.expired.length}</span></span>
                            <span aria-hidden="true" className="text-fg-faint transition-transform group-open:rotate-180">⌄</span>
                        </summary>
                        <p className="px-g-4 pb-g-2 text-g-app-body-sm text-fg-secondary tablet:px-0">{t.app.policies.expiredNote}</p>
                        <GroupedList label={t.app.policies.expired}>
                            {model.expired.map((r) => (
                                <Row key={r.id} href={r.href} primary={primary(r)} secondary={[r.lineLabel, r.endDate ? formatPlural(t.app.policies.expiredOn, { date: r.endDate }, lang) : null].filter(Boolean).join(" · ")} />
                            ))}
                        </GroupedList>
                    </details>
                </AppSection>
            )}

            <AppSection id="note">
                <PlatformNote title={t.app.note.title} body={t.app.note.body} />
            </AppSection>
        </>
    )
}
