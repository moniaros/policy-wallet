"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { KeyRound, Loader2, LogIn, Mail, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { useLanguage } from "@/contexts/LanguageContext"
import { buttonClassName } from "@/src/design-system/primitives"
import { SettingsSection, SettingsRowList } from "@/components/settings/SettingsSection"
import { SettingRow } from "@/components/settings/SettingRow"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { ChangePasswordModal } from "@/components/settings/ChangePasswordModal"
import { signOutEverywhere, signOutOtherDevices } from "@/app/(protected)/me/security-actions"
import type { SecurityData } from "@/app/(protected)/me/data"

/**
 * What we can honestly say about this account's security.
 *
 * Not shown, because none of it exists: a per-device session list (the table it
 * read is never written), two-factor authentication, passkeys, and a
 * "download security report" button that had no handler. An empty list of
 * devices and a dead button are worse than their absence — they suggest a
 * protection the account does not have.
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
        new Date(iso).toLocaleDateString(language === "el" ? "el-GR" : "en-GB", {
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
            <SettingsSection title={copy.passwordTitle} description={copy.passwordDesc}>
                <SettingsRowList>
                    <SettingRow
                        label={copy.passwordLabel}
                        value="••••••••••"
                        hint={copy.passwordRules}
                        action={
                            <button
                                type="button"
                                onClick={() => setPasswordOpen(true)}
                                className={buttonClassName({ variant: "secondary", size: "sm" })}
                            >
                                {copy.changePassword}
                            </button>
                        }
                    />
                    <SettingRow
                        label={copy.forgotPassword}
                        action={
                            <Link href="/auth/forgot-password" className={buttonClassName({ variant: "secondary", size: "sm" })}>
                                {copy.forgotPasswordCta}
                            </Link>
                        }
                    />
                </SettingsRowList>
            </SettingsSection>

            <SettingsSection title={copy.devicesTitle} description={copy.devicesDesc}>
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
                                className={buttonClassName({ variant: "secondary", size: "sm" }, "disabled:opacity-60")}
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
                                className={buttonClassName({ variant: "secondary", size: "sm" }, "border-action-danger/40 text-action-danger hover:bg-action-danger/10")}
                            >
                                {copy.signOutAction}
                            </button>
                        }
                    />
                </SettingsRowList>
            </SettingsSection>

            <SettingsSection title={copy.activityTitle} description={copy.activityDesc}>
                {data.events.length === 0 ? (
                    <div className="rounded-g-control border border-dashed border-border-strong bg-surface-sunken p-g-4">
                        <p className="text-g-app-body-sm font-semibold text-fg-primary">
                            {copy.activityEmptyTitle}
                        </p>
                        <p className="mt-1 text-caption leading-snug text-muted-foreground">
                            {copy.activityEmptyDesc}
                        </p>
                    </div>
                ) : (
                    <ul className="divide-y divide-border-hair">
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
                                        className="grid h-9 w-9 shrink-0 place-items-center rounded-g-control bg-surface-sunken text-fg-secondary"
                                    >
                                        <Icon className="h-4 w-4" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-g-app-body-sm font-semibold text-fg-primary">
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
