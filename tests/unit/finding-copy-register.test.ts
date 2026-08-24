/**
 * The guilt register — the V2-P1-04 class, guarded to the extent it honestly
 * can be.
 *
 * §2.13 prohibits emotional leverage applied to an unvalidated finding. The
 * instance this run removed told the customer how to FEEL about a gap no
 * underwriter has validated — in both directions:
 *
 *     "…so every gap here is yours alone to carry."          (0 dependants)
 *     "A gap here is not only your problem."                 (≥1 dependant)
 *
 * The fact half of each sentence (who depends on the cover) came from the
 * customer's own profile and stays. The moral half went.
 *
 * WHAT THIS FILE GUARDS — precisely, and no more:
 *
 *  1. BEHAVIOURAL PINS: `householdOverview().whyItMatters` is asserted to
 *     EQUAL the authored fact-only copy at 0, 1 and 2 dependants, in both
 *     languages. Any sentence appended to this field again — moralising or
 *     otherwise — turns this red. This is the render path:
 *     RiskIntelligenceView renders the field verbatim.
 *
 *  2. TOMBSTONES: the four removed sentences must not reappear anywhere
 *     under app/, components/ or lib/ (whitespace-normalised substring
 *     match, filesystem-enumerated). Removed-as-prohibited copy must not be
 *     quietly re-added — the same rule the Greek freeze applies, extended to
 *     the English side, which no freeze covers.
 *
 * WHAT THIS FILE DOES **NOT** CLAIM: a general detector for "moral judgement
 * attached to a finding". That class is NOT reliably automatable here, and a
 * phrase-list guard pretending otherwise would be a false green factory.
 * What was considered and rejected:
 *   - a lexicon of blame/burden phrasing («δικό σας πρόβλημα», "yours alone",
 *     "your fault", «φταίτε», "burden") — trivially escaped by paraphrase,
 *     and the register lives in the PAIRING of judgement with an unvalidated
 *     finding, not in any word: "this is your responsibility" is fine on a
 *     consent form and prohibited on a gap card;
 *   - structural heuristics (a second sentence after a count-fact; second-
 *     person + negation near "gap") — false-positive on legitimate copy
 *     everywhere ("A gap here is not a verdict" is the honesty rule itself);
 *   - sentiment/POS analysis — nondeterministic or dependency-heavy, and
 *     still blind to register-in-context.
 * Detection of NEW instances stays with review: the Greek freeze makes every
 * new Greek sentence a deliberate, reviewed diff, and §2.13 is the review
 * criterion. This file only makes the two decided cases irreversible.
 */

import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import { describe, expect, it } from "vitest"

import { householdOverview } from "@/lib/services/risk-dna/health-index"

// ─── 1. Behavioural pins: the fact ships, the moral does not ───────────────

const graphOf = (dependants: number) =>
    ({
        nodes: [],
        byType: { dependent: Array.from({ length: dependants }, (_, i) => `dep-${i}`) },
    }) as any

describe("household whyItMatters states the fact and stops (V2-P1-04)", () => {
    it("zero dependants: no burden framing for being the only one", () => {
        expect(householdOverview(graphOf(0), []).whyItMatters).toEqual({
            en: "Nobody else depends on your cover.",
            el: "Κανείς άλλος δεν εξαρτάται από την κάλυψή σας.",
        })
    })

    it("one dependant: the count, agreeing, and nothing about whose problem it is", () => {
        expect(householdOverview(graphOf(1), []).whyItMatters).toEqual({
            en: "1 person depends on this protection.",
            el: "1 άτομο εξαρτάται από αυτή την προστασία.",
        })
    })

    it("two dependants: the count, and still no moral", () => {
        expect(householdOverview(graphOf(2), []).whyItMatters).toEqual({
            en: "2 people depend on this protection.",
            el: "2 άτομα εξαρτώνται από αυτή την προστασία.",
        })
    })
})

// ─── 2. Tombstones: removed-as-prohibited copy stays removed ───────────────

const TOMBSTONES = [
    "every gap here is yours alone to carry",
    "κάθε κενό εδώ το φέρετε μόνος σας",
    "A gap here is not only your problem",
    "Ένα κενό εδώ δεν είναι μόνο δικό σας πρόβλημα",
] as const

const REPO_ROOT = process.cwd()
const ROOTS = ["app", "components", "lib"] as const

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

const normalise = (s: string) => s.replace(/\s+/g, " ")

function tombstonesIn(text: string): string[] {
    const flat = normalise(text)
    return TOMBSTONES.filter((t) => flat.includes(normalise(t)))
}

describe("the removed sentences do not come back", () => {
    it("no source file under app/, components/ or lib/ carries them", () => {
        const hits: string[] = []
        for (const root of ROOTS) {
            for (const abs of listSourceFiles(join(REPO_ROOT, root))) {
                for (const t of tombstonesIn(readFileSync(abs, "utf-8"))) {
                    hits.push(`${relative(REPO_ROOT, abs)}: «${t}»`)
                }
            }
        }
        expect(hits, hits.join("\n")).toEqual([])
    })

    it("probe: the matcher sees a tombstone through reflowed whitespace", () => {
        // The matcher normalises whitespace, so a line-wrapped re-addition
        // cannot slip past it. Both sides of the probe are asserted, so a
        // matcher that matches nothing cannot read as green.
        const wrapped = 'el: "Ένα κενό εδώ δεν είναι\n        μόνο δικό σας πρόβλημα."'
        expect(tombstonesIn(wrapped)).toEqual(["Ένα κενό εδώ δεν είναι μόνο δικό σας πρόβλημα"])
        expect(tombstonesIn('el: "Κανείς άλλος δεν εξαρτάται από την κάλυψή σας."')).toEqual([])
    })
})
