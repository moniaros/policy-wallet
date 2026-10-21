import type { LandingContentModel } from "@/types/landing-content"
import { siteConfig } from "@/lib/seo/site"
import { productCategories } from "@/lib/product/catalog"
import { FREE_UP_TO } from "@/lib/marketing/limit-statement"

/**
 * Homepage content model.
 *
 * Two rules this file exists to enforce:
 *
 *  1. **Structured data may only describe what the page shows.** `faq` and
 *     `howItWorks` are rendered on the homepage AND emitted as FAQPage /
 *     HowTo JSON-LD (lib/landing/seo.ts). They used to be emitted without
 *     being rendered — invisible FAQ markup breaks Google's structured-data
 *     policy, and the HowTo advertised four steps against the three the page
 *     actually showed. Change the copy here and both move together.
 *
 *  2. **No invented proof.** A `landingSystem` block used to sit here holding
 *     "10k+ active users", "50k+ policies" and two testimonials from people
 *     who do not exist, plus an unsourced "7 out of 10" statistic. Nothing
 *     rendered it, which is exactly what made it dangerous — it was one
 *     import away from going live. It is gone. Verifiable facts only.
 *
 * This file carries ONLY what the homepage renders: the FAQ, the four
 * how-it-works steps (with their emphasis phrases and closing line), and
 * the homepage SEO meta. A hero block, persona
 * tracks and half a dozen other sections used to sit here unrendered — a
 * second, contradicting hero headline one import away from going live.
 * Positioning copy lives in lib/marketing/positioning.ts and nowhere else.
 *
 * Wording follows lib/marketing/positioning.ts: Greek first, English carrying
 * identical meaning, short sentences, no jargon.
 */
export const landingContent: LandingContentModel = {
    productName: "PolicyWallet",
    /**
     * Rendered on the homepage as the "how it works" section AND emitted as
     * HowTo JSON-LD. Four steps here means four steps on the page — the H2
     * says «Τέσσερα», and tests/unit/landing-how-it-works.test.ts holds the
     * count to it.
     *
     * `description` is the plain sentence that ships in the JSON-LD.
     * `emphasis` is the phrase of that sentence the page renders in bold
     * brand-green — it must be a verbatim substring in BOTH locales, or it
     * silently renders plain. `closing` is the line under the list; it is
     * not a step and never reaches the HowTo.
     */
    howItWorks: {
        title: { el: "Πώς λειτουργεί", en: "How it works" },
        steps: [
            {
                id: "step-upload",
                title: { el: "Ανεβάστε το ασφαλιστήριό σας", en: "Upload your policy" },
                description: {
                    el: "Ανεβάστε ευανάγνωστο έγγραφο. Κρατήστε το πρωτότυπο για να ελέγχετε τις πληροφορίες της ανάλυσης.",
                    en: "Upload a readable document. Keep the original to check information in the analysis.",
                },
                emphasis: { el: "Κρατήστε το πρωτότυπο", en: "Keep the original" },
            },
            {
                id: "step-read",
                title: { el: "Το διαβάζουμε για εσάς", en: "We read it for you" },
                description: {
                    el: "Η εφαρμογή οργανώνει τις πληροφορίες που διαβάζει: καλύψεις, ποσά, ημερομηνίες και εξαιρέσεις.",
                    en: "The application organises the information it reads: cover, amounts, dates and exclusions.",
                },
            },
            {
                id: "step-act",
                title: { el: "Σας εξηγούμε τι αναφέρει", en: "We explain what it says" },
                description: {
                    // Baseline verdict only — "fix first" is a Plus output and
                    // this text also ships inside the home HowTo JSON-LD.
                    el: "Δείτε σημεία που χρειάζονται έλεγχο και συζήτηση με τον ασφαλιστή σας.",
                    en: "See points that need checking and discussion with your adviser.",
                },
                emphasis: { el: "χρειάζονται έλεγχο", en: "need checking" },
            },
            {
                // §6 asks four steps. The fourth is the one that keeps being
                // true after day one: renewal reminders and change tracking
                // are live capabilities, so the step promises exactly them.
                id: "step-monitor",
                title: { el: "Παρακολουθείτε τις ημερομηνίες", en: "Keep track of dates" },
                description: {
                    el: "Δείτε πότε λήγουν τα ασφαλιστήριά σας και πάρτε υπενθύμιση πριν λήξουν· με το Plus, από 90 ημέρες πριν. Όταν ανεβάζετε την ανανέωση, βλέπετε τι άλλαξε.",
                    en: "See when your policies expire and get a reminder before they do; with Plus, from 90 days ahead. When you upload a renewal, you see what changed.",
                },
                emphasis: { el: "βλέπετε τι άλλαξε", en: "see what changed" },
            },
        ],
        closing: {
            lead: { el: "Εσείς αποφασίζετε.", en: "You decide." },
            rest: { el: "Εμείς σας δίνουμε τα δεδομένα.", en: "We give you the facts." },
        },
    },
    /**
     * Rendered on the homepage AND emitted as FAQPage JSON-LD. Every question
     * here must be visible on the page.
     */
    faq: {
        title: { el: "Συχνές ερωτήσεις", en: "Common questions" },
        items: [
            {
                // One-line definition, first in the list: answer engines and
                // featured snippets extract "X is a..." sentences from here.
                id: "faq-what-is-policywallet",
                question: { el: "Τι είναι το PolicyWallet;", en: "What is PolicyWallet?" },
                answer: {
                    el: siteConfig.definition.el,
                    en: siteConfig.definition.en,
                },
            },
            {
                id: "faq-do-you-sell-insurance",
                question: { el: "Μου πουλάτε ασφάλεια;", en: "Are you going to sell me insurance?" },
                answer: {
                    // NOT «πληρωνόμαστε μόνο από εσάς»: that is the funding
                    // claim deliverable 1 §5 retired — it breaks the day an
                    // institution pays for an embedded deployment. The claims
                    // that survive every scenario: no commission, identical
                    // analysis whoever issued the policy.
                    el: "Δεν πουλάμε ασφαλιστήρια και δεν λαμβάνουμε προμήθεια από την πώλησή τους. Τα έσοδά μας προέρχονται από συνδρομές.",
                    en: "We do not sell insurance policies or receive commission from their sale. Our revenue comes from subscriptions.",
                },
            },
            {
                id: "faq-data-security",
                question: { el: "Είναι ασφαλή τα δεδομένα μου;", en: "Is my data safe?" },
                answer: {
                    el: "Τα έγγραφα αποθηκεύονται κρυπτογραφημένα στην ΕΕ. Για ανάλυση με τεχνητή νοημοσύνη ζητάμε συγκατάθεση. Ορισμένοι τεχνικοί πάροχοι μπορεί να επεξεργάζονται στοιχεία εκτός ΕΕ· δείτε την Πολιτική Απορρήτου και τον κατάλογο παρόχων.",
                    en: "Documents are stored encrypted in the EU. We ask for consent for AI analysis. Some technical providers may process data outside the EU; see our Privacy Policy and provider list.",
                },
            },
            {
                id: "faq-carriers-visibility",
                question: { el: "Μπορεί η ασφαλιστική μου να δει τα δεδομένα μου;", en: "Can my insurance company see my data?" },
                answer: {
                    el: "Επιλέγετε τι μοιράζεστε με τον ασφαλιστή σας. Η υπηρεσία χρησιμοποιεί και τεχνικούς παρόχους για αποθήκευση, ανάλυση και λειτουργία. Η Πολιτική Απορρήτου εξηγεί ποιος χρησιμοποιεί ποια στοιχεία.",
                    en: "You choose what to share with your adviser. The service also uses technical providers for storage, analysis and operation. Our Privacy Policy explains who uses which data.",
                },
            },
            {
                // The branch count is derived from the live product catalog so
                // this answer (which also ships as FAQPage JSON-LD) can never
                // claim more branches than the site actually documents.
                id: "faq-which-insurers",
                question: { el: "Δουλεύει με την ασφαλιστική μου;", en: "Does it work with my insurance company?" },
                answer: {
                    el: `Ναι. Διαβάζουμε ασφαλιστήρια από κάθε ασφαλιστική εταιρεία που δραστηριοποιείται στην Ελλάδα, σε ${productCategories.length} είδη ασφάλισης — από αυτοκίνητο και κατοικία μέχρι υγεία, ομαδικά και κατοικίδια. Αρκεί να έχετε το αρχείο.`,
                    en: `Yes. We read policies from every insurance company operating in Greece, across ${productCategories.length} types of insurance — from car and home to health, group schemes and pets. All we need is the file.`,
                },
            },
            {
                id: "faq-cost",
                question: { el: "Πόσο κοστίζει;", en: "How much does it cost?" },
                answer: {
                    el: `Το δωρεάν πλάνο περιλαμβάνει ${FREE_UP_TO.el}. Οι λειτουργίες διαφέρουν ανά πλάνο. Δείτε τις τρέχουσες τιμές και τι περιλαμβάνει κάθε επιλογή στη σελίδα τιμών.`,
                    en: `The free plan includes ${FREE_UP_TO.en}. Features vary by plan. See current prices and what each option includes on the pricing page.`,
                },
            },
            {
                id: "faq-no-agent",
                question: { el: "Τι γίνεται αν δεν έχω ασφαλιστή;", en: "What if I do not have an agent?" },
                // Working with an agent is `agentCollaboration`, which is true
                // only on the `pro` plan — displayed as Family. This
                // is the answer the anxious free-signup reader lands on, and it
                // was the one agent claim on the site with no plan named, while
                // the "Who can help you?" card and the pricing table both fence
                // the same capability to Plus. It also ships inside FAQPage
                // JSON-LD, so an unqualified version travels further than the page.
                answer: {
                    el: "Μπορείτε να οργανώνετε και να διαβάζετε τα έγγραφά σας χωρίς να συνδέσετε ασφαλιστή. Για συμβουλή σχετικά με την ασφάλισή σας, απευθυνθείτε σε αδειοδοτημένο επαγγελματία.",
                    en: "You can organise and read your documents without connecting an adviser. For advice about your insurance, consult a licensed professional.",
                },
            },
            {
                id: "faq-ai-accuracy",
                // «του AI», matching /pricing's «από το AI» — the site gave "AI" two
                // grammatical genders depending on the page.
                question: { el: "Πόσο σωστή είναι η ανάλυση του AI;", en: "How accurate is the AI analysis?" },
                answer: {
                    el: "Η τεχνητή νοημοσύνη μπορεί να κάνει λάθη ή να παραλείψει πληροφορίες. Ελέγχετε τα ποσά, τις εξαιρέσεις και τις σημαντικές αποφάσεις με το πρωτότυπο ασφαλιστήριο και τον ασφαλιστή σας.",
                    en: "AI can make mistakes or miss information. Check amounts, exclusions and important decisions against the original policy and with your adviser.",
                },
            },
        ],
    },
    seo: {
        el: {
            locale: "el",
            path: "/",
            title: "Τι πραγματικά καλύπτουν τα ασφαλιστήριά σας | PolicyWallet",
            description:
                "Οργανώστε τα ασφαλιστήριά σας, διαβάστε τους όρους σε απλή γλώσσα και δείτε τι χρειάζεται έλεγχο. Οι λειτουργίες διαφέρουν ανά πλάνο.",
            keywords: [
                "έλεγχος ασφάλισης",
                "κενά κάλυψης",
                "ανάλυση ασφαλιστηρίου AI",
                "οργάνωση ασφαλιστηρίων",
                "PolicyWallet",
            ],
            ogTitle: "Τι πραγματικά καλύπτουν τα ασφαλιστήριά σας | PolicyWallet",
            ogDescription:
                "Δείτε τι γράφει κάθε ασφαλιστήριο.",
            twitterTitle: "PolicyWallet | Τα ασφαλιστήριά σας, με απλά λόγια",
            twitterDescription: "Ένα μέρος για τα έγγραφα, τις καλύψεις και τις ημερομηνίες σας.",
        },
        en: {
            locale: "en",
            path: "/en",
            title: "Know what your policies actually cover | PolicyWallet",
            description:
                "Organise your policies, read terms in plain language and see what needs checking. Features vary by plan.",
            keywords: [
                "insurance check",
                "coverage gaps",
                "AI policy analysis",
                "insurance policy organiser",
                "PolicyWallet",
            ],
            ogTitle: "Know what your policies actually cover | PolicyWallet",
            ogDescription:
                "See what each policy says.",
            twitterTitle: "PolicyWallet | Your policies, in plain language",
            twitterDescription: "A place for your policy documents, covers and dates.",
        },
    },
}
