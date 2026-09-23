"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Users, UserMinus, Mail, X } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { formatDate } from "@/lib/i18n/format"
import { endFamilyMembership, inviteFamilyMember, revokeFamilyInvite } from "@/app/(protected)/account/family/actions"

interface Row { id: string; name: string; since: string }
interface Props {
    canInvite: boolean
    members: Row[]
    memberships: Row[]
    pending: { id: string; email: string; sentAt: string }[]
    privateCount: number
}

/**
 * Spec v2 §13 — the family wallet, in Ρυθμίσεις. The section is visible on
 * every plan; the INVITE is what the paid plan gates (§21.2). «What your
 * family can see» is stated as a rule with the count of policies kept out.
 */
export function FamilySection({ canInvite, members, memberships, pending, privateCount }: Props) {
    const { t, language } = useLanguage()
    const locale = language === "el" ? "el" : "en"
    const copy = t.family
    const [email, setEmail] = useState("")
    const [busy, start] = useTransition()

    const invite = () =>
        start(async () => {
            const res = await inviteFamilyMember(email)
            if ("error" in res) {
                toast.error((copy.errors as Record<string, string>)[String(res.error)] ?? copy.errors.INVALID_EMAIL)
                return
            }
            toast.success(res.emailDelivered ? copy.inviteSent : copy.inviteSentNoEmail)
            setEmail("")
        })

    const end = (id: string) =>
        start(async () => {
            const res = await endFamilyMembership(id)
            if ("error" in res) toast.error(copy.errors.NOT_FOUND)
            else toast.success(copy.ended)
        })

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-h3 font-semibold tracking-tight text-foreground">{copy.title}</h1>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{copy.intro}</p>
            </header>

            <section className="pw-card pw-pad" aria-labelledby="family-visibility-heading">
                <h2 id="family-visibility-heading" className="text-title font-semibold text-foreground">{copy.visibilityTitle}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                    {copy.visibilityRule.replace("{n}", String(privateCount))}
                </p>
                <Link href="/wallet" className="mt-2 inline-flex text-sm font-semibold text-primary dark:text-mint">{copy.managePrivate}</Link>
            </section>

            <section className="pw-card pw-pad" aria-labelledby="family-members-heading">
                <h2 id="family-members-heading" className="text-title font-semibold text-foreground">{copy.membersTitle}</h2>
                {members.length === 0 && pending.length === 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">{copy.noMembers}</p>
                ) : (
                    <ul className="mt-3 space-y-2">
                        {members.map((m) => (
                            <li key={m.id} className="pw-subcard flex flex-wrap items-center justify-between gap-2 p-3">
                                <div className="flex min-w-0 items-center gap-2">
                                    <span className="pw-card-chip" aria-hidden="true"><Users className="h-4 w-4" strokeWidth={1.75} /></span>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-foreground [overflow-wrap:anywhere]">{m.name}</p>
                                        <p className="text-caption text-muted-foreground">{copy.since.replace("{date}", formatDate(m.since, locale))}</p>
                                    </div>
                                </div>
                                <button type="button" disabled={busy} onClick={() => end(m.id)} className="pw-soft-button text-status-danger">
                                    <UserMinus className="h-4 w-4" aria-hidden="true" />
                                    {copy.remove}
                                </button>
                            </li>
                        ))}
                        {pending.map((p) => (
                            <li key={p.id} className="pw-subcard flex flex-wrap items-center justify-between gap-2 p-3">
                                <div className="flex min-w-0 items-center gap-2">
                                    <span className="pw-card-chip" aria-hidden="true"><Mail className="h-4 w-4" strokeWidth={1.75} /></span>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-foreground [overflow-wrap:anywhere]">{p.email}</p>
                                        <p className="text-caption text-muted-foreground">{copy.pendingSince.replace("{date}", formatDate(p.sentAt, locale))}</p>
                                    </div>
                                </div>
                                <button type="button" disabled={busy} onClick={() => start(async () => { await revokeFamilyInvite(p.id); toast.success(copy.inviteRevoked) })} className="pw-soft-button">
                                    <X className="h-4 w-4" aria-hidden="true" />
                                    {copy.revokeInvite}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                {canInvite ? (
                    <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); invite() }}>
                        <label className="sr-only" htmlFor="family-invite-email">{copy.inviteLabel}</label>
                        <input id="family-invite-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={copy.invitePlaceholder} className="pw-input flex-1" />
                        <button type="submit" disabled={busy || !email.trim()} className="pw-primary-button">{copy.inviteCta}</button>
                    </form>
                ) : (
                    <div className="pw-subcard mt-4 p-3">
                        <p className="text-sm text-foreground">{copy.upgradeToInvite}</p>
                        <Link href="/upgrade?feature=family_sharing" className="mt-2 inline-flex text-sm font-semibold text-primary dark:text-mint">{copy.upgradeCta}</Link>
                    </div>
                )}
            </section>

            <section className="pw-card pw-pad" aria-labelledby="family-memberships-heading">
                <h2 id="family-memberships-heading" className="text-title font-semibold text-foreground">{copy.membershipsTitle}</h2>
                {memberships.length === 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">{copy.noMemberships}</p>
                ) : (
                    <ul className="mt-3 space-y-2">
                        {memberships.map((m) => (
                            <li key={m.id} className="pw-subcard flex flex-wrap items-center justify-between gap-2 p-3">
                                <div className="min-w-0">
                                    <p className="font-semibold text-foreground [overflow-wrap:anywhere]">{m.name}</p>
                                    <p className="text-caption text-muted-foreground">{copy.since.replace("{date}", formatDate(m.since, locale))}</p>
                                </div>
                                <button type="button" disabled={busy} onClick={() => end(m.id)} className="pw-soft-button">{copy.leave}</button>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    )
}
