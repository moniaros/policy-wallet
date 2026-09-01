"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useLanguage } from "@/contexts/LanguageContext"
import { formatPlural } from "@/lib/i18n/plural"
import { resolveSentence, resolveSource, resolveWhyYou } from "@/lib/app/render-copy"
import { trackJourneyEvent } from "@/lib/journey/funnel"
import { PRIMARY_NAV } from "@/lib/app/navigation"
import type { RenderableFinding } from "@/lib/app/finding"
import { LargeTitleNav } from "@/src/design-system/shell"
import { AppSection } from "@/src/design-system/app-layout"
import { Button, FilterChip, Tag, buttonClassName } from "@/src/design-system/primitives"
import { Switch } from "@/src/design-system/switch"
import { PlatformNote } from "@/src/design-system/app"
import { sendHelpRequest } from "../../actions"

/**
 * /adviser/help/[hash] (§8.8): the finding arrives with the person; the sheet
 * says exactly what will be sent — as chips — with «τα άλλα N» a toggle chip
 * that is OFF by default. One sentence, one switch (the consent), one button.
 */
export function HelpScreen({ finding, adviserName, otherPolicies }: { finding: RenderableFinding; adviserName: string; otherPolicies: number }) {
    const { t, language: lang } = useLanguage()
    const router = useRouter()
    const [consented, setConsented] = useState(false)
    const [includeOthers, setIncludeOthers] = useState(false)
    const [pending, start] = useTransition()
    const brand = { href: PRIMARY_NAV[0].href, label: t.app.nav.brand }
    const back = { href: PRIMARY_NAV[1].href, label: t.app.see.title }
    const help = t.app.adviser.help

    const sentence = resolveSentence(finding, lang, t)
    const source = resolveSource(finding, lang, t)
    const whyYou = resolveWhyYou(finding, lang, t)

    const send = () =>
        start(async () => {
            trackJourneyEvent("help.requested", { finding_id: finding.id })
            const result = await sendHelpRequest({ hash: finding.hash, includeOthers })
            if (result.ok) {
                trackJourneyEvent("help.consented", { finding_id: finding.id, policies_shared: 1 + (includeOthers ? otherPolicies : 0) })
                toast.success(help.sent)
                router.push(PRIMARY_NAV[1].href)
            } else {
                toast.error(result.error === "no_adviser" ? help.noAdviser : help.sendFailed)
            }
        })

    return (
        <>
            <LargeTitleNav title={help.title} back={back} brand={brand} />

            <AppSection id="finding">
                <div className="rounded-g-card border border-border-hair bg-surface-raised p-g-4">
                    <p className="text-g-app-body font-semibold text-fg-primary">{sentence}</p>
                    <p className="mt-g-1 text-g-app-body-sm text-fg-secondary">{source}</p>
                    {whyYou && <p className="mt-g-1 text-g-app-body-sm text-fg-secondary">{whyYou}</p>}
                </div>
            </AppSection>

            <AppSection id="consent" title={help.what}>
                <ul className="flex flex-wrap items-center gap-g-2" aria-label={help.what}>
                    <li><Tag>{help.chipFinding}</Tag></li>
                    <li><Tag>{formatPlural(help.chipSource, { document: finding.source.documentLabel }, lang)}</Tag></li>
                    {finding.whyYou && <li><Tag>{formatPlural(help.chipWhy, { field: finding.whyYou.profileField }, lang)}</Tag></li>}
                    {otherPolicies > 0 && (
                        <li>
                            <FilterChip pressed={includeOthers} onClick={() => setIncludeOthers((v) => !v)}>
                                {formatPlural(help.includeOthers, { count: otherPolicies }, lang)}
                            </FilterChip>
                        </li>
                    )}
                </ul>
                <p className="mt-g-4 text-g-app-body text-fg-primary">{formatPlural(help.sentence, { name: adviserName }, lang)}</p>
                <p className="mt-g-1 text-g-app-body-sm text-fg-secondary">{help.plainWords}</p>
                <div className="mt-g-4">
                    <Switch checked={consented} onCheckedChange={setConsented} label={formatPlural(help.sentence, { name: adviserName }, lang)} />
                </div>
                <div className="mt-g-4 flex gap-g-2">
                    <Button variant="primary" size="lg" disabled={!consented} loading={pending} onClick={send}>{help.confirm}</Button>
                    <Link href={back.href} className={buttonClassName({ variant: "secondary", size: "lg" })}>{t.app.finding.cancel}</Link>
                </div>
            </AppSection>

            <AppSection id="note">
                <PlatformNote title={t.app.note.title} body={formatPlural(t.app.adviser.note, { name: adviserName }, lang)} />
            </AppSection>
        </>
    )
}
