"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useLanguage } from "@/contexts/LanguageContext"
import { formatPlural } from "@/lib/i18n/plural"
import { formatDate } from "@/lib/i18n/format"
import { PRIMARY_NAV } from "@/lib/app/navigation"
import type { AdviserModel } from "@/lib/app/adviser-model"
import { LargeTitleNav } from "@/src/design-system/shell"
import { AppSection, GroupedList, Row } from "@/src/design-system/app-layout"
import { Avatar, Button, Input, Tag, buttonClassName } from "@/src/design-system/primitives"
import { Switch } from "@/src/design-system/switch"
import { PlatformNote } from "@/src/design-system/app"
import { setPolicyShared, disconnectAdviser, inviteAdviser } from "./actions"

/**
 * /adviser (§8.7): the customer's OWN adviser. Per-policy switches — every
 * flip writes an AdviserShareAudit row; disconnect kills all access at once;
 * no adviser ⇒ the invite flow, never a directory. Sections: adviser ·
 * shares · threads · note (≤ 4).
 */
export function AdviserScreen({ model }: { model: AdviserModel }) {
    const { t, language: lang } = useLanguage()
    const router = useRouter()
    const [pending, start] = useTransition()
    const [busyPolicy, setBusyPolicy] = useState<string | null>(null)
    const [email, setEmail] = useState("")
    const brand = { href: PRIMARY_NAV[0].href, label: t.app.nav.brand }

    if (!model.adviser) {
        return (
            <>
                <LargeTitleNav title={t.app.adviser.title} brand={brand} />
                <AppSection id="adviser">
                    <p className="text-g-app-body text-fg-primary">{t.app.adviser.none}</p>
                    <p className="mt-g-2 text-g-app-body-sm text-fg-secondary">{t.app.adviser.noneBody}</p>
                    <form
                        className="mt-g-4 flex max-w-md flex-col gap-g-2 tablet:flex-row"
                        onSubmit={(e) => {
                            e.preventDefault()
                            start(async () => {
                                const r = await inviteAdviser({ email })
                                if (r.ok) { toast.success(t.app.adviser.inviteSent); setEmail("") } else toast.error(t.app.adviser.inviteFailed)
                            })
                        }}
                    >
                        <label className="flex-1">
                            <span className="mb-g-1 block text-g-app-body-sm font-medium text-fg-secondary">{t.app.adviser.invite}</span>
                            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.app.adviser.invitePlaceholder} />
                        </label>
                        <Button type="submit" variant="primary" loading={pending} className="shrink-0 self-end">{t.app.adviser.invite}</Button>
                    </form>
                </AppSection>
                <AppSection id="note"><PlatformNote title={t.app.note.title} body={t.app.note.body} /></AppSection>
            </>
        )
    }

    const adviser = model.adviser

    return (
        <>
            <LargeTitleNav title={t.app.adviser.title} brand={brand} subtitle={t.app.adviser.subtitleConnected} />

            <AppSection id="adviser">
                <div className="flex items-center gap-g-4 rounded-g-card border border-border-hair bg-surface-raised p-g-4">
                    <Avatar name={adviser.name} src={adviser.photoUrl ?? undefined} size="lg" />
                    <div className="min-w-0 flex-1">
                        <p className="text-g-app-body font-semibold text-fg-primary">{adviser.name}</p>
                        {adviser.company && <p className="text-g-app-body-sm text-fg-secondary">{adviser.company}</p>}
                        {adviser.since && <p className="mt-g-1 text-g-app-caption text-fg-faint">{formatPlural(t.app.adviser.since, { date: adviser.since }, lang)}</p>}
                    </div>
                    <div className="flex shrink-0 gap-g-2">
                        {adviser.phone && <a href={`tel:${adviser.phone}`} className={buttonClassName({ variant: "secondary", size: "sm" })}>{t.app.adviser.card.call}</a>}
                        <a href={`mailto:${adviser.email}`} className={buttonClassName({ variant: "secondary", size: "sm" })}>{t.app.adviser.card.email}</a>
                    </div>
                </div>
            </AppSection>

            <AppSection id="shares" title={t.app.adviser.shares}>
                <p className="mb-g-3 text-g-app-body-sm text-fg-secondary">{t.app.adviser.sharesHint}</p>
                <GroupedList label={t.app.adviser.shares}>
                    {model.policies.map((p) => (
                        <li key={p.id} className="px-g-4 py-g-1 tablet:px-g-3">
                            <Switch
                                checked={Boolean(p.grantId)}
                                pending={busyPolicy === p.id}
                                label={[p.label, p.asset].filter(Boolean).join(" · ")}
                                description={
                                    <>
                                        {p.grantId && p.sharedSince ? formatPlural(t.app.adviser.sharedSince, { date: p.sharedSince }, lang) : t.app.adviser.notShared}
                                        {p.addedByAdviser ? <Tag className="ml-g-2">{t.app.adviser.addedByAdviser}</Tag> : null}
                                    </>
                                }
                                onCheckedChange={(on) => {
                                    setBusyPolicy(p.id)
                                    start(async () => {
                                        const r = await setPolicyShared({ policyId: p.id, shared: on })
                                        setBusyPolicy(null)
                                        if (r.ok) router.refresh()
                                        else toast.error(t.app.adviser.shareFailed)
                                    })
                                }}
                            />
                        </li>
                    ))}
                </GroupedList>
            </AppSection>

            <AppSection id="threads" title={t.app.adviser.threads}>
                {model.threads.length === 0 ? (
                    <p className="text-g-app-body text-fg-secondary">{t.app.adviser.threadsEmpty}</p>
                ) : (
                    <GroupedList label={t.app.adviser.threads}>
                        {model.threads.map((th) => (
                            <Row
                                key={th.id}
                                href={`/collaboration/threads/${th.id}`}
                                primary={th.subject}
                                secondary={formatDate(new Date(th.at), lang)}
                                trailing={<Tag>{t.app.adviser.threadStatus[th.status as keyof typeof t.app.adviser.threadStatus] ?? th.status}</Tag>}
                            />
                        ))}
                    </GroupedList>
                )}
                <div className="mt-g-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() => {
                            if (!window.confirm(`${t.app.adviser.disconnect} — ${t.app.adviser.disconnectNote}`)) return
                            start(async () => {
                                const r = await disconnectAdviser({ relationshipId: adviser.relationshipId })
                                if (r.ok) router.refresh()
                                else toast.error(t.app.adviser.disconnectFailed)
                            })
                        }}
                    >
                        {t.app.adviser.disconnect}
                    </Button>
                    <p className="mt-g-1 text-g-app-caption text-fg-faint">{t.app.adviser.disconnectNote}</p>
                </div>
            </AppSection>

            <AppSection id="note">
                <PlatformNote title={t.app.note.title} body={formatPlural(t.app.adviser.note, { name: adviser.name }, lang)} />
            </AppSection>
        </>
    )
}
