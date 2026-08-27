"use server"

/**
 * Guard-probe fixture (control): a server action that touches the db. Next
 * replaces it with an RPC stub in the client graph, so the walker must STOP
 * here — a client component calling this action is not a bundle leak.
 */
import { db } from "./db"

export async function probeAction(): Promise<string> {
    return String(Boolean(db))
}
