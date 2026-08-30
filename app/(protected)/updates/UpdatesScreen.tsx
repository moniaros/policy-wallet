"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"
import { useLanguage } from "@/contexts/LanguageContext"
import { formatPlural } from "@/lib/i18n/plural"
import { formatDate } from "@/lib/i18n/format"
import { trackJourneyEvent } from "@/lib/journey/funnel"
import { PRIMARY_NAV, ADD_POLICY } from "@/lib/app/navigation"
import type { UpdatesModel, UpdateItem } from "@/lib/app/updates-model"
import type { NotificationStream } from "@/lib/app/streams"
import { LargeTitleNav } from "@/src/design-system/shell"
import { AppSection, GroupedList, Row } from "@/src/design-system/app-layout"
import { Button, Badge } from "@/src/design-system/primitives"
import { PlatformNote } from "@/src/design-system/app"
import { markStreamRead, markUpdateRead } from "./actions"

const DAY = 86_400_000

/**
 * /updates (§8.6): «Για την προστασία σας» (the badge) and «Τι έκανα εν τω
 * μεταξύ». Every row names its object; a failed reading is the analyst's
 * limitation with a re-upload action. Sections: protection · meanwhile (≤ 2).
 */
export function UpdatesScreen({ model }: { model: UpdatesModel }) {
    const { t, language: lang } = useLanguage()
    const router = useRouter()
    const [pending, start] = useTransition()
    const brand = { href: PRIMARY_NAV[0].href, label: t.app.nav.brand }

    const when = (iso: string) => {
        const days = Math.floor((Date.now() - new Date(iso).getTime()) / DAY)
        if (days <= 0) return t.app.updates.today
        if (days === 1) return t.app.updates.yesterday
        if (days < 14) return formatPlural(t.app.updates.daysAgo, { count: days }, lang)
        return formatDate(new Date(iso), lang)
    }

    const open = (item: UpdateItem) => {
        trackJourneyEvent("notification.opened", { stream: item.stream, event_type: item.eventType })
        start(async () => {
            if (item.unread) await markUpdateRead({ eventId: item.id })
            if (item.failedReading) router.push(item.href ?? ADD_POLICY.href)
            else if (item.href) router.push(item.href)
            else router.refresh()
        })
    }

    const markAll = (stream: NotificationStream) =>
        start(async () => {
            const r = await markStreamRead({ stream })
            if (r.ok) { toast.success(t.app.updates.marked); router.refresh() } else toast.error(t.app.updates.markFailed)
        })

    const group = (id: NotificationStream, items: UpdateItem[], title: string, hint: string, empty: string) => {
        const unread = items.filter((i) => i.unread).length
        return (
            <AppSection id={id} title={title} trailing={unread > 0 ? <Button variant="ghost" size="sm" disabled={pending} onClick={() => markAll(id)}>{t.app.updates.markAll}</Button> : undefined}>
                <p className="mb-g-3 text-g-app-body-sm text-fg-secondary">{hint}</p>
                {items.length === 0 ? (
                    <p className="text-g-app-body text-fg-secondary">{empty}</p>
                ) : (
                    <GroupedList label={title}>
                        {items.map((item) => (
                            <Row
                                key={item.id}
                                onClick={() => open(item)}
                                primary={<span className="flex items-center gap-g-2">{item.unread && <Badge tone="brand" className="whitespace-nowrap">{t.app.updates.unread}</Badge>}<span>{item.title}</span></span>}
                                secondary={[item.objectLabel, item.failedReading ? t.app.updates.failedReading : item.message].filter(Boolean).join(" · ")}
                                trailing={<span className="whitespace-nowrap">{when(item.at)}</span>}
                            />
                        ))}
                    </GroupedList>
                )}
            </AppSection>
        )
    }

    return (
        <>
            <LargeTitleNav title={t.app.updates.title} brand={brand} />
            {group("protection", model.protection, t.app.updates.protection, t.app.updates.protectionHint, t.app.updates.emptyProtection)}
            {group("meanwhile", model.meanwhile, t.app.updates.meanwhile, t.app.updates.meanwhileHint, t.app.updates.emptyMeanwhile)}
            <AppSection id="note">
                <PlatformNote title={t.app.note.title} body={t.app.note.body} />
            </AppSection>
        </>
    )
}
