import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"
import { PUBLIC_COUNTS, PUBLIC_COUNT_VALUES } from "@/lib/marketing/public-counts"
import { MARKET_NUMBERS } from "@/lib/marketing/market-numbers"
import { FREE_POLICY_LIMIT, PLUS_POLICY_LIMIT, PRO_POLICY_LIMIT } from "@/lib/monetization/feature-gates"
import { DEFAULT_ENTITLEMENT_LIMITS } from "@/lib/pricing/plan-defaults"
import { BATCH_UPLOAD_MAX_FILES } from "@/lib/constants/time"

/**
 * No fabricated public count (PW-TRANSPARENCY-02 amendment 01, A1.3).
 *
 * Three rules over the public marketing surface, each enumerated from disk:
 *
 *  1. SCALE AND ACCURACY CLAIMS — "500+ policyholders", "10.000+ συμβόλαια
 *     αναλύθηκαν", "98% ακρίβεια" — appear nowhere. The only numbers of that
 *     shape the site may carry are MARKET numbers with a dated primary source,
 *     and those live in one file (lib/marketing/market-numbers.ts), which is
 *     the only file excluded from this rule.
 *  2. COUNT CLAIMS — «Δωρεάν για 3 ασφαλιστήρια», «έως 10 αρχεία», "100
 *     clients on Agent Starter" — equal a value in lib/marketing/public-counts.ts,
 *     which derives every value from the constant the product enforces.
 *  3. STAT TILES carry no numeric literal: a `valueEl` / `valueEn` / `value`
 *     that starts with a digit is a number nobody can trace.
 *
 * lib/legal is deliberately outside this universe: Terms §5 states a free
 * tier of one policy and is BL-01 in docs/transparency/BLOCKED.md, blocked
 * on a human reading the production plan rows. A contract clause is not
 * marketing copy and is not fixed by a guard.
 *
 * Comments are stripped first: several files document the numbers they
 * removed, and a guard that fires on its own rationale is a guard nobody keeps.
 * The matchers are hoisted and exported so the probes below exercise the very
 * expressions the guard runs.
 */
const ROOT = process.cwd()

// Directories, walked from disk (a glob cannot name `app/(public)` — the
// parentheses are pattern syntax — and a universe that silently shrinks is
// the failure mode the guard audit named).
const UNIVERSE_DIRS = [
    "app/(public)",
    "app/auth",
    "components/landing",
    "components/growth",
    "lib/landing",
    "lib/marketing",
    "lib/product",
    "lib/seo",
    "lib/growth",
    "lib/guides",
]
const UNIVERSE_FILES = ["lib/help-content.ts"]

function walk(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
        if (entry === "node_modules" || entry.startsWith(".")) continue
        const full = path.join(dir, entry)
        if (statSync(full).isDirectory()) walk(full, out)
        else if (/\.(ts|tsx)$/.test(entry)) out.push(full)
    }
    return out
}

/** The verified sources themselves — the only files allowed to hold the numbers. */
const SOURCE_FILES = new Set(["lib/marketing/market-numbers.ts", "lib/marketing/public-counts.ts"])

const strip = (src: string) =>
    src
        .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
        .replace(/^(\s*)\/\/.*$/gm, "$1")

// ── Rule 1: scale / accuracy claims ─────────────────────────────────────────
// Runs over COPY only — string literals and JSX text — never over code, so
// `width + 1` cannot trip it. Two shapes:
//   (a) a plus- or k-suffixed number («500+», «10.000+», "50k+") is a scale
//       idiom on its own and fails wherever it appears;
//   (b) a percentage fails when the same segment names usage, customers or
//       accuracy. The noun list is deliberately NARROW: insurance prose says
//       «20% των ασφαλισμένων» about the insured party and «ζημιά έως 20%»
//       about a deductible, so words that mean the insured, the insurer or a
//       document are not in it. Word-initial Greek is matched with a Unicode
//       lookbehind because JavaScript's \b is ASCII-only.
const USAGE_OR_ACCURACY_NOUN =
    /(?<!\p{L})(users|χρήστ\p{L}*|policyholders|clients|customers|πελάτ\p{L}*|agents|διαμεσολαβητ\p{L}*|reviews|αξιολογήσ\p{L}*|accuracy|ακρίβεια|satisfaction|ικανοποίησ\p{L}*|trust us|μας εμπιστεύονται)(?!\p{L})/iu
const PERCENT = /\d+([.,]\d+)?\s*%/u
/** «500+», «10.000+», "50k+" — scale by shape alone. `(?!\s*\d)` keeps `1 + 2` out. */
const PLUS_SUFFIX = /\d[\d.,]*\s*(\+|[kK]\s*\+|χιλ\.?\s*\+)(?!\s*[\d=+])/u

/** The copy on a line: quoted strings, template literals and JSX text. */
export function textSegments(line: string): string[] {
    const out: string[] = []
    for (const m of line.matchAll(/"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g)) {
        out.push(m[1] ?? m[2] ?? m[3] ?? "")
    }
    for (const m of line.matchAll(/>([^<>{}]+)</g)) out.push(m[1])
    return out
}

// ── Rule 2: count claims ────────────────────────────────────────────────────
const WORD_NUMBERS: Record<string, number> = {
    τρία: 3, τρεις: 3, δέκα: 10, "είκοσι πέντε": 25, εκατό: 100,
    three: 3, ten: 10, "twenty-five": 25, hundred: 100,
}
const COUNT_CLAIM =
    /(?<![\p{L}\d])(\d+|τρία|τρεις|δέκα|είκοσι πέντε|εκατό|three|ten|twenty-five|hundred)\s+(ασφαλιστήρια|συμβόλαια|policies|πελάτες|clients|customers|αρχεία|files|χρήστες|users)(?!\p{L})/giu

// ── Rule 3: stat tiles ──────────────────────────────────────────────────────
const STAT_LITERAL = /\bvalue(El|En)?\s*:\s*["'`]\s*[+-]?\d/

export interface CountViolation {
    line: number
    rule: "scale_claim" | "count_mismatch" | "stat_literal"
    text: string
}

export function findViolations(source: string, allowed: ReadonlySet<number> = PUBLIC_COUNT_VALUES): CountViolation[] {
    const out: CountViolation[] = []
    strip(source)
        .split("\n")
        .forEach((line, i) => {
            const n = i + 1
            for (const segment of textSegments(line)) {
                if (PLUS_SUFFIX.test(segment) || (PERCENT.test(segment) && USAGE_OR_ACCURACY_NOUN.test(segment))) {
                    out.push({ line: n, rule: "scale_claim", text: segment.trim().slice(0, 100) })
                    break
                }
            }
            for (const m of line.matchAll(COUNT_CLAIM)) {
                const raw = m[1].toLowerCase()
                const value = /^\d+$/.test(raw) ? Number(raw) : WORD_NUMBERS[raw]
                if (value === undefined) continue
                if (!allowed.has(value)) {
                    out.push({ line: n, rule: "count_mismatch", text: `${m[0]} (value ${value} is not a registered public count)` })
                }
            }
            if (STAT_LITERAL.test(line)) {
                out.push({ line: n, rule: "stat_literal", text: line.trim().slice(0, 100) })
            }
        })
    return out
}

const FILES = [
    ...UNIVERSE_DIRS.filter((d) => statSync(path.join(ROOT, d)).isDirectory()).flatMap((d) => walk(path.join(ROOT, d))),
    ...UNIVERSE_FILES.map((f) => path.join(ROOT, f)),
]
    .map((f) => path.relative(ROOT, f).replace(/\\/g, "/"))
    .filter((f) => !/\.test\.tsx?$/.test(f) && !SOURCE_FILES.has(f))

const PROBES = path.join(ROOT, "tests/fixtures/guard-probes")
const probe = (name: string) => readFileSync(path.join(PROBES, name), "utf8")

describe("no fabricated public count (A1.3)", () => {
    it("enumerates a real universe", () => {
        expect(FILES.length).toBeGreaterThan(120)
        expect(FILES.some((f) => f.includes("components/landing/"))).toBe(true)
        expect(FILES.some((f) => f.includes("app/(public)/product/"))).toBe(true)
        expect(FILES.some((f) => f.endsWith("lib/help-content.ts"))).toBe(true)
    })

    it("is proven red on each defect class and green on a clean file", () => {
        const scale = findViolations(probe("public-count-scale-literal.tsx.txt"))
        expect(scale.map((v) => v.rule)).toContain("scale_claim")
        expect(scale.length).toBeGreaterThanOrEqual(3)

        const mismatch = findViolations(probe("public-count-plan-mismatch.tsx.txt"))
        expect(mismatch.map((v) => v.rule)).toEqual(["count_mismatch", "count_mismatch"])

        const stat = findViolations(probe("public-count-stat-literal.ts.txt"))
        expect(stat.map((v) => v.rule)).toContain("stat_literal")

        expect(findViolations(probe("public-count-clean.tsx.txt"))).toEqual([])
    })

    it("carries no scale or accuracy claim, no count off the registry, and no literal stat tile", () => {
        const offenders: string[] = []
        for (const file of FILES) {
            for (const v of findViolations(readFileSync(file, "utf8"))) {
                offenders.push(`${file}:${v.line} [${v.rule}] ${v.text}`)
            }
        }
        expect(offenders, `fabricated or untraceable public count:\n${offenders.join("\n")}`).toEqual([])
    })

    it("every market number names a dated primary source", () => {
        expect(MARKET_NUMBERS.length).toBeGreaterThan(0)
        for (const n of MARKET_NUMBERS) {
            expect(n.value.trim().length, n.id).toBeGreaterThan(0)
            expect(n.source.url, n.id).toMatch(/^https:\/\//)
            expect(n.source.dated, n.id).toMatch(/^\d{2}\.\d{2}\.\d{4}$/)
            expect(n.source.name.el.length, n.id).toBeGreaterThan(0)
            expect(n.source.name.en.length, n.id).toBeGreaterThan(0)
        }
    })

    it("the registry derives from the constants the product enforces", () => {
        expect(PUBLIC_COUNTS.freePolicies.value).toBe(FREE_POLICY_LIMIT)
        expect(PUBLIC_COUNTS.freePolicies.value).toBe(DEFAULT_ENTITLEMENT_LIMITS.free.policies)
        expect(PUBLIC_COUNTS.plusPolicies.value).toBe(PLUS_POLICY_LIMIT)
        expect(PUBLIC_COUNTS.plusPolicies.value).toBe(DEFAULT_ENTITLEMENT_LIMITS.plus.policies)
        expect(PUBLIC_COUNTS.familyPolicies.value).toBe(PRO_POLICY_LIMIT)
        expect(PUBLIC_COUNTS.familyPolicies.value).toBe(DEFAULT_ENTITLEMENT_LIMITS.pro.policies)
        expect(PUBLIC_COUNTS.batchUploadMaxFiles.value).toBe(BATCH_UPLOAD_MAX_FILES)
        for (const count of Object.values(PUBLIC_COUNTS)) {
            expect(count.source, count.id).toMatch(/^lib\//)
        }
    })
})
