/**
 * What a STORED notification row is allowed to say to a reader.
 *
 * The columns `notification_events.title/message` hold whatever the writer of
 * the day put there. Since Aug 2026 every writer is typed to supply bilingual
 * copy (`LocalizedText` in dispatch.ts has no `string` arm) and the generic
 * executor composes from the registry's `copy` — so NEW rows are always in the
 * recipient's language. But the table still carries LEGACY rows written before
 * that cutover, and some of those store internal English documentation
 * verbatim: the registry's `businessEvent` ("AI extraction finished and the
 * policy is readable"), the events catalog's `description` ("AI extraction
 * read the policy successfully"), and a handful of English log lines
 * individual emitters used to write ("Welcome email sent", "Weekly digest: 2
 * renewals, 3 new gaps").
 *
 * This module is the ONE place that decides how such a row renders. Every
 * surface that reads these columns for display — the activity feed, the
 * Ειδοποιήσεις page, the bell dropdown, the v1 API — presents through here.
 * The rule:
 *
 *  1. A row whose title or message is an internal documentation string is
 *     replaced with the event's canonical bilingual `copy` from the registry.
 *     Not a hand-written per-event map: the replacement is derived from the
 *     same declaration the executor now composes from, so all events are
 *     covered and event 64 will be too.
 *  2. A row that matches internal prose but has no registry copy (its event
 *     was renamed or removed) degrades to a truthful generic — it never
 *     renders the internal prose and never invents a claim about what
 *     happened.
 *  3. Everything else passes through unchanged: it is emitter-composed
 *     content, resolved to the recipient's language when it was stored.
 *
 * The pattern list below is a LEGACY-ROW shim, enumerated from the registry
 * and catalog modules plus the exact composers this cutover deleted. Do not
 * add patterns for new events — a new event cannot store internal prose in
 * the first place, because the types will not let it.
 */

import {
    NOTIFICATION_EVENTS,
    getEventDefinition,
    type LocalizedCopy,
} from "./registry"
import { BUSINESS_EVENTS } from "@/lib/events/catalog"

export interface PresentedNotificationContent {
    title: LocalizedCopy
    message: LocalizedCopy
    /** True when stored internal prose was replaced or degraded. */
    sanitized: boolean
}

/**
 * Every internal documentation string that has ever been stored verbatim in a
 * customer-visible column, ENUMERATED from the modules that declare them —
 * never hand-listed per event.
 */
function internalDocStrings(): Set<string> {
    const out = new Set<string>()
    for (const def of Object.values(NOTIFICATION_EVENTS)) {
        out.add(def.businessEvent)
        out.add(def.triggerCondition)
    }
    for (const def of Object.values(BUSINESS_EVENTS)) {
        out.add(def.description)
        out.add(def.trigger)
    }
    return out
}

let INTERNAL_DOCS: Set<string> | null = null
function docs(): Set<string> {
    if (!INTERNAL_DOCS) INTERNAL_DOCS = internalDocStrings()
    return INTERNAL_DOCS
}

/**
 * Composed shapes the DELETED legacy emitters produced. Each pattern names the
 * file it came from; every one of those call sites now composes bilingual
 * content, so this list can only shrink.
 */
const LEGACY_COMPOSED_PATTERNS: RegExp[] = [
    /^\d+ failed delivery attempts of /, // notifications/retry.ts (pre-cutover wording)
    /^Welcome email sent$/, //           engagement-drip.service.ts
    /^Day 3 follow-up sent$/, //         engagement-drip.service.ts
    /^Coverage snapshot: /, //           engagement-drip.service.ts
    /^Weekly digest: /, //               weekly-digest.service.ts
    /^Churn prevention .* email sent /, // churn-prevention.service.ts
    /^NPS Score: /, //                   api/v1/feedback/route.ts
    /^Article feedback: /, //            api/v1/feedback/route.ts
    /^Score: \d/, //                     api/v1/feedback/route.ts
    /^(👍 Helpful|👎 Not helpful)/, //   api/v1/feedback/route.ts
    /^Recommendation (dismissed|actioned)$/, // api/v1/recommendations/[id]/route.ts
    /^This is a test notification for /, // admin/notifications/actions.ts
]

/** Is this stored string internal documentation rather than customer copy? */
export function isInternalDocProse(text: string | null | undefined): boolean {
    if (!text) return false
    const trimmed = text.trim()
    if (docs().has(trimmed)) return true
    // The old admin test send stored `[TEST] <businessEvent>`; the new one
    // stores `[TEST] <customer copy>`. Only the remainder decides.
    if (trimmed.startsWith("[TEST] ") && docs().has(trimmed.slice("[TEST] ".length))) return true
    // The executor's admin composer appended a reason: "<description> — <reason>".
    for (const doc of docs()) {
        if (doc.length >= 12 && trimmed.startsWith(`${doc} — `)) return true
    }
    return LEGACY_COMPOSED_PATTERNS.some((p) => p.test(trimmed))
}

/**
 * The truthful degrade for a legacy row whose event no longer has copy: say
 * that a notification exists and where it points, claim nothing else. Never
 * echo the internal prose.
 */
const GENERIC_FALLBACK: { title: LocalizedCopy; message: LocalizedCopy } = {
    title: { el: "Ειδοποίηση", en: "Notification" },
    message: {
        el: "Η αρχική διατύπωση αυτής της παλαιότερης ειδοποίησης δεν είναι διαθέσιμη.",
        en: "The original wording of this older notification is not available.",
    },
}

/**
 * Present one stored row for display. Pure and synchronous — surfaces map
 * over result sets with it.
 */
export function presentStoredNotification(
    eventType: string,
    storedTitle: string | null | undefined,
    storedMessage: string | null | undefined
): PresentedNotificationContent {
    const title = storedTitle ?? ""
    const message = storedMessage ?? ""

    const tainted = isInternalDocProse(title) || isInternalDocProse(message)
    if (!tainted) {
        // Emitter-composed content, stored in the recipient's language. There
        // is no second language to offer — showing the same text under both
        // toggles is honest; inventing a translation would not be.
        return {
            title: { el: title, en: title },
            message: { el: message, en: message },
            sanitized: false,
        }
    }

    const copy = getEventDefinition(eventType)?.copy
    if (copy) {
        return { title: copy.title, message: copy.message, sanitized: true }
    }
    return { ...GENERIC_FALLBACK, sanitized: true }
}

/**
 * Same, resolved to one language — for surfaces whose contract is a single
 * string (the bell dropdown, the v1 API, the watcher toasts).
 */
export function resolveStoredNotification(
    eventType: string,
    storedTitle: string | null | undefined,
    storedMessage: string | null | undefined,
    language: "el" | "en"
): { title: string; message: string; sanitized: boolean } {
    const presented = presentStoredNotification(eventType, storedTitle, storedMessage)
    return {
        title: presented.title[language],
        message: presented.message[language],
        sanitized: presented.sanitized,
    }
}
