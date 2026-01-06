import type { TranslationKeys } from './el'

// English translations
export const en: TranslationKeys = {
    // Common
    common: {
        loading: 'Loading...',
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        close: 'Close',
        back: 'Back',
        next: 'Next',
        submit: 'Submit',
        search: 'Search',
        filter: 'Filter',
        sort: 'Sort',
        actions: 'Actions',
        yes: 'Yes',
        no: 'No',
    },

    // Navigation
    nav: {
        wallet: 'Wallet',
        coverage: 'Coverage',
        coverageInsights: 'Coverage Insights',
        notifications: 'Notifications',
        account: 'Account',
        dashboard: 'Dashboard',
        customers: 'Customers',
        opportunities: 'Opportunities',
        insights: 'Insights',
        activity: 'Activity',
        admin: 'Administration',
        users: 'Users & Roles',
        insurers: 'Insurers',
        insuranceTypes: 'Insurance Types',
    },

    // Auth
    auth: {
        signIn: 'Sign In',
        signOut: 'Sign Out',
        signUp: 'Sign Up',
        welcomeBack: 'Welcome back',
        emailAddress: 'Email address',
        sendMagicLink: 'Send Magic Link',
        checkEmail: 'Check your email',
        magicLinkSent: "We've sent a magic link to",
        clickToSignIn: 'Click the link to sign in.',
        tryDifferentEmail: 'Try a different email',
        orContinueWith: 'Or continue with',
        google: 'Google',
        termsAgree: 'By signing in, you agree to our',
        terms: 'Terms',
        and: 'and',
        privacyPolicy: 'Privacy Policy',
    },

    // Wallet
    wallet: {
        title: 'My Wallet',
        addPolicy: 'Add Policy',
        uploadDocument: 'Upload Document',
        manualEntry: 'Manual Entry',
        noPolicies: "You don't have any policies yet",
        noPoliciesDesc: 'Get started by adding your first policy',
        policyNumber: 'Policy Number',
        insurer: 'Insurer',
        type: 'Type',
        startDate: 'Start Date',
        endDate: 'End Date',
        premium: 'Premium',
        status: 'Status',
        documents: 'Documents',
        noDocuments: 'No documents found',
        uploadPolicyDocument: 'Upload Policy Document',
        viewDetails: 'View Details',
        policyDetails: 'Policy Details',
        lineOfBusiness: 'Line of Business',
        effectiveDate: 'Effective Date',
        expirationDate: 'Expiration Date',
        premiumAmount: 'Premium Amount',
    },

    // Policy Types
    policyTypes: {
        motor: 'Motor',
        health: 'Health',
        home: 'Home',
        life: 'Life',
        travel: 'Travel',
        liability: 'Liability',
    },

    // Policy Status
    policyStatus: {
        active: 'Active',
        expiringSoon: 'Expiring Soon',
        expired: 'Expired',
        actionNeeded: 'Action Needed',
        cancelled: 'Cancelled',
    },

    // User Menu
    userMenu: {
        profile: 'Profile',
        settings: 'Settings',
        language: 'Language',
        greek: 'Ελληνικά',
        english: 'English',
        notifications: 'Notifications',
        logout: 'Logout',
    },

    // Roles
    roles: {
        policyholder: 'Policyholder',
        agent: 'Agent',
        admin: 'Administrator',
        switchRole: 'Switch Role',
        currentRole: 'Current Role',
    },

    // Admin
    admin: {
        manageInsurers: 'Manage Insurers',
        manageTypes: 'Manage Insurance Types',
        addInsurer: 'Add Insurer',
        addType: 'Add Type',
        insurerName: 'Insurer Name',
        typeName: 'Type Name',
        slug: 'Slug (Internal)',
        active: 'Active',
        inactive: 'Inactive',
        currentInsurers: 'Current Insurers',
        currentTypes: 'Current Types',
    },

    // Placeholders
    placeholders: {
        comingSoon: 'Coming Soon',
        milestone: 'Milestone',
    },

    // Errors
    errors: {
        somethingWentWrong: 'Something went wrong',
        tryAgain: 'Try again',
        notFound: 'Not found',
        unauthorized: 'Unauthorized',
        accessDenied: 'Access denied',
    },
}
