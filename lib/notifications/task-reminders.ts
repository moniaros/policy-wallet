export const TASK_REMINDER_TYPES = ['collaboration_action_overdue', 'collaboration_unread_followup', 'collaboration_daily_digest'] as const

/** Groups recurring reminders about an exact subject, not deliveries of one event. */
export function reminderSubjectKey(type: string, subjectId: string | null): string | null {
    return subjectId && TASK_REMINDER_TYPES.some(t => t === type) ? `${type}:${subjectId}` : null
}

export function currentReminders<T extends { reminder_key?: string | null; reminder_active?: boolean }>(rows: readonly T[]): T[] {
    const seen = new Set<string>()
    return rows.filter(row => {
        if (row.reminder_active === false) return false
        if (!row.reminder_key) return true
        if (seen.has(row.reminder_key)) return false
        seen.add(row.reminder_key)
        return true
    })
}
