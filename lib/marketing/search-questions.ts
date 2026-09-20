import type { MarketingLocale } from "@/lib/marketing/positioning"

type Copy = Record<MarketingLocale, string>

/** Editorial priorities, not a popularity claim. Evidence and limitations:
 * docs/audits/analytics-content-2026-09-20.md. Keep both languages equivalent. */
export const searchQuestions: { id: string; question: Copy; answer: Copy; link: Copy; href: string }[] = [
    {
        id: "insured-value",
        question: { el: "Τι είναι το ασφαλιζόμενο κεφάλαιο;", en: "What is the sum insured?" },
        answer: {
            el: "Είναι το ποσό μέχρι το οποίο μπορεί να πληρώσει η ασφαλιστική για μια κάλυψη. Δεν είναι το κόστος της ασφάλισής σας. Η τελική πληρωμή εξαρτάται και από τους όρους: τι μένει έξω και ποιο μέρος της ζημιάς πληρώνετε εσείς.",
            en: "It is the amount up to which the insurer may pay for a cover. It is not the price of your insurance. The final payout also depends on the terms: what is excluded and which part of the loss you pay yourself.",
        },
        link: { el: "Κεφάλαιο, όρια και αποζημίωση", en: "Sum insured, limits and claims" },
        href: "/lexiko/asfalismeno-kefalaio",
    },
    {
        id: "home-enfia",
        question: { el: "Ασφάλεια σπιτιού και ΕΝΦΙΑ: τι ελέγχω;", en: "Home insurance and ENFIA: what do I check?" },
        answer: {
            el: "Η ύπαρξη ασφαλιστηρίου κατοικίας δεν αρκεί από μόνη της. Ελέγξτε τις καλύψεις σεισμού, πυρκαγιάς και πλημμύρας, το ασφαλισμένο κεφάλαιο και τη διάρκεια. Η μείωση εξαρτάται από τις προϋποθέσεις και τη διαδικασία της ΑΑΔΕ για το αντίστοιχο έτος.",
            en: "Having a home policy alone is not enough. Check earthquake, fire and flood cover, the sum insured and the insured period. The reduction depends on AADE’s conditions and application process for the relevant year.",
        },
        link: { el: "Οδηγός για την έκπτωση ΕΝΦΙΑ", en: "Guide to the ENFIA reduction" },
        href: "/guides/ekptosi-enfia-asfalisi-katoikias",
    },
    {
        id: "belongings",
        question: { el: "Ασφάλιση καρτών και προσωπικών αντικειμένων: τι καλύπτει;", en: "Card and personal belongings insurance: what is covered?" },
        answer: {
            el: "Το όνομα ενός τραπεζικού πακέτου δεν λέει τι καλύπτει. Διαβάστε τους όρους: ποια αντικείμενα περιλαμβάνει; Καλύπτει κλοπή ή και απώλεια; Μέχρι πόσο πληρώνει για κάθε αντικείμενο; Ποια έγγραφα θα ζητήσει; Αν κάτι δεν είναι σαφές, ρωτήστε τον ασφαλιστή σας.",
            en: "A bank package’s name does not establish its cover. In that programme’s terms, look for the listed belongings, whether theft or loss is covered, the limit per item and the documents needed for a claim. Ask your insurance advisor to clarify anything unclear.",
        },
        link: { el: "Πώς διαβάζονται οι εξαιρέσεις", en: "How to read exclusions" },
        href: "/lexiko/exairesi",
    },
    {
        id: "renewal",
        question: { el: "Τι ελέγχω πριν από την ανανέωση ασφαλιστηρίου;", en: "What should I check before policy renewal?" },
        answer: {
            el: "Βάλτε δίπλα το παλιό ασφαλιστήριο και τους νέους όρους: ημερομηνίες, ασφάλιστρο, καλύψεις, απαλλαγές και εξαιρέσεις. Η υπενθύμιση λήξης σάς βοηθά να οργανωθείτε· δεν αποτελεί ανανέωση ούτε επιβεβαίωση ότι η κάλυψη συνεχίζεται.",
            en: "Compare the old policy with the new terms: dates, premium, cover, deductibles and exclusions. An expiry reminder helps you organise the review; it does not renew the policy or confirm that cover continues.",
        },
        link: { el: "Λίστα ελέγχου ανανέωσης", en: "Policy renewal checklist" },
        href: "/guides/checklist-ananeosis-asfalistiriou",
    },
    {
        id: "one-place",
        question: { el: "Πού μπορώ να οργανώσω όλα τα ασφαλιστήριά μου;", en: "Where can I manage all my insurance policies in one place?" },
        answer: {
            el: "Στο PolicyWallet συγκεντρώνετε τα ασφαλιστήριά σας από διαφορετικές εταιρείες. Ξεκινάτε από τα δικά σας έγγραφα: δεν χρειάζεται να αλλάξετε ασφαλιστική. Τα όρια αποθήκευσης, οι υπενθυμίσεις και οι δυνατότητες ανάλυσης εξαρτώνται από το πλάνο.",
            en: "PolicyWallet brings together your policies from different insurers. You start with your own documents, without switching insurer. Storage limits, reminders and analysis features depend on your plan.",
        },
        link: { el: "Οργάνωση ασφαλιστηρίων σε ένα σημείο", en: "Organising policies in one place" },
        href: "/guides/diaxeirisi-asfalistirion-se-ena-simeio",
    },
]

export const searchQuestionsHeading: Copy = {
    el: "Τι θέλετε να καταλάβετε για την ασφάλισή σας;",
    en: "What do you want to understand about your insurance?",
}
