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
        // NOTE relabel-in-place: code key `plus` = "Starter" (€2.99),
        // code key `pro` = "Plus" (€7.99, the recommended AI tier).
        plus: {
            name: { el: 'Starter', en: 'Starter' },
            description: {
                el: 'Για βασική οργάνωση',
                en: 'For basic organization'
            },
            price: { el: '€2.99', en: '€2.99' },
            period: { el: '/μήνα', en: '/month' },
            annual: {
                price: { el: '€29', en: '€29' },
                period: { el: '/έτος', en: '/year' },
                savings: { el: 'Εξοικονομήστε 2 μήνες', en: 'Save 2 months' },
            },
        },
        pro: {
            name: { el: 'PolicyWallet Plus', en: 'PolicyWallet Plus' },
            description: {
                el: 'Πλήρης εμπειρία AI',
                en: 'The full AI experience'
            },
            price: { el: '€7.99', en: '€7.99' },
            period: { el: '/μήνα', en: '/month' },
            badge: { el: 'Δημοφιλές', en: 'Popular' },
            savings: { el: 'Καλύτερη αξία', en: 'Best value' },
            annual: {
                price: { el: '€79', en: '€79' },
                period: { el: '/έτος', en: '/year' },
                savings: { el: 'Εξοικονομήστε 2 μήνες', en: 'Save 2 months' },
            },
        },
    },


    // Feature Labels
    features: {
        policyLimit: {
            el: 'Μέχρι {count} συμβόλαια',
            en: 'Up to {count} policies'
        },
        policyLimitLabel: {
            el: 'Όριο συμβολαίων',
            en: 'Policy limit'
        },
        unlimitedPolicies: {
            el: 'Απεριόριστα συμβόλαια',
            en: 'Unlimited policies'
        },
        basicAI: {
            el: 'Βασική σύνοψη συμβολαίου από το AI',
            en: 'Basic AI policy summary'
        },
        advancedAI: {
            el: 'Προηγμένη ανάλυση AI',
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
            el: 'Προηγμένα analytics',
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
    },

    // Call-to-Action Buttons
    cta: {
        upgrade: { el: 'Αναβάθμιση', en: 'Upgrade' },
        processing: { el: 'ΠΕΡΙΜΕΝΕΤΕ...', en: 'PROCESSING...' },
        upgradeToPlus: { el: 'Αναβάθμιση σε Starter', en: 'Upgrade to Starter' },
        upgradeToPro: { el: 'Αναβάθμιση σε Plus', en: 'Upgrade to Plus' },
        getStarted: { el: 'Ξεκινήστε Δωρεάν', en: 'Get Started Free' },
        startPlus: { el: 'Ξεκινήστε Starter', en: 'Start Starter' },
        startPro: { el: 'Ξεκινήστε Plus', en: 'Start Plus' },
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
            el: 'Έχετε φτάσει το όριο των {limit} συμβολαίων',
            en: 'You\'ve reached your limit of {limit} policies'
        },
        upgradeToUnlock: {
            el: 'Αναβαθμίστε για να ξεκλειδώσετε αυτή τη λειτουργία',
            en: 'Upgrade to unlock this feature'
        },
        premiumFeature: {
            el: 'Αυτό είναι χαρακτηριστικό Premium',
            en: 'This is a Premium feature'
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
            el: 'Επιτυχής αναβάθμιση σε Premium!',
            en: 'Successfully upgraded to Premium!'
        },
        cancelSuccess: {
            el: 'Η συνδρομή ακυρώθηκε επιτυχώς',
            en: 'Subscription canceled successfully'
        },
        policiesUsed: {
            el: '{used} από {limit} συμβόλαια',
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
            answer: {
                el: 'Ναι — το Starter κοστίζει €29/έτος και το Plus €79/έτος, με 2 μήνες δωρεάν σε σχέση με τη μηνιαία χρέωση.',
                en: 'Yes — Starter is €29/year and Plus is €79/year, both giving you 2 months free versus paying monthly.'
            },
        },
        {
            question: {
                el: 'Είναι ασφαλής η πληρωμή;',
                en: 'Is payment secure?'
            },
            answer: {
                el: 'Απόλυτα. Χρησιμοποιούμε το Stripe, που προσφέρει κρυπτογράφηση τραπεζικού επιπέδου. Δεν αποθηκεύουμε τα στοιχεία της κάρτας σας.',
                en: 'Absolutely. We use Stripe, which provides bank-grade encryption. We never store your card details.'
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
