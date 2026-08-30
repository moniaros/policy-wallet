import { describe, it, expect } from "vitest"
import { readFileSync, writeFileSync, existsSync } from "node:fs"
import { el } from "@/lib/i18n/translations/el"
import { en } from "@/lib/i18n/translations/en"
import { scanDictionary, countByKey, diffAgainstBaseline, fold, BANNED_STEMS } from "@/lib/i18n/voice-lint"
import { hasBareCount } from "@/lib/i18n/plural"

/**
 * `npm run lint:voice` runs this file. It is also part of the unit suite CI
 * blocks on, so the banned-word rule fails the build in both places.
 *
 * To regenerate the legacy baseline after a deliberate copy change:
 *   VOICE_BASELINE_WRITE=1 npx vitest --run tests/unit/voice-banned-words.test.ts
 * and commit the fixture diff in the same commit.
 */
const BASELINE_PATH = "tests/fixtures/voice-baseline.json"

const appHits = { el: scanDictionary(el.app, "el", "app"), en: scanDictionary(en.app, "en", "app") }
const legacy = (dict: Record<string, unknown>, lang: "el" | "en") =>
    scanDictionary(Object.fromEntries(Object.entries(dict).filter(([k]) => k !== "app")), lang)

describe("STRICT — the analyst's voice (app.*) carries no banned word", () => {
    it("Greek", () => {
        expect(appHits.el.map((h) => `${h.key} [${h.stem}] …${h.excerpt}…`)).toEqual([])
    })
    it("English", () => {
        expect(appHits.en.map((h) => `${h.key} [${h.stem}] …${h.excerpt}…`)).toEqual([])
    })
    it("«πρόταση» is permitted ONLY under the adviser's namespace", () => {
        const probe = { adviser: { proposal: "Η πρόταση του συμβούλου σας" }, verdict: { x: "Μια πρόταση κάλυψης" } }
        const hits = scanDictionary(probe, "el", "app")
        expect(hits.map((h) => h.key)).toEqual(["app.verdict.x"])
    })
})

describe("RATCHET — the legacy dictionary only shrinks", () => {
    const current = countByKey([...legacy(el as unknown as Record<string, unknown>, "el"), ...legacy(en as unknown as Record<string, unknown>, "en")])
    if (process.env.VOICE_BASELINE_WRITE === "1") {
        writeFileSync(BASELINE_PATH, JSON.stringify(current, null, 2) + "\n")
    }
    const baseline: Record<string, number> = existsSync(BASELINE_PATH) ? JSON.parse(readFileSync(BASELINE_PATH, "utf-8")) : {}
    it("introduces no new banned word and no higher count", () => {
        const { grew } = diffAgainstBaseline(current, baseline)
        expect(grew, "new banned-word hits in the legacy dictionary — reword, or (adviser copy only) move the key under adviser.*").toEqual([])
    })
    it("records every reduction (delist what was fixed so the debt keeps shrinking)", () => {
        const { shrank } = diffAgainstBaseline(current, baseline)
        expect(shrank, "baseline entries no longer matching — regenerate the baseline in the same commit").toEqual([])
    })
})

describe("PROBE — every stem fires, and the canonical lines stay legal", () => {
    it("fires on each banned form, accent- and case-insensitively", () => {
        const samples: Record<string, string> = {
            "el.protasi": "Δείτε την ΠΡΟΤΑΣΗ κάλυψης",
            "el.proteino": "Σας προτείνουμε το πρόγραμμα",
            "el.symvouleuo": "Σας συμβουλεύουμε να αλλάξετε",
            "el.kalytero-programma": "Το καλύτερο πρόγραμμα για εσάς",
            "el.allaxte": "Αλλάξτε ασφαλιστή σήμερα",
            "el.agoraste": "Αγοράστε τώρα",
            "el.exoikonom": "Εξοικονομήστε 200 €",
            "el.kopste": "Κόψτε το περιττό",
            "en.recommend": "We recommend this policy",
            "en.we-advise": "We advise you to renew",
            "en.best-plan": "The best plan for you",
            "en.switch-to": "Switch to a cheaper insurer",
            "en.buy-now": "You should buy this",
            "en.save-money": "Save money today",
            "en.cut": "Cut your premium",
        }
        for (const s of BANNED_STEMS) {
            expect(s.pattern.test(fold(samples[s.id])), `${s.id} did not fire on "${samples[s.id]}"`).toBe(true)
        }
    })
    it("does not fire on the canonical lines the analyst owns", () => {
        const legal = [
            "Δεν σας λέω τι να αγοράσετε· σας λέω τι είδα.",
            "Δεν είναι ασφαλιστική συμβουλή: για αποφάσεις, ρωτήστε τον σύμβουλό σας.",
            "Ο Νίκος είναι ο δικός σας σύμβουλος, όχι δικός μας.",
            "Αξίζει να δείτε τι αλλάζει αν αλλάξετε διεύθυνση.",
            "I do not tell you what to buy; I tell you what I saw.",
            "Ask your adviser.",
        ]
        for (const line of legal) {
            const hits = scanDictionary({ x: line }, /[Α-Ωα-ω]/.test(line) ? "el" : "en", "app")
            expect(hits, line).toEqual([])
        }
    })
})

describe("ICU plurals — every count in app.* is a plural form, never a bare {count}", () => {
    it("Greek and English", () => {
        const offenders: string[] = []
        const walk = (node: unknown, path: string) => {
            if (typeof node === "string") { if (hasBareCount(node)) offenders.push(path); return }
            if (node && typeof node === "object") for (const [k, v] of Object.entries(node as Record<string, unknown>)) walk(v, `${path}.${k}`)
        }
        walk(el.app, "el.app"); walk(en.app, "en.app")
        expect(offenders).toEqual([])
    })
})
