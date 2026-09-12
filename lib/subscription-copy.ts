/**
 * Subscription & Pricing Copy
 * Bilingual (Greek primary, English secondary)
 * Following PolicyWallet branding guidelines
 */

export const subscriptionCopy = {
    // Pricing Tiers
    tiers: {
        free: {
            name: { el: 'Δωρεάν', en: 'Free' },
            description: {
                el: 'Ιδανικό για να ξεκινήσετε',
                en: 'Perfect to get started'
            },
            price: { el: '€0', en: '€0' },
            period: { el: '/μήνα', en: '/month' },
        },
        // NOTE relabel-in-place: code key `plus` = "Plus" (€39/yr),
        // code key `pro` = "Family" (€79/yr, the recommended tier).
        plus: {
            name: { el: 'Plus', en: 'Plus' },
            description: {
                el: 'Για όλα τα δικά σας ασφαλιστήρια',
                en: 'For everything in your own name'
            },
            price: { el: '€4.99', en: '€4.99' },
            period: { el: '/μήνα', en: '/month' },
            annual: {
                price: { el: '€39', en: '€39' },
                period: { el: '/έτος', en: '/year' },
                savings: { el: 'Εξοικονομήστε 4 μήνες', en: 'Save 4 months' },
            },
        },
        pro: {
            name: { el: 'Family', en: 'Family' },
            description: {
                el: 'Για τα ασφαλιστήρια όλου του σπιτιού',
                en: "For the whole household's policies"
            },
            price: { el: '€8.99', en: '€8.99' },
            period: { el: '/μήνα', en: '/month' },
            badge: { el: 'Δημοφιλές', en: 'Popular' },
            savings: { el: 'Καλύτερη αξία', en: 'Best value' },
            annual: {
                price: { el: '€79', en: '€79' },
                period: { el: '/έτος', en: '/year' },
                savings: { el: 'Εξοικονομήστε 3 μήνες', en: 'Save 3 months' },
            },
        },
    },


    // Feature Labels
    features: {
        policyLimit: {
            el: 'Μέχρι {count} ασφαλιστήρια',
            en: 'Up to {count} policies'
        },
        policyLimitLabel: {
            el: 'Όριο ασφαλιστηρίων',
            en: 'Policy limit'
        },
        unlimitedPolicies: {
            el: 'Απεριόριστα ασφαλιστήρια',
            en: 'Unlimited policies'
        },
        basicAI: {
            el: 'Βασική σύνοψη ασφαλιστηρίου από το AI',
            en: 'Basic AI policy summary'
        },
        advancedAI: {
            el: 'Πλήρης ανάλυση AI',
            en: 'Advanced AI analysis'
        },
        manualGapDetection: {
            el: 'Χειροκίνητος εντοπισμός κενών',
            en: 'Manual gap detection'
        },
        automaticGapDetection: {
            el: 'Αυτόματος εντοπισμός κενών',
            en: 'Automatic gap detection'
        },
        documentStorage: {
            el: 'Ασφαλής αποθήκευση εγγράφων',
            en: 'Secure document storage'
        },
        basicInsights: {
            el: 'Βασικές πληροφορίες κάλυψης',
            en: 'Basic coverage insights'
        },
        emailNotifications: {
            el: 'Ειδοποιήσεις email',
            en: 'Email notifications'
        },
        interactiveQA: {
            el: 'Διαδραστικές ερωτήσεις AI',
            en: 'Interactive AI Q&A'
        },
        prioritySupport: {
            el: 'Υποστήριξη προτεραιότητας',
            en: 'Priority support'
        },
        advancedAnalytics: {
            el: 'Αναλυτικά στοιχεία',
            en: 'Advanced analytics'
        },
        agentCollaboration: {
            el: 'Συνεργασία με σύμβουλο',
            en: 'Agent collaboration'
        },
        digitalWallet: {
            el: 'Ψηφιακό πορτοφόλι',
            en: 'Digital wallet integration'
        },
    },

    // Billing period toggle
    billing: {
        monthly: { el: 'Μηνιαία', en: 'Monthly' },
        annual: { el: 'Ετήσια', en: 'Yearly' },
    },

    // Free-trial affordances
    trial: {
        badge: { el: '14 ΗΜΕΡΕΣ ΔΩΡΕΑΝ', en: '14-DAY FREE TRIAL' },
        cta: { el: 'ΔΩΡΕΑΝ ΔΟΚΙΜΗ 14 ΗΜΕΡΩΝ', en: 'START 14-DAY FREE TRIAL' },
        startCta: { el: 'Ξεκινήστε δωρεάν δοκιμή 14 ημερών', en: 'Start 14-Day Free Trial' },
    },

    // Call-to-Action Buttons
    cta: {
        upgrade: { el: 'Αναβάθμιση', en: 'Upgrade' },
        processing: { el: 'ΠΕΡΙΜΕΝΕΤΕ...', en: 'PROCESSING...' },
        // The KEY names the code tier, the VALUE must name the same tier.
        // These four drifted: `upgradeToPlus` said «Starter» and `upgradeToPro`
        // said «Plus», so the CTA for one plan carried the other plan's name —
        // the same inversion that let «Plus» mean two different prices.
        basePlan: { el: 'Βασικό πλάνο', en: 'Base plan' },
        upgradeToPlus: { el: 'Αναβάθμιση σε Plus', en: 'Upgrade to Plus' },
        upgradeToPro: { el: 'Αναβάθμιση σε Family', en: 'Upgrade to Family' },
        getStarted: { el: 'Ξεκινήστε Δωρεάν', en: 'Get Started Free' },
        startPlus: { el: 'Ξεκινήστε Plus', en: 'Start Plus' },
        startPro: { el: 'Ξεκινήστε Family', en: 'Start Family' },
        currentPlan: { el: 'Τρέχον Πλάνο', en: 'Current Plan' },
        manage: { el: 'Διαχείριση Συνδρομής', en: 'Manage Subscription' },
        cancel: { el: 'Ακύρωση', en: 'Cancel' },
        reactivate: { el: 'Επανενεργοποίηση', en: 'Reactivate' },
        updatePayment: { el: 'Ενημέρωση Πληρωμής', en: 'Update Payment' },
        viewInvoices: { el: 'Προβολή Τιμολογίων', en: 'View Invoices' },
        downloadPDF: { el: 'Λήψη PDF', en: 'Download PDF' },
    },

    // Page Headings
    headings: {
        pricing: {
            badge: {
                el: 'Αναβάθμιση λογαριασμού',
                en: 'Account upgrade'
            },
            title: {
                el: 'Επιλέξτε το Πλάνο που σας Ταιριάζει',
                en: 'Choose the Plan That Fits You'
            },
            subtitle: {
                el: 'Ξεκινήστε δωρεάν και αναβαθμίστε όποτε είστε έτοιμοι',
                en: 'Start free and upgrade when you\'re ready'
            },
        },
        comparison: {
            title: {
                el: 'Σύγκριση Χαρακτηριστικών',
                en: 'Feature Comparison'
            },
            featureColumn: {
                el: 'Χαρακτηριστικό',
                en: 'Feature'
            },
        },
        faq: {
            title: {
                el: 'Συχνές Ερωτήσεις',
                en: 'Frequently Asked Questions'
            },
        },
        account: {
            subscription: {
                el: 'Συνδρομή & Χρεώσεις',
                en: 'Subscription & Billing'
            },
            currentPlan: {
                el: 'Τρέχον Πλάνο',
                en: 'Current Plan'
            },
            paymentMethod: {
                el: 'Μέθοδος Πληρωμής',
                en: 'Payment Method'
            },
            billingHistory: {
                el: 'Ιστορικό Χρεώσεων',
                en: 'Billing History'
            },
        },
    },

    // Status Messages
    messages: {
        limitReached: {
            el: 'Έχετε φτάσει το όριο των {limit} ασφαλιστηρίων',
            en: 'You\'ve reached your limit of {limit} policies'
        },
        upgradeToUnlock: {
            el: 'Αναβαθμίστε για να αποκτήσετε αυτή τη λειτουργία',
            en: 'Upgrade to unlock this feature'
        },
        premiumFeature: {
            el: 'Αυτή η λειτουργία απαιτεί αναβάθμιση',
            en: 'This feature requires an upgrade'
        },
        nextBilling: {
            el: 'Επόμενη χρέωση: {date}',
            en: 'Next billing: {date}'
        },
        canceledAccess: {
            el: 'Πρόσβαση μέχρι: {date}',
            en: 'Access until: {date}'
        },
        paymentFailed: {
            el: 'Η πληρωμή απέτυχε. Παρακαλώ ενημερώστε τη μέθοδο πληρωμής.',
            en: 'Payment failed. Please update your payment method.'
        },
        upgradeSuccess: {
            el: 'Η αναβάθμιση ολοκληρώθηκε!',
            en: 'Upgrade complete!'
        },
        cancelSuccess: {
            el: 'Η συνδρομή ακυρώθηκε επιτυχώς',
            en: 'Subscription canceled successfully'
        },
        policiesUsed: {
            el: '{used} από {limit} ασφαλιστήρια',
            en: '{used} of {limit} policies'
        },
        unlimited: {
            el: 'Απεριόριστα',
            en: 'Unlimited'
        },
    },

    // FAQ Items
    faq: [
        {
            question: {
                el: 'Μπορώ να αλλάξω πλάνο ανά πάσα στιγμή;',
                en: 'Can I change plans anytime?'
            },
            answer: {
                el: 'Ναι, μπορείτε να αναβαθμίσετε ή να υποβαθμίσετε το πλάνο σας ανά πάσα στιγμή. Οι αλλαγές θα εφαρμοστούν αμέσως.',
                en: 'Yes, you can upgrade or downgrade your plan at any time. Changes will be applied immediately.'
            },
        },
        {
            question: {
                el: 'Τι συμβαίνει αν ακυρώσω;',
                en: 'What happens if I cancel?'
            },
            answer: {
                el: 'Θα διατηρήσετε πρόσβαση μέχρι το τέλος της τρέχουσας περιόδου χρέωσης. Τα δεδομένα σας θα διατηρηθούν για 30 ημέρες.',
                en: 'You\'ll keep access until the end of your current billing period. Your data will be retained for 30 days.'
            },
        },
        {
            question: {
                el: 'Ποιες μέθοδοι πληρωμής δέχεστε;',
                en: 'What payment methods do you accept?'
            },
            answer: {
                el: 'Δεχόμαστε όλες τις κύριες πιστωτικές και χρεωστικές κάρτες μέσω Stripe (Visa, Mastercard, American Express).',
                en: 'We accept all major credit and debit cards via Stripe (Visa, Mastercard, American Express).'
            },
        },
        {
            question: {
                el: 'Υπάρχει έκπτωση για ετήσια συνδρομή;',
                en: 'Is there a discount for annual subscription?'
            },
            // {starterAnnual}/{plusAnnual} are interpolated at render time from
            // the live plan catalog (PricingComparison) — never hardcode € here.
            answer: {
                el: 'Ναι — το Plus κοστίζει {starterAnnual}/έτος και το Family {plusAnnual}/έτος, με έκπτωση σε σχέση με τη μηνιαία χρέωση.',
                en: 'Yes — Plus is {starterAnnual}/year and Family is {plusAnnual}/year, both discounted versus paying monthly.'
            },
        },
        {
            question: {
                el: 'Είναι ασφαλής η πληρωμή;',
                en: 'Is payment secure?'
            },
            answer: {
                el: 'Οι πληρωμές γίνονται εξ ολοκλήρου μέσα στο Stripe, πιστοποιημένο κατά PCI DSS Level 1. Τα στοιχεία της κάρτας σας δεν περνούν ποτέ από τους δικούς μας διακομιστές και δεν τα αποθηκεύουμε.',
                en: "Payments run entirely inside Stripe, which is certified PCI DSS Level 1. Your card details never pass through our servers, and we never store them."
            },
        },
        {
            question: {
                el: 'Μπορώ να αναβαθμίσω αργότερα;',
                en: 'Can I upgrade later?'
            },
            answer: {
                el: 'Φυσικά! Ξεκινήστε με το δωρεάν πλάνο και αναβαθμίστε όποτε χρειάζεστε περισσότερες δυνατότητες.',
                en: 'Of course! Start with the free plan and upgrade whenever you need more features.'
            },
        },
    ],

    // Trust Signals
    trust: {
        secure: {
            el: 'Ασφαλής πληρωμή με Stripe',
            en: 'Secure payment with Stripe'
        },
        cancelAnytime: {
            el: 'Ακύρωση ανά πάσα στιγμή',
            en: 'Cancel anytime'
        },
        noHiddenFees: {
            el: 'Χωρίς κρυφές χρεώσεις',
            en: 'No hidden fees'
        },
        dataRetention: {
            el: 'Τα δεδομένα σας προστατεύονται',
            en: 'Your data is protected'
        },
    },
}

/**
 * The ONE customer-facing name for a plan tier.
 *
 * `UpgradeModal` and `CarriedPlanCard` used to hardcode their own pair —
 * «Starter» for code key `plus` and «Plus» for code key `pro`. Every other
 * surface (this file, the public pricing page, the landing page, the help
 * centre) says «Plus» and «Family». So the word «Plus» named TWO different
 * plans at two different prices on the same purchase path: the modal offered
 * «Συνέχεια με Plus — 8,99 €» for `pro` while `/upgrade` listed a plan
 * genuinely called «Plus» at €4.99. A customer could read one and be charged
 * the other.
 *
 * Nothing may hardcode a tier name again. `tests/unit/plan-display-names-agree.test.ts`
 * enumerates the name sources and fails if two disagree.
 */
export function planTierName(tier: 'free' | 'plus' | 'pro', language: string): string {
    const name = subscriptionCopy.tiers[tier].name
    return language === 'el' ? name.el : name.en
}

// Helper function to format messages with variables
export function formatMessage(
    template: string,
    variables: Record<string, string | number>
): string {
    return Object.entries(variables).reduce(
        (result, [key, value]) => result.replace(`{${key}}`, String(value)),
        template
    )
}

// Helper to get copy by path
export function getSubscriptionCopy(
    path: string,
    language: 'el' | 'en' = 'el'
): string {
    const keys = path.split('.')
    let value: any = subscriptionCopy

    for (const key of keys) {
        value = value?.[key]
    }

    if (typeof value === 'object' && value !== null && language in value) {
        return value[language]
    }

    return value
}
