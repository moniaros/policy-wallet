import { describe, it, expect } from "vitest"
import { el } from "@/lib/i18n/translations/el"
import { en } from "@/lib/i18n/translations/en"

/**
 * AI Act / §10: no score or percentage OF THE PERSON, anywhere in the
 * catalogue. «22/30» is a count and fine; «73% προστατευμένος» is a
 * prohibited evaluation of the person. The scan walks EVERY leaf of both
 * dictionaries and flags a % sign in the same sentence as the person-words.
 * Legitimate percentages (a price change, a coinsurance clause) survive
 * because they do not sit next to προστασία/score/κάλυψη-of-you wording.
 */
const PERSON_WORDS = /(προστασ|σκορ|βαθμολογ|καλυμμένος|καλυμμένη|protected|protection score|coverage score|your score)/i

function* leaves(node: unknown, path: string): Generator<[string, string]> {
    if (typeof node === "string") { yield [path, node]; return }
    if (node && typeof node === "object") {
        for (const [k, v] of Object.entries(node)) yield* leaves(v, `${path}.${k}`)
    }
}

describe("no percentage of the person in any catalogue", () => {
    it("enumerates a real universe", () => {
        expect([...leaves(el, "el")].length).toBeGreaterThan(2000)
    })
    for (const [name, dict] of [["el", el], ["en", en]] as const) {
        it(`${name}: a % never shares a sentence with the person-words`, () => {
            const offenders: string[] = []
            for (const [path, text] of leaves(dict, name)) {
                if (!text.includes("%")) continue
                for (const sentence of text.split(/[.·;!?\n]/)) {
                    if (sentence.includes("%") && PERSON_WORDS.test(sentence)) offenders.push(`${path}: ${sentence.trim().slice(0, 120)}`)
                }
            }
            expect(offenders).toEqual([])
        })
    }
    it("the probe turns it red (a planted score sentence is caught)", () => {
        const planted = { probe: "Η προστασία σας είναι στο 73%." }
        const hits = [...leaves(planted, "probe")].filter(([, t]) => t.includes("%") && PERSON_WORDS.test(t))
        expect(hits).toHaveLength(1)
    })
})
