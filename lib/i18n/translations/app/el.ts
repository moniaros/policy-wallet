/**
 * The `app` namespace — the Grafí application tier's own catalogue (G6).
 *
 * One voice: the user's own analyst. First person, calm, formal εσάς. Keys are
 * namespaced by screen and component. Every count is an ICU plural rendered
 * through lib/i18n/plural.ts (a bare `{count}` here fails the G6 guard). The
 * banned-word lint (`npm run lint:voice`) runs over this file and its English
 * mirror, excluding only `adviser.*` — the licensed intermediary's own words.
 */
export const appEl = {
    nav: {
        protection: 'Προστασία',
        see: 'Να δείτε',
        policies: 'Φάκελος',
        money: 'Χρήματα',
        me: 'Εσείς',
        updates: 'Ενημερώσεις',
        adviser: 'Σύμβουλος',
        add: 'Προσθήκη ασφαλιστηρίου',
        primary: 'Κύρια πλοήγηση',
        skip: 'Μετάβαση στο περιεχόμενο',
        back: 'Πίσω',
        brand: 'PolicyWallet — αρχική',
        updatesBadge: '{count, plural, =0 {Ενημερώσεις} one {Ενημερώσεις — # νέα} other {Ενημερώσεις — # νέες}}',
        moreThanNine: '9+',
    },
    shell: {
        yourAccount: 'Ο λογαριασμός σας',
        plan: 'Πρόγραμμα: {plan}',
    },
    state: {
        covered: 'Καλύπτεται',
        gap: 'Κενό',
        review: 'Για έλεγχο',
    },
    tier: {
        now: { title: 'Να το δείτε τώρα', definition: 'Λήγει μέσα σε 14 ημέρες, ή είναι κενό σε κάτι βασικό που μου έχετε πει ότι έχετε.' },
        month: { title: 'Αυτόν τον μήνα', definition: 'Λήγει μέσα σε 45 ημέρες, ή άλλαξε τιμή πάνω από τον δείκτη, ή λείπει ένα όριο που θα έπρεπε να αναφέρεται.' },
        later: { title: 'Όταν έχετε χρόνο', definition: 'Ό,τι αξίζει μια ματιά, χωρίς ημερομηνία.' },
    },
    money: {
        title: 'Τα χρήματά σας',
        interim: 'Πληρώνετε {amount} τον χρόνο για τα ασφαλιστήρια που ισχύουν σήμερα.',
        interimNote: 'Αυτή η σελίδα χτίζεται ακόμη — τα υπόλοιπα ποσά θα εμφανιστούν μόλις τα ελέγξω.',
    },
}
