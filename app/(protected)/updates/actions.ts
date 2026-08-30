"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { NOTIFICATION_STREAMS } from "@/lib/app/streams"
import { eventTypesOf } from "@/lib/app/updates-model"

/** Mark one entry read — every in-app row of its event (same dedupeKey), so the group clears as one. */
export async function markUpdateRead(input: { eventId: string }): Promise<{ ok: boolean }> {
    const { dbUser } = await getAuthenticatedUser()
    const parsed = z.object({ eventId: z.string().min(1).max(64) }).safeParse(input)
    if (!parsed.success) return { ok: false }
    const row = await db.notificationEvent.findFirst({ where: { id: parsed.data.eventId, userId: dbUser.id }, select: { dedupeKey: true } })
    if (!row) return { ok: false }
    await db.notificationEvent.updateMany({
        where: row.dedupeKey ? { userId: dbUser.id, channel: "in_app", readAt: null, dedupeKey: row.dedupeKey } : { id: parsed.data.eventId, userId: dbUser.id, channel: "in_app", readAt: null },
        data: { readAt: new Date() },
    })
    revalidatePath("/updates")
    return { ok: true }
}

/**
 * «Τα είδα όλα» stamps EVERY unread in-app row of the stream — not the visible
 * page — so the badge can always be cleared (the §2 badge-22 defect).
 */
export async function markStreamRead(input: { stream: string }): Promise<{ ok: boolean }> {
    const { dbUser } = await getAuthenticatedUser()
    const parsed = z.object({ stream: z.enum(NOTIFICATION_STREAMS) }).safeParse(input)
    if (!parsed.success) return { ok: false }
    await db.notificationEvent.updateMany({
        where: { userId: dbUser.id, channel: "in_app", readAt: null, eventType: { in: eventTypesOf(parsed.data.stream) } },
        data: { readAt: new Date() },
    })
    revalidatePath("/updates")
    revalidatePath("/", "layout")
    return { ok: true }
}
