/**
 * Goal 1 (policy-detail mobile series) — the deterministic halves of the fixes,
 * with their red probes.
 *
 * The rendering assertions live in `tests/measure/policy-detail-goal1.spec.ts`
 * (Playwright), which is not in CI in this repo. Everything below is pure, so
 * it runs on every commit — and it is where the guards actually earn their
 * keep: each `describe` states the defect the fix closed and includes the input
 * that MUST be rejected, so a regression turns this file red rather than
 * shipping the defect back to a customer.
 */

import { describe, it, expect } from "vitest"

import {
    detectSummaryLanguage,
    resolveStoredSummary,
    storedSummaryLanguage,
} from "@/lib/wallet/summary-language"
import {
    containsUnreadableMarker,
    extractedField,
    isUnreadableValue,
} from "@/lib/wallet/unreadable-value"
import { firstSentence } from "@/lib/wallet/gap-report"

// ── B2 ───────────────────────────────────────────────────────────────────────
describe("B2 — a stored summary in the wrong language never renders", () => {
    /**
     * THE PROBE. Production policy 64504715's actual stored summary: composed
     * in English by the extractor for a Greek motor schedule, then rendered
     * verbatim under the heading «Το ασφαλιστήριό σας σε απλά ελληνικά».
     */
    const ENGLISH_SUMMARY =
        "The policy concerns the insurance of the Mercedes-Benz Class A (W169) vehicle for the 2025-2026 period. It provides mandatory third-party liability, coverage for natural disasters (flood), forest fire, damages caused by an uninsured vehicle, and roadside assistance."

    const GREEK_SUMMARY =
        "Το συμβόλαιο καλύπτει την αστική ευθύνη προς τρίτους έως €1.300.000, πυρκαγιά και φυσικά φαινόμενα για το Toyota Yaris. Περιλαμβάνει οδική βοήθεια 24/7."

    it("REJECTS the production English summary for a Greek reader (the defect)", () => {
        const resolved = resolveStoredSummary({
            summary: ENGLISH_SUMMARY,
            acordData: {}, // untagged — the state of every row written before the tag existed
            viewLanguage: "el",
        })
        expect(resolved.state).toBe("language_mismatch")
        expect(resolved.text).toBeNull()
        expect(resolved.storedLanguage).toBe("en")
    })

    it("renders a Greek summary untouched — the gate is not a blanket suppression", () => {
        const resolved = resolveStoredSummary({ summary: GREEK_SUMMARY, acordData: {}, viewLanguage: "el" })
        expect(resolved.state).toBe("ok")
        expect(resolved.text).toBe(GREEK_SUMMARY)
    })

    it("does not mistake Latin brand names inside Greek prose for English", () => {
        // The false positive that would matter most: a perfectly good Greek
        // summary naming «Toyota Yaris», «AW P&C SA», «24/7».
        expect(detectSummaryLanguage(GREEK_SUMMARY)).toBe("el")
    })

    it("says nothing when there is too little text to judge", () => {
        // Refusing to guess: a short or unclassifiable string RENDERS, because
        // hiding good content is a worse failure than the one being fixed.
        expect(detectSummaryLanguage("Toyota Yaris")).toBeNull()
        expect(resolveStoredSummary({ summary: "Toyota Yaris", viewLanguage: "el" }).state).toBe("ok")
    })

    it("prefers the written tag over script inspection", () => {
        const tagged = { extraction: { summaryLanguage: "en" } }
        expect(storedSummaryLanguage(tagged)).toBe("en")
        // Greek-looking text that the pipeline recorded as English is still
        // withheld: the tag is evidence about how it was produced.
        const resolved = resolveStoredSummary({ summary: GREEK_SUMMARY, acordData: tagged, viewLanguage: "el" })
        expect(resolved.state).toBe("language_mismatch")
    })

    it("applies in both directions — an English reader is not shown Greek", () => {
        const resolved = resolveStoredSummary({ summary: GREEK_SUMMARY, acordData: {}, viewLanguage: "en" })
        expect(resolved.state).toBe("language_mismatch")
    })

    it("reports absence separately from mismatch", () => {
        expect(resolveStoredSummary({ summary: null, viewLanguage: "el" }).state).toBe("absent")
        expect(resolveStoredSummary({ summary: "   ", viewLanguage: "el" }).state).toBe("absent")
    })
})

// ── B10 ──────────────────────────────────────────────────────────────────────
describe("B10 — an extractor placeholder is not a redaction", () => {
    /**
     * PolicyWallet redacts nothing on the policy surface, so every masked-looking
     * value is something the model could not read, stored verbatim. These are
     * the shapes observed in stored data and provider output.
     */
    const PLACEHOLDERS = ["XXXX", "(XXXX)", "[XXXX]", "XXX-XXXX", "xxxxx", "ΧΧΧΧ", "????", "N/A", "n/a", "---", "___"]
    const REAL_VALUES = [
        "ΙΚΖ-4821",      // a Greek plate
        "ΧΥΖ-1234",      // a Greek plate that STARTS with capital chi — the false positive that matters
        "E2E-PDM-MOT-ACT",
        "64504715",
        "AXA",
        "Interamerican",
        "1.300.000 €",
    ]

    for (const value of PLACEHOLDERS) {
        it(`treats ${JSON.stringify(value)} as unread`, () => {
            expect(isUnreadableValue(value)).toBe(true)
            const field = extractedField(value)
            expect(field.readable).toBe(false)
            expect(field.value).toBeNull()
        })
    }

    for (const value of REAL_VALUES) {
        it(`leaves the real value ${JSON.stringify(value)} alone`, () => {
            expect(isUnreadableValue(value)).toBe(false)
            expect(extractedField(value)).toEqual({ readable: true, value })
        })
    }

    it("finds a placeholder embedded in the model's own sentence", () => {
        // Cannot be replaced without rewriting the sentence, so the UI annotates
        // it instead — but only if this returns true.
        expect(
            containsUnreadableMarker(
                "Το συμβόλαιο αφορά την ασφάλιση του οχήματος με αριθμό κυκλοφορίας (XXXX) για την περίοδο 2025-2026."
            )
        ).toBe(true)
    })

    it("does not flag ordinary prose", () => {
        expect(
            containsUnreadableMarker(
                "Το συμβόλαιο καλύπτει την αστική ευθύνη προς τρίτους έως €1.300.000 για το Toyota Yaris."
            )
        ).toBe(false)
    })

    it("treats an empty value as absent, not as unread", () => {
        expect(isUnreadableValue("")).toBe(false)
        expect(extractedField(null)).toEqual({ readable: true, value: null })
    })
})

// ── B6 ───────────────────────────────────────────────────────────────────────
describe("B6 — a truncated gap heading never breaks mid-word", () => {
    /**
     * This output is a gap card's HEADING for any slug the authored catalogue
     * does not know — production holds 41 AI-minted definitions whose instances
     * still render. A character-index slice ended headings mid-word, which
     * reads as a rendering fault on the one surface where the reader is
     * deciding whether to trust the finding.
     */
    const LONG =
        "Το ασφαλιστήριο δεν φαίνεται να περιλαμβάνει κάλυψη ιδίων ζημιών για το όχημα, κάτι που αφήνει σημαντικό κενό προστασίας"

    /**
     * The budgets below are chosen, not arbitrary: at maxLen 60/90/100 the OLD
     * character-index slice lands inside a word («…κάλυψη ιδίων ζ|ημιών»), so
     * these are the inputs that turn this test red if the fix is reverted. 80
     * is deliberately NOT used — the old slice happened to land on a boundary
     * there, and a probe that passes against the defect proves nothing.
     */
    it.each([60, 90, 100])("cuts at a word boundary at maxLen %i (the defect: cutting mid-word)", (maxLen) => {
        const out = firstSentence(LONG, maxLen)
        expect(out.endsWith("…")).toBe(true)
        // The kept text ends a WORD. Expressed as what "mid-word" actually
        // means: the next character of the source is not a letter. (Cutting
        // immediately before a comma is a clean boundary — demanding
        // whitespace specifically would fail on correct output.)
        const body = out.slice(0, -1)
        expect(LONG.startsWith(body)).toBe(true)
        const nextChar = LONG.charAt(body.length)
        expect(
            nextChar === "" || !/\p{L}/u.test(nextChar),
            `truncated mid-word: …${body.slice(-14)}|${nextChar}`
        ).toBe(true)
    })

    it("leaves a short sentence untouched", () => {
        const short = "Δεν περιλαμβάνεται κάλυψη ιδίων ζημιών."
        expect(firstSentence(short, 80)).toBe(short)
    })

    it("still truncates when a single word exceeds the budget", () => {
        // No usable word boundary — the hard slice is correct here, and the
        // result must still be bounded.
        const oneWord = "Α".repeat(200)
        const out = firstSentence(oneWord, 80)
        expect(out.length).toBeLessThanOrEqual(80)
        expect(out.endsWith("…")).toBe(true)
    })

    it("does not leave a dangling separator before the ellipsis", () => {
        const withComma = "Η κάλυψη ισχύει μόνο εντός Ελλάδας, εκτός αν συμφωνηθεί διαφορετικά εγγράφως με τον ασφαλιστή"
        const out = firstSentence(withComma, 40)
        expect(out).not.toMatch(/[,;:·\-–—]…$/)
    })
})

import { readFileSync } from "node:fs"
import { join } from "node:path"

// ── P1-11 ────────────────────────────────────────────────────────────────────
describe("P1-11 — every placeholder form comes from one list, and bare ???? is one of them", () => {
    /**
     * CLAUDE.md names `????` UNBRACKETED as a real placeholder form, but the
     * embedded-marker detector's bare branch accepted only x/X/Χ/χ — so a
     * summary containing «Αριθμός κυκλοφορίας ????» rendered to the customer
     * as their data. The `?` now joins the ONE mask alphabet both detectors
     * are composed from (`UNREADABLE_VALUE_FORMS` in lib/wallet/unreadable-value.ts):
     * bracketed stays at 3+, bare stays at 4+ so «???» in ordinary prose is
     * never swept up.
     */
    const probe = (name: string) =>
        readFileSync(join(process.cwd(), "tests/fixtures/guard-probes", name), "utf-8").trim()

    it("detects a bare ???? embedded in the model's own sentence (committed probe)", () => {
        const text = probe("unreadable-bare-questionmarks.txt")
        // Flow-through self-check: the probe genuinely carries a BARE 4-run —
        // no brackets anywhere, so only the bare branch can catch it.
        expect(text).toMatch(/\s\?{4}(?=\s|$|[.,])/)
        expect(text).not.toMatch(/[([]/)
        expect(containsUnreadableMarker(text)).toBe(true)
    })

    it("does not sweep up ??? in ordinary prose (committed probe)", () => {
        const text = probe("unreadable-prose-triple-question.txt")
        expect(text).toContain("???")
        expect(text).not.toContain("????")
        expect(containsUnreadableMarker(text)).toBe(false)
    })

    it("bare and bracketed thresholds: 4+ bare, 3+ bracketed", () => {
        expect(containsUnreadableMarker("Αριθμός κυκλοφορίας ????")).toBe(true)
        expect(containsUnreadableMarker("????")).toBe(true)
        expect(containsUnreadableMarker("Αριθμός (???)")).toBe(true)
        expect(containsUnreadableMarker("Αριθμός ???")).toBe(false)
        expect(containsUnreadableMarker("Σοβαρά???")).toBe(false) // attached to a word
    })

    it("a grouped ? run is a whole-value placeholder like its x-run sibling", () => {
        expect(isUnreadableValue("???-???")).toBe(true)
        expect(isUnreadableValue("????")).toBe(true)
        expect(extractedField("????")).toEqual({ readable: false, value: null })
        // Real values stay real.
        expect(isUnreadableValue("ΧΥΖ-1234")).toBe(false)
        expect(isUnreadableValue("E2E-PDM-MOT-ACT")).toBe(false)
    })
})
