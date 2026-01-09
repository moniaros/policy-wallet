// Greek translations
export const el = {
    // Common
    common: {
        loading: 'Φόρτωση...',
        save: 'Αποθήκευση',
        cancel: 'Ακύρωση',
        delete: 'Διαγραφή',
        edit: 'Επεξεργασία',
        close: 'Κλείσιμο',
        back: 'Πίσω',
        next: 'Επόμενο',
        submit: 'Υποβολή',
        search: 'Αναζήτηση',
        filter: 'Φίλτρο',
        sort: 'Ταξινόμηση',
        actions: 'Ενέργειες',
        yes: 'Ναι',
        no: 'Όχι',
    },

    // Navigation
    nav: {
        wallet: 'Πορτοφόλι',
        coverage: 'Κάλυψη',
        coverageInsights: 'Ανάλυση Κάλυψης',
        notifications: 'Ειδοποιήσεις',
        account: 'Λογαριασμός',
        dashboard: 'Πίνακας Ελέγχου',
        customers: 'Πελάτες',
        opportunities: 'Ευκαιρίες',
        insights: 'Πληροφορίες',
        activity: 'Δραστηριότητα',
        admin: 'Διαχείριση',
        users: 'Χρήστες & Ρόλοι',
        insurers: 'Ασφαλιστικές Εταιρείες',
        insuranceTypes: 'Τύποι Ασφάλισης',
    },

    // Auth
    auth: {
        signIn: 'Σύνδεση',
        signOut: 'Αποσύνδεση',
        signUp: 'Εγγραφή',
        welcomeBack: 'Καλώς ήρθατε πίσω',
        emailAddress: 'Διεύθυνση email',
        sendMagicLink: 'Αποστολή Magic Link',
        checkEmail: 'Ελέγξτε το email σας',
        magicLinkSent: 'Σας στείλαμε ένα magic link στο',
        clickToSignIn: 'Κάντε κλικ στο link για να συνδεθείτε.',
        tryDifferentEmail: 'Δοκιμάστε διαφορετικό email',
        orContinueWith: 'Ή συνεχίστε με',
        google: 'Google',
        termsAgree: 'Συνδεόμενοι, συμφωνείτε με τους',
        terms: 'Όρους',
        and: 'και την',
        privacyPolicy: 'Πολιτική Απορρήτου',
    },

    // Wallet
    wallet: {
        title: 'Το Πορτοφόλι μου',
        addPolicy: 'Προσθήκη Ασφάλισης',
        uploadDocument: 'Μεταφόρτωση Εγγράφου',
        manualEntry: 'Χειροκίνητη Προσθήκη',
        noPolicies: 'Δεν έχετε ακόμα αποθηκεύσει ασφαλιστήριο',
        noPoliciesDesc: 'Ξεκινήστε προσθέτοντας το πρώτη σας ασφαλιστήριο',
        policyNumber: 'Αριθμός Συμβολαίου',
        insurer: 'Ασφαλιστική Εταιρεία',
        type: 'Τύπος',
        startDate: 'Ημερομηνία Έναρξης',
        endDate: 'Ημερομηνία Λήξης',
        premium: 'Ασφάλιστρο',
        status: 'Κατάσταση',
        documents: 'Έγγραφα',
        noDocuments: 'Δεν βρέθηκαν έγγραφα',
        uploadPolicyDocument: 'Μεταφόρτωση Εγγράφου Ασφάλισης',
        viewDetails: 'Προβολή Λεπτομερειών',
        policyDetails: 'Λεπτομέρειες Ασφάλισης',
        lineOfBusiness: 'Κλάδος',
        effectiveDate: 'Ημερομηνία Ισχύος',
        expirationDate: 'Ημερομηνία Λήξης',
        premiumAmount: 'Ποσό Ασφαλίστρου',
    },

    // Policy Types
    policyTypes: {
        motor: 'Αυτοκίνητο',
        health: 'Υγεία',
        home: 'Κατοικία',
        life: 'Ζωή',
        travel: 'Ταξιδιωτική',
        liability: 'Αστική Ευθύνη',
    },

    // Policy Status
    policyStatus: {
        active: 'Ενεργή',
        expiringSoon: 'Λήγει Σύντομα',
        expired: 'Έχει Λήξει',
        actionNeeded: 'Απαιτείται Ενέργεια',
        cancelled: 'Ακυρωμένη',
    },

    // User Menu
    userMenu: {
        profile: 'Προφίλ',
        settings: 'Ρυθμίσεις',
        language: 'Γλώσσα',
        greek: 'Ελληνικά',
        english: 'English',
        notifications: 'Ειδοποιήσεις',
        logout: 'Αποσύνδεση',
    },

    // Roles
    roles: {
        policyholder: 'Ασφαλισμένος',
        agent: 'Ασφαλιστικός Σύμβουλος',
        admin: 'Διαχειριστής',
        switchRole: 'Αλλαγή Ρόλου',
        currentRole: 'Τρέχων Ρόλος',
    },

    // Admin
    admin: {
        manageInsurers: 'Διαχείριση Ασφαλιστικών Εταιρειών',
        manageTypes: 'Διαχείριση Τύπων Ασφάλισης',
        addInsurer: 'Προσθήκη Ασφαλιστικής',
        addType: 'Προσθήκη Τύπου',
        insurerName: 'Όνομα Ασφαλιστικής',
        typeName: 'Όνομα Τύπου',
        slug: 'Slug (Εσωτερικό)',
        active: 'Ενεργό',
        inactive: 'Ανενεργό',
        currentInsurers: 'Τρέχουσες Ασφαλιστικές',
        currentTypes: 'Τρέχοντες Τύποι',
    },

    // Placeholders
    placeholders: {
        comingSoon: 'Έρχεται Σύντομα',
        milestone: 'Ορόσημο',
    },

    // Errors
    errors: {
        somethingWentWrong: 'Κάτι πήγε στραβά',
        tryAgain: 'Δοκιμάστε ξανά',
        notFound: 'Δεν βρέθηκε',
        unauthorized: 'Μη εξουσιοδοτημένο',
        accessDenied: 'Δεν έχετε πρόσβαση',
    },
}

export type TranslationKeys = typeof el
