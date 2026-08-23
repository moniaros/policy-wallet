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
 * DELIBERATELY NOT FROZEN (so nobody mistakes this for total coverage):
 *   - en.ts values, and the `en` side of inline pairs (English copy);
 *   - Greek outside the three roots (tests/, scripts/, prisma/, docs/);
 *   - Greek not shaped as an {el, en} pair outside the bundle — bare
 *     literals and `locale === 'el' ? '…' : '…'` ternaries are
 *     lint:i18n-changed's beat, and locale-keyed maps with other key names
 *     are invisible to this walk;
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
 * PROBES: tests/fixtures/guard-probes/inline-el-en-pairs.tsx.txt is the
 * committed red-probe for the extractor — the guard asserts the exact
 * multiset it extracts from that file, one entry per shape that exists in
 * the codebase, plus non-pairs that must NOT match. The pre-filter (a cheap
 * regex that decides which files get a full AST parse) is probed separately,
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
}

function buildUniverse(): Universe {
    const bundleEntries: Array<[string, string]> = []
    collectBundleLeaves(el, "", bundleEntries)
    const bundleLines = bundleEntries
        .map(([p, v]) => `bundle\t${p}\t${v}`)
        .sort(byCodeUnit)

    const inlineLines: string[] = []
    const perFile = new Map<string, number>()
    let filesEnumerated = 0
    for (const root of INLINE_ROOTS) {
        for (const abs of listSourceFiles(join(REPO_ROOT, root))) {
            filesEnumerated++
            const source = readFileSync(abs, "utf8")
            if (!couldContainPair(source)) continue
            const rel = abs.slice(REPO_ROOT.length + 1).split("\\").join("/")
            const texts = extractInlinePairs(source, rel)
            if (texts.length === 0) continue
            perFile.set(rel, texts.length)
            // Sorted WITHIN the file (duplicates kept as repeated lines): a
            // pure reorder of existing copy is invisible; an added, changed
            // or deleted string — including the second copy of a duplicate —
            // is a line-level diff.
            for (const t of [...texts].sort(byCodeUnit)) inlineLines.push(`inline\t${rel}\t${t}`)
        }
    }
    inlineLines.sort(byCodeUnit)
    return { filesEnumerated, bundleLines, inlineLines, inlineFileCount: perFile.size, perFile }
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
        "#          exact initializer source, whitespace collapsed. NOT covered: en copy, Greek",
        "#          outside these roots, non-pair literals/ternaries (lint:i18n-changed's beat).",
        "#",
        `# bundle entries: ${u.bundleLines.length}`,
        `# inline entries: ${u.inlineLines.length} across ${u.inlineFileCount} files`,
        "",
    ]
    return [...header, ...u.bundleLines, ...u.inlineLines, ""].join("\n")
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
    })

    it("reached all three roots — one known copy-heavy file per root is present", () => {
        expect(universe.perFile.get("app/(protected)/agent/AgentClient.tsx") ?? 0).toBeGreaterThan(30)
        expect(universe.perFile.get("components/coverage/RiskProfileWizard.tsx") ?? 0).toBeGreaterThan(20)
        expect(universe.perFile.get("lib/guides/content.ts") ?? 0).toBeGreaterThan(200)
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
