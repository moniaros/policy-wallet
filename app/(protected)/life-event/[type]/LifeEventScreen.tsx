"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { useLanguage } from "@/contexts/LanguageContext"
import { formatPlural } from "@/lib/i18n/plural"
import { trackJourneyEvent } from "@/lib/journey/funnel"
import { PRIMARY_NAV } from "@/lib/app/navigation"
import type { LifeEventChipId } from "@/lib/app/lifeEvents"
import { LargeTitleNav } from "@/src/design-system/shell"
import { AppSection } from "@/src/design-system/app-layout"
import { Button, buttonClassName } from "@/src/design-system/primitives"
import { Input } from "@/src/design-system/primitives"
import { recordLifeEvent, type LifeEventDelta } from "./actions"

const WHEN_OPTIONS = [0, 30, 90] as const

/**
 * /life-event/[type] (§8.10): two, at most three questions — when, the amount
 * where the engine needs one, confirm. Then «Ξαναείδα την προστασία σας» with
 * exactly what moved. Never a suggestion; the delta is the whole answer.
 */
export function LifeEventScreen({ type, magnitudeLabel }: { type: LifeEventChipId; magnitudeLabel: string | null }) {
    const { t, language: lang } = useLanguage()
    const [daysAgo, setDaysAgo] = useState<number>(0)
    const [magnitude, setMagnitude] = useState("")
    const [delta, setDelta] = useState<Extract<LifeEventDelta, { ok: true }> | null>(null)
    const [pending, start] = useTransition()
    const brand = { href: PRIMARY_NAV[0].href, label: t.app.nav.brand }
    const back = { href: PRIMARY_NAV[0].href, label: t.app.home.title }
    const le = t.app.lifeEvent
    const label = t.app.life[({ marriage: "marriage", birth: "child", property_purchase: "newHome", vehicle_purchase: "newCar", job_change: "newJob", mortgage: "loan", divorce: "divorce", relocation: "move", retirement: "retirement", other: "other" } as const)[type]]

    const submit = () =>
        start(async () => {
            const occurredAt = new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10)
            const result = await recordLifeEvent({ type, occurredAt, magnitude: magnitudeLabel && magnitude ? Number(magnitude) : null })
            if (result.ok) {
                trackJourneyEvent("life_event.recorded", { event_id: type })
                setDelta(result)
            } else {
                toast.error(result.error === "duplicate" ? le.duplicate : le.failed)
            }
        })

    if (delta) {
        return (
            <>
                <LargeTitleNav title={le.recheckTitle} back={back} brand={brand} />
                <AppSection id="delta">
                    <p className="text-g-app-body text-fg-primary">{le.recheckIntro}</p>
                    {delta.movedToNow.length === 0 && delta.newFindings.length === 0 ? (
                        <p className="mt-g-3 text-g-app-body text-fg-secondary">{le.nothingMoved}</p>
                    ) : (
                        <ul className="mt-g-3 flex flex-col gap-g-2">
                            {[...new Set([...delta.movedToNow, ...delta.newFindings])].map((sentence) => (
                                <li key={sentence} className="rounded-g-card border border-border-hair bg-surface-raised p-g-3 text-g-app-body text-fg-primary">{sentence}</li>
                            ))}
                        </ul>
                    )}
                    <div className="mt-g-4 flex gap-g-2">
                        <Link href={PRIMARY_NAV[1].href} className={buttonClassName({ variant: "primary", size: "md" })}>{t.app.see.title}</Link>
                        <Link href={PRIMARY_NAV[0].href} className={buttonClassName({ variant: "secondary", size: "md" })}>{t.app.home.title}</Link>
                    </div>
                </AppSection>
            </>
        )
    }

    return (
        <>
            <LargeTitleNav title={label} back={back} brand={brand} subtitle={le.subtitle} />
            <AppSection id="questions">
                <fieldset>
                    <legend className="mb-g-2 text-g-app-body font-semibold text-fg-primary">{le.when}</legend>
                    <div role="radiogroup" aria-label={le.when} className="flex flex-wrap gap-g-2">
                        {WHEN_OPTIONS.map((d) => (
                            <button key={d} type="button" role="radio" aria-checked={daysAgo === d} onClick={() => setDaysAgo(d)} className="inline-flex min-h-11 items-center rounded-g-control border border-border-subtle px-g-3 text-g-app-body-sm font-medium text-fg-primary aria-checked:border-border-strong aria-checked:bg-surface-sunken">
                                {d === 0 ? le.whenNow : formatPlural(le.whenAgo, { count: d }, lang)}
                            </button>
                        ))}
                    </div>
                </fieldset>
                {magnitudeLabel && (
                    <label className="mt-g-4 block max-w-xs">
                        <span className="mb-g-1 block text-g-app-body-sm font-medium text-fg-secondary">{magnitudeLabel}</span>
                        <Input type="number" inputMode="numeric" min="1" value={magnitude} onChange={(e) => setMagnitude(e.target.value)} />
                    </label>
                )}
                <p className="mt-g-4 text-g-app-body-sm text-fg-secondary">{le.what}</p>
                <Button variant="primary" size="lg" className="mt-g-3" loading={pending} onClick={submit}>{le.confirm}</Button>
            </AppSection>
        </>
    )
}
