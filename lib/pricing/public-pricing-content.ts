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
}

export interface PublicPricingComparisonRow {
    category?: LocalizedText
    name: LocalizedText
    values: Record<string, boolean | string>
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
            el: "Από απλή οργάνωση συμβολαίων μέχρι πλήρη ανάλυση κάλυψης: κενά, λήξεις, απαντήσεις.",
            en: "From simple policy organization to full coverage analysis: gaps, renewals, answers.",
        },
        plans: [
            {
                key: "free",
                checkoutPlanId: null,
                name: { el: "Δωρεάν", en: "Free" },
                description: { el: "Για προσωπική έναρξη", en: "For personal getting started" },
                pricing: {
                    monthly: {
                        amount: "€0",
                        period: { el: "/μήνα", en: "/month" },
                    },
                },
                features: [
                    { label: { el: "1 συμβόλαιο", en: "1 policy" }, included: true },
                    { label: { el: "Βασική σύνοψη συμβολαίου από το AI", en: "Basic AI policy summary" }, included: true },
                    { label: { el: "Ημερομηνία ανανέωσης", en: "Renewal date" }, included: true },
                    { label: { el: "Υπενθυμίσεις ανανέωσης", en: "Renewal reminders" }, included: false },
                    { label: { el: "Πλήρης ανάλυση AI, ερωτήσεις & κενά κάλυψης", en: "Full AI analysis, Q&A & coverage gaps" }, included: false },
                ],
            },
            {
                key: "plus",
                checkoutPlanId: "ph-plus",
                name: { el: "Starter", en: "Starter" },
                description: { el: "Για βασική οργάνωση", en: "For basic organization" },
                pricing: {
                    monthly: {
                        amount: "€2.99",
                        period: { el: "/μήνα", en: "/month" },
                    },
                    annual: {
                        amount: "€29",
                        period: { el: "/έτος", en: "/year" },
                        savings: { el: "Εξοικονομείτε 2 μήνες", en: "Save 2 months" },
                    },
                },
                features: [
                    { label: { el: "Έως 5 συμβόλαια", en: "Up to 5 policies" }, included: true, highlight: true },
                    { label: { el: "Βασική σύνοψη & οργάνωση", en: "Basic summaries & organization" }, included: true },
                    { label: { el: "Υπενθυμίσεις ανανέωσης (email)", en: "Renewal reminders (email)" }, included: true },
                    { label: { el: "Πλήρης ανάλυση AI & ερωτήσεις", en: "Full AI analysis & Q&A" }, included: false },
                    { label: { el: "Εντοπισμός κενών & πολλαπλές ασφαλιστικές", en: "Gap detection & multi-insurer" }, included: false },
                ],
            },
            {
                key: "pro",
                checkoutPlanId: "ph-pro",
                name: { el: "PolicyWallet Plus", en: "PolicyWallet Plus" },
                description: { el: "Πλήρης εμπειρία AI", en: "The full AI experience" },
                badge: { el: "Προτείνεται", en: "Recommended" },
                isHighlighted: true,
                pricing: {
                    monthly: {
                        amount: "€7.99",
                        period: { el: "/μήνα", en: "/month" },
                    },
                    annual: {
                        amount: "€79",
                        period: { el: "/έτος", en: "/year" },
                        savings: { el: "Εξοικονομείτε 2 μήνες", en: "Save 2 months" },
                    },
                },
                features: [
                    { label: { el: "Απεριόριστα συμβόλαια", en: "Unlimited policies" }, included: true, highlight: true },
                    { label: { el: "Πλήρης ανάλυση AI & απεριόριστες ερωτήσεις", en: "Full AI analysis & unlimited Q&A" }, included: true, highlight: true },
                    { label: { el: "Εντοπισμός κενών & διπλών καλύψεων", en: "Gap & duplicate-coverage detection" }, included: true },
                    { label: { el: "Ανάλυση από πολλές ασφαλιστικές", en: "Multi-insurer insights" }, included: true },
                    { label: { el: "Έξυπνες υπενθυμίσεις, οδηγός ζημιάς & εξαγωγή αναφοράς", en: "Smart reminders, claim guide & report export" }, included: true },
                ],
            },
        ],
        comparisonTitle: {
            el: "Σύγκριση δυνατοτήτων ιδιωτών",
            en: "Individual feature comparison",
        },
        comparisonRows: [
            {
                category: { el: "Όρια χρήσης", en: "Usage limits" },
                name: { el: "Αριθμός συμβολαίων", en: "Number of policies" },
                values: { free: "1", plus: "5", pro: "Απεριόριστα / Unlimited" },
            },
            {
                name: { el: "Βασική σύνοψη συμβολαίου", en: "Basic policy summary" },
                values: { free: true, plus: true, pro: true },
            },
            {
                category: { el: "AI & ειδοποιήσεις", en: "AI & notifications" },
                name: { el: "Πλήρης ανάλυση AI", en: "Full AI analysis" },
                values: { free: false, plus: false, pro: true },
            },
            {
                name: { el: "Διαδραστικές ερωτήσεις AI", en: "Interactive AI Q&A" },
                values: { free: false, plus: false, pro: true },
            },
            {
                name: { el: "Εντοπισμός κενών & διπλών καλύψεων", en: "Gap & duplicate-coverage detection" },
                values: { free: false, plus: false, pro: true },
            },
            {
                name: { el: "Υπενθυμίσεις ανανέωσης (email)", en: "Renewal reminders (email)" },
                values: { free: false, plus: true, pro: true },
            },
            {
                name: { el: "Έξυπνες υπενθυμίσεις & εξαγωγή αναφοράς", en: "Smart reminders & report export" },
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
            en: "Individual FAQs",
        },
        faqItems: [
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
                    el: "Ναι, τα ετήσια πλάνα κοστίζουν λιγότερο από 12 μηνιαίες χρεώσεις και εμφανίζουν τη συνολική εξοικονόμηση.",
                    en: "Yes, yearly plans cost less than 12 monthly payments and display total savings.",
                },
            },
            {
                question: {
                    el: "Τι γίνεται αν ακυρώσω;",
                    en: "What happens if I cancel?",
                },
                answer: {
                    el: "Διατηρείτε πρόσβαση μέχρι το τέλος της ήδη πληρωμένης περιόδου χρέωσης.",
                    en: "You keep access until the end of your already paid billing period.",
                },
            },
        ],
    },
    agent: {
        heading: {
            el: "Πλάνα για πράκτορες & πρακτορεία",
            en: "Plans for agents & agencies",
        },
        subtitle: {
            el: "Σχεδιασμένα για multi-client χαρτοφυλάκιο, ανανεώσεις και συνεργασία ομάδας.",
            en: "Built for multi-client portfolio management, renewals, and team collaboration.",
        },
        plans: [
            {
                key: "agent-free",
                checkoutPlanId: null,
                name: { el: "Agent Free", en: "Agent Free" },
                description: { el: "Για πιλοτική χρήση", en: "For pilot usage" },
                pricing: {
                    monthly: {
                        amount: "€0",
                        period: { el: "/μήνα", en: "/month" },
                    },
                },
                features: [
                    { label: { el: "10 πελάτες", en: "10 customers" }, included: true },
                    { label: { el: "5 AI αναλύσεις / μήνα", en: "5 AI analyses / month" }, included: true },
                    { label: { el: "Βασικό client dashboard", en: "Basic client dashboard" }, included: true },
                    { label: { el: "Bulk import", en: "Bulk import" }, included: false },
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
                        amount: "€19.99",
                        period: { el: "/μήνα", en: "/month" },
                    },
                    annual: {
                        amount: "€199",
                        period: { el: "/έτος", en: "/year" },
                        savings: { el: "Εξοικονομείτε ~2 μήνες", en: "Save ~2 months" },
                    },
                },
                features: [
                    { label: { el: "100 πελάτες", en: "100 customers" }, included: true, highlight: true },
                    { label: { el: "Portfolio dashboard", en: "Portfolio dashboard" }, included: true, highlight: true },
                    { label: { el: "Renewal pipeline", en: "Renewal pipeline" }, included: true },
                    { label: { el: "Bulk import έως 100 γραμμές", en: "Bulk import up to 100 rows" }, included: true },
                    { label: { el: "Ερωτηματολόγια πελατών (5 πρότυπα)", en: "Client questionnaires (5 templates)" }, included: true },
                ],
            },
            {
                key: "agent-pro",
                checkoutPlanId: "agent-pro",
                name: { el: "Agent Pro", en: "Agent Pro" },
                description: { el: "Για ομάδες παραγωγής", en: "For production teams" },
                pricing: {
                    monthly: {
                        amount: "€49.99",
                        period: { el: "/μήνα", en: "/month" },
                    },
                    annual: {
                        amount: "€499",
                        period: { el: "/έτος", en: "/year" },
                        savings: { el: "Εξοικονομείτε ~€100", en: "Save ~€100" },
                    },
                },
                features: [
                    { label: { el: "500 πελάτες", en: "500 customers" }, included: true, highlight: true },
                    { label: { el: "Team έως 3 πράκτορες", en: "Team up to 3 agents" }, included: true },
                    { label: { el: "Cross-sell intelligence", en: "Cross-sell intelligence" }, included: true },
                    { label: { el: "Priority queue", en: "Priority queue" }, included: true },
                    { label: { el: "Παρακολούθηση προμηθειών", en: "Commission tracking" }, included: true },
                ],
            },
            {
                key: "agent-agency",
                checkoutPlanId: "agent-agency",
                name: { el: "Agency", en: "Agency" },
                description: { el: "Για πρακτορεία με ανάπτυξη", en: "For growing brokerages" },
                isContactPlan: true,
                pricing: {
                    monthly: {
                        amount: "€99.99",
                        period: { el: "/μήνα", en: "/month" },
                    },
                    annual: {
                        amount: "€999",
                        period: { el: "/έτος", en: "/year" },
                        savings: { el: "Εξοικονομείτε ~€200", en: "Save ~€200" },
                    },
                },
                features: [
                    { label: { el: "Απεριόριστοι πελάτες", en: "Unlimited customers" }, included: true, highlight: true },
                    { label: { el: "Απεριόριστη ομάδα", en: "Unlimited team members" }, included: true },
                    { label: { el: "Απεριόριστη μαζική εισαγωγή", en: "Unlimited bulk import" }, included: true },
                    { label: { el: "Μέγιστος προϋπολογισμός AI (25M tokens/μήνα)", en: "Largest AI budget (25M tokens/month)" }, included: true },
                    { label: { el: "Dedicated support", en: "Dedicated support" }, included: true },
                ],
            },
        ],
        comparisonTitle: {
            el: "Σύγκριση δυνατοτήτων πρακτόρων",
            en: "Agent feature comparison",
        },
        comparisonRows: [
            {
                category: { el: "Χαρτοφυλάκιο πελατών", en: "Client portfolio" },
                name: { el: "Πελάτες", en: "Customers" },
                values: {
                    "agent-free": "10",
                    "agent-starter": "100",
                    "agent-pro": "500",
                    "agent-agency": "Unlimited",
                },
            },
            {
                name: { el: "Client portfolio dashboard", en: "Client portfolio dashboard" },
                values: {
                    "agent-free": true,
                    "agent-starter": true,
                    "agent-pro": true,
                    "agent-agency": true,
                },
            },
            {
                category: { el: "Λειτουργίες ροής εργασιών", en: "Workflow features" },
                name: { el: "Renewal pipeline", en: "Renewal pipeline" },
                values: {
                    "agent-free": false,
                    "agent-starter": true,
                    "agent-pro": true,
                    "agent-agency": true,
                },
            },
            {
                name: { el: "Bulk policy import", en: "Bulk policy import" },
                values: {
                    "agent-free": "No",
                    "agent-starter": "100 rows",
                    "agent-pro": "500 rows",
                    "agent-agency": "Unlimited",
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
                category: { el: "Ομάδα & επεκτασιμότητα", en: "Team & scale" },
                name: { el: "Μέλη ομάδας", en: "Team members" },
                values: {
                    "agent-free": "1",
                    "agent-starter": "1",
                    "agent-pro": "3",
                    "agent-agency": "Unlimited",
                },
            },
        ],
        faqTitle: {
            el: "Συχνές ερωτήσεις πρακτόρων",
            en: "Agent FAQs",
        },
        faqItems: [
            {
                question: {
                    el: "Μπορώ να διαχειρίζομαι πολλούς πελάτες;",
                    en: "Can I manage multiple clients?",
                },
                answer: {
                    el: "Ναι. Τα agent πλάνα προσφέρουν πολυ-πελατειακό χαρτοφυλάκιο με διαφορετικά όρια ανά πλάνο.",
                    en: "Yes. Agent plans include multi-client portfolio management with tier-based limits.",
                },
            },
            {
                question: {
                    el: "Μπορώ να προσκαλέσω πελάτες να βλέπουν τα συμβόλαιά τους;",
                    en: "Can I invite clients to view their policies?",
                },
                answer: {
                    el: "Ναι, μπορείτε να μοιράζεστε policy views και αναφορές με πελάτες μέσα από το dashboard.",
                    en: "Yes, you can share policy views and reports with clients directly from the dashboard.",
                },
            },
            {
                question: {
                    el: "Υποστηρίζεται ομαδική συνεργασία στο πρακτορείο;",
                    en: "Do you support agency team collaboration?",
                },
                answer: {
                    el: "Στα ανώτερα πλάνα υποστηρίζεται role-based πρόσβαση και συνεργασία πολλών πρακτόρων.",
                    en: "Higher tiers support role-based access and collaboration across multiple agents.",
                },
            },
        ],
    },
}

