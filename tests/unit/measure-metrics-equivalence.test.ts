/**
 * T-011 equivalence proof — NOT part of the goal-series evidence harness,
 * NOT run by `npx vitest --run tests/unit` (that command is scoped to
 * tests/unit/**). Run directly:
 *
 *   npx vitest --run tests/measure/metrics-pure.equivalence.test.ts
 *
 * Purpose: prove that extracting `findLatinSentences` / `findInternalTokens`
 * out of the DOM-walking `latinSentences(page)` / `internalTokenLeaks(page)`
 * changed no detection outcome. These are the exact per-node checks the old
 * inline implementations ran (see git history of tests/measure/policy-detail.ts
 * and tests/measure/dashboard.ts pre-T-011) — same regexes, same order, same
 * allowlist, same slicing — only relocated from "inline inside page.evaluate"
 * to "a named, exported, pure function the DOM wrapper calls". Nothing here
 * exercises real layout (jsdom does not compute it), so this proves the
 * PREDICATE half only; the DOM-extraction half is untouched code, verified by
 * reading the diff (see the T-011 report) and by a live-browser side-by-side
 * capture against the running dev server, recorded separately.
 */
import { describe, it, expect } from "vitest"
import { findLatinSentences, findInternalTokens, type TruncationFailure } from "../measure/metrics"

// ─────────────────────────────────────────────────────────────────────────────
// findLatinSentences — reference behaviour reimplemented from the pre-T-011
// inline block, kept here ONLY as the "old" side of the equivalence check.
// ─────────────────────────────────────────────────────────────────────────────
function oldLatinSentenceCheck(text: string): string[] {
    const ALLOW =
        /^(PolicyWallet|Interamerican|Generali|AXA|NN|Eurolife|ERGO|Allianz|MAPFRE|AIG|Groupama|AI|PDF|OK|FAQ|IBAN|GDPR|SSL|USD|EUR|API|Q&A|VIP|CO2|GPS|SOS|24\/7|e-mail|email|Mercedes|Toyota|BMW|Audi|Ford|Opel|AW P&C SA|AFFIDEA)$/i
    const t = text.trim()
    if (t.length < 12) return []
    const m = t.match(/\b[A-Za-z][a-z]{2,}(?:\s+[A-Za-z(][A-Za-z0-9().,'%€-]{2,}){2,}/)
    if (!m) return []
    if (ALLOW.test(m[0].trim())) return []
    return [t.slice(0, 140)]
}

// ─────────────────────────────────────────────────────────────────────────────
// findInternalTokens — reference behaviour reimplemented from the pre-T-011
// inline block (dashboard.ts), kept here ONLY as the "old" side.
// ─────────────────────────────────────────────────────────────────────────────
function oldInternalTokenCheck(text: string): string[] {
    const hits: string[] = []
    if (!text) return hits
    if (/\bE2E[-\s]/i.test(text)) hits.push("E2E fixture identifier")
    if (/δοκιμαστικ\w*|υπόδειγμα|placeholder|lorem ipsum|\bTODO\b|\bFIXME\b/i.test(text)) {
        hits.push("placeholder/draft content")
    }
    if (/\bPENDING-|__[A-Z_]+__/.test(text)) hits.push("pending/sentinel marker")
    if (/\((?:sample|draft|test|dummy)[^)]*\)/i.test(text)) hits.push("content marked as sample/draft")
    if (/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(text)) hits.push("UUID")
    if (/\b(?:c[a-z0-9]{24})\b/.test(text)) hits.push("cuid")
    if (/(?:^|\s)[a-z]+(?:_[a-z]+){1,3}(?:\s|$)/.test(text) && !/https?:|@/.test(text)) {
        hits.push("snake_case enum token")
    }
    return hits
}

const LATIN_FIXTURES = [
    // ≥3-word English runs — should flag
    "This is a completely untranslated sentence in English.",
    "Please contact our customer support team for assistance.",
    "The quick brown fox jumps over the lazy dog every single day.",
    // allow-listed brand-only strings — must NOT flag (too short anyway, <12 chars covers most)
    "PolicyWallet",
    "Interamerican Ασφαλιστική",
    "AW P&C SA",
    // Greek content — must NOT flag
    "Το ασφαλιστήριό σας καλύπτει ζημιές από πυρκαγιά και κλοπή.",
    // short strings under the 12-char floor — must NOT flag
    "OK thanks",
    "Hi there",
    // mixed Greek + a short English aside (fewer than 3 consecutive Latin words)
    "Η κάλυψή σας είναι OK για αυτό το έτος.",
    // exactly on the allowlist as the whole match
    "Contact us at e-mail for help", // "Contact us at" wouldn't match allow exactly; keep as flag case
    "",
    "   ",
]

const INTERNAL_TOKEN_FIXTURES = [
    "E2E-ph-dash@policywallet.test",
    "Status: PENDING-482910",
    "__SENTINEL_UNREADABLE__",
    "id: 550e8400-e29b-41d4-a716-446655440000",
    "cm3x9k2j40000qzrmabcdefgh",
    "delivery_method in_app was used",
    "This is placeholder text for the demo",
    "Αυτό είναι ένα δοκιμαστικό κείμενο",
    "(sample data, do not use)",
    "Καλώς ήρθατε στο PolicyWallet",
    "Το ασφαλιστήριό σας έχει ενεργοποιηθεί κανονικά",
    "contact us at test@example.com for help",
    "",
]

describe("T-011 equivalence: findLatinSentences vs pre-extraction inline check", () => {
    for (const text of LATIN_FIXTURES) {
        it(`matches old behaviour for: ${JSON.stringify(text.slice(0, 40))}`, () => {
            expect(findLatinSentences(text)).toEqual(oldLatinSentenceCheck(text))
        })
    }
})

describe("T-011 equivalence: findInternalTokens vs pre-extraction inline check", () => {
    for (const text of INTERNAL_TOKEN_FIXTURES) {
        it(`matches old behaviour for: ${JSON.stringify(text.slice(0, 40))}`, () => {
            expect(findInternalTokens(text)).toEqual(oldInternalTokenCheck(text))
        })
    }
})

// ─────────────────────────────────────────────────────────────────────────────
// findInternalTokens — the categories the brief calls out explicitly.
// ─────────────────────────────────────────────────────────────────────────────
describe("findInternalTokens — required detection categories", () => {
    it("double-underscore sentinels", () => {
        expect(findInternalTokens("__SENTINEL_UNREADABLE__")).toContain("pending/sentinel marker")
    })
    it("PENDING-<digits>", () => {
        expect(findInternalTokens("PENDING-482910")).toContain("pending/sentinel marker")
    })
    it("E2E-* fixture identifiers", () => {
        expect(findInternalTokens("E2E-ph-dash@policywallet.test")).toContain("E2E fixture identifier")
    })
    it("bare UUIDs", () => {
        expect(findInternalTokens("550e8400-e29b-41d4-a716-446655440000")).toContain("UUID")
    })
    it("cuid-shaped fixture ids", () => {
        expect(findInternalTokens("cm3x9k2j40000qzrmabcdefgh")).toContain("cuid")
    })
    it("raw snake_case enums (in_app)", () => {
        expect(findInternalTokens("delivery_method in_app was used")).toContain("snake_case enum token")
    })
    it("placeholder markers: test/sample/draft in parens", () => {
        expect(findInternalTokens("(sample data, do not use)")).toContain("content marked as sample/draft")
    })
    it("δοκιμαστικό (Greek 'test/draft')", () => {
        expect(findInternalTokens("Αυτό είναι δοκιμαστικό κείμενο")).toContain("placeholder/draft content")
    })
    it("clean Greek product copy — no false positive", () => {
        expect(findInternalTokens("Το ασφαλιστήριό σας έχει ενεργοποιηθεί κανονικά")).toEqual([])
    })
})

// ─────────────────────────────────────────────────────────────────────────────
// truncationFailures — NOT an equivalence check (it is a new, broader, union
// definition per the brief, not a behaviour-preserving refactor). This only
// exercises the TypeScript shape so a caller can rely on the documented
// fields without a browser. Geometry itself needs real layout — verified
// separately against a live page, not here (jsdom reports 0 for all
// scrollWidth/clientWidth/getBoundingClientRect calls, which would make every
// assertion here vacuously true and prove nothing).
// ─────────────────────────────────────────────────────────────────────────────
describe("truncationFailures — record shape", () => {
    it("TruncationFailure record shape accepts both reasons", () => {
        const overflow: TruncationFailure = {
            selector: "p.insurer-name",
            text: "Εθνική Ασφαλιστική Ανώνυμος Εταιρεία",
            scrollWidth: 223,
            clientWidth: 87,
            reason: "overflow",
        }
        const cssTrunc: TruncationFailure = {
            selector: "span.truncate",
            text: "Σύνταξη & Αποταμίευση",
            scrollWidth: 146,
            clientWidth: 62,
            reason: "css-truncation",
            scrollHeight: 40,
            clientHeight: 20,
        }
        expect(overflow.reason).toBe("overflow")
        expect(cssTrunc.reason).toBe("css-truncation")
    })
})
