import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { globSync } from "../helpers/glob"
import { NOTIFICATION_EVENTS } from "@/lib/notifications/registry"
import { getChurnDay30Email } from "@/lib/email/templates/churn-prevention"

/**
 * A benefit the product SAYS it conferred, it must actually have conferred.
 *
 * The shipped defect: a daily cron sent every 30-day-inactive customer an email
 * headed with a gift box and a 48px green «500», reading «AI Credits
 * προστέθηκαν στον λογαριασμό σας» — added, past tense — and wrote a matching
 * in-app notification, «Πιστώθηκαν επιπλέον credits στον λογαριασμό σας». No
 * code granted them. The only path that moves a credit balance is the admin
 * `grantTokens` action, and the churn service did not call it; it carried the
 * admission in a comment, "integrate with actual billing/token system", while
 * the cron ran daily against production.
 *
 * This is a distinct failure from the ones already guarded. `all-clear-honesty`
 * catches a check that did not run reporting the good outcome;
 * `email-content-honesty` catches a value the code never computed being
 * rendered as a trend. This one is a STATE CHANGE the code never performed
 * being reported as done — and unlike those two it spans two channels, which is
 * why it lives in its own file rather than inside either.
 *
 * Both halves enumerate their universe: every template file on disk, every
 * registry entry in the map. Neither takes a hand-maintained list.
 */

/** Comments must go before scanning: this very file's subject is described in
 *  prose inside `churn-prevention.ts`, and a comment is not a claim. */
const strip = (s: string) =>
    s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

const CREDIT_NOUN = /credits?|πιστώσ|πιστώθ|token/i

/** Verbs that assert the transfer ALREADY HAPPENED, or is being made now. */
const CONFERRED =
    /προστέθηκ|πιστώθηκ|δωρίζουμε|χαρίζουμε|added to your account|credits added|added to your balance|gifting you|have been added|were added|we have credited/i

/** A claim is the two together inside one segment, not merely in one file. */
function claimSegments(text: string): string[] {
    return text
        .split(/[.!?\n·—]|<\/p>|<\/h2>|<br\s*\/?>/i)
        .map((s) => s.trim())
        .filter((s) => CREDIT_NOUN.test(s) && CONFERRED.test(s))
}

describe("no email template announces a credit grant", () => {
    const files = globSync("lib/email/templates/*.ts")

    it("enumerates a real universe", () => {
        expect(files.length).toBeGreaterThanOrEqual(6)
        expect(files.some((f) => f.endsWith("churn-prevention.ts"))).toBe(true)
    })

    it("no template file states that credits were added", () => {
        const offenders = files.flatMap((f) =>
            claimSegments(strip(readFileSync(f, "utf-8"))).map((s) => `${f}: ${s.slice(0, 120)}`),
        )
        expect(offenders).toEqual([])
    })

    it("the day-30 email renders no credit claim in either language", () => {
        for (const language of ["el", "en"] as const) {
            const { subject, html } = getChurnDay30Email({ name: "Νίκος", language })
            expect(claimSegments(subject)).toEqual([])
            expect(claimSegments(html)).toEqual([])
            // Not a bare `/500/`: the shared base template legitimately uses
            // `font-weight: 500`. What must not come back is the standalone
            // number in its own element — the 48px green box.
            expect(html).not.toMatch(/>\s*500\s*</)
        }
    })

    it("still re-engages — removing the bribe did not empty the email", () => {
        const { subject, html } = getChurnDay30Email({ name: "Νίκος", language: "el" })
        expect(subject.length).toBeGreaterThan(10)
        expect(html).toMatch(/Μας λείπετε/)
        expect(html).toMatch(/\/dashboard/)
    })
})

describe("no live notification announces a grant nothing commits", () => {
    const entries = Object.entries(NOTIFICATION_EVENTS)

    it("enumerates a real universe", () => {
        expect(entries.length).toBeGreaterThan(50)
        expect(NOTIFICATION_EVENTS.bonus_credits_granted).toBeDefined()
    })

    it("a live event claiming a credit grant has an emitter that writes the ledger", () => {
        const offenders: string[] = []
        for (const [name, def] of entries) {
            if (def.status !== "live") continue
            const copy = [def.copy?.title, def.copy?.message]
                .flatMap((c) => (c ? [c.el, c.en] : []))
                .join(" . ")
            if (claimSegments(copy).length === 0) continue
            // It claims a grant. Its emitter must touch the credit ledger.
            const src = def.emittedBy ? readFileSync(def.emittedBy, "utf-8") : ""
            if (!/creditTransaction/i.test(src)) {
                offenders.push(`${name} -> ${def.emittedBy ?? "(no emitter)"}`)
            }
        }
        expect(offenders).toEqual([])
    })

    it("bonus_credits_granted is planned, and names no emitter", () => {
        const def = NOTIFICATION_EVENTS.bonus_credits_granted
        expect(def.status).toBe("planned")
        expect(def.emittedBy).toBeUndefined()
        expect(def.note).toMatch(/COMMITS/)
    })

    it("nothing emits it", () => {
        const sources = globSync("lib/**/*.ts").concat(globSync("app/**/*.ts"))
        const emitters = sources.filter((f) =>
            /event:\s*["']bonus_credits_granted["']/.test(readFileSync(f, "utf-8")),
        )
        expect(emitters).toEqual([])
    })
})

describe("probe: the detector sees the shape that shipped", () => {
    it("flags the exact Greek line the email carried", () => {
        expect(claimSegments("AI Credits προστέθηκαν στον λογαριασμό σας")).toHaveLength(1)
    })

    it("flags the exact English line the email carried", () => {
        expect(claimSegments("AI Credits added to your account")).toHaveLength(1)
    })

    it("flags the notification's past tense", () => {
        expect(
            claimSegments("Μπόνους επανασύνδεσης: 500 credits προστέθηκαν, λήγουν σε 30 ημέρες"),
        ).toHaveLength(1)
    })

    it("does not flag an offer, which promises nothing already done", () => {
        expect(claimSegments("Αγοράστε credits όποτε τα χρειαστείτε")).toEqual([])
        expect(claimSegments("Buy credits whenever you need them")).toEqual([])
    })

    it("does not flag a credit word with no conferral", () => {
        expect(claimSegments("Υπόλοιπο πιστώσεων: 0")).toEqual([])
    })
})
