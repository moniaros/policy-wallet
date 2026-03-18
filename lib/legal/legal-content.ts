import { fixMojibakeObject } from "@/lib/i18n/fix-mojibake"

export type LegalLanguage = "el" | "en"
export type LegalDocumentKind = "terms" | "privacy"

export type LegalSection = {
    id: string
    title: string
    paragraphs: string[]
}

export type LegalDocument = {
    title: string
    intro: string[]
    sections: LegalSection[]
}

type LegalUiCopy = {
    lastUpdatedLabel: string
    versionLabel: string
    backToHome: string
    switchLanguage: string
    openTerms: string
    openPrivacy: string
}

type LegalContent = {
    ui: LegalUiCopy
    terms: LegalDocument
    privacy: LegalDocument
}

export const LEGAL_CONTENT_VERSION = "GR-GA-2026.03"
export const LEGAL_LAST_UPDATED = "March 2, 2026"

const legalContentByLanguageRaw: Record<LegalLanguage, LegalContent> = {
    el: {
        ui: {
            lastUpdatedLabel: "Τελευταία ενημέρωση",
            versionLabel: "Έκδοση",
            backToHome: "Επιστροφή στην αρχική",
            switchLanguage: "English",
            openTerms: "Όροι Χρήσης",
            openPrivacy: "Πολιτική Απορρήτου",
        },
        terms: {
            title: "Όροι Χρήσης",
            intro: [
                "Καλωσορίσατε στο PolicyWallet. Με τη χρήση της πλατφόρμας αποδέχεστε τους παρόντες όρους.",
                "Οι όροι ισχύουν για policyholder, agent και admin επιφάνειες της υπηρεσίας.",
            ],
            sections: [
                {
                    id: "acceptance",
                    title: "1. Αποδοχή Όρων",
                    paragraphs: [
                        "Η δημιουργία λογαριασμού ή η χρήση οποιασδήποτε λειτουργίας σημαίνει αποδοχή των όρων.",
                        "Αν δεν συμφωνείτε με τους όρους, δεν πρέπει να χρησιμοποιείτε την υπηρεσία.",
                    ],
                },
                {
                    id: "service_scope",
                    title: "2. Πεδίο Υπηρεσίας",
                    paragraphs: [
                        "Το PolicyWallet παρέχει ψηφιακή οργάνωση συμβολαίων, εργαλεία ανάλυσης και συνεργατικές ροές.",
                        "Το PolicyWallet δεν είναι ασφαλιστική εταιρεία και δεν εκδίδει ασφαλιστικά προϊόντα.",
                    ],
                },
                {
                    id: "account_security",
                    title: "3. Λογαριασμός και Ασφάλεια",
                    paragraphs: [
                        "Είστε υπεύθυνοι για την προστασία των διαπιστευτηρίων πρόσβασης.",
                        "Οφείλετε να ενημερώνετε άμεσα για μη εξουσιοδοτημένη χρήση ή παραβίαση λογαριασμού.",
                    ],
                },
                {
                    id: "user_obligations",
                    title: "4. Υποχρεώσεις Χρήστη",
                    paragraphs: [
                        "Τα δεδομένα που ανεβάζετε πρέπει να είναι ακριβή και να σας ανήκουν ή να έχετε δικαίωμα χρήσης.",
                        "Απαγορεύεται χρήση της πλατφόρμας για παράνομη δραστηριότητα ή κακόβουλη αυτοματοποίηση.",
                    ],
                },
                {
                    id: "fees_billing",
                    title: "5. Χρεώσεις και Συνδρομές",
                    paragraphs: [
                        "Οι χρεώσεις και τα διαθέσιμα πλάνα εμφανίζονται πριν την ολοκλήρωση αγοράς.",
                        "Η τιμολόγηση εφαρμόζεται σύμφωνα με το ενεργό πλάνο και τους ισχύοντες φόρους.",
                    ],
                },
                {
                    id: "ai_disclaimer",
                    title: "6. AI Ανάλυση και Αποποίηση",
                    paragraphs: [
                        "Οι αναλύσεις AI παρέχουν υποστηρικτική πληροφόρηση και δεν αποτελούν νομική ή ασφαλιστική συμβουλή.",
                        "Συνιστάται επιβεβαίωση κρίσιμων αποφάσεων με εξουσιοδοτημένο επαγγελματία.",
                    ],
                },
                {
                    id: "liability",
                    title: "7. Περιορισμός Ευθύνης",
                    paragraphs: [
                        "Η υπηρεσία παρέχεται \"ως έχει\" στο μέτρο που επιτρέπει η ισχύουσα νομοθεσία.",
                        "Το PolicyWallet δεν ευθύνεται για έμμεσες ή παρεπόμενες ζημίες από χρήση της πλατφόρμας.",
                    ],
                },
                {
                    id: "governing_law",
                    title: "8. Εφαρμοστέο Δίκαιο και Επικοινωνία",
                    paragraphs: [
                        "Οι όροι διέπονται από το Ελληνικό δίκαιο και το εφαρμοστέο δίκαιο της ΕΕ.",
                        "Για νομικά ή κανονιστικά θέματα μπορείτε να επικοινωνείτε στο support@policywallet.gr.",
                    ],
                },
            ],
        },
        privacy: {
            title: "Πολιτική Απορρήτου",
            intro: [
                "Το PolicyWallet επεξεργάζεται προσωπικά δεδομένα με βάση τον GDPR και την ελληνική νομοθεσία.",
                "Η παρούσα πολιτική περιγράφει τι συλλέγουμε, γιατί το συλλέγουμε και ποια δικαιώματα έχετε.",
            ],
            sections: [
                {
                    id: "controller",
                    title: "1. Υπεύθυνος Επεξεργασίας",
                    paragraphs: [
                        "Υπεύθυνος επεξεργασίας είναι το PolicyWallet για τις λειτουργίες της πλατφόρμας.",
                        "Για ζητήματα απορρήτου μπορείτε να επικοινωνείτε στο support@policywallet.gr.",
                    ],
                },
                {
                    id: "data_categories",
                    title: "2. Κατηγορίες Δεδομένων",
                    paragraphs: [
                        "Συλλέγουμε δεδομένα λογαριασμού, στοιχεία συμβολαίων, μεταδεδομένα εγγράφων και τεχνικά logs.",
                        "Οι κατηγορίες δεδομένων διαφέρουν ανά ρόλο χρήστη και λειτουργία υπηρεσίας.",
                    ],
                },
                {
                    id: "legal_bases",
                    title: "3. Νομικές Βάσεις Επεξεργασίας",
                    paragraphs: [
                        "Η επεξεργασία βασίζεται σε εκτέλεση σύμβασης, έννομο συμφέρον, νομική υποχρέωση ή συγκατάθεση.",
                        "Όπου απαιτείται συγκατάθεση (π.χ. cookies), μπορείτε να την ανακαλέσετε ανά πάσα στιγμή.",
                    ],
                },
                {
                    id: "processing_purposes",
                    title: "4. Σκοποί Επεξεργασίας",
                    paragraphs: [
                        "Χρησιμοποιούμε δεδομένα για παροχή υπηρεσίας, ασφάλεια, ανάλυση συμβολαίων και υποστήριξη.",
                        "Δεν πωλούμε προσωπικά δεδομένα σε τρίτους για ανεξάρτητη εμπορική χρήση.",
                    ],
                },
                {
                    id: "sharing_processors",
                    title: "5. Διαβίβαση και Εκτελούντες Επεξεργασία",
                    paragraphs: [
                        "Χρησιμοποιούμε τεχνικούς παρόχους για υποδομή, πληρωμές και επικοινωνία με συμβατικές εγγυήσεις.",
                        "Η διαβίβαση γίνεται μόνο στο αναγκαίο πλαίσιο και με κατάλληλα μέτρα προστασίας.",
                    ],
                },
                {
                    id: "retention",
                    title: "6. Χρόνος Τήρησης",
                    paragraphs: [
                        "Τηρούμε δεδομένα για όσο απαιτείται για την παροχή υπηρεσίας, νομικές υποχρεώσεις και ασφάλεια.",
                        "Μετά τη λήξη περιόδων τήρησης εφαρμόζεται διαγραφή ή ανωνυμοποίηση όπου επιτρέπεται.",
                    ],
                },
                {
                    id: "gdpr_rights",
                    title: "7. Δικαιώματα Υποκειμένου",
                    paragraphs: [
                        "Μπορείτε να ζητήσετε πρόσβαση, διόρθωση, φορητότητα, περιορισμό ή διαγραφή δεδομένων.",
                        "Υποστηρίζονται ροές αιτημάτων export και deletion μέσω των διαθέσιμων GDPR endpoints.",
                    ],
                },
                {
                    id: "security_transfers",
                    title: "8. Ασφάλεια και Διαβιβάσεις",
                    paragraphs: [
                        "Εφαρμόζουμε τεχνικά και οργανωτικά μέτρα ασφάλειας για προστασία δεδομένων.",
                        "Διασυνοριακές διαβιβάσεις, όπου υπάρχουν, καλύπτονται από κατάλληλες νομικές εγγυήσεις.",
                    ],
                },
            ],
        },
    },
    en: {
        ui: {
            lastUpdatedLabel: "Last updated",
            versionLabel: "Version",
            backToHome: "Back to home",
            switchLanguage: "Ελληνικά",
            openTerms: "Terms of Service",
            openPrivacy: "Privacy Policy",
        },
        terms: {
            title: "Terms of Service",
            intro: [
                "Welcome to PolicyWallet. By using the platform you agree to these terms.",
                "These terms apply to policyholder, agent, and admin surfaces of the service.",
            ],
            sections: [
                {
                    id: "acceptance",
                    title: "1. Acceptance of Terms",
                    paragraphs: [
                        "Creating an account or using any feature means you accept these terms.",
                        "If you do not agree, you must not use the service.",
                    ],
                },
                {
                    id: "service_scope",
                    title: "2. Service Scope",
                    paragraphs: [
                        "PolicyWallet provides digital policy organization, analysis tooling, and collaboration workflows.",
                        "PolicyWallet is not an insurance carrier and does not underwrite insurance products.",
                    ],
                },
                {
                    id: "account_security",
                    title: "3. Account and Security",
                    paragraphs: [
                        "You are responsible for safeguarding your account credentials.",
                        "You must promptly report unauthorized use or account compromise.",
                    ],
                },
                {
                    id: "user_obligations",
                    title: "4. User Obligations",
                    paragraphs: [
                        "Data you upload must be accurate and owned by you, or lawfully controlled by you.",
                        "Using the platform for unlawful activity or abusive automation is prohibited.",
                    ],
                },
                {
                    id: "fees_billing",
                    title: "5. Fees and Billing",
                    paragraphs: [
                        "Applicable fees and plans are presented before purchase confirmation.",
                        "Billing is applied according to your active plan and applicable taxes.",
                    ],
                },
                {
                    id: "ai_disclaimer",
                    title: "6. AI Analysis Disclaimer",
                    paragraphs: [
                        "AI outputs are informational support and are not legal or insurance advice.",
                        "You should verify critical decisions with a licensed professional.",
                    ],
                },
                {
                    id: "liability",
                    title: "7. Limitation of Liability",
                    paragraphs: [
                        "The service is provided \"as is\" to the maximum extent permitted by law.",
                        "PolicyWallet is not liable for indirect or consequential damages arising from platform use.",
                    ],
                },
                {
                    id: "governing_law",
                    title: "8. Governing Law and Contact",
                    paragraphs: [
                        "These terms are governed by Greek law and applicable EU law.",
                        "For legal or regulatory matters, contact support@policywallet.gr.",
                    ],
                },
            ],
        },
        privacy: {
            title: "Privacy Policy",
            intro: [
                "PolicyWallet processes personal data under GDPR and applicable Greek law.",
                "This policy explains what we collect, why we collect it, and your rights.",
            ],
            sections: [
                {
                    id: "controller",
                    title: "1. Data Controller",
                    paragraphs: [
                        "PolicyWallet acts as data controller for core platform operations.",
                        "For privacy inquiries, contact support@policywallet.gr.",
                    ],
                },
                {
                    id: "data_categories",
                    title: "2. Data Categories",
                    paragraphs: [
                        "We process account data, policy records, document metadata, and technical logs.",
                        "Data categories vary by user role and enabled product functionality.",
                    ],
                },
                {
                    id: "legal_bases",
                    title: "3. Legal Bases",
                    paragraphs: [
                        "Processing is based on contract performance, legitimate interest, legal obligation, or consent.",
                        "Where consent is required (for example cookies), you can withdraw it at any time.",
                    ],
                },
                {
                    id: "processing_purposes",
                    title: "4. Processing Purposes",
                    paragraphs: [
                        "We use data to deliver services, maintain security, analyze policies, and provide support.",
                        "We do not sell personal data to third parties for independent commercial use.",
                    ],
                },
                {
                    id: "sharing_processors",
                    title: "5. Sharing and Processors",
                    paragraphs: [
                        "We use processors for infrastructure, payments, and communications under contractual safeguards.",
                        "Data sharing is limited to what is required and protected by suitable controls.",
                    ],
                },
                {
                    id: "retention",
                    title: "6. Retention",
                    paragraphs: [
                        "We retain data only as long as needed for service delivery, legal obligations, and security.",
                        "After retention periods, data is deleted or anonymized where legally permitted.",
                    ],
                },
                {
                    id: "gdpr_rights",
                    title: "7. Data Subject Rights",
                    paragraphs: [
                        "You may request access, rectification, portability, restriction, or erasure of your data.",
                        "Export and deletion request workflows are available through GDPR endpoints.",
                    ],
                },
                {
                    id: "security_transfers",
                    title: "8. Security and Transfers",
                    paragraphs: [
                        "We apply technical and organizational safeguards to protect personal data.",
                        "Where cross-border transfers occur, appropriate legal safeguards are applied.",
                    ],
                },
            ],
        },
    },
}

const legalContentByLanguage = fixMojibakeObject(legalContentByLanguageRaw) as Record<LegalLanguage, LegalContent>

function assertLegalParity() {
    const documents: LegalDocumentKind[] = ["terms", "privacy"]
    for (const documentName of documents) {
        const elSectionIds = legalContentByLanguage.el[documentName].sections.map((section) => section.id)
        const enSectionIds = legalContentByLanguage.en[documentName].sections.map((section) => section.id)
        if (elSectionIds.length !== enSectionIds.length) {
            throw new Error(`Legal parity mismatch on ${documentName}: different section count`)
        }
        for (let i = 0; i < elSectionIds.length; i += 1) {
            if (elSectionIds[i] !== enSectionIds[i]) {
                throw new Error(`Legal parity mismatch on ${documentName}: section id mismatch at index ${i}`)
            }
        }
    }
}

assertLegalParity()

export function resolveLegalLanguage(langFromQuery: string | null | undefined, acceptLanguage: string | null | undefined): LegalLanguage {
    if (langFromQuery === "el" || langFromQuery === "en") return langFromQuery
    if (acceptLanguage?.toLowerCase().includes("en")) return "en"
    return "el"
}

export function getLegalContent(language: LegalLanguage) {
    return legalContentByLanguage[language]
}
