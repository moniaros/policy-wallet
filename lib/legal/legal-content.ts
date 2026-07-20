import { fixMojibakeObject } from "@/lib/i18n/fix-mojibake"

export type LegalLanguage = "el" | "en"
export type LegalDocumentKind = "terms" | "privacy" | "cookies" | "subprocessors"

export type LegalTable = {
    headers: string[]
    rows: string[][]
}

export type LegalSection = {
    id: string
    title: string
    paragraphs: string[]
    /** Optional data table rendered after the paragraphs. */
    table?: LegalTable
    /** Optional internal link rendered after the paragraphs/table. */
    link?: { href: string; label: string }
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
    openCookies: string
    openSubprocessors: string
}

type LegalContent = {
    ui: LegalUiCopy
    terms: LegalDocument
    privacy: LegalDocument
    cookies: LegalDocument
    subprocessors: LegalDocument
}

export const LEGAL_CONTENT_VERSION = "GR-GA-2026.03"
export const LEGAL_LAST_UPDATED = "March 2, 2026"

/**
 * Per-document header-meta overrides. Terms and Privacy deliberately keep the
 * shared GA constants above (their rendered header must not shift); the cookie
 * policy and subprocessors list ship on their own 2026.07 revision and carry an
 * ISO date that the renderer formats per locale.
 */
export const LEGAL_DOC_META: Partial<
    Record<LegalDocumentKind, { version: string; lastUpdatedIso: string }>
> = {
    cookies: { version: "GR-GA-2026.07", lastUpdatedIso: "2026-07-19" },
    subprocessors: { version: "GR-GA-2026.07", lastUpdatedIso: "2026-07-19" },
}

const legalContentByLanguageRaw: Record<LegalLanguage, LegalContent> = {
    el: {
        ui: {
            lastUpdatedLabel: "Τελευταία ενημέρωση",
            versionLabel: "Έκδοση",
            backToHome: "Επιστροφή στην αρχική",
            switchLanguage: "English",
            openTerms: "Όροι Χρήσης",
            openPrivacy: "Πολιτική Απορρήτου",
            openCookies: "Πολιτική Cookies",
            openSubprocessors: "Υπο-εκτελούντες Επεξεργασίας",
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
        cookies: {
            title: "Πολιτική Cookies",
            intro: [
                "Η σελίδα αυτή εξηγεί ποια cookies και συναφείς τεχνολογίες χρησιμοποιεί το PolicyWallet (policywallet.gr), για ποιον σκοπό και πώς μπορείτε να τα διαχειριστείτε.",
            ],
            sections: [
                {
                    id: "what_are_cookies",
                    title: "1. Τι είναι τα cookies",
                    paragraphs: [
                        "Τα cookies είναι μικρά αρχεία που αποθηκεύονται στη συσκευή σας όταν επισκέπτεστε έναν ιστότοπο, ώστε να «θυμάται» πληροφορίες όπως τη σύνδεσή σας ή τις προτιμήσεις σας. Παρόμοιο ρόλο παίζει και η τοπική αποθήκευση του φυλλομετρητή (localStorage).",
                    ],
                },
                {
                    id: "cookies_we_use",
                    title: "2. Ποια cookies χρησιμοποιούμε",
                    paragraphs: [
                        "Σήμερα η πλατφόρμα χρησιμοποιεί μόνο τα εξής:",
                    ],
                    table: {
                        headers: ["Όνομα", "Σκοπός", "Διάρκεια", "Κατηγορία"],
                        rows: [
                            [
                                "pw_cookie_consent",
                                "Αποθηκεύει τις προτιμήσεις συγκατάθεσης cookies που δηλώσατε στο banner",
                                "12 μήνες",
                                "Απολύτως απαραίτητο",
                            ],
                            [
                                "sb-*-auth-token (Supabase)",
                                "Διατηρεί τη σύνδεσή σας στον λογαριασμό (αυθεντικοποίηση)",
                                "Διάρκεια συνεδρίας, με ανανέωση",
                                "Απολύτως απαραίτητο",
                            ],
                            [
                                "language (localStorage)",
                                "Θυμάται τη γλώσσα που επιλέξατε — τοπική αποθήκευση, όχι cookie",
                                "Μέχρι να διαγραφεί από εσάς",
                                "Λειτουργικό",
                            ],
                        ],
                    },
                },
                {
                    id: "analytics_marketing",
                    title: "3. Cookies ανάλυσης και marketing",
                    paragraphs: [
                        "Δεν χρησιμοποιούμε σήμερα cookies ανάλυσης ή marketing τρίτων. Οι αντίστοιχες κατηγορίες εμφανίζονται στο banner ώστε, αν προστεθούν στο μέλλον, να ενεργοποιηθούν μόνο με τη δική σας συγκατάθεση και αφού πρώτα ενημερωθεί η παρούσα σελίδα.",
                    ],
                },
                {
                    id: "managing_cookies",
                    title: "4. Πώς διαχειρίζεστε τα cookies",
                    paragraphs: [
                        "Κατά την πρώτη επίσκεψη επιλέγετε από το banner αν αποδέχεστε όλα τα cookies, μόνο τα απαραίτητα, ή προσαρμοσμένες προτιμήσεις ανά κατηγορία. Η επιλογή σας καταγράφεται με την έκδοση της πολιτικής που ίσχυε τη στιγμή της συγκατάθεσης.",
                        "Για να αλλάξετε γνώμη, διαγράψτε το cookie pw_cookie_consent από τις ρυθμίσεις του φυλλομετρητή σας — το banner θα εμφανιστεί ξανά στην επόμενη επίσκεψη. Μπορείτε επίσης να αποκλείσετε cookies συνολικά από τον φυλλομετρητή· σημειώστε ότι χωρίς τα απολύτως απαραίτητα cookies η σύνδεση στην πλατφόρμα δεν λειτουργεί.",
                    ],
                    link: { href: "/privacy", label: "Δείτε και την Πολιτική Απορρήτου" },
                },
            ],
        },
        subprocessors: {
            title: "Υπο-εκτελούντες Επεξεργασίας",
            intro: [
                "Για τη λειτουργία του PolicyWallet συνεργαζόμαστε με περιορισμένο αριθμό τεχνικών παρόχων που επεξεργάζονται προσωπικά δεδομένα για λογαριασμό μας (υπο-εκτελούντες την επεξεργασία). Η σελίδα αυτή απαριθμεί ποιοι είναι, τι ρόλο έχουν, ποια δεδομένα αγγίζουν και πού τα επεξεργάζονται.",
            ],
            sections: [
                {
                    id: "subprocessor_list",
                    title: "1. Κατάλογος υπο-εκτελούντων",
                    paragraphs: [
                        "Ισχύει κατά την ημερομηνία τελευταίας ενημέρωσης που αναγράφεται στην κορυφή της σελίδας:",
                    ],
                    table: {
                        headers: ["Πάροχος", "Ρόλος", "Δεδομένα", "Τοποθεσία επεξεργασίας"],
                        rows: [
                            [
                                "Supabase",
                                "Βάση δεδομένων, αυθεντικοποίηση, αποθήκευση αρχείων",
                                "Δεδομένα λογαριασμού, ασφαλιστήρια έγγραφα, δεδομένα εφαρμογής",
                                "ΕΕ — eu-west-3 (Παρίσι, Γαλλία)",
                            ],
                            [
                                "Vercel",
                                "Φιλοξενία εφαρμογής και δίκτυο διανομής (CDN)",
                                "Δεδομένα κίνησης, τεχνικά αρχεία καταγραφής",
                                "ΕΕ/ΗΠΑ (παγκόσμιο δίκτυο)",
                            ],
                            [
                                "Stripe",
                                "Επεξεργασία πληρωμών και συνδρομών",
                                "Στοιχεία χρέωσης και συνδρομής· τα στοιχεία κάρτας τηρούνται αποκλειστικά από τη Stripe",
                                "ΕΕ/ΗΠΑ",
                            ],
                            [
                                "Brevo",
                                "Αποστολή email (ειδοποιήσεις, newsletter)",
                                "Διεύθυνση email, όνομα, περιεχόμενο ειδοποιήσεων",
                                "ΕΕ (Γαλλία)",
                            ],
                            [
                                "Upstash",
                                "Όρια ρυθμού αιτημάτων (Redis)",
                                "Μετρητές αιτημάτων ανά διεύθυνση IP — κανένα περιεχόμενο εγγράφων",
                                "ΕΕ/ΗΠΑ",
                            ],
                            [
                                "Google (Gemini API)",
                                "Ανάλυση εγγράφων με AI — κύριος πάροχος",
                                "Περιεχόμενο ασφαλιστηρίων προς ανάλυση, μόνο με τη συγκατάθεσή σας",
                                "ΕΕ/ΗΠΑ",
                            ],
                            [
                                "Anthropic",
                                "Ανάλυση εγγράφων με AI — εναλλακτικός πάροχος",
                                "Περιεχόμενο ασφαλιστηρίων προς ανάλυση, μόνο με τη συγκατάθεσή σας",
                                "ΗΠΑ",
                            ],
                            [
                                "OpenAI",
                                "Ανάλυση εγγράφων με AI — εναλλακτικός πάροχος",
                                "Περιεχόμενο ασφαλιστηρίων προς ανάλυση, μόνο με τη συγκατάθεσή σας",
                                "ΗΠΑ",
                            ],
                        ],
                    },
                },
                {
                    id: "safeguards",
                    title: "2. Εγγυήσεις",
                    paragraphs: [
                        "Κάθε υπο-εκτελών δεσμεύεται με σύμβαση επεξεργασίας δεδομένων κατά το άρθρο 28 GDPR και επεξεργάζεται μόνο τα δεδομένα που απαιτούνται για τον ρόλο του.",
                        "Για παρόχους που επεξεργάζονται δεδομένα εκτός Ευρωπαϊκού Οικονομικού Χώρου, οι διαβιβάσεις καλύπτονται από το EU-U.S. Data Privacy Framework ή/και τις Τυποποιημένες Συμβατικές Ρήτρες της Ευρωπαϊκής Επιτροπής.",
                        "Οι όροι επεξεργασίας δεδομένων των παρόχων AI δεν επιτρέπουν τη χρήση των δεδομένων σας για εκπαίδευση των μοντέλων τους.",
                    ],
                },
                {
                    id: "list_updates",
                    title: "3. Ενημερώσεις του καταλόγου",
                    paragraphs: [
                        "Πριν προσθέσουμε νέο υπο-εκτελούντα ή αλλάξουμε ουσιωδώς τον ρόλο υφιστάμενου, ενημερώνουμε τη σελίδα αυτή και την ημερομηνία στην κορυφή της.",
                    ],
                    link: { href: "/privacy", label: "Δείτε και την Πολιτική Απορρήτου" },
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
            openCookies: "Cookie Policy",
            openSubprocessors: "Subprocessors",
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
        cookies: {
            title: "Cookie Policy",
            intro: [
                "This page explains which cookies and related technologies PolicyWallet (policywallet.gr) uses, for what purpose, and how you can manage them.",
            ],
            sections: [
                {
                    id: "what_are_cookies",
                    title: "1. What cookies are",
                    paragraphs: [
                        "Cookies are small files stored on your device when you visit a website, so that it can \"remember\" information such as your sign-in or your preferences. Browser local storage (localStorage) plays a similar role.",
                    ],
                },
                {
                    id: "cookies_we_use",
                    title: "2. Which cookies we use",
                    paragraphs: [
                        "Today the platform uses only the following:",
                    ],
                    table: {
                        headers: ["Name", "Purpose", "Duration", "Category"],
                        rows: [
                            [
                                "pw_cookie_consent",
                                "Stores the cookie-consent preferences you selected in the banner",
                                "12 months",
                                "Strictly necessary",
                            ],
                            [
                                "sb-*-auth-token (Supabase)",
                                "Keeps you signed in to your account (authentication)",
                                "Session, with renewal",
                                "Strictly necessary",
                            ],
                            [
                                "language (localStorage)",
                                "Remembers the language you selected — local storage, not a cookie",
                                "Until you delete it",
                                "Functional",
                            ],
                        ],
                    },
                },
                {
                    id: "analytics_marketing",
                    title: "3. Analytics and marketing cookies",
                    paragraphs: [
                        "We do not currently use third-party analytics or marketing cookies. The corresponding categories appear in the banner so that, if they are added in the future, they are activated only with your consent and after this page is updated first.",
                    ],
                },
                {
                    id: "managing_cookies",
                    title: "4. Managing cookies",
                    paragraphs: [
                        "On your first visit you choose via the banner whether to accept all cookies, only the necessary ones, or custom preferences per category. Your choice is recorded together with the policy version in force at the time of consent.",
                        "To change your mind, delete the pw_cookie_consent cookie in your browser settings — the banner will reappear on your next visit. You can also block cookies entirely in your browser; note that without the strictly necessary cookies, signing in to the platform will not work.",
                    ],
                    link: { href: "/privacy", label: "See also the Privacy Policy" },
                },
            ],
        },
        subprocessors: {
            title: "Subprocessors",
            intro: [
                "To operate PolicyWallet we work with a limited number of technical providers that process personal data on our behalf (subprocessors). This page lists who they are, what role they play, what data they touch, and where they process it.",
            ],
            sections: [
                {
                    id: "subprocessor_list",
                    title: "1. Subprocessors list",
                    paragraphs: [
                        "Current as of the last-updated date shown at the top of this page:",
                    ],
                    table: {
                        headers: ["Provider", "Role", "Data", "Processing location"],
                        rows: [
                            [
                                "Supabase",
                                "Database, authentication, file storage",
                                "Account data, insurance policy documents, application data",
                                "EU — eu-west-3 (Paris, France)",
                            ],
                            [
                                "Vercel",
                                "Application hosting and content delivery network (CDN)",
                                "Traffic data, technical logs",
                                "EU/US (global network)",
                            ],
                            [
                                "Stripe",
                                "Payment and subscription processing",
                                "Billing and subscription details; card data is held exclusively by Stripe",
                                "EU/US",
                            ],
                            [
                                "Brevo",
                                "Email delivery (notifications, newsletter)",
                                "Email address, name, notification content",
                                "EU (France)",
                            ],
                            [
                                "Upstash",
                                "Request rate limiting (Redis)",
                                "Per-IP request counters — no document content",
                                "EU/US",
                            ],
                            [
                                "Google (Gemini API)",
                                "AI document analysis — primary provider",
                                "Policy content submitted for analysis, only with your consent",
                                "EU/US",
                            ],
                            [
                                "Anthropic",
                                "AI document analysis — alternate provider",
                                "Policy content submitted for analysis, only with your consent",
                                "US",
                            ],
                            [
                                "OpenAI",
                                "AI document analysis — alternate provider",
                                "Policy content submitted for analysis, only with your consent",
                                "US",
                            ],
                        ],
                    },
                },
                {
                    id: "safeguards",
                    title: "2. Safeguards",
                    paragraphs: [
                        "Every subprocessor is bound by a data processing agreement under Article 28 GDPR and processes only the data its role requires.",
                        "For providers processing data outside the European Economic Area, transfers are covered by the EU-U.S. Data Privacy Framework and/or the European Commission's Standard Contractual Clauses.",
                        "The AI providers' data-processing terms do not permit the use of your data to train their models.",
                    ],
                },
                {
                    id: "list_updates",
                    title: "3. Updates to this list",
                    paragraphs: [
                        "Before adding a new subprocessor or materially changing an existing one's role, we update this page and the date at its top.",
                    ],
                    link: { href: "/privacy", label: "See also the Privacy Policy" },
                },
            ],
        },
    },
}

const legalContentByLanguage = fixMojibakeObject(legalContentByLanguageRaw) as Record<LegalLanguage, LegalContent>

function assertLegalParity() {
    const documents: LegalDocumentKind[] = ["terms", "privacy", "cookies", "subprocessors"]
    for (const documentName of documents) {
        const elSections = legalContentByLanguage.el[documentName].sections
        const enSections = legalContentByLanguage.en[documentName].sections
        if (elSections.length !== enSections.length) {
            throw new Error(`Legal parity mismatch on ${documentName}: different section count`)
        }
        for (let i = 0; i < elSections.length; i += 1) {
            if (elSections[i].id !== enSections[i].id) {
                throw new Error(`Legal parity mismatch on ${documentName}: section id mismatch at index ${i}`)
            }
            if (Boolean(elSections[i].table) !== Boolean(enSections[i].table)) {
                throw new Error(
                    `Legal parity mismatch on ${documentName}: table presence mismatch in section ${elSections[i].id}`
                )
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
