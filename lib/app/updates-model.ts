import { db } from "@/lib/db"
import { groupNotificationEventRows } from "@/lib/notifications/event-grouping"
import { resolveStoredNotification } from "@/lib/notifications/stored-content"
import { getEventDefinition } from "@/lib/notifications/registry"
import { getTranslations } from "@/lib/i18n"
import { policyLabel, scrubRenderableText } from "@/lib/wallet/policy-identity"
import { badgeCount } from "./badge"
import { streamOf, STREAM_OF_EVENT, type NotificationStream } from "./streams"
import { logger } from "@/lib/logger"

export interface UpdateItem {
    id: string
    eventType: string
    stream: NotificationStream
    title: string
    message: string
    /** The object the update is about — a policy label — or null when the event names none. */
    objectLabel: string | null
    href: string | null
    unread: boolean
    at: string
    /** A failed reading offers a re-upload, worded as the analyst's limitation. */
    failedReading: boolean
}

export interface UpdatesModel {
    lang: "el" | "en"
    protection: UpdateItem[]
    meanwhile: UpdateItem[]
    badge: number
}

const RESOLVE_FROM_REGISTRY = new Set(["recommendation_generated", "recommendation_dismissed", "recommendation_accepted", "policy_renewal_approaching", "policy_renewal_reminder", "renewal_quote_requested"])

/** Event types that belong to a stream — the universe is lib/app/streams.ts, guarded against the registry. */
export function eventTypesOf(stream: NotificationStream): string[] {
    return Object.entries(STREAM_OF_EVENT).filter(([, s]) => s === stream).map(([k]) => k)
}

/**
 * /updates (§8.6): two groups from lib/app/streams.ts. One entry per event
 * (grouped on the stored dedupeKey — never a heuristic); every entry names
 * its object; read state is the in-app arm's. The badge is the protection
 * stream's unread count (lib/app/badge.ts), so it is always clearable.
 */
export async function loadUpdatesModel(userId: string, lang: "el" | "en"): Promise<UpdatesModel> {
    const rows = await db.notificationEvent.findMany({
        where: { userId, channel: { not: "analytics" } },
        orderBy: { createdAt: "desc" },
        take: 100,
    })
    const groups = groupNotificationEventRows(rows)
    const policyIds = [...new Set(groups.map((g) => g.representative).filter((e) => e.relatedObjectType === "policy" && e.relatedObjectId).map((e) => e.relatedObjectId!))]
    const policies = policyIds.length
        ? await db.policy.findMany({ where: { id: { in: policyIds }, ownerUserId: userId, status: { not: "deleted" } }, select: { id: true, insurerName: true, policyNumber: true } })
        : []
    const labelOf = new Map(policies.map((p) => [p.id, policyLabel(p, "")]))

    // H-001 / AI Act (§10): the protection score is retired and no percentage
    // of the person may render — but rows emitted BEFORE the retirement still
    // hold «Το σκορ προστασίας σας πήγε από 83% σε 74%» as stored prose. A
    // notification about a retired metric is dropped, not rewritten: rewriting
    // stored content would put words in the analyst's mouth.
    const isRetiredScoreRow = (title: string, message: string, eventType: string) =>
        /score/i.test(eventType) || /\d\s?%/.test(`${title} ${message}`) && /σκορ|score|προστασ/i.test(`${title} ${message}`)

    const items: UpdateItem[] = groups.flatMap((g) => {
        const e = g.representative
        // Recommendation rows emitted before Grafí G9 store «πρόταση»-framed
        // prose. For these types the CURRENT registry copy speaks, never the
        // stored text — the words changed, the event did not.
        const def = RESOLVE_FROM_REGISTRY.has(e.eventType) ? getEventDefinition(e.eventType) : null
        const defCopy = (def as { copy?: { title?: Record<string, string>; message?: Record<string, string> } } | null)?.copy
        // `policy_renewal_reminder` predates the registry entirely — its stored
        // prose steered («Ελέγξτε τις επιλογές ανανέωσης»). The fact stands, the
        // words come from the current catalogue.
        const raw = e.eventType === "policy_renewal_reminder"
            ? { title: getTranslations(lang).app.updates.legacyRenewal.title, message: getTranslations(lang).app.updates.legacyRenewal.body }
            : defCopy?.title && defCopy?.message
              ? { title: defCopy.title[lang], message: defCopy.message[lang] }
              : resolveStoredNotification(e.eventType, e.title, e.message, lang)
        const policyId = e.relatedObjectType === "policy" ? e.relatedObjectId : null
        const label = policyId ? labelOf.get(policyId) ?? null : null
        if (isRetiredScoreRow(scrubRenderableText(raw.title), scrubRenderableText(raw.message), e.eventType)) {
            logger("info", "[updates] retired score notification dropped", { eventType: e.eventType, id: e.id })
            return []
        }
        return {
            id: e.id,
            eventType: e.eventType,
            stream: streamOf(e.eventType),
            title: scrubRenderableText(raw.title),
            message: scrubRenderableText(raw.message),
            objectLabel: label,
            href: policyId && label ? `/policies/${policyId}` : null,
            unread: g.unread,
            at: e.createdAt.toISOString(),
            failedReading: e.eventType === "policy_analysis_failed",
        }
    })
    return {
        lang,
        protection: items.filter((i) => i.stream === "protection"),
        meanwhile: items.filter((i) => i.stream === "meanwhile"),
        badge: badgeCount(rows),
    }
}
