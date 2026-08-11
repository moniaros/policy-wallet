"use client"

import { useState } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowRight, Mail, MessageSquare, Shield, Zap } from "lucide-react"
import { toast } from "sonner"
import { useLanguage } from "@/contexts/LanguageContext"
import { SettingsSection } from "@/components/settings/SettingsSection"
import { Switch } from "@/components/ui/form/Switch"
import { PushOptIn } from "@/components/notifications/PushOptIn"
import { QuietHours } from "@/components/notifications/QuietHours"
import { toggleNotificationPreference } from "@/app/(protected)/account/actions"
import {
    NOTIFICATION_PREFERENCE_GROUPS,
    eventTypesFor,
} from "@/lib/notifications/preference-registry"
import type { NotificationSettingsData } from "@/app/(protected)/account/data"

const GROUP_ICON = {
    renewalReminders: AlertTriangle,
    weeklyDigest: Mail,
    coverageFindings: Shield,
    advisorMessages: MessageSquare,
    productUpdates: Zap,
} as const

/**
 * The one place notification preferences are set.
 *
 * There were two. This screen showed five registry-backed groups; `/notifications`
 * showed a different four-item list of its own, two of which (`pending_questionnaire`,
 * `policy_reviewed`) no sender has ever consulted — and it exposed
 * `renewal_milestone` on its own even though the "renewal reminders" switch here
 * governs it as part of a group. Turning a group off in one screen could be
 * silently half-undone in the other. `/notifications` now owns the history feed
 * and links here for the controls.
 */
export function NotificationsSection({ data }: { data: NotificationSettingsData }) {
    const { t } = useLanguage()
    const copy = t.settings.notifications

    const initial = new Map<string, boolean>()
    for (const pref of data.preferences) {
        if (pref.channel === "email") initial.set(pref.eventType, pref.enabled)
    }

    // Optimistic, keyed by the group's primary event type. A preference write is
    // a server round-trip; a switch that does not move until it lands reads as
    // broken, and the previous version did exactly that.
    const [overrides, setOverrides] = useState<Record<string, boolean>>({})
    const [pending, setPending] = useState<Record<string, boolean>>({})

    // Absent row means on — the dispatcher only suppresses on an explicit false.
    const isEnabled = (eventType: string) =>
        overrides[eventType] ?? initial.get(eventType) ?? true

    const toggle = async (group: (typeof NOTIFICATION_PREFERENCE_GROUPS)[number], next: boolean) => {
        const key = group.eventType
        setOverrides((prev) => ({ ...prev, [key]: next }))
        setPending((prev) => ({ ...prev, [key]: true }))

        // One switch governs every event type in its group, so they must all
        // move together or the group splits.
        const results = await Promise.all(
            eventTypesFor(group).map((eventType) =>
                toggleNotificationPreference(eventType, "email", next).catch(() => ({
                    error: "FAILED",
                }))
            )
        )

        setPending((prev) => {
            const rest = { ...prev }
            delete rest[key]
            return rest
        })

        if (results.some((result) => result && "error" in result && result.error)) {
            setOverrides((prev) => ({ ...prev, [key]: !next }))
            toast.error(copy.saveFailed)
        }
    }

    return (
        <>
            <SettingsSection title={copy.emailTitle} description={copy.emailDesc}>
                <div className="divide-y divide-black/5 dark:divide-white/10">
                    {NOTIFICATION_PREFERENCE_GROUPS.map((group) => {
                        const Icon = GROUP_ICON[group.labelKey]
                        const groupCopy = t.settings.notificationGroups[group.labelKey]
                        return (
                            <Switch
                                key={group.eventType}
                                checked={isEnabled(group.eventType)}
                                onCheckedChange={(next) => void toggle(group, next)}
                                pending={Boolean(pending[group.eventType])}
                                label={groupCopy.label}
                                description={groupCopy.description}
                                icon={<Icon className="h-4 w-4" />}
                            />
                        )
                    })}
                </div>
            </SettingsSection>

            <SettingsSection title={copy.deviceTitle} description={copy.deviceDesc}>
                <PushOptIn />
            </SettingsSection>

            {/* Only when the preference actually loaded — `getQuietHours` returns
                null on a read failure, and an empty "when we interrupt you" card
                would imply we never do. */}
            {data.quietHours && (
                <SettingsSection title={copy.timingTitle}>
                    <QuietHours initial={data.quietHours} />
                </SettingsSection>
            )}

            <SettingsSection title={copy.historyTitle} description={copy.historyDesc}>
                <Link
                    href="/notifications"
                    className="pw-secondary-button pw-btn-sm inline-flex items-center gap-2"
                >
                    {copy.historyCta}
                    <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                </Link>
            </SettingsSection>
        </>
    )
}
