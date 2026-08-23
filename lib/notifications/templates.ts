/**
 * Admin-authored notification copy.
 *
 * A template takes over the wording of one event on one channel in one
 * language. It is entirely OPTIONAL: with no template the caller's own copy is
 * used, which is what every notification did before this existed. Nothing in
 * the delivery path depends on a template being present.
 *
 * ## Why the variable list is closed
 *
 * Templates interpolate `{{name}}` from a per-event allowlist. The alternative —
 * handing the template the whole payload — means an operator can accidentally
 * publish an internal id, a policy number or an email address into a push
 * notification that appears on a lock screen. A closed list makes the blast
 * radius of a typo a literal `{{typo}}` in the copy rather than a data leak, and
 * it lets the editor show exactly what is available.
 *
 * ## Why rendering never throws
 *
 * A template is operator input reaching a delivery path. A malformed one must
 * degrade to the caller's copy, not take down the notification — losing the
 * wording is a cosmetic failure, losing the notification is not.
 */

export const TEMPLATE_CHANNELS = ["in_app", "email", "push"] as const
export type TemplateChannel = (typeof TEMPLATE_CHANNELS)[number]

export const TEMPLATE_LOCALES = ["el", "en"] as const
export type TemplateLocale = (typeof TEMPLATE_LOCALES)[number]

/**
 * Variables every template may use, whatever the event.
 *
 * Deliberately small, and deliberately free of identifiers: a template author
 * gets the recipient's name and the app, not their user id.
 */
export const COMMON_VARIABLES = ["recipientName", "appName"] as const

/**
 * Additional variables per event, on top of the common set.
 *
 * Anything not listed here is not addressable, so adding a variable is a
 * conscious act with a reviewer, not a side effect of some payload growing.
 */
export const EVENT_VARIABLES: Record<string, readonly string[]> = {
    policy_analyzed: ["policyNumber", "insurerName"],
    policy_analysis_failed: ["policyNumber", "insurerName"],
    policy_added: ["policyNumber", "insurerName", "branchLabel"],
    policy_updated: ["policyNumber", "insurerName"],
    policy_removed: ["policyNumber", "insurerName"],
    policy_shared: ["policyNumber", "insurerName", "counterpartyName"],
    policy_expiring: ["policyNumber", "insurerName", "expiryDate", "daysUntilExpiry"],
    renewal_overdue: ["policyNumber", "insurerName", "expiryDate"],
    renewal_milestone: ["policyNumber", "insurerName", "customerName", "daysUntilExpiry"],
    GAP_DETECTED: ["gapName", "gapCount"],
    risk_level_changed: ["riskName", "changeCount"],
    recommendation_generated: ["recommendationCount"],
    life_event_recorded: ["lifeEventLabel"],
    payment_failed: [],
    subscription_expired: [],
    subscription_upgraded: [],
    advisor_assigned: ["counterpartyName"],
    collaboration_message: ["counterpartyName"],
    extraction_flagged: ["policyNumber", "flagReason"],
}

/** Every variable this event's templates may reference. */
export function variablesFor(eventType: string): string[] {
    return [...COMMON_VARIABLES, ...(EVENT_VARIABLES[eventType] ?? [])]
}

export type TemplateVars = Record<string, string | number | null | undefined>

export interface TemplateRow {
    subject: string | null
    title: string
    body: string
}

export interface RenderedTemplate {
    subject?: string
    title: string
    body: string
}

const PLACEHOLDER = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g

/**
 * Substitute `{{name}}` from the allowlist.
 *
 * An unknown or absent variable renders as an EMPTY string, not as the literal
 * `{{name}}`: a customer seeing raw template syntax in an email is a worse
 * outcome than a slightly terse sentence. Both are logged as validation
 * problems at save time, which is where they should be caught.
 */
export function interpolate(text: string, vars: TemplateVars, allowed: string[]): string {
    const allowedSet = new Set(allowed)
    return text.replace(PLACEHOLDER, (_match, name: string) => {
        if (!allowedSet.has(name)) return ""
        const value = vars[name]
        if (value === null || value === undefined) return ""
        return String(value)
    })
}

export interface TemplateIssue {
    field: "subject" | "title" | "body"
    /** Variables used that this event does not offer. */
    unknownVariables: string[]
}

/**
 * Check a template before it is saved.
 *
 * Reports unknown variables rather than rejecting outright: an operator
 * mid-edit, or one preparing copy for a variable that is about to be added, is
 * a normal state. The editor surfaces these; it does not block on them.
 */
export function validateTemplate(row: TemplateRow, eventType: string): TemplateIssue[] {
    const allowed = new Set(variablesFor(eventType))
    const issues: TemplateIssue[] = []

    for (const field of ["subject", "title", "body"] as const) {
        const text = row[field]
        if (!text) continue
        const unknown = new Set<string>()
        for (const match of text.matchAll(PLACEHOLDER)) {
            if (!allowed.has(match[1])) unknown.add(match[1])
        }
        if (unknown.size > 0) issues.push({ field, unknownVariables: [...unknown] })
    }

    return issues
}

/** Keyed "{eventType}:{channel}:{locale}". */
export type TemplateMap = Record<string, TemplateRow>

export function templateKey(eventType: string, channel: string, locale: string): string {
    return `${eventType}:${channel}:${locale}`
}

/**
 * Render the template for one delivery, or null when there is none — in which
 * case the caller's own copy is used unchanged.
 */
export function renderTemplate(
    templates: TemplateMap,
    eventType: string,
    channel: string,
    locale: string,
    vars: TemplateVars
): RenderedTemplate | null {
    try {
        const row = templates[templateKey(eventType, channel, locale)]
        if (!row) return null

        const allowed = variablesFor(eventType)
        const title = interpolate(row.title, vars, allowed).trim()
        const body = interpolate(row.body, vars, allowed).trim()

        // An empty result is not a usable notification. Falling back to the
        // caller's copy is the only honest outcome — sending a blank title
        // because a template rendered to nothing would be worse than ignoring
        // the template.
        if (!title || !body) return null

        const subject = row.subject ? interpolate(row.subject, vars, allowed).trim() : undefined
        return { title, body, subject: subject || undefined }
    } catch {
        // Operator input on a delivery path: degrade, never throw.
        return null
    }
}
