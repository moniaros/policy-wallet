import type { LandingContentModel } from "@/types/landing-content"

export const landingContent: LandingContentModel = {
    productName: "PolicyWallet",
    defaultLocale: "el",
    sections: [
        { id: "hero", title: { el: "Hero", en: "Hero" } },
        { id: "trust-strip", title: { el: "Εμπιστοσύνη", en: "Trust" } },
        { id: "core-features", title: { el: "Βασικά Οφέλη", en: "Core Features" } },
        { id: "social-proof", title: { el: "Αποτελέσματα", en: "Social Proof" } },
        { id: "final-cta", title: { el: "Έναρξη", en: "Get Started" } },
        { id: "faq", title: { el: "Συχνές Ερωτήσεις", en: "FAQ" } },
        { id: "footer-links", title: { el: "Σύνδεσμοι", en: "Footer links" } },
    ],
    hero: {
        badge: {
            el: "Gemini-powered AI guidance",
            en: "Gemini-powered AI guidance",
        },
        title: {
            el: "Το ασφαλιστικό σου πορτοφόλι, όπως πρέπει να είναι.",
            en: "Your insurance wallet, finally done right.",
        },
        subtitle: {
            el: "Οργάνωσε όλα τα συμβόλαιά σου σε ένα ασφαλές περιβάλλον και συνεργάσου άμεσα με τον πράκτορά σου.",
            en: "Bring all your policies into one secure workspace and collaborate instantly with your agent.",
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
        helperText: {
            el: "Πρώτη αξία σε λιγότερο από 2 λεπτά: ανεβάζεις συμβόλαιο και η ανάλυση AI ξεκινά άμεσα.",
            en: "First value in under 2 minutes: upload a policy and AI analysis starts immediately.",
        },
    },
    visuals: {
        heroImage: {
            src: "/brand/brochure/feat.jpg",
            alt: {
                el: "Επισκόπηση πλατφόρμας PolicyWallet",
                en: "PolicyWallet platform overview",
            },
            caption: {
                el: "Ενιαία εικόνα για όλα τα συμβόλαιά σας",
                en: "Unified view for all your policies",
            },
        },
        trustImages: [
            {
                src: "/brand/brochure/h2-1.jpg",
                alt: {
                    el: "Σκηνή συνεργασίας με έμφαση στην εμπιστοσύνη",
                    en: "Trust-focused collaboration scene",
                },
            },
            {
                src: "/brand/brochure/med-1.png",
                alt: {
                    el: "Υγειονομικά οφέλη και ασφαλιστική καθοδήγηση",
                    en: "Health benefit and insurance guidance visual",
                },
            },
        ],
        socialProofImages: [
            {
                src: "/brand/brochure/3.jpg",
                alt: {
                    el: "Ασφαλιστική εμπειρία πελάτη",
                    en: "Insurance customer experience",
                },
            },
            {
                src: "/brand/brochure/2.jpg",
                alt: {
                    el: "Οικονομικός σχεδιασμός και προστασία",
                    en: "Financial planning and protection",
                },
            },
            {
                src: "/brand/brochure/h2.webp",
                alt: {
                    el: "Οικογενειακή ασφάλεια και πρόληψη",
                    en: "Family safety and prevention",
                },
            },
        ],
    },
    landingSystem: {
        trustItems: [
            {
                title: { el: "Ασφάλεια τραπεζικού επιπέδου", en: "Bank-level security" },
                subtitle: {
                    el: "Κρυπτογραφημένη αποθήκευση και αυστηρή προστασία δεδομένων.",
                    en: "Encrypted storage and strict data protection.",
                },
                icon: "lock",
            },
            {
                title: { el: "Ουδέτερη πλατφόρμα", en: "Neutral platform" },
                subtitle: {
                    el: "Ανεξάρτητη από σχεδιασμό, με επίκεντρο τα συμφέροντά σας.",
                    en: "Independent by design, aligned with your interests.",
                },
                icon: "shield",
            },
            {
                title: { el: "Συνεργάζεται με μεγάλες ασφαλιστικές", en: "Works across major insurers" },
                subtitle: {
                    el: "Συγκεντρώστε συμβόλαια από διαφορετικές ασφαλιστικές σε ένα πορτοφόλι.",
                    en: "Bring policies from different insurers into one wallet.",
                },
                icon: "users",
            },
        ],
        featureItems: [
            {
                title: { el: "Ανέβασμα συμβολαίων", en: "Upload policies" },
                subtitle: {
                    el: "Ανεβάζετε PDF ή φωτογραφία με καθαρή καταχώρηση στοιχείων.",
                    en: "PDF or photo upload with clean policy capture.",
                },
                icon: "file-text",
            },
            {
                title: { el: "Το AI εντοπίζει κενά κάλυψης", en: "AI finds coverage gaps" },
                subtitle: {
                    el: "Εντοπίζετε ελλείψεις πριν μετατραπούν σε υψηλό κόστος.",
                    en: "Spot missing coverage before it becomes expensive.",
                },
                icon: "brain",
            },
            {
                title: { el: "Έξυπνες υπενθυμίσεις", en: "Smart reminders" },
                subtitle: {
                    el: "Υπενθυμίσεις για ανανεώσεις και προθεσμίες όταν πραγματικά χρειάζονται.",
                    en: "Renewal and deadline reminders when they matter.",
                },
                icon: "bell",
            },
        ],
        socialProof: {
            title: { el: "Εμπιστοσύνη στην πράξη", en: "Trust in practice" },
            metrics: [
                { value: "10k+", label: { el: "ενεργοί χρήστες", en: "active users" } },
                { value: "50k+", label: { el: "συμβόλαια", en: "policies" } },
            ],
            testimonials: [
                {
                    quote: {
                        el: "Μέσα σε λίγα λεπτά είχα τα βασικά συμβόλαιά μου οργανωμένα και εύκολα κατανοητά.",
                        en: "In minutes, I had my core policies organized and easy to understand.",
                    },
                    author: "Maria K.",
                },
                {
                    quote: {
                        el: "Η συνεργασία με τους πελάτες έγινε πιο γρήγορη και πολύ πιο διαφανής.",
                        en: "Client collaboration became faster and much more transparent.",
                    },
                    author: "Nikos P.",
                },
            ],
        },
        conversion: {
            title: { el: "Ξεκινήστε τώρα", en: "Get started now" },
            subtitle: {
                el: "Δημιουργήστε λογαριασμό ή συνεχίστε στο πορτοφόλι σας.",
                en: "Create your account or continue to your wallet.",
            },
            signupLabel: { el: "Εγγραφή", en: "Sign up" },
            loginLabel: { el: "Σύνδεση", en: "Login" },
            footnote: {
                el: "Ασφαλής πρόσβαση, χωρίς περιττά βήματα.",
                en: "Secure access. No unnecessary steps.",
            },
            mobilePrimaryLabel: { el: "Ξεκίνα δωρεάν", en: "Start free" },
            signInLabel: { el: "Σύνδεση", en: "Sign in" },
        },
    },
    personaTracks: [
        {
            id: "policyholder",
            title: { el: "Για ασφαλισμένους", en: "For policyholders" },
            bullets: [
                { el: "Όλα τα συμβόλαια σε ένα σημείο", en: "All your policies in one place" },
                { el: "Άμεση κατανόηση καλύψεων", en: "Instant coverage clarity" },
                { el: "Ασφαλής συνεργασία με πράκτορα", en: "Secure collaboration with agent" },
            ],
            ctaLabel: { el: "Δημιουργία λογαριασμού", en: "Create account" },
            ctaHref: "/auth/signup?role=policyholder&source=landing_persona_policyholder",
        },
        {
            id: "agent",
            title: { el: "Για πράκτορες", en: "For agents" },
            bullets: [
                { el: "Γρηγορότερο onboarding πελατών", en: "Faster client onboarding" },
                { el: "Πρόσβαση σε κρίσιμες ανανεώσεις", en: "Visibility into critical renewals" },
                { el: "Πιο αποδοτική συνεργασία", en: "More efficient collaboration" },
            ],
            ctaLabel: { el: "Εγγραφή πράκτορα", en: "Agent signup" },
            ctaHref: "/auth/signup?role=agent&source=landing_persona_agent",
        },
    ],
    howItWorks: {
        title: { el: "Πώς λειτουργεί", en: "How it works" },
        steps: [
            { id: "step-a", title: { el: "Ανέβασμα", en: "Upload" }, description: { el: "Ανεβάζεις το συμβόλαιο.", en: "Upload your policy." } },
            { id: "step-b", title: { el: "Κατανόηση", en: "Understand" }, description: { el: "Βλέπεις τι είναι σημαντικό.", en: "See what matters." } },
            { id: "step-c", title: { el: "Συνεργασία", en: "Collaborate" }, description: { el: "Μοιράζεσαι με έλεγχο.", en: "Share with full control." } },
            { id: "step-d", title: { el: "Απόφαση", en: "Decide" }, description: { el: "Παίρνεις καλύτερες αποφάσεις.", en: "Make better decisions." } },
        ],
    },
    aiExtraction: {
        title: { el: "Από το έγγραφο στην απόφαση", en: "From document to decision" },
        subtitle: { el: "Σαφής εικόνα χωρίς πολύπλοκη ορολογία.", en: "Clear insight without complex legal wording." },
        fields: [
            { el: "Άμεση σύνοψη", en: "Instant summary" },
            { el: "Καλύψεις και όρια", en: "Coverage and limits" },
            { el: "Κρίσιμες ημερομηνίες", en: "Critical dates" },
        ],
        reviewNote: { el: "Το AI βοηθά, αλλά η τελική απόφαση είναι δική σου.", en: "AI assists, but the final decision is yours." },
    },
    collaboration: {
        title: { el: "Συνεργασία και από τις δύο πλευρές", en: "Two-way collaboration" },
        tracks: [
            {
                id: "agent_to_customer",
                title: { el: "Ροή πράκτορα προς πελάτη", en: "Agent-to-customer flow" },
                points: [
                    { el: "Ο πράκτορας ανεβάζει και μοιράζεται", en: "Agent uploads and shares" },
                    { el: "Ο πελάτης αποκτά ορατότητα", en: "Customer gains visibility" },
                ],
            },
            {
                id: "policyholder_to_agent",
                title: { el: "Ροή πελάτη προς πράκτορα", en: "Policyholder-to-agent flow" },
                points: [
                    { el: "Ο πελάτης μοιράζεται με συγκατάθεση", en: "Customer shares with consent" },
                    { el: "Ο πράκτορας βλέπει μόνο ό,τι επιτρέπεται", en: "Agent sees only permitted data" },
                ],
            },
        ],
    },
    qaUpgrade: {
        title: { el: "Ρώτα το AI για το συμβόλαιό σου", en: "Ask AI about your policy" },
        subtitle: { el: "Ξεκινάς άμεσα και αναβαθμίζεις όταν χρειάζεται.", en: "Start quickly and upgrade when needed." },
        bullets: [
            { el: "Απαντήσεις στο context σου", en: "Context-aware answers" },
            { el: "Καθαρά όρια χρήσης", en: "Clear usage limits" },
            { el: "Εύκολη αναβάθμιση", en: "Simple upgrade path" },
        ],
        pricingCta: { el: "Δείτε τιμές", en: "View pricing" },
    },
    trust: {
        title: { el: "Εμπιστοσύνη", en: "Trust" },
        bullets: [
            { el: "Διαφανής συνεργασία", en: "Transparent collaboration" },
            { el: "Ασφαλής πρόσβαση", en: "Secure access control" },
        ],
    },
    security: {
        title: { el: "Ασφάλεια", en: "Security" },
        bullets: [
            { el: "Κρυπτογράφηση", en: "Encryption" },
            { el: "Έλεγχος πρόσβασης", en: "Access controls" },
        ],
    },
    faq: {
        title: { el: "Συχνές Ερωτήσεις", en: "Frequently asked questions" },
        items: [
            {
                id: "faq-roles",
                question: { el: "Σε ποιους απευθύνεται το PolicyWallet;", en: "Who is PolicyWallet for?" },
                answer: {
                    el: "Σε ασφαλισμένους και ασφαλιστικούς πράκτορες που θέλουν κοινή, καθαρή εικόνα συμβολαίων.",
                    en: "For policyholders and insurance agents who need shared, clear policy visibility.",
                },
            },
            {
                id: "faq-sharing",
                question: { el: "Πώς λειτουργεί ο διαμοιρασμός με πράκτορα;", en: "How does sharing with an agent work?" },
                answer: {
                    el: "Ο διαμοιρασμός γίνεται με ελεγχόμενα δικαιώματα και πλήρη διαφάνεια.",
                    en: "Sharing uses controlled permissions with full transparency.",
                },
            },
            {
                id: "faq-ai",
                question: { el: "Τι αξία μου δίνει το AI;", en: "What value does AI provide?" },
                answer: {
                    el: "Σου δίνει γρήγορη κατανόηση και υποστήριξη λήψης αποφάσεων.",
                    en: "It gives faster understanding and stronger decision support.",
                },
            },
            {
                id: "faq-language",
                question: { el: "Υποστηρίζονται Ελληνικά και Αγγλικά;", en: "Are Greek and English supported?" },
                answer: { el: "Ναι, πλήρως.", en: "Yes, fully." },
            },
        ],
    },
    finalCta: {
        title: { el: "Ξεκίνα σήμερα", en: "Start today" },
        subtitle: { el: "Λιγότερη πολυπλοκότητα, περισσότερη σιγουριά.", en: "Less complexity, more confidence." },
        policyholderCta: { el: "Ξεκίνα ως ασφαλισμένος", en: "Start as policyholder" },
        agentCta: { el: "Ξεκίνα ως πράκτορας", en: "Start as agent" },
    },
    footer: {
        linksLabel: { el: "Σύνδεσμοι", en: "Links" },
        helpLabel: { el: "Βοήθεια", en: "Help docs" },
    },
    seo: {
        el: {
            locale: "el",
            path: "/",
            title: "PolicyWallet | Το σύγχρονο ασφαλιστικό πορτοφόλι",
            description: "Όλα τα συμβόλαιά σου σε ένα ασφαλές περιβάλλον με έξυπνη ανάλυση και συνεργασία.",
            keywords: ["ασφάλειες", "συμβόλαια", "AI", "PolicyWallet"],
            ogTitle: "PolicyWallet | Το σύγχρονο ασφαλιστικό πορτοφόλι",
            ogDescription: "Καθαρή εικόνα συμβολαίων και ασφαλής συνεργασία με πράκτορα.",
            twitterTitle: "PolicyWallet | Insurance wallet με AI",
            twitterDescription: "Όλες οι ασφάλειές σου σε ένα μέρος.",
        },
        en: {
            locale: "en",
            path: "/en",
            title: "PolicyWallet | The modern insurance wallet",
            description: "All your policies in one secure workspace with smart analysis and collaboration.",
            keywords: ["insurance wallet", "policy management", "AI", "PolicyWallet"],
            ogTitle: "PolicyWallet | The modern insurance wallet",
            ogDescription: "Clear policy visibility and secure collaboration with your agent.",
            twitterTitle: "PolicyWallet | Insurance wallet with AI",
            twitterDescription: "All your insurance in one place.",
        },
    },
}
