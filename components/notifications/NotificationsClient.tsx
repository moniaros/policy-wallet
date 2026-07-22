"use client"

import { useMemo, useState, useCallback, type ComponentType } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { BellRing, CheckCircle2, CheckCheck, Loader2, Mail, MessageCircle, Settings2, Smartphone } from "lucide-react"
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
        history: Array<{
            event_id: string
            event_type: string
            channel: string
            subject: string | null
            message: string | null
            created_at: string
            read_at?: string | null
            related_policy_id?: string | null
            related_policy_name?: string | null
        }>
        preferences: NotificationPreference[]
        user: { id?: string; user_id?: string }
    }
    userLanguage?: string
}

const preferenceCatalog = [
    {
        eventType: "policy_expiring",
        label: { el: "Λήξη συμβολαίου", en: "Policy expiring" },
        description: {
            el: "Υπενθύμιση πριν τη λήξη για να μη χάσεις την ανανέωση.",
            en: "Reminder before expiration so you never miss renewal.",
        },
    },
    {
        eventType: "pending_questionnaire",
        label: { el: "Εκκρεμές ερωτηματολόγιο", en: "Pending questionnaire" },
        description: {
            el: "Ενημέρωση για εκκρεμή στοιχεία που χρειάζονται συμπλήρωση.",
            en: "Updates for outstanding information requests.",
        },
    },
    {
        eventType: "renewal_milestone",
        label: { el: "Ορόσημο ανανέωσης", en: "Renewal milestone" },
        description: {
            el: "Ειδοποίηση για κρίσιμα βήματα έως την ανανέωση.",
            en: "Alert for important milestones before renewal.",
        },
    },
    {
        eventType: "policy_reviewed",
        label: { el: "Ολοκλήρωση ανάλυσης", en: "Analysis completed" },
        description: {
            el: "Ενημέρωση όταν η AI ανάλυση ολοκληρώνεται.",
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
    const tr = (el: string, en: string) => (isGreek ? el : en)
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

    const [readIds, setReadIds] = useState<Set<string>>(() => {
        const set = new Set<string>()
        for (const item of initialData.history) {
            if (item.read_at) set.add(item.event_id)
        }
        return set
    })
    const [markingRead, setMarkingRead] = useState(false)

    const historyItems = useMemo(() => initialData.history.slice(0, 24), [initialData.history])
    const unreadCount = useMemo(() => historyItems.filter((e) => !readIds.has(e.event_id)).length, [historyItems, readIds])

    const handleMarkRead = useCallback(async (eventId: string) => {
        if (readIds.has(eventId)) return
        setReadIds((prev) => new Set(prev).add(eventId))
        try {
            const { markNotificationRead } = await import("@/app/(protected)/notifications/actions")
            await markNotificationRead(eventId)
        } catch {
            setReadIds((prev) => {
                const next = new Set(prev)
                next.delete(eventId)
                return next
            })
        }
    }, [readIds])

    const handleMarkAllRead = useCallback(async () => {
        setMarkingRead(true)
        const allIds = new Set(historyItems.map((e) => e.event_id))
        setReadIds(allIds)
        try {
            const { markAllNotificationsRead } = await import("@/app/(protected)/notifications/actions")
            await markAllNotificationsRead()
            toast.success(tr("Όλες σημάνθηκαν ως αναγνωσμένες.", "All marked as read."))
        } catch {
            setReadIds(new Set())
            toast.error(tr("Αποτυχία σήμανσης.", "Could not mark as read."))
        } finally {
            setMarkingRead(false)
        }
    }, [historyItems, tr])

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
            toast.error(tr("Η αποθήκευση απέτυχε. Δοκίμασε ξανά.", "Could not save this preference. Please try again."))
        } finally {
            setSavingKey(null)
        }
    }

    return (
        <div className="pw-page-shell" aria-busy={Boolean(savingKey)}>
            <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
                <div className="mb-5 rounded-2xl border border-black/10 dark:border-white/15 bg-white dark:bg-black p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft dark:bg-primary/15 text-primary dark:text-mint">
                            <BellRing className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold text-black dark:text-white">{tr("Κέντρο ειδοποιήσεων", "Notification center")}</h1>
                            <p className="text-sm text-black/65 dark:text-white/70">{tr("Επίλεξε πότε θέλεις να λαμβάνεις email και push ενημερώσεις.", "Control when you receive email and push updates.")}</p>
                        </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-black/10 dark:border-white/15 bg-black/5 dark:bg-white/5 px-3 py-2">
                            <p className="text-xs font-semibold text-black/65 dark:text-white/70">{tr("Ενεργά email", "Email enabled")}</p>
                            <p className="text-lg font-semibold text-black dark:text-white">{enabledEmailCount}/{totalPreferenceCount}</p>
                        </div>
                        <div className="rounded-xl border border-primary/30 bg-primary-soft dark:bg-primary/15 px-3 py-2">
                            <p className="text-xs font-semibold text-black/70 dark:text-white/70">{tr("Πρόσφατες ενημερώσεις", "Recent updates")}</p>
                            <p className="text-lg font-semibold text-black dark:text-white">{historyItems.length}</p>
                        </div>
                    </div>
                </div>

                <div
                    className="mb-5 grid grid-cols-2 rounded-xl border border-black/10 dark:border-white/15 bg-black/5 dark:bg-white/5 p-1"
                    role="tablist"
                    aria-label={tr("Πλοήγηση ειδοποιήσεων", "Notification tabs")}
                >
                    <button
                        type="button"
                        onClick={() => setActiveTab("preferences")}
                        role="tab"
                        aria-selected={activeTab === "preferences"}
                        className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${activeTab === "preferences" ? "bg-white dark:bg-black text-black dark:text-white shadow-sm" : "text-black/60 dark:text-white/65"}`}
                    >
                        {tr("Προτιμήσεις", "Preferences")}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("history")}
                        role="tab"
                        aria-selected={activeTab === "history"}
                        className={`relative rounded-lg px-3 py-2 text-sm font-semibold transition ${activeTab === "history" ? "bg-white dark:bg-black text-black dark:text-white shadow-sm" : "text-black/60 dark:text-white/65"}`}
                    >
                        {tr("Ιστορικό", "History")}
                        {unreadCount > 0 && (
                            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                                {unreadCount}
                            </span>
                        )}
                    </button>
                </div>

                <p className="mb-4 text-xs text-black/50 dark:text-white/60" role="status" aria-live="polite">
                    {savingKey ? tr("Αποθήκευση αλλαγών...", "Saving changes...") : tr("Οι αλλαγές αποθηκεύονται αυτόματα.", "Changes are saved automatically.")}
                </p>

                <AnimatePresence mode="wait">
                    {activeTab === "preferences" ? (
                        <motion.div key="prefs" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="space-y-3">
                            {preferenceCatalog.map((item) => {
                                const current = preferences[item.eventType] || { email: true, push: true }
                                const emailKey = `${item.eventType}:email`
                                const pushKey = `${item.eventType}:push`

                                return (
                                    <div key={item.eventType} className="rounded-2xl border border-black/10 dark:border-white/15 bg-white dark:bg-black p-4 shadow-sm">
                                        <p className="text-sm font-semibold text-black dark:text-white">{isGreek ? item.label.el : item.label.en}</p>
                                        <p className="mt-1 text-sm text-black/65 dark:text-white/70">{isGreek ? item.description.el : item.description.en}</p>

                                        <div className="mt-4 grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => void togglePreference(item.eventType, "email")}
                                                disabled={savingKey === emailKey}
                                                aria-pressed={current.email}
                                                className={`inline-flex items-center justify-between rounded-xl border px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${current.email ? "border-primary/35 bg-primary-soft dark:bg-primary/15 text-black dark:text-white" : "border-black/15 dark:border-white/20 bg-white dark:bg-black text-black dark:text-white"} ${savingKey === emailKey ? "opacity-80" : ""}`}
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
                                                className={`inline-flex items-center justify-between rounded-xl border px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${current.push ? "border-primary/35 bg-primary-soft dark:bg-primary/15 text-black dark:text-white" : "border-black/15 dark:border-white/20 bg-white dark:bg-black text-black dark:text-white"} ${savingKey === pushKey ? "opacity-80" : ""}`}
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
                            {historyItems.length > 0 && unreadCount > 0 && (
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => void handleMarkAllRead()}
                                        disabled={markingRead}
                                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-primary dark:text-mint transition hover:bg-primary/10 disabled:opacity-60"
                                    >
                                        <CheckCheck className="h-3.5 w-3.5" />
                                        {markingRead ? tr("Σήμανση...", "Marking...") : tr("Σήμανση όλων ως αναγνωσμένα", "Mark all as read")}
                                    </button>
                                </div>
                            )}
                            {historyItems.length === 0 ? (
                                <div className="rounded-2xl border border-black/10 dark:border-white/15 bg-white dark:bg-black p-6 text-center shadow-sm">
                                    <Settings2 className="mx-auto h-5 w-5 text-black/40 dark:text-white/50" />
                                    <p className="mt-2 text-sm text-black/65 dark:text-white/70">{tr("Δεν υπάρχουν πρόσφατες ειδοποιήσεις.", "No recent notification activity.")}</p>
                                </div>
                            ) : (
                                historyItems.map((event) => {
                                    const channelInfo = channelMeta[event.channel as NotificationEvent["channel"]]
                                    const ChannelIcon = channelInfo?.icon || MessageCircle
                                    const channelLabel = channelInfo ? (isGreek ? channelInfo.label.el : channelInfo.label.en) : event.channel
                                    const createdAtDate = new Date(event.created_at)
                                    const createdAtText = Number.isNaN(createdAtDate.getTime())
                                        ? event.created_at
                                        : createdAtDate.toLocaleString(isGreek ? "el-GR" : "en-US", { dateStyle: "short", timeStyle: "short" })
                                    const isRead = readIds.has(event.event_id)

                                    return (
                                        <div
                                            key={event.event_id}
                                            onClick={() => void handleMarkRead(event.event_id)}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => { if (e.key === "Enter") void handleMarkRead(event.event_id) }}
                                            className={`cursor-pointer rounded-2xl border p-4 shadow-sm transition ${
                                                isRead
                                                    ? "border-black/10 dark:border-white/15 bg-white dark:bg-black"
                                                    : "border-l-[3px] border-l-primary border-t-black/10 border-r-black/10 border-b-black/10 dark:border-t-white/15 dark:border-r-white/15 dark:border-b-white/15 bg-primary/5 dark:bg-primary/10"
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className={`text-sm text-black dark:text-white ${isRead ? "font-medium" : "font-bold"}`}>
                                                        {fixMojibakeText(event.subject || "")}
                                                    </p>
                                                    <p className="mt-1 text-sm text-black/65 dark:text-white/70">{fixMojibakeText(event.message || "")}</p>
                                                    <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-black/5 dark:bg-white/10 px-2 py-0.5 text-xs font-medium text-black/70 dark:text-white/75">
                                                        <ChannelIcon className="h-3 w-3" />
                                                        <span>{channelLabel}</span>
                                                    </div>
                                                </div>
                                                <p className="text-xs font-medium text-black/50 dark:text-white/60 whitespace-nowrap">
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
        </div>
    )
}
