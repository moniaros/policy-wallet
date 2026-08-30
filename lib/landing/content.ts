import type { LandingContentModel } from "@/types/landing-content"
import { siteConfig } from "@/lib/seo/site"
import { productCategories } from "@/lib/product/catalog"

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
                title: { el: "Ανεβάστε το συμβόλαιό σας", en: "Upload your policy" },
                description: {
                    el: "PDF ή φωτογραφία, από οποιαδήποτε ασφαλιστική. Δεν χρειάζεται να το διαβάσετε.",
                    en: "A PDF or a photo, from any insurance company. You do not need to read it.",
                },
                emphasis: { el: "Δεν χρειάζεται", en: "You do not need" },
            },
            {
                id: "step-read",
                title: { el: "Το διαβάζουμε για εσάς", en: "We read it for you" },
                description: {
                    el: "Βρίσκουμε τι καλύπτει, τι δεν καλύπτει και πότε λήγει.",
                    en: "We find what it covers, what it does not cover, and when it runs out.",
                },
            },
            {
                id: "step-act",
                title: { el: "Σας δείχνουμε την αλήθεια", en: "We show you the truth" },
                description: {
                    // Baseline verdict only — "fix first" is a Plus output and
                    // this text also ships inside the home HowTo JSON-LD.
                    el: "Σας εξηγούμε με απλά λόγια τι καλύπτουν τα ασφαλιστήριά σας και τι μπορεί να σας λείπει.",
                    en: "We explain in plain words what your policies cover and what may be missing.",
                },
                emphasis: { el: "τι μπορεί να σας λείπει", en: "what may be missing" },
            },
            {
                // §6 asks four steps. The fourth is the one that keeps being
                // true after day one: renewal reminders and change tracking
                // are live capabilities, so the step promises exactly them.
                id: "step-monitor",
                title: { el: "Μένετε πάντα ενημερωμένοι", en: "You always stay informed" },
                description: {
                    el: "Σας ειδοποιούμε πριν από κάθε λήξη — και όταν έρθει το νέο συμβόλαιο, βλέπετε τι άλλαξε.",
                    en: "We remind you before every expiry — and when the new policy arrives, you see what changed.",
                },
                emphasis: { el: "βλέπετε τι άλλαξε", en: "you see what changed" },
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
                    el: "Όχι. Δεν είμαστε ασφαλιστική εταιρεία, δεν πουλάμε συμβόλαια και δεν παίρνουμε προμήθεια από καμία εταιρεία. Η ανάλυση είναι ίδια για κάθε συμβόλαιο, όποιος κι αν το εξέδωσε — η απάντηση που παίρνετε δεν έχει λόγο να είναι μεροληπτική.",
                    en: "No. We are not an insurance company, we sell no policies, and we take no commission from any company. The analysis is the same for every policy, whoever issued it — the answer you get has no reason to be biased.",
                },
            },
            {
                id: "faq-data-security",
                question: { el: "Είναι ασφαλή τα δεδομένα μου;", en: "Is my data safe?" },
                answer: {
                    el: "Ναι. Τα αρχεία σας αποθηκεύονται κρυπτογραφημένα σε διακομιστές μέσα στην Ευρωπαϊκή Ένωση, και τα έγγραφά σας δεν χρησιμοποιούνται για την εκπαίδευση μοντέλων AI. Μπορείτε να ζητήσετε αντίγραφο ή πλήρη διαγραφή όποτε θέλετε.",
                    en: "Yes. Your files are stored encrypted on servers inside the European Union, and your documents are not used to train AI models. You can ask for a copy or a full deletion whenever you want.",
                },
            },
            {
                id: "faq-carriers-visibility",
                question: { el: "Μπορεί η ασφαλιστική μου να δει τα δεδομένα μου;", en: "Can my insurance company see my data?" },
                answer: {
                    el: "Όχι. Κανείς δεν βλέπει τα συμβόλαιά σας εκτός αν εσείς επιλέξετε ρητά να τα μοιραστείτε — για παράδειγμα με τον ασφαλιστή σας. Την άδεια τη δίνετε και την παίρνετε πίσω εσείς.",
                    en: "No. Nobody sees your policies unless you explicitly choose to share them — with your own agent, for example. You give that permission and you can take it back.",
                },
            },
            {
                // The branch count is derived from the live product catalog so
                // this answer (which also ships as FAQPage JSON-LD) can never
                // claim more branches than the site actually documents.
                id: "faq-which-insurers",
                question: { el: "Δουλεύει με την ασφαλιστική μου;", en: "Does it work with my insurance company?" },
                answer: {
                    el: `Ναι. Διαβάζουμε συμβόλαια από κάθε ασφαλιστική εταιρεία που δραστηριοποιείται στην Ελλάδα, σε ${productCategories.length} είδη ασφάλισης — από αυτοκίνητο και κατοικία μέχρι υγεία, ομαδικά και κατοικίδια. Αρκεί να έχετε το αρχείο.`,
                    en: `Yes. We read policies from every insurance company operating in Greece, across ${productCategories.length} types of insurance — from car and home to health, group schemes and pets. All we need is the file.`,
                },
            },
            {
                id: "faq-cost",
                question: { el: "Πόσο κοστίζει;", en: "How much does it cost?" },
                answer: {
                    el: "Ξεκινάτε δωρεάν με 3 ασφαλιστήρια και πλήρη ανάλυση AI, χωρίς πιστωτική κάρτα. Τα πληρωμένα πλάνα ξεκινούν από €39 τον χρόνο και τα ακυρώνετε όποτε θέλετε.",
                    en: "You start free with 3 policies and full AI analysis, with no credit card. Paid plans start at €39 a year and you can cancel whenever you want.",
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
                    el: "Δεν χρειάζεστε. Το PolicyWallet δουλεύει πλήρως μόνο του. Αν αργότερα θέλετε να συνεργαστείτε με ασφαλιστή, τον συνδέετε με ένα κλικ — με το πλάνο Family.",
                    en: "You do not need one. PolicyWallet works completely on its own. If you later want to work with an agent, you can connect one with a single click — on the Family plan.",
                },
            },
            {
                id: "faq-ai-accuracy",
                // «του AI», matching /pricing's «από το AI» — the site gave "AI" two
                // grammatical genders depending on the page.
                question: { el: "Πόσο σωστή είναι η ανάλυση του AI;", en: "How accurate is the AI analysis?" },
                answer: {
                    el: "Παίρνετε γρήγορη, πρακτική εικόνα για το τι καλύπτεστε και τι όχι. Δεν αντικαθιστά τους όρους του συμβολαίου ούτε τον ασφαλιστή σας — σας δείχνουμε τι αξίζει να ελέγξετε και αποφασίζετε εσείς.",
                    en: "You get a fast, practical picture of what you are covered for and what you are not. It does not replace the policy terms or your agent — we show you what is worth checking, and you decide.",
                },
            },
        ],
    },
    seo: {
        el: {
            locale: "el",
            path: "/",
            title: "Μάθετε τι πραγματικά καλύπτουν τα συμβόλαιά σας | PolicyWallet",
            description:
                "Ανεβάστε κάθε ασφαλιστήριο, από κάθε εταιρεία. Η ανάλυση εξηγεί καλύψεις, εξαιρέσεις και κενά σε απλά ελληνικά — χωρίς πώληση, χωρίς προμήθεια.",
            keywords: [
                "έλεγχος ασφάλισης",
                "κενά κάλυψης",
                "ανάλυση ασφαλιστηρίου AI",
                "ανεξάρτητος έλεγχος ρίσκου",
                "PolicyWallet",
            ],
            ogTitle: "Μάθετε τι πραγματικά καλύπτουν τα συμβόλαιά σας | PolicyWallet",
            ogDescription:
                "Διαβάζουμε τις ασφάλειές σας και σας λέμε πού είστε καλυμμένοι και πού όχι — και, με το Family, τι να διορθώσετε πρώτα.",
            twitterTitle: "PolicyWallet | Ανεξάρτητος έλεγχος ρίσκου",
            twitterDescription: "Δεν πουλάμε ασφάλειες. Σας λέμε τι δεν καλύπτεστε.",
        },
        en: {
            locale: "en",
            path: "/en",
            title: "Know what your policies actually cover | PolicyWallet",
            description:
                "Upload every policy, from every insurer. The analysis explains cover, exclusions and gaps in plain language — nothing sold, no commission taken.",
            keywords: [
                "insurance check",
                "coverage gaps",
                "AI policy analysis",
                "independent risk check",
                "PolicyWallet",
            ],
            ogTitle: "Know what your policies actually cover | PolicyWallet",
            ogDescription:
                "We read your insurance and tell you where you are covered and where you are not — and, with Family, what to fix first.",
            twitterTitle: "PolicyWallet | An independent risk check",
            twitterDescription: "We do not sell insurance. We tell you what you are not covered for.",
        },
    },
}
