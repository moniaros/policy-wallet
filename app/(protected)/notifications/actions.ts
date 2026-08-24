"use server"

import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import type { RecentNotification } from "@/lib/notifications/watcher"
import { resolveStoredNotification } from "@/lib/notifications/stored-content"
import { policyLabel } from "@/lib/wallet/policy-identity"
import { groupNotificationEventRows } from "@/lib/notifications/event-grouping"

export async function getNotificationData() {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return null

    const userId = authResult.dbUser.id

    // 1. Fetch History — bounded to recent rows; this table grows unbounded
    // per user (every reminder, gap alert, share, quote request).
    //
    // This table stores DELIVERY records: one emission writes one row per
    // channel, each carrying the same `dedupeKey` verbatim (dispatch.ts). The
    // customer-facing list renders EVENTS (§2.7) — a renewal reminder that
    // went to in-app and email is ONE thing that happened to this person, not
    // two, and it rendered here as two identical cards told apart only by a
    // channel chip. An earlier comment argued the opposite ("this is the
    // delivery history, and 'we emailed you about this' is exactly what it
    // should show") — but "which pipe carried it" is operator bookkeeping the
    // customer cannot act on; the admin delivery history keeps it, this page
    // does not. So: fetch every real channel — the `analytics` mirror stays
    // out, its rows carry a machine code as a title and a JSON blob as a body
    // — then collapse to one entry per event on the stored dedupeKey. This
    // groups rather than filtering to `in_app` because an event whose channel
    // set has no in-app arm (an email-only send) must still appear once;
    // an in_app filter would silently drop it.
    const history = await db.notificationEvent.findMany({
        where: { userId, channel: { not: 'analytics' } },
        orderBy: { createdAt: 'desc' },
        take: 50,
    })
    // Exact match on the stored key; unkeyed rows stay individual — never
    // merged on a heuristic. Read state comes from the event's in-app arm
    // only. See lib/notifications/event-grouping.ts.
    const eventGroups = groupNotificationEventRows(history)

    // 3. Fetch Policies (for filtering)
    const policies = await db.policy.findMany({
        where: { ownerUserId: userId },
        select: {
            id: true,
            policyNumber: true,
            insurerName: true,
            lineOfBusiness: true,
            endDate: true,
            status: true,
            ownerUserId: true
        }
    })

    // 4. Fetch Customer Relationships (if agent)
    const customerRelationships = await db.customerRelationship.findMany({
        where: { agentUserId: userId, status: { not: "terminated" } },
        include: {
            customer: {
                select: { name: true }
            }
        }
    })

    // 5. Get User Info
    const user = await db.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            roles: true,
            createdAt: true
        }
    })

    if (!user) return null

    // Transform for UI (Bridging snake_case and handling roles correctly)
    const uiUser = {
        user_id: user.id,
        email: user.email!, // assumed as per types
        preferred_language: (authResult.dbUser.preferredLanguage || "en") as "en" | "el",
        role: user.roles,
        created_at: user.createdAt.toISOString()
    }

    // Stored content is presented, never rendered raw: legacy rows can carry
    // internal English documentation ("AI extraction read the policy
    // successfully"), which the shared presenter substitutes with the event's
    // canonical bilingual copy, resolved to this reader's language.
    //
    // One entry per EVENT. The representative row speaks for it (the in-app
    // arm when one exists — the row whose id mark-read targets and whose
    // readAt is the event's read state). No `channel` field: delivery channel
    // is not customer-facing information (§2.7), so there is nothing here for
    // a chip to render. `unread` rather than a raw read_at: an event with no
    // in-app arm HAS no read state — surfacing its arm's forever-null readAt
    // would render an unread badge that markAllNotificationsRead (which
    // stamps in_app rows only) could never clear.
    const readerLang = uiUser.preferred_language === "el" ? "el" as const : "en" as const
    const uiEvents = eventGroups.map(g => {
        const e = g.representative
        const presented = resolveStoredNotification(e.eventType, e.title, e.message, readerLang)
        return ({
        event_id: e.id,
        user_id: e.userId,
        event_type: e.eventType,
        event_category: 'system_confirmation' as 'system_confirmation' | 'reminder' | 'intelligence' | 'agent_action',
        status: e.status as 'sent' | 'failed' | 'queued',
        subject: presented.title,
        message: presented.message,
        related_policy_id: (e.relatedObjectId && e.relatedObjectType === 'policy' ? e.relatedObjectId : null) as string | null,
        related_policy_name: null as string | null,
        related_customer_relationship_id: (e.relatedObjectId && e.relatedObjectType === 'customer' ? e.relatedObjectId : null) as string | null,
        related_customer_name: null as string | null,
        sent_at: e.sentAt?.toISOString() || null,
        unread: g.unread,
        created_at: e.createdAt.toISOString()
    })})

    // Enrich event names
    uiEvents.forEach(e => {
        if (e.related_policy_id) {
            const p = policies.find(p => p.id === e.related_policy_id)
            // Through the primitive: both columns can hold extraction sentinels
            // ("Unknown Insurer", "PENDING-…") on a healthy policy, and this
            // string renders verbatim in NotificationCard. policyLabel degrades
            // to whichever half is real, or to nothing.
            if (p) e.related_policy_name = policyLabel(p) || null
        }
        if (e.related_customer_relationship_id) {
            const r = customerRelationships.find(r => r.id === e.related_customer_relationship_id)
            if (r) e.related_customer_name = r.customer.name
        }
    })

    const uiPolicies = policies.map(p => ({
        policy_id: p.id,
        owner_user_id: p.ownerUserId,
        policy_number: p.policyNumber,
        insurer_name: p.insurerName,
        line_of_business: p.lineOfBusiness as any,
        end_date: p.endDate.toISOString(),
        status: p.status as any
    }))

    const uiRelationships = customerRelationships.map(r => ({
        relationship_id: r.id,
        agent_user_id: r.agentUserId,
        policyholder_user_id: r.policyholderUserId,
        status: 'active' as const,
        created_at: r.createdAt.toISOString()
    }))


    return {
        user: uiUser,
        history: uiEvents,
        policies: uiPolicies,
        relationships: uiRelationships,
    }
}

/**
 * Slim recent-notifications feed for the client-side NotificationWatcher poll.
 * Deliberately minimal (no policy/relationship enrichment like getNotificationData)
 * so it stays cheap to call on an interval.
 */
export async function getRecentNotifications(limit = 10): Promise<{ items: RecentNotification[] }> {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { items: [] }

    const events = await db.notificationEvent.findMany({
        // Same model of "a notification" as getNotificationData above: an
        // EVENT, identified by its in-app arm — the arm whose id mark-read
        // targets and whose readAt is the event's read state. This consumer
        // pins `in_app` instead of grouping because pinning IS grouping for
        // its purpose: one row per event, already. The one thing the pin
        // additionally drops — events with no in-app arm at all — is dropped
        // deliberately: the watcher raises live in-product toasts, and the
        // in-app arm is precisely the "tell them in the product" delivery;
        // an event whose channel set excluded it has declared it should not
        // surface in-product. (An unscoped read here would also toast the
        // same event once per channel, plus once for the analytics mirror.)
        where: { userId: authResult.dbUser.id, channel: "in_app" },
        orderBy: { createdAt: "desc" },
        take: Math.min(Math.max(limit, 1), 25),
        select: {
            id: true,
            eventType: true,
            title: true,
            message: true,
            relatedObjectType: true,
            relatedObjectId: true,
            readAt: true,
            createdAt: true,
        },
    })

    const readerLang = authResult.dbUser.preferredLanguage === "en" ? "en" as const : "el" as const
    const items: RecentNotification[] = events.map((e) => {
        const presented = resolveStoredNotification(e.eventType, e.title, e.message, readerLang)
        return ({
        id: e.id,
        eventType: e.eventType,
        title: presented.title,
        message: presented.message,
        relatedObjectType: e.relatedObjectType,
        relatedObjectId: e.relatedObjectId,
        read: Boolean(e.readAt),
        createdAt: e.createdAt.toISOString(),
    })})

    return { items }
}

export async function markNotificationRead(notificationId: string) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }

    await db.notificationEvent.updateMany({
        where: {
            id: notificationId,
            userId: authResult.dbUser.id,
            // Read state lives on the in-app arm only (schema: readAt is
            // "meaningful on in_app rows only"), and the grouped list hands
            // the client that arm's id as the event id. Scoping here keeps
            // the single and bulk mark-read in agreement — this used to stamp
            // any row by id, so a click could "read" an email we have no way
            // of knowing the user opened, while mark-all refused to.
            channel: "in_app",
            readAt: null,
        },
        data: { readAt: new Date() },
    })

    revalidatePath("/notifications")
    return { success: true }
}

export async function markAllNotificationsRead() {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }

    await db.notificationEvent.updateMany({
        where: {
            userId: authResult.dbUser.id,
            // Read state exists on in-app rows only. Stamping `readAt` on email
            // rows would claim the user "read" an email we have no way of
            // knowing they opened.
            channel: "in_app",
            readAt: null,
        },
        data: { readAt: new Date() },
    })

    revalidatePath("/notifications")
    return { success: true }
}

