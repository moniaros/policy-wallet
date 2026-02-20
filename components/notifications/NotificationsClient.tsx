"use client"

import { useMemo, useState, type ComponentType } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { BellRing, CheckCircle2, Loader2, Mail, MessageCircle, Settings2, Smartphone } from "lucide-react"
import { toast } from "sonner"
import { useLanguage } from "@/contexts/LanguageContext"
import { fixMojibakeText } from "@/lib/i18n/fix-mojibake"

interface NotificationEvent {
    id: string
    event_type: string
    channel: "email" | "push" | "whatsapp" | "viber"
    title: string
    message: string
    created_at: string
    read_at?: string
    priority: "low" | "medium" | "high"
    category: "system_confirmation" | "reminder" | "intelligence"
    related_object_type?: string
    related_object_id?: string
}

interface NotificationPreference {
    event_type: string
    email_enabled: boolean
    push_enabled: boolean
}

interface NotificationsClientProps {
    initialData: {
        history: NotificationEvent[]
        preferences: NotificationPreference[]
        user: { id: string }
    }
    userLanguage?: string
}

const preferenceCatalog = [
    {
        eventType: "policy_expiring",
        label: { el: "Î›Î®Î¾Î· ÏƒÏ…Î¼Î²Î¿Î»Î±Î¯Î¿Ï…", en: "Policy expiring" },
        description: {
            el: "Î¥Ï€ÎµÎ½Î¸ÏÎ¼Î¹ÏƒÎ· Ï€ÏÎ¹Î½ Ï„Î· Î»Î®Î¾Î· Î³Î¹Î± Î½Î± Î¼Î·Î½ Ï‡Î¬ÏƒÎµÎ¹Ï‚ Ï„Î·Î½ Î±Î½Î±Î½Î­Ï‰ÏƒÎ·.",
            en: "Reminder before expiration so you never miss renewal.",
        },
    },
    {
        eventType: "pending_questionnaire",
        label: { el: "Î•ÎºÎºÏÎµÎ¼Î­Ï‚ ÎµÏÏ‰Ï„Î·Î¼Î±Ï„Î¿Î»ÏŒÎ³Î¹Î¿", en: "Pending questionnaire" },
        description: {
            el: "Î•Î½Î·Î¼Î­ÏÏ‰ÏƒÎ· Î³Î¹Î± ÎµÎºÎºÏÎµÎ¼Î® ÏƒÏ„Î¿Î¹Ï‡ÎµÎ¯Î± Ï€Î¿Ï… Ï‡ÏÎµÎ¹Î¬Î¶Î¿Î½Ï„Î±Î¹ ÏƒÏ…Î¼Ï€Î»Î®ÏÏ‰ÏƒÎ·.",
            en: "Updates for outstanding information requests.",
        },
    },
    {
        eventType: "renewal_milestone",
        label: { el: "ÎŸÏÏŒÏƒÎ·Î¼Î¿ Î±Î½Î±Î½Î­Ï‰ÏƒÎ·Ï‚", en: "Renewal milestone" },
        description: {
            el: "Î•Î¹Î´Î¿Ï€Î¿Î¯Î·ÏƒÎ· Î³Î¹Î± ÎºÏÎ¯ÏƒÎ¹Î¼Î± Î²Î®Î¼Î±Ï„Î± Î­Ï‰Ï‚ Ï„Î·Î½ Î±Î½Î±Î½Î­Ï‰ÏƒÎ·.",
            en: "Alert for important milestones before renewal.",
        },
    },
    {
        eventType: "policy_reviewed",
        label: { el: "ÎŸÎ»Î¿ÎºÎ»Î®ÏÏ‰ÏƒÎ· Î±Î½Î¬Î»Ï…ÏƒÎ·Ï‚", en: "Analysis completed" },
        description: {
            el: "Î•Î½Î·Î¼Î­ÏÏ‰ÏƒÎ· ÏŒÏ„Î±Î½ Î· AI Î±Î½Î¬Î»Ï…ÏƒÎ· Î¿Î»Î¿ÎºÎ»Î·ÏÏŽÎ½ÎµÏ„Î±Î¹.",
            en: "Notification when AI policy analysis is complete.",
        },
    },
]

const preferenceAliases: Record<string, string[]> = {
    pending_questionnaire: ["questionnaire_received"],
    questionnaire_received: ["pending_questionnaire"],
}

function normalizePreferenceEventType(eventType: string) {
    if (eventType === "questionnaire_received") return "pending_questionnaire"
    return eventType
}

const channelMeta: Record<NotificationEvent["channel"], { icon: ComponentType<{ className?: string }>; label: { el: string; en: string } }> = {
    email: {
        icon: Mail,
        label: { el: "Email", en: "Email" },
    },
    push: {
        icon: Smartphone,
        label: { el: "Push", en: "Push" },
    },
    whatsapp: {
        icon: MessageCircle,
        label: { el: "WhatsApp", en: "WhatsApp" },
    },
    viber: {
        icon: MessageCircle,
        label: { el: "Viber", en: "Viber" },
    },
}

export function NotificationsClient({ initialData, userLanguage = "en" }: NotificationsClientProps) {
    const { language } = useLanguage()
    const locale = language || userLanguage || "en"
    const isGreek = locale === "el"
    const tr = (el: string, en: string) => (isGreek ? fixMojibakeText(el) : en)
    const [activeTab, setActiveTab] = useState<"preferences" | "history">("preferences")
    const [savingKey, setSavingKey] = useState<string | null>(null)

    const [preferences, setPreferences] = useState<Record<string, { email: boolean; push: boolean }>>(() => {
        const map = new Map<string, { email: boolean; push: boolean }>()

        for (const item of initialData.preferences) {
            const normalizedEventType = normalizePreferenceEventType(item.event_type)
            const existing = map.get(normalizedEventType) || { email: false, push: false }
            map.set(normalizedEventType, {
                email: existing.email || item.email_enabled,
                push: existing.push || item.push_enabled,
            })
        }

        for (const item of preferenceCatalog) {
            if (!map.has(item.eventType)) {
                map.set(item.eventType, { email: true, push: true })
            }
        }

        return Object.fromEntries(map)
    })

    const historyItems = useMemo(() => initialData.history.slice(0, 24), [initialData.history])

    const enabledEmailCount = useMemo(() => {
        return Object.values(preferences).filter((entry) => entry.email).length
    }, [preferences])

    const totalPreferenceCount = preferenceCatalog.length

    const togglePreference = async (eventType: string, channel: "email" | "push") => {
        const current = preferences[eventType] || { email: true, push: true }
        const nextValue = !current[channel]
        const key = `${eventType}:${channel}`
        const linkedEventTypes = Array.from(new Set([eventType, ...(preferenceAliases[eventType] || [])]))

        setSavingKey(key)

        const previousState: Record<string, { email: boolean; push: boolean }> = {}
        for (const type of linkedEventTypes) {
            previousState[type] = preferences[type] || { email: true, push: true }
        }

        setPreferences((prev) => {
            const next = { ...prev }
            for (const type of linkedEventTypes) {
                const existing = prev[type] || { email: true, push: true }
                next[type] = {
                    ...existing,
                    [channel]: nextValue,
                }
            }
            return next
        })

        try {
            const { toggleNotificationPreference } = await import("@/app/(protected)/notifications/actions")
            const results = await Promise.all(
                linkedEventTypes.map((type) => (
                    toggleNotificationPreference(type, channel, nextValue, "policyholder")
                ))
            )
            if (results.some((result) => Boolean((result as { error?: string })?.error))) {
                throw new Error("Could not save one or more preferences")
            }
        } catch {
            setPreferences((prev) => {
                const next = { ...prev }
                for (const type of linkedEventTypes) {
                    next[type] = previousState[type]
                }
                return next
            })
            toast.error(tr("Î— Î±Ï€Î¿Î¸Î®ÎºÎµÏ…ÏƒÎ· Î±Ï€Î­Ï„Ï…Ï‡Îµ. Î”Î¿ÎºÎ¯Î¼Î±ÏƒÎµ Î¾Î±Î½Î¬.", "Could not save this preference. Please try again."))
        } finally {
            setSavingKey(null)
        }
    }

    return (
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6" aria-busy={Boolean(savingKey)}>
            <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                        <BellRing className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold text-slate-900">{tr("ÎšÎ­Î½Ï„ÏÎ¿ ÎµÎ¹Î´Î¿Ï€Î¿Î¹Î®ÏƒÎµÏ‰Î½", "Notification center")}</h1>
                        <p className="text-sm text-slate-600">{tr("Î•Ï€Î¯Î»ÎµÎ¾Îµ Ï€ÏŒÏ„Îµ Î¸Î­Î»ÎµÎ¹Ï‚ Î½Î± Î»Î±Î¼Î²Î¬Î½ÎµÎ¹Ï‚ email ÎºÎ±Î¹ push ÎµÎ½Î·Î¼ÎµÏÏŽÏƒÎµÎ¹Ï‚.", "Control when you receive email and push updates.")}</p>
                    </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
                        <p className="text-xs font-semibold text-blue-700">{tr("Email ÎµÎ½ÎµÏÎ³Î¬", "Email enabled")}</p>
                        <p className="text-lg font-bold text-blue-900">{enabledEmailCount}/{totalPreferenceCount}</p>
                    </div>
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
                        <p className="text-xs font-semibold text-emerald-700">{tr("Î ÏÏŒÏƒÏ†Î±Ï„ÎµÏ‚ ÎµÎ½Î·Î¼ÎµÏÏŽÏƒÎµÎ¹Ï‚", "Recent updates")}</p>
                        <p className="text-lg font-bold text-emerald-900">{historyItems.length}</p>
                    </div>
                </div>
            </div>

            <div
                className="mb-5 grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-1"
                role="tablist"
                aria-label={tr("Πλοήγηση ειδοποιήσεων", "Notification tabs")}
            >
                <button
                    type="button"
                    onClick={() => setActiveTab("preferences")}
                    role="tab"
                    aria-selected={activeTab === "preferences"}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${activeTab === "preferences" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
                >
                    {tr("Î ÏÎ¿Ï„Î¹Î¼Î®ÏƒÎµÎ¹Ï‚", "Preferences")}
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab("history")}
                    role="tab"
                    aria-selected={activeTab === "history"}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${activeTab === "history" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
                >
                    {tr("Î™ÏƒÏ„Î¿ÏÎ¹ÎºÏŒ", "History")}
                </button>
            </div>

            <p className="mb-4 text-xs text-slate-500" role="status" aria-live="polite">
                {savingKey ? tr("Î‘Ï€Î¿Î¸Î®ÎºÎµÏ…ÏƒÎ· Î±Î»Î»Î±Î³ÏŽÎ½...", "Saving changes...") : tr("ÎŸÎ¹ Î±Î»Î»Î±Î³Î­Ï‚ Î±Ï€Î¿Î¸Î·ÎºÎµÏÎ¿Î½Ï„Î±Î¹ Î±Ï…Ï„ÏŒÎ¼Î±Ï„Î±.", "Changes are saved automatically.")}
            </p>

            <AnimatePresence mode="wait">
                {activeTab === "preferences" ? (
                    <motion.div key="prefs" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="space-y-3">
                        {preferenceCatalog.map((item) => {
                            const current = preferences[item.eventType] || { email: true, push: true }
                            const emailKey = `${item.eventType}:email`
                            const pushKey = `${item.eventType}:push`

                            return (
                                <div key={item.eventType} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                    <p className="text-sm font-semibold text-slate-900">{isGreek ? fixMojibakeText(item.label.el) : item.label.en}</p>
                                    <p className="mt-1 text-sm text-slate-600">{isGreek ? fixMojibakeText(item.description.el) : item.description.en}</p>

                                    <div className="mt-4 grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => void togglePreference(item.eventType, "email")}
                                            disabled={savingKey === emailKey}
                                            aria-pressed={current.email}
                                            className={`inline-flex items-center justify-between rounded-xl border px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${current.email ? "border-blue-200 bg-blue-50 text-blue-900" : "border-slate-200 bg-white text-slate-700"} ${savingKey === emailKey ? "opacity-80" : ""}`}
                                        >
                                            <span className="inline-flex items-center gap-2">
                                                <Mail className="h-4 w-4" />
                                                {tr("Email", "Email")}
                                            </span>
                                            {savingKey === emailKey ? <Loader2 className="h-4 w-4 animate-spin" /> : current.email ? <CheckCircle2 className="h-4 w-4" /> : null}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => void togglePreference(item.eventType, "push")}
                                            disabled={savingKey === pushKey}
                                            aria-pressed={current.push}
                                            className={`inline-flex items-center justify-between rounded-xl border px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${current.push ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white text-slate-700"} ${savingKey === pushKey ? "opacity-80" : ""}`}
                                        >
                                            <span className="inline-flex items-center gap-2">
                                                <Smartphone className="h-4 w-4" />
                                                {tr("Push", "Push")}
                                            </span>
                                            {savingKey === pushKey ? <Loader2 className="h-4 w-4 animate-spin" /> : current.push ? <CheckCircle2 className="h-4 w-4" /> : null}
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </motion.div>
                ) : (
                    <motion.div key="history" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="space-y-3">
                        {historyItems.length === 0 ? (
                            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                                <Settings2 className="mx-auto h-5 w-5 text-slate-400" />
                                <p className="mt-2 text-sm text-slate-600">{tr("Î”ÎµÎ½ Ï…Ï€Î¬ÏÏ‡Î¿Ï…Î½ Ï€ÏÏŒÏƒÏ†Î±Ï„ÎµÏ‚ ÎµÎ¹Î´Î¿Ï€Î¿Î¹Î®ÏƒÎµÎ¹Ï‚.", "No recent notification activity.")}</p>
                            </div>
                        ) : (
                            historyItems.map((event) => {
                                const channelInfo = channelMeta[event.channel]
                                const ChannelIcon = channelInfo.icon
                                const createdAtDate = new Date(event.created_at)
                                const createdAtText = Number.isNaN(createdAtDate.getTime())
                                    ? event.created_at
                                    : createdAtDate.toLocaleString(isGreek ? "el-GR" : "en-US", { dateStyle: "short", timeStyle: "short" })

                                return (
                                    <div key={event.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900">{fixMojibakeText(event.title)}</p>
                                                <p className="mt-1 text-sm text-slate-600">{fixMojibakeText(event.message)}</p>
                                                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                                                    <ChannelIcon className="h-3 w-3" />
                                                    <span>{isGreek ? channelInfo.label.el : channelInfo.label.en}</span>
                                                </div>
                                            </div>
                                            <p className="text-xs font-medium text-slate-500">
                                                {createdAtText}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

