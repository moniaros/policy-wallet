/** Copy shared by the advisor review and intake workspaces. */
export const agentWorkspaceCopy = {
    el: {
        findingsAwaiting: '{count} ευρήματα χρειάζονται έλεγχο πηγής', reviewFindings: 'Έλεγχος ευρημάτων', openTask: 'Άνοιγμα εργασίας', ownTask: 'Δική σας εργασία', noDeadline: 'Χωρίς προθεσμία',

        portfolioFacts: 'Εικόνα ελέγχου', detectedCustomers: 'Πελάτες με ανιχνευμένα κενά', recordedPolicies: 'Πελάτες με ασφαλιστήρια', pendingFindings: 'Πελάτες με ευρήματα υπό έλεγχο', visibleScope: 'Με βάση τα ορατά ασφαλιστήρια. Μηδενικά ευρήματα δεν σημαίνουν πλήρη κάλυψη.',

        title: 'Πελάτες που χρειάζονται έλεγχο', scope: 'Πελάτες με ενεργή σχέση διαχείρισης, μαζί με όσους περιμένουν αποδοχή πρόσκλησης. Εμφανίζονται μόνο τα στοιχεία στα οποία έχετε πρόσβαση.',
        assessed: 'Ελέγχθηκαν σε αυτή τη σελίδα', total: 'Πελάτες στο χαρτοφυλάκιο', failed: 'Δεν ολοκληρώθηκε ο έλεγχος', unknown: 'Χρειάζονται περισσότερα στοιχεία',
        empty: 'Δεν υπάρχουν πελάτες σε αυτή τη σελίδα.', previous: 'Προηγούμενη σελίδα', next: 'Επόμενη σελίδα',
        order: 'Προτεραιότητα ελέγχου μέσα στην τρέχουσα σελίδα. Οι μετρήσεις αφορούν μόνο τους πελάτες που ελέγχθηκαν εδώ.',
        review: 'Έλεγχος πελάτη', failedHelp: 'Ορισμένοι έλεγχοι απέτυχαν. Οι πελάτες αυτοί δεν περιλαμβάνονται στις μετρήσεις. Δοκιμάστε ξανά.',
        batch: 'Μεταφόρτωση ασφαλιστηρίων', batchHelp: 'Επιλέξτε πολλά έγγραφα. Ελέγξτε τον πελάτη και τα στοιχεία για κάθε αρχείο πριν την αποθήκευση.',
        nextFile: 'Επόμενο έγγραφο', skipFile: 'Παράλειψη για τώρα', remaining: 'Έγγραφα που απομένουν', saved: 'Αποθηκεύτηκαν',
        queueNotice: 'Τα αρχεία που δεν έχουν αποθηκευτεί παραμένουν μόνο σε αυτή τη συνεδρία. Τα αποθηκευμένα έγγραφα διατηρούνται όταν κλείσετε το παράθυρο.',
        retry: 'Επανάληψη', reviewOnly: 'Η AI προτείνει· ελέγξτε την πηγή πριν επιβεβαιώσετε ή κοινοποιήσετε.',
    },
    en: {
        findingsAwaiting: '{count} findings need source review', reviewFindings: 'Review findings', openTask: 'Open task', ownTask: 'Your task', noDeadline: 'No deadline',

        portfolioFacts: 'Review coverage', detectedCustomers: 'Customers with detected gaps', recordedPolicies: 'Customers with policies', pendingFindings: 'Customers with findings to review', visibleScope: 'Based on visible policies. Zero findings does not mean complete coverage.',

        title: 'Customers needing review', scope: 'Customers with a live management relationship, including those awaiting invitation acceptance. Only information you may access is included.',
        assessed: 'Assessed on this page', total: 'Customers in your portfolio', failed: 'Assessment incomplete', unknown: 'More information needed',
        empty: 'No customers on this page.', previous: 'Previous page', next: 'Next page',
        order: 'Prioritized within the current page. Measurements cover only the customers assessed here.',
        review: 'Review customer', failedHelp: 'Some assessments failed. Those customers are excluded from the measurements. Try again.',
        batch: 'Upload policies', batchHelp: 'Select multiple documents. Review the customer and details for each file before saving.',
        nextFile: 'Next document', skipFile: 'Skip for now', remaining: 'Documents remaining', saved: 'Saved',
        queueNotice: 'Unsaved files remain only in this session. Saved documents remain available after you close this window.',
        retry: 'Retry', reviewOnly: 'AI suggests; check the source before confirming or sharing.',
    },
} as const
