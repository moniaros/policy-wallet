import { describe, expect, it } from "vitest"

import { el } from "@/lib/i18n/translations/el"
import { en } from "@/lib/i18n/translations/en"
import { ALIGNMENTS } from "@/lib/protection/attention-areas"
import { EVIDENCE_LEVELS } from "@/lib/protection/evidence"

/**
 * The attention and assessment copy — docs/planning/PERSONAL_RISK_PROFILE.md
 * §C (the alignment vocabulary and the triplet) and §E (the questions).
 *
 * Register: this copy renders on /protection, so Greek is the formal plural
 * («εσάς», «μας είπατε»), never the onboarding's singular. The word for a
 * policy is «ασφαλιστήριο». And the verdict words stay soft: nothing here says
 * «κενό» or «ανασφάλιστ…» — the only place a gap is named is the rule's own
 * title, which is data, not dictionary.
 */

type Tree = Record<string, unknown>

function leaves(node: unknown, path: string, out: Array<[string, string]>): void {
    if (typeof node === "string") {
        out.push([path, node])
        return
    }
    if (node && typeof node === "object" && !Array.isArray(node)) {
        for (const [k, v] of Object.entries(node as Tree)) leaves(v, path ? `${path}.${k}` : k, out)
        return
    }
    throw new Error(`unexpected leaf at ${path}`)
}

const subtree = (dict: typeof el | typeof en) => ({
    attention: (dict.protection as Tree).attention,
    assessment: (dict.protection as Tree).assessment,
})

const EL = subtree(el)
const EN = subtree(en)
const elLeaves: Array<[string, string]> = []
const enLeaves: Array<[string, string]> = []
leaves(EL, "protection", elLeaves)
leaves(EN, "protection", enLeaves)

// Same shape as tests/unit/greek-missing-accents.test.ts.
const GREEK_WORD = /[ΆΈ-ΊΌΎ-ΡΣ-ώ]+/g
const ACCENTED = /[άέήίόύώΐΰϊϋΆΈΉΊΌΎΏ]/
const isAllUpper = (w: string) => /^[Α-ΩΆΈ-ΊΌΎ-Ώ]+$/.test(w)
const EXEMPT = new Set(["ποιος", "ποια", "ποιο", "ποιοι", "ποιες", "ποιον", "ποιων", "στους"])

describe("protection.attention / protection.assessment — both dictionaries carry every key", () => {
    it("the key sets are identical", () => {
        expect(elLeaves.length).toBeGreaterThan(100)
        expect(elLeaves.map(([k]) => k)).toEqual(enLeaves.map(([k]) => k))
    })

    it("no leaf is empty in either language", () => {
        for (const [k, v] of [...elLeaves, ...enLeaves]) expect(v.trim().length, k).toBeGreaterThan(0)
    })

    it("carries the alignment vocabulary exactly, the triplet headings, the next steps, the caveats and the confidence scale", () => {
        const attention = EL.attention as Tree
        expect(Object.keys(attention.alignment as Tree)).toEqual([...ALIGNMENTS])
        expect(Object.keys(attention.headings as Tree)).toEqual(["why", "unknown", "next", "dormant"])
        expect(Object.keys(attention.next as Tree)).toEqual([
            "answer_questions",
            "answer_question_one",
            "check_first_policy",
            "review_finding",
            "nothing_now",
        ])
        expect(Object.keys(attention.caveats as Tree)).toEqual([
            "limits_unread",
            "no_policy_seen",
            "absence_not_evidence",
            "limits_read",
            "unknown_list",
            "expiring_soon",
            "lapsed_only",
        ])
        expect(Object.keys(attention.confidence as Tree)).toEqual([...EVIDENCE_LEVELS])
        expect((attention.next as Tree).answer_questions).toContain("{count}")
        expect((attention.caveats as Tree).unknown_list).toContain("{list}")
    })

    it("says the contract's words", () => {
        const a = EL.attention as Tree
        expect((a.alignment as Tree).unknown).toBe("Δεν το ξεκαθαρίσαμε ακόμη")
        expect((a.alignment as Tree).not_yet_checked).toBe("Δεν έχουμε δει ακόμη ασφαλιστήριο για αυτό")
        expect((a.alignment as Tree).appears_covered).toBe("Φαίνεται να καλύπτεται")
        expect((a.alignment as Tree).review).toBe("Αξίζει να το εξετάσουμε")
        expect((a.headings as Tree).why).toBe("Γιατί το βλέπετε")
        expect((a.headings as Tree).unknown).toBe("Τι δεν ξέρουμε ακόμη")
        expect((a.headings as Tree).next).toBe("Τι γίνεται μετά")
        expect((a.caveats as Tree).absence_not_evidence).toBe("Το ότι δεν έχουμε δει ασφαλιστήριο δεν σημαίνει ότι δεν υπάρχει.")
        expect(a.confidence).toEqual({
            unknown: "Δεν έχουμε αρκετά στοιχεία",
            inferred: "Το συμπεράναμε από όσα μας είπατε",
            third_party_reported: "Βασίζεται σε όσα μας είπε ο σύμβουλός σας",
            user_reported: "Βασίζεται σε όσα μας είπατε",
            policy_verified: "Επιβεβαιώνεται από ασφαλιστήριό σας",
            externally_verified: "Επιβεβαιώνεται από εξωτερική πηγή",
        })
    })

    it("the lapsed caveat says we HAD seen a policy and do not know whether it was renewed — never «δεν έχετε»", () => {
        const caveats = (EL.attention as Tree).caveats as Tree
        expect(caveats.lapsed_only).toMatch(/είχαμε δει/)
        expect(caveats.lapsed_only).toMatch(/έχει λήξει/)
        expect(caveats.lapsed_only).not.toMatch(/δεν έχετε/)
        expect(caveats.expiring_soon).toBe("λήγει σύντομα")
    })

    it("the limits fact states the tier as a fact, not a pitch", () => {
        const detail = (EL.attention as Tree).detail as Tree
        expect(detail.upgradeHint).toBe("Τα όρια αυτού του ασφαλιστηρίου δεν έχουν διαβαστεί — η ανάγνωση ορίων είναι μέρος της πλήρους ανάλυσης.")
        expect(detail.fromOtherArea).toContain("{area}")
    })
})

describe("a question's «why» explains the decision the answer informs — never a product argument (B10)", () => {
    const factors = (EL.assessment as Tree).factors as Record<string, Tree>
    const enFactors = (EN.assessment as Tree).factors as Record<string, Tree>

    it("age: what we work out from it, not what it costs", () => {
        expect(factors.age.why).not.toMatch(/κόστος|διαθεσιμότητα/)
        expect(factors.age.why).toMatch(/υπολογίζουμε/)
        expect(enFactors.age.why).not.toMatch(/cost|availability/i)
    })

    it("valuables: whether the items fit the home policy's limits, not that limits «often fall short»", () => {
        expect(factors.valuables.why).not.toMatch(/συχνά δεν φτάνουν/)
        expect(factors.valuables.why).toMatch(/ελέγχουμε/)
        expect(factors.valuables.why).toMatch(/ασφαλιστηρίου/)
        expect(enFactors.valuables.why).not.toMatch(/often fall short/i)
    })

    it("retirement: what we look at, not that the state pension «replaces only part»", () => {
        expect(factors.retirementPlanning.why).not.toMatch(/μέρος μόνο/)
        expect(factors.retirementPlanning.why).toMatch(/ξέρουμε αν/)
        expect(enFactors.retirementPlanning.why).not.toMatch(/only part/i)
    })

    it("the pre-filled label asks for confirmation or correction", () => {
        const ui = (EL.assessment as Tree).ui as Tree
        expect(ui.prefilled).toBe("Προσυμπληρωμένο — επιβεβαιώστε ή διορθώστε.")
    })
})

describe("the Greek copy", () => {
    it("has no unaccented multi-syllable word (missing-tonos typos)", () => {
        const offenders = new Set<string>()
        for (const [, v] of elLeaves) {
            for (const w of v.match(GREEK_WORD) ?? []) {
                if (w.length < 5 || isAllUpper(w) || ACCENTED.test(w) || EXEMPT.has(w.toLowerCase())) continue
                offenders.add(w)
            }
        }
        expect([...offenders]).toEqual([])
    })

    it("calls a policy «ασφαλιστήριο», never «συμβόλαιο»", () => {
        for (const [k, v] of elLeaves) expect(v, k).not.toMatch(/συμβόλαι|συμβολαί/i)
    })

    it("never says «κενό» or «ανασφάλιστ…» — the gap row renders the rule's own title", () => {
        for (const [k, v] of elLeaves) expect(v, k).not.toMatch(/κεν[όά]\b|κενού|κενών|ανασφάλιστ|ακάλυπτ/i)
        for (const [k, v] of enLeaves) expect(v, k).not.toMatch(/\buninsured\b|\bunprotected\b|\buncovered\b|coverage gap/i)
    })

    it("speaks to «εσάς» — the formal plural, never the onboarding's singular", () => {
        for (const [k, v] of elLeaves) {
            expect(v, k).not.toMatch(/\b(σου|σένα|είπες|ανέφερες|ξεχώρισες|μένεις|έχεις|οδηγείς|νοικιάζεις|είσαι)\b/i)
        }
        const a = EL.attention as Tree
        expect((a.reasons as Tree).stated_primary).toMatch(/αναφέρατε/)
        expect((a.reasons as Tree).vehicle).toMatch(/οδηγείτε/)
    })
})
