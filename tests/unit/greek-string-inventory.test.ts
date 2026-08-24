/**
 * Greek copy freeze — §6.1.8.
 *
 * WHAT THIS GUARDS: no user-facing Greek string ships, changes, or disappears
 * without a deliberate, reviewable edit to the committed inventory
 * (tests/fixtures/greek-string-inventory.txt). Additions fail. Edits fail.
 * DELETIONS fail too — otherwise copy this run removed as prohibited could be
 * quietly re-added later without anyone noticing it had ever been removed.
 *
 * THE UNIVERSE (D-005 — a guard states what it walks and what it claims):
 *
 *   bundle — every leaf value of the `el` export of
 *            lib/i18n/translations/el.ts, keyed by dotted path (arrays by
 *            index). Leaves must be string/number/boolean; anything else
 *            throws, so a new value kind cannot be silently skipped.
 *
 *   inline — the `el` side of every object literal that carries BOTH an `el`
 *            and an `en` property (identifier or string-literal keys), in
 *            every .ts/.tsx file under app/, components/ AND lib/, enumerated
 *            recursively from the filesystem at test time — never from a
 *            hardcoded file list. The frozen text is the `el` initializer's
 *            exact source with whitespace runs collapsed to one space, so a
 *            composed template freezes its SHAPE (`Λήγει σε ${d} ημέρες`),
 *            not just its literals. lib/ is included although the original
 *            brief named only app/ + components/: the survey found 3,856 of
 *            the ~4,400 inline pairs live under lib/ (guides, glossary,
 *            notification registry, pricing copy) — a freeze without lib/
 *            would certify "no unreviewed Greek shipped" while 87% of the
 *            inline surface floated free. app/(public) is enumerated too:
 *            enumeration is read-only, and public marketing copy is exactly
 *            where an unreviewed claim is most dangerous.
 *
 *   ternary — every branch of every conditional expression (?:) in a .ts
 *            file whose DECODED string/template literal text contains a
 *            Greek codepoint (U+0370–U+03FF, U+1F00–U+1FFF), under app/,
 *            components/, lib/ PLUS contexts/, hooks/, types/, utils/ —
 *            every top-level root that holds runtime .ts code (the
 *            remaining roots — tests/, scripts/, prisma/, docs/, evals/,
 *            design-system/, ds-bundle/ — are not shipped to users).
 *            Enumerated recursively from the filesystem at test time. The
 *            frozen text is the branch's exact source, whitespace
 *            collapsed. The discriminator is GREEK TEXT IN A LITERAL,
 *            never the shape of the condition: `lang === "el" ? …`,
 *            `isEl ? …`, reversed `=== "en"` polarity and score chains are
 *            all in; locale codes ("el", "el_GR") are ASCII and naturally
 *            out, so the freeze never nags about language plumbing. Two
 *            branch kinds are skipped: a branch that is itself a
 *            conditional (a chained else-if ternary freezes as its leaves,
 *            not as one mega-entry), and a branch that is exactly an
 *            {el, en} pair object (the inline arm already froze its el
 *            side). Why this arm exists: locale-ternary Greek in .ts was
 *            the third shape of user-facing Greek that NOTHING covered —
 *            lint:i18n-changed scans .tsx only, and the two arms above see
 *            only bundle leaves and pairs — so a Greek sentence could ship
 *            there entirely unreviewed.
 *
 * DELIBERATELY NOT FROZEN (so nobody mistakes this for total coverage):
 *   - en.ts values, and the `en` side of inline pairs (English copy);
 *   - Greek outside the roots each arm names (tests/, scripts/, prisma/,
 *     docs/ and the other non-runtime roots);
 *   - bare Greek literals not shaped as a pair or a ternary branch —
 *     consts, enum members, object values under other key names, and
 *     `??` / `||` fallbacks;
 *   - ternaries in .tsx files (lint:i18n-changed's beat when touched);
 *   - Greek reaching a ternary branch only through a variable reference
 *     (the variable's own literal is a bare literal, above);
 *   - runtime composition beyond the frozen expression text;
 *   - computed property keys and spread-carried pairs (none exist today).
 *
 * WHEN THIS GOES RED: read the snapshot diff — it names the exact strings
 * that appeared, changed, or vanished. Review them (is this copy allowed to
 * say this? does it survive the absence-is-not-reassurance rule? is a
 * prohibited verdict creeping back?), then regenerate deliberately:
 *
 *     npx vitest --run tests/unit/greek-string-inventory.test.ts -u
 *
 * and commit the inventory diff IN THE SAME COMMIT as the copy change.
 *
 * PROBES: tests/fixtures/guard-probes/inline-el-en-pairs.tsx.txt and
 * tests/fixtures/guard-probes/locale-ternary-greek.ts.txt are the committed
 * red-probes for the two extractors — the guard asserts the exact multiset
 * each extracts from its file, one entry per shape that exists in the
 * codebase, plus shapes that must NOT match. The pre-filters (cheap regexes
 * that decide which files get a full AST parse) are probed separately,
 * because a pre-filter that skips a file the extractor could read is the
 * kind of hole that produces a false green.
 */

import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import ts from "typescript"
import { describe, expect, it } from "vitest"

import { el } from "@/lib/i18n/translations/el"

const REPO_ROOT = process.cwd()
const INLINE_ROOTS = ["app", "components", "lib"] as const
// Ternary arm: a superset of INLINE_ROOTS — runtime .ts code lives in more
// roots than pair copy ever did. A root deleted from the repo makes the walk
// throw, so a rename cannot silently shrink the universe.
const TERNARY_ROOTS = ["app", "components", "lib", "contexts", "hooks", "types", "utils"] as const
const INVENTORY_PATH = "../fixtures/greek-string-inventory.txt"

// ─── Enumeration: the filesystem decides the universe, not a list ──────────

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

/**
 * Cheap gate before the (expensive) AST parse. MUST err toward parsing:
 * matches `el:` / `'el':` / `"el":` and the shorthand forms `el,` / `el }`.
 * Probed below against every shape in the fixture — a pre-filter that skips
 * a parseable pair is a false green waiting to happen.
 */
export function couldContainPair(source: string): boolean {
    return /\bel\b\s*[:,}]/.test(source) || /['"]el['"]\s*:/.test(source)
}

// ─── Inline arm: TypeScript AST, not regex ─────────────────────────────────

function propName(p: ts.ObjectLiteralElementLike): string | null {
    if (ts.isShorthandPropertyAssignment(p)) return p.name.text
    if (ts.isPropertyAssignment(p)) {
        if (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) return p.name.text
    }
    return null
}

/** Every {el, en} pair in one source text → the el side's normalized source. */
export function extractInlinePairs(source: string, fileLabel: string): string[] {
    const sf = ts.createSourceFile(
        fileLabel,
        source,
        ts.ScriptTarget.Latest,
        true,
        /\.tsx(\.txt)?$/.test(fileLabel) ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    )
    const out: string[] = []
    const visit = (node: ts.Node) => {
        if (ts.isObjectLiteralExpression(node)) {
            let elProp: ts.PropertyAssignment | ts.ShorthandPropertyAssignment | undefined
            let hasEn = false
            for (const p of node.properties) {
                const name = propName(p)
                if (name === "el" && (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p))) {
                    elProp = p
                }
                if (name === "en") hasEn = true
            }
            if (elProp && hasEn) {
                const raw = ts.isPropertyAssignment(elProp)
                    ? elProp.initializer.getText(sf)
                    : // Shorthand `{ el, en }`: freeze the reference itself, so
                      // rewiring which variable feeds the pair still trips.
                      elProp.name.getText(sf)
                out.push(raw.replace(/\s+/g, " ").trim())
            }
        }
        ts.forEachChild(node, visit)
    }
    visit(sf)
    return out
}

// ─── Ternary arm: Greek in a ?: branch of a .ts file ───────────────────────

/** Greek and Coptic + Greek Extended — the ternary arm's discriminator. */
const GREEK_RE = /[\u0370-\u03FF\u1F00-\u1FFF]/

/**
 * Cheap gate before the (expensive) AST parse, ternary arm. MUST err toward
 * parsing: raw Greek, or a \u03xx / \u1Fxx / \u{…} escape that would DECODE
 * to Greek inside a literal (the raw source of an escaped literal contains
 * no Greek codepoint, so testing the raw text alone would skip it).
 */
export function couldContainGreek(source: string): boolean {
    return GREEK_RE.test(source) || /\\u03|\\u1f|\\u\{/i.test(source)
}

/** True iff any string/template literal under `node` DECODES to Greek text. */
function hasGreekLiteral(node: ts.Node): boolean {
    if (ts.isStringLiteralLike(node) && GREEK_RE.test(node.text)) return true
    if (ts.isTemplateExpression(node)) {
        if (GREEK_RE.test(node.head.text)) return true
        for (const span of node.templateSpans) if (GREEK_RE.test(span.literal.text)) return true
        // fall through: interpolated expressions may hold literals of their own
    }
    return ts.forEachChild(node, hasGreekLiteral) === true
}

function unparenthesize(n: ts.Expression): ts.Expression {
    while (ts.isParenthesizedExpression(n)) n = n.expression
    return n
}

function isElEnPairObject(n: ts.Node): boolean {
    if (!ts.isObjectLiteralExpression(n)) return false
    let hasEl = false
    let hasEn = false
    for (const p of n.properties) {
        const name = propName(p)
        if (name === "el") hasEl = true
        if (name === "en") hasEn = true
    }
    return hasEl && hasEn
}

/** Every Greek-bearing ?: branch in one .ts source → normalized branch source. */
export function extractTernaryGreek(source: string, fileLabel: string): string[] {
    const sf = ts.createSourceFile(fileLabel, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
    const out: string[] = []
    const visit = (node: ts.Node) => {
        if (ts.isConditionalExpression(node)) {
            for (const branch of [node.whenTrue, node.whenFalse]) {
                const inner = unparenthesize(branch)
                // A conditional branch freezes as its own leaves (visited on
                // their own), and an {el, en} pair branch is already the
                // inline arm's entry — freezing it twice is only noise.
                if (ts.isConditionalExpression(inner) || isElEnPairObject(inner)) continue
                if (hasGreekLiteral(branch)) out.push(branch.getText(sf).replace(/\s+/g, " ").trim())
            }
        }
        ts.forEachChild(node, visit)
    }
    visit(sf)
    return out
}

// ─── Bundle arm: walk the real module, not its source text ─────────────────

export function collectBundleLeaves(
    node: unknown,
    path: string,
    out: Array<[path: string, frozen: string]>,
): void {
    if (typeof node === "string" || typeof node === "number" || typeof node === "boolean") {
        out.push([path, JSON.stringify(node)])
        return
    }
    if (Array.isArray(node)) {
        node.forEach((v, i) => collectBundleLeaves(v, `${path}[${i}]`, out))
        return
    }
    const proto = node === null || typeof node !== "object" ? undefined : Object.getPrototypeOf(node)
    if (proto === Object.prototype || proto === null) {
        for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
            collectBundleLeaves(v, path ? `${path}.${k}` : k, out)
        }
        return
    }
    // A function, null, undefined or exotic object in the bundle would be a
    // leaf this freeze cannot represent — refuse loudly instead of skipping,
    // so the universe claim above stays true.
    throw new Error(
        `greek-string-inventory: unfreezable leaf at el.${path} (${Object.prototype.toString.call(node)}) — extend the walker deliberately`,
    )
}

// ─── Assembly ───────────────────────────────────────────────────────────────

const byCodeUnit = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

interface Universe {
    filesEnumerated: number
    bundleLines: string[]
    inlineLines: string[]
    inlineFileCount: number
    perFile: Map<string, number>
    ternaryLines: string[]
    ternaryFileCount: number
    perFileTernary: Map<string, number>
}

function buildUniverse(): Universe {
    const bundleEntries: Array<[string, string]> = []
    collectBundleLeaves(el, "", bundleEntries)
    const bundleLines = bundleEntries
        .map(([p, v]) => `bundle\t${p}\t${v}`)
        .sort(byCodeUnit)

    const inlineLines: string[] = []
    const perFile = new Map<string, number>()
    const ternaryLines: string[] = []
    const perFileTernary = new Map<string, number>()
    let filesEnumerated = 0
    const inlineRootSet = new Set<string>(INLINE_ROOTS)
    for (const root of TERNARY_ROOTS) {
        const isInlineRoot = inlineRootSet.has(root)
        for (const abs of listSourceFiles(join(REPO_ROOT, root))) {
            filesEnumerated++
            const source = readFileSync(abs, "utf8")
            const rel = abs.slice(REPO_ROOT.length + 1).split("\\").join("/")
            // Sorted WITHIN the file (duplicates kept as repeated lines): a
            // pure reorder of existing copy is invisible; an added, changed
            // or deleted string — including the second copy of a duplicate —
            // is a line-level diff.
            if (isInlineRoot && couldContainPair(source)) {
                const texts = extractInlinePairs(source, rel)
                if (texts.length > 0) {
                    perFile.set(rel, texts.length)
                    for (const t of [...texts].sort(byCodeUnit)) inlineLines.push(`inline\t${rel}\t${t}`)
                }
            }
            if (rel.endsWith(".ts") && !rel.endsWith(".tsx") && couldContainGreek(source)) {
                const texts = extractTernaryGreek(source, rel)
                if (texts.length > 0) {
                    perFileTernary.set(rel, texts.length)
                    for (const t of [...texts].sort(byCodeUnit)) ternaryLines.push(`ternary\t${rel}\t${t}`)
                }
            }
        }
    }
    inlineLines.sort(byCodeUnit)
    ternaryLines.sort(byCodeUnit)
    return {
        filesEnumerated,
        bundleLines,
        inlineLines,
        inlineFileCount: perFile.size,
        perFile,
        ternaryLines,
        ternaryFileCount: perFileTernary.size,
        perFileTernary,
    }
}

function serializeInventory(u: Universe): string {
    const header = [
        "# Greek copy inventory — FROZEN.",
        "# Guard: tests/unit/greek-string-inventory.test.ts (read its header for the full universe claim).",
        "# A red guard means Greek copy was added, changed, or deleted without this file moving with it.",
        "# Review the copy change, then regenerate deliberately and commit both in the same commit:",
        "#     npx vitest --run tests/unit/greek-string-inventory.test.ts -u",
        "#",
        "# bundle — leaf values of `el` in lib/i18n/translations/el.ts, by dotted path, JSON-encoded.",
        "# inline — el side of every {el, en} object literal under app/, components/, lib/;",
        "#          exact initializer source, whitespace collapsed.",
        "# ternary — every ?: branch whose decoded string/template literals contain Greek,",
        "#           in .ts files under app/, components/, lib/, contexts/, hooks/, types/,",
        "#           utils/; branch source, whitespace collapsed. Skipped: branches that are",
        "#           themselves conditionals (chains freeze as their leaves) and {el, en}",
        "#           pair branches (already inline entries). NOT covered by any arm: en",
        "#           copy, .tsx ternaries (lint:i18n-changed's beat), bare literals and",
        "#           ??/|| fallbacks, Greek outside these roots.",
        "#",
        `# bundle entries: ${u.bundleLines.length}`,
        `# inline entries: ${u.inlineLines.length} across ${u.inlineFileCount} files`,
        `# ternary entries: ${u.ternaryLines.length} across ${u.ternaryFileCount} files`,
        "",
    ]
    return [...header, ...u.bundleLines, ...u.inlineLines, ...u.ternaryLines, ""].join("\n")
}

// ─── The guard ──────────────────────────────────────────────────────────────

describe("greek string inventory (§6.1.8 copy freeze)", () => {
    const universe = buildUniverse()

    it("froze the union against the committed inventory — additions, edits AND deletions all fail", async () => {
        await expect(serializeInventory(universe)).toMatchFileSnapshot(INVENTORY_PATH)
    })

    /**
     * Emptiness looks exactly like success to a snapshot if the snapshot is
     * regenerated while the walker is broken. Floors make a collapsed
     * universe fail on its own, before anyone trusts a green: values are
     * well below the 2026-08-24 measurement (2,776 bundle / ~4,400 inline
     * over ~210 files / ~1,300 files enumerated) but far above zero.
     */
    it("actually walked a universe of plausible size", () => {
        expect(universe.filesEnumerated).toBeGreaterThan(800)
        expect(universe.bundleLines.length).toBeGreaterThan(2200)
        expect(universe.inlineLines.length).toBeGreaterThan(3500)
        expect(universe.inlineFileCount).toBeGreaterThan(150)
        // Ternary arm, measured 2026-08-24: 298 entries across 45 files.
        expect(universe.ternaryLines.length).toBeGreaterThan(250)
        expect(universe.ternaryFileCount).toBeGreaterThan(35)
    })

    it("reached all three roots — one known copy-heavy file per root is present", () => {
        expect(universe.perFile.get("app/(protected)/agent/AgentClient.tsx") ?? 0).toBeGreaterThan(30)
        expect(universe.perFile.get("components/coverage/RiskProfileWizard.tsx") ?? 0).toBeGreaterThan(20)
        expect(universe.perFile.get("lib/guides/content.ts") ?? 0).toBeGreaterThan(200)
    })

    it("ternary arm reached both roots that carry entries — and pinned the health-score verdict vocabulary", () => {
        // lib/agent/health-score.ts returns «Καλή»/«Μέτρια»/«Χρειάζεται
        // προσοχή» — a verdict vocabulary on a score, the pattern §2.3
        // prohibits. It is agent-side and out of scope to CHANGE (§12.4),
        // so the freeze PINS it at exactly 3 entries: editing or extending
        // that vocabulary now requires a deliberate inventory regen.
        expect(universe.perFileTernary.get("lib/agent/health-score.ts") ?? 0).toBe(3)
        expect(universe.perFileTernary.get("lib/email/templates/engagement-drip.ts") ?? 0).toBeGreaterThan(25)
        expect(universe.perFileTernary.get("app/api/v1/policies/[id]/documents/[docId]/route.ts") ?? 0).toBeGreaterThan(2)
    })

    // ── Probes: prove the detector detects, with committed fixtures ────────

    const probeSource = readFileSync(
        join(REPO_ROOT, "tests/fixtures/guard-probes/inline-el-en-pairs.tsx.txt"),
        "utf8",
    )

    it("extracts the exact multiset from the committed probe fixture — every shape the codebase contains", () => {
        const got = [...extractInlinePairs(probeSource, "inline-el-en-pairs.tsx.txt")].sort(byCodeUnit)
        const expected = [
            "'Δοκιμαστικό αντίγραφο'", // plain single-quoted literal
            '"Με εισαγωγικά κλειδιά"', // quoted keys, double-quoted value
            "`Γεια σου ${someVar}`", // template WITH interpolation — shape frozen
            "`Χωρίς παρεμβολή`", // template without interpolation
            "`Πρώτη γραμμή δεύτερη γραμμή`", // multiline template, whitespace collapsed
            "['Πρώτο στοιχείο', 'Δεύτερο στοιχείο']", // array of strings
            "{ title: 'Τίτλος ενότητας', hint: 'Υπόδειξη' }", // nested copy object
            "cond ? 'Ναι' : 'Όχι'", // conditional
            "someVar", // reference — rewiring the source trips
            "el", // shorthand { el, en }
            "'Με έξτρα ιδιότητες'", // pair with extra sibling props
            "'Διπλότυπο κείμενο'", // duplicate #1 …
            "'Διπλότυπο κείμενο'", // … and #2: both survive, so deleting one trips
        ].sort(byCodeUnit)
        expect(got).toEqual(expected)
    })

    it("does not invent pairs — el-only, en-only and lookalike keys stay out", () => {
        const got = extractInlinePairs(probeSource, "inline-el-en-pairs.tsx.txt")
        expect(got).not.toContain("'Μόνο ελληνικά χωρίς en'")
        expect(got.join("\n")).not.toContain("English only")
        expect(got.join("\n")).not.toContain("ψηλά") // { elevation, enabled } is not a pair
    })

    it("pre-filter never skips a file the extractor could read", () => {
        // The whole fixture (contains every shape) must pass the gate…
        expect(couldContainPair(probeSource)).toBe(true)
        // …and so must each minimal form on its own, shorthand included.
        for (const snippet of [
            "x({ el: 'α', en: 'b' })",
            "x({ 'el': 'α', \"en\": 'b' })",
            "x({ el, en })",
            "x({el,en})",
        ]) {
            expect(couldContainPair(snippet)).toBe(true)
        }
    })

    // ── Ternary-arm probes: committed fixture, exact multiset ──────────────

    const ternaryProbeSource = readFileSync(
        join(REPO_ROOT, "tests/fixtures/guard-probes/locale-ternary-greek.ts.txt"),
        "utf8",
    )

    it("ternary arm extracts the exact multiset from its committed probe fixture", () => {
        const got = [...extractTernaryGreek(ternaryProbeSource, "locale-ternary-greek.ts.txt")].sort(
            byCodeUnit,
        )
        const expected = [
            '"Απλό κείμενο"', // canonical locale ternary, Greek branch only
            "'Ψευδώνυμο'", // alias condition (isEl) — condition never inspected
            '"Στα ελληνικά δεύτερο"', // reversed polarity — Greek in whenFalse
            "`Λήγει σε ${days} ημέρες`", // template WITH interpolation — shape frozen
            "`Πρώτη γραμμή δεύτερη γραμμή`", // multiline template, whitespace collapsed
            '"Καλή τιμή"', // chained else-if ternary …
            '"Μέτρια τιμή"', // … freezes as three leaves …
            '"Κακή τιμή"', // … never as one mega-entry
            '"Πρώτη επιλογή"', // parenthesized nested conditional: inner leaves …
            '"Δεύτερη επιλογή"', // … freeze; the wrapping branch does not
            'counted(v, "στοιχείο", "στοιχεία")', // call carrying the Greek — whole branch
            '"Ναι"', // ternary inside a template interpolation
            '"Αγαπητέ πελάτη"', // both branches Greek (register, not locale) …
            '"Γεια σου φίλε"', // … both freeze
            '"\\u0395\\u03BB\\u03BB\\u03AC\\u03B4\\u03B1"', // escaped Greek — decoded text decides
            '"Απλό κείμενο"', // duplicate of the first entry: both copies survive
        ].sort(byCodeUnit)
        expect(got).toEqual(expected)
    })

    it("ternary arm does not invent entries — plumbing, pairs, conditions, comments, references and fallbacks stay out", () => {
        const got = extractTernaryGreek(ternaryProbeSource, "locale-ternary-greek.ts.txt")
        const joined = got.join("\n")
        expect(got).not.toContain('"el"') // locale codes are ASCII, not copy
        expect(got).not.toContain('"el_GR"')
        expect(joined).not.toContain("Ζεύγος εδώ") // {el, en} pair branch — inline arm's entry
        expect(joined).not.toContain("ναι") // Greek in the CONDITION is data, not copy
        expect(joined).not.toContain("σχόλιο") // Greek in a comment — literals decide
        expect(joined).not.toContain("greekConst") // reference-carried Greek: stated limit
        expect(joined).not.toContain("Εκτός τριαδικού")
        expect(joined).not.toContain("Εφεδρικό") // ?? fallback is not a ternary: stated limit
        expect(joined).not.toContain("Άλλο εφεδρικό") // || fallback likewise
        expect(joined).not.toContain("score >= 60") // no mega-entry for the chain
        expect(joined).not.toContain("flag ?") // no mega-entry for the parenthesized nest
        // The pair branch the ternary arm skips is NOT unguarded — the inline
        // arm extracts it from the very same fixture:
        expect(extractInlinePairs(ternaryProbeSource, "locale-ternary-greek.ts.txt")).toContain(
            '"Ζεύγος εδώ"',
        )
    })

    it("ternary pre-filter never skips a file the extractor could read — escaped Greek included", () => {
        expect(couldContainGreek(ternaryProbeSource)).toBe(true)
        // Escaped-only sources contain no raw Greek codepoint; the gate must
        // still let them through, and the extractor must decode them.
        const escaped = 'const a = x ? "\\u0395\\u03BB\\u03BB\\u03AC\\u03B4\\u03B1" : "e"'
        expect(GREEK_RE.test(escaped)).toBe(false) // proves the case is real
        expect(couldContainGreek(escaped)).toBe(true)
        expect(extractTernaryGreek(escaped, "escaped.ts")).toEqual([
            '"\\u0395\\u03BB\\u03BB\\u03AC\\u03B4\\u03B1"',
        ])
        expect(couldContainGreek('x ? "\\u1F08" : "e"')).toBe(true)
        // A file with no Greek and no escape is legitimately skipped.
        expect(couldContainGreek('const x = flag ? "yes" : "no"')).toBe(false)
    })

    it("bundle walker records every leaf and refuses leaves it cannot freeze", () => {
        const out: Array<[string, string]> = []
        collectBundleLeaves(
            { a: "α", nested: { b: "β" }, list: ["γ", "δ"], n: 3, flag: true },
            "",
            out,
        )
        expect(out).toEqual([
            ["a", '"α"'],
            ["nested.b", '"β"'],
            ["list[0]", '"γ"'],
            ["list[1]", '"δ"'],
            ["n", "3"],
            ["flag", "true"],
        ])
        expect(() => collectBundleLeaves({ f: () => "χ" }, "", [])).toThrow(/unfreezable leaf/)
        expect(() => collectBundleLeaves({ v: null }, "", [])).toThrow(/unfreezable leaf/)
    })
})
