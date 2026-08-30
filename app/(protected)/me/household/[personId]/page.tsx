export const runtime = "nodejs"

import { notFound } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { PersonScreen } from "./PersonScreen"

/** /me/household/[personId] — edit or remove one person. The subject is always the session's user. */
export default async function PersonPage({ params }: { params: Promise<{ personId: string }> }) {
    const { personId } = await params
    const { dbUser } = await getAuthenticatedUser()
    const person = await db.householdPerson.findFirst({ where: { id: personId, userId: dbUser.id } }).catch(() => null)
    if (!person) notFound()
    return <PersonScreen person={{ id: person.id, name: person.name, relation: person.relation, isDependant: person.isDependant }} />
}
