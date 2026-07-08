import type { LandingContentModel } from "@/types/landing-content"
import { siteConfig } from "@/lib/seo/site"

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
            el: "AI Risk Intelligence για ασφάλειες",
            en: "AI Risk Intelligence for insurance",
        },
        title: {
            el: "Δες τι ΔΕΝ καλύπτουν τα συμβόλαιά σου. Πριν το μάθεις αργά.",
            en: "See what your policies do NOT cover. Before it costs you.",
        },
        subtitle: {
            el: "Ανέβασε τα συμβόλαιά σου και το AI εντοπίζει κενά, επικαλύψεις και ρίσκα που συνήθως μένουν κρυφά.",
            en: "Upload your policies and AI identifies gaps, overlaps, and hidden risks most people miss.",
        },
        primaryCta: {
            el: "Έλεγξε τώρα την κάλυψή μου",
            en: "Check my coverage now",
        },
        secondaryCta: {
            el: "Σύνδεση",
            en: "Sign in",
        },
        tertiaryCta: {
            el: "Είμαι ασφαλιστικός πράκτορας",
            en: "I'm an insurance agent",
        },
        helperText: {
            el: "Πρώτη εικόνα κάλυψης σε λιγότερο από 2 λεπτά. Χωρίς κάρτα, χωρίς δέσμευση.",
            en: "Your first coverage snapshot in under 2 minutes. No card, no commitment.",
        },
    },
    visuals: {
        heroImage: {
            src: "/screenshots/desktop-dashboard.png",
            alt: {
                el: "Προεπισκόπηση του dashboard του PolicyWallet",
                en: "PolicyWallet dashboard preview",
            },
            caption: {
                el: "Ενιαία εικόνα για όλα τα συμβόλαιά σας",
                en: "Unified view for all your policies",
            },
        },
        socialProofImages: [
            {
                src: "/screenshots/desktop-dashboard.png",
                alt: {
                    el: "Κεντρική προβολή συμβολαίων και ειδοποιήσεων",
                    en: "Central view of policies and notifications",
                },
            },
            {
                src: "/screenshots/mobile-dashboard.png",
                alt: {
                    el: "Κινητή εμπειρία διαχείρισης ασφαλιστηρίων",
                    en: "Mobile insurance management experience",
                },
            },
        ],
    },
    landingSystem: {
        heroCarousel: [
            {
                title: { el: "Μην μαντεύεις αν είσαι καλυμμένος. Μάθε το.", en: "Stop guessing if you are covered. Know it." },
                description: {
                    el: "Το PolicyWallet διαβάζει τα ασφαλιστήριά σου και σου δείχνει καθαρά πού είσαι καλυμμένος, πού έχεις κενά, πότε λήγουν και αν χάνεις χρήματα.",
                    en: "PolicyWallet reads your policies and clearly shows where you are covered, where you have gaps, when policies expire, and where you may be losing money.",
                },
                bullets: [
                    { el: "Πού είσαι καλυμμένος", en: "Where you are covered" },
                    { el: "Πού έχεις κενά", en: "Where you have gaps" },
                    { el: "Πότε λήγουν", en: "When they expire" },
                    { el: "Αν χάνεις χρήματα", en: "If you are losing money" },
                ],
                cta: { el: "Ξεκίνα δωρεάν έλεγχο", en: "Start free check" },
                footnote: { el: "Χωρίς κόστος. Χωρίς πίεση.", en: "No cost. No pressure." },
            },
            {
                title: { el: "Τι είναι το PolicyWallet;", en: "What is PolicyWallet?" },
                description: {
                    el: "Η έξυπνη πλατφόρμα που οργανώνει και εξηγεί τις ασφάλειές σου με καθαρή και ουδέτερη εικόνα.",
                    en: "The smart platform that organizes and explains your insurance with a clear and neutral view.",
                },
                bullets: [
                    { el: "Δεν είμαστε ασφαλιστική", en: "We are not an insurance company" },
                    { el: "Δεν πουλάμε προϊόντα", en: "We do not sell products" },
                    { el: "Δεν παίρνουμε προμήθειες", en: "We do not take commissions" },
                ],
            },
            {
                title: { el: "Για οικογένειες με ευθύνη", en: "For families aged with responsibility" },
                description: {
                    el: "Όταν έχεις οικογένεια, δεν χωράνε υποθέσεις. Το PolicyWallet σου δείχνει αν οι βασικές καλύψεις σου είναι πραγματικά επαρκείς.",
                    en: "When you have a family, assumptions are risky. PolicyWallet shows whether your core coverage is truly adequate.",
                },
                bullets: [
                    { el: "Υγεία, σπίτι, αυτοκίνητο", en: "Health, home, car" },
                    { el: "Επάρκεια αστικής ευθύνης", en: "Liability adequacy" },
                    { el: "Πραγματική κάλυψη νοσηλείας", en: "Real hospitalization coverage" },
                ],
                cta: { el: "Δες την εικόνα της οικογένειάς σου", en: "See your family's full picture" },
            },
            {
                title: { el: "Για οδηγούς και φοιτητές που ξεκινούν τώρα", en: "For drivers and students starting now" },
                description: {
                    el: "Ένα ατύχημα δεν σε ρωτάει και ένα νέο ξεκίνημα έχει κρυφά ρίσκα. Ανέβασε τα συμβόλαια και δες τα καθαρά, χωρίς νομική γλώσσα.",
                    en: "An accident does not ask first, and new beginnings have hidden risk. Upload policies and see clear answers without legal jargon.",
                },
                bullets: [
                    { el: "Απαλλαγές, οδική βοήθεια, φυσικές καταστροφές", en: "Deductibles, roadside support, natural disasters" },
                    { el: "Κάλυψη κατοικίας και προσωπικής ευθύνης", en: "Home and personal liability coverage" },
                    { el: "Αξιοποίηση ασφαλιστικής υγείας", en: "Use your health insurance benefits fully" },
                ],
                cta: { el: "Κάνε τώρα τον έλεγχο", en: "Run your check now" },
            },
        ],
        audiences: [
            {
                title: { el: "Γονείς", en: "Parents" },
                subtitle: { el: "Για αυτούς που έχουν ευθύνη", en: "For people carrying responsibility" },
                bullets: [
                    { el: "Σπίτι, αυτοκίνητο, παιδιά, υγεία", en: "Home, car, children, health" },
                    { el: "Έλεγχος επάρκειας αστικής ευθύνης", en: "Liability adequacy check" },
                    { el: "Καθαρή εικόνα οικογενειακού ρίσκου", en: "Clear family risk view" },
                ],
                highlights: [
                    { el: "Η ηρεμία δεν είναι θεωρία. Είναι δεδομένα.", en: "Peace of mind is not theory. It is data." },
                ],
                ctaLabel: { el: "Δες την εικόνα της οικογένειάς σου", en: "See your family overview" },
            },
            {
                title: { el: "Οδηγοί", en: "Drivers" },
                subtitle: { el: "Για όσους περνούν ώρες στον δρόμο", en: "For people spending hours on the road" },
                bullets: [
                    { el: "Έλεγχος απαλλαγής και ορίων κάλυψης", en: "Check deductible and coverage limits" },
                    { el: "Κάλυψη φυσικών καταστροφών", en: "Natural disaster coverage" },
                    { el: "Οδική βοήθεια και γεωγραφικά όρια", en: "Roadside assistance and geographic limits" },
                ],
                ctaLabel: { el: "Έλεγξε το αυτοκίνητό σου τώρα", en: "Check your car now" },
            },
            {
                title: { el: "Φοιτητές", en: "Students" },
                subtitle: { el: "Για όσους ξεκινούν τώρα", en: "For people starting now" },
                bullets: [
                    { el: "Υγεία από οικογενειακό συμβόλαιο", en: "Health cover from family policy" },
                    { el: "Κάλυψη ενοικιαζόμενης κατοικίας", en: "Rented home coverage" },
                    { el: "Προσωπική αστική ευθύνη", en: "Personal liability" },
                ],
                ctaLabel: { el: "Δες τι καλύπτεσαι", en: "See what you are covered for" },
            },
            {
                title: { el: "Ασφάλεια υγείας", en: "Health insurance" },
                subtitle: { el: "Για όσους θέλουν να πάρουν όσα δικαιούνται", en: "For those who want to claim what they deserve" },
                bullets: [
                    { el: "Όρια κάλυψης και εξαιρέσεις", en: "Coverage limits and exclusions" },
                    { el: "Χρόνοι αναμονής και ενεργοποιήσεις", en: "Waiting periods and activation rules" },
                    { el: "Πρακτική αξιοποίηση παροχών", en: "Practical use of benefits" },
                ],
                ctaLabel: { el: "Δες την ανάλυση υγείας σου", en: "See your health analysis" },
            },
        ],
        trustItems: [
            {
                title: { el: "Υψηλή ασφάλεια. Απόλυτος έλεγχος.", en: "High security. Full control." },
                subtitle: {
                    el: "Κρυπτογράφηση δεδομένων και πρόσβαση μόνο από εσένα.",
                    en: "Encrypted data with access controlled by you.",
                },
                icon: "lock",
            },
            {
                title: { el: "Καμία κοινοποίηση χωρίς άδεια", en: "No sharing without consent" },
                subtitle: {
                    el: "Τα ασφαλιστήριά σου είναι ευαίσθητα δεδομένα και τα αντιμετωπίζουμε σοβαρά.",
                    en: "Your policies are sensitive data and we handle them seriously.",
                },
                icon: "shield",
            },
            {
                title: { el: "Ουδέτερη ανάλυση", en: "Neutral analysis" },
                subtitle: {
                    el: "Δεν προωθούμε εταιρείες και δεν κερδίζουμε από αλλαγές ασφαλιστικής.",
                    en: "We do not promote carriers and we do not profit from switching.",
                },
                icon: "users",
            },
        ],
        urgency: {
            title: { el: "Τι δεν ξέρουν οι περισσότεροι", en: "What most people do not know" },
            bullets: [
                { el: "7 στους 10 έχουν ουσιαστικά κενά κάλυψης", en: "7 out of 10 have meaningful coverage gaps" },
                { el: "Πολλοί πληρώνουν διπλή ή αλληλοεπικαλυπτόμενη κάλυψη", en: "Many people pay for duplicate or overlapping coverage" },
                { el: "Οι αλλαγές ζωής συχνά δεν αποτυπώνονται έγκαιρα στα συμβόλαια", en: "Life changes are often not reflected in policies on time" },
            ],
            conclusion: { el: "Το PolicyWallet σου δείχνει την αλήθεια.", en: "PolicyWallet shows you the truth." },
        },
        riskFlow: {
            title: { el: "Σε 3 κινήσεις", en: "In 3 steps" },
            scoreLabel: { el: "Coverage Score", en: "Coverage Score" },
            scoreValue: "68/100",
            scoreTone: "medium",
            steps: [
                {
                    title: { el: "Βήμα 1 · Ανέβασε τα συμβόλαιά σου", en: "Step 1 · Upload your policies" },
                    description: { el: "PDF ή φωτογραφία, σε λιγότερο από 1 λεπτό.", en: "PDF or photo, in under 1 minute." },
                },
                {
                    title: { el: "Βήμα 2 · Το σύστημα διαβάζει τους όρους", en: "Step 2 · The system reads policy terms" },
                    description: { el: "Αναλύει καλύψεις, εξαιρέσεις και κρίσιμα όρια.", en: "It analyzes coverage, exclusions, and critical limits." },
                },
                {
                    title: { el: "Βήμα 3 · Παίρνεις καθαρή εικόνα", en: "Step 3 · You get a clear picture" },
                    description: { el: "Όχι τεχνικοί όροι. Όχι νομική γλώσσα. Καθαρά.", en: "No technical terms. No legal jargon. Clear output." },
                },
            ],
        },
        proofAlert: {
            title: { el: "Εντοπίστηκε κενό στην αστική ευθύνη κατοικίας", en: "Home liability coverage gap detected" },
            subtitle: { el: "Ενδεικτική πιθανή έκθεση έως €120.000", en: "Indicative potential exposure up to €120,000" },
        },
        differentiator: {
            title: { el: "Ουδέτερη. Ανεξάρτητη. Με το μέρος σου.", en: "Neutral. Independent. On your side." },
            bullets: [
                { el: "Δεν πουλάμε ασφάλειες.", en: "We do not sell insurance." },
                { el: "Δεν προωθούμε συγκεκριμένες εταιρείες.", en: "We do not push specific carriers." },
                { el: "Αναλύουμε μόνο δεδομένα κάλυψης.", en: "We analyze coverage data only." },
            ],
        },
        inaction: {
            title: { el: "Reality check", en: "Reality check" },
            bullets: [
                { el: "Το πρόβλημα δεν είναι να έχεις ασφάλεια.", en: "The problem is not having insurance." },
                { el: "Το πρόβλημα είναι να νομίζεις ότι έχεις.", en: "The problem is believing you are covered when you are not." },
                { el: "Μην το ανακαλύψεις όταν είναι αργά.", en: "Do not discover it too late." },
            ],
        },
        quickCheck: {
            title: { el: "Χρειάζεσαι μόνο 60 δευτερόλεπτα", en: "Try it in 60 seconds" },
            bullets: [
                { el: "Ανέβασε 1 συμβόλαιο", en: "Upload 1 policy" },
                { el: "Λάβε άμεσα ανάλυση", en: "Get instant analysis" },
                { el: "Δες το ρίσκο σου", en: "See your risk level" },
            ],
            footnote: { el: "Χωρίς κάρτα. Χωρίς δέσμευση.", en: "No card. No commitment." },
        },
        featureItems: [
            {
                title: { el: "Ανέβασμα συμβολαίων", en: "Upload policies" },
                subtitle: {
                    el: "Ανέβασμα PDF ή φωτογραφίας με γρήγορη καταχώρηση βασικών στοιχείων.",
                    en: "Upload PDF or photo with fast capture of key policy details.",
                },
                icon: "file-text",
            },
            {
                title: { el: "Το AI εντοπίζει κενά κάλυψης", en: "AI finds coverage gaps" },
                subtitle: {
                    el: "Εντοπισμός πιθανών ασφαλιστικών κενών πριν καταλήξουν σε κοστοβόρα ρίσκα.",
                    en: "Spot potential gaps before they become costly risks.",
                },
                icon: "brain",
            },
            {
                title: { el: "Έξυπνες υπενθυμίσεις", en: "Smart reminders" },
                subtitle: {
                    el: "Έγκαιρες υπενθυμίσεις για ανανεώσεις και κρίσιμες ημερομηνίες.",
                    en: "Timely reminders for renewals and critical dates.",
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
                        en: "In minutes, my core policies were organized and easy to understand.",
                    },
                    author: "Maria K.",
                },
                {
                    quote: {
                        el: "Η συνεργασία με πελάτες έγινε πιο γρήγορη και πιο ξεκάθαρη.",
                        en: "Client collaboration became faster and much clearer.",
                    },
                    author: "Nikos P.",
                },
            ],
        },
        conversion: {
            title: { el: "Σταμάτα να μαντεύεις.", en: "Stop guessing." },
            subtitle: {
                el: "Ξεκίνα δωρεάν. Σε λιγότερο από 1 λεπτό θα ξέρεις.",
                en: "Start free. In less than 1 minute, you will know.",
            },
            signupLabel: { el: "Κάνε τώρα τον έλεγχο", en: "Run your check now" },
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
                id: "faq-data-security",
                question: { el: "Είναι ασφαλή τα δεδομένα μου;", en: "Is my data secure?" },
                answer: {
                    el: "Ναι. Τα δεδομένα αποθηκεύονται κρυπτογραφημένα και η πρόσβαση ελέγχεται με ρόλους και δικαιώματα.",
                    en: "Yes. Data is encrypted at rest, with role-based access controls.",
                },
            },
            {
                id: "faq-carriers-visibility",
                question: { el: "Μπορεί η ασφαλιστική μου να δει τα δεδομένα μου;", en: "Can my insurer see my data?" },
                answer: {
                    el: "Όχι, εκτός αν εσύ επιλέξεις ρητά να μοιραστείς συγκεκριμένα στοιχεία.",
                    en: "No, unless you explicitly choose to share specific information.",
                },
            },
            {
                id: "faq-no-agent",
                question: { el: "Τι γίνεται αν δεν έχω πράκτορα;", en: "What if I do not have an agent?" },
                answer: {
                    el: "Μπορείς να χρησιμοποιήσεις πλήρως το PolicyWallet μόνος σου και να συνεργαστείς με πράκτορα αργότερα.",
                    en: "You can use PolicyWallet fully on your own and collaborate with an agent later.",
                },
            },
            {
                id: "faq-ai-accuracy",
                question: { el: "Πόσο ακριβής είναι η AI ανάλυση;", en: "How accurate is the AI analysis?" },
                answer: {
                    el: "Η AI δίνει γρήγορη και πρακτική ανάλυση για κάλυψη και κενά. Εσύ έχεις πάντα τον τελικό έλεγχο πριν από οποιαδήποτε ενέργεια.",
                    en: "AI provides fast, practical analysis of coverage and gaps. You always stay in control before any decision.",
                },
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
