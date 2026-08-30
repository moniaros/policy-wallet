"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { getTranslations } from "@/lib/i18n"
import { declareLifeEvent } from "@/lib/services/life-events/service"
import { LIFE_EVENT_CHIPS } from "@/lib/app/lifeEvents"
import { loadFindingsContext } from "@/lib/app/home-model"
import { resolveSentence } from "@/lib/app/render-copy"

const Input = z.object({
    type: z.enum(LIFE_EVENT_CHIPS.map((c) => c.id) as [string, ...string[]]),
    occurredAt: z.string().date(),
    magnitude: z.number().positive().max(100_000_000).optional().nullable(),
})

export type LifeEventDelta = {
    ok: true
    /** Findings that ENTERED «τώρα» after the re-check — sentences, not advice. */
    movedToNow: string[]
    /** Findings that appeared at all after the re-check. */
    newFindings: string[]
    profileChanged: boolean
} | { ok: false; error: "invalid" | "duplicate" | "failed" }

/**
 * «Άλλαξε κάτι στη ζωή σας;» (§8.10): declare the event through the existing
 * engine (applyLifeEvent decides what the answers imply — never this file),
 * then re-run the same composition every screen reads and report WHAT MOVED.
 * The delta is a re-check, never a product suggestion.
 */
export async function recordLifeEvent(input: unknown): Promise<LifeEventDelta> {
    const { dbUser } = await getAuthenticatedUser()
    const parsed = Input.safeParse(input)
    if (!parsed.success) return { ok: false, error: "invalid" }
    const lang = (dbUser.preferredLanguage as "el" | "en") || "el"
    const t = getTranslations(lang)

    const before = await loadFindingsContext(dbUser.id, lang)
    const beforeByHash = new Map(before.findings.map((f) => [f.hash, f]))

    const result = await declareLifeEvent({
        userId: dbUser.id,
        definitionId: parsed.data.type,
        occurredAt: new Date(parsed.data.occurredAt),
        magnitude: parsed.data.magnitude ?? null,
        source: "customer_declared",
        confidence: "high",
    })
    if (!result.ok) return { ok: false, error: result.reason === "not_repeatable" || result.reason === "duplicate" ? "duplicate" : "failed" }

    const after = await loadFindingsContext(dbUser.id, lang)
    const movedToNow = after.findings
        .filter((f) => f.tier === "now" && beforeByHash.get(f.hash)?.tier !== "now")
        .map((f) => resolveSentence(f, lang, t))
    const newFindings = after.findings.filter((f) => !beforeByHash.has(f.hash)).map((f) => resolveSentence(f, lang, t))

    revalidatePath("/home")
    revalidatePath("/see")
    return { ok: true, movedToNow: movedToNow.slice(0, 5), newFindings: newFindings.slice(0, 5), profileChanged: result.profileChanged }
}
