import { describe, it, expect } from "vitest"
import { NOTIFICATION_EVENTS } from "@/lib/notifications/registry"

/**
 * The voice lint (lib/i18n/voice-lint.ts) walks the i18n catalogues — but the
 * notification registry carries its own Greek copy, and «Νέα πρόταση για εσάς»
 * rendered on /updates from exactly there. Same rule, same stems, second
 * universe: no advice verb in any customer-facing notification, except where
 * «πρόταση» names the ADVISER'S own document (the proposal_* events — the one
 * place the brief allows the word).
 */
const BANNED = /(?<!\p{L})(πρότασ|προτείν|συμβουλεύ|καλύτερο πρόγραμμα|αλλάξτε|αγοράστε|εξοικονομ|κόψτε|recommend|buy now|switch to|save money)/iu
const ADVISER_DOCUMENT_EVENTS = new Set(["proposal_received", "proposal_accepted", "proposal_declined", "proposal_counter_offer"])

describe("the notification registry speaks the product's voice", () => {
    it("enumerates a real universe", () => {
        expect(Object.keys(NOTIFICATION_EVENTS).length).toBeGreaterThan(40)
    })
    it("no banned stem outside the adviser's own proposal events", () => {
        const offenders: string[] = []
        for (const [key, def] of Object.entries(NOTIFICATION_EVENTS)) {
            if (ADVISER_DOCUMENT_EVENTS.has(key)) continue
            const copy = (def as unknown as { copy?: { title?: Record<string, string>; message?: Record<string, string> } }).copy
            for (const field of ["title", "message"] as const) {
                for (const lang of ["el", "en"] as const) {
                    const text = copy?.[field]?.[lang] ?? ""
                    if (BANNED.test(text)) offenders.push(`${key}.${field}.${lang}: ${text}`)
                }
            }
        }
        expect(offenders).toEqual([])
    })
    it("the allowlist is only the adviser's documents (a removed event goes stale)", () => {
        for (const key of ADVISER_DOCUMENT_EVENTS) {
            expect(NOTIFICATION_EVENTS[key], `${key} no longer exists — trim the allowlist`).toBeTruthy()
        }
    })
})
