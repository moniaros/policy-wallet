"use server"

import { z } from "zod"
import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import type { RecentNotification } from "@/lib/notifications/watcher"
import { resolveStoredNotification } from "@/lib/notifications/stored-content"
import { policyLabel, scrubRenderableText } from "@/lib/wallet/policy-identity"
import { groupNotificationEventRows } from "@/lib/notifications/event-grouping"
import { resolveUserLanguage } from "@/lib/i18n/resolve-language"

export async function getNotificationData(input: { before?: string; deliveries?: boolean } = {}) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return null

    const parsed = z.object({ before: z.string().max(200).optional(), deliveries: z.boolean().optional() }).strict().safeParse(input)
    if (!parsed.success) return null
    const options = parsed.data
    const userId = authResult.dbUser.id
    const before = typeof options.before === "string" && options.before.length <= 200 ? options.before : undefined
    const cursor = before ? await db.notificationEvent.findFirst({ where: { id: before, userId }, select: { id: true } }) : null
    if (before && !cursor) return null

    // Default: the delivered in-app inbox, with the bell's read state.
    // Explicit delivery history preserves other channels and groups only
    // records carrying an exact shared event key. Never guess legacy identity.
    const history = await db.notificationEvent.findMany({
        // The default inbox uses the same in-app delivery and read state as the bell.
        // Historic channel records remain explicitly available in the delivery view;
        // unkeyed records cannot safely be merged merely because their words match.
        where: { userId, ...(options.deliveries ? { channel: { not: 'analytics' } } : { channel: 'in_app', status: 'sent' }) },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        ...(cursor ? { cursor: { id: cursor.id }, skip: 1 } : {}),
        take: 51,
    })
    // Exact match on the stored key; unkeyed rows stay individual — never
    // merged on a heuristic. Read state comes from the event's in-app arm
    // only. See lib/notifications/event-grouping.ts.
    const pageRows = history.slice(0, 50)
    const eventGroups = groupNotificationEventRows(pageRows)

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
        preferred_language: resolveUserLanguage(authResult.dbUser.preferredLanguage),
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
    // Stored history is DATA, and stale data leaks: two legacy
    // `policy_analysis_failed` rows on the shared fixture account still carry
    // «PENDING-… (__PENDING_EXTRACTION__)» verbatim in their message text —
    // written before emit() learned to scrub, and this table is never pruned,
    // so no upstream fix can ever reach them. The render boundary scrubs
    // rather than trusts: scrubRenderableText (policy placeholders + fixture
    // identifiers, punctuation tidied) — the scrubbing form, not
    // assertRenderableText, because a years-old stored row is not an upstream
    // defect this page can fail loudly about; the customer's history must
    // render, minus the tokens.
    const readerLang = uiUser.preferred_language === "el" ? "el" as const : "en" as const
    const uiEvents = eventGroups.map(g => {
        const e = g.representative
        const raw = resolveStoredNotification(e.eventType, e.title, e.message, readerLang)
        const presented = {
            title: scrubRenderableText(raw.title),
            message: scrubRenderableText(raw.message),
        }
        return ({
        event_id: e.id,
        event_key: e.dedupeKey || e.id,
        has_in_app: g.hasInAppArm,
        delivery_channel: options.deliveries && !e.dedupeKey ? e.channel : null,
        action_href: e.eventType.startsWith("collaboration_") && !user.roles.includes("agent") && !user.roles.includes("admin") ? "/agent" : null,
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

    // Enrich event names. A related_policy_id survives to the client ONLY
    // when the policy still exists and belongs to this reader — the row's
    // «Προβολή ασφαλιστηρίου» link renders from it, and every rendered
    // destination must resolve (§11.2 destination guard, ledger N-07). A
    // deleted policy's events keep their text and lose the link.
    uiEvents.forEach(e => {
        if (e.related_policy_id) {
            const p = policies.find(p => p.id === e.related_policy_id)
            if (p) {
                // Through the primitive: both columns can hold extraction
                // sentinels ("Unknown Insurer", "PENDING-…") on a healthy
                // policy. policyLabel degrades to whichever half is real, or
                // to nothing.
                e.related_policy_name = policyLabel(p) || null
            } else {
                e.related_policy_id = null
            }
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
        nextCursor: history.length > 50 ? pageRows.at(-1)?.id ?? null : null,
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
        where: { userId: authResult.dbUser.id, channel: "in_app", status: "sent" },
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

    const readerLang = resolveUserLanguage(authResult.dbUser.preferredLanguage)
    const items: RecentNotification[] = events.map((e) => {
        // Same render-boundary scrub as getNotificationData above: these
        // strings become live toasts, and a stale stored row must not put a
        // PENDING sentinel or a fixture identifier on screen.
        const raw = resolveStoredNotification(e.eventType, e.title, e.message, readerLang)
        const presented = {
            title: scrubRenderableText(raw.title),
            message: scrubRenderableText(raw.message),
        }
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
            status: "sent",
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
            status: "sent",
            readAt: null,
        },
        data: { readAt: new Date() },
    })

    revalidatePath("/notifications")
    return { success: true }
}

