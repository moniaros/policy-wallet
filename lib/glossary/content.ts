/**
 * Insurance glossary (ασφαλιστικό λεξικό) — short, bilingual, answer-first
 * definitions targeting Greek comprehension queries ("τι είναι …", "τι σημαίνει
 * …"). This is the AEO/GEO surface: each term is a snippet-shaped definition an
 * answer engine can lift verbatim, marked up as schema.org DefinedTerm.
 *
 * Editorial rules (mirror lib/guides/content.ts):
 * - `shortDefinition` is a 40–60 word direct answer — the extractable block.
 * - `howToCheck` teaches the reader to find the term IN THEIR OWN policy. It
 *   never asserts that a given policy covers something (the D7 honesty law):
 *   we explain the concept, not the contents of a document we have not read.
 * - Volatile legal/tax specifics point to the concept, not a hardcoded figure.
 */

export type LocalizedString = { el: string; en: string }

export type GlossaryFaqItem = {
    question: LocalizedString
    answer: LocalizedString
}

export type GlossaryTerm = {
    slug: string
    /** The headword, e.g. { el: "Απαλλαγή", en: "Deductible" }. */
    term: LocalizedString
    /** Synonyms / alternative spellings shown on the page and searched for. */
    aliases?: LocalizedString[]
    /** Metadata title per locale, sized for the "%s | PolicyWallet" template. */
    metaTitle: LocalizedString
    /** Meta description per locale (140–160 chars). */
    metaDescription: LocalizedString
    /** Direct-answer definition (snippet-shaped, 40–60 words) — the AEO block. */
    shortDefinition: LocalizedString
    /** Deeper explanation paragraphs. */
    body: LocalizedString[]
    /** "How to find this in YOUR policy" — honesty-safe, actionable. */
    howToCheck: LocalizedString
    faq: GlossaryFaqItem[]
    /** Cross-links: related terms + the matching /product or /guides page. */
    related?: { label: LocalizedString; href: string }[]
    dateModified: string
}

export const glossaryTerms: GlossaryTerm[] = [
    {
        slug: "asfalistirio",
        term: { el: "Ασφαλιστήριο", en: "Insurance policy (asfalistirio)" },
        aliases: [{ el: "Ασφαλιστήριο συμβόλαιο", en: "Policy document" }],
        metaTitle: {
            el: "Τι είναι το ασφαλιστήριο συμβόλαιο;",
            en: "What is an insurance policy (asfalistirio)?",
        },
        metaDescription: {
            el: "Ασφαλιστήριο είναι το έγγραφο που αποδεικνύει την ασφαλιστική σύμβαση: καλύψεις, εξαιρέσεις, όρια και ημερομηνίες. Δείτε τι περιλαμβάνει και πώς να το διαβάσετε.",
            en: "An asfalistirio is the document that proves your insurance contract: coverages, exclusions, limits and dates. See what it contains and how to read it.",
        },
        shortDefinition: {
            el: "Το ασφαλιστήριο (ή ασφαλιστήριο συμβόλαιο) είναι το έγγραφο που αποδεικνύει την ασφαλιστική σας σύμβαση. Το εκδίδει η ασφαλιστική εταιρεία και περιγράφει ποιους κινδύνους καλύπτει, με ποια όρια και απαλλαγές, τι εξαιρεί, καθώς και τη διάρκεια, το ασφάλιστρο και τα στοιχεία των συμβαλλομένων.",
            en: "An asfalistirio (insurance policy) is the document that proves your insurance contract. The insurer issues it and it sets out which risks are covered, with what limits and deductibles, what is excluded, plus the duration, the premium and the details of the parties.",
        },
        body: [
            {
                el: "Το ασφαλιστήριο δεν είναι διαφημιστικό φυλλάδιο· είναι το κείμενο που μετράει την ώρα της αποζημίωσης. Οι πιο σημαντικές πληροφορίες σπάνια βρίσκονται στην πρώτη σελίδα: οι εξαιρέσεις, οι απαλλαγές και οι προθεσμίες δήλωσης ζημιάς κρύβονται συνήθως στους γενικούς και ειδικούς όρους.",
                en: "A policy is not a brochure; it is the text that counts when you make a claim. The most important information is rarely on the first page: exclusions, deductibles and claim deadlines usually sit in the general and special terms.",
            },
            {
                el: "Ένα τυπικό ασφαλιστήριο έχει τον πίνακα καλύψεων (τι καλύπτεται και μέχρι ποιο ποσό), τους όρους (πώς και πότε ισχύει η κάλυψη) και τα στοιχεία του συμβολαίου (αριθμός, διάρκεια, ασφάλιστρο). Το να τα διαβάσετε μία φορά με την ησυχία σας κοστίζει λιγότερο από το να τα ανακαλύψετε μετά από ζημιά.",
                en: "A typical policy has the schedule of cover (what is covered and up to what amount), the terms (how and when cover applies) and the contract details (number, duration, premium). Reading them once, calmly, costs less than discovering them after a loss.",
            },
        ],
        howToCheck: {
            el: "Στο δικό σας ασφαλιστήριο, ξεκινήστε από τον πίνακα καλύψεων και μετά διαβάστε τις εξαιρέσεις — εκεί φαίνεται τι ΔΕΝ πληρώνεται. Ανεβάστε το PDF στο PolicyWallet και δείτε καλύψεις, εξαιρέσεις, όρια και ημερομηνίες σε απλά ελληνικά, χωρίς να ψάχνετε στα ψιλά γράμματα.",
            en: "In your own policy, start from the schedule of cover and then read the exclusions — that is where what is NOT paid appears. Upload the PDF to PolicyWallet to see coverages, exclusions, limits and dates in plain language, without hunting through the fine print.",
        },
        faq: [
            {
                question: {
                    el: "Ποια είναι η διαφορά ασφαλιστηρίου και ασφάλισης;",
                    en: "What is the difference between the policy and the insurance?",
                },
                answer: {
                    el: "Η ασφάλιση είναι η συμφωνία· το ασφαλιστήριο είναι το έγγραφο που την αποδεικνύει και περιγράφει τους όρους της.",
                    en: "The insurance is the agreement; the asfalistirio is the document that proves it and sets out its terms.",
                },
            },
            {
                question: {
                    el: "Ισχύει το ψηφιακό ασφαλιστήριο το ίδιο με το έντυπο;",
                    en: "Is a digital policy as valid as a printed one?",
                },
                answer: {
                    el: "Ναι. Το ηλεκτρονικά εκδοθέν ασφαλιστήριο έχει την ίδια ισχύ με το έντυπο, εφόσον το εκδίδει η ασφαλιστική εταιρεία.",
                    en: "Yes. An electronically issued policy has the same force as a printed one, as long as the insurer issues it.",
                },
            },
        ],
        related: [
            { label: { el: "Απαλλαγή", en: "Deductible" }, href: "/lexiko/apallagi" },
            { label: { el: "Εξαίρεση", en: "Exclusion" }, href: "/lexiko/exairesi" },
            {
                label: { el: "Διαχείριση ασφαλιστηρίων online", en: "Managing policies online" },
                href: "/guides/diaxeirisi-asfalistirion-se-ena-simeio",
            },
            { label: { el: "Ανάλυση ασφαλιστηρίου με AI", en: "AI policy analysis" }, href: "/product" },
        ],
        dateModified: "2026-07-21",
    },
    {
        slug: "apallagi",
        term: { el: "Απαλλαγή", en: "Deductible (apallagi)" },
        aliases: [{ el: "Ίδια κράτηση", en: "Excess" }],
        metaTitle: {
            el: "Τι σημαίνει απαλλαγή στην ασφάλεια;",
            en: "What is a deductible (apallagi)?",
        },
        metaDescription: {
            el: "Απαλλαγή είναι το ποσό που πληρώνετε εσείς σε κάθε ζημιά πριν αρχίσει να καταβάλλει η ασφαλιστική. Δείτε πώς επηρεάζει το ασφάλιστρο και την αποζημίωσή σας.",
            en: "A deductible is the amount you pay on each claim before the insurer starts paying. See how it affects your premium and your payout.",
        },
        shortDefinition: {
            el: "Απαλλαγή (ή ίδια κράτηση) είναι το ποσό που επιβαρύνεστε εσείς σε κάθε ζημιά, πριν αρχίσει να πληρώνει η ασφαλιστική εταιρεία. Αν η απαλλαγή είναι 300 € και η ζημιά 1.000 €, λαμβάνετε 700 €. Όσο μεγαλύτερη η απαλλαγή, τόσο χαμηλότερο συνήθως το ασφάλιστρο — και το αντίστροφο.",
            en: "A deductible (apallagi) is the amount you bear on each claim before the insurer starts paying. If the deductible is €300 and the loss is €1,000, you receive €700. The higher the deductible, the lower the premium usually is — and vice versa.",
        },
        body: [
            {
                el: "Η απαλλαγή είναι ο πιο συνηθισμένος λόγος που δύο συμβόλαια με «ίδια κάλυψη» κοστίζουν διαφορετικά. Μεταφέρει μέρος του μικρού ρίσκου σε εσάς, ώστε η ασφαλιστική να χρεώνει χαμηλότερο ασφάλιστρο. Είναι λογική επιλογή αν μπορείτε να απορροφήσετε μια μικρή ζημιά μόνοι σας.",
                en: "The deductible is the most common reason two policies with the “same cover” cost differently. It shifts part of the small risk onto you, so the insurer charges a lower premium. It is a sensible choice if you can absorb a small loss yourself.",
            },
            {
                el: "Πολλά συμβόλαια έχουν διαφορετική απαλλαγή ανά κάλυψη — άλλη για θραύση κρυστάλλων, άλλη για φυσικά φαινόμενα. Το «έχω μικτή» δεν σας λέει πόσα θα πληρώσετε· η απαλλαγή σας το λέει.",
                en: "Many policies have a different deductible per cover — one for glass breakage, another for natural events. “I have comprehensive” does not tell you how much you will pay; the deductible does.",
            },
        ],
        howToCheck: {
            el: "Στο δικό σας ασφαλιστήριο, η απαλλαγή αναγράφεται συνήθως δίπλα σε κάθε κάλυψη στον πίνακα, όχι σε ένα ενιαίο σημείο. Αναζητήστε τις λέξεις «απαλλαγή» ή «ίδια κράτηση». Το PolicyWallet εντοπίζει τις απαλλαγές ανά κάλυψη και σας δείχνει πού διαφέρουν.",
            en: "In your own policy the deductible usually appears next to each cover in the schedule, not in one single place. Look for the words “απαλλαγή” or “ίδια κράτηση”. PolicyWallet surfaces the deductibles per cover and shows you where they differ.",
        },
        faq: [
            {
                question: {
                    el: "Μεγάλη ή μικρή απαλλαγή συμφέρει;",
                    en: "Is a high or low deductible better?",
                },
                answer: {
                    el: "Μεγαλύτερη απαλλαγή σημαίνει χαμηλότερο ασφάλιστρο αλλά μεγαλύτερη δική σας επιβάρυνση σε ζημιά. Εξαρτάται από το πόσο μπορείτε να καλύψετε μόνοι σας.",
                    en: "A higher deductible means a lower premium but a bigger cost to you at claim time. It depends on how much you can cover yourself.",
                },
            },
            {
                question: {
                    el: "Ισχύει η απαλλαγή σε κάθε ζημιά;",
                    en: "Does the deductible apply to every claim?",
                },
                answer: {
                    el: "Συνήθως ναι, ανά περιστατικό. Ορισμένες καλύψεις μπορεί να μην έχουν απαλλαγή — αυτό φαίνεται στους όρους του συμβολαίου σας.",
                    en: "Usually yes, per incident. Some covers may carry no deductible — that appears in your policy terms.",
                },
            },
        ],
        related: [
            { label: { el: "Ασφάλιστρο", en: "Premium" }, href: "/lexiko/asfalistro" },
            { label: { el: "Ασφάλεια υγείας", en: "Health insurance" }, href: "/product/health" },
            {
                label: { el: "Πώς λειτουργεί η απαλλαγή στην υγεία", en: "How the health deductible works" },
                href: "/guides/apallagi-asfaleia-ygeias-pos-leitourgei",
            },
        ],
        dateModified: "2026-07-21",
    },
    {
        slug: "exairesi",
        term: { el: "Εξαίρεση", en: "Exclusion (exairesi)" },
        metaTitle: {
            el: "Τι σημαίνει εξαίρεση στην ασφάλιση;",
            en: "What is an insurance exclusion (exairesi)?",
        },
        metaDescription: {
            el: "Εξαίρεση είναι κάθε περίπτωση που το συμβόλαιο ρητά δεν καλύπτει. Είναι ο πιο συχνός λόγος απόρριψης αποζημίωσης — δείτε πού να τις βρείτε στο ασφαλιστήριό σας.",
            en: "An exclusion is any case the policy expressly does not cover. It is the most common reason a claim is denied — see where to find exclusions in your policy.",
        },
        shortDefinition: {
            el: "Εξαίρεση είναι κάθε περίπτωση, αιτία ή περιουσιακό στοιχείο που το ασφαλιστήριο ρητά δεν καλύπτει. Οι εξαιρέσεις ορίζουν τα όρια της κάλυψης εξίσου με τις ίδιες τις καλύψεις: μια ζημιά μπορεί να ανήκει σε καλυπτόμενο κίνδυνο και όμως να απορριφθεί επειδή εμπίπτει σε εξαίρεση.",
            en: "An exclusion is any case, cause or asset that the policy expressly does not cover. Exclusions define the boundary of cover just as much as the covers themselves: a loss can fall under a covered risk and still be denied because it meets an exclusion.",
        },
        body: [
            {
                el: "Οι περισσότερες διαφωνίες σε αποζημιώσεις ξεκινούν από μια εξαίρεση που κανείς δεν είχε διαβάσει. Τυπικά παραδείγματα: ζημιές από πρόθεση ή βαριά αμέλεια, φθορά λόγω παλαιότητας, μη δηλωμένη χρήση, πόλεμος ή πανδημία. Δεν είναι «ψιλά γράμματα για να σας παγιδεύσουν»· είναι ο τρόπος που ορίζεται η τιμή του κινδύνου.",
                en: "Most claim disputes start from an exclusion nobody had read. Typical examples: intentional or grossly negligent damage, wear and tear, undeclared use, war or pandemic. They are not “fine print to trap you”; they are how the price of the risk is defined.",
            },
            {
                el: "Υπάρχουν γενικές εξαιρέσεις (ισχύουν σε όλο το συμβόλαιο) και ειδικές εξαιρέσεις (ανά κάλυψη). Το να ξέρετε τις εξαιρέσεις σας από πριν σημαίνει ότι κάνετε τις σωστές ερωτήσεις στον ασφαλιστή σας πριν συμβεί κάτι, όχι μετά.",
                en: "There are general exclusions (applying to the whole policy) and specific exclusions (per cover). Knowing your exclusions in advance means you ask your insurer the right questions before something happens, not after.",
            },
        ],
        howToCheck: {
            el: "Στο δικό σας ασφαλιστήριο, ψάξτε τις ενότητες «Εξαιρέσεις» στους γενικούς και στους ειδικούς όρους — είναι δύο διαφορετικά σημεία. Το PolicyWallet συγκεντρώνει τις εξαιρέσεις του εγγράφου σας σε μία λίστα, ώστε να μη χρειάζεται να τις κυνηγήσετε σελίδα-σελίδα.",
            en: "In your own policy, look for the “Exclusions” sections in both the general and the special terms — they are two different places. PolicyWallet gathers your document's exclusions into one list, so you do not have to chase them page by page.",
        },
        faq: [
            {
                question: {
                    el: "Μπορεί να απορριφθεί ζημιά ακόμη κι αν «είμαι ασφαλισμένος»;",
                    en: "Can a claim be denied even if I am “insured”?",
                },
                answer: {
                    el: "Ναι, αν η αιτία της ζημιάς εμπίπτει σε εξαίρεση. Γι' αυτό οι εξαιρέσεις μετράνε όσο και οι καλύψεις.",
                    en: "Yes, if the cause of the loss falls under an exclusion. That is why exclusions matter as much as the covers.",
                },
            },
            {
                question: {
                    el: "Είναι ίδιες οι εξαιρέσεις σε όλες τις εταιρείες;",
                    en: "Are exclusions the same across all insurers?",
                },
                answer: {
                    el: "Όχι. Διαφέρουν ανά εταιρεία και ανά προϊόν — γι' αυτό αξίζει να συγκρίνετε όρους, όχι μόνο τιμή.",
                    en: "No. They vary by insurer and by product — which is why it pays to compare terms, not just price.",
                },
            },
        ],
        related: [
            { label: { el: "Ασφαλιστήριο", en: "Insurance policy" }, href: "/lexiko/asfalistirio" },
            { label: { el: "Κενά κάλυψης", en: "Coverage gaps" }, href: "/guides/kena-kalypsis-ti-einai-pos-ta-vriskete" },
        ],
        dateModified: "2026-07-21",
    },
    {
        slug: "asfalismeno-kefalaio",
        term: { el: "Ασφαλισμένο κεφάλαιο", en: "Sum insured (asfalismeno kefalaio)" },
        aliases: [{ el: "Ασφαλιζόμενο ποσό", en: "Insured amount" }],
        metaTitle: {
            el: "Τι είναι το ασφαλισμένο κεφάλαιο;",
            en: "What is the sum insured?",
        },
        metaDescription: {
            el: "Ασφαλισμένο κεφάλαιο είναι το ανώτατο ποσό που μπορεί να πληρώσει η ασφαλιστική. Δείτε γιατί, αν είναι λάθος, οδηγεί σε υπασφάλιση και μειωμένη αποζημίωση.",
            en: "The sum insured is the maximum the insurer can pay. See why, if it is wrong, it leads to underinsurance and a reduced payout.",
        },
        shortDefinition: {
            el: "Ασφαλισμένο κεφάλαιο είναι το ανώτατο ποσό που μπορεί να καταβάλει η ασφαλιστική για μια κάλυψη. Στην κατοικία αντιστοιχεί στο κόστος ανακατασκευής, όχι στην εμπορική αξία· στη ζωή είναι το ποσό που λαμβάνουν οι δικαιούχοι. Αν οριστεί χαμηλότερα από την πραγματική αξία, η αποζημίωση μειώνεται αναλογικά.",
            en: "The sum insured is the maximum the insurer can pay for a cover. For a home it corresponds to the rebuild cost, not the market value; for life it is the amount the beneficiaries receive. If set below the real value, the payout is reduced proportionally.",
        },
        body: [
            {
                el: "Το ασφαλισμένο κεφάλαιο είναι το πιο παρεξηγημένο νούμερο στο συμβόλαιο. Στην κατοικία, πολλοί το μπερδεύουν με την εμπορική αξία ή την αντικειμενική — αλλά η ασφάλιση πληρώνει για να ξαναχτιστεί το σπίτι, όχι για να αγοραστεί το οικόπεδο. Το σωστό μέγεθος είναι το κόστος ανακατασκευής.",
                en: "The sum insured is the most misunderstood number in a policy. For a home, many confuse it with market or tax value — but insurance pays to rebuild the home, not to buy the land. The right figure is the rebuild cost.",
            },
            {
                el: "Ένα λάθος ασφαλισμένο κεφάλαιο κοστίζει με δύο τρόπους: αν είναι πολύ χαμηλό, υπασφαλίζεστε και η αποζημίωση κόβεται· αν είναι πολύ υψηλό, πληρώνετε ασφάλιστρο για κάλυψη που δεν θα λάβετε ποτέ.",
                en: "A wrong sum insured costs you two ways: if it is too low you are underinsured and the payout is cut; if it is too high you pay premium for cover you will never receive.",
            },
        ],
        howToCheck: {
            el: "Στο δικό σας ασφαλιστήριο, το ασφαλισμένο κεφάλαιο είναι το κύριο ποσό δίπλα σε κάθε κάλυψη. Συγκρίνετέ το με μια ρεαλιστική εκτίμηση: για την κατοικία, το κόστος ανακατασκευής ανά τετραγωνικό. Το PolicyWallet εντοπίζει το ασφαλισμένο κεφάλαιο και, αν το ασφαλιστήριο αναφέρει και κόστος ανακατασκευής, σας δείχνει αν το κεφάλαιο υπολείπεται — στο πλάνο Plus.",
            en: "In your own policy, the sum insured is the main amount next to each cover. Compare it to a realistic estimate: for a home, the rebuild cost per square meter. PolicyWallet surfaces the sum insured and, if the policy also states a rebuild cost, shows you when the sum falls short — on the Plus plan.",
        },
        faq: [
            {
                question: {
                    el: "Το ασφαλισμένο κεφάλαιο είναι η αξία του σπιτιού μου;",
                    en: "Is the sum insured my home's value?",
                },
                answer: {
                    el: "Όχι — είναι το κόστος να ξαναχτιστεί, όχι η εμπορική του αξία. Το οικόπεδο δεν καταστρέφεται, οπότε δεν ασφαλίζεται.",
                    en: "No — it is the cost to rebuild it, not its market value. Land is not destroyed, so it is not insured.",
                },
            },
            {
                question: {
                    el: "Τι γίνεται αν το κεφάλαιο είναι πολύ χαμηλό;",
                    en: "What if the sum insured is too low?",
                },
                answer: {
                    el: "Υπασφαλίζεστε: σε ζημιά, η αποζημίωση μειώνεται αναλογικά με το ποσοστό της υπασφάλισης.",
                    en: "You are underinsured: in a claim, the payout is reduced in proportion to the underinsurance.",
                },
            },
        ],
        related: [
            { label: { el: "Υπασφάλιση", en: "Underinsurance (ypasfalisi)" }, href: "/lexiko/ypasfalisi" },
            { label: { el: "Ασφάλεια κατοικίας", en: "Home insurance" }, href: "/product/property" },
        ],
        dateModified: "2026-07-21",
    },
    {
        slug: "asfalistro",
        term: { el: "Ασφάλιστρο", en: "Premium (asfalistro)" },
        metaTitle: {
            el: "Τι είναι το ασφάλιστρο;",
            en: "What is an insurance premium?",
        },
        metaDescription: {
            el: "Ασφάλιστρο είναι το ποσό που πληρώνετε στην ασφαλιστική για την κάλυψη. Δείτε τι το επηρεάζει και γιατί το φθηνότερο ασφάλιστρο δεν σημαίνει καλύτερη κάλυψη.",
            en: "A premium is the amount you pay the insurer for cover. See what affects it and why the cheapest premium does not mean the best cover.",
        },
        shortDefinition: {
            el: "Ασφάλιστρο είναι το ποσό που καταβάλλετε στην ασφαλιστική εταιρεία για να ισχύει η κάλυψη, ετησίως ή σε δόσεις. Διαμορφώνεται από τον ασφαλιζόμενο κίνδυνο, το ασφαλισμένο κεφάλαιο, τις απαλλαγές και τις καλύψεις που επιλέγετε. Δύο ασφάλιστρα με μεγάλη διαφορά συχνά κρύβουν διαφορετικές καλύψεις ή απαλλαγές.",
            en: "A premium is the amount you pay the insurer to keep cover in force, annually or in installments. It is shaped by the insured risk, the sum insured, the deductibles and the covers you choose. Two very different premiums often hide different covers or deductibles.",
        },
        body: [
            {
                el: "Το ασφάλιστρο είναι το πιο ορατό νούμερο και γι' αυτό το πιο παραπλανητικό. Το φθηνότερο ασφάλιστρο μπορεί να σημαίνει μεγαλύτερη απαλλαγή, χαμηλότερο ασφαλισμένο κεφάλαιο ή περισσότερες εξαιρέσεις. Η σύγκριση μόνο στην τιμή είναι σαν να συγκρίνετε δύο αυτοκίνητα μόνο στο βάρος τους.",
                en: "The premium is the most visible number and therefore the most misleading. The cheapest premium may mean a higher deductible, a lower sum insured or more exclusions. Comparing on price alone is like comparing two cars only by their weight.",
            },
        ],
        howToCheck: {
            el: "Στο δικό σας ασφαλιστήριο, δείτε το ασφάλιστρο μαζί με το ασφαλισμένο κεφάλαιο και τις απαλλαγές — τα τρία μαζί λένε την αλήθεια, όχι το ένα μόνο του. Πριν από κάθε ανανέωση, συγκρίνετε όρους και όρια, όχι μόνο το ποσό.",
            en: "In your own policy, read the premium together with the sum insured and the deductibles — the three together tell the truth, not one alone. Before each renewal, compare terms and limits, not just the amount.",
        },
        faq: [
            {
                question: {
                    el: "Γιατί αυξήθηκε το ασφάλιστρό μου στην ανανέωση;",
                    en: "Why did my premium rise at renewal?",
                },
                answer: {
                    el: "Συχνά λόγω πληθωρισμού κόστους, ιστορικού ζημιών ή αλλαγής καλύψεων. Ζητήστε ανάλυση της αλλαγής από την εταιρεία σας.",
                    en: "Often due to cost inflation, claims history or changed covers. Ask your insurer to break down the change.",
                },
            },
        ],
        related: [
            { label: { el: "Απαλλαγή", en: "Deductible" }, href: "/lexiko/apallagi" },
            {
                label: { el: "Πληρωμή ασφαλίστρων ψηφιακά", en: "Paying premiums digitally" },
                href: "/guides/pliromi-asfalistron-psifiaka",
            },
            { label: { el: "Τιμολόγηση PolicyWallet", en: "PolicyWallet pricing" }, href: "/pricing" },
        ],
        dateModified: "2026-07-21",
    },
    {
        slug: "ypasfalisi",
        term: { el: "Υπασφάλιση", en: "Underinsurance (ypasfalisi)" },
        metaTitle: {
            el: "Τι είναι η υπασφάλιση;",
            en: "What is underinsurance?",
        },
        metaDescription: {
            el: "Υπασφάλιση είναι όταν το ασφαλισμένο κεφάλαιο είναι χαμηλότερο από την πραγματική αξία. Σε ζημιά, η αποζημίωση μειώνεται αναλογικά — δείτε πώς να την αποφύγετε.",
            en: "Underinsurance is when the sum insured is lower than the real value. In a claim, the payout is cut proportionally — see how to avoid it.",
        },
        shortDefinition: {
            el: "Υπασφάλιση συμβαίνει όταν το ασφαλισμένο κεφάλαιο είναι χαμηλότερο από την πραγματική αξία του ασφαλισμένου αντικειμένου. Σε περίπτωση ζημιάς, εφαρμόζεται ο «αναλογικός κανόνας»: αν το κεφάλαιο καλύπτει το 70% της αξίας, λαμβάνετε το 70% κάθε ζημιάς — ακόμη και για μια μικρή, μερική ζημιά.",
            en: "Underinsurance occurs when the sum insured is lower than the real value of the insured item. In a claim, the “average rule” applies: if the sum insured covers 70% of the value, you receive 70% of every loss — even a small, partial one.",
        },
        body: [
            {
                el: "Η υπασφάλιση είναι ύπουλη γιατί δεν φαίνεται μέχρι τη ζημιά. Πληρώνετε κανονικά το ασφάλιστρο και νιώθετε καλυμμένοι, αλλά στην αποζημίωση ανακαλύπτετε ότι η ασφαλιστική μειώνει το ποσό αναλογικά. Πιο συχνά εμφανίζεται στην κατοικία, όταν το ασφαλισμένο κεφάλαιο δεν έχει ενημερωθεί για χρόνια ενώ το κόστος κατασκευής ανέβηκε.",
                en: "Underinsurance is insidious because it does not show until a claim. You pay your premium and feel covered, but at claim time you discover the insurer reduces the amount proportionally. It appears most often in home insurance, when the sum insured has not been updated for years while build costs have risen.",
            },
        ],
        howToCheck: {
            el: "Στο δικό σας ασφαλιστήριο, συγκρίνετε το ασφαλισμένο κεφάλαιο με μια σημερινή εκτίμηση αξίας. Για την κατοικία, χρησιμοποιήστε κόστος ανακατασκευής ανά τετραγωνικό, όχι την τιμή αγοράς. Αν το ασφαλιστήριο αναφέρει κόστος ανακατασκευής, το PolicyWallet συγκρίνει τα δύο ποσά και επισημαίνει την υπασφάλιση — στο πλάνο Plus.",
            en: "In your own policy, compare the sum insured to a current value estimate — Greek policies state it as «ασφαλιζόμενο κεφάλαιο», and the proportional cut appears as «αναλογικός κανόνας». For a home, use rebuild cost per square meter, not the purchase price. If the policy states a rebuild cost, PolicyWallet compares the two figures and flags the shortfall — on the Plus plan.",
        },
        faq: [
            {
                question: {
                    el: "Πληρώνω κανονικά — γιατί να πάρω λιγότερα;",
                    en: "I pay in full — why would I get less?",
                },
                answer: {
                    el: "Επειδή το ασφάλιστρο υπολογίστηκε πάνω σε χαμηλότερο κεφάλαιο. Ο αναλογικός κανόνας μειώνει την αποζημίωση στο ίδιο ποσοστό.",
                    en: "Because the premium was calculated on a lower sum insured. The average rule cuts the payout by the same proportion.",
                },
            },
        ],
        related: [
            { label: { el: "Ασφαλισμένο κεφάλαιο", en: "Sum insured (asfalismeno kefalaio)" }, href: "/lexiko/asfalismeno-kefalaio" },
            { label: { el: "Ασφάλεια κατοικίας", en: "Home insurance" }, href: "/product/property" },
        ],
        dateModified: "2026-07-21",
    },
    {
        slug: "chronos-anamonis",
        term: { el: "Χρόνος αναμονής", en: "Waiting period (chronos anamonis)" },
        aliases: [{ el: "Περίοδος αναμονής", en: "Qualifying period" }],
        metaTitle: {
            el: "Τι είναι ο χρόνος αναμονής στην ασφάλιση;",
            en: "What is a waiting period in insurance?",
        },
        metaDescription: {
            el: "Χρόνος αναμονής είναι το διάστημα μετά την έναρξη κατά το οποίο μια κάλυψη δεν ισχύει ακόμη. Δείτε πού συναντάται συχνά και πώς να τον ελέγξετε στο συμβόλαιό σας.",
            en: "A waiting period is the time after inception during which a cover does not yet apply. See where it is common and how to check it in your policy.",
        },
        shortDefinition: {
            el: "Χρόνος αναμονής είναι το χρονικό διάστημα από την έναρξη του συμβολαίου κατά το οποίο μια συγκεκριμένη κάλυψη δεν ισχύει ακόμη. Συναντάται συχνά στην υγεία (π.χ. για τοκετό ή προϋπάρχουσες παθήσεις) και στη νομική προστασία. Ζημιά ή περιστατικό μέσα στην αναμονή συνήθως δεν αποζημιώνεται.",
            en: "A waiting period is the interval from the start of the policy during which a specific cover does not yet apply. It is common in health insurance (e.g. for maternity or pre-existing conditions) and in legal expenses cover. A loss or event within the waiting period is usually not paid.",
        },
        body: [
            {
                el: "Ο χρόνος αναμονής υπάρχει για να αποτρέψει το να ασφαλίζεται κανείς μόνο όταν ξέρει ήδη ότι θα χρειαστεί την κάλυψη. Είναι λογικός, αλλά σας αφορά άμεσα: αν αλλάξατε πρόσφατα ασφαλιστική, μια πάθηση ή διαφορά που «γεννήθηκε» μέσα στους πρώτους μήνες μπορεί να μείνει εκτός, ακόμη κι αν την πληροφορηθήκατε αργότερα.",
                en: "A waiting period exists to prevent someone from insuring only when they already know they will need the cover. It is reasonable, but it affects you directly: if you recently switched insurer, a condition or dispute that “arose” in the first months may fall outside, even if you learned of it later.",
            },
        ],
        howToCheck: {
            el: "Στο δικό σας ασφαλιστήριο, αναζητήστε «χρόνο αναμονής» ή «περίοδο αναμονής» στους όρους της κάθε κάλυψης — διαφέρει ανά παροχή. Το PolicyWallet εντοπίζει αναφορές σε χρόνους αναμονής στο έγγραφό σας, ώστε να ξέρετε από πότε ισχύει πραγματικά η κάθε κάλυψη.",
            en: "In your own policy, look for “χρόνο αναμονής” or “περίοδο αναμονής” in the terms of each cover — it varies per benefit. PolicyWallet surfaces references to waiting periods in your document, so you know from when each cover actually applies.",
        },
        faq: [
            {
                question: {
                    el: "Ισχύει χρόνος αναμονής αν άλλαξα εταιρεία;",
                    en: "Does a waiting period apply if I changed insurer?",
                },
                answer: {
                    el: "Συχνά ναι, το νέο συμβόλαιο ξεκινά τη δική του αναμονή. Ρωτήστε αν αναγνωρίζεται η προϋπηρεσία από το προηγούμενο συμβόλαιο.",
                    en: "Often yes; the new policy starts its own waiting period. Ask whether prior continuous cover is recognised.",
                },
            },
        ],
        related: [
            { label: { el: "Εξαίρεση", en: "Exclusion" }, href: "/lexiko/exairesi" },
            { label: { el: "Ασφάλεια υγείας", en: "Health insurance" }, href: "/product/health" },
        ],
        dateModified: "2026-07-21",
    },
    {
        slug: "dikaiouchos",
        term: { el: "Δικαιούχος", en: "Beneficiary (dikaiouchos)" },
        metaTitle: {
            el: "Τι είναι ο δικαιούχος σε ασφάλεια ζωής;",
            en: "What is a beneficiary in life insurance?",
        },
        metaDescription: {
            el: "Δικαιούχος είναι το πρόσωπο που λαμβάνει το ασφαλισμένο κεφάλαιο. Ξεπερασμένος δικαιούχος είναι από τα πιο συχνά λάθη — δείτε πώς να τον ελέγξετε.",
            en: "A beneficiary is the person who receives the sum insured. An outdated beneficiary is a common mistake — see how to check yours.",
        },
        shortDefinition: {
            el: "Δικαιούχος είναι το πρόσωπο ή τα πρόσωπα που ορίζετε να λάβουν το ασφαλισμένο κεφάλαιο μιας ασφάλισης ζωής όταν επέλθει ο ασφαλισμένος κίνδυνος. Η δήλωση δικαιούχου δεν ενημερώνεται αυτόματα με τις αλλαγές ζωής — γάμος, διαζύγιο ή γέννηση παιδιού δεν αλλάζουν από μόνα τους ποιος θα πληρωθεί.",
            en: "A beneficiary is the person or persons you designate to receive the sum insured of a life policy when the insured event occurs. The beneficiary designation is not updated automatically with life changes — marriage, divorce or the birth of a child do not by themselves change who gets paid.",
        },
        body: [
            {
                el: "Ο ξεπερασμένος δικαιούχος είναι ένα από τα πιο συχνά και πιο επώδυνα λάθη στην ασφάλιση ζωής. Ένα συμβόλαιο που ανοίχτηκε πριν από έναν γάμο ή ένα παιδί μπορεί να πληρώνει ακόμη τον λάθος άνθρωπο. Η διόρθωση είναι απλή — μια δήλωση στην εταιρεία — αλλά κανείς δεν τη θυμάται αν δεν το ελέγξει.",
                en: "An outdated beneficiary is one of the most common and most painful mistakes in life insurance. A policy opened before a marriage or a child may still pay the wrong person. The fix is simple — a declaration to the insurer — but nobody remembers it unless they check.",
            },
        ],
        howToCheck: {
            el: "Στο δικό σας ασφαλιστήριο ζωής, βρείτε την ενότητα «δικαιούχοι» και επιβεβαιώστε ότι αντικατοπτρίζει τη σημερινή σας πρόθεση. Μετά από κάθε μεγάλη αλλαγή ζωής, ενημερώστε τη δήλωση εγγράφως. Το PolicyWallet εντοπίζει τους αναγραφόμενους δικαιούχους και σας υπενθυμίζει να τους επανελέγξετε — από το πλάνο Starter.",
            en: "In your own life policy, find the “beneficiaries” section and confirm it reflects your current intent. After every major life change, update the designation in writing. PolicyWallet surfaces the named beneficiaries and reminds you to re-check them — from the Starter plan.",
        },
        faq: [
            {
                question: {
                    el: "Αλλάζει ο δικαιούχος αυτόματα μετά από διαζύγιο;",
                    en: "Does the beneficiary change automatically after divorce?",
                },
                answer: {
                    el: "Όχι. Παραμένει όπως τον δηλώσατε μέχρι να τον αλλάξετε εσείς με νέα δήλωση στην εταιρεία.",
                    en: "No. It stays as you declared it until you change it with a new designation to the insurer.",
                },
            },
        ],
        related: [
            { label: { el: "Ασφαλισμένο κεφάλαιο", en: "Sum insured (asfalismeno kefalaio)" }, href: "/lexiko/asfalismeno-kefalaio" },
            { label: { el: "Ασφάλεια ζωής", en: "Life insurance" }, href: "/product/life" },
        ],
        dateModified: "2026-07-21",
    },
    {
        slug: "odiki-voitheia",
        term: { el: "Οδική βοήθεια", en: "Roadside assistance (odiki voitheia)" },
        // No alias, deliberately. It used to read «Γνωστό και ως: Φροντίδα
        // ατυχήματος» — asserting as synonyms the two covers this entry, its
        // title and its meta description all exist to SEPARATE. The alias chip
        // is the one line a skimmer takes away; several entries carry none.
        aliases: [],
        metaTitle: {
            el: "Οδική βοήθεια ή φροντίδα ατυχήματος;",
            en: "Roadside assistance vs accident care",
        },
        metaDescription: {
            el: "Η οδική βοήθεια και η φροντίδα ατυχήματος είναι δύο διαφορετικές καλύψεις που συχνά μπερδεύονται. Δείτε τι καλύπτει η καθεμία και πώς να τις ξεχωρίσετε.",
            en: "Roadside assistance and accident care are two different covers that are often confused. See what each covers and how to tell them apart.",
        },
        shortDefinition: {
            el: "Οδική βοήθεια είναι η κάλυψη που μεταφέρει ή επισκευάζει επί τόπου το όχημά σας σε βλάβη ή ακινητοποίηση, οπουδήποτε. Διαφέρει από τη «φροντίδα ατυχήματος», που ενεργοποιείται μόνο μετά από τροχαίο για να καταγράψει τη ζημιά. Πολλά συμβόλαια αναγράφουν τηλέφωνο φροντίδας ατυχήματος χωρίς να περιλαμβάνουν οδική βοήθεια.",
            en: "Roadside assistance is the cover that tows or repairs your vehicle on the spot in a breakdown or immobilization, anywhere. It differs from “accident care”, which is triggered only after a collision to record the damage. Many policies print an accident-care phone line without including roadside assistance.",
        },
        body: [
            {
                el: "Αυτή η σύγχυση κοστίζει πραγματικά χρήματα και ταλαιπωρία. Ένας οδηγός βλέπει ένα 24ωρο τηλέφωνο στο συμβόλαιό του και υποθέτει ότι έχει οδική βοήθεια — μέχρι που μένει από λάστιχο στον αυτοκινητόδρομο και ανακαλύπτει ότι η γραμμή αφορά μόνο την καταγραφή τροχαίου. Οι δύο καλύψεις πωλούνται και τιμολογούνται χωριστά.",
                en: "This confusion costs real money and hassle. A driver sees a 24-hour phone number in their policy and assumes they have roadside assistance — until they get a flat tyre on the motorway and discover the line only handles accident reporting. The two covers are sold and priced separately.",
            },
        ],
        howToCheck: {
            el: "Στο δικό σας ασφαλιστήριο, μην κρίνετε από το αν υπάρχει τηλέφωνο· ψάξτε ρητά την κάλυψη «οδική βοήθεια» στον πίνακα καλύψεων. Αν αναγράφεται μόνο «φροντίδα ατυχήματος», η οδική βοήθεια πιθανόν να μην περιλαμβάνεται. Το PolicyWallet ξεχωρίζει τις δύο και σας δείχνει ποια πραγματικά έχετε.",
            en: "In your own policy, do not judge by whether a phone number exists; look explicitly for the “roadside assistance” cover in the schedule. If only “accident care” appears, roadside assistance may not be included. PolicyWallet separates the two and shows which you actually hold.",
        },
        faq: [
            {
                question: {
                    el: "Έχω τηλέφωνο βοήθειας — σημαίνει ότι έχω οδική βοήθεια;",
                    en: "I have an assistance phone — does that mean I have roadside assistance?",
                },
                answer: {
                    el: "Όχι απαραίτητα. Μπορεί να είναι η γραμμή φροντίδας ατυχήματος. Επιβεβαιώστε την κάλυψη «οδική βοήθεια» στον πίνακα καλύψεων.",
                    en: "Not necessarily. It may be the accident-care line. Confirm the “roadside assistance” cover in the schedule.",
                },
            },
        ],
        related: [
            { label: { el: "Ασφάλεια αυτοκινήτου", en: "Car insurance" }, href: "/product/motor" },
            { label: { el: "Μικτή ασφάλεια", en: "Comprehensive cover" }, href: "/lexiko/mikti-asfaleia" },
        ],
        dateModified: "2026-07-21",
    },
    {
        slug: "mikti-asfaleia",
        term: { el: "Μικτή ασφάλεια", en: "Comprehensive car insurance (mikti)" },
        metaTitle: {
            el: "Τι καλύπτει η μικτή ασφάλεια αυτοκινήτου;",
            en: "What does comprehensive car insurance cover?",
        },
        metaDescription: {
            el: "Μικτή ασφάλεια είναι η κάλυψη που προσθέτει ζημιές στο δικό σας όχημα πέρα από την υποχρεωτική. Δείτε τι τυπικά περιλαμβάνει και γιατί μετράνε οι απαλλαγές.",
            en: "Comprehensive insurance adds damage to your own vehicle beyond the mandatory cover. See what it typically includes and why the deductibles matter.",
        },
        shortDefinition: {
            el: "Μικτή ασφάλεια είναι το πακέτο που καλύπτει ζημιές στο δικό σας όχημα — όχι μόνο σε τρίτους — πέρα από την υποχρεωτική αστική ευθύνη. Τυπικά περιλαμβάνει ίδιες ζημιές, κλοπή, πυρκαγιά, φυσικά φαινόμενα και θραύση κρυστάλλων, το καθένα με δικά του όρια και απαλλαγές. Το «έχω μικτή» δεν λέει από μόνο του τι πληρώνετε σε ζημιά.",
            en: "Comprehensive (mikti) is the package that covers damage to your own vehicle — not only to third parties — beyond mandatory liability. It typically includes own damage, theft, fire, natural events and glass breakage, each with its own limits and deductibles. “I have comprehensive” alone does not tell you what you pay in a claim.",
        },
        body: [
            {
                el: "Η «μικτή» δεν είναι ένα ενιαίο πράγμα· είναι ένα καλάθι επιμέρους καλύψεων που διαφέρει ανά εταιρεία και ανά πακέτο. Δύο συμβόλαια που λέγονται και τα δύο «μικτή» μπορεί να έχουν τελείως διαφορετικές απαλλαγές, όρια και εξαιρέσεις. Η αξία της κρίνεται στις λεπτομέρειες, όχι στον τίτλο.",
                en: "“Comprehensive” is not a single thing; it is a basket of component covers that varies by insurer and package. Two policies both called “comprehensive” can have completely different deductibles, limits and exclusions. Its value is judged in the details, not the label.",
            },
        ],
        howToCheck: {
            el: "Στο δικό σας ασφαλιστήριο, διαβάστε ποιες επιμέρους καλύψεις περιλαμβάνει η μικτή σας και με ποια απαλλαγή η καθεμία. Ελέγξτε ιδιαίτερα κλοπή, φυσικά φαινόμενα και θραύση κρυστάλλων. Το PolicyWallet αναλύει το πακέτο σας κάλυψη-κάλυψη αντί για μια ετικέτα «μικτή».",
            en: "In your own policy, read which component covers your comprehensive includes and with what deductible each carries. Check theft, natural events and glass breakage in particular. PolicyWallet breaks your package down cover by cover instead of a single “comprehensive” label.",
        },
        faq: [
            {
                question: {
                    el: "Η μικτή καλύπτει τις ζημιές που προκαλώ στο δικό μου αυτοκίνητο;",
                    en: "Does comprehensive cover damage I cause to my own car?",
                },
                answer: {
                    el: "Τυπικά ναι, μέσω της κάλυψης ιδίων ζημιών — αλλά με απαλλαγή και εντός των ορίων του συμβολαίου σας.",
                    en: "Typically yes, through own-damage cover — but with a deductible and within your policy's limits.",
                },
            },
        ],
        related: [
            { label: { el: "Απαλλαγή", en: "Deductible" }, href: "/lexiko/apallagi" },
            { label: { el: "Οδική βοήθεια", en: "Roadside assistance (odiki voitheia)" }, href: "/lexiko/odiki-voitheia" },
            { label: { el: "Τι καλύπτει η ασφάλεια αυτοκινήτου", en: "What car insurance covers" }, href: "/guides/ti-kalyptei-i-asfaleia-aytokinitou" },
        ],
        dateModified: "2026-07-21",
    },
    {
        slug: "prasini-karta",
        term: { el: "Πράσινη κάρτα", en: "Green Card (prasini karta)" },
        aliases: [{ el: "Διεθνές πιστοποιητικό ασφάλισης", en: "International insurance certificate" }],
        metaTitle: {
            el: "Τι είναι η πράσινη κάρτα ασφάλισης;",
            en: "What is the insurance Green Card?",
        },
        metaDescription: {
            el: "Πράσινη κάρτα είναι το διεθνές πιστοποιητικό που αποδεικνύει ασφάλιση αυτοκινήτου στο εξωτερικό. Δείτε πότε τη χρειάζεστε και πώς να ελέγξετε ότι ισχύει.",
            en: "The Green Card is the international certificate proving car insurance abroad. See when you need it and how to check it is valid.",
        },
        shortDefinition: {
            el: "Πράσινη κάρτα είναι το διεθνές πιστοποιητικό ασφάλισης που αποδεικνύει ότι το όχημά σας έχει ασφάλιση αστικής ευθύνης όταν ταξιδεύετε σε ορισμένες χώρες εκτός της βασικής γεωγραφικής ισχύος του συμβολαίου. Δεν είναι επιπλέον ασφάλιση — είναι απόδειξη της υπάρχουσας κάλυψης για διασυνοριακή χρήση.",
            en: "The Green Card is the international insurance certificate proving your vehicle carries liability cover when you travel to certain countries outside your policy's base territory. It is not extra insurance — it is proof of your existing cover for cross-border use.",
        },
        body: [
            {
                el: "Η πράσινη κάρτα έχει σημασία όταν σχεδιάζετε ταξίδι με το αυτοκίνητο εκτός Ελλάδας. Η γεωγραφική ισχύς του συμβολαίου καθορίζει πού καλύπτεστε· η πράσινη κάρτα καταγράφει τις χώρες όπου αναγνωρίζεται η ασφάλισή σας. Ελέγξτε την πριν περάσετε σύνορα, όχι στο τελωνείο.",
                en: "The Green Card matters when you plan to drive outside Greece. The policy's territorial scope defines where you are covered; the Green Card records the countries where your insurance is recognised. Check it before you cross a border, not at customs.",
            },
        ],
        howToCheck: {
            el: "Στο δικό σας ασφαλιστήριο, δείτε τη γεωγραφική ισχύ και ζητήστε πράσινη κάρτα από την εταιρεία σας πριν από ταξίδι στο εξωτερικό. Επιβεβαιώστε ότι οι χώρες προορισμού αναγράφονται ως έγκυρες. Το PolicyWallet εντοπίζει ημερομηνίες λήξης και σας υπενθυμίζει πριν ταξιδέψετε — από το πλάνο Starter.",
            en: "In your own policy, check the territorial scope and request a Green Card from your insurer before travelling abroad. Confirm your destination countries are listed as valid. PolicyWallet surfaces expiry dates and reminds you before you travel — from the Starter plan.",
        },
        faq: [
            {
                question: {
                    el: "Χρειάζομαι πράσινη κάρτα για να οδηγήσω στην ΕΕ;",
                    en: "Do I need a Green Card to drive in the EU?",
                },
                // Matches the car-insurance guide's (correct) framing: inside
                // the EU/EEA the Greek policy itself is proof — no EU country
                // requires the card. The old answer said "some [EU countries]
                // require it", a factual error about a legal requirement that
                // also shipped inside FAQPage structured data and contradicted
                // /guides/ti-kalyptei-i-asfaleia-aytokinitou.
                answer: {
                    el: "Όχι — εντός ΕΕ και ΕΟΧ η ελληνική ασφάλιση αναγνωρίζεται χωρίς πράσινη κάρτα. Τη χρειάζεστε για χώρες του συστήματος εκτός ΕΟΧ, όπως η Αλβανία, η Βόρεια Μακεδονία ή η Τουρκία. Ελέγξτε και τη γεωγραφική ισχύ του συμβολαίου σας πριν το ταξίδι.",
                    en: "No — within the EU and EEA your Greek insurance is recognised without one. You need it for Green Card countries outside the EEA, such as Albania, North Macedonia or Turkey. Also check your policy's territorial scope before travelling.",
                },
            },
        ],
        related: [
            { label: { el: "Ασφάλεια αυτοκινήτου", en: "Car insurance" }, href: "/product/motor" },
            { label: { el: "Ταξιδιωτική ασφάλεια", en: "Travel insurance" }, href: "/product/travel" },
        ],
        dateModified: "2026-07-21",
    },
    {
        slug: "exagora",
        term: { el: "Εξαγορά", en: "Policy surrender (exagora)" },
        aliases: [{ el: "Αξία εξαγοράς", en: "Surrender value" }],
        metaTitle: {
            el: "Τι είναι η εξαγορά ασφαλιστηρίου;",
            en: "What is the surrender of a policy?",
        },
        metaDescription: {
            el: "Εξαγορά είναι η πρόωρη διακοπή ενός αποταμιευτικού ή συνταξιοδοτικού συμβολαίου με επιστροφή της αξίας του. Δείτε γιατί τα πρώτα χρόνια κοστίζει περισσότερο.",
            en: "Surrender is ending a savings or pension policy early and getting back its value. See why the first years cost you more.",
        },
        shortDefinition: {
            el: "Εξαγορά είναι η πρόωρη διακοπή ενός αποταμιευτικού ή συνταξιοδοτικού ασφαλιστηρίου, με επιστροφή της συσσωρευμένης αξίας του (αξία εξαγοράς). Τα πρώτα χρόνια η αξία εξαγοράς είναι συνήθως σημαντικά χαμηλότερη από τα καταβληθέντα ασφάλιστρα, λόγω εξόδων και ποινών· αυξάνεται όσο ωριμάζει το συμβόλαιο.",
            en: "Surrender is ending a savings or pension policy early and receiving its accumulated value (the surrender value). In the early years the surrender value is usually well below the premiums paid, due to charges and penalties; it rises as the policy matures.",
        },
        body: [
            {
                el: "Η εξαγορά είναι μια απόφαση που φαίνεται απλή αλλά συχνά είναι ακριβή. Ένα πρόγραμμα που διακόπτεται νωρίς μπορεί να επιστρέψει λιγότερα από όσα βάλατε. Πριν αποφασίσετε, αξίζει να δείτε τη σημερινή αξία εξαγοράς, τις τυχόν ποινές και τι θα χάνατε σε μελλοντικές παροχές — και για φορολογικά ερωτήματα να ρωτήσετε λογιστή.",
                en: "Surrender is a decision that looks simple but is often expensive. A plan stopped early may return less than you put in. Before deciding, it is worth seeing the current surrender value, any penalties, and what future benefits you would forgo — and for tax questions, to ask an accountant.",
            },
        ],
        howToCheck: {
            el: "Στο δικό σας ασφαλιστήριο ζωής ή αποταμίευσης, αναζητήστε τον πίνακα αξιών εξαγοράς και τους όρους πρόωρης διακοπής. Το PolicyWallet εντοπίζει αναφορές σε αξία εξαγοράς και ημερομηνίες ωρίμανσης, ώστε να δείτε πότε το πρόγραμμα αρχίζει να σας συμφέρει.",
            en: "In your own life or savings policy, look for the surrender-value table and the early-termination terms. PolicyWallet surfaces references to surrender value and maturity dates, so you can see when the plan starts working in your favour.",
        },
        faq: [
            {
                question: {
                    el: "Γιατί η εξαγορά μου είναι μικρότερη από όσα πλήρωσα;",
                    en: "Why is my surrender value less than what I paid?",
                },
                answer: {
                    el: "Τα πρώτα χρόνια βαραίνουν έξοδα και ποινές πρόωρης διακοπής. Η αξία εξαγοράς βελτιώνεται όσο περνούν τα χρόνια.",
                    en: "The early years carry charges and early-termination penalties. The surrender value improves as the years pass.",
                },
            },
        ],
        related: [
            { label: { el: "Ασφάλεια ζωής", en: "Life insurance" }, href: "/product/life" },
            { label: { el: "Σύνταξη & αποταμίευση", en: "Pension & savings" }, href: "/product/pension" },
        ],
        dateModified: "2026-07-21",
    },
    {
        slug: "ypoorio",
        term: { el: "Υποόριο", en: "Sublimit (ypoorio)" },
        aliases: [{ el: "Επιμέρους όριο", en: "Inner limit" }],
        metaTitle: {
            el: "Τι είναι το υποόριο σε ασφαλιστήριο;",
            en: "What is a sublimit in an insurance policy?",
        },
        metaDescription: {
            el: "Υποόριο είναι ένα χαμηλότερο ανώτατο όριο για μια συγκεκριμένη κάλυψη, μέσα στο συνολικό ασφαλισμένο κεφάλαιο. Δείτε γιατί μπορεί να πληρωθείτε λιγότερα από όσα νομίζετε.",
            en: "A sublimit is a lower ceiling on a specific cover, inside the overall sum insured. See why you may be paid less than the headline limit suggests.",
        },
        shortDefinition: {
            el: "Υποόριο είναι ένα χαμηλότερο ανώτατο όριο που ισχύει για μια συγκεκριμένη κάλυψη ή κατηγορία ζημιάς, μέσα στο συνολικό ασφαλισμένο κεφάλαιο. Παράδειγμα: σε ασφάλιση κατοικίας 200.000 € μπορεί να υπάρχει υποόριο 3.000 € για κοσμήματα. Ακόμη κι αν το συνολικό όριο είναι υψηλό, η συγκεκριμένη αποζημίωση περιορίζεται στο υποόριο.",
            en: "A sublimit is a lower ceiling that applies to a specific cover or type of loss, within the overall sum insured. Example: a €200,000 home policy may carry a €3,000 sublimit for jewelry. Even when the overall limit is high, that particular claim is capped at the sublimit.",
        },
        body: [
            {
                el: "Το υποόριο είναι από τους πιο συχνούς λόγους που μια αποζημίωση βγαίνει μικρότερη από το αναμενόμενο. Δύο συμβόλαια με το ίδιο «ασφαλισμένο κεφάλαιο» μπορεί να πληρώνουν πολύ διαφορετικά, αν το ένα έχει αυστηρά υποόρια ανά κατηγορία — π.χ. για κλοπή, για μετρητά, για ένα μεμονωμένο αντικείμενο ή, στην υγεία, ανά ημέρα νοσηλείας ή ανά πράξη. Το υποόριο δεν είναι εξαίρεση: η ζημιά καλύπτεται, αλλά μέχρι ένα χαμηλότερο ποσό.",
                en: "A sublimit is one of the most common reasons a payout comes out smaller than expected. Two policies with the same “sum insured” can pay very differently if one carries strict sublimits per category — for theft, for cash, for a single item, or, in health, per day of hospitalisation or per procedure. A sublimit is not an exclusion: the loss is covered, but only up to a lower amount.",
            },
        ],
        howToCheck: {
            el: "Στο δικό σας ασφαλιστήριο, τα υποόρια αναγράφονται συνήθως στον πίνακα καλύψεων δίπλα σε κάθε κάλυψη — αναζητήστε φράσεις όπως «έως», «μέχρι», «ανώτατο όριο ανά…» ή «υποόριο». Το PolicyWallet εντοπίζει τα υποόρια ανά κάλυψη στο έγγραφό σας, ώστε να δείτε πού η πραγματική σας προστασία είναι χαμηλότερη από το συνολικό όριο.",
            en: "In your own policy, sublimits usually appear in the schedule of cover next to each cover — look for phrases like “έως”, “μέχρι”, “ανώτατο όριο ανά…” or “υποόριο”. PolicyWallet surfaces the sublimits per cover in your document, so you can see where your real protection is lower than the overall limit.",
        },
        faq: [
            {
                question: {
                    el: "Είναι το υποόριο το ίδιο με το ασφαλισμένο κεφάλαιο;",
                    en: "Is a sublimit the same as the sum insured?",
                },
                answer: {
                    el: "Όχι. Το ασφαλισμένο κεφάλαιο είναι το συνολικό ανώτατο όριο· το υποόριο είναι ένα χαμηλότερο όριο για μια συγκεκριμένη κάλυψη μέσα σε αυτό.",
                    en: "No. The sum insured is the overall ceiling; a sublimit is a lower cap on a specific cover within it.",
                },
            },
            {
                question: {
                    el: "Πού συναντώ συχνότερα υποόρια;",
                    en: "Where do I most often meet sublimits?",
                },
                answer: {
                    el: "Στην υγεία (π.χ. δωμάτιο & τροφή ανά ημέρα, συγκεκριμένες πράξεις) και στην κατοικία (κοσμήματα, μετρητά, μεμονωμένο αντικείμενο).",
                    en: "In health (e.g. room & board per day, specific procedures) and home (jewelry, cash, a single item).",
                },
            },
        ],
        related: [
            { label: { el: "Ασφαλισμένο κεφάλαιο", en: "Sum insured (asfalismeno kefalaio)" }, href: "/lexiko/asfalismeno-kefalaio" },
            { label: { el: "Απαλλαγή", en: "Deductible" }, href: "/lexiko/apallagi" },
            { label: { el: "Εξαίρεση", en: "Exclusion" }, href: "/lexiko/exairesi" },
        ],
        dateModified: "2026-07-25",
    },
    {
        slug: "symmetochi",
        term: { el: "Συμμετοχή", en: "Co-payment (symmetochi)" },
        aliases: [{ el: "Συνασφάλιση", en: "Co-insurance" }],
        metaTitle: {
            el: "Τι είναι η συμμετοχή στην ασφάλιση;",
            en: "What is a co-payment in insurance?",
        },
        metaDescription: {
            el: "Συμμετοχή είναι το μέρος κάθε καλυπτόμενης δαπάνης που πληρώνετε εσείς, συνήθως ως ποσοστό. Δείτε πώς διαφέρει από την απαλλαγή και πόσο επηρεάζει την αποζημίωση.",
            en: "A co-payment is the share of each covered cost that you pay yourself, usually as a percentage. See how it differs from a deductible and how much it affects your payout.",
        },
        shortDefinition: {
            el: "Συμμετοχή (ή συνασφάλιση) είναι το μέρος μιας καλυπτόμενης δαπάνης που επιβαρύνεστε εσείς, συνήθως ως ποσοστό — π.χ. ο ασφαλιστής πληρώνει το 80% και εσείς το 20%. Συναντάται κυρίως στην υγεία και ισχύει ακόμη κι όταν η παροχή καλύπτεται: η κάλυψη μειώνει, δεν μηδενίζει, το κόστος σας.",
            en: "A co-payment (or co-insurance) is the part of a covered cost that you bear, usually as a percentage — e.g. the insurer pays 80% and you pay 20%. It is most common in health insurance and applies even when a benefit is covered: cover reduces, but does not zero, your cost.",
        },
        body: [
            {
                el: "Η συμμετοχή μπερδεύεται συχνά με την απαλλαγή, αλλά είναι διαφορετική: η απαλλαγή είναι ένα σταθερό ποσό που πληρώνετε πρώτοι σε κάθε ζημιά, ενώ η συμμετοχή είναι ένα ποσοστό της δαπάνης που μοιράζεστε με τον ασφαλιστή. Δύο συμβόλαια που «καλύπτουν νοσηλεία» μπορεί να σας κοστίσουν πολύ διαφορετικά αν το ένα έχει συμμετοχή 10% και το άλλο 30%. Ορισμένα προγράμματα έχουν και ανώτατο όριο ετήσιας συμμετοχής, πάνω από το οποίο ο ασφαλιστής καλύπτει το 100%.",
                en: "Co-payment is often confused with a deductible, but it is different: a deductible is a fixed amount you pay first on each claim, while a co-payment is a percentage of the cost you share with the insurer. Two policies that both “cover hospitalisation” can cost you very differently if one has a 10% co-payment and the other 30%. Some plans also cap your annual co-payment, above which the insurer covers 100%.",
            },
        ],
        howToCheck: {
            el: "Στο δικό σας ασφαλιστήριο υγείας, αναζητήστε «συμμετοχή», «ποσοστό συμμετοχής» ή «συνασφάλιση» στους όρους κάθε παροχής — διαφέρει ανά κάλυψη και ανά τρόπο νοσηλείας (π.χ. με ή χωρίς παραπεμπτικό). Το PolicyWallet εντοπίζει τις συμμετοχές στο έγγραφό σας, ώστε να ξέρετε τι θα πληρώσετε ακόμη και όταν η παροχή καλύπτεται.",
            en: "In your own health policy, look for “συμμετοχή”, “ποσοστό συμμετοχής” or “συνασφάλιση” in the terms of each benefit — it varies per cover and per pathway (e.g. with or without a referral). PolicyWallet surfaces the co-payments in your document, so you know what you will pay even when a benefit is covered.",
        },
        faq: [
            {
                question: {
                    el: "Ποια η διαφορά συμμετοχής και απαλλαγής;",
                    en: "What is the difference between a co-payment and a deductible?",
                },
                answer: {
                    el: "Η απαλλαγή είναι σταθερό ποσό που πληρώνετε πρώτοι· η συμμετοχή είναι ποσοστό της δαπάνης που μοιράζεστε με τον ασφαλιστή. Ένα συμβόλαιο μπορεί να έχει και τα δύο.",
                    en: "A deductible is a fixed amount you pay first; a co-payment is a percentage of the cost you share with the insurer. A policy can have both.",
                },
            },
            {
                question: {
                    el: "Πληρώνω συμμετοχή αν η θεραπεία καλύπτεται;",
                    en: "Do I pay a co-payment even if the treatment is covered?",
                },
                answer: {
                    el: "Συνήθως ναι. Η κάλυψη μειώνει το κόστος σας κατά το ποσοστό του ασφαλιστή, αλλά η συμμετοχή σας παραμένει εκτός αν το συμβόλαιο ορίζει διαφορετικά.",
                    en: "Usually yes. Cover reduces your cost by the insurer's share, but your co-payment remains unless the policy states otherwise.",
                },
            },
        ],
        related: [
            { label: { el: "Απαλλαγή", en: "Deductible" }, href: "/lexiko/apallagi" },
            { label: { el: "Υποόριο", en: "Sublimit (ypoorio)" }, href: "/lexiko/ypoorio" },
            { label: { el: "Ασφάλεια υγείας", en: "Health insurance" }, href: "/product/health" },
        ],
        dateModified: "2026-07-25",
    },
    {
        slug: "ananeosi",
        term: { el: "Ανανέωση", en: "Renewal (ananeosi)" },
        aliases: [{ el: "Ανανέωση ασφαλιστηρίου", en: "Policy renewal" }],
        metaTitle: {
            el: "Τι είναι η ανανέωση ασφαλιστηρίου;",
            en: "What is insurance renewal (ananeosi)?",
        },
        metaDescription: {
            el: "Ανανέωση είναι η παράταση του ασφαλιστηρίου για νέα περίοδο ώστε να μη διακοπεί η κάλυψη. Δείτε πότε γίνεται αυτόματα, τι μπορεί να αλλάξει και τι να ελέγξετε πριν πληρώσετε.",
            en: "Renewal extends your policy for a new period so cover is not interrupted. See when it happens automatically, what can change, and what to check before you pay.",
        },
        shortDefinition: {
            el: "Ανανέωση είναι η παράταση του ασφαλιστηρίου για νέα περίοδο (συνήθως ένα έτος) πριν λήξει, ώστε η κάλυψη να συνεχιστεί χωρίς κενό. Μπορεί να γίνεται αυτόματα ή να απαιτεί δική σας επιβεβαίωση και πληρωμή. Στην ανανέωση το ασφάλιστρο και οι όροι μπορεί να αλλάξουν — είναι η στιγμή να ξαναδείτε την κάλυψη, όχι απλώς να πληρώσετε.",
            en: "Renewal extends your policy for a new period (usually a year) before it expires, so cover continues without a gap. It may happen automatically or require your confirmation and payment. At renewal the premium and terms can change — it is the moment to re-check your cover, not just to pay.",
        },
        body: [
            {
                el: "Ένα ασφαλιστήριο έχει ημερομηνία λήξης. Αν ανανεωθεί, η κάλυψη συνεχίζεται· αν δεν ανανεωθεί, εκπνέει και μένετε χωρίς κάλυψη από εκείνο το σημείο. Γι' αυτό η ανανέωση δεν είναι διαδικαστική λεπτομέρεια: είναι το σημείο όπου κρίνεται αν παραμένετε ασφαλισμένος.",
                en: "A policy has an expiry date. If it is renewed, cover continues; if it is not, it lapses and you are left without cover from that point. That is why renewal is not a formality: it is the point at which staying insured is decided.",
            },
            {
                el: "Ακόμη κι όταν η ανανέωση είναι αυτόματη, αξίζει να τη δείτε σαν μικρό ετήσιο έλεγχο: έχει αλλάξει το ασφάλιστρο; έχουν αλλάξει οι απαλλαγές ή οι εξαιρέσεις; καλύπτει ακόμη τις σημερινές σας ανάγκες; Μια αυτόματη ανανέωση σας γλιτώνει από το κενό κάλυψης, αλλά δεν εγγυάται ότι οι όροι παρέμειναν ίδιοι.",
                en: "Even when renewal is automatic, it is worth treating as a small annual check: has the premium changed? have the deductibles or exclusions changed? does it still fit your current needs? An automatic renewal spares you a gap in cover, but does not guarantee the terms stayed the same.",
            },
        ],
        howToCheck: {
            el: "Στο δικό σας ασφαλιστήριο, βρείτε την ημερομηνία λήξης και δείτε αν αναφέρεται «αυτόματη ανανέωση» και με ποια προθεσμία προειδοποίησης. Αν δεν είστε βέβαιοι, ρωτήστε την ασφαλιστική ή τον σύμβουλό σας πριν τη λήξη — όχι μετά. Το PolicyWallet σας θυμίζει τις επερχόμενες λήξεις ώστε να έχετε χρόνο να αποφασίσετε — από το πλάνο Starter.",
            en: "In your own policy, find the expiry date and check whether it mentions “automatic renewal” and with what notice period. If you are unsure, ask your insurer or advisor before the expiry date — not after. PolicyWallet reminds you of upcoming expiries so you have time to decide — from the Starter plan.",
        },
        faq: [
            {
                question: {
                    el: "Ανανεώνεται αυτόματα το ασφαλιστήριό μου;",
                    en: "Does my policy renew automatically?",
                },
                answer: {
                    el: "Εξαρτάται από τους όρους του συμβολαίου σας. Ορισμένα ανανεώνονται αυτόματα εκτός αν δηλώσετε το αντίθετο· άλλα απαιτούν ενεργή επιβεβαίωση και πληρωμή. Ελέγξτε τους όρους ή ρωτήστε τον ασφαλιστή σας.",
                    en: "It depends on your policy terms. Some renew automatically unless you say otherwise; others require active confirmation and payment. Check the terms or ask your insurer.",
                },
            },
            {
                question: {
                    el: "Τι γίνεται αν αφήσω το ασφαλιστήριο να λήξει;",
                    en: "What happens if I let my policy expire?",
                },
                answer: {
                    el: "Αν λήξει χωρίς ανανέωση, εκπνέει και δεν έχετε κάλυψη για νέες ζημιές από εκείνο το σημείο. Η επανασφάλιση μπορεί να απαιτεί νέα αίτηση και ενδέχεται να χαθούν συνέχειες όπως ο χρόνος αναμονής που έχετε ήδη συμπληρώσει.",
                    en: "If it expires without renewal it lapses, and you have no cover for new losses from that point. Re-insuring may require a fresh application, and continuities such as a waiting period you have already served can be lost.",
                },
            },
        ],
        related: [
            { label: { el: "Εκπνοή", en: "Lapse" }, href: "/lexiko/ekpnoi" },
            { label: { el: "Ασφάλιστρο", en: "Premium" }, href: "/lexiko/asfalistro" },
            { label: { el: "Ασφαλιστήριο", en: "Insurance policy" }, href: "/lexiko/asfalistirio" },
        ],
        dateModified: "2026-07-26",
    },
    {
        slug: "ekpnoi",
        term: { el: "Εκπνοή", en: "Lapse (ekpnoi)" },
        aliases: [{ el: "Λήξη χωρίς ανανέωση", en: "Lapsed policy" }],
        metaTitle: {
            el: "Τι σημαίνει εκπνοή ασφαλιστηρίου;",
            en: "What does a policy lapse (ekpnoi) mean?",
        },
        metaDescription: {
            el: "Εκπνοή είναι όταν ένα ασφαλιστήριο τελειώνει χωρίς ανανέωση και σταματά η κάλυψη. Δείτε τις συνέπειες, τη διαφορά από την ακύρωση και πώς να την αποφύγετε.",
            en: "A lapse is when a policy ends without renewal and cover stops. See the consequences, how it differs from cancellation, and how to avoid it.",
        },
        shortDefinition: {
            el: "Εκπνοή είναι όταν ένα ασφαλιστήριο τελειώνει και δεν ανανεώνεται — συνήθως επειδή πέρασε η λήξη ή δεν πληρώθηκε το ασφάλιστρο — οπότε δεν έχετε κάλυψη από εκείνο το σημείο. Νέες ζημιές δεν αποζημιώνονται. Η επανενεργοποίηση μπορεί να απαιτεί νέα αίτηση και ενδέχεται να χαθούν συνέχειες, όπως ο χρόνος αναμονής που έχετε ήδη συμπληρώσει.",
            en: "A lapse is when a policy ends and is not renewed — usually because the expiry passed or the premium went unpaid — so you have no cover from that point. New losses are not paid. Reinstating may require a fresh application, and continuities such as a waiting period you have already served can be lost.",
        },
        body: [
            {
                el: "Η εκπνοή διαφέρει από την ακύρωση. Η ακύρωση είναι μια σκόπιμη ενέργεια — εσείς ή ο ασφαλιστής τερματίζετε το συμβόλαιο μέσα στη διάρκειά του. Η εκπνοή προκύπτει συχνά από αδράνεια: αφήσατε τη λήξη να περάσει ή δεν ολοκληρώθηκε η πληρωμή. Το αποτέλεσμα και στις δύο περιπτώσεις είναι το ίδιο — δεν είστε πλέον ασφαλισμένος.",
                en: "A lapse is different from a cancellation. Cancellation is a deliberate act — you or the insurer end the contract during its term. A lapse often results from inaction: you let the expiry pass, or a payment did not go through. The result in both cases is the same — you are no longer insured.",
            },
            {
                el: "Το ακριβό κομμάτι της εκπνοής δεν είναι μόνο το κενό κάλυψης. Όταν ξανασφαλιστείτε, ο ασφαλιστής μπορεί να ζητήσει νέα αίτηση, να επανεκτιμήσει τον κίνδυνο και να μην αναγνωρίσει συνέχειες που είχατε ήδη κερδίσει. Γι' αυτό είναι σχεδόν πάντα προτιμότερο να ανανεώσετε εγκαίρως παρά να αφήσετε ένα ασφαλιστήριο να εκπνεύσει.",
                en: "The costly part of a lapse is not only the gap in cover. When you re-insure, the insurer may ask for a fresh application, re-assess the risk, and not recognise continuities you had already earned. That is why it is almost always better to renew in time than to let a policy lapse.",
            },
        ],
        howToCheck: {
            el: "Στο δικό σας ασφαλιστήριο, βρείτε την ημερομηνία λήξης και βεβαιωθείτε ότι το ασφάλιστρο έχει πληρωθεί και είναι ενήμερο. Αν πλησιάζει η λήξη ή έχετε αμφιβολία, επικοινωνήστε με την ασφαλιστική ή τον σύμβουλό σας πριν την ημερομηνία λήξης. Το PolicyWallet σας ειδοποιεί για τις επερχόμενες λήξεις ώστε να προλάβετε — από το πλάνο Starter.",
            en: "In your own policy, find the expiry date and make sure the premium is paid and up to date. If the expiry is near or you are in any doubt, contact your insurer or advisor before the expiry date. PolicyWallet alerts you to upcoming expiries so you can act in time — from the Starter plan.",
        },
        faq: [
            {
                question: {
                    el: "Μπορώ να επαναφέρω ένα ασφαλιστήριο που έχει εκπνεύσει;",
                    en: "Can I reinstate a lapsed policy?",
                },
                answer: {
                    el: "Μερικές φορές, αλλά δεν είναι εγγυημένο. Ο ασφαλιστής μπορεί να το επιτρέψει εντός μιας προθεσμίας, να ζητήσει νέα αίτηση ή να επανεκτιμήσει τους όρους. Ρωτήστε την ασφαλιστική σας το συντομότερο δυνατό.",
                    en: "Sometimes, but it is not guaranteed. The insurer may allow it within a time window, ask for a fresh application, or re-assess the terms. Ask your insurer as soon as possible.",
                },
            },
            {
                question: {
                    el: "Ποια η διαφορά εκπνοής και ακύρωσης;",
                    en: "What is the difference between a lapse and a cancellation?",
                },
                answer: {
                    el: "Η ακύρωση είναι σκόπιμος τερματισμός του συμβολαίου μέσα στη διάρκειά του· η εκπνοή είναι το τέλος χωρίς ανανέωση, συχνά από αδράνεια. Και οι δύο σας αφήνουν χωρίς κάλυψη.",
                    en: "Cancellation is a deliberate ending of the contract during its term; a lapse is the end without renewal, often through inaction. Both leave you without cover.",
                },
            },
        ],
        related: [
            { label: { el: "Ανανέωση", en: "Renewal" }, href: "/lexiko/ananeosi" },
            { label: { el: "Χρόνος αναμονής", en: "Waiting period (chronos anamonis)" }, href: "/lexiko/chronos-anamonis" },
            { label: { el: "Ασφαλιστήριο", en: "Insurance policy" }, href: "/lexiko/asfalistirio" },
        ],
        dateModified: "2026-07-26",
    },
    {
        slug: "apozimiosi",
        term: { el: "Αποζημίωση", en: "Indemnity (apozimiosi)" },
        aliases: [{ el: "Αρχή της αποζημίωσης", en: "Principle of indemnity" }],
        metaTitle: {
            el: "Τι είναι η αποζημίωση στην ασφάλιση;",
            en: "What is indemnity (apozimiosi) in insurance?",
        },
        metaDescription: {
            el: "Αποζημίωση είναι το ποσό που πληρώνει η ασφαλιστική για μια καλυπτόμενη ζημιά, με βάση την αρχή ότι σας επαναφέρει στην προηγούμενη οικονομική σας θέση — όχι σε καλύτερη.",
            en: "Indemnity is what the insurer pays for a covered loss, on the principle that it restores your previous financial position — not a better one.",
        },
        shortDefinition: {
            el: "Αποζημίωση είναι το ποσό που καταβάλλει η ασφαλιστική για μια καλυπτόμενη ζημιά, καθώς και η αρχή πίσω από αυτό: η ασφάλιση σας επαναφέρει στην οικονομική θέση που είχατε πριν τη ζημιά — όχι σε καλύτερη. Το ποσό αντανακλά την πραγματική ζημιά, εντός των ορίων και μετά την απαλλαγή ή τη συμμετοχή. Δεν κερδίζετε από μια αποζημίωση.",
            en: "Indemnity is the amount the insurer pays for a covered loss, and the principle behind it: insurance restores you to the financial position you were in before the loss — not a better one. The amount reflects the actual loss, within the limits and after any deductible or co-payment. You do not profit from a claim.",
        },
        body: [
            {
                el: "Η αρχή της αποζημίωσης εξηγεί γιατί η πληρωμή δεν ισούται πάντα με το ποσό που ζητάτε. Ο ασφαλιστής υπολογίζει την πραγματική σας ζημιά, αφαιρεί την απαλλαγή και τυχόν συμμετοχή, και εφαρμόζει τα όρια και υποόρια της κάλυψης. Αν είστε υπασφαλισμένος, μπορεί να μειωθεί κι άλλο αναλογικά.",
                en: "The principle of indemnity explains why a payout does not always equal the amount you claim. The insurer works out your actual loss, subtracts the deductible and any co-payment, and applies the cover's limits and sublimits. If you are underinsured, it can be reduced further, proportionally.",
            },
            {
                el: "Εξαιρέσεις υπάρχουν: ορισμένες ασφαλίσεις ζωής και προσωπικών ατυχημάτων πληρώνουν ένα προσυμφωνημένο ποσό ανεξάρτητα από την «πραγματική ζημιά», γιατί η ζωή ή η αρτιμέλεια δεν αποτιμώνται σαν περιουσιακό στοιχείο. Στις ασφαλίσεις περιουσίας και ευθύνης, όμως, η αρχή της αποζημίωσης είναι ο κανόνας.",
                en: "There are exceptions: some life and personal-accident policies pay a pre-agreed sum regardless of the “actual loss”, because a life or a limb is not valued like an asset. In property and liability insurance, though, indemnity is the rule.",
            },
        ],
        howToCheck: {
            el: "Στο δικό σας ασφαλιστήριο, δείτε πώς ορίζεται η βάση αποζημίωσης ανά κάλυψη — «σε αξία καινούριου», «σε τρέχουσα αξία», με απαλλαγή ή συμμετοχή. Αυτά καθορίζουν πόσα θα λάβετε στην πράξη. Αν κάτι δεν είναι σαφές πριν από μια ζημιά, ρωτήστε την ασφαλιστική ή τον σύμβουλό σας.",
            en: "In your own policy, look at how the basis of settlement is defined per cover — “replacement value”, “current value”, with a deductible or co-payment. These decide how much you receive in practice. If anything is unclear before a loss, ask your insurer or advisor.",
        },
        faq: [
            {
                question: {
                    el: "Γιατί η αποζημίωση είναι μικρότερη από τη ζημιά μου;",
                    en: "Why is my payout smaller than my loss?",
                },
                answer: {
                    el: "Συνήθως λόγω απαλλαγής, συμμετοχής, ορίων ή υποασφάλισης, ή επειδή η κάλυψη αποτιμά την τρέχουσα και όχι την καινούρια αξία. Οι όροι του συμβολαίου σας εξηγούν τη βάση.",
                    en: "Usually because of a deductible, co-payment, limits or underinsurance, or because the cover values the current rather than the new price. Your policy terms explain the basis.",
                },
            },
            {
                question: {
                    el: "Μπορώ να κερδίσω από μια ασφαλιστική αποζημίωση;",
                    en: "Can I profit from an insurance claim?",
                },
                answer: {
                    el: "Στις ασφαλίσεις περιουσίας και ευθύνης, όχι — η αρχή της αποζημίωσης το αποκλείει. Ορισμένες ασφαλίσεις ζωής/ατυχημάτων πληρώνουν προσυμφωνημένο ποσό, που είναι διαφορετική λογική.",
                    en: "In property and liability insurance, no — the principle of indemnity rules it out. Some life/accident policies pay a pre-agreed sum, which follows a different logic.",
                },
            },
        ],
        related: [
            { label: { el: "Ασφαλισμένο κεφάλαιο", en: "Insured amount" }, href: "/lexiko/asfalismeno-kefalaio" },
            { label: { el: "Απαλλαγή", en: "Deductible" }, href: "/lexiko/apallagi" },
            { label: { el: "Υπασφάλιση", en: "Underinsurance (ypasfalisi)" }, href: "/lexiko/ypasfalisi" },
            {
                label: { el: "Εφαρμογές για ασφαλιστήρια και ζημιές", en: "Apps for policies and claims" },
                href: "/guides/efarmoges-asfalistirion-apozimioseis",
            },
        ],
        dateModified: "2026-07-26",
    },
    {
        slug: "axia-antikatastasis",
        term: { el: "Αξία αντικατάστασης", en: "Replacement value (axia antikatastasis)" },
        aliases: [{ el: "Αξία καινούριου", en: "New-for-old value" }],
        metaTitle: {
            el: "Τι είναι η αξία αντικατάστασης;",
            en: "What is replacement value (new-for-old)?",
        },
        metaDescription: {
            el: "Αξία αντικατάστασης είναι το κόστος να αντικαταστήσετε ένα αντικείμενο με καινούριο ισοδύναμο, χωρίς αφαίρεση για παλαιότητα. Δείτε πώς διαφέρει από την τρέχουσα αξία.",
            en: "Replacement value is the cost to replace an item with a new equivalent, without deducting for age. See how it differs from current (actual cash) value.",
        },
        shortDefinition: {
            el: "Αξία αντικατάστασης (ή αξία καινούριου) είναι το κόστος να αντικαταστήσετε ένα κατεστραμμένο ή χαμένο αντικείμενο με καινούριο ισοδύναμο, χωρίς αφαίρεση για παλαιότητα ή φθορά. Διαφέρει από την «τρέχουσα αξία», που αφαιρεί την απόσβεση και πληρώνει λιγότερα. Το ποια βάση χρησιμοποιεί το συμβόλαιό σας καθορίζει πόσα θα λάβετε.",
            en: "Replacement value (new-for-old) is the cost to replace a damaged or lost item with a new equivalent, without deducting for age or wear. It differs from “current value”, which subtracts depreciation and pays less. Which basis your policy uses decides how much you receive.",
        },
        body: [
            {
                el: "Δύο συμβόλαια που «καλύπτουν» την ίδια συσκευή μπορεί να πληρώσουν πολύ διαφορετικά: το ένα σε αξία καινούριου (αγοράζετε καινούρια), το άλλο σε τρέχουσα αξία (λαμβάνετε την παλιά, μειωμένη τιμή). Στην ασφάλιση κατοικίας και περιεχομένου, αυτή η διαφορά είναι από τις πιο σημαντικές και συχνά περνά απαρατήρητη μέχρι τη ζημιά.",
                en: "Two policies that both “cover” the same appliance can pay very differently: one at new-for-old (you buy new), the other at current value (you get the old, reduced price). In home and contents insurance this difference is one of the most important, and it often goes unnoticed until a loss.",
            },
        ],
        howToCheck: {
            el: "Στο δικό σας ασφαλιστήριο κατοικίας, αναζητήστε αν η αποζημίωση δίνεται «σε αξία αντικατάστασης / καινούριου» ή «σε τρέχουσα / πραγματική αξία», ανά κάλυψη. Ελέγξτε επίσης αν υπάρχει όριο ηλικίας αντικειμένων. Το PolicyWallet εντοπίζει τη βάση αποτίμησης στο έγγραφό σας.",
            en: "In your own home policy, look for whether settlement is “on a replacement / new-for-old basis” or “on a current / actual value basis”, per cover. Check too for any age limit on items. PolicyWallet surfaces the valuation basis in your document.",
        },
        faq: [
            {
                question: {
                    el: "Ποια η διαφορά αξίας αντικατάστασης και τρέχουσας αξίας;",
                    en: "What is the difference between replacement value and current value?",
                },
                answer: {
                    el: "Η αξία αντικατάστασης πληρώνει το καινούριο ισοδύναμο· η τρέχουσα αξία αφαιρεί την παλαιότητα και πληρώνει λιγότερα. Η πρώτη κοστίζει συνήθως ακριβότερο ασφάλιστρο.",
                    en: "Replacement value pays for the new equivalent; current value deducts for age and pays less. The former usually costs a higher premium.",
                },
            },
            {
                question: {
                    el: "Καλύπτεται πάντα η αξία καινούριου;",
                    en: "Is new-for-old always covered?",
                },
                answer: {
                    el: "Όχι — εξαρτάται από το συμβόλαιο και συχνά από την ηλικία του αντικειμένου. Ορισμένες καλύψεις περνούν σε τρέχουσα αξία μετά από κάποια έτη. Ελέγξτε τους όρους.",
                    en: "No — it depends on the policy and often on the item's age. Some covers switch to current value after a number of years. Check the terms.",
                },
            },
        ],
        related: [
            { label: { el: "Ασφαλισμένο κεφάλαιο", en: "Insured amount" }, href: "/lexiko/asfalismeno-kefalaio" },
            { label: { el: "Υπασφάλιση", en: "Underinsurance (ypasfalisi)" }, href: "/lexiko/ypasfalisi" },
            { label: { el: "Ασφάλεια κατοικίας", en: "Home insurance" }, href: "/product/property" },
        ],
        dateModified: "2026-07-26",
    },
    {
        slug: "prostheti-praxi",
        term: { el: "Πρόσθετη πράξη", en: "Endorsement (prostheti praxi)" },
        aliases: [{ el: "Προσάρτημα", en: "Rider / amendment" }],
        metaTitle: {
            el: "Τι είναι η πρόσθετη πράξη (προσάρτημα);",
            en: "What is an endorsement (prostheti praxi)?",
        },
        metaDescription: {
            el: "Πρόσθετη πράξη είναι έγγραφο που τροποποιεί το ασφαλιστήριό σας κατά τη διάρκειά του — προσθέτει ή αλλάζει κάλυψη, όριο ή στοιχεία. Δείτε γιατί μετράει και πού να το φυλάτε.",
            en: "An endorsement is a document that amends your policy during its term — adding or changing a cover, a limit or details. See why it matters and where to keep it.",
        },
        shortDefinition: {
            el: "Πρόσθετη πράξη (ή προσάρτημα) είναι έγγραφο που τροποποιεί το ασφαλιστήριό σας κατά τη διάρκειά του — προσθέτει ή αφαιρεί μια κάλυψη, αλλάζει ένα όριο ή το ασφαλισμένο κεφάλαιο, ή διορθώνει στοιχεία. Γίνεται μέρος της σύμβασης και υπερισχύει των αρχικών όρων που τροποποιεί. Φυλάξτε κάθε πρόσθετη πράξη μαζί με το ασφαλιστήριο.",
            en: "An endorsement (prostheti praxi) is a document that amends your policy during its term — adding or removing a cover, changing a limit or the sum insured, or correcting details. It becomes part of the contract and prevails over the original terms it changes. Keep every endorsement together with your policy.",
        },
        body: [
            {
                el: "Μια πρόσθετη πράξη είναι ο τρόπος που αλλάζει ένα συμβόλαιο χωρίς να εκδοθεί νέο: προσθέτετε έναν οδηγό, αυξάνετε το ασφαλισμένο κεφάλαιο μετά από ανακαίνιση, διορθώνετε μια διεύθυνση. Επειδή υπερισχύει των αρχικών όρων, μια πρόσθετη πράξη που λείπει μπορεί να σημαίνει ότι διαβάζετε λάθος εκδοχή της κάλυψής σας.",
                en: "An endorsement is how a policy changes without a whole new one being issued: you add a driver, increase the sum insured after a renovation, correct an address. Because it prevails over the original terms, a missing endorsement can mean you are reading the wrong version of your own cover.",
            },
        ],
        howToCheck: {
            el: "Στο δικό σας ασφαλιστήριο, ελέγξτε αν υπάρχουν πρόσθετες πράξεις ή προσαρτήματα με μεταγενέστερη ημερομηνία — αυτά υπερισχύουν των αρχικών όρων. Κρατήστε τα όλα μαζί. Στο PolicyWallet μπορείτε να ανεβάσετε και τις πρόσθετες πράξεις, ώστε η εικόνα της κάλυψής σας να είναι ενημερωμένη.",
            en: "In your own policy, check for any endorsements or riders with a later date — these prevail over the original terms. Keep them all together. In PolicyWallet you can upload endorsements too, so your coverage picture stays current.",
        },
        faq: [
            {
                question: {
                    el: "Ισχύει η πρόσθετη πράξη πάνω από τους αρχικούς όρους;",
                    en: "Does an endorsement override the original terms?",
                },
                answer: {
                    el: "Ναι, ως προς ό,τι τροποποιεί. Γι' αυτό πρέπει να τη διαβάζετε μαζί με το ασφαλιστήριο και όχι μεμονωμένα.",
                    en: "Yes, for whatever it changes. That is why you should read it together with the policy, not on its own.",
                },
            },
            {
                question: {
                    el: "Χρειάζεται να πληρώσω για μια πρόσθετη πράξη;",
                    en: "Do I pay for an endorsement?",
                },
                answer: {
                    el: "Εξαρτάται από την αλλαγή. Μια αύξηση κάλυψης μπορεί να αλλάξει το ασφάλιστρο· μια διόρθωση στοιχείων συνήθως όχι. Ρωτήστε την ασφαλιστική σας.",
                    en: "It depends on the change. Increasing cover may change the premium; correcting details usually does not. Ask your insurer.",
                },
            },
        ],
        related: [
            { label: { el: "Ασφαλιστήριο", en: "Insurance policy" }, href: "/lexiko/asfalistirio" },
            { label: { el: "Ασφαλισμένο κεφάλαιο", en: "Insured amount" }, href: "/lexiko/asfalismeno-kefalaio" },
            { label: { el: "Εξαίρεση", en: "Exclusion" }, href: "/lexiko/exairesi" },
        ],
        dateModified: "2026-07-26",
    },
    {
        slug: "akyrosi",
        term: { el: "Ακύρωση", en: "Cancellation (akyrosi)" },
        aliases: [{ el: "Ποινή ακύρωσης", en: "Cancellation penalty" }],
        metaTitle: {
            el: "Τι είναι η ακύρωση ασφαλιστηρίου;",
            en: "What is policy cancellation (akyrosi)?",
        },
        metaDescription: {
            el: "Ακύρωση είναι ο σκόπιμος τερματισμός ενός ασφαλιστηρίου πριν τη λήξη. Δείτε πότε υπάρχει ποινή ή επιστροφή ασφαλίστρου και πώς διαφέρει από την εκπνοή.",
            en: "Cancellation is deliberately ending a policy before its expiry. See when a penalty or premium refund applies, and how it differs from a lapse.",
        },
        shortDefinition: {
            el: "Ακύρωση είναι ο σκόπιμος τερματισμός ενός ασφαλιστηρίου πριν από τη φυσιολογική του λήξη, από εσάς ή από την ασφαλιστική. Ανάλογα με τους όρους και τον χρόνο, μπορεί να συνεπάγεται ποινή ακύρωσης ή επιστροφή του μη δεδουλευμένου ασφαλίστρου. Διαφέρει από την εκπνοή, που προκύπτει από αδράνεια και όχι από απόφαση.",
            en: "Cancellation is the deliberate ending of a policy before its normal expiry, by you or the insurer. Depending on the terms and the timing, it may carry a cancellation penalty or entitle you to a refund of the unused premium. It differs from a lapse, which happens through inaction rather than a decision.",
        },
        body: [
            {
                el: "Η ακύρωση δεν είναι πάντα «δωρεάν»: κάποια συμβόλαια προβλέπουν ποινή ή κρατούν ένα ελάχιστο ασφάλιστρο, ενώ άλλα επιστρέφουν αναλογικά το ποσό που δεν χρησιμοποιήσατε. Σε ορισμένες περιπτώσεις ο νόμος δίνει δικαίωμα εναντίωσης ή υπαναχώρησης μέσα σε συγκεκριμένη προθεσμία μετά τη σύναψη — χωρίς επιβάρυνση.",
                en: "Cancellation is not always “free”: some policies apply a penalty or keep a minimum premium, while others refund the unused amount pro-rata. In certain cases the law grants a right of objection or withdrawal within a set period after signing — at no cost.",
            },
            {
                el: "Πριν ακυρώσετε, αξίζει να ελέγξετε δύο πράγματα: τι θα κοστίσει η ακύρωση και πότε ακριβώς σταματά η κάλυψη. Το κενό μεταξύ της ακύρωσης ενός συμβολαίου και της έναρξης ενός νέου είναι διάστημα χωρίς προστασία.",
                en: "Before cancelling, it is worth checking two things: what the cancellation will cost, and exactly when cover stops. The gap between cancelling one policy and a new one starting is a period with no protection.",
            },
        ],
        howToCheck: {
            el: "Στο δικό σας ασφαλιστήριο, αναζητήστε τους όρους ακύρωσης — προθεσμία προειδοποίησης, τυχόν ποινή και τρόπο επιστροφής ασφαλίστρου. Αν σκέφτεστε να ακυρώσετε, ρωτήστε πρώτα την ασφαλιστική ή τον σύμβουλό σας για το κόστος και για το πότε παύει η κάλυψη — και φροντίστε να μη μείνετε χωρίς προστασία.",
            en: "In your own policy, look for the cancellation terms — the notice period, any penalty, and how premium is refunded. If you are thinking of cancelling, first ask your insurer or advisor about the cost and when cover stops — and make sure you are not left without protection.",
        },
        faq: [
            {
                question: {
                    el: "Παίρνω πίσω ασφάλιστρα αν ακυρώσω;",
                    en: "Do I get premium back if I cancel?",
                },
                answer: {
                    el: "Συχνά ναι, αναλογικά για το διάστημα που δεν χρησιμοποιήσατε — αλλά κάποια συμβόλαια κρατούν ποινή ή ελάχιστο ασφάλιστρο. Το ορίζουν οι όροι σας.",
                    en: "Often yes, pro-rata for the unused period — but some policies keep a penalty or a minimum premium. Your terms decide.",
                },
            },
            {
                question: {
                    el: "Ποια η διαφορά ακύρωσης και εκπνοής;",
                    en: "What is the difference between cancellation and lapse?",
                },
                answer: {
                    el: "Η ακύρωση είναι απόφαση να τερματιστεί το συμβόλαιο μέσα στη διάρκειά του· η εκπνοή είναι το τέλος χωρίς ανανέωση, συνήθως από αδράνεια. Και οι δύο σας αφήνουν χωρίς κάλυψη.",
                    en: "Cancellation is a decision to end the contract during its term; a lapse is the end without renewal, usually through inaction. Both leave you without cover.",
                },
            },
        ],
        related: [
            { label: { el: "Εκπνοή", en: "Lapse" }, href: "/lexiko/ekpnoi" },
            { label: { el: "Ανανέωση", en: "Renewal" }, href: "/lexiko/ananeosi" },
            { label: { el: "Ασφάλιστρο", en: "Premium" }, href: "/lexiko/asfalistro" },
        ],
        dateModified: "2026-07-26",
    },
    {
        // The category's named instrument. Weights and limits below are the
        // shipped ones (lib/services/gap-engine/protection-score.ts and the
        // in-app methodology copy) — this page is the public, citable
        // definition so the score is not a number without a source.
        slug: "skor-prostasias",
        term: { el: "Σκορ Προστασίας", en: "Protection Score" },
        aliases: [{ el: "Βαθμολογία προστασίας", en: "Coverage score" }],
        metaTitle: {
            el: "Τι είναι το Σκορ Προστασίας;",
            en: "What is the Protection Score?",
        },
        metaDescription: {
            el: "Το PolicyWallet δεν υπολογίζει πλέον σκορ προστασίας. Εξηγούμε τι ήταν, γιατί το αφαιρέσαμε και τι δείχνουμε στη θέση του.",
            en: "PolicyWallet no longer calculates a protection score. Here is what it was, why we removed it, and what we show instead.",
        },
        shortDefinition: {
            el: "Βαθμολογία 0–100 που υπόσχεται να δείξει πόσο πλήρης είναι η ασφαλιστική σας εικόνα. Το PolicyWallet δεν υπολογίζει πλέον τέτοια βαθμολογία — δείχνει αντ' αυτού τα συγκεκριμένα ευρήματα και τι δεν έχει ελεγχθεί ακόμη.",
            en: "A 0–100 rating that promises to show how complete your insurance picture is. PolicyWallet no longer calculates one — it states the specific findings instead, and what has not been checked yet.",
        },
        body: [
            {
                el: "Το PolicyWallet δεν υπολογίζει πλέον σκορ προστασίας. Το αφαιρέσαμε τον Αύγουστο του 2026, και ο λόγος αξίζει να ειπωθεί: ένας αριθμός 0–100 δεν μπορούσε να ξεχωρίσει το «δεν βρήκαμε πρόβλημα» από το «δεν μπορέσαμε να ελέγξουμε». Ένα χαρτοφυλάκιο που δεν είχε αναλυθεί ποτέ έπαιρνε την ίδια υψηλή βαθμολογία με ένα που είχε ελεγχθεί και ήταν εντάξει.",
                en: "PolicyWallet no longer calculates a protection score. We removed it in August 2026, and the reason is worth stating: a 0–100 number could not distinguish \"we found no problem\" from \"we could not look\". A portfolio that had never been analysed scored the same as one that had been checked and was fine.",
            },
            {
                el: "Στη θέση του, η εφαρμογή δείχνει τα ίδια τα γεγονότα: πόσα ασφαλιστήρια έχετε, πόσα λήγουν, πόσα δεν έχουν αναλυθεί ακόμη και ποια συγκεκριμένα κενά εντοπίστηκαν — το καθένα με παραπομπή στο δικό σας έγγραφο. Κανένα από αυτά δεν μπορεί να είναι λάθος με τον τρόπο που μπορούσε να είναι λάθος μια βαθμολογία.",
                en: "In its place the app states the facts themselves: how many policies you hold, how many are expiring, how many have not been analysed yet, and which specific gaps were found — each pointing back to your own document. None of those can be wrong in the way a score could be.",
            },
            {
                el: "Ο όρος παραμένει εδώ επειδή τον συναντάτε σε άλλες υπηρεσίες. Αν δείτε κάπου αλλού βαθμολογία προστασίας, αξίζει να ρωτήσετε τι ακριβώς μετρά: το εύρος των καλύψεων που έχετε ή την επάρκειά τους για τις δικές σας ανάγκες. Δεν είναι το ίδιο πράγμα, και μόνο το πρώτο μπορεί να υπολογιστεί από έγγραφα.",
                en: "The term stays here because you will meet it elsewhere. If you see a protection score in another service, it is worth asking what it measures: the breadth of the cover you hold, or whether that cover is enough for your needs. Those are not the same thing, and only the first can be computed from documents.",
            },
        ],
        howToCheck: {
            el: "Στο PolicyWallet, το Σκορ Προστασίας εμφανίζεται στην αρχική σας οθόνη μαζί με την ανάλυση ανά κατηγορία και τη μεθοδολογία του. Είναι ενημερωτική ένδειξη με βάση τα έγγραφα που έχετε ανεβάσει — δεν αποτελεί εξατομικευμένη ασφαλιστική συμβουλή. Για σύσταση προσαρμοσμένη στις ανάγκες σας απευθυνθείτε σε αδειοδοτημένο ασφαλιστικό διαμεσολαβητή.",
            en: "In PolicyWallet the Protection Score appears on your home screen together with the per-category breakdown and its methodology. It is an informational indicator based on the documents you upload — not personalised insurance advice. For a recommendation tailored to your needs, speak to a licensed insurance intermediary.",
        },
        faq: [
            {
                question: {
                    el: "Πώς υπολογίζεται το Σκορ Προστασίας;",
                    en: "How is the Protection Score calculated?",
                },
                answer: {
                    el: "Συγκρίνει τους κλάδους που θα ήταν αναμενόμενοι για το προφίλ σας με αυτούς που έχετε, με σταθμίσεις: Υγεία 25, Ζωή και εισόδημα 25, Ακίνητα και αυτοκίνητο 20, Προστασία εισοδήματος 15, Αστική ευθύνη 10, λοιπά 5. Από το σύνολο αφαιρούνται μονάδες για κενά που εντοπίζονται μέσα στα ασφαλιστήριά σας.",
                    en: "It compares the branches expected for your profile against the ones you hold, weighted: Health 25, Life and income 25, Property and motor 20, Income protection 15, Liability 10, other 5. Points are then deducted for gaps found inside your own policies.",
                },
            },
            {
                question: {
                    el: "Σημαίνει το υψηλό σκορ ότι είμαι επαρκώς ασφαλισμένος;",
                    en: "Does a high score mean I am adequately insured?",
                },
                answer: {
                    el: "Όχι. Το σκορ δείχνει πόσο πλήρης είναι η εικόνα των καλύψεών σας, όχι αν τα ποσά και τα όρια επαρκούν για τη δική σας περίπτωση. Δύο άνθρωποι με το ίδιο σκορ μπορεί να έχουν πολύ διαφορετική πραγματική προστασία.",
                    en: "No. The score shows how complete your coverage picture is, not whether the sums and limits are enough for your situation. Two people with the same score can have very different real protection.",
                },
            },
            {
                question: {
                    el: "Είναι το Σκορ Προστασίας ασφαλιστική συμβουλή;",
                    en: "Is the Protection Score insurance advice?",
                },
                answer: {
                    el: "Όχι. Είναι ενημερωτική ένδειξη που προκύπτει από τα έγγραφα που ανεβάζετε. Το PolicyWallet δεν πουλά ασφάλειες και δεν παίρνει προμήθεια. Για εξατομικευμένη σύσταση απευθυνθείτε σε αδειοδοτημένο ασφαλιστικό διαμεσολαβητή.",
                    en: "No. It is an informational indicator derived from the documents you upload. PolicyWallet sells no insurance and takes no commission. For a personalised recommendation, speak to a licensed insurance intermediary.",
                },
            },
        ],
        related: [
            { label: { el: "Κενό κάλυψης", en: "Coverage gap" }, href: "/guides/kena-kalypsis-ti-einai-pos-ta-vriskete" },
            { label: { el: "Υπασφάλιση", en: "Underinsurance (ypasfalisi)" }, href: "/lexiko/ypasfalisi" },
            { label: { el: "Τι δεν είναι το PolicyWallet", en: "What PolicyWallet is not" }, href: "/compare" },
        ],
        dateModified: "2026-08-06",
    },
]

/** One glossary term by slug, or undefined when the slug is unknown. */
export function getGlossaryTerm(slug: string): GlossaryTerm | undefined {
    return glossaryTerms.find((entry) => entry.slug === slug)
}

/** Lightweight list for the DefinedTermSet schema + the hub grid. */
export function glossaryTermLinks(
    locale: "el" | "en"
): { name: string; path: string }[] {
    return glossaryTerms.map((entry) => ({
        name: entry.term[locale],
        path: `/lexiko/${entry.slug}`,
    }))
}
