import type { Language } from "@/lib/i18n"
import { fixMojibakeObject } from "@/lib/i18n/fix-mojibake"

type RoleCopy = {
    shell: {
        agentSection: string
        agentProfile: string
        closeMenu: string
        theme: string
        roleViewingAs: (roleLabel: string) => string
    }
    defaults: {
        userName: string
        policyholderName: string
        agentName: string
        agentCompany: string
        vehicle: string
        property: string
        loadingError: string
    }
    tasks: {
        completed: string
        updateFailed: string
        updateError: string
        assignedBy: string
        viewDetails: string
        updating: string
    }
    agentSettings: {
        title: string
        subtitle: string
        agencyProfile: string
        verification: string
        payouts: string
        status: string
        pending: string
        verifiedDescription: string
        underReviewDescription: string
        agencyName: string
        agencyNamePlaceholder: string
        licenseNumber: string
        licenseNumberPlaceholder: string
        saveChanges: string
        saving: string
        dangerZone: string
        dangerDescription: string
        deactivateAccount: string
        updatedSuccess: string
        updatedError: string
    }
    agentDashboard: {
        workspace: string
        brandAgent: string
        briefing: string
        itemsAttention: (n: number) => string
        totalClients: string
        activePolicies: string
        pendingActions: string
        conversionRate: string
        clientStatus: string
        liveFeed: string
        viewAll: string
        online: string
        across: string
        clients: string
        requiresAttention: string
        inviteAcceptance: string
        thisWeek: string
        critical: string
        high: string
        medium: string
        noClientsYet: string
        due: string
        feedItems: Array<{ name: string; action: string; time: string; color: string }>
        dashboardTitle: string
        dashboardSubtitle: string
        recentActivity: string
        allCaughtUpSubtext: string
    }
    customerList: {
        searchPlaceholder: string
        all: string
        activated: string
        invited: string
        inactive: string
        selectedOne: string
        selectedMany: string
        sendEmail: string
        export: string
        emptyTitle: string
        emptySubtitle: string
        addClient: string
        tableClient: string
        tableContact: string
        tableStatus: string
        tablePolicies: string
        tableLastActivity: string
        never: string
        today: string
        yesterday: string
        daysAgo: (n: number) => string
        opportunitiesOne: string
        opportunitiesMany: string
        policies: string
        openOpportunityOne: string
        openOpportunityMany: string
        profile: string
        zeroHeadline: string
        zeroBenefit: string
        zeroCta: string
        zeroTrust: string
        zeroPreviewLabel: string
        zeroExampleName1: string
        zeroExampleMeta1: string
        zeroExampleName2: string
        zeroExampleMeta2: string
        invitedEmptyTitle: string
        invitedEmptySubtitle: string
        invitedEmptyCta: string
    }
    walletDashboard: {
        checkExpirations: string
        coverageUpToDate: string
        allPoliciesActive: string
        clearFilters: string
        addDetailsManually: string
        uploadDocument: string
        batchUpload: string
        addPolicyAria: string
        noPoliciesYet: string
        addFirstPolicy: string
        policiesCount: (n: number) => string
        viewList: string
        viewCard: string
        agentChat: string
        upgrade: string
        missingCoverages: string
        viewAllRecommendations: string
        healthTitle: string
        healthDescription: string
        homeTitle: string
        homeDescription: string
        lifeTitle: string
        lifeDescription: string
        petTitle: string
        petDescription: string
        yearlyFootprint: string
        emptyWalletTitle: string
        emptyWalletDescription: string
        expires: string
        policyCountLabel: string
        subtitle: string
    }
    auth: {
        createAccountTitle: string
        createAccountSubtitle: string
        fullNamePlaceholder: string
        emailPlaceholder: string
        passwordPlaceholder: string
        licensePlaceholder: string
        agencyPlaceholder: string
        termsAndConditions: string
        privacyPolicy: string
        joinAs: string
        switchAgent: string
        switchPolicyholder: string
        alreadyHaveAccount: string
        noAccount: string
        forgotPassword: string
        signInSubtitle: string
        resendVerification: string
        resendSent: string
        checkInbox: string
        unverified: string
        orContinueWith: string
    }
}

const roleCopy: Record<Language, RoleCopy> = {
    el: {
        shell: {
            agentSection: "Πρακτορείο",
            agentProfile: "Προφίλ Συμβούλου",
            closeMenu: "Κλείσιμο μενού",
            theme: "Θέμα εμφάνισης",
            roleViewingAs: (roleLabel: string) => `Προβολή ως ${roleLabel}`,
        },
        defaults: {
            userName: "Χρήστης",
            policyholderName: "Ασφαλισμένος",
            agentName: "Ασφαλιστικός Σύμβουλος",
            agentCompany: "Ασφαλιστικό Γραφείο",
            vehicle: "Όχημα",
            property: "Ακίνητο",
            loadingError: "Σφάλμα φόρτωσης λογαριασμού.",
        },
        tasks: {
            completed: "Η εργασία ολοκληρώθηκε.",
            updateFailed: "Η ενημέρωση της εργασίας απέτυχε.",
            updateError: "Παρουσιάστηκε σφάλμα κατά την ενημέρωση της εργασίας.",
            assignedBy: "Ανάθεση από",
            viewDetails: "Προβολή λεπτομερειών",
            updating: "Ενημέρωση...",
        },
        agentSettings: {
            title: "Ρυθμίσεις Συμβούλου",
            subtitle: "Διαχειριστείτε το προφίλ πρακτορείου και τα επαγγελματικά στοιχεία σας.",
            agencyProfile: "Προφίλ Πρακτορείου",
            verification: "Πιστοποίηση",
            payouts: "Εκκαθαρίσεις",
            status: "Κατάσταση",
            pending: "Σε αξιολόγηση",
            verifiedDescription: "Τα επαγγελματικά σας στοιχεία έχουν επιβεβαιωθεί.",
            underReviewDescription: "Το προφίλ σας αξιολογείται από την ομάδα κανονιστικής συμμόρφωσης.",
            agencyName: "Επωνυμία Πρακτορείου",
            agencyNamePlaceholder: "π.χ. Alpha Insurance Advisors",
            licenseNumber: "Αριθμός Άδειας",
            licenseNumberPlaceholder: "π.χ. LIC-12345678",
            saveChanges: "Αποθήκευση αλλαγών",
            saving: "Αποθήκευση...",
            dangerZone: "Ζώνη Κινδύνου",
            dangerDescription: "Η ενέργεια θα απενεργοποιήσει οριστικά τον λογαριασμό συμβούλου και τα σχετικά δεδομένα πελατών.",
            deactivateAccount: "Απενεργοποίηση Λογαριασμού",
            updatedSuccess: "Το προφίλ ενημερώθηκε επιτυχώς.",
            updatedError: "Δεν ήταν δυνατή η ενημέρωση του προφίλ.",
        },
        agentDashboard: {
            workspace: "Χώρος Εργασίας",
            brandAgent: "Σύμβουλος",
            briefing: "Η σημερινή σας ενημέρωση. Έχετε",
            itemsAttention: (n: number) => `${n} ${n === 1 ? "στοιχείο" : "στοιχεία"} που χρειάζονται προσοχή.`,
            totalClients: "Σύνολο Πελατών",
            activePolicies: "Ενεργά Συμβόλαια",
            pendingActions: "Εκκρεμείς Ενέργειες",
            conversionRate: "Ρυθμός Μετατροπής",
            clientStatus: "Κατάσταση Πελατών",
            liveFeed: "Ζωντανή Ροή",
            viewAll: "Προβολή Όλων",
            online: "Συνδεδεμένος",
            across: "σε",
            clients: "πελάτες",
            requiresAttention: "Χρειάζεται προσοχή",
            inviteAcceptance: "Αποδοχή πρόσκλησης",
            thisWeek: "αυτή την εβδομάδα",
            critical: "Κρίσιμο",
            high: "Υψηλό",
            medium: "Μεσαίο",
            noClientsYet: "Δεν υπάρχουν πελάτες ακόμη",
            due: "Προθεσμία",
            feedItems: [
                { name: "Μαρία Κ.", action: "ανέβασε συμβόλαιο αυτοκινήτου", time: "2 λεπτά πριν", color: "blue" },
                { name: "Γιάννης Δ.", action: "εντοπίστηκε νέο κενό κάλυψης", time: "1 ώρα πριν", color: "purple" },
                { name: "Σταύρος Λ.", action: "αποδέχθηκε πρόσκληση συνεργασίας", time: "3 ώρες πριν", color: "emerald" },
            ],
            dashboardTitle: "Πίνακας Συμβούλου",
            dashboardSubtitle: "Καλώς ήρθατε ξανά. Επισκόπηση ημέρας.",
            recentActivity: "Πρόσφατη Δραστηριότητα",
            allCaughtUpSubtext: "Δεν υπάρχουν εκκρεμότητες αυτή τη στιγμή. Συνεχίστε έτσι.",
        },
        customerList: {
            searchPlaceholder: "Αναζήτηση πελατών...",
            all: "Όλοι",
            activated: "Ενεργοί",
            invited: "Προσκεκλημένοι",
            inactive: "Ανενεργοί",
            selectedOne: "πελάτης επιλεγμένος",
            selectedMany: "πελάτες επιλεγμένοι",
            sendEmail: "Αποστολή email",
            export: "Εξαγωγή",
            emptyTitle: "Δεν βρέθηκαν πελάτες",
            emptySubtitle: "Δοκιμάστε να προσαρμόσετε φίλτρα ή λέξεις αναζήτησης.",
            addClient: "Προσθήκη Πελάτη",
            tableClient: "Πελάτης",
            tableContact: "Επικοινωνία",
            tableStatus: "Κατάσταση",
            tablePolicies: "Συμβόλαια",
            tableLastActivity: "Τελευταία Δραστηριότητα",
            never: "Ποτέ",
            today: "Σήμερα",
            yesterday: "Χθες",
            daysAgo: (n: number) => `${n}η πριν`,
            opportunitiesOne: "ευκαιρία",
            opportunitiesMany: "ευκαιρίες",
            policies: "συμβόλαια",
            openOpportunityOne: "ανοικτή ευκαιρία",
            openOpportunityMany: "ανοικτές ευκαιρίες",
            profile: "Προφίλ",
            zeroHeadline: "Χτίστε το πελατολόγιό σας",
            zeroBenefit: "Προσθέστε τον πρώτο σας πελάτη και δείτε καλύψεις, κενά και ανανεώσεις σε ένα ταμπλό.",
            zeroCta: "Προσθήκη πρώτου πελάτη",
            zeroTrust: "Τα δεδομένα πελατών μένουν ιδιωτικά — πρόσβαση μόνο με σχέση ή άδεια",
            zeroPreviewLabel: "Παράδειγμα",
            zeroExampleName1: "Μαρία Κ.",
            zeroExampleMeta1: "3 συμβόλαια · 1 κενό κάλυψης",
            zeroExampleName2: "Νίκος Δ.",
            zeroExampleMeta2: "2 συμβόλαια · ανανέωση σε 45 ημέρες",
            invitedEmptyTitle: "Καμία εκκρεμής πρόσκληση",
            invitedEmptySubtitle: "Οι προσκλήσεις ενεργοποιούν τους πελάτες σας — και το προφίλ σας γίνεται ο σύμβουλός τους στο app.",
            invitedEmptyCta: "Αποστολή πρόσκλησης",
        },
        walletDashboard: {
            checkExpirations: "Ελέγξτε λήξεις και πιθανά κενά κάλυψης.",
            coverageUpToDate: "Η κάλυψή σας είναι ενημερωμένη.",
            allPoliciesActive: "Όλα τα συμβόλαια είναι ενεργά",
            clearFilters: "Καθαρισμός φίλτρων",
            addDetailsManually: "Χειροκίνητη προσθήκη",
            uploadDocument: "Μεταφόρτωση εγγράφου",
            batchUpload: "Μαζική μεταφόρτωση",
            addPolicyAria: "Προσθήκη ασφαλιστηρίου",
            noPoliciesYet: "Το Πορτοφόλι Μου",
            addFirstPolicy: "Προσθήκη Συμβολαίου",
            policiesCount: (n: number) => `${n} Συμβόλαια`,
            viewList: "Προβολή Λίστας",
            viewCard: "Προβολή Κάρτας",
            agentChat: "Συνεργασία",
            upgrade: "Αναβάθμιση",
            missingCoverages: "Πιθανά κενά κάλυψης:",
            viewAllRecommendations: "Δείτε όλες τις προτάσεις →",
            healthTitle: "Ασφάλιση Υγείας",
            healthDescription: "Προστατέψτε την υγεία της οικογένειάς σας από απρόβλεπτα ιατρικά έξοδα.",
            homeTitle: "Ασφάλιση Κατοικίας",
            homeDescription: "Προστατέψτε την περιουσία σας από ζημιές, φυσικά φαινόμενα και κλοπή.",
            lifeTitle: "Ασφάλιση Ζωής",
            lifeDescription: "Εξασφαλίστε οικονομική στήριξη για τα αγαπημένα σας πρόσωπα.",
            petTitle: "Ασφάλιση Κατοικιδίου",
            petDescription: "Προστασία για κτηνιατρικά έξοδα και περίθαλψη κατοικιδίου.",
            yearlyFootprint: "Ετήσιο ασφαλιστικό αποτύπωμα",
            emptyWalletTitle: "Δεν υπάρχουν ασφαλιστήρια ακόμη",
            emptyWalletDescription: "Πρόσθεσε το πρώτο σου συμβόλαιο για να ξεκινήσεις.",
            expires: "Λήγει",
            policyCountLabel: "συμβόλαια",
            subtitle: "Τα ασφαλιστήριά σας σε μία καθαρή εικόνα.",
        },
        auth: {
            createAccountTitle: "Δημιουργία λογαριασμού",
            createAccountSubtitle: "Ξεκινήστε με το PolicyWallet σε λιγότερο από 2 λεπτά.",
            fullNamePlaceholder: "Όνομα Επώνυμο",
            emailPlaceholder: "name@example.com",
            passwordPlaceholder: "********",
            licensePlaceholder: "ΑΣ-12345",
            agencyPlaceholder: "Επωνυμία πρακτορείου",
            termsAndConditions: "Όρους Χρήσης",
            privacyPolicy: "Πολιτική Απορρήτου",
            joinAs: "Εγγραφή ως",
            switchAgent: "Είμαι ασφαλιστικός σύμβουλος",
            switchPolicyholder: "Συνέχεια ως ασφαλισμένος",
            alreadyHaveAccount: "Έχετε ήδη λογαριασμό;",
            noAccount: "Δεν έχετε λογαριασμό;",
            forgotPassword: "Ξέχασα τον κωδικό",
            signInSubtitle: "Συνδεθείτε για να διαχειριστείτε το ασφαλιστικό σας πορτοφόλι.",
            resendVerification: "Επανάληψη αποστολής email επιβεβαίωσης",
            resendSent: "Το email επιβεβαίωσης εστάλη.",
            checkInbox: "Ελέγξτε τα εισερχόμενα. Δεν το βρήκατε;",
            unverified: "Το email σας δεν έχει επιβεβαιωθεί ακόμη.",
            orContinueWith: "Ή συνεχίστε με",
        },
    },
    en: {
        shell: {
            agentSection: "Agency",
            agentProfile: "Advisor Profile",
            closeMenu: "Close menu",
            theme: "Theme",
            roleViewingAs: (roleLabel: string) => `Viewing as ${roleLabel}`,
        },
        defaults: {
            userName: "User",
            policyholderName: "Policyholder",
            agentName: "Insurance Advisor",
            agentCompany: "Insurance Agency",
            vehicle: "Vehicle",
            property: "Property",
            loadingError: "Error loading account data.",
        },
        tasks: {
            completed: "Task completed.",
            updateFailed: "Failed to update task.",
            updateError: "An error occurred while updating task.",
            assignedBy: "Assigned by",
            viewDetails: "View details",
            updating: "Updating...",
        },
        agentSettings: {
            title: "Advisor Settings",
            subtitle: "Manage your agency profile and professional credentials.",
            agencyProfile: "Agency Profile",
            verification: "Verification",
            payouts: "Payouts",
            status: "Status",
            pending: "Pending",
            verifiedDescription: "Your professional credentials have been verified.",
            underReviewDescription: "Your profile is currently under review by our compliance team.",
            agencyName: "Agency Name",
            agencyNamePlaceholder: "e.g. Acme Insurance Services",
            licenseNumber: "License Number",
            licenseNumberPlaceholder: "e.g. LIC-12345678",
            saveChanges: "Save Changes",
            saving: "Saving...",
            dangerZone: "Danger Zone",
            dangerDescription: "This action permanently deactivates your advisor account and related customer data.",
            deactivateAccount: "Deactivate Account",
            updatedSuccess: "Profile updated successfully.",
            updatedError: "Failed to update profile.",
        },
        agentDashboard: {
            workspace: "Workspace",
            brandAgent: "Agent",
            briefing: "Here is your daily briefing. You have",
            itemsAttention: (n: number) => `${n} ${n === 1 ? "item" : "items"} requiring attention.`,
            totalClients: "Total Clients",
            activePolicies: "Active Policies",
            pendingActions: "Pending Actions",
            conversionRate: "Conversion Rate",
            clientStatus: "Client Status",
            liveFeed: "Live Feed",
            viewAll: "View All",
            online: "Online",
            across: "across",
            clients: "clients",
            requiresAttention: "Requires attention",
            inviteAcceptance: "Invite acceptance",
            thisWeek: "this week",
            critical: "Critical",
            high: "High",
            medium: "Medium",
            noClientsYet: "No clients yet",
            due: "Due",
            feedItems: [
                { name: "Maria K.", action: "uploaded a motor policy", time: "2 mins ago", color: "blue" },
                { name: "John D.", action: "new coverage gap detected", time: "1 hour ago", color: "purple" },
                { name: "Stavros L.", action: "accepted collaboration invite", time: "3 hours ago", color: "emerald" },
            ],
            dashboardTitle: "Agent Dashboard",
            dashboardSubtitle: "Welcome back. Here is your daily overview.",
            recentActivity: "Recent Activity",
            allCaughtUpSubtext: "No priorities at the moment. Great work.",
        },
        customerList: {
            searchPlaceholder: "Search clients...",
            all: "All",
            activated: "Activated",
            invited: "Invited",
            inactive: "Inactive",
            selectedOne: "client selected",
            selectedMany: "clients selected",
            sendEmail: "Send email",
            export: "Export",
            emptyTitle: "No clients found",
            emptySubtitle: "Try adjusting your filters or search terms.",
            addClient: "Add Client",
            tableClient: "Client",
            tableContact: "Contact",
            tableStatus: "Status",
            tablePolicies: "Policies",
            tableLastActivity: "Last Activity",
            never: "Never",
            today: "Today",
            yesterday: "Yesterday",
            daysAgo: (n: number) => `${n}d ago`,
            opportunitiesOne: "opportunity",
            opportunitiesMany: "opportunities",
            policies: "policies",
            openOpportunityOne: "open opportunity",
            openOpportunityMany: "open opportunities",
            profile: "Profile",
            zeroHeadline: "Build your client book",
            zeroBenefit: "Add your first client and see coverage, gaps and renewals in one dashboard.",
            zeroCta: "Add your first client",
            zeroTrust: "Client data stays private — access only via relationship or permission",
            zeroPreviewLabel: "Example",
            zeroExampleName1: "Maria K.",
            zeroExampleMeta1: "3 policies · 1 coverage gap",
            zeroExampleName2: "Nikos D.",
            zeroExampleMeta2: "2 policies · renewal in 45 days",
            invitedEmptyTitle: "No pending invitations",
            invitedEmptySubtitle: "Invitations activate your clients — and you become their in-app advisor.",
            invitedEmptyCta: "Send an invitation",
        },
        walletDashboard: {
            checkExpirations: "Check expirations and potential coverage gaps.",
            coverageUpToDate: "Your coverage is up to date.",
            allPoliciesActive: "All policies are active",
            clearFilters: "Clear filters",
            addDetailsManually: "Add details manually",
            uploadDocument: "Upload document",
            batchUpload: "Batch upload",
            addPolicyAria: "Add policy",
            noPoliciesYet: "My Wallet",
            addFirstPolicy: "Add Policy",
            policiesCount: (n: number) => `${n} Policies`,
            viewList: "View List",
            viewCard: "View Card",
            agentChat: "Collaboration",
            upgrade: "Upgrade",
            missingCoverages: "Possible coverage gaps:",
            viewAllRecommendations: "See all recommendations →",
            healthTitle: "Health Insurance",
            healthDescription: "Protect your household from unexpected medical costs.",
            homeTitle: "Home Insurance",
            homeDescription: "Protect your property against damage, theft, and natural events.",
            lifeTitle: "Life Insurance",
            lifeDescription: "Secure financial support for your loved ones.",
            petTitle: "Pet Insurance",
            petDescription: "Protection for veterinary and treatment costs.",
            yearlyFootprint: "Yearly insurance footprint",
            emptyWalletTitle: "No policies yet",
            emptyWalletDescription: "Add your first policy to get started.",
            expires: "Expires",
            policyCountLabel: "policies",
            subtitle: "Your policies in one clear view.",
        },
        auth: {
            createAccountTitle: "Create your account",
            createAccountSubtitle: "Get started with PolicyWallet in under 2 minutes.",
            fullNamePlaceholder: "John Doe",
            emailPlaceholder: "name@example.com",
            passwordPlaceholder: "********",
            licensePlaceholder: "AG-12345",
            agencyPlaceholder: "Agency name",
            termsAndConditions: "Terms & Conditions",
            privacyPolicy: "Privacy Policy",
            joinAs: "Join as",
            switchAgent: "I am an insurance agent",
            switchPolicyholder: "Continue as policyholder",
            alreadyHaveAccount: "Already have an account?",
            noAccount: "Don't have an account?",
            forgotPassword: "Forgot password?",
            signInSubtitle: "Sign in to manage your insurance portfolio.",
            resendVerification: "Resend verification email",
            resendSent: "Verification email sent.",
            checkInbox: "Check your inbox. Missing it?",
            unverified: "Your email address has not been verified yet.",
            orContinueWith: "Or continue with",
        },
    },
}

export function getRoleCopy(language: Language): RoleCopy {
    return fixMojibakeObject(roleCopy[language] || roleCopy.el)
}
