/**
 * Count-copy agreement at one — the V2-P1-09 class.
 *
 * WHAT THIS GUARDS: bilingual copy that interpolates a count must have its
 * WHOLE CLAUSE agree with that count at n = 1, not just the noun. The shape
 * that has now shipped twice (11ec4987 fixed it in monitoring.ts; V2-P1-09
 * found it again in health-index.ts) is a `count === 1` ternary that inflects
 * only the noun while the clause's verbs stay outside the ternary and render
 * plural against a singular subject:
 *
 *     `${n} ${n === 1 ? "περιοχή" : "περιοχές"} που αφορούν … παραμένουν ανοιχτές.`
 *     `${n} ${n === 1 ? "area" : "areas"} that reach … are still open.`
 *
 * HOW IT CHECKS: not by matching source text. Each template is PARTIALLY
 * EVALUATED at n = 1 (the target count → 1, every other `=== 1`-tested count
 * in the same template → 2, unresolvable interpolations → ◊), and the check
 * runs on the RENDERED clause containing the ternary — the same string a
 * customer reads — bounded by clause boundaries (. ; · , — και/and/but/αλλά/
 * όμως/ώστε/για να). Inside that window at n = 1, plural-agreement markers
 * are defects:
 *   - Greek 3rd-plural verb endings  -ουν / -ούν / -νται
 *   - English plural verb forms      are / were / have — unless the subject
 *     is a pronoun (you/we/they/I/who), whose agreement is its own
 *
 * THE UNIVERSE (D-005): every top-level template literal in every .ts/.tsx
 * under app/, components/ and lib/, enumerated recursively from the
 * filesystem at test time. Within each template, every conditional testing
 * `<expr> === 1` / `<expr> !== 1` (either operand order) is a checkable site.
 *
 * DELIBERATELY NOT COVERED (so nobody mistakes this for total coverage):
 *   - counts with NO one/many ternary at all (`${n} people depend` at n = 1)
 *     — nothing marks the expression as a count, so the walk cannot see it;
 *   - plural adjectives with a number-neutral copula («1 νοικοκυριό είναι …
 *     γνωστά») — Greek -ά/-ές/-οί endings collide with adverbs and singular
 *     neuters, so a lexical net would drown in false positives;
 *   - bare English plural verbs ("that reach") — undetectable without POS
 *     tagging; every shipped instance so far co-occurred with are/were/have;
 *   - ternaries whose branches are identifiers or property reads (label
 *     indirection) — nothing to render;
 *   - ternaries nested under a condition the evaluator cannot decide —
 *     recorded as unrenderable, not silently passed (asserted below);
 *   - copy assembled outside template literals, and n = 2 mis-singulars.
 * Both defect sites those holes have actually produced (advisory-impact.ts
 * «γνωστά», `${peopleCovered} people depend`) were fixed by hand in the same
 * change and are pinned behaviourally below.
 *
 * PROBE: tests/fixtures/guard-probes/count-copy-agreement.ts.txt carries the
 * two pre-fix defects VERBATIM plus five adversarial negatives. The probe
 * assertions pin the exact rendered windows and markers, proving the guard
 * turns red on the defect class and stays green on the traps.
 */

import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import ts from "typescript"
import { describe, expect, it } from "vitest"

import { householdOverview } from "@/lib/services/risk-dna/health-index"
import { bookOverview } from "@/lib/services/risk-dna/advisory-impact"
import { getRoleCopy } from "@/lib/i18n/role-copy"

const REPO_ROOT = process.cwd()
const ROOTS = ["app", "components", "lib"] as const
const NEUTRAL = "◊"

// ─── Enumeration: the filesystem decides the universe ──────────────────────

function listSourceFiles(rootAbs: string, out: string[] = []): string[] {
    for (const name of readdirSync(rootAbs)) {
        if (name === "node_modules" || name.startsWith(".")) continue
        const p = join(rootAbs, name)
        const st = statSync(p)
        if (st.isDirectory()) listSourceFiles(p, out)
        else if (/\.(ts|tsx)$/.test(name)) out.push(p)
    }
    return out
}

/** Cheap necessary condition before a full parse. Probed below. */
function mightContainSite(text: string): boolean {
    return text.includes("`") && /===\s*1\b|\b1\s*===|!==\s*1\b|\b1\s*!==/.test(text)
}

// ─── The scanner ───────────────────────────────────────────────────────────

interface Violation {
    file: string
    line: number
    count: string
    window: string
    markers: string[]
}

interface ScanResult {
    /** Checkable sites found (one per count-ternary per template). */
    sites: number
    /** Sites whose ternary never rendered under partial evaluation. */
    unrenderable: Array<{ file: string; line: number }>
    violations: Violation[]
}

const norm = (s: string) => s.replace(/\s+/g, " ").trim()

function skipParens(n: ts.Expression): ts.Expression {
    while (ts.isParenthesizedExpression(n)) n = n.expression
    return n
}

/** `<expr> === 1` (either order, also !==): returns the count expression's text. */
function countOfCondition(cond: ts.Expression): string | null {
    cond = skipParens(cond)
    if (!ts.isBinaryExpression(cond)) return null
    const op = cond.operatorToken.kind
    if (op !== ts.SyntaxKind.EqualsEqualsEqualsToken && op !== ts.SyntaxKind.ExclamationEqualsEqualsToken) return null
    const [a, b] = [skipParens(cond.left), skipParens(cond.right)]
    if (ts.isNumericLiteral(a) && a.text === "1" && !ts.isNumericLiteral(b)) return norm(b.getText())
    if (ts.isNumericLiteral(b) && b.text === "1" && !ts.isNumericLiteral(a)) return norm(a.getText())
    return null
}

/** Evaluate a condition under the count assignment, or null if undecidable. */
function evalCondition(cond: ts.Expression, assign: Map<string, number>): boolean | null {
    cond = skipParens(cond)
    if (!ts.isBinaryExpression(cond)) return null
    const op = cond.operatorToken.kind
    const [a, b] = [skipParens(cond.left), skipParens(cond.right)]
    const valueOf = (e: ts.Expression): number | null => {
        if (ts.isNumericLiteral(e)) return Number(e.text)
        const v = assign.get(norm(e.getText()))
        return v === undefined ? null : v
    }
    const [va, vb] = [valueOf(a), valueOf(b)]
    if (va === null || vb === null) return null
    switch (op) {
        case ts.SyntaxKind.EqualsEqualsEqualsToken:
        case ts.SyntaxKind.EqualsEqualsToken:
            return va === vb
        case ts.SyntaxKind.ExclamationEqualsEqualsToken:
        case ts.SyntaxKind.ExclamationEqualsToken:
            return va !== vb
        case ts.SyntaxKind.GreaterThanToken:
            return va > vb
        case ts.SyntaxKind.GreaterThanEqualsToken:
            return va >= vb
        case ts.SyntaxKind.LessThanToken:
            return va < vb
        case ts.SyntaxKind.LessThanEqualsToken:
            return va <= vb
        default:
            return null
    }
}

/** Render the template under the assignment, tracking the target's span. */
function renderTemplate(
    tpl: ts.TemplateExpression,
    assign: Map<string, number>,
    target: ts.ConditionalExpression
): { text: string; span: [number, number] | null } {
    let text = ""
    let span: [number, number] | null = null

    const goTemplate = (t: ts.TemplateExpression): void => {
        text += t.head.text
        for (const s of t.templateSpans) {
            goExpr(s.expression)
            text += s.literal.text
        }
    }
    const goExpr = (e: ts.Expression): void => {
        e = skipParens(e)
        if (ts.isConditionalExpression(e)) {
            const truth = evalCondition(e.condition, assign)
            if (truth === null) {
                text += NEUTRAL
                return
            }
            const start = text.length
            goExpr(truth ? e.whenTrue : e.whenFalse)
            if (e === target) span = [start, text.length]
            return
        }
        const assigned = assign.get(norm(e.getText()))
        if (assigned !== undefined) {
            text += String(assigned)
            return
        }
        if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) {
            text += e.text
            return
        }
        if (ts.isTemplateExpression(e)) {
            goTemplate(e)
            return
        }
        text += NEUTRAL
    }

    goTemplate(tpl)
    return { text, span }
}

/**
 * The clause(s) the target ternary rendered into: the text is split into
 * segments at clause boundaries, and the window is every segment the span
 * overlaps. A branch that BEGINS with a boundary (", and 1 more ends…") thus
 * never drags the previous clause — and its legitimate plural — into the
 * window. Subordinate-clause openers («για να», ώστε) are boundaries because
 * their verb agrees with its own subject, not with the count.
 */
const BOUNDARY = /[.;·!?—,:]|\s(?:και|and|but|αλλά|όμως|ώστε)\s|\sγια\sνα\s/gu

function clauseWindow(text: string, span: [number, number]): string {
    const segments: Array<[number, number]> = []
    let cursor = 0
    for (const m of text.matchAll(BOUNDARY)) {
        segments.push([cursor, m.index!])
        cursor = m.index! + m[0].length
    }
    segments.push([cursor, text.length])

    const empty = span[0] === span[1]
    const overlapping = segments.filter(([s, e]) =>
        empty ? s <= span[0] && span[0] <= e : Math.max(s, span[0]) < Math.min(e, span[1])
    )
    return overlapping
        .map(([s, e]) => text.slice(s, e).trim())
        .filter(Boolean)
        .join(" ")
}

const GREEK_PLURAL_VERB = /\p{L}+(?:ουν|ούν|νται)(?!\p{L})/gu
const ENGLISH_PLURAL_VERB = /\b(?:are|were|have)\b/gi
const PRONOUN_SUBJECT = /\b(?:you|we|they|i|who)\s+$/i

function agreementMarkers(window: string): string[] {
    const markers: string[] = []
    for (const m of window.matchAll(GREEK_PLURAL_VERB)) markers.push(m[0])
    for (const m of window.matchAll(ENGLISH_PLURAL_VERB)) {
        if (PRONOUN_SUBJECT.test(window.slice(0, m.index))) continue
        markers.push(m[0])
    }
    return markers
}

function scanSource(fileLabel: string, text: string, result: ScanResult): void {
    if (!mightContainSite(text)) return
    const sf = ts.createSourceFile(
        fileLabel,
        text,
        ts.ScriptTarget.Latest,
        true,
        fileLabel.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    )

    const checkTemplate = (tpl: ts.TemplateExpression) => {
        const conds: Array<{ node: ts.ConditionalExpression; count: string }> = []
        const collect = (n: ts.Node) => {
            if (ts.isConditionalExpression(n)) {
                const count = countOfCondition(n.condition)
                if (count) conds.push({ node: n, count })
            }
            n.forEachChild(collect)
        }
        collect(tpl)
        if (conds.length === 0) return

        const counts = [...new Set(conds.map((c) => c.count))]
        for (const targetCond of conds) {
            result.sites++
            const line = sf.getLineAndCharacterOfPosition(targetCond.node.getStart()).line + 1
            const assign = new Map(counts.map((c) => [c, c === targetCond.count ? 1 : 2]))
            const { text: rendered, span } = renderTemplate(tpl, assign, targetCond.node)
            if (!span) {
                result.unrenderable.push({ file: fileLabel, line })
                continue
            }
            const window = clauseWindow(rendered, span)
            const markers = agreementMarkers(window)
            if (markers.length > 0) {
                result.violations.push({ file: fileLabel, line, count: targetCond.count, window, markers })
            }
        }
    }

    // Top-level templates only — a template nested inside another template's
    // interpolation is rendered by its parent's check. Crossing a function
    // boundary (a callback inside an interpolation) starts a fresh top level.
    const visit = (node: ts.Node, insideTemplate: boolean) => {
        let inside = insideTemplate
        if (ts.isFunctionLike(node)) inside = false
        if (ts.isTemplateExpression(node) && !inside) {
            checkTemplate(node)
            inside = true
        }
        node.forEachChild((c) => visit(c, inside))
    }
    visit(sf, false)
}

function scanRepo(): ScanResult {
    const result: ScanResult = { sites: 0, unrenderable: [], violations: [] }
    for (const root of ROOTS) {
        for (const abs of listSourceFiles(join(REPO_ROOT, root))) {
            scanSource(relative(REPO_ROOT, abs), readFileSync(abs, "utf-8"), result)
        }
    }
    return result
}

/**
 * Exemptions for TRUE false positives only (a plural verb in-window agreeing
 * with a plural noun that is not the count). Every entry needs a reason.
 */
const EXEMPTIONS: Array<{ file: string; windowIncludes: string; reason: string }> = []

// ─── The guard ─────────────────────────────────────────────────────────────

describe("count-interpolated copy agrees as a whole clause at n = 1", () => {
    const repo = scanRepo()

    it("finds the universe it claims to walk", () => {
        // A collapsed enumeration or a broken parser must not read as clean.
        expect(repo.sites).toBeGreaterThanOrEqual(20)
        // A known member of the universe, so a silent skip of lib/ cannot pass:
        const monitoring = readFileSync(join(REPO_ROOT, "lib/services/risk-dna/monitoring.ts"), "utf-8")
        expect(mightContainSite(monitoring)).toBe(true)
    })

    it("ships no clause whose verbs disagree with the count at one", () => {
        const open = repo.violations.filter(
            (v) => !EXEMPTIONS.some((e) => v.file === e.file && v.window.includes(e.windowIncludes))
        )
        expect(
            open,
            open
                .map((v) => `${v.file}:${v.line} [${v.count}] «${v.window}» → ${v.markers.join(", ")}`)
                .join("\n")
        ).toEqual([])
    })

    it("does not silently pass sites it could not render", () => {
        // Unrenderable sites are a documented hole, not a green. Today:
        // className strength ternaries behind `strength > index` (no
        // user-facing words), and label-indirected branches behind a
        // `lang === "el"` test the evaluator cannot decide. A new one must
        // be looked at, then listed.
        const known = ["app/auth/reset-password/page.tsx", "components/coverage/RiskGraphPanel.tsx"]
        for (const u of repo.unrenderable) {
            expect(known, `unrenderable site ${u.file}:${u.line} — inspect it, then list it here`).toContain(u.file)
        }
    })
})

// ─── Probe: the guard turns red on the class and stays green on the traps ──

describe("probe: the detector flags the shipped defect shapes", () => {
    const probePath = join(REPO_ROOT, "tests/fixtures/guard-probes/count-copy-agreement.ts.txt")
    const probeText = readFileSync(probePath, "utf-8")

    it("passes the pre-filter that decides which files get parsed", () => {
        expect(mightContainSite(probeText)).toBe(true)
    })

    it("flags all five defects, from the rendered n = 1 clause", () => {
        const result: ScanResult = { sites: 0, unrenderable: [], violations: [] }
        scanSource("probe.ts", probeText, result)

        // Every site in the probe was reachable and checked.
        expect(result.sites).toBe(13)
        expect(result.unrenderable).toEqual([])

        // The violation is asserted on the RENDERED window — the string a
        // customer would read at one — not on the file's source text.
        expect(
            result.violations.map((v) => ({ window: v.window, markers: v.markers }))
        ).toEqual([
            { window: "1 area that reach the whole household are still open", markers: ["are"] },
            { window: "1 περιοχή που αφορούν όλο το νοικοκυριό παραμένουν ανοιχτές", markers: ["αφορούν", "παραμένουν"] },
            { window: "1 question about your life are still unanswered here", markers: ["are"] },
            { window: "1 ερώτηση για τη ζωή σας παραμένουν αναπάντητες εδώ", markers: ["παραμένουν"] },
            { window: "1 στοιχείο που χρειάζονται προσοχή", markers: ["χρειάζονται"] },
        ])
    })
})

// ─── Behavioural pins: the strings the UI renders, at 0, 1 and 2 ──────────
//
// RiskIntelligenceView renders household.nextAction[lang] verbatim
// (components/risk-dna/RiskIntelligenceView.tsx), so these ARE the rendered
// strings. The n = 1 case is the one the fixture matrices kept missing.

const graphOf = (dependants: number) =>
    ({
        nodes: [],
        byType: { dependent: Array.from({ length: dependants }, (_, i) => `dep-${i}`) },
    }) as any

const openDim = (id: string) => ({ id, label: { en: id, el: id }, openCount: 1 }) as any

describe("household nextAction inflects the whole clause (V2-P1-09)", () => {
    it("is silent at zero open household areas", () => {
        expect(householdOverview(graphOf(1), []).nextAction).toBeNull()
    })

    it("agrees at one, in both languages", () => {
        const one = householdOverview(graphOf(1), [openDim("family")])
        expect(one.nextAction).toEqual({
            en: "1 area that reaches the whole household is still open.",
            el: "1 περιοχή που αφορά όλο το νοικοκυριό παραμένει ανοιχτή.",
        })
    })

    it("agrees at two, in both languages", () => {
        const two = householdOverview(graphOf(1), [openDim("family"), openDim("income")])
        expect(two.nextAction).toEqual({
            en: "2 areas that reach the whole household are still open.",
            el: "2 περιοχές που αφορούν όλο το νοικοκυριό παραμένουν ανοιχτές.",
        })
    })
})

describe("sibling sites the scanner flagged or the sweep found, pinned at one", () => {
    it("role-copy itemsAttention (EL): the relative clause inflects too", () => {
        const el = getRoleCopy("el").agentDashboard.itemsAttention
        const en = getRoleCopy("en").agentDashboard.itemsAttention
        expect(el(1)).toBe("1 στοιχείο που χρειάζεται προσοχή.")
        expect(el(2)).toBe("2 στοιχεία που χρειάζονται προσοχή.")
        expect(en(1)).toBe("1 item requiring attention.")
        expect(en(2)).toBe("2 items requiring attention.")
    })

    it("bookOverview: one person covered is a person, not people", () => {
        const book = bookOverview([], [], 1, 0)
        expect(book.whyItMatters.en).toBe(
            "1 person depends on this book. 0 households carry an exposure that should not be left open."
        )
        expect(book.whyItMatters.el).toBe(
            "1 άτομο εξαρτάται από αυτό το χαρτοφυλάκιο. 0 νοικοκυριά φέρουν έκθεση που δεν πρέπει να μείνει ανοιχτή."
        )
    })

    it("bookOverview: one thinly-known household is «γνωστό», not «γνωστά»", () => {
        const book = bookOverview([], [{ index: null } as any], 0, 0)
        expect(book.nextAction.el).toBe(
            "1 νοικοκυριό είναι πολύ ελλιπώς γνωστό για να δοθούν συμβουλές. Αυτός είναι ο πρώτος περιορισμός, όχι τα κενά."
        )
        expect(book.nextAction.en).toBe(
            "1 household is too thinly known to advise on. That is the first constraint, not the gaps."
        )
    })
})
