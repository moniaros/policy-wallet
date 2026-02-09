import type { LandingContentModel } from "@/types/landing-content"

export const landingContent: LandingContentModel = {
    productName: "PolicyWallet",
    defaultLocale: "el",
    sections: [
        { id: "hero", title: { el: "Hero", en: "Hero" } },
        { id: "personas", title: { el: "Ρόλοι", en: "Personas" } },
        { id: "how-it-works", title: { el: "Πώς λειτουργεί", en: "How it works" } },
        { id: "ai-extraction", title: { el: "Αξία AI", en: "AI value" } },
        { id: "collaboration", title: { el: "Συνεργασία", en: "Collaboration" } },
        { id: "qa-upgrade", title: { el: "Q&A και αναβάθμιση", en: "Q&A and upgrade" } },
        { id: "trust", title: { el: "Εμπιστοσύνη", en: "Trust" } },
        { id: "security", title: { el: "Ασφάλεια", en: "Security" } },
        { id: "faq", title: { el: "Συχνές ερωτήσεις", en: "FAQ" } },
        { id: "final-cta", title: { el: "Τελικό CTA", en: "Final CTA" } },
        { id: "footer-links", title: { el: "Σύνδεσμοι", en: "Footer links" } },
    ],
    hero: {
        badge: {
            el: "Gemini-powered AI guidance",
            en: "Gemini-powered AI guidance",
        },
        title: {
            el: "Το ασφαλιστικό σου πορτοφόλι, όπως θα έπρεπε να είναι.",
            en: "Your insurance wallet, finally done right.",
        },
        subtitle: {
            el: "Βάλε τάξη στα συμβόλαιά σου, πάρε καθαρές απαντήσεις και συνεργάσου εύκολα με τον πράκτορά σου ή την οικογένειά σου σε ένα ασφαλές περιβάλλον.",
            en: "Bring all your policies into one clear workspace, get confident answers, and collaborate securely with your agent or family.",
        },
        primaryCta: {
            el: "Ξεκίνα δωρεάν ως ασφαλισμένος",
            en: "Start free as policyholder",
        },
        secondaryCta: {
            el: "Έχω πρόσκληση από πράκτορα",
            en: "I have an agent invite",
        },
        tertiaryCta: {
            el: "Είμαι ασφαλιστικός πράκτορας",
            en: "I'm an insurance agent",
        },
    },
    personaTracks: [
        {
            id: "policyholder",
            title: { el: "Για ασφαλισμένους", en: "For policyholders" },
            bullets: [
                {
                    el: "Όλα τα συμβόλαιά σου σε ένα σημείο, χωρίς ψάξιμο",
                    en: "Keep every policy in one place without the paperwork chase",
                },
                {
                    el: "Κατάλαβε άμεσα τι σε καλύπτει και τι θέλει προσοχή",
                    en: "Understand what protects you and what needs attention",
                },
                {
                    el: "Μοιράσου με πράκτορα ή οικογένεια με πλήρη έλεγχο",
                    en: "Share with your agent or family with full control",
                },
            ],
            ctaLabel: { el: "Δημιουργία λογαριασμού", en: "Create account" },
            ctaHref: "/auth/signup?role=policyholder&source=landing_persona_policyholder",
        },
        {
            id: "agent",
            title: { el: "Για πράκτορες και agencies", en: "For agents & agencies" },
            bullets: [
                {
                    el: "Πιο γρήγορο onboarding πελάτη με κοινή εικόνα συμβολαίων",
                    en: "Onboard clients faster with shared policy visibility",
                },
                {
                    el: "Εντόπισε νωρίτερα ευκαιρίες και κρίσιμες ανανεώσεις",
                    en: "Spot renewal and coverage opportunities earlier",
                },
                {
                    el: "Δούλεψε διαφανώς με τον πελάτη σε κοινό περιβάλλον",
                    en: "Work transparently with clients in one shared workspace",
                },
            ],
            ctaLabel: { el: "Εγγραφή πράκτορα", en: "Agent signup" },
            ctaHref: "/auth/signup?role=agent&source=landing_persona_agent",
        },
    ],
    howItWorks: {
        title: {
            el: "Πώς λειτουργεί",
            en: "How it works",
        },
        steps: [
            {
                id: "step-a",
                title: { el: "Ανεβάζεις το συμβόλαιο", en: "Upload your policy" },
                description: {
                    el: "Ανέβασε PDF σε λίγα δευτερόλεπτα.",
                    en: "Upload your PDF in seconds.",
                },
            },
            {
                id: "step-b",
                title: { el: "Παίρνεις καθαρή εικόνα", en: "Get instant clarity" },
                description: {
                    el: "Η πλατφόρμα οργανώνει αυτόματα την πληροφορία ώστε να βρίσκεις τα σημαντικά.",
                    en: "The platform organizes key information so you can focus on what matters.",
                },
            },
            {
                id: "step-c",
                title: { el: "Συνεργάζεσαι όπως θες", en: "Collaborate your way" },
                description: {
                    el: "Μοιράζεσαι με πράκτορα ή οικογένεια ή λαμβάνεις κοινή πρόσβαση από πράκτορα.",
                    en: "Share with your agent or family, or receive shared access from your agent.",
                },
            },
            {
                id: "step-d",
                title: { el: "Ρωτάς το AI", en: "Ask policy AI" },
                description: {
                    el: "Κάνε ερωτήσεις για το συμβόλαιό σου και πάρε άμεσες απαντήσεις στο σωστό context.",
                    en: "Ask questions about your policy and get fast, context-aware answers.",
                },
            },
        ],
    },
    aiExtraction: {
        title: {
            el: "Από το έγγραφο στη σωστή απόφαση",
            en: "From document to decision",
        },
        subtitle: {
            el: "Δεν χρειάζεται να διαβάζεις σελίδες με όρους. Βλέπεις άμεσα τι είναι σημαντικό για εσένα.",
            en: "No more reading pages of legal wording. See what matters for your decisions, instantly.",
        },
        fields: [
            { el: "Άμεση σύνοψη των βασικών σημείων", en: "Instant summary of the key points" },
            { el: "Καθαρή εικόνα για καλύψεις, όρια και κρίσιμες ημερομηνίες", en: "Clear view of coverage, limits, and critical dates" },
            { el: "Καλύτερη προετοιμασία πριν από κάθε συζήτηση με πράκτορα", en: "Better preparation before every agent conversation" },
            { el: "Πιο γρήγορες αποφάσεις για ανανέωση ή αλλαγές", en: "Faster decisions for renewals and changes" },
            { el: "Δίγλωσση εμπειρία σε Ελληνικά και Αγγλικά", en: "Bilingual experience in Greek and English" },
            { el: "Έλεγχος και διόρθωση από εσένα όταν χρειάζεται", en: "Review and edit control whenever needed" },
        ],
        reviewNote: {
            el: "Το AI βοηθά, αλλά η τελική απόφαση είναι πάντα δική σου.",
            en: "AI assists, but the final decision stays with you.",
        },
    },
    collaboration: {
        title: {
            el: "Συνεργασία και από τις δύο πλευρές",
            en: "Two-way collaboration",
        },
        tracks: [
            {
                id: "agent_to_customer",
                title: {
                    el: "Ροή πράκτορα προς πελάτη",
                    en: "Agent-to-customer flow",
                },
                points: [
                    {
                        el: "Ο πράκτορας ανεβάζει το συμβόλαιο και το μοιράζεται άμεσα.",
                        en: "The agent uploads and shares the policy instantly.",
                    },
                    {
                        el: "Ο πελάτης αποκτά πρόσβαση σε κοινή εικόνα χωρίς καθυστέρηση.",
                        en: "The customer gets shared visibility without delay.",
                    },
                    {
                        el: "Τα δικαιώματα πρόσβασης παραμένουν ελεγχόμενα.",
                        en: "Access remains permission-controlled.",
                    },
                ],
            },
            {
                id: "policyholder_to_agent",
                title: {
                    el: "Ροή πελάτη προς πράκτορα",
                    en: "Policyholder-to-agent flow",
                },
                points: [
                    {
                        el: "Ο ασφαλισμένος ανεβάζει και μοιράζεται το συμβόλαιο.",
                        en: "The policyholder uploads and shares the policy.",
                    },
                    {
                        el: "Ο πράκτορας βλέπει μόνο ό,τι έχει εγκριθεί.",
                        en: "The agent sees only what has been approved.",
                    },
                    {
                        el: "Η συνεργασία βασίζεται πάντα στη συναίνεση.",
                        en: "Collaboration is always consent-based.",
                    },
                ],
            },
        ],
    },
    qaUpgrade: {
        title: {
            el: "Ρώτα το AI για το συμβόλαιό σου",
            en: "Ask AI about your policy",
        },
        subtitle: {
            el: "Ξεκινάς άμεσα με βασικά όρια χρήσης και αναβαθμίζεις εύκολα όταν χρειάζεσαι περισσότερη υποστήριξη.",
            en: "Start with clear baseline usage limits and upgrade easily when you need more AI support.",
        },
        bullets: [
            { el: "Απαντήσεις σχετικές μόνο με το δικό σου συμβόλαιο", en: "Answers scoped to your specific policy" },
            { el: "Καθαρά όρια χρήσης στα βασικά πλάνα", en: "Clear usage limits on baseline plans" },
            { el: "Απλή αναβάθμιση για αυξημένη χρήση AI", en: "Simple upgrades for higher AI usage" },
        ],
        pricingCta: { el: "Δείτε πλάνα και τιμές", en: "View pricing and plans" },
    },
    trust: {
        title: {
            el: "Εμπιστοσύνη που χτίζεται στην πράξη",
            en: "Trust built through real usage",
        },
        bullets: [
            { el: "Πραγματική εμπειρία προϊόντος, όχι υποσχέσεις", en: "Real product workflow, not empty promises" },
            { el: "Συνεργασία ασφαλισμένου και πράκτορα σε κοινή βάση", en: "Policyholder-agent collaboration in one shared context" },
            { el: "Διαφανής έλεγχος πρόσβασης σε κάθε βήμα", en: "Transparent access control at every step" },
            { el: "Καθαρή ενημέρωση για όρια και αναβαθμίσεις", en: "Clear communication for limits and upgrades" },
            { el: "Απλή, επαγγελματική γλώσσα χωρίς περιττό jargon", en: "Professional, simple language without jargon" },
        ],
    },
    security: {
        title: { el: "Ασφάλεια και ιδιωτικότητα", en: "Security and privacy" },
        bullets: [
            { el: "Κρυπτογράφηση και ασφαλής αποθήκευση", en: "Encryption and secure storage" },
            { el: "Δικαιώματα πρόσβασης ανά ρόλο", en: "Role-based access controls" },
            { el: "Κοινοποίηση μόνο με συναίνεση", en: "Consent-based sharing only" },
            { el: "Ανεξάρτητη πλατφόρμα, στο πλευρό του χρήστη", en: "Independent platform aligned to user interests" },
        ],
    },
    faq: {
        title: { el: "Συχνές ερωτήσεις", en: "Frequently asked questions" },
        items: [
            {
                id: "faq-roles",
                question: {
                    el: "Σε ποιους απευθύνεται το PolicyWallet;",
                    en: "Who is PolicyWallet for?",
                },
                answer: {
                    el: "Σε ασφαλισμένους και ασφαλιστικούς πράκτορες ή agencies που θέλουν κοινή και καθαρή εικόνα των συμβολαίων.",
                    en: "It is built for policyholders and insurance agents/agencies that need shared, clear policy visibility.",
                },
            },
            {
                id: "faq-sharing",
                question: {
                    el: "Πώς λειτουργεί ο διαμοιρασμός με πράκτορα;",
                    en: "How does sharing with an agent work?",
                },
                answer: {
                    el: "Είτε ο πράκτορας μοιράζεται συμβόλαια με τον πελάτη, είτε ο πελάτης μοιράζεται με τον πράκτορα. Πάντα με ελεγχόμενα δικαιώματα.",
                    en: "Either the agent shares policies with the customer, or the customer shares with the agent, always with controlled permissions.",
                },
            },
            {
                id: "faq-ai-analysis",
                question: {
                    el: "Τι αξία μου δίνει το AI;",
                    en: "What value does the AI provide?",
                },
                answer: {
                    el: "Σου δίνει γρήγορη κατανόηση του συμβολαίου και πιο σίγουρες αποφάσεις, χωρίς να χάνεις χρόνο σε περίπλοκη ορολογία.",
                    en: "It gives you faster policy understanding and more confident decisions without wasting time on complex wording.",
                },
            },
            {
                id: "faq-language",
                question: {
                    el: "Υποστηρίζονται Ελληνικά και Αγγλικά;",
                    en: "Are Greek and English supported?",
                },
                answer: {
                    el: "Ναι. Η εμπειρία είναι διαθέσιμη στα Ελληνικά και στα Αγγλικά.",
                    en: "Yes. The experience is available in both Greek and English.",
                },
            },
            {
                id: "faq-limits",
                question: {
                    el: "Υπάρχουν όρια στη χρήση AI;",
                    en: "Are there limits for AI usage?",
                },
                answer: {
                    el: "Ναι. Στα βασικά πλάνα υπάρχουν όρια χρήσης και μπορείς να αναβαθμίσεις όποτε χρειαστεί.",
                    en: "Yes. Baseline plans include usage limits, and you can upgrade whenever needed.",
                },
            },
        ],
    },
    finalCta: {
        title: {
            el: "Ξεκίνα σήμερα, με τον ρόλο που σου ταιριάζει",
            en: "Start today in the role that fits you",
        },
        subtitle: {
            el: "Λιγότερη πολυπλοκότητα, περισσότερη σιγουριά για κάθε συμβόλαιο.",
            en: "Less complexity, more confidence for every policy.",
        },
        policyholderCta: {
            el: "Ξεκίνα ως ασφαλισμένος",
            en: "Start as policyholder",
        },
        agentCta: {
            el: "Ξεκίνα ως πράκτορας",
            en: "Start as agent",
        },
    },
    footer: {
        linksLabel: { el: "Σύνδεσμοι SEO", en: "SEO links" },
        helpLabel: { el: "Βοήθεια", en: "Help docs" },
    },
    seo: {
        el: {
            locale: "el",
            path: "/",
            title: "PolicyWallet | Insurance Wallet για Ασφαλισμένους και Πράκτορες",
            description:
                "Οργάνωσε τα συμβόλαιά σου, συνεργάσου εύκολα με τον πράκτορά σου και πάρε καθαρές απαντήσεις με Gemini-powered AI.",
            keywords: [
                "ασφαλιστικό πορτοφόλι",
                "διαχείριση συμβολαίων",
                "ανάλυση ασφαλιστηρίου με AI",
                "μοιρασμός ασφαλιστηρίου με πράκτορα",
                "policyholder agent collaboration",
            ],
            ogTitle: "PolicyWallet | Το σύγχρονο ασφαλιστικό πορτοφόλι",
            ogDescription: "Καθαρή εικόνα συμβολαίων, συνεργασία με πράκτορα και Gemini-powered AI guidance.",
            twitterTitle: "PolicyWallet | Insurance wallet με AI",
            twitterDescription: "Όλα τα συμβόλαιά σου σε ένα ασφαλές, συνεργατικό περιβάλλον.",
        },
        en: {
            locale: "en",
            path: "/en",
            title: "PolicyWallet | Insurance Wallet for Policyholders and Agents",
            description:
                "Organize policies, collaborate with your agent, and get confident answers with Gemini-powered AI in one secure workspace.",
            keywords: [
                "insurance wallet",
                "policy management app",
                "policyholder agent collaboration",
                "ask AI about policy",
                "insurance app pricing",
            ],
            ogTitle: "PolicyWallet | The modern insurance wallet",
            ogDescription: "Clear policy visibility, agent collaboration, and Gemini-powered AI guidance.",
            twitterTitle: "PolicyWallet | Insurance wallet with AI guidance",
            twitterDescription: "One secure place for policies, collaboration, and confident decisions.",
        },
    },
}
