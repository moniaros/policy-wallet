import type { Bilingual } from "@/lib/marketing/positioning"

/**
 * The four terms the homepage answer block defines — and, later, the seed of
 * the /lexiko DefinedTermSet (G10/G11): the JSON-LD is generated from THIS
 * module, never from a parallel list, so the visible definition and the
 * structured one cannot drift.
 *
 * Four on purpose: they are the four words a policyholder meets in the first
 * ten minutes with any Greek policy, and the four the product's extraction
 * actually surfaces. Definitions describe what the WORD means on a policy
 * document — they do not advise, recommend or evaluate (§2: understanding,
 * not regulated advice).
 */
export type DefinedTerm = {
    id: string
    term: Bilingual
    definition: Bilingual
}

export const DEFINED_TERMS: readonly DefinedTerm[] = [
    {
        id: "kalypsi",
        term: { el: "κάλυψη", en: "coverage" },
        definition: {
            el: "Ο κίνδυνος που το συμβόλαιο αναλαμβάνει να πληρώσει — με τα όρια και τις προϋποθέσεις που γράφει, όχι με όσα υποθέτετε.",
            en: "The risk the policy undertakes to pay for — with the limits and conditions it states, not the ones you assume.",
        },
    },
    {
        id: "exairesi",
        term: { el: "εξαίρεση", en: "exclusion" },
        definition: {
            el: "Ό,τι το συμβόλαιο ρητά δεν πληρώνει. Συνήθως βρίσκεται στα ψιλά γράμματα — και είναι ο λόγος που δύο «ίδιες» καλύψεις διαφέρουν.",
            en: "What the policy explicitly does not pay. Usually in the small print — and the reason two 'identical' covers differ.",
        },
    },
    {
        id: "apallagi",
        term: { el: "απαλλαγή", en: "deductible" },
        definition: {
            el: "Το ποσό της ζημιάς που πληρώνετε εσείς πριν πληρώσει η εταιρεία. Μικρότερο ασφάλιστρο σημαίνει συχνά μεγαλύτερη απαλλαγή.",
            en: "The part of a loss you pay before the insurer pays. A lower premium often means a higher deductible.",
        },
    },
    {
        id: "periodos-anamonis",
        term: { el: "περίοδος αναμονής", en: "waiting period" },
        definition: {
            el: "Το διάστημα μετά την έναρξη στο οποίο μια κάλυψη δεν ισχύει ακόμη. Στην υγεία μπορεί να φτάνει μήνες ή και χρόνια για συγκεκριμένες παθήσεις.",
            en: "The time after inception during which a cover does not yet apply. In health it can run to months, or years for specific conditions.",
        },
    },
]

/**
 * The answer block's paragraph — the page's one definitive, extractable
 * statement of what PolicyWallet is (§7 answer-engine hygiene: a sentence an
 * answer engine can quote whole).
 */
export const ANSWER_PARAGRAPH: Bilingual = {
    el: "Το PolicyWallet διαβάζει τα ασφαλιστήριά σας — από όποια εταιρεία κι αν είναι — και σας δείχνει σε απλά ελληνικά τι καλύπτει το καθένα, τι εξαιρεί, με ποια απαλλαγή και ποιες περιόδους αναμονής. Δεν πουλά ασφάλειες και δεν σας προτείνει προϊόντα· σας δίνει τις ερωτήσεις να κάνετε στον ασφαλιστή σας.",
    en: "PolicyWallet reads your insurance policies — from any company — and shows you in plain language what each one covers, what it excludes, with what deductible and which waiting periods. It does not sell insurance and does not recommend products; it gives you the questions to ask your insurer.",
}
