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
 * This file carries ONLY what the homepage renders: the FAQ, the three
 * how-it-works steps, and the homepage SEO meta. A hero block, persona
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
     * HowTo JSON-LD. Three steps here means three steps on the page.
     */
    howItWorks: {
        title: { el: "Πώς λειτουργεί", en: "How it works" },
        steps: [
            {
                id: "step-upload",
                title: { el: "Στείλτε το συμβόλαιο", en: "Send us the policy" },
                description: {
                    el: "PDF ή φωτογραφία, από οποιαδήποτε ασφαλιστική. Δεν χρειάζεται να το διαβάσετε.",
                    en: "A PDF or a photo, from any insurance company. You do not need to read it.",
                },
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
                title: { el: "Παίρνετε καθαρή απάντηση", en: "You get a clear answer" },
                description: {
                    // Baseline verdict only — "fix first" is a Plus output and
                    // this text also ships inside the home HowTo JSON-LD.
                    el: "Σας λέμε αν είστε καλυμμένοι, με απλά λόγια. Εσείς αποφασίζετε.",
                    en: "We tell you if you are covered, in plain words. You decide.",
                },
            },
        ],
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
                    el: "Όχι. Δεν είμαστε ασφαλιστική εταιρεία, δεν πουλάμε συμβόλαια και δεν παίρνουμε προμήθεια από καμία εταιρεία. Πληρωνόμαστε μόνο από τη δική σας συνδρομή, γι' αυτό η απάντηση που παίρνετε δεν έχει λόγο να είναι μεροληπτική.",
                    en: "No. We are not an insurance company, we sell no policies, and we take no commission from any company. We are paid only by you, through your subscription, which is why the answer you get has no reason to be biased.",
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
                    el: "Ξεκινάτε δωρεάν με 1 συμβόλαιο και βασική σύνοψη AI, χωρίς πιστωτική κάρτα. Τα πληρωμένα πλάνα ξεκινούν από €2.99 τον μήνα και τα ακυρώνετε όποτε θέλετε.",
                    en: "You start free with 1 policy and a basic AI summary, with no credit card. Paid plans start at €2.99 a month and you can cancel whenever you want.",
                },
            },
            {
                id: "faq-no-agent",
                question: { el: "Τι γίνεται αν δεν έχω ασφαλιστή;", en: "What if I do not have an agent?" },
                // Working with an agent is `agentCollaboration`, which is true
                // only on the `pro` plan — displayed as PolicyWallet Plus. This
                // is the answer the anxious free-signup reader lands on, and it
                // was the one agent claim on the site with no plan named, while
                // the "Who can help you?" card and the pricing table both fence
                // the same capability to Plus. It also ships inside FAQPage
                // JSON-LD, so an unqualified version travels further than the page.
                answer: {
                    el: "Δεν χρειάζεστε. Το PolicyWallet δουλεύει πλήρως μόνο του. Αν αργότερα θέλετε να συνεργαστείτε με ασφαλιστή, τον συνδέετε με ένα κλικ — με το πλάνο PolicyWallet Plus.",
                    en: "You do not need one. PolicyWallet works completely on its own. If you later want to work with an agent, you can connect one with a single click — on the PolicyWallet Plus plan.",
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
            title: "PolicyWallet | Δείτε τι δεν καλύπτει η ασφάλειά σας",
            description:
                "Ανεξάρτητος έλεγχος ρίσκου με AI. Δείτε πού είστε καλυμμένοι και πού έχετε κενά. Δεν πουλάμε ασφάλειες. Δωρεάν βασική σύνοψη για 1 συμβόλαιο.",
            keywords: [
                "έλεγχος ασφάλισης",
                "κενά κάλυψης",
                "ανάλυση ασφαλιστηρίου AI",
                "ανεξάρτητος έλεγχος ρίσκου",
                "PolicyWallet",
            ],
            ogTitle: "PolicyWallet | Δείτε τι δεν καλύπτει η ασφάλειά σας",
            ogDescription:
                "Διαβάζουμε τις ασφάλειές σας και σας λέμε πού είστε καλυμμένοι, πού όχι και — με το PolicyWallet Plus — τι να διορθώσετε πρώτα.",
            twitterTitle: "PolicyWallet | Ανεξάρτητος έλεγχος ρίσκου",
            twitterDescription: "Δεν πουλάμε ασφάλειες. Σας λέμε τι δεν καλύπτεστε.",
        },
        en: {
            locale: "en",
            path: "/en",
            title: "PolicyWallet | See what your insurance does not cover",
            description:
                "An independent risk check powered by AI. See where you are covered and where the gaps are. We do not sell insurance. Free basic summary for 1 policy.",
            keywords: [
                "insurance check",
                "coverage gaps",
                "AI policy analysis",
                "independent risk check",
                "PolicyWallet",
            ],
            ogTitle: "PolicyWallet | See what your insurance does not cover",
            ogDescription:
                "We read your insurance and tell you where you are covered, where you are not, and — with PolicyWallet Plus — what to fix first.",
            twitterTitle: "PolicyWallet | An independent risk check",
            twitterDescription: "We do not sell insurance. We tell you what you are not covered for.",
        },
    },
}
