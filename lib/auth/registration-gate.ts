/**
 * The one answer to "may a new account be created right now?".
 *
 * ## Why this is a module and not three `process.env` reads
 *
 * There is more than one door. Email/password signup mints its own `User` row
 * (`registerUser`); OAuth and magic-link both land on `/auth/callback`, which
 * mints the row there; and the public magic-link endpoint can make Supabase
 * create an `auth.users` row before our code ever sees the address. A message
 * on the signup screen closes none of those — it closes the one a person with a
 * browser happens to be looking at. So the switch lives here, and every door
 * asks it.
 *
 * ## Closed is not closed to everyone
 *
 * An agent invites a customer, and that customer's account is created when they
 * activate. Pausing self-serve signup must not strand them, so an address that
 * was INVITED is still allowed through — see `signupAllowedFor`. The exemption
 * is bound to the address, not to the token: a link that leaked into the wrong
 * inbox opens nothing for the person holding it.
 *
 * ## Fail OPEN, deliberately
 *
 * `defaultValue: true` in the registry, and `parseBooleanEnv` refuses to read
 * an unparseable value as "off". `ALLOW_REGISTRATIONS` unset, misspelt, or set
 * to something that is neither yes nor no leaves registrations open — the
 * behaviour that shipped. The failure mode of a registration gate that guesses
 * "closed" is a silent, invisible outage of the product's entire front door.
 */

import { db } from "@/lib/db"
import { getFlags, flagEnabled } from "@/lib/flags/config"
import { normalizeEmail } from "@/lib/identity/normalize-email"

/** The global switch alone. Use `signupAllowedFor` at an account-creation path. */
export async function registrationsOpen(): Promise<boolean> {
    return flagEnabled(await getFlags(), "auth.allow_registrations")
}

/**
 * Was this address invited? True for an agent-created phantom row awaiting
 * activation, and for an invite that is still spendable.
 *
 * Exported for the callback route, which already knows whether a `User` row
 * exists and only needs the invite arm.
 */
export async function hasOpenInvite(email: string): Promise<boolean> {
    const address = normalizeEmail(email)
    if (!address) return false

    const invite = await db.invite.findFirst({
        where: {
            // Case-insensitive on purpose. `Invite.inviteeEmail` is NOT stored
            // normalised everywhere: app/(protected)/agent/relationship-actions.ts
            // normalises before writing, but app/api/v1/policies/share/route.ts
            // looks the user up with normalizeEmail and then writes the RAW
            // address. So rows with "Foo@Example.com" exist, and an exact match
            // would refuse the very person the exemption is for. Normalising on
            // write would only fix invites created from now on.
            inviteeEmail: { equals: address, mode: "insensitive" },
            consumedAt: null,
            expiresAt: { gt: new Date() },
        },
        select: { id: true },
    })
    return Boolean(invite)
}

/**
 * May an account be created for this address?
 *
 * Open → yes. Closed → only if the address was invited: a `User` row already
 * exists for it (the phantom an agent created, which activation updates rather
 * than inserts), or an unconsumed, unexpired invite names it.
 */
export async function signupAllowedFor(email: string): Promise<boolean> {
    if (await registrationsOpen()) return true

    const address = normalizeEmail(email)
    if (!address) return false

    const existing = await db.user.findUnique({
        where: { email: address },
        select: { id: true },
    })
    if (existing) return true

    return hasOpenInvite(address)
}
