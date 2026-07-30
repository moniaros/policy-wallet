import { describe, it, expect } from 'vitest'
import { readFileSync } from "node:fs"
import { globSync } from "../helpers/glob"

const CONTENT = globSync('lib/insurance/content/*.ts')

// Second-person SINGULAR imperatives — the voice the branch guidance uses.
// Case-insensitive, and NO \b: JavaScript's word boundary is defined on ASCII
// word characters, so `\bΚράτα\b` can never match — a Greek letter is not a
// word character, so there is no boundary beside it. The first version of this
// guard carried \b on every alternation and was inert for exactly the content it
// was written to check. (Python's \b is Unicode-aware, which is why the analysis
// that found the defect worked and the guard that pinned it did not.)
const SINGULAR =
    /(Ασφάλισε|Κάλεσε|Φωτογράφισε|Κράτα|Κατάγραψε|Δήλωσε|Στείλε|Ζήτησε|Περίμενε|Πήγαινε|Ενημέρωσε|Ετοίμασε|Συγκέντρωσε|Σημείωσε|Αναγγείλε|Περιόρισε|Ειδοποίησε|Κατάθεσε|Επικοινώνησε|Συμπλήρωσε|Δες|Συζήτησε|άσε|μην ξεκινήσεις|μην υπογράψεις|μη συμφωνήσεις|μην αναγνωρίσεις)/i
// Second-person PLURAL / formal.
const PLURAL =
    /(Ασφαλίστε|Καλέστε|Φωτογραφίστε|Κρατήστε|Καταγράψτε|Δηλώστε|Στείλτε|Ζητήστε|Περιμένετε|Ενημερώστε|Ετοιμάστε|Συγκεντρώστε|Σημειώστε|Περιορίστε|Ειδοποιήστε|Επικοινωνήστε|Συμπληρώστε|Δείτε|Συζητήστε|αφήστε|μην ξεκινήσετε|μην υπογράψετε|μη συμφωνήσετε|Ανατρέξτε)/i

function stepsOf(src: string): string[][] {
    const lists: string[][] = []
    for (const m of src.matchAll(/claimsSteps:\s*\[([\s\S]*?)\n\s*\]/g)) {
        lists.push([...m[1].matchAll(/el:\s*'([^']*)'/g)].map((x) => x[1]))
    }
    return lists
}

/**
 * Greek distinguishes the singular «κάλεσε» from the formal plural «καλέστε».
 * The branch claims guidance is written in the singular throughout — a
 * deliberate voice, distinct from the app chrome, which is formal.
 *
 * A later pass rewrote motor's amicable-statement step with better content and
 * put it in the plural, so the most-read claims list in the product — motor is
 * the compulsory line, so nearly every user has one — switched register halfway
 * down, at the step someone reads standing at the roadside. Nothing catches
 * this: it is not a translation gap, not a hardcoded string, not a casing error.
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

    it('motor keeps every operative point it gained', () => {
        const motor = readFileSync('lib/insurance/content/motor.ts', 'utf-8')
        expect(motor).toMatch(/φιλική δήλωση μόνο αν συμφωνείτε/)
        expect(motor).toMatch(/μην υπογράψεις δήλωση υπαιτιότητας/)
        expect(motor).toMatch(/κατάγραψε μόνο τα γεγονότα/)
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
