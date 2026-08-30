"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import { publish } from "@/lib/events/publish"
import { appFlag } from "@/lib/app/flags"

const PersonInput = z.object({
    name: z.string().trim().min(1).max(120),
    relation: z.enum(["partner", "child", "parent", "other"]),
    isDependant: z.boolean(),
    dateOfBirth: z.string().date().optional().nullable(),
})

export type HouseholdResult = { ok: true; id?: string } | { ok: false; error: "unavailable" | "invalid" | "not_found" }

/** The one-minute task (§8.9): who is at home. Writes HouseholdPerson and publishes household.person_added. */
export async function addHouseholdPerson(input: unknown): Promise<HouseholdResult> {
    const { dbUser } = await getAuthenticatedUser()
    if (!(await appFlag("app.household"))) return { ok: false, error: "unavailable" }
    const parsed = PersonInput.safeParse(input)
    if (!parsed.success) return { ok: false, error: "invalid" }
    try {
        const person = await db.householdPerson.create({
            data: { userId: dbUser.id, name: parsed.data.name, relation: parsed.data.relation, isDependant: parsed.data.isDependant, dateOfBirth: parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : null, confirmedAt: new Date() },
        })
        await publish({
            name: "household.person_added",
            aggregate: { type: "household", id: dbUser.id },
            subjectUserId: dbUser.id,
            actor: { type: "customer", id: dbUser.id },
            payload: { householdPersonId: person.id, relation: person.relation, isDependant: person.isDependant },
        }).catch((error) => logger("warn", "[household] event not published", { message: error instanceof Error ? error.message : String(error) }))
        revalidatePath("/me/household")
        revalidatePath("/home")
        return { ok: true, id: person.id }
    } catch (error) {
        logger("warn", "[household] person not stored", { message: error instanceof Error ? error.message : String(error) })
        return { ok: false, error: "unavailable" }
    }
}

export async function updateHouseholdPerson(input: unknown): Promise<HouseholdResult> {
    const { dbUser } = await getAuthenticatedUser()
    if (!(await appFlag("app.household"))) return { ok: false, error: "unavailable" }
    const parsed = PersonInput.extend({ id: z.string().min(1).max(64) }).safeParse(input)
    if (!parsed.success) return { ok: false, error: "invalid" }
    const { count } = await db.householdPerson.updateMany({
        where: { id: parsed.data.id, userId: dbUser.id },
        data: { name: parsed.data.name, relation: parsed.data.relation, isDependant: parsed.data.isDependant, dateOfBirth: parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : null },
    })
    if (count === 0) return { ok: false, error: "not_found" }
    revalidatePath("/me/household")
    revalidatePath("/home")
    return { ok: true }
}

export async function removeHouseholdPerson(input: { id: string }): Promise<HouseholdResult> {
    const { dbUser } = await getAuthenticatedUser()
    const parsed = z.object({ id: z.string().min(1).max(64) }).safeParse(input)
    if (!parsed.success) return { ok: false, error: "invalid" }
    const { count } = await db.householdPerson.deleteMany({ where: { id: parsed.data.id, userId: dbUser.id } })
    if (count === 0) return { ok: false, error: "not_found" }
    revalidatePath("/me/household")
    revalidatePath("/home")
    return { ok: true }
}
