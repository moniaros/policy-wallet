/**
 * Human labels for the collaboration thread + action enums (raw String columns).
 *
 * These leaked raw to users in more than one place: the CollaborationTimeline
 * rendered `{thread.status}`, `{thread.priority}` and the action-status <select>
 * options verbatim — so a Greek advisor read "waiting_policyholder", "high" and
 * "in_progress" (raw English machine codes) on the collaboration screen. Single
 * source of truth so AgentInbox and the timeline can't drift; mirrors
 * lib/opportunity/status-labels.ts.
 */

// Thread.status — all five states carry a human label (the two waiting_* states
// previously had none anywhere).
export const THREAD_STATUS_LABELS: Record<string, { en: string; el: string }> = {
    open: { en: 'Open', el: 'Ανοιχτό' },
    resolved: { en: 'Resolved', el: 'Επιλύθηκε' },
    closed: { en: 'Closed', el: 'Έκλεισε' },
    waiting_agent: { en: 'Awaiting advisor', el: 'Αναμονή συμβούλου' },
    waiting_policyholder: { en: 'Awaiting client', el: 'Αναμονή πελάτη' },
}

// Thread.priority.
export const THREAD_PRIORITY_LABELS: Record<string, { en: string; el: string }> = {
    low: { en: 'Low', el: 'Χαμηλή' },
    medium: { en: 'Medium', el: 'Μεσαία' },
    high: { en: 'High', el: 'Υψηλή' },
}

// CollaborationAction.status.
export const ACTION_STATUS_LABELS: Record<string, { en: string; el: string }> = {
    pending: { en: 'Pending', el: 'Σε εκκρεμότητα' },
    in_progress: { en: 'In progress', el: 'Σε εξέλιξη' },
    done: { en: 'Done', el: 'Ολοκληρώθηκε' },
    cancelled: { en: 'Cancelled', el: 'Ακυρώθηκε' },
}

/** Bilingual label for a thread status; unknown values fall back to the raw string. */
export function threadStatusLabel(status: string): { en: string; el: string } {
    return THREAD_STATUS_LABELS[status] ?? { en: status, el: status }
}

/** Bilingual label for a thread priority; unknown values fall back to the raw string. */
export function threadPriorityLabel(priority: string): { en: string; el: string } {
    return THREAD_PRIORITY_LABELS[priority] ?? { en: priority, el: priority }
}

/** Bilingual label for a collaboration action status; unknown values fall back to the raw string. */
export function actionStatusLabel(status: string): { en: string; el: string } {
    return ACTION_STATUS_LABELS[status] ?? { en: status, el: status }
}
