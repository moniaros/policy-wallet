/**
 * The notification streams a user may switch off, keyed by the EXACT event type
 * the sender checks.
 *
 * The settings screen used to hardcode three ids of its own — `policy_expiry`,
 * `security_alert`, `marketing` — and no sender read any of them. The renewal
 * reminder reads `policy_expiring`, so the "Policy expiry" toggle wrote a row
 * nothing ever consulted and switching it off changed nothing. The other two
 * were read by nobody at all. Meanwhile the three email streams that DO consult
 * NotificationPreference — the weekly digest, churn prevention and the
 * engagement drip — had no toggle at all.
 *
 * That mattered beyond tidiness: every email footer links here offering to
 * manage notifications, and the privacy policy states the lawful basis as
 * consent with an unsubscribe option in every message. The mechanism was real in
 * the services; the control was not.
 *
 * Keys live here so the written key IS the read key, and a guard checks each one
 * against the senders.
 */
export interface NotificationPreferenceGroup {
    /** The eventType a sender passes — must match exactly. */
    eventType: string
    /** Additional event types this switch also governs. */
    alsoCovers?: string[]
    labelKey: "renewalReminders" | "weeklyDigest" | "coverageFindings" | "advisorMessages" | "productUpdates"
}

export const NOTIFICATION_PREFERENCE_GROUPS: NotificationPreferenceGroup[] = [
    { eventType: "policy_expiring", alsoCovers: ["renewal_milestone", "perk_reminder"], labelKey: "renewalReminders" },
    { eventType: "weekly_digest", labelKey: "weeklyDigest" },
    { eventType: "GAP_DETECTED", alsoCovers: ["policy_analyzed"], labelKey: "coverageFindings" },
    {
        eventType: "collaboration_daily_digest",
        alsoCovers: ["collaboration_unread_followup", "collaboration_action_overdue"],
        labelKey: "advisorMessages",
    },
    { eventType: "churn_prevention", alsoCovers: ["engagement_welcome", "engagement_day3", "engagement_day7"], labelKey: "productUpdates" },
]

/** Every event type a switch governs — what the toggle must write. */
export function eventTypesFor(group: NotificationPreferenceGroup): string[] {
    return [group.eventType, ...(group.alsoCovers ?? [])]
}
