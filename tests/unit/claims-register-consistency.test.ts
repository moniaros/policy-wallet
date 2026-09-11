import { describe, it, expect } from 'vitest'
import { readFileSync } from "node:fs"
import { globSync } from "../helpers/glob"

const CONTENT = globSync('lib/insurance/content/*.ts')

// Second-person SINGULAR imperatives.
//
// NO \b — JavaScript's word boundary is ASCII-only, so `\bΚράτα\b` can never
// match: a Greek letter is not a word character, so there is no boundary beside
// it. The guard's first version carried \b on every alternation and was inert
// for exactly the content it was written to check.
//
// But dropping \b made it match INSIDE words instead, which is its own defect:
// «άσε» fired on «βάσεις», «δες» on «πινακίδες», and «Αναγγείλε» on its own
// formal replacement «Αναγγείλετε». Greek-aware lookarounds give a real
// boundary — the letter class is the boundary JS will not provide.
const GK = "[Α-Ωα-ωΆ-ώάέήίόύώϊϋΐΰ]"
const word = (alternation: string) => new RegExp(`(?<!${GK})(?:${alternation})(?!${GK})`, "i")

const SINGULAR = word(
    "Ασφάλισε|Κάλεσε|Φωτογράφισε|Κράτα|Κατάγραψε|Δήλωσε|Στείλε|Ζήτησε|Περίμενε|Πήγαινε|" +
    "Ενημέρωσε|Ετοίμασε|Συγκέντρωσε|Σημείωσε|Αναγγείλε|Περιόρισε|Ειδοποίησε|Κατάθεσε|" +
    "Επικοινώνησε|Συμπλήρωσε|Δες|Συζήτησε|άσε|μην ξεκινήσεις|μην υπογράψεις|" +
    "μη συμφωνήσεις|μην αναγνωρίσεις|" +
    // The drifts the production smoke of «Καλύψεις & κενά» found on 2026-09-07 in
    // taglines, prose and action labels — leaves this guard never read.
    "Σιγουρέψου|Άνοιξε|ξαναδές|νομίζεις|αξιοποιείς|Μάθε|Κατάλαβε|Ξεκίνα|Ρώτα|Έλεγξε"
)

// «Ζήτησε» above is a HOMOGRAPH: second-person singular imperative AND
// third-person past ("the customer requested"). The pattern stays as it is and
// the CONTENT moves instead — advisor-facing copy that means "the customer
// requested" is written «ο πελάτης ζητά», which is unambiguous. Weakening the
// alternation to admit the past tense would blind the guard to the imperative,
// which is the form it exists to catch.

// Second-person PLURAL / formal.
const PLURAL = word(
    "Ασφαλίστε|Καλέστε|Φωτογραφίστε|Κρατήστε|Καταγράψτε|Δηλώστε|Στείλτε|Ζητήστε|Περιμένετε|" +
    "Ενημερώστε|Ετοιμάστε|Συγκεντρώστε|Σημειώστε|Περιορίστε|Ειδοποιήστε|Επικοινωνήστε|" +
    "Συμπληρώστε|Δείτε|Συζητήστε|αφήστε|Αναγγείλετε|Καταθέστε|μην ξεκινήσετε|" +
    "μην υπογράψετε|μη συμφωνήσετε|μην αναγνωρίσετε|Ανατρέξτε"
)


/** Every Greek leaf in a content module — taglines, headlines, prose, action labels, steps. */
export function greekLeavesOf(src: string): string[] {
    return [...src.matchAll(/el:\s*'([^']*)'/g)].map((x) => x[1])
}
export function singularLeaves(src: string): string[] {
    return greekLeavesOf(src).filter((leaf) => SINGULAR.test(leaf))
}
function stepsOf(src: string): string[][] {
    const lists: string[][] = []
    for (const m of src.matchAll(/claimsSteps:\s*\[([\s\S]*?)\n\s*\]/g)) {
        lists.push([...m[1].matchAll(/el:\s*'([^']*)'/g)].map((x) => x[1]))
    }
    return lists
}

/**
 * Greek distinguishes the singular «κάλεσε» from the formal plural «καλέστε».
 *
 * THE VOICE CHANGED, DELIBERATELY, ON 2026-08-23. This guard was written when
 * the branch claims guidance used the SINGULAR throughout — a voice chosen to
 * be distinct from the app chrome, which is formal. That choice was reversed by
 * an owner decision: the policy page renders the app's own copy and these steps
 * inside ONE card, so the distinction read as inconsistency rather than as
 * voice, and 33 of 35 files in this directory were converted to formal «εσείς»
 * (docs/STATUS.md, "Waiting on humans" #2).
 *
 * The original defect this guard caught remains worth catching: a later pass
 * rewrote motor's amicable-statement step with better content in the OTHER
 * register, so the most-read claims list in the product — motor is compulsory,
 * so nearly every user has one — switched register halfway down, at the step
 * someone reads standing at the roadside.
 *
 * So the rule is now stronger than "be consistent": every step must be FORMAL.
 * Consistency alone would let a future rewrite drag a whole list back to the
 * singular and still pass.
 */
describe('claim guidance keeps one voice within a list', () => {
    it('has lists to check', () => {
        const total = CONTENT.flatMap((f) => stepsOf(readFileSync(f, 'utf-8'))).length
        expect(total).toBeGreaterThanOrEqual(19)
    })

    it('never switches between singular and plural inside one list', () => {
        const offenders: string[] = []
        for (const file of CONTENT) {
            for (const steps of stepsOf(readFileSync(file, 'utf-8'))) {
                const sing = steps.filter((s) => SINGULAR.test(s)).length
                const plur = steps.filter((s) => PLURAL.test(s)).length
                if (sing > 0 && plur > 0) {
                    offenders.push(`${file.split('/').pop()} (${sing} singular, ${plur} plural)`)
                }
            }
        }
        expect(offenders, `register switches mid-list:\n${offenders.join('\n')}`).toEqual([])
    })

    it('uses the FORMAL voice — consistency alone would let a whole list regress', () => {
        const offenders: string[] = []
        for (const file of CONTENT) {
            for (const steps of stepsOf(readFileSync(file, 'utf-8'))) {
                for (const step of steps) {
                    const hit = step.match(SINGULAR)
                    if (hit) offenders.push(`${file.split('/').pop()}: «${hit[0]}» in "${step.slice(0, 60)}…"`)
                }
            }
        }
        expect(offenders, `singular (informal) claim step(s):\n${offenders.join('\n')}`).toEqual([])
    })

    it('every Greek leaf in the branch content speaks the formal voice — taglines and action labels render as product copy', () => {
        // life.ts opened its tagline with «Σιγουρέψου» and closed the same sentence with
        // «θέλετε»; self-tasks labelled four actions «Άνοιξε το ασφαλιστήριο». The claims
        // lists were guarded; the leaves around them were not (2026-09-07).
        const offenders: string[] = []
        for (const file of CONTENT) {
            for (const leaf of singularLeaves(readFileSync(file, 'utf-8'))) {
                offenders.push(`${file.split('/').pop()}: «${leaf.match(SINGULAR)![0]}» in "${leaf.slice(0, 60)}…"`)
            }
        }
        expect(offenders, `singular (informal) leaf(s) in the branch content:\n${offenders.join('\n')}`).toEqual([])
    })

    it('is proven red on the probe (a singular tagline and a singular action label)', () => {
        const probe = readFileSync('tests/fixtures/guard-probes/content-register-singular.ts.txt', 'utf-8')
        expect(singularLeaves(probe).length).toBe(2)
    })

    it('motor keeps every operative point it gained', () => {
        const motor = readFileSync('lib/insurance/content/motor.ts', 'utf-8')
        expect(motor).toMatch(/φιλική δήλωση μόνο αν συμφωνείτε/)
        expect(motor).toMatch(/μην υπογράψετε δήλωση υπαιτιότητας/)
        expect(motor).toMatch(/καταγράψτε μόνο τα γεγονότα/)
        expect(motor).toMatch(/do not sign an admission of fault/)
    })

    it('group life may address a bereaved family formally — that is its own list', () => {
        // Not a violation: the whole list is plural, deliberately. The rule is
        // consistency WITHIN a list, not one voice across the product.
        const steps = stepsOf(readFileSync('lib/insurance/content/group-life.ts', 'utf-8')).flat()
        expect(steps.some((s) => PLURAL.test(s))).toBe(true)
        expect(steps.some((s) => SINGULAR.test(s))).toBe(false)
    })
})
