import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { globSync } from "../helpers/glob"

/**
 * Model-written prose reaches a customer only on a screen that says what it is.
 *
 * H-006 and H-007 were answered 2026-08-25: proceed, and state plainly that AI
 * output is **not professional advice** and that the customer should take
 * important decisions to **their insurance adviser**. That is the whole
 * requirement, so it is worth enforcing rather than asserting once and hoping.
 *
 * The unit is the PAGE, not the component. `SummaryCard` renders a model-written
 * coverage summary and carries no disclosure of its own — correctly, because the
 * policy page that mounts it carries one, and repeating it beside every
 * paragraph would turn a disclosure into wallpaper. So this walks the import
 * graph: a component is covered when any route that can mount it renders
 * `AiDisclaimer`.
 *
 * What counts as model-written prose is a named list of field accessors, not a
 * guess — `aiExplanation`, `aiSuggestion`, `coverageSummary` and friends are the
 * fields an LLM fills. A new one is added here, deliberately, with the same
 * question asked of it: does the screen showing it say what it is?
 */

const APP = "app/**/*.tsx"
const COMPONENTS = "components/**/*.tsx"

/** Fields an LLM writes. Extend deliberately; each addition is a decision. */
const MODEL_PROSE = /\b(aiExplanation|aiSuggestion|aiExplanationEl|aiSuggestionEl|coverageSummary|aiAnswer)\b/

/** Staff surfaces are outside §12.4's B2C scope. */
const isB2C = (f: string) =>
    !/\/admin|\/agent\b|components\/agent|app\/\(public\)|app\/auth|landing/.test(f)

const all = [...globSync(APP), ...globSync(COMPONENTS)].filter(isB2C).sort()
const source = new Map(all.map((f) => [f, readFileSync(f, "utf-8")]))

/** Resolve a relative or aliased import to a file we have. */
function resolveImport(fromFile: string, spec: string): string | null {
    let base: string
    if (spec.startsWith("@/")) base = spec.slice(2)
    else if (spec.startsWith(".")) {
        const dir = fromFile.split("/").slice(0, -1)
        for (const part of spec.split("/")) {
            if (part === ".") continue
            else if (part === "..") dir.pop()
            else dir.push(part)
        }
        base = dir.join("/")
    } else return null
    for (const ext of [".tsx", ".ts", "/index.tsx", "/index.ts"]) {
        if (source.has(base + ext)) return base + ext
    }
    return source.has(base) ? base : null
}

/** file -> files it imports, and file -> files that import it. */
const imports = new Map<string, Set<string>>()
const importedBy = new Map<string, Set<string>>()
for (const [file, src] of source) {
    for (const m of src.matchAll(/from\s+["']([^"']+)["']/g)) {
        const target = resolveImport(file, m[1])
        if (!target) continue
        if (!imports.has(file)) imports.set(file, new Set())
        imports.get(file)!.add(target)
        if (!importedBy.has(target)) importedBy.set(target, new Set())
        importedBy.get(target)!.add(file)
    }
}

// The Grafí application tier renders its disclosure as `PlatformNote` (the
// «Σημείωση» block in the product's voice, src/design-system/app/platform-note.tsx);
// `app.note.body` is the sentence it carries. Both count, and the probe below
// proves the new name is actually recognised rather than assumed.
const DISCLOSURE_RE = /AiDisclaimer|aiAdviceDisclaimer|PlatformNote|app\.note\.body/
const rendersDisclosure = (f: string) => DISCLOSURE_RE.test(source.get(f) ?? "")
const isPage = (f: string) => /\/(page|layout)\.tsx$/.test(f)

/** Everything this file can pull into one render tree. */
function closureDown(file: string, seen = new Set<string>()): Set<string> {
    if (seen.has(file)) return seen
    seen.add(file)
    for (const child of imports.get(file) ?? []) closureDown(child, seen)
    return seen
}

/** Every page that can mount this file. */
function mountingPages(file: string, seen = new Set<string>(), out = new Set<string>()): Set<string> {
    if (seen.has(file)) return out
    seen.add(file)
    if (isPage(file)) out.add(file)
    for (const parent of importedBy.get(file) ?? []) mountingPages(parent, seen, out)
    return out
}

/**
 * Covered when the disclosure lands in the SAME render tree — which is what a
 * reader actually sees. The first version of this walked only upward, so a
 * `page.tsx` looked uncovered no matter what it rendered, because a page has no
 * importers. A page is covered by its descendants; a component by the pages
 * that mount it.
 */
function coverage(file: string): { covered: boolean; bare: string[] } {
    if (rendersDisclosure(file)) return { covered: true, bare: [] }
    if ([...closureDown(file)].some(rendersDisclosure)) return { covered: true, bare: [] }
    const pages = [...mountingPages(file)]
    if (pages.length === 0) return { covered: false, bare: ["(mounted by no page — unreachable?)"] }
    const bare = pages.filter((pg) => ![...closureDown(pg)].some(rendersDisclosure))
    return { covered: bare.length === 0, bare }
}

/**
 * The import-closure check above OVER-APPROXIMATES: importing `AiDisclaimer` is
 * not rendering it, and an import inside a conditional branch counts the same as
 * one at the top of the tree. Proven — stripping the disclosure from
 * `PolicyDetailsClientView` left the closure check green, because the policy
 * page also imports `RecommendationCards`, which carries its own.
 *
 * So the closure check catches a surface with NO disclosure anywhere near it —
 * it found nine — and this list catches the regression it cannot see. These are
 * the surfaces where the prose is the point, and each must carry the disclosure
 * in its OWN source.
 */
const MUST_CARRY_THEIR_OWN = [
    "components/wallet/PolicyDetailsClientView.tsx",
    "components/coverage/CoverageInsightsClient.tsx",
    "components/wallet/PolicyComparison.tsx",
    "components/wallet/EditPolicyForm.tsx",
    "app/(protected)/collaboration/threads/[id]/page.tsx",
]

describe("the surfaces where AI prose IS the point carry their own disclosure", () => {
    it.each(MUST_CARRY_THEIR_OWN)("%s renders AiDisclaimer itself", (file) => {
        const src = source.get(file)
        expect(src, `${file} is not in the scanned set — did it move?`).toBeTruthy()
        expect(
            /<AiDisclaimer/.test(src!),
            `${file} relies on a sibling's disclosure; an import is not a render`
        ).toBe(true)
    })
})

describe("AI output says what it is, on every B2C surface that shows it", () => {
    const prose = all.filter((f) => MODEL_PROSE.test(source.get(f) ?? ""))

    it("enumerates a real universe", () => {
        expect(all.length).toBeGreaterThan(150)
        expect(prose.length).toBeGreaterThan(5)
        // The import graph resolved, or every file would look uncovered.
        expect(importedBy.size).toBeGreaterThan(50)
    })

    it("the Grafí note is recognised as a disclosure, and says what the legacy one says", () => {
        expect(DISCLOSURE_RE.test('import { PlatformNote } from "@/src/design-system/app"')).toBe(true)
        expect(DISCLOSURE_RE.test("const x = t.app.note.body")).toBe(true)
        expect(DISCLOSURE_RE.test("const x = t.app.note.title")).toBe(false)
        for (const lang of ["el", "en"]) {
            const dict = readFileSync(`lib/i18n/translations/app/${lang}.ts`, "utf-8")
            const line = dict.match(/body:[^\n]*/)?.[0] ?? ""
            expect(line, `${lang}: app.note.body missing`).toBeTruthy()
            expect(/AI/.test(line), `${lang}: must say AI read it (Art. 50)`).toBe(true)
            expect(/not insurance advice|δεν είναι ασφαλιστική συμβουλή/i.test(line), `${lang}: must deny insurance advice`).toBe(true)
            expect(/adviser|σύμβουλ/i.test(line), `${lang}: must point at the customer's own adviser`).toBe(true)
        }
    })

    it("the disclosure names the adviser and denies professional advice", () => {
        for (const lang of ["el", "en"]) {
            const dict = readFileSync(`lib/i18n/translations/${lang}.ts`, "utf-8")
            const line = dict.match(/aiAdviceDisclaimer:[^\n]*/)?.[0] ?? ""
            expect(line, `${lang}: disclosure missing`).toBeTruthy()
            const denies = /not professional|δεν αποτελούν επαγγελματική/i.test(line)
            const namesAdviser = /adviser|advisor|σύμβουλο/i.test(line)
            expect(denies, `${lang}: must deny PROFESSIONAL advice, not only legal/insurance`).toBe(true)
            expect(namesAdviser, `${lang}: must point the customer at their adviser`).toBe(true)
        }
    })

    // Grafí G8 (A-25): legacy components no route mounts any more. Each stays
    // listed until the cleanup commit deletes it — an entry goes stale (fails)
    // the moment the file is gone OR a page mounts it again, so this is a
    // ratchet, not an exemption.
    const RETIRED_UNREACHABLE = [
        "components/wallet/BatchUploadModal.tsx",
        "components/wallet/policy-detail/SummaryCard.tsx",
    ]
    const UNREACHABLE = "(mounted by no page — unreachable?)"
    it("every surface rendering model prose is covered by a disclosure", () => {
        const uncovered = prose
            .map((f) => ({ f, ...coverage(f) }))
            .filter((r) => !r.covered)
            .filter((r) => !(RETIRED_UNREACHABLE.includes(r.f) && r.bare.length === 1 && r.bare[0] === UNREACHABLE))
            .map((r) => `${r.f}  ← page(s) without one: ${r.bare.join(", ")}`)
        expect(uncovered).toEqual([])
    })
    it("retired legacy components are still on disk and still mounted by no page — either change makes the entry stale", () => {
        for (const f of RETIRED_UNREACHABLE) {
            expect(source.has(f), `${f} was deleted — remove its RETIRED_UNREACHABLE entry`).toBe(true)
            expect([...mountingPages(f)], `${f} is mounted by a page again — it needs a disclosure, not a retirement entry`).toEqual([])
        }
    })
})
