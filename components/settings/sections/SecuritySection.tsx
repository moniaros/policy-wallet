"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Fingerprint, KeyRound, Loader2, LogIn, Mail, MonitorSmartphone, ShieldAlert, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { useLanguage } from "@/contexts/LanguageContext"
import { SettingsSection, SettingsRowList } from "@/components/settings/SettingsSection"
import { SettingRow } from "@/components/settings/SettingRow"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { ChangePasswordModal } from "@/components/settings/ChangePasswordModal"
import { PasskeysBlock } from "@/components/settings/PasskeysBlock"
import { signOutEverywhere, signOutOtherDevices } from "@/app/(protected)/account/security-actions"
import type { SecurityData } from "@/app/(protected)/account/data"
import { resolveLocale } from "@/lib/i18n/format"

/**
 * What we can honestly say about this account's security.
 *
 * Not shown, because none of it exists: a per-device session list (the table it
 * read is never written) and a "download security report" button that had no
 * handler. An empty list of devices and a dead button are worse than their
 * absence — they suggest a protection the account does not have.
 *
 * Passkeys (PW-PROVENANCE-01 R-01) are shown ONLY while the deployment enables
 * them (`PASSKEYS_ENABLED`): then the block can actually enrol one, and an
 * empty list next to a working button is a fact, not a suggestion.
 */

const EVENT_META = {
    login_success: { icon: LogIn, key: "eventLogin" },
    email_change: { icon: Mail, key: "eventEmailChange" },
    password_change: { icon: KeyRound, key: "eventPasswordChange" },
    login_failed: { icon: ShieldCheck, key: "eventLoginFailed" },
    logout: { icon: LogIn, key: "eventLogout" },
} as const

export function SecuritySection({ data }: { data: SecurityData }) {
    const { t, language } = useLanguage()
    const router = useRouter()
    const copy = t.settings.security

    const [passwordOpen, setPasswordOpen] = useState(false)
    const [signOutAllOpen, setSignOutAllOpen] = useState(false)
    const [busy, setBusy] = useState<null | "others">(null)

    const formatDateTime = (iso: string) =>
        new Date(iso).toLocaleDateString(resolveLocale(language), {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })

    const handleSignOutOthers = async () => {
        setBusy("others")
        const result = await signOutOtherDevices()
        setBusy(null)
        if ("error" in result) {
            toast.error(copy.signOutFailed)
            return
        }
        toast.success(copy.signOutOthersDone)
        router.refresh()
    }

    return (
        <>
            <SettingsSection icon={KeyRound} title={copy.passwordTitle} description={copy.passwordDesc}>
                <SettingsRowList>
                    <SettingRow
                        label={copy.passwordLabel}
                        value="••••••••••"
                        hint={copy.passwordRules}
                        action={
                            <button
                                type="button"
                                onClick={() => setPasswordOpen(true)}
                                className="pw-soft-button"
                            >
                                {copy.changePassword}
                            </button>
                        }
                    />
                    <SettingRow
                        label={copy.forgotPassword}
                        action={
                            <Link href="/auth/forgot-password" className="pw-soft-button">
                                {copy.forgotPasswordCta}
                            </Link>
                        }
                    />
                </SettingsRowList>
            </SettingsSection>

            {data.passkeys.enabled ? (
                <SettingsSection icon={Fingerprint} title={copy.passkeysTitle} description={copy.passkeysDesc}>
                    <PasskeysBlock items={data.passkeys.items} />
                </SettingsSection>
            ) : null}

            <SettingsSection icon={MonitorSmartphone} title={copy.devicesTitle} description={copy.devicesDesc}>
                <SettingsRowList>
                    <SettingRow
                        label={copy.signOutOthers}
                        hint={copy.signOutOthersDesc}
                        action={
                            <button
                                type="button"
                                onClick={handleSignOutOthers}
                                disabled={busy !== null}
                                // The row label already names the action; repeating
                                // it in the button gave the same sentence twice on
                                // one line and pushed the row past 320px.
                                aria-label={copy.signOutOthers}
                                className="pw-soft-button disabled:opacity-60"
                            >
                                {busy === "others" && (
                                    <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
                                )}
                                {copy.signOutAction}
                            </button>
                        }
                    />
                    <SettingRow
                        label={copy.signOutEverywhere}
                        hint={copy.signOutEverywhereDesc}
                        action={
                            <button
                                type="button"
                                onClick={() => setSignOutAllOpen(true)}
                                aria-label={copy.signOutEverywhere}
                                className="pw-soft-button text-status-danger"
                            >
                                {copy.signOutAction}
                            </button>
                        }
                    />
                </SettingsRowList>
            </SettingsSection>

            <SettingsSection icon={ShieldAlert} title={copy.activityTitle} description={copy.activityDesc}>
                {data.events.length === 0 ? (
                    <div className="pw-subcard p-4">
                        <p className="text-sm font-semibold text-foreground">
                            {copy.activityEmptyTitle}
                        </p>
                        <p className="mt-1 text-caption leading-snug text-muted-foreground">
                            {copy.activityEmptyDesc}
                        </p>
                    </div>
                ) : (
                    <ul className="divide-y divide-black/5 dark:divide-white/10">
                        {data.events.map((event) => {
                            const meta = EVENT_META[event.type as keyof typeof EVENT_META]
                            const Icon = meta?.icon ?? ShieldCheck
                            // An event type with no label is a bug, not a string to
                            // print: the previous screen had no case for
                            // `login_success` — the only login event anything
                            // writes — so every sign-in rendered the raw key.
                            if (!meta) return null
                            return (
                                <li key={event.id} className="flex min-h-11 items-center gap-3 py-3">
                                    <span
                                        aria-hidden="true"
                                        className="pw-card-chip"
                                    >
                                        <Icon className="h-4 w-4" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-semibold text-foreground">
                                            {copy[meta.key]}
                                        </span>
                                        <span className="mt-0.5 block text-caption text-muted-foreground">
                                            {formatDateTime(event.at)}
                                            {event.ip && (
                                                <>
                                                    {" · "}
                                                    {copy.fromIp} <span className="font-mono">{event.ip}</span>
                                                </>
                                            )}
                                        </span>
                                    </span>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </SettingsSection>

            <ChangePasswordModal open={passwordOpen} onOpenChange={setPasswordOpen} />

            <ConfirmDialog
                open={signOutAllOpen}
                onOpenChange={setSignOutAllOpen}
                destructive
                title={copy.signOutConfirmTitle}
                description={copy.signOutConfirmBody}
                confirmLabel={copy.signOutEverywhere}
                onConfirm={async () => {
                    await signOutEverywhere()
                }}
            />
        </>
    )
}
