import type { CheckoutBlockReason } from "@/lib/pricing/stripe-mode"

export type PricingAudience = "policyholder" | "agent"
export type BillingPeriod = "monthly" | "annual"

export interface LocalizedText {
    el: string
    en: string
}

export interface PublicPricingFeature {
    label: LocalizedText
    included: boolean
    highlight?: boolean
}

export interface PublicPricingPlan {
    key: string
    checkoutPlanId: string | null
    name: LocalizedText
    description: LocalizedText
    badge?: LocalizedText
    isHighlighted?: boolean
    isContactPlan?: boolean
    pricing: {
        monthly: {
            amount: string
            period: LocalizedText
        }
        annual?: {
            amount: string
            period: LocalizedText
            savings: LocalizedText
        }
    }
    features: PublicPricingFeature[]
    /**
     * Set when this deployment cannot complete a purchase of this plan, so the
     * card states that instead of offering a buy button (the rule and its
     * reasoning live in `lib/pricing/stripe-mode.ts`). `undefined` — the normal
     * case — means the plan is buyable. The PRICE still renders either way: the
     * price is true; it is the offer to sell that would not be.
     */
    checkoutUnavailableReason?: CheckoutBlockReason
}

export interface PublicPricingComparisonRow {
    category?: LocalizedText
    name: LocalizedText
    /**
     * `true`/`false` render as an included/excluded mark; a string renders as
     * given; a LocalizedText renders in the reader's language. The last form
     * exists because these cells used to be language-blind strings, so a Greek
     * visitor read "Unlimited", "No" and "100 rows" in an otherwise Greek
     * table — and one cell displayed "Απεριόριστα / Unlimited" at once.
     */
    values: Record<string, boolean | string | LocalizedText>
}

export interface PublicPricingFaqItem {
    question: LocalizedText
    answer: LocalizedText
}

export interface PublicPricingAudienceContent {
    heading: LocalizedText
    subtitle: LocalizedText
    plans: PublicPricingPlan[]
    comparisonTitle: LocalizedText
    comparisonRows: PublicPricingComparisonRow[]
    faqTitle: LocalizedText
    faqItems: PublicPricingFaqItem[]
}

/** Header of the feature column in the comparison table. */
export const FEATURE_COLUMN_HEADER: LocalizedText = { el: "Χαρακτηριστικό", en: "Feature" }

/**
 * Every plan key or checkoutPlanId that the pricing page can send to signup.
 * Used by the RegisterSchema to reject unknown values.
 */
export const VALID_PLAN_IDS = [
    "free",
    "ph-plus",
    "ph-pro",
    "agent-free",
    "agent-starter",
    "agent-pro",
    "agent-agency",
] as const

export type ValidPlanId = (typeof VALID_PLAN_IDS)[number]

export const publicPricingContent: Record<PricingAudience, PublicPricingAudienceContent> = {
    policyholder: {
        heading: {
            el: "Πλάνα για ιδιώτες",
            en: "Plans for individuals",
        },
        subtitle: {
            el: "Από απλή οργάνωση ασφαλιστηρίων μέχρι πλήρη ανάλυση κάλυψης: κενά, λήξεις, απαντήσεις.",
            en: "From simple policy organization to full coverage analysis: gaps, expiry dates, answers.",
        },
        plans: [
            {
                key: "free",
                checkoutPlanId: null,
                name: { el: "Δωρεάν", en: "Free" },
                description: { el: "Για να ξεκινήσετε", en: "To get you started" },
                pricing: {
                    monthly: {
                        amount: "€0",
                        period: { el: "/μήνα", en: "/month" },
                    },
                },
                features: [
                    { label: { el: "3 ασφαλιστήρια", en: "3 policies" }, included: true, highlight: true },
                    { label: { el: "Πλήρης ανάλυση AI σε κάθε ασφαλιστήριο", en: "Full AI analysis on every policy" }, included: true, highlight: true },
                    { label: { el: "Εντοπισμός διπλών καλύψεων", en: "Duplicate-cover detection" }, included: true },
                    { label: { el: "Ημερομηνία ανανέωσης", en: "Renewal date" }, included: true },
                    { label: { el: "Υπενθυμίσεις ανανέωσης", en: "Renewal reminders" }, included: false },
                ],
            },
            {
                key: "plus",
                checkoutPlanId: "ph-plus",
                name: { el: "Plus", en: "Plus" },
                description: { el: "Για όλα τα δικά σας ασφαλιστήρια", en: "For everything in your own name" },
                pricing: {
                    monthly: {
                        amount: "€4.99",
                        period: { el: "/μήνα", en: "/month" },
                    },
                    annual: {
                        amount: "€39",
                        period: { el: "/έτος", en: "/year" },
                        savings: { el: "Εξοικονομείτε 4 μήνες", en: "Save 4 months" },
                    },
                },
                features: [
                    { label: { el: "Έως 10 ασφαλιστήρια", en: "Up to 10 policies" }, included: true, highlight: true },
                    { label: { el: "Πλήρης ανάλυση AI σε κάθε ασφαλιστήριο", en: "Full AI analysis on every policy" }, included: true },
                    { label: { el: "Εντοπισμός διπλών καλύψεων", en: "Duplicate-cover detection" }, included: true },
                    { label: { el: "Υπενθυμίσεις ανανέωσης (email)", en: "Renewal reminders (email)" }, included: true },
                    { label: { el: "Ανάλυση από πολλές ασφαλιστικές", en: "Multi-insurer insights" }, included: true },
                ],
            },
            {
                key: "pro",
                checkoutPlanId: "ph-pro",
                name: { el: "Family", en: "Family" },
                description: { el: "Για τα ασφαλιστήρια όλου του σπιτιού", en: "For the whole household's policies" },
                badge: { el: "Προτείνεται", en: "Recommended" },
                isHighlighted: true,
                pricing: {
                    monthly: {
                        amount: "€8.99",
                        period: { el: "/μήνα", en: "/month" },
                    },
                    annual: {
                        amount: "€79",
                        period: { el: "/έτος", en: "/year" },
                        savings: { el: "Εξοικονομείτε 3 μήνες", en: "Save 3 months" },
                    },
                },
                features: [
                    { label: { el: "Έως 25 ασφαλιστήρια", en: "Up to 25 policies" }, included: true, highlight: true },
                    { label: { el: "Πλήρης ανάλυση AI & απεριόριστες ερωτήσεις", en: "Full AI analysis & unlimited Q&A" }, included: true, highlight: true },
                    { label: { el: "Εντοπισμός κενών & διπλών καλύψεων", en: "Gap & duplicate-coverage detection" }, included: true },
                    { label: { el: "Ανάλυση από πολλές ασφαλιστικές", en: "Multi-insurer insights" }, included: true },
                    { label: { el: "Υπενθυμίσεις, οδηγός ζημιάς & εξαγωγή αναφοράς", en: "Smart reminders, claim guide & report export" }, included: true },
                ],
            },
        ],
        comparisonTitle: {
            el: "Σύγκριση δυνατοτήτων ιδιωτών",
            en: "Feature comparison for individuals",
        },
        comparisonRows: [
            {
                category: { el: "Όρια χρήσης", en: "Usage limits" },
                name: { el: "Αριθμός ασφαλιστηρίων", en: "Number of policies" },
                // Capacity ladder, pricing v2. These MUST equal
                // DEFAULT_ENTITLEMENT_LIMITS.{free,plus,pro}.policies in
                // lib/pricing/plan-defaults.ts. The plan cards higher up this
                // same page state 3 / 10 / 25; until 2026-08-26 this row still
                // carried the v1 figures (1 / 5 / Unlimited), so /pricing
                // contradicted itself. No B2C tier is unlimited in v2.
                values: { free: "3", plus: "10", pro: "25" },
            },
            {
                name: { el: "Βασική σύνοψη ασφαλιστηρίου", en: "Basic policy summary" },
                values: { free: true, plus: true, pro: true },
            },
            {
                category: { el: "AI & ειδοποιήσεις", en: "AI & notifications" },
                name: { el: "Πλήρης ανάλυση AI", en: "Full AI analysis" },
                // `aiAnalysisPerMonth` is null (uncapped) on free, plus AND pro
                // — see plan-defaults.ts. The free plan card above and the
                // pricing FAQ below both say the analysis is included on every
                // plan; this row said the opposite until 2026-08-26.
                values: { free: true, plus: true, pro: true },
            },
            {
                name: { el: "Διαδραστικές ερωτήσεις AI", en: "Interactive AI Q&A" },
                values: { free: false, plus: false, pro: true },
            },
            {
                // Split from one combined gap-&-duplicate row (D1 as amended
                // 2026-08-30): the two halves have different truths, and a
                // combined row forces one of them to lie. Gap detection is the
                // enforced Family gate; duplicate detection runs on every plan,
                // bounded only by the plan's policy ceiling.
                name: { el: "Εντοπισμός κενών κάλυψης", en: "Coverage-gap detection" },
                values: { free: false, plus: false, pro: true },
            },
            {
                name: { el: "Εντοπισμός διπλών καλύψεων", en: "Duplicate-cover detection" },
                values: { free: true, plus: true, pro: true },
            },
            {
                name: { el: "Υπενθυμίσεις ανανέωσης (email)", en: "Renewal reminders (email)" },
                values: { free: false, plus: true, pro: true },
            },
            {
                name: { el: "Υπενθυμίσεις & εξαγωγή αναφοράς", en: "Smart reminders & report export" },
                values: { free: false, plus: false, pro: true },
            },
            {
                category: { el: "Συνεργασία", en: "Collaboration" },
                name: { el: "Συνεργασία με σύμβουλο", en: "Advisor collaboration" },
                values: { free: false, plus: false, pro: true },
            },
        ],
        faqTitle: {
            el: "Συχνές ερωτήσεις ιδιωτών",
            en: "FAQs for individuals",
        },
        faqItems: [
            // Direct-answer item: answer engines lift this verbatim for "how much
            // does it cost", so the figures stay in the answer text. Keep them in
            // sync with the plan cards above whenever the catalog price changes.
            {
                question: {
                    el: "Πόσο κοστίζει το PolicyWallet;",
                    en: "How much does PolicyWallet cost?",
                },
                answer: {
                    el: "Το δωρεάν πλάνο καλύπτει τρία ασφαλιστήρια, με πλήρη ανάλυση, και δεν ζητά κάρτα. Το Plus κοστίζει €39 τον χρόνο (ή €4.99 τον μήνα) για 10 ασφαλιστήρια, και το Family €79 τον χρόνο (ή €8.99 τον μήνα) για 25. Οι αναλύσεις είναι απεριόριστες σε κάθε πλάνο. Όλες οι τιμές περιλαμβάνουν ΦΠΑ.",
                    en: "The free plan covers three policies, with full analysis, and needs no card. Plus is €39 a year (or €4.99 a month) for 10 policies, and Family €79 a year (or €8.99 a month) for 25. Analyses are unlimited on every plan. All prices include VAT.",
                },
            },
            {
                question: {
                    el: "Μπορώ να αλλάξω πλάνο ανά πάσα στιγμή;",
                    en: "Can I change plans anytime?",
                },
                answer: {
                    el: "Ναι, μπορείτε να αναβαθμίσετε ή να υποβαθμίσετε οποτεδήποτε από τις ρυθμίσεις λογαριασμού.",
                    en: "Yes, you can upgrade or downgrade at any time from account settings.",
                },
            },
            {
                question: {
                    el: "Υπάρχει έκπτωση στην ετήσια χρέωση;",
                    en: "Is there a yearly discount?",
                },
                answer: {
                    el: "Ναι. Με την ετήσια χρέωση πληρώνετε περίπου 10 μήνες αντί για 12.",
                    en: "Yes. On yearly billing you pay for roughly 10 months instead of 12.",
                },
            },
            {
                question: {
                    el: "Τι γίνεται αν ακυρώσω;",
                    en: "What happens if I cancel?",
                },
                answer: {
                    el: "Διατηρείτε πρόσβαση μέχρι το τέλος της ήδη πληρωμένης περιόδου χρέωσης.",
                    en: "You keep access until the end of the billing period you have already paid for.",
                },
            },
        ],
    },
    agent: {
        heading: {
            el: "Πλάνα για ασφαλιστές & γραφεία",
            en: "Plans for agents & agencies",
        },
        subtitle: {
            el: "Σχεδιασμένα για χαρτοφυλάκιο πολλών πελατών, ανανεώσεις και συνεργασία ομάδας — με την ίδια ανεξάρτητη ανάλυση ρίσκου ανά πελάτη. Ο πελάτης ελέγχει τι μοιράζεται.",
            en: "Built for a many-client portfolio, renewals, and team collaboration — with the same independent risk analysis for every client. The client controls what is shared.",
        },
        plans: [
            {
                key: "agent-free",
                checkoutPlanId: null,
                name: { el: "Agent Free", en: "Agent Free" },
                description: { el: "Για να το δοκιμάσετε", en: "To try it out" },
                pricing: {
                    monthly: {
                        amount: "€0",
                        period: { el: "/μήνα", en: "/month" },
                    },
                },
                features: [
                    { label: { el: "10 πελάτες", en: "10 clients" }, included: true },
                    { label: { el: "5 AI αναλύσεις / μήνα", en: "5 AI analyses / month" }, included: true },
                    { label: { el: "Βασική εικόνα πελατών", en: "Basic client view" }, included: true },
                    { label: { el: "Μαζική εισαγωγή", en: "Bulk import" }, included: false },
                    { label: { el: "Αυτοματισμοί ανανέωσης", en: "Renewal automation" }, included: false },
                ],
            },
            {
                key: "agent-starter",
                checkoutPlanId: "agent-starter",
                name: { el: "Agent Starter", en: "Agent Starter" },
                description: { el: "Για ανεξάρτητους συμβούλους", en: "For independent advisors" },
                badge: { el: "Δημοφιλές", en: "Popular" },
                isHighlighted: true,
                pricing: {
                    monthly: {
                        amount: "€29",
                        period: { el: "/μήνα", en: "/month" },
                    },
                },
                features: [
                    { label: { el: "100 πελάτες", en: "100 clients" }, included: true, highlight: true },
                    { label: { el: "50 αναλύσεις τον μήνα", en: "50 analyses a month" }, included: true, highlight: true },
                    // Same plain register as the comparison rows below — the
                    // cards used to say "Portfolio dashboard" / "Renewal
                    // pipeline" in English inside the Greek column.
                    { label: { el: "Όλοι οι πελάτες σε μία οθόνη", en: "Every client on one screen" }, included: true, highlight: true },
                    { label: { el: "Λίστα με ό,τι λήγει", en: "A list of what is running out" }, included: true },
                    { label: { el: "Μαζική εισαγωγή έως 100 πελάτες", en: "Bulk import up to 100 clients" }, included: true },
                    { label: { el: "Ερωτηματολόγια πελατών (5 πρότυπα)", en: "Client questionnaires (5 templates)" }, included: true },
                ],
            },
            {
                key: "agent-pro",
                checkoutPlanId: "agent-pro",
                name: { el: "Agent Pro", en: "Agent Pro" },
                description: { el: "Για ομάδες παραγωγής", en: "For sales teams" },
                pricing: {
                    monthly: {
                        amount: "€79",
                        period: { el: "/μήνα", en: "/month" },
                    },
                },
                features: [
                    { label: { el: "500 πελάτες", en: "500 clients" }, included: true, highlight: true },
                    { label: { el: "150 αναλύσεις τον μήνα", en: "150 analyses a month" }, included: true, highlight: true },
                    { label: { el: "Ομάδα έως 3 ασφαλιστές", en: "A team of up to 3 agents" }, included: true },
                    { label: { el: "Προτάσεις επιπλέον κάλυψης ανά πελάτη", en: "Extra-cover suggestions per client" }, included: true },
                    { label: { el: "Οι αναλύσεις σας τρέχουν πρώτες", en: "Your analyses run first" }, included: true },
                    { label: { el: "Παρακολούθηση προμηθειών", en: "Commission tracking" }, included: true },
                ],
            },
            {
                key: "agent-agency",
                checkoutPlanId: "agent-agency",
                name: { el: "Agency", en: "Agency" },
                description: { el: "Για γραφεία σε ανάπτυξη", en: "For growing brokerages" },
                isContactPlan: true,
                pricing: {
                    monthly: {
                        amount: "€199",
                        period: { el: "/μήνα", en: "/month" },
                    },
                },
                features: [
                    { label: { el: "Απεριόριστοι πελάτες", en: "Unlimited clients" }, included: true, highlight: true },
                    { label: { el: "400 αναλύσεις τον μήνα", en: "400 analyses a month" }, included: true, highlight: true },
                    { label: { el: "Απεριόριστη ομάδα", en: "Unlimited team members" }, included: true },
                    { label: { el: "Απεριόριστη μαζική εισαγωγή πελατών", en: "Unlimited client import" }, included: true },
                    { label: { el: "Αποκλειστική υποστήριξη", en: "Dedicated support" }, included: true },
                ],
            },
        ],
        comparisonTitle: {
            el: "Σύγκριση δυνατοτήτων ασφαλιστών",
            en: "Agent feature comparison",
        },
        comparisonRows: [
            {
                category: { el: "Χαρτοφυλάκιο πελατών", en: "Client portfolio" },
                name: { el: "Πελάτες", en: "Clients" },
                values: {
                    "agent-free": "10",
                    "agent-starter": "100",
                    "agent-pro": "500",
                    "agent-agency": { el: "Απεριόριστοι", en: "Unlimited" },
                },
            },
            {
                name: { el: "Όλοι οι πελάτες σε μία οθόνη", en: "Every client on one screen" },
                values: {
                    "agent-free": true,
                    "agent-starter": true,
                    "agent-pro": true,
                    "agent-agency": true,
                },
            },
            {
                // The metered core of the agent product: an agent paying for a
                // plan has to be able to see how many policies it will read.
                // Figures are DEFAULT_ENTITLEMENT_LIMITS (plan-defaults.ts).
                name: { el: "Αναλύσεις AI ανά μήνα", en: "AI analyses per month" },
                values: {
                    "agent-free": "5",
                    "agent-starter": "50",
                    "agent-pro": "200",
                    "agent-agency": { el: "Απεριόριστες", en: "Unlimited" },
                },
            },
            {
                category: { el: "Καθημερινή δουλειά", en: "Day-to-day work" },
                name: { el: "Λίστα με ό,τι λήγει", en: "A list of what is running out" },
                values: {
                    "agent-free": false,
                    "agent-starter": true,
                    "agent-pro": true,
                    "agent-agency": true,
                },
            },
            {
                name: { el: "Μαζική αποστολή ασφαλιστηρίων", en: "Send many policies at once" },
                values: {
                    "agent-free": false,
                    "agent-starter": { el: "100 γραμμές", en: "100 rows" },
                    "agent-pro": { el: "500 γραμμές", en: "500 rows" },
                    "agent-agency": { el: "Απεριόριστες", en: "Unlimited" },
                },
            },
            {
                name: { el: "Ερωτηματολόγια πελατών", en: "Client questionnaires" },
                values: {
                    "agent-free": false,
                    "agent-starter": true,
                    "agent-pro": true,
                    "agent-agency": true,
                },
            },
            {
                category: { el: "Η ομάδα σας", en: "Your team" },
                name: { el: "Μέλη ομάδας", en: "Team members" },
                values: {
                    "agent-free": "1",
                    "agent-starter": "1",
                    "agent-pro": "3",
                    "agent-agency": { el: "Απεριόριστα", en: "Unlimited" },
                },
            },
        ],
        faqTitle: {
            el: "Συχνές ερωτήσεις ασφαλιστών",
            en: "Agent FAQs",
        },
        faqItems: [
            {
                // The CRM denial, verbatim from app/(public)/solutions/agents/faqs.ts:
                // this tab lists client counts and bulk import beside plan prices,
                // which is exactly the broker-CRM read the site denies elsewhere.
                question: {
                    el: "Είναι το PolicyWallet CRM για ασφαλιστικά γραφεία;",
                    en: "Is PolicyWallet a CRM for insurance agencies?",
                },
                answer: {
                    el: "Όχι. Είναι πλατφόρμα προσωπικής ανάλυσης ρίσκου: το πορτοφόλι ανήκει στον ασφαλισμένο και εσείς το βλέπετε μόνο αν εκείνος επιλέξει να το μοιραστεί. Δεν διαχειριζόμαστε το πελατολόγιό σας — διαβάζουμε τα ασφαλιστήρια των πελατών σας και σας δείχνουμε τι λέει το καθένα.",
                    en: "No. It is a personal risk intelligence platform: the wallet belongs to the policyholder, and you see it only if they choose to share it. We do not manage your book — we read your clients' policies and show you what each one says.",
                },
            },
            {
                question: {
                    el: "Μπορώ να διαχειρίζομαι πολλούς πελάτες;",
                    en: "Can I manage multiple clients?",
                },
                answer: {
                    el: "Ναι. Τα πλάνα για ασφαλιστές σας δίνουν όλους τους πελάτες σας σε ένα σημείο. Κάθε πλάνο έχει το δικό του όριο πελατών.",
                    en: "Yes. The agent plans put all your clients in one place. Each plan has its own client limit.",
                },
            },
            {
                question: {
                    el: "Μπορώ να προσκαλέσω πελάτες να βλέπουν τα ασφαλιστήριά τους;",
                    en: "Can I invite clients to view their policies?",
                },
                answer: {
                    el: "Ναι. Μοιράζεστε ασφαλιστήρια και αναφορές με τον πελάτη μέσα από την ίδια οθόνη.",
                    en: "Yes. You share policies and reports with your client from the same screen.",
                },
            },
            {
                question: {
                    el: "Υποστηρίζεται ομαδική συνεργασία στο γραφείο;",
                    en: "Do you support agency team collaboration?",
                },
                answer: {
                    el: "Ναι, στα μεγαλύτερα πλάνα. Κάθε μέλος της ομάδας βλέπει μόνο ό,τι του αναλογεί.",
                    en: "Yes, on the larger plans. Each team member sees only what is theirs.",
                },
            },
        ],
    },
}

