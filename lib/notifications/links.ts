/**
 * Where a notification points.
 *
 * One switch, because there were three: `mail-templates.ts` built the email CTA,
 * `NotificationBell.tsx` built the click target, and the push payload would have
 * needed a third. Three copies of "what does relatedObjectType mean" is three
 * chances for the email and the notification to open different pages for the
 * same event — and only two of them ever knew about a new object type.
 *
 * Pure and dependency-free so the client bell, the server mail builder and the
 * service-worker payload can all import it.
 */

/**
 * What a notification is about.
 *
 * Split into two groups on purpose. The linkable ones resolve to a page; the
 * rest identify the subject of the notification without pretending there is
 * somewhere to send the reader. Before this was a closed vocabulary, callers
 * put arbitrary strings here — `"upgrade_modal"`, `"nps"` — into a column the
 * UI switches on to build a deep link.
 */
export type LinkableObjectType =
    | "policy"
    | "customer"
    | "questionnaire"
    | "thread"
    | "recommendation"
    | "renewal"
    | "opportunity"

/** Identifies the subject; deliberately has no page to open. */
export type UnlinkedObjectType =
    | "achievement"
    | "feedback"
    | "subscription"
    | "policy_merge_request"

export type RelatedObjectType = LinkableObjectType | UnlinkedObjectType

export const LINKABLE_OBJECT_TYPES: LinkableObjectType[] = [
    "policy",
    "customer",
    "questionnaire",
    "thread",
    "recommendation",
    "renewal",
    "opportunity",
]

/**
 * In-app path for a notification's related object, or undefined when it has
 * none (a digest, a score movement) and the notification is not a link.
 */
export function notificationActionPath(
    relatedObjectType?: string | null,
    relatedObjectId?: string | null
): string | undefined {
    if (!relatedObjectType || !relatedObjectId) return undefined
    switch (relatedObjectType) {
        case "policy":
            return `/wallet/${relatedObjectId}`
        case "customer":
            return `/customers/${relatedObjectId}`
        case "thread":
            return `/collaboration/threads/${relatedObjectId}`
        case "questionnaire":
            return `/tasks/${relatedObjectId}`
        // These three have no detail route yet, so they open the page that lists
        // them. Deliberately NOT `/renewals/${id}` or an invented `#anchor`: a
        // link that 404s, or silently fails to scroll anywhere, is worse than
        // one that lands somewhere true. When a detail route appears, this is
        // the single line that changes.
        case "recommendation":
            return "/protection"
        case "renewal":
            return "/renewals"
        case "opportunity":
            return "/opportunities"
        default:
            // Unknown type: no link, rather than a guessed one. A notification
            // that opens the wrong page is worse than one that opens nothing.
            return undefined
    }
}
