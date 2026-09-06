"use client"

import { IdCard, Languages, UserRound } from "lucide-react"
import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/contexts/LanguageContext"
import { SettingsSection, SettingsRowList } from "@/components/settings/SettingsSection"
import { SettingRow } from "@/components/settings/SettingRow"
import { InlineEditRow } from "@/components/settings/InlineEditRow"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { LocaleToggle } from "@/components/ui/LocaleToggle"
import { updateEmail, updateProfile } from "@/app/(protected)/account/actions"
import type { ProfileData } from "@/app/(protected)/account/data"
import { resolveLocale } from "@/lib/i18n/format"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function ProfileSection({ data }: { data: ProfileData }) {
    const { t, language } = useLanguage()
    const router = useRouter()
    const copy = t.settings.profile

    // The confirmation for an email change is a promise the editor awaits, so
    // declining returns to the open field with the typed value intact instead
    // of throwing the user back to a read-only row.
    const [emailConfirmOpen, setEmailConfirmOpen] = useState(false)
    const emailDecision = useRef<((approved: boolean) => void) | null>(null)

    const settleEmailConfirm = (approved: boolean) => {
        setEmailConfirmOpen(false)
        emailDecision.current?.(approved)
        emailDecision.current = null
    }

    // `User.roles` is a comma-separated string; split rather than substring-match
    // so a future role that contains another's name cannot false-positive.
    const roles = data.roles.split(",").map((r) => r.trim())
    const roleLabel = roles.includes("admin")
        ? copy.roleAdmin
        : roles.includes("agent")
          ? copy.roleAgent
          : copy.rolePolicyholder

    const memberSince = new Date(data.createdAt).toLocaleDateString(
        resolveLocale(language),
        { day: "numeric", month: "long", year: "numeric" }
    )

    return (
        <>
            <SettingsSection icon={UserRound} title={copy.detailsTitle} description={copy.detailsDesc}>
                <SettingsRowList>
                    <InlineEditRow
                        label={copy.fullName}
                        value={data.name}
                        emptyLabel={t.settings.notSet}
                        autoComplete="name"
                        serverErrorLabel={t.settings.updateFailed}
                        onSave={async (name) => {
                            const result = await updateProfile({ name })
                            if ("error" in result && result.error) return t.settings.updateFailed
                            router.refresh()
                        }}
                    />

                    <InlineEditRow
                        label={copy.phone}
                        value={data.phone}
                        emptyLabel={t.settings.notSet}
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        hint={copy.phoneHint}
                        validate={(value) =>
                            // Deliberately permissive: Greek mobiles, landlines and
                            // foreign numbers all belong here, so this rejects only
                            // what cannot be a phone number at all.
                            value.replace(/[\s()+-]/g, "").length >= 8 ? null : copy.phoneInvalid
                        }
                        serverErrorLabel={t.settings.updateFailed}
                        onSave={async (phone) => {
                            const result = await updateProfile({ phone })
                            if ("error" in result && result.error) return t.settings.updateFailed
                            router.refresh()
                        }}
                    />

                    <InlineEditRow
                        label={copy.email}
                        value={data.email}
                        emptyLabel={t.settings.notSet}
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        hint={copy.emailHint}
                        editHint={copy.emailEditHint}
                        validate={(value) => (EMAIL_PATTERN.test(value) ? null : copy.emailInvalid)}
                        confirm={() =>
                            new Promise<boolean>((resolve) => {
                                emailDecision.current = resolve
                                setEmailConfirmOpen(true)
                            })
                        }
                        serverErrorLabel={t.settings.updateFailed}
                        onSave={async (email) => {
                            const result = await updateEmail(email)
                            if ("error" in result && result.error) {
                                if (result.error === "EMAIL_IN_USE") return copy.emailInUse
                                if (result.error === "INVALID_EMAIL") return copy.emailInvalid
                                return t.settings.updateFailed
                            }
                            router.refresh()
                        }}
                    />
                </SettingsRowList>
            </SettingsSection>

            <SettingsSection icon={Languages} title={copy.languageTitle} description={copy.languageDesc}>
                {/* Writes `preferredLanguage` through the language context, which
                    is the same column the app shell's switcher writes — one
                    preference, one write path. */}
                <LocaleToggle variant="settings" ariaLabel={copy.languageTitle} />
            </SettingsSection>

            <SettingsSection icon={IdCard} title={copy.accountTitle}>
                <SettingsRowList>
                    <SettingRow label={copy.memberSince} value={memberSince} />
                    <SettingRow label={copy.role} value={roleLabel} />
                </SettingsRowList>
            </SettingsSection>

            <ConfirmDialog
                open={emailConfirmOpen}
                onOpenChange={(open) => {
                    if (!open) settleEmailConfirm(false)
                }}
                title={copy.emailConfirmTitle}
                description={copy.emailConfirmBody}
                consequences={[copy.emailEditHint]}
                confirmLabel={copy.emailConfirmCta}
                onConfirm={() => settleEmailConfirm(true)}
            />
        </>
    )
}
